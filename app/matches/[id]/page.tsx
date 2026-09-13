import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  calculateStandings,
  calculateMatchPrediction,
  type LeagueTeam,
  type LeagueMatch,
} from "@/lib/leagueStats";

type DatabaseTeam = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
};

type DatabasePrediction = {
  home_percentage: number;
  draw_percentage: number;
  away_percentage: number;
  total_votes: number;
  source: string;
};

type DatabaseMatch = {
  id: number;
  season_id: number;
  match_date: string;
  match_time: string;
  gym: string | null;
  location: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;

  home_team: DatabaseTeam;
  away_team: DatabaseTeam;

  match_predictions: DatabasePrediction[];
};

function formatMatchTime(time: string) {
  const [hourText, minute] = time.split(":");

  let hour = Number(hourText);

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

function formatFullDate(date: string) {
  const [year, month, day] = date.split("-");

  const dateObject = new Date(
    `${year}-${month}-${day}T12:00:00Z`
  );

  return dateObject.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function MatchDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const matchId = Number(id);

  const { data, error } = await supabase
    .from("matches")
    .select(`
      id,
      season_id,
      match_date,
      match_time,
      gym,
      location,
      home_score,
      away_score,
      status,

      home_team:teams!matches_home_team_id_fkey (
        id,
        name,
        slug,
        logo_url
      ),

      away_team:teams!matches_away_team_id_fkey (
        id,
        name,
        slug,
        logo_url
      ),

      match_predictions (
        home_percentage,
        draw_percentage,
        away_percentage,
        total_votes,
        source
      )
    `)
    .eq("id", matchId)
    .single();

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#030707] px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-black text-red-400">
            Match not found
          </h1>
        </div>
      </main>
    );
  }

  const match =
    data as unknown as DatabaseMatch;

  const prediction =
    match.match_predictions?.[0];
  const { data: finishedMatches } = await supabase
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
  .eq("season_id", match.season_id)
  .eq("status", "finished")
  .order("match_date", { ascending: true });

  type FinishedMatch = {
  id: number;
  match_date: string;

  home_team_id: number;
  away_team_id: number;

  home_score: number | null;
  away_score: number | null;

  status: string;
};

const seasonMatches =
  (finishedMatches ?? []) as FinishedMatch[];
function calculateTeamStats(teamId: number) {
  let games = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;

  let goalsScored = 0;
  let goalsConceded = 0;

  for (const game of seasonMatches) {

    const isHome =
      game.home_team_id === teamId;

    const isAway =
      game.away_team_id === teamId;

    if (!isHome && !isAway) {
      continue;
    }

    if (
      game.home_score === null ||
      game.away_score === null
    ) {
      continue;
    }

    games++;

    const scored =
      isHome
        ? game.home_score
        : game.away_score;

    const conceded =
      isHome
        ? game.away_score
        : game.home_score;

    goalsScored += scored;
    goalsConceded += conceded;

    if (scored > conceded) {
      wins++;
    } else if (scored === conceded) {
      draws++;
    } else {
      losses++;
    }
  }

  const points =
    wins * 3 + draws;

  return {
    games,
    wins,
    draws,
    losses,
    goalsScored,
    goalsConceded,
    goalDifference:
      goalsScored - goalsConceded,
    points,
  };
}

const homeStats =
  calculateTeamStats(match.home_team.id);

const awayStats =
  calculateTeamStats(match.away_team.id);
// GET ALL ACTIVE TEAMS
const { data: allTeams } = await supabase
  .from("teams")
  .select(`
    id,
    name,
    slug,
    logo_url
  `)
  .eq("is_active", true);


const leagueTeams =
  (allTeams ?? []) as unknown as LeagueTeam[];


// We can reuse the finished matches already loaded
const leagueMatches =
  seasonMatches as unknown as LeagueMatch[];


// Build the current live standings
const liveStandings =
  calculateStandings(
    leagueTeams,
    leagueMatches
  );


