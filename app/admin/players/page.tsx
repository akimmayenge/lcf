"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";


// ==========================================================
// TYPES
// ==========================================================

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
  instagram_url: string | null;
};


type RosterRow = {
  id: number;
  player_id: number;
  team_id: number;
  position: string | null;
  active: boolean;
};


type PositionChoice =
  | "FIELD"
  | "GK";


// ==========================================================
// PAGE
// ==========================================================

export default function AdminPlayersPage() {

  const router =
    useRouter();


  // ========================================================
  // DATABASE DATA
  // ========================================================

  const [
    teams,
    setTeams,
  ] =
    useState<Team[]>([]);


  const [
    players,
    setPlayers,
  ] =
    useState<Player[]>([]);


  const [
    rosters,
    setRosters,
  ] =
    useState<RosterRow[]>([]);


  /*
    A player is placed in this list if we find any
    official player_match_stats row OR POTW award.

    Those players are protected from hard deletion.
  */

  const [
    historyPlayerIds,
    setHistoryPlayerIds,
  ] =
    useState<number[]>([]);


  // ========================================================
  // ADD PLAYER FORM
  // ========================================================

  const [
    firstName,
    setFirstName,
  ] =
    useState("");


  const [
    lastName,
    setLastName,
  ] =
    useState("");


  const [
    teamId,
    setTeamId,
  ] =
    useState("");


  const [
    position,
    setPosition,
  ] =
    useState<PositionChoice>(
      "FIELD"
    );


  const [
    instagramUrl,
    setInstagramUrl,
  ] =
    useState("");


  const [
    portrait,
    setPortrait,
  ] =
    useState<File | null>(
      null
    );


  // ========================================================
  // EDIT PLAYER FORM
  // ========================================================

  const [
    editingPlayerId,
    setEditingPlayerId,
  ] =
    useState<number | null>(
      null
    );


  const [
    editFirstName,
    setEditFirstName,
  ] =
    useState("");


  const [
    editLastName,
    setEditLastName,
  ] =
    useState("");


  const [
    editTeamId,
    setEditTeamId,
  ] =
    useState("");


  const [
    editPosition,
    setEditPosition,
  ] =
    useState<PositionChoice>(
      "FIELD"
    );


  const [
    editInstagramUrl,
    setEditInstagramUrl,
  ] =
    useState("");


  const [
    editPortrait,
    setEditPortrait,
  ] =
    useState<File | null>(
      null
    );


  // ========================================================
  // UI STATE
  // ========================================================

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    editingSaving,
    setEditingSaving,
  ] =
    useState(false);


  const [
    actionPlayerId,
    setActionPlayerId,
  ] =
    useState<number | null>(
      null
    );


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    error,
    setError,
  ] =
    useState("");


  // ========================================================
  // CREATE SLUG
  // ========================================================

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


  // ========================================================
  // HELPERS
  // ========================================================

  function getPlayerRoster(
    playerId: number
  ) {

    /*
      Prefer the active roster entry.

      If the player is inactive, return the season roster
      entry so Admin can still see the old team and reactivate
      the player if needed.
    */

    const playerRosters =
      rosters.filter(
        (entry) =>
          entry.player_id ===
          playerId
      );


    return (
      playerRosters.find(
        (entry) =>
          entry.active
      )
      ??
      playerRosters[0]
      ??
      null
    );
  }


  function getPlayerTeam(
    playerId: number
  ) {

    const roster =
      getPlayerRoster(
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
      )
      ??
      null
    );
  }


  function playerHasHistory(
    playerId: number
  ) {

    return (
      historyPlayerIds.includes(
        playerId
      )
    );
  }


  function rosterPositionLabel(
    roster: RosterRow | null
  ) {

    if (
      roster?.position
        ?.toUpperCase() ===
      "GK"
    ) {

      return "Goalkeeper";
    }


    return "Field Player";
  }


  // ========================================================
  // STORAGE HELPER
  // ========================================================

  function getPortraitStoragePath(
    publicUrl: string | null
  ) {

    if (!publicUrl) {
      return null;
    }


    const marker =
      "/storage/v1/object/public/player-portraits/";


    const markerIndex =
      publicUrl.indexOf(
        marker
      );


    if (
      markerIndex === -1
    ) {

      return null;
    }


    const encodedPath =
      publicUrl.slice(
        markerIndex +
        marker.length
      );


    try {

      return decodeURIComponent(
        encodedPath
      );

    } catch {

      return encodedPath;
    }
  }


  async function uploadPortrait(
    file: File,
    slugForFile: string
  ) {

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      throw new Error(
        "Player portrait must be smaller than 5 MB."
      );
    }


    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
      ??
      "jpg";


    const filePath =
      `${slugForFile}-${crypto.randomUUID()}.${extension}`;


    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          "player-portraits"
        )
        .upload(
          filePath,
          file,
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


    return {
      publicUrl:
        publicUrlData.publicUrl,

      filePath,
    };
  }


  // ========================================================
  // LOAD PLAYERS + ROSTERS + HISTORY
  // ========================================================

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
          portrait_url,
          instagram_url
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


    /*
      Load ALL season roster rows, not just active ones.

      This is important because deactivated players should
      remain visible in Admin instead of disappearing.
    */

    const {
      data: rosterData,
      error: rosterError,
    } =
      await supabase
        .from("team_rosters")
        .select(`
          id,
          player_id,
          team_id,
          position,
          active
        `)
        .eq(
          "season_id",
          1
        );


    if (rosterError) {

      console.error(
        "Roster error:",
        rosterError
      );

      setError(
        "Players loaded, but roster information could not be loaded."
      );

      return;
    }


    // --------------------------------------------------------
    // LOAD OFFICIAL HISTORY
    // --------------------------------------------------------

    const {
      data: statHistoryData,
      error: statHistoryError,
    } =
      await supabase
        .from(
          "player_match_stats"
        )
        .select(
          "player_id"
        );


    if (statHistoryError) {

      console.error(
        "Player history error:",
        statHistoryError
      );
    }


    const {
      data: awardHistoryData,
      error: awardHistoryError,
    } =
      await supabase
        .from(
          "matchday_awards"
        )
        .select(
          "potw_player_id"
        )
        .eq(
          "season_id",
          1
        );


    if (awardHistoryError) {

      console.error(
        "Award history error:",
        awardHistoryError
      );
    }


    const historyIds =
      new Set<number>();


    for (
      const row
      of statHistoryData ?? []
    ) {

      const id =
        Number(
          row.player_id
        );


      if (
        Number.isFinite(id)
      ) {

        historyIds.add(
          id
        );
      }
    }


    for (
      const row
      of awardHistoryData ?? []
    ) {

      const id =
        Number(
          row.potw_player_id
        );


      if (
        Number.isFinite(id)
      ) {

        historyIds.add(
          id
        );
      }
    }


    setPlayers(
      (playersData ?? []) as Player[]
    );


    setRosters(
      (rosterData ?? []) as RosterRow[]
    );


    setHistoryPlayerIds(
      Array.from(
        historyIds
      )
    );
  }


  // ========================================================
  // LOAD PAGE
  // ========================================================

  useEffect(() => {

    async function loadPage() {

      setLoading(true);
      setError("");


      // ------------------------------------------------------
      // CHECK LOGIN
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // LOAD TEAMS
      // ------------------------------------------------------

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


  // ========================================================
  // ADD PLAYER
  // ========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    setSaving(true);
    setMessage("");
    setError("");


    let uploadedFilePath:
      string | null = null;


    try {

      // ------------------------------------------------------
      // VALIDATION
      // ------------------------------------------------------

      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !teamId
      ) {

        throw new Error(
          "First name, last name and team are required."
        );
      }


      // ------------------------------------------------------
      // CREATE SLUG
      // ------------------------------------------------------

      const slug =
        createSlug(
          firstName.trim(),
          lastName.trim()
        );


      if (!slug) {

        throw new Error(
          "Could not create a valid player URL from that name."
        );
      }


      // ------------------------------------------------------
      // CHECK DUPLICATE SLUG
      // ------------------------------------------------------

      const {
        data: existingPlayer,
        error: duplicateError,
      } =
        await supabase
          .from("players")
          .select("id")
          .eq(
            "slug",
            slug
          )
          .maybeSingle();


      if (duplicateError) {
        throw duplicateError;
      }


      if (existingPlayer) {

        throw new Error(
          "A player with this name already exists. Use Manage Player if you meant to update the existing player."
        );
      }


      // ------------------------------------------------------
      // UPLOAD PORTRAIT
      // ------------------------------------------------------

      let portraitUrl:
        string | null = null;


      if (portrait) {

        const uploaded =
          await uploadPortrait(
            portrait,
            slug
          );


        portraitUrl =
          uploaded.publicUrl;


        uploadedFilePath =
          uploaded.filePath;
      }


      // ------------------------------------------------------
      // CREATE PLAYER
      // ------------------------------------------------------

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
                ||
              null,
          })
          .select(`
            id,
            first_name,
            last_name,
            slug,
            portrait_url,
            instagram_url
          `)
          .single();


      if (
        playerError ||
        !newPlayer
      ) {

        throw (
          playerError
          ??
          new Error(
            "Could not create player."
          )
        );
      }


      // ------------------------------------------------------
      // ASSIGN PLAYER TO TEAM + POSITION
      // ------------------------------------------------------

      const {
        error: rosterError,
      } =
        await supabase
          .from("team_rosters")
          .insert({
            season_id:
              1,

            team_id:
              Number(
                teamId
              ),

            player_id:
              newPlayer.id,

            position:
              position === "GK"
                ? "GK"
                : null,

            active:
              true,
          });


      if (rosterError) {

        /*
          The player row was already created.
          Delete it so we do not leave a half-created player.
        */

        await supabase
          .from("players")
          .delete()
          .eq(
            "id",
            newPlayer.id
          );


        throw rosterError;
      }


      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      setMessage(
        `${newPlayer.first_name} ${newPlayer.last_name} was added successfully.`
      );


      setFirstName("");
      setLastName("");
      setTeamId("");
      setPosition(
        "FIELD"
      );
      setInstagramUrl("");
      setPortrait(null);


      const portraitInput =
        document.getElementById(
          "portrait"
        ) as HTMLInputElement | null;


      if (portraitInput) {

        portraitInput.value =
          "";
      }


      await loadPlayersAndRosters();


    } catch (caughtError) {

      console.error(
        "Add player error:",
        caughtError
      );


      /*
        If portrait upload succeeded but player creation did not,
        try to remove the unused uploaded file.
      */

      if (
        uploadedFilePath
      ) {

        await supabase.storage
          .from(
            "player-portraits"
          )
          .remove([
            uploadedFilePath,
          ]);
      }


      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong."
      );


    } finally {

      setSaving(false);
    }
  }


  // ========================================================
  // OPEN / CLOSE PLAYER EDITOR
  // ========================================================

  function openPlayerEditor(
    player: Player
  ) {

    const roster =
      getPlayerRoster(
        player.id
      );


    setEditingPlayerId(
      player.id
    );


    setEditFirstName(
      player.first_name
    );


    setEditLastName(
      player.last_name
    );


    setEditInstagramUrl(
      player.instagram_url
      ??
      ""
    );


    setEditTeamId(
      roster
        ? String(
            roster.team_id
          )
        : ""
    );


    setEditPosition(
      roster?.position
        ?.toUpperCase() ===
      "GK"
        ? "GK"
        : "FIELD"
    );


    setEditPortrait(
      null
    );


    setMessage("");
    setError("");


    /*
      The editor appears above the player cards.
      On mobile, automatically move the user to it.
    */

    window.setTimeout(
      () => {

        document
          .getElementById(
            "player-editor"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      50
    );
  }


  function closePlayerEditor() {

    setEditingPlayerId(
      null
    );

    setEditPortrait(
      null
    );

    setError("");
  }


  // ========================================================
  // SAVE PLAYER EDITS
  // ========================================================

  async function savePlayerChanges(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    if (
      editingPlayerId === null
    ) {

      return;
    }


    const player =
      players.find(
        (item) =>
          item.id ===
          editingPlayerId
      );


    if (!player) {

      setError(
        "Player could not be found."
      );

      return;
    }


    setEditingSaving(true);
    setMessage("");
    setError("");


    let uploadedFilePath:
      string | null = null;


    try {

      if (
        !editFirstName.trim() ||
        !editLastName.trim() ||
        !editTeamId
      ) {

        throw new Error(
          "First name, last name and team are required."
        );
      }


      const currentRoster =
        getPlayerRoster(
          player.id
        );


      const nextTeamId =
        Number(
          editTeamId
        );


      const teamChanged =
        currentRoster !== null &&
        currentRoster.team_id !==
          nextTeamId;


      /*
        Once official history exists, keep the team locked.

        player_match_stats.team_id already protects historical
        stats, and this rule prevents accidental mid-season moves
        from the Admin screen.
      */

      if (
        teamChanged &&
        playerHasHistory(
          player.id
        )
      ) {

        throw new Error(
          "This player already has official LCF history. Their team is locked. You can still correct their name, portrait, Instagram or position."
        );
      }


      let nextPortraitUrl =
        player.portrait_url;


      if (editPortrait) {

        const uploaded =
          await uploadPortrait(
            editPortrait,
            player.slug
          );


        nextPortraitUrl =
          uploaded.publicUrl;


        uploadedFilePath =
          uploaded.filePath;
      }


      // ------------------------------------------------------
      // UPDATE PLAYER DATA
      //
      // IMPORTANT:
      // The slug stays unchanged when a name is corrected.
      // This prevents old profile links from breaking.
      // ------------------------------------------------------

      const {
        error: playerUpdateError,
      } =
        await supabase
          .from("players")
          .update({
            first_name:
              editFirstName.trim(),

            last_name:
              editLastName.trim(),

            instagram_url:
              editInstagramUrl.trim()
                ||
              null,

            portrait_url:
              nextPortraitUrl,
          })
          .eq(
            "id",
            player.id
          );


      if (playerUpdateError) {
        throw playerUpdateError;
      }


      // ------------------------------------------------------
      // UPDATE OR CREATE ROSTER
      // ------------------------------------------------------

      if (currentRoster) {

        const {
          error: rosterUpdateError,
        } =
          await supabase
            .from(
              "team_rosters"
            )
            .update({
              team_id:
                nextTeamId,

              position:
                editPosition === "GK"
                  ? "GK"
                  : null,
            })
            .eq(
              "id",
              currentRoster.id
            );


        if (rosterUpdateError) {
          throw rosterUpdateError;
        }

      } else {

        const {
          error: rosterInsertError,
        } =
          await supabase
            .from(
              "team_rosters"
            )
            .insert({
              season_id:
                1,

              team_id:
                nextTeamId,

              player_id:
                player.id,

              position:
                editPosition === "GK"
                  ? "GK"
                  : null,

              active:
                true,
            });


        if (rosterInsertError) {
          throw rosterInsertError;
        }
      }


      // ------------------------------------------------------
      // DELETE OLD PORTRAIT AFTER SUCCESSFUL UPDATE
      // ------------------------------------------------------

      if (
        editPortrait &&
        player.portrait_url
      ) {

        const oldPath =
          getPortraitStoragePath(
            player.portrait_url
          );


        if (oldPath) {

          const {
            error: removeOldPortraitError,
          } =
            await supabase.storage
              .from(
                "player-portraits"
              )
              .remove([
                oldPath,
              ]);


          if (
            removeOldPortraitError
          ) {

            console.warn(
              "Old portrait could not be removed:",
              removeOldPortraitError
            );
          }
        }
      }


      setMessage(
        `${editFirstName.trim()} ${editLastName.trim()} was updated successfully.`
      );


      setEditingPlayerId(
        null
      );


      setEditPortrait(
        null
      );


      await loadPlayersAndRosters();


    } catch (caughtError) {

      console.error(
        "Edit player error:",
        caughtError
      );


      /*
        If a new portrait was uploaded but the database update
        failed, remove the new unused file.
      */

      if (
        uploadedFilePath
      ) {

        await supabase.storage
          .from(
            "player-portraits"
          )
          .remove([
            uploadedFilePath,
          ]);
      }


      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update player."
      );


    } finally {

      setEditingSaving(false);
    }
  }


  // ========================================================
  // DEACTIVATE PLAYER
  // ========================================================

  async function deactivatePlayer(
    player: Player
  ) {

    const roster =
      getPlayerRoster(
        player.id
      );


    if (
      !roster ||
      !roster.active
    ) {

      setError(
        "This player is already inactive."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Deactivate ${player.first_name} ${player.last_name}?\n\nTheir profile and historical statistics will stay in the database, but they will no longer be part of the active roster.`
      );


    if (!confirmed) {
      return;
    }


    setActionPlayerId(
      player.id
    );

    setMessage("");
    setError("");


    try {

      const {
        error: deactivateError,
      } =
        await supabase
          .from("team_rosters")
          .update({
            active:
              false,
          })
          .eq(
            "id",
            roster.id
          );


      if (deactivateError) {
        throw deactivateError;
      }


      setMessage(
        `${player.first_name} ${player.last_name} was deactivated. Historical statistics were preserved.`
      );


      if (
        editingPlayerId ===
        player.id
      ) {

        setEditingPlayerId(
          null
        );
      }


      await loadPlayersAndRosters();


    } catch (caughtError) {

      console.error(
        "Deactivate player error:",
        caughtError
      );


      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not deactivate player."
      );


    } finally {

      setActionPlayerId(
        null
      );
    }
  }


  // ========================================================
  // REACTIVATE PLAYER
  // ========================================================

  async function reactivatePlayer(
    player: Player
  ) {

    const roster =
      getPlayerRoster(
        player.id
      );


    if (!roster) {

      setError(
        "This player has no season roster to reactivate. Open Manage Player and select a team first."
      );

      return;
    }


    if (
      roster.active
    ) {

      return;
    }


    const confirmed =
      window.confirm(
        `Reactivate ${player.first_name} ${player.last_name} on ${getPlayerTeam(player.id)?.name ?? "their current team"}?`
      );


    if (!confirmed) {
      return;
    }


    setActionPlayerId(
      player.id
    );

    setMessage("");
    setError("");


    try {

      const {
        error: reactivateError,
      } =
        await supabase
          .from("team_rosters")
          .update({
            active:
              true,
          })
          .eq(
            "id",
            roster.id
          );


      if (reactivateError) {
        throw reactivateError;
      }


      setMessage(
        `${player.first_name} ${player.last_name} is active again.`
      );


      await loadPlayersAndRosters();


    } catch (caughtError) {

      console.error(
        "Reactivate player error:",
        caughtError
      );


      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not reactivate player."
      );


    } finally {

      setActionPlayerId(
        null
      );
    }
  }


  // ========================================================
  // SAFE DELETE
  // ========================================================

  async function deletePlayerSafely(
    player: Player
  ) {

    /*
      Never hard-delete a player who is already referenced
      by an official game sheet or POTW record.
    */

    if (
      playerHasHistory(
        player.id
      )
    ) {

      setError(
        `${player.first_name} ${player.last_name} has official LCF history and cannot be permanently deleted. Use Deactivate instead so match and award history stays correct.`
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Permanently delete ${player.first_name} ${player.last_name}?\n\nThis is only intended for a mistaken registration before the player has official history. This action cannot be undone.`
      );


    if (!confirmed) {
      return;
    }


    setActionPlayerId(
      player.id
    );

    setMessage("");
    setError("");


    try {

      // ------------------------------------------------------
      // DELETE ROSTER ROWS FIRST
      // ------------------------------------------------------

      const {
        error: rosterDeleteError,
      } =
        await supabase
          .from("team_rosters")
          .delete()
          .eq(
            "season_id",
            1
          )
          .eq(
            "player_id",
            player.id
          );


      if (rosterDeleteError) {
        throw rosterDeleteError;
      }


      // ------------------------------------------------------
      // DELETE PLAYER
      // ------------------------------------------------------

      const {
        error: playerDeleteError,
      } =
        await supabase
          .from("players")
          .delete()
          .eq(
            "id",
            player.id
          );


      if (playerDeleteError) {
        throw playerDeleteError;
      }


      // ------------------------------------------------------
      // CLEAN UP PORTRAIT
      // ------------------------------------------------------

      const portraitPath =
        getPortraitStoragePath(
          player.portrait_url
        );


      if (portraitPath) {

        const {
          error: portraitDeleteError,
        } =
          await supabase.storage
            .from(
              "player-portraits"
            )
            .remove([
              portraitPath,
            ]);


        if (
          portraitDeleteError
        ) {

          console.warn(
            "Deleted player, but portrait cleanup failed:",
            portraitDeleteError
          );
        }
      }


      setMessage(
        `${player.first_name} ${player.last_name} was permanently deleted.`
      );


      if (
        editingPlayerId ===
        player.id
      ) {

        setEditingPlayerId(
          null
        );
      }


      await loadPlayersAndRosters();


    } catch (caughtError) {

      console.error(
        "Delete player error:",
        caughtError
      );


      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete player."
      );


    } finally {

      setActionPlayerId(
        null
      );
    }
  }


  // ========================================================
  // LOADING
  // ========================================================

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


  // ========================================================
  // CURRENT EDIT PLAYER
  // ========================================================

  const editingPlayer =
    editingPlayerId === null
      ? null
      : (
          players.find(
            (player) =>
              player.id ===
              editingPlayerId
          )
          ??
          null
        );


  const editingRoster =
    editingPlayer
      ? getPlayerRoster(
          editingPlayer.id
        )
      : null;


  const activePlayerCount =
    players.filter(
      (player) =>
        getPlayerRoster(
          player.id
        )?.active
    ).length;


  // ========================================================
  // PAGE
  // ========================================================

  return (

    <main className="min-h-screen bg-[#030707] px-4 pb-24 pt-32 text-white sm:px-6 sm:pt-36 md:pt-40">

      <div className="mx-auto max-w-7xl">


        {/* ================================================= */}
        {/* ADMIN NAVIGATION */}
        {/* ================================================= */}

        <nav
          aria-label="Admin navigation"
          className="flex flex-wrap gap-2"
        >

          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-[#00CCCD] transition hover:border-[#00CCCD]/40"
          >
            ← Dashboard
          </Link>


          <Link
            href="/admin/matches"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-gray-300 transition hover:border-[#00CCCD]/40 hover:text-[#00CCCD]"
          >
            Matches
          </Link>


          <Link
            href="/players"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-gray-300 transition hover:border-[#00CCCD]/40 hover:text-[#00CCCD]"
          >
            Public Rankings
          </Link>

        </nav>


        {/* ================================================= */}
        {/* PAGE HEADER */}
        {/* ================================================= */}

        <header className="mt-7">

          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00CCCD] sm:text-sm">
            LCF Administration
          </p>


          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
            Manage Players
          </h1>


          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 sm:text-base">
            Register players, manage portraits, correct names, set goalkeeper status and safely deactivate or delete registrations.
          </p>

        </header>


        {/* ================================================= */}
        {/* GLOBAL MESSAGE */}
        {/* ================================================= */}

        {message && (

          <div className="mt-6 rounded-2xl border border-[#00CCCD]/20 bg-[#00CCCD]/10 p-4">

            <p className="text-sm font-bold leading-6 text-[#00CCCD]">
              ✓ {message}
            </p>

          </div>

        )}


        {error && (

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">

            <p className="text-sm font-bold leading-6 text-red-400">
              {error}
            </p>

          </div>

        )}


        {/* ================================================= */}
        {/* MAIN GRID */}
        {/* ================================================= */}

        <div className="mt-8 grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">


          {/* ================================================= */}
          {/* ADD PLAYER */}
          {/* ================================================= */}

          <section className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                Registration
              </p>


              <h2 className="mt-2 text-2xl font-black">
                Add Player
              </h2>


              <p className="mt-2 text-sm leading-6 text-gray-500">
                Create the player, add them to a team and identify goalkeepers here. Field players can stay as Field Player.
              </p>

            </div>


            <form
              onSubmit={
                handleSubmit
              }
              className="mt-7 space-y-5"
            >


              {/* FIRST NAME */}

              <div>

                <label
                  htmlFor="first-name"
                  className="text-xs font-black uppercase tracking-wider text-gray-500"
                >
                  First Name
                </label>


                <input
                  id="first-name"
                  value={
                    firstName
                  }
                  onChange={(
                    event
                  ) =>
                    setFirstName(
                      event.target.value
                    )
                  }
                  required
                  placeholder="Marcus"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition placeholder:text-gray-700 focus:border-[#00CCCD]"
                />

              </div>


              {/* LAST NAME */}

              <div>

                <label
                  htmlFor="last-name"
                  className="text-xs font-black uppercase tracking-wider text-gray-500"
                >
                  Last Name
                </label>


                <input
                  id="last-name"
                  value={
                    lastName
                  }
                  onChange={(
                    event
                  ) =>
                    setLastName(
                      event.target.value
                    )
                  }
                  required
                  placeholder="Jean"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition placeholder:text-gray-700 focus:border-[#00CCCD]"
                />

              </div>


              {/* TEAM */}

              <div>

                <label
                  htmlFor="team"
                  className="text-xs font-black uppercase tracking-wider text-gray-500"
                >
                  Team
                </label>


                <select
                  id="team"
                  value={
                    teamId
                  }
                  onChange={(
                    event
                  ) =>
                    setTeamId(
                      event.target.value
                    )
                  }
                  required
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition focus:border-[#00CCCD]"
                >

                  <option value="">
                    Select team
                  </option>


                  {teams.map(
                    (team) => (

                      <option
                        key={
                          team.id
                        }
                        value={
                          team.id
                        }
                      >
                        {team.name}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* POSITION */}

              <div>

                <label
                  htmlFor="position"
                  className="text-xs font-black uppercase tracking-wider text-gray-500"
                >
                  Position
                </label>


                <select
                  id="position"
                  value={
                    position
                  }
                  onChange={(
                    event
                  ) =>
                    setPosition(
                      event.target.value as PositionChoice
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition focus:border-[#00CCCD]"
                >

                  <option value="FIELD">
                    Field Player
                  </option>

                  <option value="GK">
                    Goalkeeper (GK)
                  </option>

                </select>


                <p className="mt-2 text-xs leading-5 text-gray-600">
                  Marking a goalkeeper here lets the official match sheet offer them in the GK selector.
                </p>

              </div>


              {/* PORTRAIT */}

              <div>

                <label
                  htmlFor="portrait"
                  className="text-xs font-black uppercase tracking-wider text-gray-500"
                >
                  Player Portrait
                </label>


                <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-black p-4">

                  <input
                    id="portrait"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(
                      event
                    ) =>
                      setPortrait(
                        event.target
                          .files?.[0]
                        ??
                        null
                      )
                    }
                    className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#00CCCD] file:px-3 file:py-2.5 file:text-xs file:font-black file:text-black"
                  />


                  <p className="mt-3 text-xs leading-5 text-gray-600">
                    JPG, PNG or WEBP · maximum 5 MB
                  </p>

                </div>

              </div>


              {/* INSTAGRAM */}

              <div>

                <label
                  htmlFor="instagram"
                  className="text-xs font-black uppercase tracking-wider text-gray-500"
                >
                  Instagram
                </label>


                <input
                  id="instagram"
                  value={
                    instagramUrl
                  }
                  onChange={(
                    event
                  ) =>
                    setInstagramUrl(
                      event.target.value
                    )
                  }
                  placeholder="Optional Instagram URL"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none transition placeholder:text-gray-700 focus:border-[#00CCCD]"
                />

              </div>


              <button
                type="submit"
                disabled={
                  saving
                }
                className="min-h-12 w-full rounded-xl bg-[#00CCCD] px-5 text-sm font-black text-black transition hover:bg-[#00E4E5] disabled:cursor-not-allowed disabled:opacity-50"
              >

                {saving
                  ? "Adding Player..."
                  : "Add Player"}

              </button>

            </form>

          </section>


          {/* ================================================= */}
          {/* PLAYER MANAGEMENT */}
          {/* ================================================= */}

          <section className="min-w-0">


            {/* DATABASE HEADER */}

            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                  2026-27 Database
                </p>


                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Registered Players
                </h2>

              </div>


              <div className="flex flex-wrap gap-2">

                <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">

                  <p className="text-xs font-black text-gray-400">
                    {players.length} Total
                  </p>

                </div>


                <div className="rounded-full border border-[#00CCCD]/20 bg-[#00CCCD]/5 px-4 py-2">

                  <p className="text-xs font-black text-[#00CCCD]">
                    {activePlayerCount} Active
                  </p>

                </div>

              </div>

            </div>


            {/* ================================================= */}
            {/* EDIT PLAYER PANEL */}
            {/* ================================================= */}

            {editingPlayer && (

              <section
                id="player-editor"
                className="scroll-mt-32 mt-6 rounded-3xl border border-[#00CCCD]/30 bg-[#00CCCD]/[0.04] p-5 sm:p-7"
              >

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                      Player Management
                    </p>


                    <h3 className="mt-2 text-2xl font-black">
                      Edit{" "}
                      {editingPlayer.first_name}{" "}
                      {editingPlayer.last_name}
                    </h3>


                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                      Correct the player's information here. Their existing profile URL stays unchanged when you correct their name, which avoids broken links.
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={
                      closePlayerEditor
                    }
                    className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-gray-400 transition hover:text-white"
                  >
                    Close
                  </button>

                </div>


                <form
                  onSubmit={
                    savePlayerChanges
                  }
                  className="mt-7 grid gap-5 md:grid-cols-2"
                >


                  {/* EDIT FIRST NAME */}

                  <div>

                    <label
                      htmlFor="edit-first-name"
                      className="text-xs font-black uppercase tracking-wider text-gray-500"
                    >
                      First Name
                    </label>


                    <input
                      id="edit-first-name"
                      value={
                        editFirstName
                      }
                      onChange={(
                        event
                      ) =>
                        setEditFirstName(
                          event.target.value
                        )
                      }
                      required
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none focus:border-[#00CCCD]"
                    />

                  </div>


                  {/* EDIT LAST NAME */}

                  <div>

                    <label
                      htmlFor="edit-last-name"
                      className="text-xs font-black uppercase tracking-wider text-gray-500"
                    >
                      Last Name
                    </label>


                    <input
                      id="edit-last-name"
                      value={
                        editLastName
                      }
                      onChange={(
                        event
                      ) =>
                        setEditLastName(
                          event.target.value
                        )
                      }
                      required
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none focus:border-[#00CCCD]"
                    />

                  </div>


                  {/* EDIT TEAM */}

                  <div>

                    <label
                      htmlFor="edit-team"
                      className="text-xs font-black uppercase tracking-wider text-gray-500"
                    >
                      Team
                    </label>


                    <select
                      id="edit-team"
                      value={
                        editTeamId
                      }
                      onChange={(
                        event
                      ) =>
                        setEditTeamId(
                          event.target.value
                        )
                      }
                      required
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none focus:border-[#00CCCD]"
                    >

                      <option value="">
                        Select team
                      </option>


                      {teams.map(
                        (team) => (

                          <option
                            key={
                              team.id
                            }
                            value={
                              team.id
                            }
                          >
                            {team.name}
                          </option>

                        )
                      )}

                    </select>


                    {playerHasHistory(
                      editingPlayer.id
                    ) && (

                      <p className="mt-2 text-xs leading-5 text-amber-300/80">
                        This player has official history. The team cannot be changed from this screen.
                      </p>

                    )}

                  </div>


                  {/* EDIT POSITION */}

                  <div>

                    <label
                      htmlFor="edit-position"
                      className="text-xs font-black uppercase tracking-wider text-gray-500"
                    >
                      Position
                    </label>


                    <select
                      id="edit-position"
                      value={
                        editPosition
                      }
                      onChange={(
                        event
                      ) =>
                        setEditPosition(
                          event.target.value as PositionChoice
                        )
                      }
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none focus:border-[#00CCCD]"
                    >

                      <option value="FIELD">
                        Field Player
                      </option>

                      <option value="GK">
                        Goalkeeper (GK)
                      </option>

                    </select>

                  </div>


                  {/* EDIT INSTAGRAM */}

                  <div className="md:col-span-2">

                    <label
                      htmlFor="edit-instagram"
                      className="text-xs font-black uppercase tracking-wider text-gray-500"
                    >
                      Instagram
                    </label>


                    <input
                      id="edit-instagram"
                      value={
                        editInstagramUrl
                      }
                      onChange={(
                        event
                      ) =>
                        setEditInstagramUrl(
                          event.target.value
                        )
                      }
                      placeholder="Optional Instagram URL"
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base outline-none focus:border-[#00CCCD]"
                    />

                  </div>


                  {/* EDIT PORTRAIT */}

                  <div className="md:col-span-2">

                    <label
                      htmlFor="edit-portrait"
                      className="text-xs font-black uppercase tracking-wider text-gray-500"
                    >
                      Change Profile Picture
                    </label>


                    <div className="mt-2 flex flex-col gap-4 rounded-xl border border-dashed border-white/15 bg-black p-4 sm:flex-row sm:items-center">

                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#030707]">

                        <img
                          src={
                            editingPlayer.portrait_url
                            ??
                            "/lcf-logo.png"
                          }
                          alt={`${editingPlayer.first_name} ${editingPlayer.last_name}`}
                          className="h-full w-full object-cover"
                        />

                      </div>


                      <div className="min-w-0 flex-1">

                        <input
                          id="edit-portrait"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(
                            event
                          ) =>
                            setEditPortrait(
                              event.target
                                .files?.[0]
                              ??
                              null
                            )
                          }
                          className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#00CCCD] file:px-3 file:py-2.5 file:text-xs file:font-black file:text-black"
                        />


                        <p className="mt-2 text-xs leading-5 text-gray-600">
                          Leave empty to keep the current portrait. Maximum 5 MB.
                        </p>

                      </div>

                    </div>

                  </div>


                  {/* SAVE EDITS */}

                  <div className="md:col-span-2">

                    <button
                      type="submit"
                      disabled={
                        editingSaving
                      }
                      className="min-h-12 w-full rounded-xl bg-[#00CCCD] px-5 text-sm font-black text-black transition hover:bg-[#00E4E5] disabled:opacity-50"
                    >

                      {editingSaving
                        ? "Saving Changes..."
                        : "Save Player Changes"}

                    </button>

                  </div>

                </form>


                {/* ============================================= */}
                {/* SAFE PLAYER STATUS */}
                {/* ============================================= */}

                <div className="mt-7 border-t border-white/10 pt-6">

                  <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                    Player Status
                  </p>


                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">


                    {editingRoster?.active ? (

                      <button
                        type="button"
                        disabled={
                          actionPlayerId ===
                          editingPlayer.id
                        }
                        onClick={() =>
                          deactivatePlayer(
                            editingPlayer
                          )
                        }
                        className="min-h-12 rounded-xl border border-amber-400/30 bg-amber-400/5 px-5 text-sm font-black text-amber-300 transition hover:bg-amber-400/10 disabled:opacity-50"
                      >
                        Deactivate Player
                      </button>

                    ) : (

                      <button
                        type="button"
                        disabled={
                          actionPlayerId ===
                          editingPlayer.id
                        }
                        onClick={() =>
                          reactivatePlayer(
                            editingPlayer
                          )
                        }
                        className="min-h-12 rounded-xl border border-[#00CCCD]/30 bg-[#00CCCD]/5 px-5 text-sm font-black text-[#00CCCD] transition hover:bg-[#00CCCD]/10 disabled:opacity-50"
                      >
                        Reactivate Player
                      </button>

                    )}


                    <button
                      type="button"
                      disabled={
                        actionPlayerId ===
                        editingPlayer.id
                      }
                      onClick={() =>
                        deletePlayerSafely(
                          editingPlayer
                        )
                      }
                      className="min-h-12 rounded-xl border border-red-500/30 bg-red-500/5 px-5 text-sm font-black text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Permanently Delete
                    </button>

                  </div>


                  {playerHasHistory(
                    editingPlayer.id
                  ) ? (

                    <p className="mt-4 max-w-2xl text-xs leading-5 text-gray-500">
                      Permanent deletion is protected because this player is referenced by official LCF history. Deactivate the player instead; their old game sheets and statistics remain intact.
                    </p>

                  ) : (

                    <p className="mt-4 max-w-2xl text-xs leading-5 text-gray-500">
                      Permanent deletion is available because no official game-sheet or POTW history was found. Use it only for a mistaken registration.
                    </p>

                  )}

                </div>

              </section>

            )}


            {/* ================================================= */}
            {/* EMPTY STATE */}
            {/* ================================================= */}

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

              <div className="mt-6 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">

                {players.map(
                  (player) => {

                    const roster =
                      getPlayerRoster(
                        player.id
                      );


                    const team =
                      getPlayerTeam(
                        player.id
                      );


                    const hasHistory =
                      playerHasHistory(
                        player.id
                      );


                    return (

                      <article
                        key={
                          player.id
                        }
                        className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >


                        {/* PLAYER SUMMARY */}

                        <div className="flex items-center gap-4">

                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black">

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


                          <div className="min-w-0 flex-1">

                            <p className="truncate text-base font-black sm:text-lg">
                              {player.first_name}{" "}
                              {player.last_name}
                            </p>


                            {team ? (

                              <div className="mt-2 flex min-w-0 items-center gap-2">

                                <img
                                  src={
                                    team.logo_url
                                    ??
                                    "/lcf-logo.png"
                                  }
                                  alt={
                                    team.name
                                  }
                                  className="h-5 w-5 shrink-0 object-contain"
                                />


                                <span className="truncate text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                                  {team.name}
                                </span>

                              </div>

                            ) : (

                              <p className="mt-2 text-xs font-bold text-gray-600">
                                No season team
                              </p>

                            )}

                          </div>

                        </div>


                        {/* BADGES */}

                        <div className="mt-4 flex flex-wrap gap-2">

                          <span
                            className={
                              roster?.active
                                ? "rounded-full bg-[#00CCCD]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#00CCCD]"
                                : "rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500"
                            }
                          >
                            {roster?.active
                              ? "Active"
                              : "Inactive"}
                          </span>


                          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                            {rosterPositionLabel(
                              roster
                            )}
                          </span>


                          {hasHistory && (

                            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                              History Protected
                            </span>

                          )}

                        </div>


                        {/* CARD NAVIGATION */}

                        <div className="mt-5 grid grid-cols-2 gap-2">

                          <Link
                            href={`/players/${player.slug}?from=admin`}
                            className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-center text-xs font-black text-gray-300 transition hover:border-[#00CCCD]/40 hover:text-[#00CCCD]"
                          >
                            View Profile
                          </Link>


                          <button
                            type="button"
                            onClick={() =>
                              openPlayerEditor(
                                player
                              )
                            }
                            className="min-h-11 rounded-xl bg-[#00CCCD] px-3 text-xs font-black text-black transition hover:bg-[#00E4E5]"
                          >
                            Manage Player
                          </button>

                        </div>

                      </article>

                    );
                  }
                )}

              </div>

            )}

          </section>

        </div>


        {/* ================================================= */}
        {/* BOTTOM NAVIGATION */}
        {/* ================================================= */}

        <div className="mt-10 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">

          <Link
            href="/admin"
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm font-black text-[#00CCCD]"
          >
            Admin Dashboard
          </Link>


          <Link
            href="/admin/matches"
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm font-black text-gray-300"
          >
            Manage Matches
          </Link>


          <Link
            href="/players"
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm font-black text-gray-300"
          >
            Public Player Rankings
          </Link>

        </div>

      </div>

    </main>

  );
}
