import Link from "next/link";
import { supabase } from "@/lib/supabase";

import {
  calculateStandings,
  type LeagueTeam,
  type LeagueMatch,
} from "@/lib/leagueStats";


type TeamMatch = LeagueMatch & {
  id: number;
  matchday: number;
  match_date: string;
  match_time: string;
  gym: string | null;
  location: string | null;
};


function formatDate(date: string) {

  const [year, month, day] =
    date.split("-");

  const dateObject =
    new Date(
      `${year}-${month}-${day}T12:00:00Z`
    );

  return dateObject.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}


function formatTime(time: string) {

  const [hourText, minute] =
    time.split(":");

  let hour =
    Number(hourText);

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}


export default async function TeamPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {

  const { slug } =
    await params;


  // --------------------------------
  // GET CURRENT TEAM
  // --------------------------------

  const {
    data: teamData,
    error: teamError,
  } =
    await supabase
      .from("teams")
      .select(`
        id,
        name,
        slug,
        logo_url
      `)
      .eq("slug", slug)
      .single();


  if (
    teamError ||
    !teamData
  ) {

    return (

      <main className="min-h-screen bg-[#030707] px-6 py-36 text-white">

        <div className="mx-auto max-w-7xl">

          <h1 className="text-3xl font-black">
            Team not found
          </h1>

          <Link
            href="/standings"
            className="mt-6 inline-block font-black text-[#00CCCD]"
          >
            ← Back to Standings
          </Link>

        </div>

      </main>

    );

  }


  const currentTeam =
    teamData as LeagueTeam;
  const { data: rosterData } =
  await supabase
    .from("team_rosters")
    .select(`
      id,
      player_id,
      active,

      player:players (
        id,
        first_name,
        last_name,
        slug,
        portrait_url
      )
    `)
    .eq("season_id", 1)
    .eq("team_id", currentTeam.id)
    .eq("active", true);
    
  type RosterPlayer = {
    id: number;
    first_name: string;
    last_name: string;
    slug: string;
    portrait_url: string | null;

  };
  type RosterEntry = {
    id: number;
    player_id: number;
    active: boolean;
    player: RosterPlayer;
  };

  const roster =
    (rosterData ?? []) as unknown as RosterEntry[];
  // --------------------------------
  // GET ALL TEAMS
  // --------------------------------

  const { data: allTeamsData } =
    await supabase
      .from("teams")
      .select(`
        id,
        name,
        slug,
        logo_url
      `)
      .eq("is_active", true);


  const allTeams =
  (allTeamsData ?? []) as unknown as LeagueTeam[];


  // --------------------------------
  // GET SEASON MATCHES
  // --------------------------------

  const { data: matchesData } =
    await supabase
      .from("matches")
      .select(`
        id,
        matchday,
        match_date,
        match_time,
        gym,
        location,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status
      `)
      .eq("season_id", 1);


  const teamMatches =
  (matchesData ?? []) as unknown as TeamMatch[];


  // --------------------------------
  // BUILD LIVE STANDINGS
  // --------------------------------

  const standings =
    calculateStandings(
      allTeams,
      teamMatches
    );


  const teamStanding =
    standings.find(
      (team) =>
        team.teamId ===
        currentTeam.id
    );


  // --------------------------------
  // FIND A TEAM BY ID
  // --------------------------------

  function getTeamById(
    teamId: number
  ) {

    return allTeams.find(
      (team) =>
        team.id === teamId
    );

  }


  // --------------------------------
  // FINISHED MATCHES
  // --------------------------------

  const recentMatches =
    teamMatches
      .filter((match) => {

        const involvesTeam =
          match.home_team_id ===
            currentTeam.id ||
          match.away_team_id ===
            currentTeam.id;

        return (
          involvesTeam &&
          match.status ===
            "finished" &&
          match.home_score !== null &&
          match.away_score !== null
        );

      })
      .sort((a, b) =>
        b.match_date.localeCompare(
          a.match_date
        )
      )
      .slice(0, 5);


  // --------------------------------
  // NEXT MATCH
  // --------------------------------

  const nextMatch =
    teamMatches
      .filter((match) => {

        const involvesTeam =
          match.home_team_id ===
            currentTeam.id ||
          match.away_team_id ===
            currentTeam.id;

        return (
          involvesTeam &&
          match.status ===
            "upcoming"
        );

      })
      .sort((a, b) => {

        const dateCompare =
          a.match_date.localeCompare(
            b.match_date
          );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return a.match_time.localeCompare(
          b.match_time
        );

      })[0] ?? null;


  // --------------------------------
  // COPA STATUS
  // --------------------------------

  const copaCutTeam =
    standings[7] ?? null;


  let copaStatus =
    "Outside Copa LCF";


  if (teamStanding) {

    if (
      teamStanding.position <= 7
    ) {

      copaStatus =
        "Currently in Copa LCF";

    } else if (
      teamStanding.position === 8
    ) {

      copaStatus =
        "Holding final Copa spot";

    } else if (
      copaCutTeam
    ) {

      const pointsBehind =
        copaCutTeam.points -
        teamStanding.points;

      if (pointsBehind <= 0) {

        copaStatus =
          "Outside on tiebreak";

      } else {

        copaStatus =
          `${pointsBehind} ${
            pointsBehind === 1
              ? "pt"
              : "pts"
          } from Copa LCF`;

      }

    }

  }


  // --------------------------------
  // PROJECTED COPA OPPONENT
  // --------------------------------

  const projectedOpponent =
    teamStanding &&
    teamStanding.position >= 1 &&
    teamStanding.position <= 8

      ? standings.find(
          (team) =>
            team.position ===
            9 -
              teamStanding.position
        ) ?? null

      : null;


  // --------------------------------
  // PAGE
  // --------------------------------

  return (

    <main className="min-h-screen bg-[#030707] px-6 py-36 text-white">

      <div className="mx-auto max-w-7xl">


        {/* BACK */}

        <Link
          href="/standings"
          className="text-sm font-black text-[#00CCCD]"
        >
          ← Back to Standings
        </Link>


        {/* TEAM HEADER */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-6">

              <img
                src={
                  currentTeam.logo_url ??
                  "/lcf-logo.png"
                }
                alt={currentTeam.name}
                className="h-24 w-24 object-contain"
              />

              <div>

                <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                  Senior LaLiga LCF
                </p>

                <h1 className="mt-2 text-3xl font-black">
                  {currentTeam.name}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                  2026-27 Regular Season
                </p>

              </div>

            </div>


            <div className="md:text-right">

              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                League Position
              </p>

              <p className="mt-1 text-5xl font-black text-[#00CCCD]">
                #
                {teamStanding?.position ??
                  "-"}
              </p>

            </div>

          </div>

        </section>


        {/* SEASON NUMBERS */}

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              Points
            </p>

            <p className="mt-2 text-3xl font-black text-[#00CCCD]">
              {teamStanding?.points ??
                0}
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              Record
            </p>

            <p className="mt-2 text-xl font-black">
              {teamStanding?.wins ?? 0}
              -
              {teamStanding?.draws ?? 0}
              -
              {teamStanding?.losses ?? 0}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              W-T-L
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              Goals
            </p>

            <p className="mt-2 text-xl font-black">
              {teamStanding?.goalsFor ??
                0}
              {" / "}
              {teamStanding?.goalsAgainst ??
                0}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              GF / GA
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              Goal Difference
            </p>

            <p className="mt-2 text-3xl font-black">

              {teamStanding &&
              teamStanding.goalDifference >
                0
                ? "+"
                : ""}

              {teamStanding
                ?.goalDifference ?? 0}

            </p>

          </div>

        </section>


        {/* COPA OUTLOOK */}

        <section className="mt-8 rounded-3xl border border-[#00CCCD]/20 bg-[#00CCCD]/[0.04] p-8">

          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Copa LCF Outlook
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {copaStatus}
          </h2>


          {projectedOpponent ? (

            <div className="mt-6 border-t border-white/10 pt-6">

              <p className="text-xs uppercase tracking-wider text-gray-500">
                If the season ended today
              </p>

              <p className="mt-2 font-black">
                #
                {teamStanding?.position}
                {" "}
                {currentTeam.name}
              </p>

              <p className="my-2 text-sm font-black text-gray-500">
                VS
              </p>

              <p className="font-black">
                #
                {
                  projectedOpponent.position
                }
                {" "}
                {
                  projectedOpponent.name
                }
              </p>

              <p className="mt-3 text-xs text-gray-500">
                Projected Quarterfinal · January 20, 2027
              </p>

            </div>

          ) : (

            <p className="mt-4 text-sm text-gray-500">
              No projected quarterfinal matchup.
            </p>

          )}


          <Link
            href="/standings?view=copa"
            className="mt-6 inline-block text-sm font-black text-[#00CCCD]"
          >
            View Copa LCF projection →
          </Link>

        </section>


        {/* NEXT MATCH */}

        <section className="mt-8">

          <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Next Fixture
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Next Match
          </h2>


          {nextMatch ? (() => {

            const homeTeam =
              getTeamById(
                nextMatch.home_team_id
              );

            const awayTeam =
              getTeamById(
                nextMatch.away_team_id
              );

            return (

              <Link
                href={`/matches/${nextMatch.id}`}
                className="mt-6 block rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#00CCCD]/50"
              >

                <p className="text-xs font-bold text-gray-500">
                  Matchday{" "}
                  {nextMatch.matchday}
                  {" · "}
                  {formatDate(
                    nextMatch.match_date
                  )}
                  {" · "}
                  {formatTime(
                    nextMatch.match_time
                  )}
                </p>


                <div className="mt-5 flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <img
                      src={
                        homeTeam?.logo_url ??
                        "/lcf-logo.png"
                      }
                      alt={
                        homeTeam?.name ??
                        "Home Team"
                      }
                      className="h-10 w-10 object-contain"
                    />

                    <p className="font-black">
                      {homeTeam?.name}
                    </p>

                  </div>


                  <span className="text-sm font-black text-[#00CCCD]">
                    VS
                  </span>


                  <div className="flex items-center gap-3">

                    <p className="text-right font-black">
                      {awayTeam?.name}
                    </p>

                    <img
                      src={
                        awayTeam?.logo_url ??
                        "/lcf-logo.png"
                      }
                      alt={
                        awayTeam?.name ??
                        "Away Team"
                      }
                      className="h-10 w-10 object-contain"
                    />

                  </div>

                </div>

              </Link>

            );

          })() : (

            <p className="mt-5 text-sm text-gray-500">
              No upcoming match.
            </p>

          )}

        </section>


        {/* RECENT RESULTS */}

        <section className="mt-12">

          <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Recent Form
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Recent Results
          </h2>


          <div className="mt-6 space-y-3">

            {recentMatches.length === 0 ? (

              <p className="text-sm text-gray-500">
                No completed matches yet.
              </p>

            ) : (

              recentMatches.map(
                (game) => {

                  const homeTeam =
                    getTeamById(
                      game.home_team_id
                    );

                  const awayTeam =
                    getTeamById(
                      game.away_team_id
                    );


                  const isHome =
                    game.home_team_id ===
                    currentTeam.id;


                  const goalsFor =
                    isHome
                      ? game.home_score!
                      : game.away_score!;


                  const goalsAgainst =
                    isHome
                      ? game.away_score!
                      : game.home_score!;


                  const result =
                    goalsFor >
                    goalsAgainst
                      ? "W"
                      : goalsFor ===
                          goalsAgainst
                        ? "T"
                        : "L";


                  return (

                    <Link
                      key={game.id}
                      href={`/matches/${game.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#00CCCD]/40"
                    >

                      <div>

                        <p className="text-xs text-gray-500">
                          {formatDate(
                            game.match_date
                          )}
                        </p>

                        <p className="mt-1 font-black">
                          {homeTeam?.name}
                          {" "}
                          {game.home_score}
                          {" - "}
                          {game.away_score}
                          {" "}
                          {awayTeam?.name}
                        </p>

                      </div>


                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00CCCD]/10 text-sm font-black text-[#00CCCD]">
                        {result}
                      </span>

                    </Link>

                  );

                }
              )

            )}

          </div>

        </section>



       


        {/* TEAM ROSTER */}

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          {/* HEADER */}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>

              <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                Squad
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Official Roster
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                2026-27 LCF Season
              </p>

            </div>


            <p className="text-sm font-black text-gray-500">
              {roster.length} Players
            </p>

          </div>


          {/* EMPTY ROSTER */}

          {roster.length === 0 ? (

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">

              <p className="font-black text-gray-300">
                Official roster coming soon.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Player information will appear here once registered for the season.
              </p>

            </div>

          ) : (

            /* PLAYER GRID */

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {roster.map((entry) => {

                const player =
                  entry.player;

                return (

                  <div
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-[#00CCCD]/40"
                  >

                    <div className="flex items-center gap-4">

                      {/* PORTRAIT */}

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black">

                        <img
                          src={
                            player.portrait_url ??
                            "/lcf-logo.png"
                          }
                          alt={`${player.first_name} ${player.last_name}`}
                          className="h-full w-full object-cover"
                        />

                      </div>


                      {/* PLAYER INFORMATION */}

                      <div className="min-w-0">

                        <p className="truncate text-lg font-black">
                          {player.first_name}{" "}
                          {player.last_name}
                        </p>

                        <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                          {currentTeam.name}
                        </p>

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </section>
        

      </div>

    </main>

  );
}