// Find both teams inside the standings
const homeStanding =
  liveStandings.find(
    (team) =>
      team.teamId === match.home_team.id
  );

const awayStanding =
  liveStandings.find(
    (team) =>
      team.teamId === match.away_team.id
  );


// Statistical prediction
const statisticalPrediction =
  homeStanding && awayStanding
    ? calculateMatchPrediction(
        homeStanding,
        awayStanding
      )
    : {
        homeWin: 33,
        draw: 34,
        awayWin: 33,
      };
// HAS THE SEASON STARTED?
const hasLeagueResults =
  seasonMatches.length > 0;


// TEAM CURRENTLY IN 8TH PLACE
const copaCutTeam =
  liveStandings[7] ?? null;


// CREATE THE COPA STATUS MESSAGE
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
    return "Outside on tiebreak";
  }

  return `${pointsBehind} ${
    pointsBehind === 1
      ? "pt"
      : "pts"
  } from Copa LCF`;
}


// FIND PROJECTED QUARTERFINAL OPPONENT
function getProjectedCopaOpponent(
  position: number
) {

  if (
    position < 1 ||
    position > 8
  ) {
    return null;
  }

  const opponentPosition =
    9 - position;

  return liveStandings.find(
    (team) =>
      team.position === opponentPosition
  ) ?? null;
}


// HOME TEAM COPA INFORMATION
const homeCopaStatus =
  homeStanding
    ? getCopaStatus(
        homeStanding.position,
        homeStanding.points
      )
    : "No standings data";

const homeCopaOpponent =
  homeStanding
    ? getProjectedCopaOpponent(
        homeStanding.position
      )
    : null;


// AWAY TEAM COPA INFORMATION
const awayCopaStatus =
  awayStanding
    ? getCopaStatus(
        awayStanding.position,
        awayStanding.points
      )
    : "No standings data";

const awayCopaOpponent =
  awayStanding
    ? getProjectedCopaOpponent(
        awayStanding.position
      )
    : null;

