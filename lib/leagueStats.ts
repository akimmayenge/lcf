export type LeagueTeam = {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type LeagueMatch = {
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export type StandingRow = {
  position: number;

  teamId: number;
  name: string;
  slug: string;
  logoUrl: string | null;

  played: number;
  wins: number;
  draws: number;
  losses: number;

  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;

  points: number;
};


export function calculateStandings(
  teams: LeagueTeam[],
  matches: LeagueMatch[]
): StandingRow[] {

  const table = new Map<
    number,
    Omit<StandingRow, "position">
  >();


  // Create every team with 0 statistics
  for (const team of teams) {
    table.set(team.id, {
      teamId: team.id,
      name: team.name,
      slug: team.slug,
      logoUrl: team.logo_url,

      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,

      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,

      points: 0,
    });
  }


  // Read every finished match
  for (const match of matches) {

    if (match.status !== "finished") {
      continue;
    }

    if (
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    const home = table.get(match.home_team_id);
    const away = table.get(match.away_team_id);

    if (!home || !away) {
      continue;
    }


    // Games played
    home.played++;
    away.played++;


    // Goals
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;

    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;


    // Result
    if (match.home_score > match.away_score) {

      home.wins++;
      home.points += 3;

      away.losses++;

    } else if (match.home_score < match.away_score) {

      away.wins++;
      away.points += 3;

      home.losses++;

    } else {

      home.draws++;
      away.draws++;

      home.points++;
      away.points++;
    }


    home.goalDifference =
      home.goalsFor - home.goalsAgainst;

    away.goalDifference =
      away.goalsFor - away.goalsAgainst;
  }


  // Sort the league table
  const sorted = Array.from(table.values())
    .sort((a, b) => {

      // 1. Points
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      // 2. Goal difference
      if (
        b.goalDifference !==
        a.goalDifference
      ) {
        return (
          b.goalDifference -
          a.goalDifference
        );
      }

      // 3. Goals scored
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }

      return a.name.localeCompare(b.name);
    });


  // Add positions: 1, 2, 3...
  return sorted.map((team, index) => ({
    position: index + 1,
    ...team,
  }));
}

export type MatchPrediction = {
  homeWin: number;
  draw: number;
  awayWin: number;
};


export function calculateMatchPrediction(
  home: StandingRow,
  away: StandingRow
): MatchPrediction {

  // No real data yet
  if (
    home.played === 0 &&
    away.played === 0
  ) {
    return {
      homeWin: 33,
      draw: 34,
      awayWin: 33,
    };
  }


  function getStrength(team: StandingRow) {

    const pointsPerGame =
      team.played > 0
        ? team.points / team.played
        : 1.5;

    const goalDifferencePerGame =
      team.played > 0
        ? team.goalDifference / team.played
        : 0;

    const winRate =
      team.played > 0
        ? team.wins / team.played
        : 0.33;


    return (
      pointsPerGame +
      goalDifferencePerGame * 0.25 +
      winRate * 0.5
    );
  }


  const homeStrength =
    getStrength(home);

  const awayStrength =
    getStrength(away);


  const difference =
    homeStrength - awayStrength;


  // Convert strength difference into probability
  const homeShare =
    1 /
    (1 + Math.exp(-difference / 1.8));


  // Similar teams = higher chance of draw
  const rawDraw =
    Math.max(
      18,
      30 - Math.abs(difference) * 4
    );


  const remaining =
    100 - rawDraw;


  const rawHome =
    remaining * homeShare;

  const rawAway =
    remaining - rawHome;


  /*
    Very important:

    Early in the season we DON'T want
    the website acting too confident.

    More games = more confidence.
  */

  const totalGames =
    home.played + away.played;

  const confidence =
    Math.min(totalGames / 12, 1);


  const homeWin =
    rawHome * confidence +
    33 * (1 - confidence);

  const draw =
    rawDraw * confidence +
    34 * (1 - confidence);

  const awayWin =
    rawAway * confidence +
    33 * (1 - confidence);


  const roundedHome =
    Math.round(homeWin);

  const roundedDraw =
    Math.round(draw);

  // Guarantees total = 100
  const roundedAway =
    100 -
    roundedHome -
    roundedDraw;


  return {
    homeWin: roundedHome,
    draw: roundedDraw,
    awayWin: roundedAway,
  };
}