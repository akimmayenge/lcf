import Link from "next/link";

import { supabase } from "@/lib/supabase";


// ==========================================================
// TYPES
// ==========================================================

type Player = {
  id: number;
  first_name: string;
  last_name: string;
  slug: string;
  portrait_url: string | null;
  instagram_url: string | null;
};


type Team = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
};


type RosterEntry = {
  team_id: number;
  position: string | null;
  active: boolean;

  team: Team;
};


type PlayerMatchStat = {
  match_id: number;
  team_id: number | null;
  present: boolean;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  is_motm: boolean;
  is_goalkeeper: boolean;
};


type MatchRow = {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
};


type MatchdayAwardRow = {
  id: number;
  matchday: number;
  potw_player_id: number;
};


// ==========================================================
// PAGE
// ==========================================================

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    from?: string;
  }>;
}) {

  const {
    slug,
  } =
    await params;


  const {
    from,
  } =
    await searchParams;


  const cameFromAdmin =
    from === "admin";


  // ========================================================
  // GET PLAYER
  // ========================================================

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
      .eq(
        "slug",
        slug
      )
      .single();


  if (
    playerError ||
    !playerData
  ) {

    return (

      <main className="min-h-screen bg-[#030707] px-4 pb-20 pt-32 text-white sm:px-6 md:pt-40">

        <div className="mx-auto max-w-5xl">

          <h1 className="text-3xl font-black">
            Player not found
          </h1>


          <Link
            href={
              cameFromAdmin
                ? "/admin/players"
                : "/players"
            }
            className="mt-6 inline-block font-black text-[#00CCCD]"
          >
            {cameFromAdmin
              ? "← Back to Player Management"
              : "← Back to Players"}
          </Link>

        </div>

      </main>

    );
  }


  const player =
    playerData as Player;


  // ========================================================
  // GET CURRENT TEAM / ROSTER
  // ========================================================

  const {
    data: rosterData,
    error: rosterError,
  } =
    await supabase
      .from("team_rosters")
      .select(`
        team_id,
        position,
        active,

        team:teams (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq(
        "season_id",
        1
      )
      .eq(
        "player_id",
        player.id
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();


  if (rosterError) {

    console.error(
      "Player roster error:",
      rosterError
    );
  }


  const roster =
    rosterData as unknown as
      RosterEntry | null;


  const currentTeam =
    roster?.team ?? null;


  const currentTeamId =
    roster?.team_id ?? null;


  const rosterPosition =
    roster?.position ?? null;


  // ========================================================
  // PLAYER MATCH STATISTICS
  // ========================================================

  const {
    data: statsData,
    error: statsError,
  } =
    await supabase
      .from("player_match_stats")
      .select(`
        match_id,
        team_id,
        present,
        goals,
        yellow_cards,
        red_cards,
        is_motm,
        is_goalkeeper
      `)
      .eq(
        "player_id",
        player.id
      );


  if (statsError) {

    console.error(
      "Player stats error:",
      statsError
    );
  }


  const playerMatchStats =
    (statsData ?? []) as PlayerMatchStat[];


  // ========================================================
  // LOAD ALL MATCHES NEEDED FOR WIN / GK CALCULATIONS
  // ========================================================

  const matchIds =
    Array.from(
      new Set(
        playerMatchStats.map(
          (stat) =>
            stat.match_id
        )
      )
    );


  let matches:
    MatchRow[] = [];


  if (
    matchIds.length > 0
  ) {

    const {
      data: matchData,
      error: matchError,
    } =
      await supabase
        .from("matches")
        .select(`
          id,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          status
        `)
        .in(
          "id",
          matchIds
        )
        .eq(
          "status",
          "finished"
        );


    if (matchError) {

      console.error(
        "Player matches error:",
        matchError
      );

    } else {

      matches =
        (matchData ?? []) as MatchRow[];
    }
  }


  const matchMap =
    new Map<
      number,
      MatchRow
    >();


  for (
    const match
    of matches
  ) {

    matchMap.set(
      match.id,
      match
    );
  }


  // ========================================================
  // PLAYER OF THE WEEK
  // ========================================================

  const {
    data: potwData,
    error: potwError,
  } =
    await supabase
      .from("matchday_awards")
      .select(`
        id,
        matchday,
        potw_player_id
      `)
      .eq(
        "season_id",
        1
      )
      .eq(
        "potw_player_id",
        player.id
      );


  if (potwError) {

    console.error(
      "POTW error:",
      potwError
    );
  }


  const potwAwards =
    (potwData ?? []) as MatchdayAwardRow[];


  // ========================================================
  // GENERAL PLAYER TOTALS
  // ========================================================

  const presentStats =
    playerMatchStats.filter(
      (stat) =>
        stat.present
    );


  const gamesPlayed =
    presentStats.length;


  const totalGoals =
    presentStats.reduce(
      (
        total,
        stat
      ) =>
        total +
        (
          stat.goals ?? 0
        ),
      0
    );


  const totalYellowCards =
    presentStats.reduce(
      (
        total,
        stat
      ) =>
        total +
        (
          stat.yellow_cards
          ?? 0
        ),
      0
    );


  const totalRedCards =
    presentStats.reduce(
      (
        total,
        stat
      ) =>
        total +
        (
          stat.red_cards
          ?? 0
        ),
      0
    );


  const totalMotm =
    presentStats.filter(
      (stat) =>
        stat.is_motm
    ).length;


  const totalPotw =
    potwAwards.length;


  // ========================================================
  // WINNING APPEARANCES
  // ========================================================

  function getStatTeamId(
    stat: PlayerMatchStat
  ) {

    return (
      stat.team_id ??
      currentTeamId
    );
  }


  function isWinningAppearance(
    stat: PlayerMatchStat
  ) {

    if (
      !stat.present
    ) {

      return false;
    }


    const match =
      matchMap.get(
        stat.match_id
      );


    const teamId =
      getStatTeamId(
        stat
      );


    if (
      !match ||
      teamId === null ||
      match.home_score === null ||
      match.away_score === null
    ) {

      return false;
    }


    if (
      teamId ===
      match.home_team_id
    ) {

      return (
        match.home_score >
        match.away_score
      );
    }


    if (
      teamId ===
      match.away_team_id
    ) {

      return (
        match.away_score >
        match.home_score
      );
    }


    return false;
  }


  const winningApps =
    presentStats.filter(
      (stat) =>
        isWinningAppearance(
          stat
        )
    ).length;


  // ========================================================
  // MVP
  //
  // MOTM = +3
  // POTW = +1
  // Winning Appearance = +1
  // ========================================================

  const mvpPoints =
    totalMotm * 3 +
    totalPotw +
    winningApps;


  // ========================================================
  // GOALKEEPER TOTALS
  // ========================================================

  const goalkeeperStats =
    presentStats.filter(
      (stat) =>
        stat.is_goalkeeper
    );


  const goalkeeperGames =
    goalkeeperStats.length;


  let goalkeeperWins = 0;
  let cleanSheets = 0;
  let goalkeeperMotm = 0;
  let goalsAllowed = 0;


  for (
    const stat
    of goalkeeperStats
  ) {

    const match =
      matchMap.get(
        stat.match_id
      );


    const teamId =
      getStatTeamId(
        stat
      );


    if (
      !match ||
      teamId === null ||
      match.home_score === null ||
      match.away_score === null
    ) {

      continue;
    }


    if (
      isWinningAppearance(
        stat
      )
    ) {

      goalkeeperWins++;
    }


    if (
      stat.is_motm
    ) {

      goalkeeperMotm++;
    }


    if (
      teamId ===
      match.home_team_id
    ) {

      goalsAllowed +=
        match.away_score;


      if (
        match.away_score === 0
      ) {

        cleanSheets++;
      }

    } else if (
      teamId ===
      match.away_team_id
    ) {

      goalsAllowed +=
        match.home_score;


      if (
        match.home_score === 0
      ) {

        cleanSheets++;
      }
    }
  }


  const goalsAllowedPerMatch =
    goalkeeperGames > 0
      ? goalsAllowed /
        goalkeeperGames
      : 0;


  // ========================================================
  // GOLDEN GLOVE
  //
  // Clean Sheet = +3
  // Winning Appearance = +1
  // GK MOTM = +2
  // ========================================================

  const goldenGlovePoints =
    cleanSheets * 3 +
    goalkeeperWins +
    goalkeeperMotm * 2;


  const isRegisteredGoalkeeper =
    rosterPosition
      ?.toUpperCase() ===
    "GK";


  const showGoalkeeperSection =
    isRegisteredGoalkeeper ||
    goalkeeperGames > 0;


  // ========================================================
  // PAGE
  // ========================================================

  return (

    <main className="min-h-screen bg-[#030707] px-4 pb-20 pt-28 text-white sm:px-6 sm:pt-32 md:pt-40">

      <div className="mx-auto max-w-5xl">


        {/* ================================================= */}
        {/* PAGE NAVIGATION */}
        {/* ================================================= */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <Link
            href={
              cameFromAdmin
                ? "/admin/players"
                : "/players"
            }
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-black text-[#00CCCD] transition hover:border-[#00CCCD]/40"
          >
            {cameFromAdmin
              ? "← Player Management"
              : "← Players"}
          </Link>


          {cameFromAdmin && (

            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-sm font-black text-gray-400 transition hover:border-[#00CCCD]/40 hover:text-[#00CCCD]"
            >
              Admin Dashboard
            </Link>

          )}

        </div>


        {/* ================================================= */}
        {/* PLAYER HEADER */}
        {/* ================================================= */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">

          <div className="p-5 sm:p-7 md:p-8">

            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">


              {/* PORTRAIT */}

              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black sm:h-32 sm:w-32 md:h-36 md:w-36">

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


              {/* PLAYER INFO */}

              <div className="min-w-0 flex-1">

                <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                  LCF Player
                </p>


                <h1 className="mt-3 break-words text-3xl font-black leading-tight sm:text-4xl">
                  {player.first_name}{" "}
                  {player.last_name}
                </h1>


                {currentTeam ? (

                  <Link
                    href={`/teams/${currentTeam.slug}`}
                    className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition hover:border-[#00CCCD]/40 sm:mx-0"
                  >

                    <img
                      src={
                        currentTeam.logo_url
                        ??
                        "/lcf-logo.png"
                      }
                      alt={
                        currentTeam.name
                      }
                      className="h-8 w-8 object-contain"
                    />


                    <div>

                      <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                        Current Team
                      </p>

                      <p className="mt-0.5 font-black">
                        {currentTeam.name}
                      </p>

                    </div>

                  </Link>

                ) : (

                  <p className="mt-5 text-sm text-gray-500">
                    No active team.
                  </p>

                )}


                {rosterPosition && (

                  <p className="mt-3 text-xs font-black uppercase tracking-wider text-gray-500">
                    Position:{" "}
                    <span className="text-white">
                      {rosterPosition}
                    </span>
                  </p>

                )}

              </div>

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* MAIN SEASON STATS */}
        {/* ================================================= */}

        <section className="mt-8">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD] sm:text-sm">
              2026-27 Season
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Player Statistics
            </h2>

          </div>


          {/* MAIN CARDS */}

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">


            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 sm:text-xs">
                Games
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                {gamesPlayed}
              </p>

            </div>


            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 sm:text-xs">
                Goals
              </p>

              <p className="mt-2 text-2xl font-black text-[#00CCCD] sm:text-3xl">
                {totalGoals}
              </p>

            </div>


            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 sm:text-xs">
                MOTM
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                {totalMotm}
              </p>

            </div>


            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 sm:text-xs">
                POTW
              </p>

              <p className="mt-2 text-2xl font-black sm:text-3xl">
                {totalPotw}
              </p>

            </div>

          </div>


          {/* MVP SUMMARY */}

          <div className="mt-4 rounded-2xl border border-[#00CCCD]/20 bg-[#00CCCD]/[0.05] p-5 sm:p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                  MVP Race
                </p>

                <h3 className="mt-2 text-xl font-black">
                  {mvpPoints} MVP Points
                </h3>

              </div>


              <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[300px]">

                <div className="rounded-xl bg-black/20 p-3">

                  <p className="text-lg font-black">
                    {totalMotm}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-gray-500">
                    MOTM
                  </p>

                </div>


                <div className="rounded-xl bg-black/20 p-3">

                  <p className="text-lg font-black">
                    {totalPotw}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-gray-500">
                    POTW
                  </p>

                </div>


                <div className="rounded-xl bg-black/20 p-3">

                  <p className="text-lg font-black">
                    {winningApps}
                  </p>

                  <p className="mt-1 text-[10px] font-black uppercase text-gray-500">
                    Win Apps
                  </p>

                </div>

              </div>

            </div>


            <p className="mt-4 text-xs leading-5 text-gray-500">
              MOTM +3 · POTW +1 · Winning Appearance +1
            </p>

          </div>


          {/* DISCIPLINE */}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 sm:text-xs">
                Yellow Cards
              </p>

              <p className="mt-2 text-2xl font-black">
                {totalYellowCards}
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 sm:text-xs">
                Red Cards
              </p>

              <p className="mt-2 text-2xl font-black">
                {totalRedCards}
              </p>

            </div>

          </div>


          <p className="mt-4 text-xs leading-5 text-gray-600">
            Statistics update automatically from official LCF game sheets.
          </p>

        </section>


        {/* ================================================= */}
        {/* GOALKEEPER SECTION */}
        {/* ================================================= */}

        {showGoalkeeperSection && (

          <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                Goalkeeper
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Golden Glove Statistics
              </h2>

            </div>


            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">


              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase text-gray-500">
                  GK Games
                </p>

                <p className="mt-2 text-2xl font-black">
                  {goalkeeperGames}
                </p>

              </div>


              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase text-gray-500">
                  Wins
                </p>

                <p className="mt-2 text-2xl font-black">
                  {goalkeeperWins}
                </p>

              </div>


              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase text-gray-500">
                  Clean Sheets
                </p>

                <p className="mt-2 text-2xl font-black">
                  {cleanSheets}
                </p>

              </div>


              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase text-gray-500">
                  GK MOTM
                </p>

                <p className="mt-2 text-2xl font-black">
                  {goalkeeperMotm}
                </p>

              </div>


              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase text-gray-500">
                  Goals Allowed
                </p>

                <p className="mt-2 text-2xl font-black">
                  {goalsAllowed}
                </p>

              </div>


              <div className="rounded-xl bg-black/20 p-4">

                <p className="text-[10px] font-black uppercase text-gray-500">
                  GA / Match
                </p>

                <p className="mt-2 text-2xl font-black">
                  {goalsAllowedPerMatch.toFixed(2)}
                </p>

              </div>

            </div>


            <div className="mt-4 rounded-xl border border-[#00CCCD]/20 bg-[#00CCCD]/[0.05] p-4">

              <p className="text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                Golden Glove Points
              </p>

              <p className="mt-2 text-3xl font-black">
                {goldenGlovePoints}
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Clean Sheet +3 · GK MOTM +2 · Winning Appearance +1
              </p>

            </div>

          </section>

        )}


        {/* ================================================= */}
        {/* CAREER */}
        {/* ================================================= */}

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Career
          </p>

          <h2 className="mt-2 text-2xl font-black">
            LCF History
          </h2>


          {currentTeam ? (

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <img
                  src={
                    currentTeam.logo_url
                    ??
                    "/lcf-logo.png"
                  }
                  alt={
                    currentTeam.name
                  }
                  className="h-10 w-10 object-contain"
                />


                <div>

                  <p className="text-xs font-black text-gray-500">
                    2026-27
                  </p>

                  <p className="mt-1 font-black">
                    {currentTeam.name}
                  </p>

                </div>

              </div>


              <span className="w-fit rounded-full bg-[#00CCCD]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                Active
              </span>

            </div>

          ) : (

            <p className="mt-5 text-sm text-gray-500">
              No LCF history available.
            </p>

          )}

        </section>


        {/* ================================================= */}
        {/* BOTTOM NAVIGATION */}
        {/* ================================================= */}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">

          <Link
            href="/players"
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm font-black text-[#00CCCD] transition hover:border-[#00CCCD]/40"
          >
            View Player Rankings
          </Link>


          {cameFromAdmin ? (

            <Link
              href="/admin/players"
              className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-4 text-center text-sm font-black text-gray-300 transition hover:border-[#00CCCD]/40 hover:text-[#00CCCD]"
            >
              Back to Player Management
            </Link>

          ) : (

            <Link
              href="/"
              className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-4 text-center text-sm font-black text-gray-300 transition hover:border-[#00CCCD]/40 hover:text-[#00CCCD]"
            >
              LCF Home
            </Link>

          )}

        </div>

      </div>

    </main>

  );
}