const previousMeetings = seasonMatches
  .filter((game) => {

    // Do not include the current match
    if (game.id === match.id) {
      return false;
    }

    // Only matches before this one
    if (game.match_date >= match.match_date) {
      return false;
    }

    const sameDirection =
      game.home_team_id === match.home_team.id &&
      game.away_team_id === match.away_team.id;

    const reversedDirection =
      game.home_team_id === match.away_team.id &&
      game.away_team_id === match.home_team.id;

    return sameDirection || reversedDirection;
  })
  .sort((a, b) =>
    b.match_date.localeCompare(a.match_date)
  );


  return (
    <main className="min-h-screen bg-[#030707] px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl py-15">

        {/* BACK */}
        <Link
          href="/matches"
          className="text-sm font-black text-[#00CCCD]"
        >
          ← Back to Matches
        </Link>

        {/* MATCH HEADER */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <div className="text-center">

            <p className="text-sm font-bold text-gray-400">
              {formatFullDate(match.match_date)}
            </p>

            <p className="mt-1 text-sm font-black text-[#00CCCD]">
              {formatMatchTime(match.match_time)}
            </p>

          </div>

          <div className="mt-10 grid grid-cols-3 items-center gap-6">

            {/* HOME */}
            <div className="text-center">

              <img
                src={
                  match.home_team.logo_url ??
                  "/lcf-logo.png"
                }
                alt={match.home_team.name}
                className="mx-auto h-20 w-20 object-contain"
              />

              <h2 className="mt-4 text-xl font-black">
                {match.home_team.name}
              </h2>

            </div>

            {/* CENTER */}
            <div className="text-center">

              {match.status === "finished" ? (
                <>
                  <p className="text-xs font-black uppercase tracking-widest text-[#00CCCD]">
                    Full Time
                  </p>

                  <div className="mt-3 text-5xl font-black">
                    {match.home_score}
                    <span className="mx-3 text-gray-500">
                      -
                    </span>
                    {match.away_score}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                    Upcoming
                  </p>

                  <p className="mt-3 text-3xl font-black text-[#00CCCD]">
                    VS
                  </p>
                </>
              )}

            </div>

            {/* AWAY */}
            <div className="text-center">

              <img
                src={
                  match.away_team.logo_url ??
                  "/lcf-logo.png"
                }
                alt={match.away_team.name}
                className="mx-auto h-20 w-20 object-contain"
              />

              <h2 className="mt-4 text-xl font-black">
                {match.away_team.name}
              </h2>

            </div>

          </div>

          <div className="mt-8 text-center text-sm text-gray-400">
            <p className="font-black text-white">
              {match.gym ?? "Gym TBD"}
            </p>

            <p className="mt-1">
              {match.location ?? "Location TBD"}
            </p>
          </div>

        </div>
              {/* COPA LCF OUTLOOK */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              Copa LCF Outlook
            </p>

            <h3 className="mt-2 text-xl font-black">
              If The Season Ended Today
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Projected quarterfinal picture · January 20, 2027
            </p>

          </div>


          <Link
            href="/standings?view=copa"
            className="text-sm font-black text-[#00CCCD] transition hover:text-white"
          >
            View Copa Matchups →
          </Link>

        </div>


        {!hasLeagueResults ? (

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

            <p className="text-sm font-bold text-gray-400">
              Copa LCF projections begin after the first official result.
            </p>

          </div>

        ) : (

          <div className="mt-8 grid gap-4 md:grid-cols-2">


            {/* HOME TEAM */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <div className="flex items-center gap-3">

                <img
                  src={
                    match.home_team.logo_url ??
                    "/lcf-logo.png"
                  }
                  alt={match.home_team.name}
                  className="h-10 w-10 object-contain"
                />

                <div>

                  <p className="font-black">
                    {match.home_team.name}
                  </p>

                  <p className="mt-1 text-xs font-black text-[#00CCCD]">
                    #{homeStanding?.position ?? "-"}
                  </p>

                </div>

              </div>


              <p className="mt-5 text-sm font-black">
                {homeCopaStatus}
              </p>


              {homeCopaOpponent ? (

                <div className="mt-4 border-t border-white/10 pt-4">

                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Projected Quarterfinal
                  </p>

                  <p className="mt-2 text-sm font-black">
                    vs #{homeCopaOpponent.position}{" "}
                    {homeCopaOpponent.name}
                  </p>

                </div>

              ) : (

                <p className="mt-4 border-t border-white/10 pt-4 text-xs text-gray-500">
                  No projected quarterfinal opponent.
                </p>

              )}

            </div>


            {/* AWAY TEAM */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <div className="flex items-center gap-3">

                <img
                  src={
                    match.away_team.logo_url ??
                    "/lcf-logo.png"
                  }
                  alt={match.away_team.name}
                  className="h-10 w-10 object-contain"
                />

                <div>

                  <p className="font-black">
                    {match.away_team.name}
                  </p>

                  <p className="mt-1 text-xs font-black text-[#00CCCD]">
                    #{awayStanding?.position ?? "-"}
                  </p>

                </div>

              </div>


              <p className="mt-5 text-sm font-black">
                {awayCopaStatus}
              </p>


              {awayCopaOpponent ? (

                <div className="mt-4 border-t border-white/10 pt-4">

                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Projected Quarterfinal
                  </p>

                  <p className="mt-2 text-sm font-black">
                    vs #{awayCopaOpponent.position}{" "}
                    {awayCopaOpponent.name}
                  </p>

                </div>

              ) : (

                <p className="mt-4 border-t border-white/10 pt-4 text-xs text-gray-500">
                  No projected quarterfinal opponent.
                </p>

              )}

            </div>

          </div>

        )}

</section>


              {/* LCF STATISTICAL ESTIMATE */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              LCF Statistical Estimate
            </p>

            <h3 className="mt-2 text-xl font-black">
              Match Prediction
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Based on current regular-season performance
            </p>

          </div>


          <div className="text-left sm:text-right">

            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
              Current Positions
            </p>

            <p className="mt-1 text-sm font-black">
              #{homeStanding?.position ?? "-"}
              {" vs "}
              #{awayStanding?.position ?? "-"}
            </p>

          </div>

        </div>


        {/* PREDICTION NUMBERS */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">

          {/* HOME */}
          <div>

            <p className="text-3xl font-black text-[#00CCCD]">
              {statisticalPrediction.homeWin}%
            </p>

            <p className="mt-2 text-sm font-bold text-gray-400">
              {match.home_team.name}
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Win
            </p>

          </div>


          {/* DRAW */}
          <div>

            <p className="text-3xl font-black">
              {statisticalPrediction.draw}%
            </p>

            <p className="mt-2 text-sm font-bold text-gray-400">
              Draw
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Tie
            </p>

          </div>


          {/* AWAY */}
          <div>

            <p className="text-3xl font-black text-[#00CCCD]">
              {statisticalPrediction.awayWin}%
            </p>

            <p className="mt-2 text-sm font-bold text-gray-400">
              {match.away_team.name}
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Win
            </p>

          </div>

        </div>


        {/* DISCLAIMER */}
        <div className="mt-7 border-t border-white/10 pt-5">

          <p className="text-xs leading-5 text-gray-600">
            Statistical estimate only. Probabilities update automatically as official LCF results are recorded.
          </p>

        </div>

      </section>

        {/* FAN PREDICTION */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <div className="flex items-center justify-between">

            <div>
              <h3 className="text-xl font-black">
                Fan Prediction
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Instagram Community
              </p>
            </div>

            <p className="text-sm font-bold text-gray-500">
              {prediction?.total_votes ?? 0} votes
            </p>

          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">

            <div>
              <p className="text-3xl font-black text-[#00CCCD]">
                {prediction?.home_percentage ?? 0}%
              </p>

              <p className="mt-2 text-sm font-bold text-gray-400">
                {match.home_team.name}
              </p>
            </div>

            <div>
              <p className="text-3xl font-black">
                {prediction?.draw_percentage ?? 0}%
              </p>

              <p className="mt-2 text-sm font-bold text-gray-400">
                Draw
              </p>
            </div>

            <div>
              <p className="text-3xl font-black text-[#00CCCD]">
                {prediction?.away_percentage ?? 0}%
              </p>

              <p className="mt-2 text-sm font-bold text-gray-400">
                {match.away_team.name}
              </p>
            </div>

          </div>

        </section>

        {/* QUICK LINKS */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">

          <Link
            href="/standings"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#00CCCD]/50"
          >
            <p className="text-sm font-black text-[#00CCCD]">
              Standings
            </p>

            <p className="mt-2 text-sm text-gray-400">
              View the full LCF table →
            </p>
          </Link>

          <div
  id="previous"
  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
>
  <p className="text-sm font-black text-[#00CCCD]">
    Previous Meetings
  </p>

  {previousMeetings.length === 0 ? (

    <p className="mt-3 text-sm text-gray-500">
      No previous LCF meetings.
    </p>

  ) : (

    <div className="mt-4 space-y-3">

      {previousMeetings.slice(0, 3).map((game) => {

        const homeName =
          game.home_team_id === match.home_team.id
            ? match.home_team.name
            : match.away_team.name;

        const awayName =
          game.away_team_id === match.away_team.id
            ? match.away_team.name
            : match.home_team.name;

        return (
          <Link
            key={game.id}
            href={`/matches/${game.id}`}
            className="block rounded-xl bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
          >
            <p className="text-xs font-bold text-gray-500">
              {formatFullDate(game.match_date)}
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">

              <p className="text-sm font-black">
                {homeName}
              </p>

              <p className="text-lg font-black text-[#00CCCD]">
                {game.home_score}
                <span className="mx-2 text-gray-500">
                  -
                </span>
                {game.away_score}
              </p>

              <p className="text-right text-sm font-black">
                {awayName}
              </p>

            </div>
          </Link>
        );
      })}

    </div>

  )}
</div>

        </section>

       {/* TEAM STATISTICS */}
<section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

  <div className="flex items-center justify-between">

    <div>
      <h3 className="text-xl font-black">
        Team Statistics
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        2026-27 LCF Regular Season
      </p>
    </div>

    <Link
      href="/standings"
      className="text-sm font-black text-[#00CCCD] transition hover:text-[#00E4E5]"
    >
      Full Standings →
    </Link>

  </div>


  <div className="mt-8 grid grid-cols-3 items-center gap-4 border-b border-white/10 pb-5 text-center">

    <div>
      <img
        src={match.home_team.logo_url ?? "/lcf-logo.png"}
        alt={match.home_team.name}
        className="mx-auto h-10 w-10 object-contain"
      />

      <p className="mt-2 text-sm font-black">
        {match.home_team.name}
      </p>
    </div>

    <p className="text-xs font-black uppercase tracking-widest text-gray-500">
      Season
    </p>

    <div>
      <img
        src={match.away_team.logo_url ?? "/lcf-logo.png"}
        alt={match.away_team.name}
        className="mx-auto h-10 w-10 object-contain"
      />

      <p className="mt-2 text-sm font-black">
        {match.away_team.name}
      </p>
    </div>

  </div>


  <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-5 text-center">

    <p className="text-xl font-black">
      {homeStats.games}
    </p>
    <p className="text-sm text-gray-500">
      Games
    </p>
    <p className="text-xl font-black">
      {awayStats.games}
    </p>


    <p className="text-xl font-black">
      {homeStats.wins}
    </p>
    <p className="text-sm text-gray-500">
      Wins
    </p>
    <p className="text-xl font-black">
      {awayStats.wins}
    </p>


    <p className="text-xl font-black">
      {homeStats.draws}
    </p>
    <p className="text-sm text-gray-500">
      Draws
    </p>
    <p className="text-xl font-black">
      {awayStats.draws}
    </p>


    <p className="text-xl font-black">
      {homeStats.losses}
    </p>
    <p className="text-sm text-gray-500">
      Losses
    </p>
    <p className="text-xl font-black">
      {awayStats.losses}
    </p>


    <p className="text-xl font-black">
      {homeStats.goalsScored}
    </p>
    <p className="text-sm text-gray-500">
      Goals Scored
    </p>
    <p className="text-xl font-black">
      {awayStats.goalsScored}
    </p>


    <p className="text-xl font-black">
      {homeStats.goalsConceded}
    </p>
    <p className="text-sm text-gray-500">
      Goals Conceded
    </p>
    <p className="text-xl font-black">
      {awayStats.goalsConceded}
    </p>


    <p className="text-xl font-black">
      {homeStats.goalDifference > 0 ? "+" : ""}
      {homeStats.goalDifference}
    </p>
    <p className="text-sm text-gray-500">
      Goal Difference
    </p>
    <p className="text-xl font-black">
      {awayStats.goalDifference > 0 ? "+" : ""}
      {awayStats.goalDifference}
    </p>


    <p className="text-2xl font-black text-[#00CCCD]">
      {homeStats.points}
    </p>
    <p className="text-sm font-black text-gray-400">
      Points
    </p>
    <p className="text-2xl font-black text-[#00CCCD]">
      {awayStats.points}
    </p>

  </div>

</section>

        {/* PLAYERS TO WATCH */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <h3 className="text-xl font-black">
            Players to Watch
          </h3>

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div className="rounded-2xl bg-white/[0.03] p-6">
              <p className="font-black">
                {match.home_team.name}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                No player selected yet.
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.03] p-6">
              <p className="font-black">
                {match.away_team.name}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                No player selected yet.
              </p>
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}