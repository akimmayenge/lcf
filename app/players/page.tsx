"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";


// ==========================================================
// TYPES
// ==========================================================

type Tab =
  | "scorers"
  | "mvp"
  | "goalkeepers"
  | "yellow"
  | "red";


type Scorer = {
  id: number;
  name: string;
  team: string;
  goals: number;
  games: number;
};


type MvpPlayer = {
  id: number;
  name: string;
  team: string;

  // MOTM = Man of the Match
  motm: number;

  // POTW = Player of the Week
  potw: number;

  // Number of matches the player participated in
  // AND his team won
  winningApps: number;
};


type Goalkeeper = {
  id: number;
  name: string;
  team: string;

  games: number;

  // Matches played where his team won
  winningApps: number;

  // CS = Clean Sheets
  cleanSheets: number;

  // MOTM = Man of the Match
  motm: number;

  // GA = Goals Allowed
  goalsAllowed: number;
};


type CardPlayer = {
  id: number;
  name: string;
  team: string;
  games: number;
  cards: number;
};


// ==========================================================
// DATABASE TYPES
// ==========================================================

type DatabasePlayer = {
  id: number;
  first_name: string;
  last_name: string;
};

type DatabaseTeam = {
  id: number;
  name: string;
};

type DatabaseRoster = {
  player_id: number;
  team_id: number;
  position: string | null;
  active: boolean;
  team: DatabaseTeam | DatabaseTeam[] | null;
};

type DatabasePlayerMatchStat = {
  player_id: number;
  match_id: number;
  team_id: number | null;
  present: boolean;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  is_motm: boolean;
  is_goalkeeper: boolean;
};

