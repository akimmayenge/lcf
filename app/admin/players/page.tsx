"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";


type Team = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
};


type Player = {
  id: number;
  first_name: string;
  last_name: string;
  slug: string;
  portrait_url: string | null;
};


type RosterRow = {
  player_id: number;
  team_id: number;
  active: boolean;
};


export default function AdminPlayersPage() {
  const router = useRouter();


  // --------------------------------
  // DATABASE DATA
  // --------------------------------

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [players, setPlayers] =
    useState<Player[]>([]);

  const [rosters, setRosters] =
    useState<RosterRow[]>([]);


  // --------------------------------
  // FORM
  // --------------------------------

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [teamId, setTeamId] =
    useState("");

  const [instagramUrl, setInstagramUrl] =
    useState("");

  const [portrait, setPortrait] =
    useState<File | null>(null);


  // --------------------------------
  // UI
  // --------------------------------

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  // --------------------------------
  // CREATE SLUG
  // --------------------------------

  function createSlug(
    first: string,
    last: string
  ) {
    return `${first}-${last}`
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  }


  // --------------------------------
  // LOAD PLAYERS + ROSTERS
  // --------------------------------

  async function loadPlayersAndRosters() {
    const {
      data: playersData,
      error: playersError,
    } =
      await supabase
        .from("players")
        .select(`
          id,
          first_name,
          last_name,
          slug,
          portrait_url
        `)
        .order(
          "last_name",
          {
            ascending: true,
          }
        )
        .order(
          "first_name",
          {
            ascending: true,
          }
        );


    if (playersError) {
      console.error(
        "Players error:",
        playersError
      );

      setError(
        "Could not load players."
      );

      return;
    }


    const {
      data: rosterData,
      error: rosterError,
    } =
      await supabase
        .from("team_rosters")
        .select(`
          player_id,
          team_id,
          active
        `)
        .eq("season_id", 1)
        .eq("active", true);


    if (rosterError) {
      console.error(
        "Roster error:",
        rosterError
      );
    }


    setPlayers(
      (playersData ?? []) as Player[]
    );

    setRosters(
      (rosterData ?? []) as RosterRow[]
    );
  }


  // --------------------------------
  // LOAD PAGE
  // --------------------------------

  useEffect(() => {
    async function loadPage() {

      // CHECK LOGIN

      const {
        data: {
          session,
        },
      } =
        await supabase.auth
          .getSession();


      if (!session) {
        router.replace(
          "/admin/login"
        );

        return;
      }


      // LOAD TEAMS

      const {
        data: teamsData,
        error: teamsError,
      } =
        await supabase
          .from("teams")
          .select(`
            id,
            name,
            slug,
            logo_url
          `)
          .eq(
            "is_active",
            true
          )
          .order(
            "name",
            {
              ascending: true,
            }
          );


      if (teamsError) {
        console.error(
          "Teams error:",
          teamsError
        );

        setError(
          "Could not load teams."
        );
      } else {
        setTeams(
          (teamsData ?? []) as Team[]
        );
      }


      await loadPlayersAndRosters();

      setLoading(false);
    }


    loadPage();

  }, [router]);


  // --------------------------------
  // FIND PLAYER TEAM
  // --------------------------------

  function getPlayerTeam(
    playerId: number
  ) {
    const roster =
      rosters.find(
        (entry) =>
          entry.player_id ===
          playerId
      );


    if (!roster) {
      return null;
    }


    return (
      teams.find(
        (team) =>
          team.id ===
          roster.team_id
      ) ?? null
    );
  }


  // --------------------------------
  // ADD PLAYER
  // --------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");


    try {

      // VALIDATION

      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !teamId
      ) {
        throw new Error(
          "First name, last name and team are required."
        );
      }


      if (
        portrait &&
        portrait.size >
          5 * 1024 * 1024
      ) {
        throw new Error(
          "Player portrait must be smaller than 5 MB."
        );
      }


      // CREATE SLUG

      const slug =
        createSlug(
          firstName.trim(),
          lastName.trim()
        );


      // CHECK DUPLICATE SLUG

      const {
        data: existingPlayer,
      } =
        await supabase
          .from("players")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();


      if (existingPlayer) {
        throw new Error(
          "A player with this name already exists. We can adjust the player slug if they are two different people."
        );
      }


      // --------------------------------
      // UPLOAD PORTRAIT
      // --------------------------------

      let portraitUrl:
        string | null = null;


      if (portrait) {
        const extension =
          portrait.name
            .split(".")
            .pop()
            ?.toLowerCase()
          ?? "jpg";


        const filePath =
          `${slug}-${crypto.randomUUID()}.${extension}`;


        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              "player-portraits"
            )
            .upload(
              filePath,
              portrait,
              {
                upsert: false,
              }
            );


        if (uploadError) {
          throw uploadError;
        }


        const {
          data: publicUrlData,
        } =
          supabase.storage
            .from(
              "player-portraits"
            )
            .getPublicUrl(
              filePath
            );


        portraitUrl =
          publicUrlData.publicUrl;
      }


      // --------------------------------
      // CREATE PLAYER
      // --------------------------------

      const {
        data: newPlayer,
        error: playerError,
      } =
        await supabase
          .from("players")
          .insert({
            first_name:
              firstName.trim(),

            last_name:
              lastName.trim(),

            slug,

            portrait_url:
              portraitUrl,

            instagram_url:
              instagramUrl.trim()
                || null,
          })
          .select(`
            id,
            first_name,
            last_name,
            slug,
            portrait_url
          `)
          .single();


      if (
        playerError ||
        !newPlayer
      ) {
        throw (
          playerError ??
          new Error(
            "Could not create player."
          )
        );
      }


      // --------------------------------
      // ASSIGN PLAYER TO TEAM
      // --------------------------------

      const {
        error: rosterError,
      } =
        await supabase
          .from("team_rosters")
          .insert({
            season_id: 1,
            team_id:
              Number(teamId),
            player_id:
              newPlayer.id,
            active: true,
          });


      if (rosterError) {
        throw rosterError;
      }


      // --------------------------------
      // SUCCESS
      // --------------------------------

      setMessage(
        `${newPlayer.first_name} ${newPlayer.last_name} was added successfully.`
      );


      setFirstName("");
      setLastName("");
      setTeamId("");
      setInstagramUrl("");
      setPortrait(null);


      const portraitInput =
        document.getElementById(
          "portrait"
        ) as HTMLInputElement | null;


      if (portraitInput) {
        portraitInput.value = "";
      }


      await loadPlayersAndRosters();


    } catch (caughtError) {
      console.error(
        "Add player error:",
        caughtError
      );


      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong."
      );


    } finally {
      setSaving(false);
    }
  }


  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030707] px-6 text-white">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00CCCD]" />

          <p className="mt-4 text-sm font-black text-gray-500">
            Loading players...
          </p>

        </div>
      </main>
    );
  }


  // --------------------------------
  // PAGE
  // --------------------------------

  return (
    <main className="min-h-screen bg-[#030707] px-4 pb-20 pt-28 text-white sm:px-6 sm:pt-32">

      <div className="mt-7 mx-auto max-w-7xl">


        {/* BACK */}

        <Link
          href="/admin"
          className="inline-flex items-center text-sm font-black text-[#00CCCD] transition hover:text-[#00E4E5]"
        >
          ← Admin Dashboard
        </Link>


        {/* PAGE HEADER */}

        <header className="mt-6">

          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00CCCD] sm:text-sm">
            LCF Administration
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Manage Players
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Register players, upload portraits and assign them to their 2026-27 LCF team.
          </p>

        </header>


        {/* MAIN GRID */}

        <div className="mt-8 grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">


          {/* ================================= */}
          {/* ADD PLAYER */}
          {/* ================================= */}

          <section className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                Registration
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Add Player
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                One registration automatically creates the player and adds them to their team roster.
              </p>

            </div>


            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >


              {/* FIRST NAME */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  First Name
                </label>

                <input
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(
                      event.target.value
                    )
                  }
                  required
                  placeholder="Marcus"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-base outline-none transition placeholder:text-gray-700 focus:border-[#00CCCD]"
                />

              </div>


              {/* LAST NAME */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Last Name
                </label>

                <input
                  value={lastName}
                  onChange={(event) =>
                    setLastName(
                      event.target.value
                    )
                  }
                  required
                  placeholder="Jean"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-base outline-none transition placeholder:text-gray-700 focus:border-[#00CCCD]"
                />

              </div>


              {/* TEAM */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Team
                </label>

                <select
                  value={teamId}
                  onChange={(event) =>
                    setTeamId(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-base outline-none transition focus:border-[#00CCCD]"
                >

                  <option value="">
                    Select team
                  </option>

                  {teams.map(
                    (team) => (
                      <option
                        key={team.id}
                        value={team.id}
                      >
                        {team.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* PORTRAIT */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Player Portrait
                </label>

                <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-black p-4">

                  <input
                    id="portrait"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setPortrait(
                        event.target
                          .files?.[0]
                        ?? null
                      )
                    }
                    className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#00CCCD] file:px-3 file:py-2 file:text-xs file:font-black file:text-black"
                  />

                  <p className="mt-3 text-xs leading-5 text-gray-600">
                    JPG, PNG or WEBP · maximum 5 MB
                  </p>

                </div>

              </div>


              {/* INSTAGRAM */}

              <div>

                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Instagram
                </label>

                <input
                  value={instagramUrl}
                  onChange={(event) =>
                    setInstagramUrl(
                      event.target.value
                    )
                  }
                  placeholder="Optional Instagram URL"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-base outline-none transition placeholder:text-gray-700 focus:border-[#00CCCD]"
                />

              </div>


              {/* SUCCESS */}

              {message && (
                <div className="rounded-xl border border-[#00CCCD]/20 bg-[#00CCCD]/10 p-4">

                  <p className="text-sm font-bold leading-6 text-[#00CCCD]">
                    ✓ {message}
                  </p>

                </div>
              )}


              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">

                  <p className="text-sm font-bold leading-6 text-red-400">
                    {error}
                  </p>

                </div>
              )}


              {/* SUBMIT */}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#00CCCD] px-5 py-4 text-sm font-black text-black transition hover:bg-[#00E4E5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Adding Player..."
                  : "Add Player"}
              </button>

            </form>

          </section>


          {/* ================================= */}
          {/* REGISTERED PLAYERS */}
          {/* ================================= */}

          <section className="min-w-0">

            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                  2026-27 Database
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Registered Players
                </h2>

              </div>


              <div className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">

                <p className="text-xs font-black text-gray-400">
                  {players.length}{" "}
                  {players.length === 1
                    ? "Player"
                    : "Players"}
                </p>

              </div>

            </div>


            {/* EMPTY STATE */}

            {players.length === 0 ? (

              <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center sm:py-20">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#00CCCD]/20 bg-[#00CCCD]/5">

                  <span className="text-2xl">
                    👤
                  </span>

                </div>

                <h3 className="mt-5 text-xl font-black">
                  No players registered yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Use the registration form to add your first official LCF player.
                </p>

              </div>

            ) : (

              <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">

                {players.map(
                  (player) => {

                    const team =
                      getPlayerTeam(
                        player.id
                      );


                    return (

                      <Link
                        key={player.id}
                        href={`/players/${player.slug}`}
                        className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-[#00CCCD]/40 hover:bg-white/[0.05]"
                      >

                        <div className="flex items-center gap-4">


                          {/* PLAYER IMAGE */}

                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black sm:h-18 sm:w-18">

                            <img
                              src={
                                player.portrait_url
                                ??
                                "/lcf-logo.png"
                              }
                              alt={`${player.first_name} ${player.last_name}`}
                              className="h-full w-full object-cover"
                            />

                          </div>


                          {/* PLAYER DATA */}

                          <div className="min-w-0 flex-1">

                            <p className="truncate text-base font-black sm:text-lg">
                              {player.first_name}{" "}
                              {player.last_name}
                            </p>


                            {team ? (

                              <div className="mt-2 flex items-center gap-2">

                                <img
                                  src={
                                    team.logo_url
                                    ??
                                    "/lcf-logo.png"
                                  }
                                  alt={
                                    team.name
                                  }
                                  className="h-5 w-5 object-contain"
                                />

                                <span className="truncate text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                                  {team.name}
                                </span>

                              </div>

                            ) : (

                              <p className="mt-2 text-xs font-bold text-gray-600">
                                No active team
                              </p>

                            )}


                            <p className="mt-3 text-xs font-bold text-gray-600 transition group-hover:text-gray-400">
                              View Profile →
                            </p>

                          </div>

                        </div>

                      </Link>

                    );

                  }
                )}

              </div>

            )}

          </section>

        </div>

      </div>

    </main>
  );
}