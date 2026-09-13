import Link from "next/link";
import { Fragment } from "react";
import { supabase } from "@/lib/supabase";

import {
  calculateStandings,
  type LeagueTeam,
  type LeagueMatch,
} from "@/lib/leagueStats";


type StandingMatch = LeagueMatch & {
  id: number;
  match_date: string;
};


export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
  }>;
}) {

  const { view } = await searchParams;


  // ONLY ALLOW OUR 3 VIEWS
  const currentView =
    view === "advanced" || view === "copa"
      ? view
      : "standings";

  const showAdvanced =
    currentView === "advanced";

  const showCopa =
    currentView === "copa";


  // ------------------------------------------------
  // GET ALL ACTIVE TEAMS
  // ------------------------------------------------

  const { data: teams, error: teamsError } =
    await supabase
      .from("teams")
      .select(`
        id,
        name,
        slug,
        logo_url
      `)
      .eq("is_active", true);


  // ------------------------------------------------
  // GET ALL MATCHES
  // ------------------------------------------------

  const { data: matches, error: matchesError } =
    await supabase
      .from("matches")
      .select(`
        id,
        match_date,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status
      `)
      .eq("season_id", 1);


  if (teamsError) {
    console.error(
      "Teams error:",
      teamsError
    );
  }

  if (matchesError) {
    console.error(
      "Matches error:",
      matchesError
    );
  }


  const leagueTeams =
    (teams ?? []) as unknown as LeagueTeam[];

  const standingMatches =
    (matches ?? []) as unknown as StandingMatch[];

  const leagueMatches =
    standingMatches as LeagueMatch[];


  // ------------------------------------------------
  // AUTOMATIC STANDINGS
  // ------------------------------------------------

  const standings =
    calculateStandings(
      leagueTeams,
      leagueMatches
    );


  const hasFinishedMatches =
    standingMatches.some(
      (match) =>
        match.status === "finished" &&
        match.home_score !== null &&
        match.away_score !== null
    );


  // ------------------------------------------------
  // RECENT FORM
  // LAST 5 FINISHED MATCHES
  // ------------------------------------------------

  function getTeamForm(teamId: number) {

    return standingMatches
      .filter((match) => {

        const isFinished =
          match.status === "finished" &&
          match.home_score !== null &&
          match.away_score !== null;

        const involvesTeam =
          match.home_team_id === teamId ||
          match.away_team_id === teamId;

        return (
          isFinished &&
          involvesTeam
        );
      })
      .sort((a, b) =>
        b.match_date.localeCompare(
          a.match_date
        )
      )
      .slice(0, 5)
      .map((match) => {

        const isHome =
          match.home_team_id === teamId;

        const goalsFor =
          isHome
            ? match.home_score!
            : match.away_score!;

        const goalsAgainst =
          isHome
            ? match.away_score!
            : match.home_score!;


        if (goalsFor > goalsAgainst) {
          return "W";
        }

        if (goalsFor === goalsAgainst) {
          return "T";
        }

        return "L";
      })
      .reverse();
  }


  // ------------------------------------------------
  // COPA CUT LINE
  // ------------------------------------------------

  const copaCutTeam =
    standings.length >= 8
      ? standings[7]
      : null;


  function getCopaStatus(
    position: number,
    points: number
  ) {

    if (position <= 7) {
      return "Currently in Copa LCF";
    }

    if (position === 8) {
      return "Holding final Copa spot";
    }

    if (!copaCutTeam) {
      return "Outside Copa LCF";
    }


    const pointsBehind =
      copaCutTeam.points - points;


    if (pointsBehind <= 0) {
      return "Currently not in Copa LCF";
    }


    return `${pointsBehind} ${
      pointsBehind === 1
        ? "pt"
        : "pts"
    } from 8th`;
  }


  // ------------------------------------------------
  // COPA LCF QUARTERFINAL PROJECTION
  //
  // #1 vs #8
  // #2 vs #7
  // #3 vs #6
  // #4 vs #5
  // ------------------------------------------------

  const copaQuarterFinals =
    standings.length >= 8
      ? [
          {
            highSeed:
              standings[0],

            lowSeed:
              standings[7],
          },

          {
            highSeed:
              standings[1],

            lowSeed:
              standings[6],
          },

          {
            highSeed:
              standings[2],

            lowSeed:
              standings[5],
          },

          {
            highSeed:
              standings[3],

            lowSeed:
              standings[4],
          },
        ]
      : [];


  // ------------------------------------------------
  // PAGE
  // ------------------------------------------------

  return (
    <>

      <section
        id="standings"
        className="min-h-screen border-t border-white/10 bg-[#030707] px-6 py-36 text-white"
      >

        <div className="mx-auto max-w-7xl">


          {/* ==========================================
              SECTION TITLE
          ========================================== */}

          <div className="mb-14">

            <p className="mb-3 text-lg font-bold uppercase tracking-[0.20em] text-[#00CCCD]">
              Senior LaLiga LCF Season 2026-27
            </p>

            <h2 className="text-3xl font-black md:text-3xl">
              League Standings
            </h2>

            <p className="mt-3 text-sm text-gray-500">
              Live table updated automatically from official LCF results.
            </p>


            {/* VIEW BUTTONS */}

            <div className="mt-7 flex flex-wrap gap-3">

              <Link
                href="/standings"
                className={`
                  rounded-full border px-5 py-2.5
                  text-xs font-black uppercase tracking-wider
                  transition
                  ${
                    currentView === "standings"
                      ? "border-[#00CCCD] bg-[#00CCCD] text-black"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-[#00CCCD]/50 hover:text-white"
                  }
                `}
              >
                Standings
              </Link>


              <Link
                href="/standings?view=advanced"
                className={`
                  rounded-full border px-5 py-2.5
                  text-xs font-black uppercase tracking-wider
                  transition
                  ${
                    showAdvanced
                      ? "border-[#00CCCD] bg-[#00CCCD] text-black"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-[#00CCCD]/50 hover:text-white"
                  }
                `}
              >
                Advanced Stats
              </Link>


              <Link
                href="/standings?view=copa"
                className={`
                  rounded-full border px-5 py-2.5
                  text-xs font-black uppercase tracking-wider
                  transition
                  ${
                    showCopa
                      ? "border-[#00CCCD] bg-[#00CCCD] text-black"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-[#00CCCD]/50 hover:text-white"
                  }
                `}
              >
                Copa Matchups
              </Link>

            </div>

          </div>


          {/* ==========================================
              NORMAL STANDINGS
          ========================================== */}

          {currentView === "standings" && (
            <>

              <div className="overflow-x-auto rounded-3xl bg-white text-black">

                <table className="w-full">

                  <thead>

                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-bold text-gray-600">

                      <th className="px-5 py-4">
                        #
                      </th>

                      <th className="px-1 py-4">
                        TEAM
                      </th>

                      <th className="px-4 py-4 text-center">
                        GP
                      </th>

                      <th className="px-4 py-4 text-center">
                        W
                      </th>

                      <th className="px-4 py-4 text-center">
                        L
                      </th>

                      <th className="px-4 py-4 text-center">
                        T
                      </th>

                      <th className="px-4 py-4 text-center">
                        PTS
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {standings.map((team) => {

                      const inCopaZone =
                        team.position <= 8;

                      const copaStatus =
                        getCopaStatus(
                          team.position,
                          team.points
                        );


                      return (

                        <Fragment
                          key={team.teamId}
                        >

                          <tr
                            className={`
                              border-b border-gray-200
                              transition
                              hover:bg-[#00CCCD]/10

                              ${
                                inCopaZone
                                  ? "bg-[#00CCCD]/[0.025]"
                                  : ""
                              }
                            `}
                          >

                            {/* POSITION */}

                            <td className="px-5 py-3">

                              <span className="font-black">
                                {team.position}
                              </span>

                            </td>


                            {/* TEAM */}

                            <td className="px-1 py-3">

                            <Link
                          href={`/teams/${team.slug}`}
                          className="flex items-center gap-4 transition hover:text-[#008E90]"
                        >

                          <img
                            src={
                              team.logoUrl ??
                              "/lcf-logo.png"
                            }
                            alt={team.name}
                            className="h-8 w-8 object-contain"
                          />

                          <div>

                            <span className="font-bold">
                              {team.name}
                            </span>

                            <p
                              className={`
                                mt-1 text-[10px]
                                font-black uppercase
                                tracking-wider

                                ${
                                  inCopaZone
                                    ? "text-[#008E90]"
                                    : "text-gray-400"
                                }
                              `}
                            >
                              {copaStatus}
                            </p>

                          </div>

                        </Link>

                            </td>


                            {/* GP */}

                            <td className="px-3 py-3 text-center">
                              {team.played}
                            </td>


                            {/* W */}

                            <td className="px-3 py-3 text-center">
                              {team.wins}
                            </td>


                            {/* L */}

                            <td className="px-3 py-3 text-center">
                              {team.losses}
                            </td>


                            {/* T */}

                            <td className="px-3 py-3 text-center">
                              {team.draws}
                            </td>


                            {/* PTS */}

                            <td className="px-3 py-3 text-center font-black text-[#00CCCD]">
                              {team.points}
                            </td>

                          </tr>


                          {/* COPA CUT LINE */}

                          {team.position === 8 && (

                            <tr>

                              <td
                                colSpan={7}
                                className="bg-[#030707] px-4 py-2"
                              >

                                <div className="flex items-center gap-4">

                                  <div className="h-px flex-1 bg-[#00CCCD]/30" />

                                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00CCCD]">
                                    Copa LCF Cut Line
                                  </span>

                                  <div className="h-px flex-1 bg-[#00CCCD]/30" />

                                </div>

                              </td>

                            </tr>

                          )}

                        </Fragment>

                      );

                    })}

                  </tbody>

                </table>

              </div>


              {/* NORMAL STANDINGS INFO */}

              <div className="mt-5 flex flex-col justify-between gap-2 text-xs text-gray-500 sm:flex-row">

                <p>
                  Top 8 currently occupy Copa LCF positions.
                </p>

                <p>
                  GP = Games Played · W = Wins · L = Losses · T = Ties · PTS = Points
                </p>

              </div>


              {/* PRESSURE MESSAGE */}

              <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6">

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                  Copa LCF Race
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  The Top 8 advance to Copa LCF.
                  Seeds and projected quarterfinal opponents change automatically after official results.
                </p>

                <Link
                  href="/standings?view=copa"
                  className="mt-4 inline-block text-sm font-black text-[#00CCCD] transition hover:text-white"
                >
                  View current Copa matchups →
                </Link>

              </div>

            </>
          )}


          {/* ==========================================
              ADVANCED STATISTICS
          ========================================== */}

          {showAdvanced && (

            <div>

              <div className="mb-6">

                <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                  Advanced Performance
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  Team Statistics
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Detailed performance calculated from official LCF results.
                </p>

              </div>


              <div className="overflow-x-auto rounded-3xl bg-white text-black">

                <table className="w-full min-w-[900px]">

                  <thead>

                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm font-bold text-gray-600">

                      <th className="px-5 py-4">
                        #
                      </th>

                      <th className="px-3 py-4">
                        TEAM
                      </th>

                      <th className="px-4 py-4 text-center">
                        GP
                      </th>

                      <th className="px-4 py-4 text-center">
                        GF
                      </th>

                      <th className="px-4 py-4 text-center">
                        GA
                      </th>

                      <th className="px-4 py-4 text-center">
                        GD
                      </th>

                      <th className="px-4 py-4 text-center">
                        WIN %
                      </th>

                      <th className="px-4 py-4 text-center">
                        FORM
                      </th>

                      <th className="px-4 py-4 text-center">
                        PTS
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {standings.map((team) => {

                      const winPercentage =
                        team.played === 0
                          ? 0
                          : Math.round(
                              (
                                team.wins /
                                team.played
                              ) * 100
                            );


                      const form =
                        getTeamForm(
                          team.teamId
                        );


                      return (

                        <tr
                          key={team.teamId}
                          className="border-b border-gray-200 transition hover:bg-[#00CCCD]/10"
                        >

                          {/* POSITION */}

                          <td className="px-5 py-3 font-black">
                            {team.position}
                          </td>


                          {/* TEAM */}

                          <td className="px-3 py-3">

                          <Link
                              
                          href={`/teams/${team.slug}`}
                          className="flex items-center gap-4 transition hover:text-[#008E90]"
                        >

                          <img
                            src={
                              team.logoUrl ??
                              "/lcf-logo.png"
                            }
                            alt={team.name}
                            className="h-8 w-8 object-contain"
                          />

                          <div>

                            <span className="font-bold">
                              {team.name}
                            </span>

                            <p
                              className={`
                                mt-1 text-[10px]
                                font-black uppercase
                                tracking-wider

                                ${
                                  team.position <= 8
                                    ? "text-[#008E90]"
                                    : "text-gray-400"
                                }
                              `}
                            >
                              {getCopaStatus(
                                team.position,
                                team.points
                              )}
                            </p>

                          </div>

                        </Link>``

                          </td>


                          {/* GP */}

                          <td className="px-3 py-3 text-center">
                            {team.played}
                          </td>


                          {/* GF */}

                          <td className="px-3 py-3 text-center font-bold">
                            {team.goalsFor}
                          </td>


                          {/* GA */}

                          <td className="px-3 py-3 text-center font-bold">
                            {team.goalsAgainst}
                          </td>


                          {/* GD */}

                          <td className="px-3 py-3 text-center font-black">

                            {team.goalDifference > 0
                              ? "+"
                              : ""}

                            {team.goalDifference}

                          </td>


                          {/* WIN % */}

                          <td className="px-3 py-3 text-center font-black">
                            {winPercentage}%
                          </td>


                          {/* FORM */}

                          <td className="px-3 py-3">

                            <div className="flex justify-center gap-1">

                              {form.length === 0 ? (

                                <span className="text-gray-400">
                                  —
                                </span>

                              ) : (

                                form.map(
                                  (
                                    result,
                                    index
                                  ) => (

                                    <span
                                      key={index}
                                      className={`
                                        flex h-6 w-6
                                        items-center
                                        justify-center
                                        rounded-full
                                        text-[10px]
                                        font-black

                                        ${
                                          result === "W"
                                            ? "bg-[#00CCCD]/15 text-[#008E90]"
                                            : result === "T"
                                              ? "bg-gray-100 text-gray-600"
                                              : "bg-gray-200 text-gray-700"
                                        }
                                      `}
                                    >
                                      {result}
                                    </span>

                                  )
                                )

                              )}

                            </div>

                          </td>


                          {/* POINTS */}

                          <td className="px-3 py-3 text-center font-black text-[#00CCCD]">
                            {team.points}
                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>


              <div className="mt-5 flex flex-col justify-between gap-2 text-xs text-gray-500 sm:flex-row">

                <p>
                  GF = Goals For · GA = Goals Against · GD = Goal Difference
                </p>

                <p>
                  Form shows each team's last 5 completed matches.
                </p>

              </div>

            </div>

          )}


          {/* ==========================================
              COPA LCF MATCHUPS
          ========================================== */}

          {showCopa && (

            <section>

              <div className="mb-8">

                <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                  Copa LCF Projection
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  If The Season Ended Today
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Projected quarterfinal matchups · January 20, 2027
                </p>

              </div>


              {!hasFinishedMatches ? (

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">

                  <p className="font-black">
                    Copa projections will begin after the first official result.
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Current standings do not yet contain competitive results.
                  </p>

                </div>

              ) : (

                <>

                  {/* PROJECTION WARNING */}

                  <div className="mb-6 rounded-2xl border border-[#00CCCD]/20 bg-[#00CCCD]/[0.04] p-5">

                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
                      Live Projection
                    </p>

                    <p className="mt-2 text-sm text-gray-400">
                      These are not confirmed fixtures.
                      Every official result can change the seeds and quarterfinal opponents.
                    </p>

                  </div>


                  {/* MATCHUPS */}

                  <div className="grid gap-4 md:grid-cols-2">

                    {copaQuarterFinals.map(
                      (
                        quarterFinal,
                        index
                      ) => {

                        const highForm =
                          getTeamForm(
                            quarterFinal
                              .highSeed
                              .teamId
                          );

                        const lowForm =
                          getTeamForm(
                            quarterFinal
                              .lowSeed
                              .teamId
                          );


                        return (

                          <div
                            key={
                              quarterFinal
                                .highSeed
                                .teamId
                            }
                            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#00CCCD]/40"
                          >

                            {/* CARD HEADER */}

                            <div className="mb-6 flex items-center justify-between">

                              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                                Quarterfinal {index + 1}
                              </p>

                              <p className="text-xs font-black text-[#00CCCD]">
                                Jan 20, 2027
                              </p>

                            </div>


                            {/* HIGH SEED */}

                        <div className="flex items-center justify-between gap-4">

                          <Link
                            href={`/teams/${quarterFinal.highSeed.slug}`}
                            className="flex items-center gap-3 transition hover:text-[#00CCCD]"
                          >

                            <img
                              src={
                                quarterFinal.highSeed.logoUrl ??
                                "/lcf-logo.png"
                              }
                              alt={quarterFinal.highSeed.name}
                              className="h-10 w-10 object-contain"
                            />

                            <div>

                              <p className="text-xs font-black text-[#00CCCD]">
                                #{quarterFinal.highSeed.position} Seed
                              </p>

                              <p className="font-black">
                                {quarterFinal.highSeed.name}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {quarterFinal.highSeed.points} PTS
                              </p>

                            </div>

                          </Link>

                        
                              {/* FORM */}

                              <div className="hidden items-center gap-1 sm:flex">

                                {highForm
                                  .slice(-3)
                                  .map(
                                    (
                                      result,
                                      formIndex
                                    ) => (

                                      <span
                                        key={
                                          formIndex
                                        }
                                        className={`
                                          flex h-6 w-6
                                          items-center
                                          justify-center
                                          rounded-full
                                          text-[10px]
                                          font-black

                                          ${
                                            result === "W"
                                              ? "bg-[#00CCCD]/15 text-[#00CCCD]"
                                              : result === "T"
                                                ? "bg-white/10 text-gray-300"
                                                : "bg-white/[0.05] text-gray-500"
                                          }
                                        `}
                                      >
                                        {result}
                                      </span>

                                    )
                                  )}

                              </div>

                            </div>


                            {/* VS */}

                            <div className="my-5 flex items-center gap-4">

                              <div className="h-px flex-1 bg-white/10" />

                              <span className="text-xs font-black text-gray-500">
                                VS
                              </span>

                              <div className="h-px flex-1 bg-white/10" />

                            </div>


                            {/* LOW SEED */}

                            <div className="flex items-center justify-between gap-4">

                              <Link
                          href={`/teams/${quarterFinal.lowSeed.slug}`}
                          className="flex items-center gap-3 transition hover:text-[#00CCCD]"
                        >

                          <img
                            src={
                              quarterFinal.lowSeed.logoUrl ??
                              "/lcf-logo.png"
                            }
                            alt={quarterFinal.lowSeed.name}
                            className="h-10 w-10 object-contain"
                          />

                          <div>

                            <p className="text-xs font-black text-[#00CCCD]">
                              #{quarterFinal.lowSeed.position} Seed
                            </p>

                            <p className="font-black">
                              {quarterFinal.lowSeed.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {quarterFinal.lowSeed.points} PTS
                            </p>

                          </div>

                        </Link>

                              


                              {/* FORM */}

                              <div className="hidden items-center gap-1 sm:flex">

                                {lowForm
                                  .slice(-3)
                                  .map(
                                    (
                                      result,
                                      formIndex
                                    ) => (

                                      <span
                                        key={
                                          formIndex
                                        }
                                        className={`
                                          flex h-6 w-6
                                          items-center
                                          justify-center
                                          rounded-full
                                          text-[10px]
                                          font-black

                                          ${
                                            result === "W"
                                              ? "bg-[#00CCCD]/15 text-[#00CCCD]"
                                              : result === "T"
                                                ? "bg-white/10 text-gray-300"
                                                : "bg-white/[0.05] text-gray-500"
                                          }
                                        `}
                                      >
                                        {result}
                                      </span>

                                    )
                                  )}

                              </div>

                            </div>

                          </div>

                        );

                      }
                    )}

                  </div>


                  {/* BOTTOM MESSAGE */}

                  <div className="mt-8 text-center">

                    <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                      Current Bracket
                    </p>

                    <p className="mt-2 text-sm text-gray-400">
                      #1 vs #8 · #2 vs #7 · #3 vs #6 · #4 vs #5
                    </p>

                  </div>

                </>

              )}

            </section>

          )}

        </div>

      </section>

    </>
  );
}