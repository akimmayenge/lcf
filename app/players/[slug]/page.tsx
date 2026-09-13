import Link from "next/link";
import { supabase } from "@/lib/supabase";


type Player = {
  id: number;
  first_name: string;
  last_name: string;
  slug: string;
  portrait_url: string | null;
  instagram_url: string | null;
};


type PlayerTeam = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
};


type RosterEntry = {
  team: PlayerTeam;
};


export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {

  const { slug } =
    await params;


  // --------------------------------
  // GET PLAYER
  // --------------------------------

  const {
    data: playerData,
    error: playerError,
  } =
    await supabase
      .from("players")
      .select(`
        id,
        first_name,
        last_name,
        slug,
        portrait_url,
        instagram_url
      `)
      .eq("slug", slug)
      .single();


  if (
    playerError ||
    !playerData
  ) {

    return (

      <main className="min-h-screen bg-[#030707] px-6 py-36 text-white">

        <div className="mx-auto max-w-5xl">

          <h1 className="text-3xl font-black">
            Player not found
          </h1>

          <Link
            href="/players"
            className="mt-6 inline-block font-black text-[#00CCCD]"
          >
            ← Back to Players
          </Link>

        </div>

      </main>

    );

  }


  const player =
    playerData as Player;


  // --------------------------------
  // GET CURRENT TEAM
  // --------------------------------

  const {
    data: rosterData,
  } =
    await supabase
      .from("team_rosters")
      .select(`
        team:teams (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq("season_id", 1)
      .eq("player_id", player.id)
      .eq("active", true)
      .maybeSingle();


  const roster =
    rosterData as unknown as
      RosterEntry | null;


  const currentTeam =
    roster?.team ?? null;
    // --------------------------------
    // PLAYER MATCH STATISTICS
    // --------------------------------

    const {
    data: statsData,
    error: statsError,
    } =
    await supabase
        .from("player_match_stats")
        .select(`
        present,
        goals,
        yellow_cards,
        red_cards,
        is_motm
        `)
        .eq("player_id", player.id);


    if (statsError) {
    console.error(
        "Player stats error:",
        statsError
    );
    }


    type PlayerMatchStat = {
    present: boolean;
    goals: number;
    yellow_cards: number;
    red_cards: number;
    is_motm: boolean;
    };


    const playerMatchStats =
    (statsData ?? []) as PlayerMatchStat[];
    const gamesPlayed =
  playerMatchStats.filter(
    (stat) => stat.present
  ).length;


const totalGoals =
  playerMatchStats.reduce(
    (total, stat) =>
      total + stat.goals,
    0
  );


const totalYellowCards =
  playerMatchStats.reduce(
    (total, stat) =>
      total + stat.yellow_cards,
    0
  );


const totalRedCards =
  playerMatchStats.reduce(
    (total, stat) =>
      total + stat.red_cards,
    0
  );


const totalMotm =
  playerMatchStats.filter(
    (stat) => stat.is_motm
  ).length;


  // --------------------------------
  // PAGE
  // --------------------------------

  return (

    <main className="min-h-screen bg-[#030707] px-6 py-36 text-white">

      <div className="mx-auto max-w-5xl">


        {/* BACK */}

        <Link
          href="/players"
          className="text-sm font-black text-[#00CCCD]"
        >
          ← Back to Players
        </Link>


        {/* PLAYER HEADER */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <div className="flex flex-col gap-8 md:flex-row md:items-center">


            {/* PORTRAIT */}

            <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black">

              <img
                src={
                  player.portrait_url ??
                  "/lcf-logo.png"
                }
                alt={`${player.first_name} ${player.last_name}`}
                className="h-full w-full object-cover"
              />

            </div>


            {/* PLAYER INFO */}

            <div>

              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                LCF Player
              </p>

              <h1 className="mt-3 text-4xl font-black">

                {player.first_name}{" "}
                {player.last_name}

              </h1>


              {currentTeam ? (

                <Link
                  href={`/teams/${currentTeam.slug}`}
                  className="mt-5 flex w-fit items-center gap-3 transition hover:text-[#00CCCD]"
                >

                  <img
                    src={
                      currentTeam.logo_url ??
                      "/lcf-logo.png"
                    }
                    alt={currentTeam.name}
                    className="h-9 w-9 object-contain"
                  />

                  <span className="font-black">
                    {currentTeam.name}
                  </span>

                </Link>

              ) : (

                <p className="mt-5 text-sm text-gray-500">
                  No active team.
                </p>

              )}

            </div>

          </div>

        </section>


        {/* SEASON STATS */}

        <section className="mt-8">

          <div>

            <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              2026-27 Season
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Player Statistics
            </h2>

          </div>


          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">


            {/* GAMES */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                Games
              </p>

              <p className="mt-2 text-3xl font-black">
                {gamesPlayed}
              </p>

            </div>


            {/* GOALS */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                Goals
              </p>

              <p className="mt-2 text-3xl font-black text-[#00CCCD]">
                {totalGoals}
              </p>

            </div>


            {/* MOTM */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                MOTM
              </p>

              <p className="mt-2 text-3xl font-black">
                {totalMotm}
              </p>

            </div>


            {/* POTW */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                POTW
              </p>

              <p className="mt-2 text-3xl font-black">
                0
              </p>

            </div>

          </div>

        <div className="mt-4 grid grid-cols-2 gap-4">

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
            Yellow Cards
            </p>

            <p className="mt-2 text-2xl font-black">
            {totalYellowCards}
            </p>

        </div>


        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
            Red Cards
            </p>

            <p className="mt-2 text-2xl font-black">
            {totalRedCards}
            </p>

        </div>

        </div>  

          <p className="mt-4 text-xs text-gray-600">
            Official statistics will update from LCF game sheets.
          </p>

        </section>


        {/* CAREER */}

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Career
          </p>

          <h2 className="mt-2 text-2xl font-black">
            LCF History
          </h2>


          {currentTeam ? (

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">

              <div>

                <p className="text-xs font-black text-gray-500">
                  2026-27
                </p>

                <p className="mt-1 font-black">
                  {currentTeam.name}
                </p>

              </div>

              <span className="text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                Active
              </span>

            </div>

          ) : (

            <p className="mt-5 text-sm text-gray-500">
              No LCF history available.
            </p>

          )}

        </section>


      </div>

    </main>

  );
}