type DatabaseMatch = {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type DatabaseMatchdayAward = {
  potw_player_id: number;
};



// ==========================================================
// PAGE
// ==========================================================

export default function PlayersPage() {

  // ========================================================
  // CURRENT TAB
  // ========================================================

  const [activeTab, setActiveTab] = useState<Tab>("scorers");



  // ========================================================
  // LIVE PLAYER DATA FROM SUPABASE
  // ========================================================

  const [scorers, setScorers] = useState<Scorer[]>([]);

  const [mvpPlayers, setMvpPlayers] = useState<MvpPlayer[]>([]);

  const [goalkeepers, setGoalkeepers] = useState<Goalkeeper[]>([]);

  const [yellowCards, setYellowCards] = useState<CardPlayer[]>([]);

  const [redCards, setRedCards] = useState<CardPlayer[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);

  const [statsError, setStatsError] = useState<string | null>(null);


  useEffect(() => {

    let cancelled = false;


    async function loadPlayerStatistics() {

      try {

        setLoadingStats(true);
        setStatsError(null);


        // ======================================================
        // PLAYERS
        // ======================================================

        const {
          data: playersData,
          error: playersError,
        } =
          await supabase
            .from("players")
            .select(`
              id,
              first_name,
              last_name
            `);


        if (playersError) {
          throw playersError;
        }


        const players =
          (playersData ?? []) as DatabasePlayer[];


        // ======================================================
        // CURRENT ROSTERS / TEAMS
        // ======================================================

        const {
          data: rostersData,
          error: rostersError,
        } =
          await supabase
            .from("team_rosters")
            .select(`
              player_id,
              team_id,
              position,
              active,

              team:teams (
                id,
                name
              )
            `)
            .eq("season_id", 1)
            .eq("active", true);


        if (rostersError) {
          throw rostersError;
        }


        const rosters =
          (rostersData ?? []) as unknown as DatabaseRoster[];


        // ======================================================
        // ALL PLAYER MATCH STATS
        // ======================================================

        const {
          data: playerStatsData,
          error: playerStatsError,
        } =
          await supabase
            .from("player_match_stats")
            .select(`
              player_id,
              match_id,
              team_id,
              present,
              goals,
              yellow_cards,
              red_cards,
              is_motm,
              is_goalkeeper
            `);


        if (playerStatsError) {
          throw playerStatsError;
        }


        const playerStats =
          (playerStatsData ?? []) as DatabasePlayerMatchStat[];


        // ======================================================
        // FINISHED MATCHES NEEDED FOR WIN / GK CALCULATIONS
        // ======================================================

        const matchIds =
          Array.from(
            new Set(
              playerStats.map(
                (stat) =>
                  stat.match_id
              )
            )
          );


        let matches: DatabaseMatch[] = [];


        if (matchIds.length > 0) {

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
            throw matchError;
          }


          matches =
            (matchData ?? []) as DatabaseMatch[];
        }


        // ======================================================
        // PLAYER OF THE WEEK AWARDS
        // ======================================================

        const {
          data: potwData,
          error: potwError,
        } =
          await supabase
            .from("matchday_awards")
            .select(`
              potw_player_id
            `)
            .eq(
              "season_id",
              1
            );


        if (potwError) {
          throw potwError;
        }


        const potwAwards =
          (potwData ?? []) as DatabaseMatchdayAward[];


        // ======================================================
        // FAST LOOKUP MAPS
        // ======================================================

        const matchMap =
          new Map<number, DatabaseMatch>();


        matches.forEach(
          (match) => {

            matchMap.set(
              match.id,
              match
            );

          }
        );


        const rosterMap =
          new Map<number, DatabaseRoster>();


        rosters.forEach(
          (roster) => {

            rosterMap.set(
              roster.player_id,
              roster
            );

          }
        );


        const statsByPlayer =
          new Map<
            number,
            DatabasePlayerMatchStat[]
          >();


        playerStats.forEach(
          (stat) => {

            const existing =
              statsByPlayer.get(
                stat.player_id
              ) ?? [];


            existing.push(stat);


            statsByPlayer.set(
              stat.player_id,
              existing
            );

          }
        );


        const potwCountByPlayer =
          new Map<number, number>();


        potwAwards.forEach(
          (award) => {

            const current =
              potwCountByPlayer.get(
                award.potw_player_id
              ) ?? 0;


            potwCountByPlayer.set(
              award.potw_player_id,
              current + 1
            );

          }
        );


        // ======================================================
        // BUILD ALL RANKING TABLES
        // ======================================================

        const newScorers: Scorer[] = [];

        const newMvpPlayers: MvpPlayer[] = [];

        const newGoalkeepers: Goalkeeper[] = [];

        const newYellowCards: CardPlayer[] = [];

        const newRedCards: CardPlayer[] = [];


        players.forEach(
          (player) => {

            const roster =
              rosterMap.get(
                player.id
              );


            const rawTeam =
              roster?.team ?? null;


            const team =
              Array.isArray(rawTeam)
                ? rawTeam[0] ?? null
                : rawTeam;


            const teamName =
              team?.name ??
              "No Team";


            const currentTeamId =
              roster?.team_id ??
              null;


            const position =
              roster?.position ??
              null;


            const allPlayerStats =
              statsByPlayer.get(
                player.id
              ) ?? [];


            const presentStats =
              allPlayerStats.filter(
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


            const totalYellow =
              presentStats.reduce(
                (
                  total,
                  stat
                ) =>
                  total +
                  (
                    stat.yellow_cards ?? 0
                  ),
                0
              );


            const totalRed =
              presentStats.reduce(
                (
                  total,
                  stat
                ) =>
                  total +
                  (
                    stat.red_cards ?? 0
                  ),
                0
              );


            const totalMotm =
              presentStats.filter(
                (stat) =>
                  stat.is_motm
              ).length;


            const totalPotw =
              potwCountByPlayer.get(
                player.id
              ) ?? 0;


            function getStatTeamId(
              stat: DatabasePlayerMatchStat
            ) {

              return (
                stat.team_id ??
                currentTeamId
              );

            }


            function isWinningAppearance(
              stat: DatabasePlayerMatchStat
            ) {

              if (!stat.present) {
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


            const playerName =
              `${player.first_name} ${player.last_name}`;


            // GOLDEN BOOT

            if (gamesPlayed > 0) {

              newScorers.push({
                id: player.id,
                name: playerName,
                team: teamName,
                goals: totalGoals,
                games: gamesPlayed,
              });

            }


            // MVP RACE

            if (
              gamesPlayed > 0 ||
              totalPotw > 0
            ) {

              newMvpPlayers.push({
                id: player.id,
                name: playerName,
                team: teamName,
                motm: totalMotm,
                potw: totalPotw,
                winningApps,
              });

            }


            // DISCIPLINE

            if (totalYellow > 0) {

              newYellowCards.push({
                id: player.id,
                name: playerName,
                team: teamName,
                games: gamesPlayed,
                cards: totalYellow,
              });

            }


            if (totalRed > 0) {

              newRedCards.push({
                id: player.id,
                name: playerName,
                team: teamName,
                games: gamesPlayed,
                cards: totalRed,
              });

            }


            // GOALKEEPER / GOLDEN GLOVE

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


            goalkeeperStats.forEach(
              (stat) => {

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

                  return;
                }


                if (
                  isWinningAppearance(
                    stat
                  )
                ) {

                  goalkeeperWins++;
                }


                if (stat.is_motm) {
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
            );


            const isRegisteredGoalkeeper =
              position
                ?.toUpperCase() ===
              "GK";


            if (
              isRegisteredGoalkeeper ||
              goalkeeperGames > 0
            ) {

              newGoalkeepers.push({
                id: player.id,
                name: playerName,
                team: teamName,
                games: goalkeeperGames,
                winningApps: goalkeeperWins,
                cleanSheets,
                motm: goalkeeperMotm,
                goalsAllowed,
              });

            }

          }
        );


        if (!cancelled) {

          setScorers(newScorers);
          setMvpPlayers(newMvpPlayers);
          setGoalkeepers(newGoalkeepers);
          setYellowCards(newYellowCards);
          setRedCards(newRedCards);

        }


      } catch (error) {

        console.error(
          "Player rankings error:",
          error
        );


        if (!cancelled) {

          setStatsError(
            "Unable to load player statistics."
          );

        }


      } finally {

        if (!cancelled) {
          setLoadingStats(false);
        }

      }

    }


    loadPlayerStatistics();


    return () => {
      cancelled = true;
    };

  }, []);



  // ========================================================
  // GOLDEN BOOT CALCULATIONS
  // ========================================================

  const calculateGoalsPerMatch = (player: Scorer) => {

    if (player.games === 0) {
      return 0;
    }

    return player.goals / player.games;
  };



  // ========================================================
  // MVP RACE
  //
  // MOTM = +3 points
  // POTW = +1 point
  // Winning Appearance = +1 point
  // ========================================================

  const calculateMvpPoints = (player: MvpPlayer) => {

    return (
      player.motm * 3 +
      player.potw +
      player.winningApps
    );
  };



  // ========================================================
  // GOLDEN GLOVE RACE
  //
  // Clean Sheet = +3 points
  // Winning Appearance = +1 point
  // Goalkeeper MOTM = +2 points
  // ========================================================

  const calculateGoldenGlovePoints = (
    player: Goalkeeper
  ) => {

    return (
      player.cleanSheets * 3 +
      player.winningApps +
      player.motm * 2
    );
  };


  const calculateGoalsAllowedPerMatch = (
    player: Goalkeeper
  ) => {

    if (player.games === 0) {
      return 0;
    }

    return player.goalsAllowed / player.games;
  };



  // ========================================================
  // AUTOMATIC RANKING
  // ========================================================

  const rankedScorers = [...scorers].sort((a, b) => {

    if (b.goals !== a.goals) {
      return b.goals - a.goals;
    }

    return (
      calculateGoalsPerMatch(b) -
      calculateGoalsPerMatch(a)
    );
  });


  const rankedMvpPlayers = [...mvpPlayers].sort(
    (a, b) =>
      calculateMvpPoints(b) -
      calculateMvpPoints(a)
  );


  const rankedGoalkeepers = [...goalkeepers].sort(
    (a, b) => {

      const pointDifference =
        calculateGoldenGlovePoints(b) -
        calculateGoldenGlovePoints(a);

      if (pointDifference !== 0) {
        return pointDifference;
      }


      // If points are tied:
      // fewer goals allowed per match is better

      const aRate =
        calculateGoalsAllowedPerMatch(a);

      const bRate =
        calculateGoalsAllowedPerMatch(b);

      if (aRate !== bRate) {
        return aRate - bRate;
      }


      // If still tied:
      // more clean sheets is better

      return b.cleanSheets - a.cleanSheets;
    }
  );


  const rankedYellowCards = [...yellowCards].sort(
    (a, b) => b.cards - a.cards
  );


  const rankedRedCards = [...redCards].sort(
    (a, b) => b.cards - a.cards
  );



  // ========================================================
  // BUTTON DESIGN
  // ========================================================

  const tabButton = (tab: Tab) => {

    const isActive = activeTab === tab;

    return `
      rounded-xl
      px-5
      py-3
      text-sm
      font-black
      uppercase
      tracking-wide
      transition
      duration-300

      ${
        isActive
          ? "bg-white text-black ring-2 ring-[#00CCCD] shadow-lg"
          : "bg-[#00CCCD] text-black hover:scale-105 hover:bg-[#00E4E5]"
      }
    `;
  };



  // ========================================================
  // TABLE CONTENT
  // ========================================================

  const renderTable = () => {


    // ======================================================
    // GOLDEN BOOT RACE
    // ======================================================

    if (activeTab === "scorers") {

      return (
        <>
          <thead>

            <tr className="bg-gray-50 text-left text-xs font-black uppercase tracking-wider text-gray-500">

              <th className="px-6 py-5">
                #
              </th>

              <th className="px-6 py-5">
                Player
              </th>

              <th className="px-6 py-5 text-center">
                Team
              </th>

              <th className="px-6 py-5 text-center">
                G
              </th>

              <th className="px-6 py-5 text-center">
                GP
              </th>

              <th className="px-6 py-5 text-center">
                G / M
              </th>

            </tr>

          </thead>


          <tbody>

            {rankedScorers.length === 0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="px-6 py-16 text-center"
                >

                  <p className="font-bold text-gray-500">
                    Golden Boot statistics will appear
                    after Matchday 1.
                  </p>

                </td>

              </tr>

            ) : (

              rankedScorers.map((player, index) => (

                <tr
                  key={player.id}
                  className="
                    border-t
                    border-gray-200
                    text-sm
                    transition
                    hover:bg-[#00CCCD]/10
                  "
                >

                  <td className="px-6 py-5 font-black">
                    {index + 1}
                  </td>

                  <td className="px-6 py-5 font-bold">
                    {player.name}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.team}
                  </td>

                  <td className="px-6 py-5 text-center text-lg font-black">
                    {player.goals}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.games}
                  </td>

                  <td className="px-6 py-5 text-center font-bold text-[#008E90]">

                    {calculateGoalsPerMatch(player).toFixed(2)}

                  </td>

                </tr>

              ))

            )}

          </tbody>
        </>
      );
    }



    // ======================================================
    // MVP RACE
    // ======================================================

    if (activeTab === "mvp") {

      return (
        <>
          <thead>

            <tr className="bg-gray-50 text-left text-xs font-black uppercase tracking-wider text-gray-500">

              <th className="px-6 py-5">
                #
              </th>

              <th className="px-6 py-5">
                Player
              </th>

              <th className="px-6 py-5 text-center">
                Team
              </th>

              <th className="px-6 py-5 text-center">
                MOTM
              </th>

              <th className="px-6 py-5 text-center">
                POTW
              </th>

              <th className="px-6 py-5 text-center">
                Winning Apps
              </th>

              <th className="px-6 py-5 text-center">
                MVP PTS
              </th>

            </tr>

          </thead>


          <tbody>

            {rankedMvpPlayers.length === 0 ? (

              <tr>

                <td
                  colSpan={7}
                  className="px-6 py-16 text-center"
                >

                  <p className="font-bold text-gray-500">
                    MVP Race statistics will appear
                    after Matchday 1.
                  </p>

                </td>

              </tr>

            ) : (

              rankedMvpPlayers.map((player, index) => (

                <tr
                  key={player.id}
                  className="
                    border-t
                    border-gray-200
                    text-sm
                    transition
                    hover:bg-[#00CCCD]/10
                  "
                >

                  <td className="px-6 py-5 font-black">
                    {index + 1}
                  </td>

                  <td className="px-6 py-5 font-bold">
                    {player.name}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.team}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.motm}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.potw}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.winningApps}
                  </td>

                  <td className="px-6 py-5 text-center text-lg font-black text-[#008E90]">

                    {calculateMvpPoints(player)}

                  </td>

                </tr>

              ))

            )}

          </tbody>
        </>
      );
    }



    // ======================================================
    // GOLDEN GLOVE RACE
    // ======================================================

    if (activeTab === "goalkeepers") {

      return (
        <>
          <thead>

            <tr className="bg-gray-50 text-left text-xs font-black uppercase tracking-wider text-gray-500">

              <th className="px-5 py-5">
                #
              </th>

              <th className="px-5 py-5">
                Goalkeeper
              </th>

              <th className="px-5 py-5 text-center">
                Team
              </th>

              <th className="px-5 py-5 text-center">
                GP
              </th>

              <th className="px-5 py-5 text-center">
                W
              </th>

              <th className="px-5 py-5 text-center">
                CS
              </th>

              <th className="px-5 py-5 text-center">
                MOTM
              </th>

              <th className="px-5 py-5 text-center">
                GA
              </th>

              <th className="px-5 py-5 text-center">
                GA / M
              </th>

              <th className="px-5 py-5 text-center">
                PTS
              </th>

            </tr>

          </thead>


          <tbody>

            {rankedGoalkeepers.length === 0 ? (

              <tr>

                <td
                  colSpan={10}
                  className="px-6 py-16 text-center"
                >

                  <p className="font-bold text-gray-500">
                    Golden Glove statistics will appear
                    after Matchday 1.
                  </p>

                </td>

              </tr>

            ) : (

              rankedGoalkeepers.map((player, index) => (

                <tr
                  key={player.id}
                  className="
                    border-t
                    border-gray-200
                    text-sm
                    transition
                    hover:bg-[#00CCCD]/10
                  "
                >

                  <td className="px-5 py-5 font-black">
                    {index + 1}
                  </td>

                  <td className="px-5 py-5 font-bold">
                    {player.name}
                  </td>

                  <td className="px-5 py-5 text-center">
                    {player.team}
                  </td>

                  <td className="px-5 py-5 text-center">
                    {player.games}
                  </td>

                  <td className="px-5 py-5 text-center">
                    {player.winningApps}
                  </td>

                  <td className="px-5 py-5 text-center font-black">
                    {player.cleanSheets}
                  </td>

                  <td className="px-5 py-5 text-center">
                    {player.motm}
                  </td>

                  <td className="px-5 py-5 text-center">
                    {player.goalsAllowed}
                  </td>

                  <td className="px-5 py-5 text-center">

                    {calculateGoalsAllowedPerMatch(player).toFixed(2)}

                  </td>

                  <td className="px-5 py-5 text-center text-lg font-black text-[#008E90]">

                    {calculateGoldenGlovePoints(player)}

                  </td>

                </tr>

              ))

            )}

          </tbody>
        </>
      );
    }



    // ======================================================
    // YELLOW CARDS
    // ======================================================

    if (activeTab === "yellow") {

      return (
        <>
          <thead>

            <tr className="bg-gray-50 text-left text-xs font-black uppercase tracking-wider text-gray-500">

              <th className="px-6 py-5">
                #
              </th>

              <th className="px-6 py-5">
                Player
              </th>

              <th className="px-6 py-5 text-center">
                Team
              </th>

              <th className="px-6 py-5 text-center">
                GP
              </th>

              <th className="px-6 py-5 text-center">
                Yellow Cards
              </th>

            </tr>

          </thead>


          <tbody>

            {rankedYellowCards.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="px-6 py-16 text-center font-bold text-gray-500"
                >
                  No yellow cards recorded.
                </td>

              </tr>

            ) : (

              rankedYellowCards.map((player, index) => (

                <tr
                  key={player.id}
                  className="border-t border-gray-200 text-sm transition hover:bg-gray-100"
                >

                  <td className="px-6 py-5 font-black">
                    {index + 1}
                  </td>

                  <td className="px-6 py-5 font-bold">
                    {player.name}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.team}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.games}
                  </td>

                  <td className="px-6 py-5 text-center font-black">
                    {player.cards}
                  </td>

                </tr>

              ))

            )}

          </tbody>
        </>
      );
    }



    // ======================================================
    // RED CARDS
    // ======================================================

    if (activeTab === "red") {

      return (
        <>
          <thead>

            <tr className="bg-gray-50 text-left text-xs font-black uppercase tracking-wider text-gray-500">

              <th className="px-6 py-5">
                #
              </th>

              <th className="px-6 py-5">
                Player
              </th>

              <th className="px-6 py-5 text-center">
                Team
              </th>

              <th className="px-6 py-5 text-center">
                GP
              </th>

              <th className="px-6 py-5 text-center">
                Red Cards
              </th>

            </tr>

          </thead>


          <tbody>

            {rankedRedCards.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="px-6 py-16 text-center font-bold text-gray-500"
                >
                  No red cards recorded.
                </td>

              </tr>

            ) : (

              rankedRedCards.map((player, index) => (

                <tr
                  key={player.id}
                  className="border-t border-gray-200 text-sm transition hover:bg-gray-100"
                >

                  <td className="px-6 py-5 font-black">
                    {index + 1}
                  </td>

                  <td className="px-6 py-5 font-bold">
                    {player.name}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.team}
                  </td>

                  <td className="px-6 py-5 text-center">
                    {player.games}
                  </td>

                  <td className="px-6 py-5 text-center font-black">
                    {player.cards}
                  </td>

                </tr>

              ))

            )}

          </tbody>
        </>
      );
    }


    return null;
  };



  // ========================================================
  // PAGE
  // ========================================================

  return (

    <section
  id="players"
  className="
    relative
    min-h-screen
    overflow-hidden
    border-t
    border-white/10
    bg-[#030707]
    px-4
    pb-20
    pt-40
    text-white
    sm:px-6
    md:pb-32
    md:pt-44
  "
>


      {/* TURQUOISE BACKGROUND GLOW */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-20
          h-[400px]
          w-[400px]
          -translate-x-1/2
          rounded-full
          bg-[#00CCCD]/10
          blur-[160px]
        "
      />


      <div className="relative mx-auto max-w-7xl">


        {/* =================================================
            PAGE TITLE
        ================================================= */}

        <div className="mb-12">

          

          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
          PLAYER STATISTICS
        </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
            Follow the LCF individual award races,
            player performances and discipline throughout
            the season.
          </p>

        </div>



        {/* =================================================
            ACRONYM GUIDE
        ================================================= */}

        <div className="mb-14">

          <div className="mb-4 flex items-center gap-3">

            <div className="h-6 w-1 rounded-full bg-[#00CCCD]" />

            <h2 className="text-sm font-black uppercase tracking-[0.20em]">
              Statistics Guide
            </h2>

          </div>


          <div
            className="
              grid
              gap-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">

              <p className="text-lg font-black text-[#00CCCD]">
                MOTM
              </p>

              <p className="mt-1 text-sm font-bold">
                Man of the Match
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Best individual player in a single match.
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">

              <p className="text-lg font-black text-[#00CCCD]">
                POTW
              </p>

              <p className="mt-1 text-sm font-bold">
                Player of the Week
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Best overall player of the LCF matchweek.
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">

              <p className="text-lg font-black text-[#00CCCD]">
                CS
              </p>

              <p className="mt-1 text-sm font-bold">
                Clean Sheet
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                A goalkeeper finishes the match without
                allowing a goal.
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">

              <p className="text-lg font-black text-[#00CCCD]">
                GA / M
              </p>

              <p className="mt-1 text-sm font-bold">
                Goals Allowed per Match
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Average number of goals conceded per game.
              </p>

            </div>

          </div>


          <div className="mt-3 grid gap-3 sm:grid-cols-3">

            <div className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-400">

              <strong className="text-white">
                GP
              </strong>

              {" "} = Games Played

            </div>


            <div className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-400">

              <strong className="text-white">
                G / M
              </strong>

              {" "} = Goals per Match

            </div>


            <div className="rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-400">

              <strong className="text-white">
                Winning App
              </strong>

              {" "} = Player participated in a team victory

            </div>

          </div>

        </div>



        {/* =================================================
            AWARD RULES
        ================================================= */}

        <div className="mb-14 grid gap-5 lg:grid-cols-3">


          {/* GOLDEN BOOT */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              Golden Boot
            </p>

            <h3 className="mt-3 text-xl font-black">
              Top Goalscorer
            </h3>

            <p className="mt-4 text-sm leading-6 text-gray-400">
              The player with the most goals finishes
              first in the Golden Boot Race.
            </p>

            <div className="mt-5 rounded-xl bg-black/30 p-4 text-sm font-bold">
              Most Goals → Highest Rank
            </div>

          </div>



          {/* MVP */}

          <div className="rounded-3xl border border-[#00CCCD]/30 bg-[#00CCCD]/[0.05] p-6">

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              MVP Race
            </p>

            <h3 className="mt-3 text-xl font-black">
              Most Valuable Player
            </h3>

            <p className="mt-4 text-sm leading-6 text-gray-400">
              Players collect MVP points throughout
              the season.
            </p>

            <div className="mt-5 space-y-2 rounded-xl bg-black/30 p-4 text-sm">

              <p>
                <strong className="text-[#00CCCD]">
                  +3
                </strong>
                {" "} MOTM
              </p>

              <p>
                <strong className="text-[#00CCCD]">
                  +1
                </strong>
                {" "} POTW
              </p>

              <p>
                <strong className="text-[#00CCCD]">
                  +1
                </strong>
                {" "} Winning Appearance
              </p>

            </div>

          </div>



          {/* GOLDEN GLOVE */}

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              Golden Glove
            </p>

            <h3 className="mt-3 text-xl font-black">
              Best Goalkeeper
            </h3>

            <p className="mt-4 text-sm leading-6 text-gray-400">
              Goalkeepers earn points through clean
              sheets, victories and standout matches.
            </p>

            <div className="mt-5 space-y-2 rounded-xl bg-black/30 p-4 text-sm">

              <p>
                <strong className="text-[#00CCCD]">
                  +3
                </strong>
                {" "} Clean Sheet
              </p>

              <p>
                <strong className="text-[#00CCCD]">
                  +2
                </strong>
                {" "} MOTM
              </p>

              <p>
                <strong className="text-[#00CCCD]">
                  +1
                </strong>
                {" "} Winning Appearance
              </p>

            </div>

          </div>

        </div>



        {/* =================================================
            INDIVIDUAL AWARDS BUTTONS
        ================================================= */}

        <div className="mb-10">

          <div className="mb-3 flex items-center gap-3">

            <div className="h-5 w-1 rounded-full bg-[#00CCCD]" />

            <h2 className="text-sm font-black uppercase tracking-wider">
              Individual Awards
            </h2>

          </div>


          <div
            className="
              flex
              flex-wrap
              gap-3
              rounded-2xl
              border
              border-white/10
              bg-white/[0.02]
              p-3
            "
          >

            <button
              onClick={() => setActiveTab("scorers")}
              className={tabButton("scorers")}
            >
              Golden Boot Race
            </button>


            <button
              onClick={() => setActiveTab("mvp")}
              className={tabButton("mvp")}
            >
              MVP Race
            </button>


            <button
              onClick={() => setActiveTab("goalkeepers")}
              className={tabButton("goalkeepers")}
            >
              Golden Glove Race
            </button>

          </div>

        </div>



        {/* =================================================
            DISCIPLINE
        ================================================= */}

        <div className="mb-12">

          <div className="mb-3 flex items-center gap-3">

            <div className="h-5 w-1 rounded-full bg-[#00CCCD]" />

            <h2 className="text-sm font-black uppercase tracking-wider">
              Discipline
            </h2>

          </div>


          <div
            className="
              flex
              flex-wrap
              gap-3
              rounded-2xl
              border
              border-white/10
              bg-white/[0.02]
              p-3
            "
          >

            <button
              onClick={() => setActiveTab("yellow")}
              className={tabButton("yellow")}
            >
              Yellow Cards
            </button>


            <button
              onClick={() => setActiveTab("red")}
              className={tabButton("red")}
            >
              Red Cards
            </button>

          </div>

        </div>



        {/* =================================================
            TABLE
        ================================================= */}

        <div
          className="
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-white
            text-black
            shadow-2xl
          "
        >

          <div className="overflow-x-auto">

            {loadingStats ? (

              <div className="px-6 py-16 text-center">

                <p className="font-bold text-gray-500">
                  Loading official LCF player statistics...
                </p>

              </div>

            ) : statsError ? (

              <div className="px-6 py-16 text-center">

                <p className="font-bold text-red-600">
                  {statsError}
                </p>

              </div>

            ) : (

              <table className="w-full min-w-[800px]">

                {renderTable()}

              </table>

            )}

          </div>

        </div>


      </div>

    </section>

  );
}