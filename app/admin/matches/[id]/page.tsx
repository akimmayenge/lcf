"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Link from "next/link";

import { supabase } from "@/lib/supabase";


// ==========================================================
// TYPES
// ==========================================================

type Team = {
  id: number;
  name: string;
  logo_url: string | null;
};


type Match = {
  id: number;
  season_id: number;
  matchday: number;

  home_team_id: number;
  away_team_id: number;

  home_score: number | null;
  away_score: number | null;

  status: string;

  home_team: Team;
  away_team: Team;
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
  position: string | null;
  shirt_number: number | null;
  active: boolean;
};


type MatchPlayer = Player & {
  team_id: number;
  position: string | null;
  shirt_number: number | null;
};


type PlayerStatDraft = {
  goals: number;
  yellowCards: number;
  redCards: number;
};


type ExistingPlayerStat = {
  player_id: number;
  team_id: number | null;
  present: boolean;
  goals: number;
  yellow_cards: number;
  red_cards: number;
  is_motm: boolean;
  is_goalkeeper: boolean;
};


type PotwCandidate = {
  id: number;
  first_name: string;
  last_name: string;
};


// ==========================================================
// SMALL PLAYER GAME-SHEET CARD
// ==========================================================

type PlayerStatCardProps = {
  player: MatchPlayer;
  present: boolean;
  stats: PlayerStatDraft;
  onToggle: (playerId: number) => void;
  onStatChange: (
    playerId: number,
    stat: keyof PlayerStatDraft,
    value: string
  ) => void;
};


function PlayerStatCard({
  player,
  present,
  stats,
  onToggle,
  onStatChange,
}: PlayerStatCardProps) {

  const isGK =
    player.position
      ?.toUpperCase() === "GK";


  return (

    <div className="rounded-xl border border-white/5 bg-black/20 p-3">

      <div className="flex items-center gap-3">

        <input
          type="checkbox"
          checked={present}
          onChange={() =>
            onToggle(player.id)
          }
          aria-label={`Mark ${player.first_name} ${player.last_name} present`}
          className="h-5 w-5 shrink-0 accent-[#00CCCD]"
        />


        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black">

          <img
            src={
              player.portrait_url
              ?? "/lcf-logo.png"
            }
            alt={`${player.first_name} ${player.last_name}`}
            className="h-full w-full object-cover"
          />

        </div>


        <div className="min-w-0 flex-1">

          <p className="truncate text-sm font-black">
            {player.first_name}{" "}
            {player.last_name}
          </p>


          <div className="mt-1 flex flex-wrap items-center gap-2">

            {isGK && (
              <span className="rounded-full bg-[#00CCCD]/10 px-2 py-0.5 text-[10px] font-black text-[#00CCCD]">
                GK
              </span>
            )}


            {player.shirt_number !== null && (
              <span className="text-xs text-gray-600">
                #{player.shirt_number}
              </span>
            )}


            <span
              className={`text-[10px] font-black uppercase ${
                present
                  ? "text-[#00CCCD]"
                  : "text-gray-600"
              }`}
            >
              {present
                ? "Present"
                : "Absent"}
            </span>

          </div>

        </div>

      </div>


      <div className="mt-3 grid grid-cols-3 gap-2">

        <div>

          <label className="text-[9px] font-black uppercase tracking-wider text-gray-500">
            Goals
          </label>

          <input
            type="number"
            min="0"
            step="1"
            disabled={!present}
            value={stats.goals}
            onChange={(event) =>
              onStatChange(
                player.id,
                "goals",
                event.target.value
              )
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-black p-2.5 text-center text-base font-black outline-none focus:border-[#00CCCD] disabled:cursor-not-allowed disabled:opacity-30"
          />

        </div>


        <div>

          <label className="text-[9px] font-black uppercase tracking-wider text-yellow-400">
            Yellow
          </label>

          <input
            type="number"
            min="0"
            step="1"
            disabled={!present}
            value={stats.yellowCards}
            onChange={(event) =>
              onStatChange(
                player.id,
                "yellowCards",
                event.target.value
              )
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-black p-2.5 text-center text-base font-black outline-none focus:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-30"
          />

        </div>


        <div>

          <label className="text-[9px] font-black uppercase tracking-wider text-red-400">
            Red
          </label>

          <input
            type="number"
            min="0"
            step="1"
            disabled={!present}
            value={stats.redCards}
            onChange={(event) =>
              onStatChange(
                player.id,
                "redCards",
                event.target.value
              )
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-black p-2.5 text-center text-base font-black outline-none focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-30"
          />

        </div>

      </div>

    </div>

  );
}


// ==========================================================
// PAGE
// ==========================================================

export default function AdminMatchPage() {

  const params =
    useParams<{ id: string }>();

  const router =
    useRouter();

  const matchId =
    Number(params.id);


  // ========================================================
  // MATCH
  // ========================================================

  const [match, setMatch] =
    useState<Match | null>(null);

  const [homeScore, setHomeScore] =
    useState("");

  const [awayScore, setAwayScore] =
    useState("");


  // ========================================================
  // ROSTERS + PLAYER GAME SHEET
  // ========================================================

  const [homePlayers, setHomePlayers] =
    useState<MatchPlayer[]>([]);

  const [awayPlayers, setAwayPlayers] =
    useState<MatchPlayer[]>([]);

  const [presentPlayers, setPresentPlayers] =
    useState<Record<number, boolean>>({});

  const [playerStats, setPlayerStats] =
    useState<Record<number, PlayerStatDraft>>({});

  const [motmPlayerId, setMotmPlayerId] =
    useState("");

  const [homeGoalkeeperId, setHomeGoalkeeperId] =
    useState("");

  const [awayGoalkeeperId, setAwayGoalkeeperId] =
    useState("");


  // ========================================================
  // POTW
  // ========================================================

  const [potwCandidates, setPotwCandidates] =
    useState<PotwCandidate[]>([]);

  const [potwPlayerId, setPotwPlayerId] =
    useState("");

  const [potwAlreadyRecorded, setPotwAlreadyRecorded] =
    useState(false);

  const [potwWinnerName, setPotwWinnerName] =
    useState("");

  const [potwSaving, setPotwSaving] =
    useState(false);

  const [potwDismissed, setPotwDismissed] =
    useState(false);


  // ========================================================
  // UI
  // ========================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [potwMessage, setPotwMessage] =
    useState("");

  const [potwError, setPotwError] =
    useState("");


  // ========================================================
  // LOAD MATCH + ROSTERS + EXISTING GAME SHEET + POTW
  // ========================================================

  useEffect(() => {

    async function loadPage() {

      setLoading(true);
      setError("");


      // ------------------------------------------------------
      // 1. CHECK ADMIN LOGIN
      // ------------------------------------------------------

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();


      if (!session) {

        router.replace(
          "/admin/login"
        );

        return;
      }


      // ------------------------------------------------------
      // 2. VALID MATCH ID
      // ------------------------------------------------------

      if (
        !Number.isFinite(matchId)
      ) {

        setError(
          "Invalid match ID."
        );

        setLoading(false);

        return;
      }


      // ------------------------------------------------------
      // 3. LOAD MATCH
      // ------------------------------------------------------

      const {
        data: matchData,
        error: matchError,
      } =
        await supabase
          .from("matches")
          .select(`
            id,
            season_id,
            matchday,
            home_team_id,
            away_team_id,
            home_score,
            away_score,
            status,

            home_team:teams!matches_home_team_id_fkey (
              id,
              name,
              logo_url
            ),

            away_team:teams!matches_away_team_id_fkey (
              id,
              name,
              logo_url
            )
          `)
          .eq(
            "id",
            matchId
          )
          .single();


      if (
        matchError ||
        !matchData
      ) {

        console.error(
          "Match error:",
          matchError
        );

        setError(
          "Could not load match."
        );

        setLoading(false);

        return;
      }


      const game =
        matchData as unknown as Match;


      setMatch(game);

      setHomeScore(
        game.home_score === null
          ? ""
          : String(game.home_score)
      );

      setAwayScore(
        game.away_score === null
          ? ""
          : String(game.away_score)
      );


      // ------------------------------------------------------
      // 4. LOAD CURRENT ACTIVE ROSTERS
      // ------------------------------------------------------

      const {
        data: rosterData,
        error: rosterError,
      } =
        await supabase
          .from("team_rosters")
          .select(`
            player_id,
            team_id,
            position,
            shirt_number,
            active
          `)
          .eq(
            "season_id",
            game.season_id
          )
          .eq(
            "active",
            true
          )
          .in(
            "team_id",
            [
              game.home_team_id,
              game.away_team_id,
            ]
          );


      if (rosterError) {

        console.error(
          "Roster error:",
          rosterError
        );

        setError(
          "Match loaded, but team rosters could not be loaded."
        );

        setLoading(false);

        return;
      }


      const rosterRows =
        (rosterData ?? []) as RosterRow[];


      // ------------------------------------------------------
      // 5. LOAD EXISTING PLAYER STATS FOR THIS MATCH
      // ------------------------------------------------------

      const {
        data: existingStatsData,
        error: existingStatsError,
      } =
        await supabase
          .from("player_match_stats")
          .select(`
            player_id,
            team_id,
            present,
            goals,
            yellow_cards,
            red_cards,
            is_motm,
            is_goalkeeper
          `)
          .eq(
            "match_id",
            game.id
          );


      if (existingStatsError) {

        console.error(
          "Existing player stats error:",
          existingStatsError
        );

        setError(
          "Match loaded, but the existing game sheet could not be loaded."
        );

        setLoading(false);

        return;
      }


      const existingStats =
        (existingStatsData ?? []) as ExistingPlayerStat[];


      // ------------------------------------------------------
      // 6. GET ALL PLAYER IDS WE NEED
      //
      // Current roster players + historical players already
      // saved in this game sheet.
      // ------------------------------------------------------

      const playerIdSet =
        new Set<number>();


      for (
        const roster
        of rosterRows
      ) {
        playerIdSet.add(
          roster.player_id
        );
      }


      for (
        const stat
        of existingStats
      ) {
        playerIdSet.add(
          stat.player_id
        );
      }


      const playerIds =
        Array.from(playerIdSet);


      if (
        playerIds.length === 0
      ) {

        setHomePlayers([]);
        setAwayPlayers([]);

        setPresentPlayers({});
        setPlayerStats({});

        setLoading(false);

        return;
      }


      // ------------------------------------------------------
      // 7. LOAD PLAYER INFORMATION
      // ------------------------------------------------------

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
          .in(
            "id",
            playerIds
          );


      if (playersError) {

        console.error(
          "Players error:",
          playersError
        );

        setError(
          "Rosters loaded, but player information could not be loaded."
        );

        setLoading(false);

        return;
      }


      const players =
        (playersData ?? []) as Player[];


      // ------------------------------------------------------
      // 8. CONNECT PLAYER + TEAM/ROSTER INFORMATION
      // ------------------------------------------------------

      const connectedMap =
        new Map<number, MatchPlayer>();


      for (
        const roster
        of rosterRows
      ) {

        const player =
          players.find(
            (item) =>
              item.id ===
              roster.player_id
          );


        if (!player) {
          continue;
        }


        connectedMap.set(
          player.id,
          {
            ...player,
            team_id:
              roster.team_id,
            position:
              roster.position,
            shirt_number:
              roster.shirt_number,
          }
        );
      }


      // Keep historical stat players visible even if their
      // current roster entry is no longer active.
      for (
        const stat
        of existingStats
      ) {

        if (
          connectedMap.has(
            stat.player_id
          )
        ) {
          continue;
        }


        const player =
          players.find(
            (item) =>
              item.id ===
              stat.player_id
          );


        if (
          !player ||
          stat.team_id === null
        ) {
          continue;
        }


        connectedMap.set(
          player.id,
          {
            ...player,
            team_id:
              stat.team_id,
            position:
              stat.is_goalkeeper
                ? "GK"
                : null,
            shirt_number:
              null,
          }
        );
      }


      const connectedPlayers =
        Array.from(
          connectedMap.values()
        );


      function sortPlayers(
        list: MatchPlayer[]
      ) {

        return [...list].sort(
          (a, b) => {

            const aGK =
              a.position
                ?.toUpperCase() ===
              "GK";

            const bGK =
              b.position
                ?.toUpperCase() ===
              "GK";


            if (
              aGK &&
              !bGK
            ) {
              return -1;
            }


            if (
              !aGK &&
              bGK
            ) {
              return 1;
            }


            return `${a.first_name} ${a.last_name}`
              .localeCompare(
                `${b.first_name} ${b.last_name}`
              );
          }
        );
      }


      const loadedHomePlayers =
        sortPlayers(
          connectedPlayers.filter(
            (player) =>
              player.team_id ===
              game.home_team_id
          )
        );


      const loadedAwayPlayers =
        sortPlayers(
          connectedPlayers.filter(
            (player) =>
              player.team_id ===
              game.away_team_id
          )
        );


      setHomePlayers(
        loadedHomePlayers
      );

      setAwayPlayers(
        loadedAwayPlayers
      );


      // ------------------------------------------------------
      // 9. INITIALIZE ATTENDANCE + STATS
      // ------------------------------------------------------

      const hasExistingGameSheet =
        existingStats.length > 0;

      const defaultAttendance:
        Record<number, boolean> = {};

      const defaultStats:
        Record<number, PlayerStatDraft> = {};


      for (
        const player
        of connectedPlayers
      ) {

        const existing =
          existingStats.find(
            (stat) =>
              stat.player_id ===
              player.id
          );


        defaultAttendance[
          player.id
        ] =
          existing
            ? existing.present
            : !hasExistingGameSheet;


        defaultStats[
          player.id
        ] = {
          goals:
            existing?.goals ?? 0,
          yellowCards:
            existing?.yellow_cards ?? 0,
          redCards:
            existing?.red_cards ?? 0,
        };
      }


      setPresentPlayers(
        defaultAttendance
      );

      setPlayerStats(
        defaultStats
      );


      // ------------------------------------------------------
      // 10. LOAD EXISTING MOTM
      // ------------------------------------------------------

      const existingMotm =
        existingStats.find(
          (stat) =>
            stat.is_motm
        );


      setMotmPlayerId(
        existingMotm
          ? String(
              existingMotm.player_id
            )
          : ""
      );


      // ------------------------------------------------------
      // 11. LOAD / DEFAULT GOALKEEPERS
      // ------------------------------------------------------

      const existingHomeGK =
        existingStats.find(
          (stat) =>
            stat.team_id ===
              game.home_team_id &&
            stat.is_goalkeeper
        );

      const existingAwayGK =
        existingStats.find(
          (stat) =>
            stat.team_id ===
              game.away_team_id &&
            stat.is_goalkeeper
        );


      if (existingHomeGK) {

        setHomeGoalkeeperId(
          String(
            existingHomeGK.player_id
          )
        );

      } else {

        const homeGKOptions =
          loadedHomePlayers.filter(
            (player) =>
              player.position
                ?.toUpperCase() ===
              "GK"
          );

        setHomeGoalkeeperId(
          homeGKOptions.length === 1
            ? String(
                homeGKOptions[0].id
              )
            : ""
        );
      }


      if (existingAwayGK) {

        setAwayGoalkeeperId(
          String(
            existingAwayGK.player_id
          )
        );

      } else {

        const awayGKOptions =
          loadedAwayPlayers.filter(
            (player) =>
              player.position
                ?.toUpperCase() ===
              "GK"
          );

        setAwayGoalkeeperId(
          awayGKOptions.length === 1
            ? String(
                awayGKOptions[0].id
              )
            : ""
        );
      }


      // ------------------------------------------------------
      // 12. PREVIOUS MATCHDAY POTW
      // ------------------------------------------------------

      setPotwCandidates([]);
      setPotwPlayerId("");
      setPotwAlreadyRecorded(false);
      setPotwWinnerName("");
      setPotwDismissed(false);


      if (
        game.matchday > 1
      ) {

        const previousMatchday =
          game.matchday - 1;


        const {
          data: awardData,
          error: awardError,
        } =
          await supabase
            .from("matchday_awards")
            .select(`
              potw_player_id
            `)
            .eq(
              "season_id",
              game.season_id
            )
            .eq(
              "matchday",
              previousMatchday
            )
            .maybeSingle();


        if (awardError) {

          console.error(
            "POTW lookup error:",
            awardError
          );

        } else if (awardData) {

          setPotwAlreadyRecorded(
            true
          );


          const {
            data: winnerData,
          } =
            await supabase
              .from("players")
              .select(`
                first_name,
                last_name
              `)
              .eq(
                "id",
                awardData.potw_player_id
              )
              .maybeSingle();


          if (winnerData) {

            setPotwWinnerName(
              `${winnerData.first_name} ${winnerData.last_name}`
            );
          }

        } else {

          // No POTW recorded yet. Build candidates only from
          // players who actually participated in previous MD.

          const {
            data: previousMatchesData,
            error: previousMatchesError,
          } =
            await supabase
              .from("matches")
              .select("id")
              .eq(
                "season_id",
                game.season_id
              )
              .eq(
                "matchday",
                previousMatchday
              )
              .eq(
                "status",
                "finished"
              );


          if (previousMatchesError) {

            console.error(
              "Previous matchday error:",
              previousMatchesError
            );

          } else {

            const previousMatchIds =
              (previousMatchesData ?? [])
                .map(
                  (item) =>
                    Number(item.id)
                );


            if (
              previousMatchIds.length > 0
            ) {

              const {
                data: previousStatsData,
                error: previousStatsError,
              } =
                await supabase
                  .from("player_match_stats")
                  .select(`
                    player_id,
                    present
                  `)
                  .in(
                    "match_id",
                    previousMatchIds
                  )
                  .eq(
                    "present",
                    true
                  );


              if (previousStatsError) {

                console.error(
                  "Previous POTW candidate stats error:",
                  previousStatsError
                );

              } else {

                const candidateIds =
                  Array.from(
                    new Set(
                      (previousStatsData ?? [])
                        .map(
                          (stat) =>
                            Number(
                              stat.player_id
                            )
                        )
                    )
                  );


                if (
                  candidateIds.length > 0
                ) {

                  const {
                    data: candidateData,
                    error: candidateError,
                  } =
                    await supabase
                      .from("players")
                      .select(`
                        id,
                        first_name,
                        last_name
                      `)
                      .in(
                        "id",
                        candidateIds
                      );


                  if (candidateError) {

                    console.error(
                      "POTW candidate players error:",
                      candidateError
                    );

                  } else {

                    const candidates =
                      ((candidateData ?? []) as PotwCandidate[])
                        .sort(
                          (a, b) =>
                            `${a.first_name} ${a.last_name}`
                              .localeCompare(
                                `${b.first_name} ${b.last_name}`
                              )
                        );


                    setPotwCandidates(
                      candidates
                    );
                  }
                }
              }
            }
          }
        }
      }


      setLoading(false);
    }


    loadPage();

  }, [
    matchId,
    router,
  ]);


  // ========================================================
  // DERIVED VALUES
  // ========================================================

  const allPlayers =
    [
      ...homePlayers,
      ...awayPlayers,
    ];


  const presentHomePlayers =
    homePlayers.filter(
      (player) =>
        presentPlayers[
          player.id
        ]
    );


  const presentAwayPlayers =
    awayPlayers.filter(
      (player) =>
        presentPlayers[
          player.id
        ]
    );


  const homeGoalkeeperOptions =
    presentHomePlayers.filter(
      (player) =>
        player.position
          ?.toUpperCase() ===
        "GK"
    );


  const awayGoalkeeperOptions =
    presentAwayPlayers.filter(
      (player) =>
        player.position
          ?.toUpperCase() ===
        "GK"
    );


  const homeAssignedGoals =
    homePlayers.reduce(
      (total, player) =>
        total +
        (
          playerStats[
            player.id
          ]?.goals ?? 0
        ),
      0
    );


  const awayAssignedGoals =
    awayPlayers.reduce(
      (total, player) =>
        total +
        (
          playerStats[
            player.id
          ]?.goals ?? 0
        ),
      0
    );


  const homeTargetScore =
    homeScore === ""
      ? null
      : Number(homeScore);


  const awayTargetScore =
    awayScore === ""
      ? null
      : Number(awayScore);


  const homeGoalsMatch =
    homeTargetScore !== null &&
    homeAssignedGoals ===
      homeTargetScore;


  const awayGoalsMatch =
    awayTargetScore !== null &&
    awayAssignedGoals ===
      awayTargetScore;


  const selectedMotm =
    allPlayers.find(
      (player) =>
        player.id ===
        Number(motmPlayerId)
    ) ?? null;


  // ========================================================
  // TOGGLE PLAYER ATTENDANCE
  // ========================================================

  function togglePlayer(
    playerId: number
  ) {

    const currentlyPresent =
      presentPlayers[
        playerId
      ] ?? false;

    const nextPresent =
      !currentlyPresent;


    setPresentPlayers(
      (current) => ({
        ...current,
        [playerId]:
          nextPresent,
      })
    );


    if (!nextPresent) {

      // Clear stats for an absent player.
      setPlayerStats(
        (current) => ({
          ...current,
          [playerId]: {
            goals: 0,
            yellowCards: 0,
            redCards: 0,
          },
        })
      );


      // An absent player cannot remain MOTM.
      if (
        Number(motmPlayerId) ===
        playerId
      ) {
        setMotmPlayerId("");
      }


      // An absent player cannot remain selected as GK.
      if (
        Number(homeGoalkeeperId) ===
        playerId
      ) {
        setHomeGoalkeeperId("");
      }


      if (
        Number(awayGoalkeeperId) ===
        playerId
      ) {
        setAwayGoalkeeperId("");
      }
    }
  }


  // ========================================================
  // UPDATE PLAYER GAME STATS
  // ========================================================

  function updatePlayerStat(
    playerId: number,
    stat: keyof PlayerStatDraft,
    value: string
  ) {

    if (
      !presentPlayers[
        playerId
      ]
    ) {
      return;
    }


    const numberValue =
      Math.max(
        0,
        Math.floor(
          Number(value) || 0
        )
      );


    setPlayerStats(
      (current) => ({
        ...current,
        [playerId]: {
          ...(current[playerId] ?? {
            goals: 0,
            yellowCards: 0,
            redCards: 0,
          }),
          [stat]:
            numberValue,
        },
      })
    );
  }


  // ========================================================
  // VALIDATE + SAVE COMPLETE OFFICIAL GAME SHEET
  // ========================================================

  async function saveOfficialGameSheet() {

    if (!match) {
      return;
    }


    setSaving(true);
    setMessage("");
    setError("");


    // --------------------------------------------------------
    // SCORE VALIDATION
    // --------------------------------------------------------

    if (
      homeScore === "" ||
      awayScore === ""
    ) {

      setError(
        "Enter both official scores."
      );

      setSaving(false);
      return;
    }


    const home =
      Number(homeScore);

    const away =
      Number(awayScore);


    if (
      home < 0 ||
      away < 0 ||
      !Number.isInteger(home) ||
      !Number.isInteger(away)
    ) {

      setError(
        "Scores must be valid whole numbers."
      );

      setSaving(false);
      return;
    }


    // --------------------------------------------------------
    // ATTENDANCE VALIDATION
    // --------------------------------------------------------

    if (
      presentHomePlayers.length === 0
    ) {

      setError(
        `Mark at least one ${match.home_team.name} player as present.`
      );

      setSaving(false);
      return;
    }


    if (
      presentAwayPlayers.length === 0
    ) {

      setError(
        `Mark at least one ${match.away_team.name} player as present.`
      );

      setSaving(false);
      return;
    }


    // --------------------------------------------------------
    // GOAL ATTRIBUTION VALIDATION
    // --------------------------------------------------------

    if (
      homeAssignedGoals !== home
    ) {

      setError(
        `${match.home_team.name} scored ${home}, but ${homeAssignedGoals} goals are attributed to players.`
      );

      setSaving(false);
      return;
    }


    if (
      awayAssignedGoals !== away
    ) {

      setError(
        `${match.away_team.name} scored ${away}, but ${awayAssignedGoals} goals are attributed to players.`
      );

      setSaving(false);
      return;
    }


    // --------------------------------------------------------
    // MOTM VALIDATION
    // --------------------------------------------------------

    if (!motmPlayerId) {

      setError(
        "Select the official Man of the Match."
      );

      setSaving(false);
      return;
    }


    if (
      !presentPlayers[
        Number(motmPlayerId)
      ]
    ) {

      setError(
        "The MOTM must be a player marked present."
      );

      setSaving(false);
      return;
    }


    // --------------------------------------------------------
    // GOALKEEPER VALIDATION
    // --------------------------------------------------------

    const homeHasGKOnRoster =
      homePlayers.some(
        (player) =>
          player.position
            ?.toUpperCase() ===
          "GK"
      );

    const awayHasGKOnRoster =
      awayPlayers.some(
        (player) =>
          player.position
            ?.toUpperCase() ===
          "GK"
      );


    if (!homeHasGKOnRoster) {

      setError(
        `${match.home_team.name} has no player marked GK in team_rosters. Set the goalkeeper position to GK first.`
      );

      setSaving(false);
      return;
    }


    if (!awayHasGKOnRoster) {

      setError(
        `${match.away_team.name} has no player marked GK in team_rosters. Set the goalkeeper position to GK first.`
      );

      setSaving(false);
      return;
    }


    if (!homeGoalkeeperId) {

      setError(
        `Select the goalkeeper who played for ${match.home_team.name}.`
      );

      setSaving(false);
      return;
    }


    if (!awayGoalkeeperId) {

      setError(
        `Select the goalkeeper who played for ${match.away_team.name}.`
      );

      setSaving(false);
      return;
    }


    if (
      !presentPlayers[
        Number(homeGoalkeeperId)
      ] ||
      !presentPlayers[
        Number(awayGoalkeeperId)
      ]
    ) {

      setError(
        "Both selected goalkeepers must be marked present."
      );

      setSaving(false);
      return;
    }


    // --------------------------------------------------------
    // BUILD PLAYER MATCH STAT ROWS
    // --------------------------------------------------------

    const playerRows =
      allPlayers.map(
        (player) => {

          const present =
            presentPlayers[
              player.id
            ] ?? false;

          const stats =
            playerStats[
              player.id
            ] ?? {
              goals: 0,
              yellowCards: 0,
              redCards: 0,
            };


          return {
            match_id:
              match.id,
            player_id:
              player.id,
            team_id:
              player.team_id,
            present,
            goals:
              present
                ? stats.goals
                : 0,
            yellow_cards:
              present
                ? stats.yellowCards
                : 0,
            red_cards:
              present
                ? stats.redCards
                : 0,
            is_motm:
              present &&
              player.id ===
                Number(motmPlayerId),
            is_goalkeeper:
              present &&
              (
                player.id ===
                  Number(homeGoalkeeperId) ||
                player.id ===
                  Number(awayGoalkeeperId)
              ),
          };
        }
      );


    // Save previous match values for best-effort rollback.
    const previousMatch = {
      home_score:
        match.home_score,
      away_score:
        match.away_score,
      status:
        match.status,
    };


    // --------------------------------------------------------
    // SAVE TEAM RESULT FIRST
    // --------------------------------------------------------

    const {
      error: matchUpdateError,
    } =
      await supabase
        .from("matches")
        .update({
          home_score:
            home,
          away_score:
            away,
          status:
            "finished",
        })
        .eq(
          "id",
          match.id
        );


    if (matchUpdateError) {

      console.error(
        "Match save error:",
        matchUpdateError
      );

      setError(
        "Could not save the official match result."
      );

      setSaving(false);
      return;
    }


    // --------------------------------------------------------
    // SAVE PLAYER GAME SHEET
    // --------------------------------------------------------

    const {
      error: playerStatsError,
    } =
      await supabase
        .from("player_match_stats")
        .upsert(
          playerRows,
          {
            onConflict:
              "match_id,player_id",
          }
        );


    if (playerStatsError) {

      console.error(
        "Player game sheet save error:",
        playerStatsError
      );


      // Best-effort rollback of the team result so the page
      // does not intentionally leave a finished match without
      // its game sheet.
      const {
        error: rollbackError,
      } =
        await supabase
          .from("matches")
          .update(previousMatch)
          .eq(
            "id",
            match.id
          );


      if (rollbackError) {

        console.error(
          "Rollback error:",
          rollbackError
        );

        setError(
          "Player statistics could not be saved, and the automatic rollback also failed. Check this match in Supabase before continuing."
        );

      } else {

        setError(
          "Player statistics could not be saved. The team result was rolled back, so no official result was published."
        );
      }


      setSaving(false);
      return;
    }


    setMatch({
      ...match,
      home_score:
        home,
      away_score:
        away,
      status:
        "finished",
    });


    setMessage(
      "Official result and complete player game sheet saved successfully."
    );

    setSaving(false);

    router.refresh();
  }


  // ========================================================
  // RESET RESULT + PLAYER GAME SHEET
  // ========================================================

  async function resetResult() {

    if (!match) {
      return;
    }


    const confirmed =
      window.confirm(
        "Reset this official result and delete this match's player game-sheet statistics?"
      );


    if (!confirmed) {
      return;
    }


    setSaving(true);
    setMessage("");
    setError("");


    const previousMatch = {
      home_score:
        match.home_score,
      away_score:
        match.away_score,
      status:
        match.status,
    };


    // Reset match first.
    const {
      error: resetMatchError,
    } =
      await supabase
        .from("matches")
        .update({
          home_score:
            null,
          away_score:
            null,
          status:
            "upcoming",
        })
        .eq(
          "id",
          match.id
        );


    if (resetMatchError) {

      console.error(
        "Reset match error:",
        resetMatchError
      );

      setError(
        "Could not reset match."
      );

      setSaving(false);
      return;
    }


    // Delete the player game sheet for this match.
    const {
      error: deleteStatsError,
    } =
      await supabase
        .from("player_match_stats")
        .delete()
        .eq(
          "match_id",
          match.id
        );


    if (deleteStatsError) {

      console.error(
        "Delete player stats error:",
        deleteStatsError
      );


      const {
        error: restoreError,
      } =
        await supabase
          .from("matches")
          .update(previousMatch)
          .eq(
            "id",
            match.id
          );


      if (restoreError) {

        console.error(
          "Reset rollback error:",
          restoreError
        );

        setError(
          "Player game-sheet deletion failed and the match result could not be restored automatically. Check Supabase before continuing."
        );

      } else {

        setError(
          "Player game-sheet deletion failed, so the official match result was restored."
        );
      }


      setSaving(false);
      return;
    }


    // Reset local UI.
    setHomeScore("");
    setAwayScore("");

    setMatch({
      ...match,
      home_score:
        null,
      away_score:
        null,
      status:
        "upcoming",
    });


    const resetAttendance:
      Record<number, boolean> = {};

    const resetStats:
      Record<number, PlayerStatDraft> = {};


    for (
      const player
      of allPlayers
    ) {

      resetAttendance[
        player.id
      ] = true;

      resetStats[
        player.id
      ] = {
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      };
    }


    setPresentPlayers(
      resetAttendance
    );

    setPlayerStats(
      resetStats
    );

    setMotmPlayerId("");


    const homeGK =
      homePlayers.filter(
        (player) =>
          player.position
            ?.toUpperCase() ===
          "GK"
      );

    const awayGK =
      awayPlayers.filter(
        (player) =>
          player.position
            ?.toUpperCase() ===
          "GK"
      );


    setHomeGoalkeeperId(
      homeGK.length === 1
        ? String(homeGK[0].id)
        : ""
    );

    setAwayGoalkeeperId(
      awayGK.length === 1
        ? String(awayGK[0].id)
        : ""
    );


    setMessage(
      "Match returned to upcoming and its player game sheet was cleared."
    );

    setSaving(false);

    router.refresh();
  }


  // ========================================================
  // CONFIRM PREVIOUS MATCHDAY POTW
  // ========================================================

  async function confirmPotwWinner() {

    if (!match) {
      return;
    }


    if (
      match.matchday <= 1
    ) {
      return;
    }


    setPotwSaving(true);
    setPotwMessage("");
    setPotwError("");


    if (!potwPlayerId) {

      setPotwError(
        "Select the fan-voted Player of the Week winner."
      );

      setPotwSaving(false);
      return;
    }


    const previousMatchday =
      match.matchday - 1;


    const {
      error: awardSaveError,
    } =
      await supabase
        .from("matchday_awards")
        .upsert(
          {
            season_id:
              match.season_id,
            matchday:
              previousMatchday,
            potw_player_id:
              Number(potwPlayerId),
          },
          {
            onConflict:
              "season_id,matchday",
          }
        );


    if (awardSaveError) {

      console.error(
        "POTW save error:",
        awardSaveError
      );

      setPotwError(
        "Could not save the Player of the Week winner."
      );

      setPotwSaving(false);
      return;
    }


    const winner =
      potwCandidates.find(
        (player) =>
          player.id ===
          Number(potwPlayerId)
      );


    setPotwWinnerName(
      winner
        ? `${winner.first_name} ${winner.last_name}`
        : "Recorded winner"
    );

    setPotwAlreadyRecorded(true);

    setPotwMessage(
      `Matchday ${previousMatchday} Player of the Week saved.`
    );

    setPotwSaving(false);
  }


  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-[#030707] px-4 text-white">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00CCCD]" />

          <p className="mt-4 text-sm font-black text-gray-500">
            Loading match and game sheet...
          </p>

        </div>

      </main>

    );
  }


  // ========================================================
  // LOAD ERROR
  // ========================================================

  if (
    error &&
    !match
  ) {

    return (

      <main className="min-h-screen bg-[#030707] px-4 py-32 text-white">

        <div className="mx-auto max-w-5xl">

          <Link
            href="/admin/matches"
            className="text-sm font-black text-[#00CCCD]"
          >
            ← Match Control
          </Link>

          <p className="mt-8 rounded-xl bg-red-500/10 p-4 text-red-400">
            {error}
          </p>

        </div>

      </main>

    );
  }


  if (!match) {
    return null;
  }


  // ========================================================
  // PAGE
  // ========================================================

  return (

    <main className="min-h-screen bg-[#030707] px-4 pb-20 pt-28 text-white sm:px-6 sm:pt-32">

      <div className="mx-auto max-w-5xl">


        {/* ================================================= */}
        {/* ADMIN NAVIGATION */}
        {/* ================================================= */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <Link
            href="/admin/matches"
            className="text-sm font-black text-[#00CCCD] transition hover:text-[#00E4E5]"
          >
            ← Match Control
          </Link>

          <Link
            href="/admin"
            className="text-xs font-black uppercase tracking-wider text-gray-500 transition hover:text-white"
          >
            Admin Dashboard
          </Link>

        </div>


        {/* ================================================= */}
        {/* PAGE HEADER */}
        {/* ================================================= */}

        <header className="mt-7">

          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            LCF Administration · Matchday {match.matchday}
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Official Game Sheet
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Enter the score and individual match statistics once. The rest of the LCF platform can calculate from this official data.
          </p>

        </header>


        {/* ================================================= */}
        {/* OFFICIAL SCORE */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                Official Result
              </p>

              <p className="mt-2 text-sm font-bold text-gray-500">
                Status: {match.status}
              </p>

            </div>

          </div>


          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-5">

            {/* HOME */}
            <div className="min-w-0 text-center">

              <img
                src={
                  match.home_team.logo_url
                  ?? "/lcf-logo.png"
                }
                alt={match.home_team.name}
                className="mx-auto h-14 w-14 object-contain sm:h-20 sm:w-20"
              />

              <p className="mt-3 truncate text-sm font-black sm:text-base">
                {match.home_team.name}
              </p>

              <input
                type="number"
                min="0"
                step="1"
                value={homeScore}
                onChange={(event) =>
                  setHomeScore(
                    event.target.value
                  )
                }
                className="mx-auto mt-5 block w-20 rounded-xl border border-white/10 bg-black p-3 text-center text-2xl font-black outline-none focus:border-[#00CCCD] sm:w-24 sm:text-3xl"
              />

            </div>


            <span className="text-xs font-black text-gray-500 sm:text-base">
              VS
            </span>


            {/* AWAY */}
            <div className="min-w-0 text-center">

              <img
                src={
                  match.away_team.logo_url
                  ?? "/lcf-logo.png"
                }
                alt={match.away_team.name}
                className="mx-auto h-14 w-14 object-contain sm:h-20 sm:w-20"
              />

              <p className="mt-3 truncate text-sm font-black sm:text-base">
                {match.away_team.name}
              </p>

              <input
                type="number"
                min="0"
                step="1"
                value={awayScore}
                onChange={(event) =>
                  setAwayScore(
                    event.target.value
                  )
                }
                className="mx-auto mt-5 block w-20 rounded-xl border border-white/10 bg-black p-3 text-center text-2xl font-black outline-none focus:border-[#00CCCD] sm:w-24 sm:text-3xl"
              />

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* MATCH ROSTERS */}
        {/* ================================================= */}

        <section className="mt-8">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              Game Sheet
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Match Rosters
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Mark attendance, then enter goals and discipline for every player who participated.
            </p>

          </div>


          <div className="mt-6 grid gap-5 lg:grid-cols-2">

            {/* HOME ROSTER */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">

              <div className="flex items-center gap-3 border-b border-white/10 pb-4">

                <img
                  src={
                    match.home_team.logo_url
                    ?? "/lcf-logo.png"
                  }
                  alt={match.home_team.name}
                  className="h-10 w-10 object-contain"
                />

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Home
                  </p>
                  <h3 className="font-black">
                    {match.home_team.name}
                  </h3>
                </div>

              </div>


              {homePlayers.length === 0 ? (

                <p className="py-8 text-sm text-gray-500">
                  No players found for this team.
                </p>

              ) : (

                <div className="mt-3 space-y-3">

                  {homePlayers.map(
                    (player) => (
                      <PlayerStatCard
                        key={player.id}
                        player={player}
                        present={
                          presentPlayers[
                            player.id
                          ] ?? false
                        }
                        stats={
                          playerStats[
                            player.id
                          ] ?? {
                            goals: 0,
                            yellowCards: 0,
                            redCards: 0,
                          }
                        }
                        onToggle={togglePlayer}
                        onStatChange={updatePlayerStat}
                      />
                    )
                  )}

                </div>

              )}

            </div>


            {/* AWAY ROSTER */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">

              <div className="flex items-center gap-3 border-b border-white/10 pb-4">

                <img
                  src={
                    match.away_team.logo_url
                    ?? "/lcf-logo.png"
                  }
                  alt={match.away_team.name}
                  className="h-10 w-10 object-contain"
                />

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Away
                  </p>
                  <h3 className="font-black">
                    {match.away_team.name}
                  </h3>
                </div>

              </div>


              {awayPlayers.length === 0 ? (

                <p className="py-8 text-sm text-gray-500">
                  No players found for this team.
                </p>

              ) : (

                <div className="mt-3 space-y-3">

                  {awayPlayers.map(
                    (player) => (
                      <PlayerStatCard
                        key={player.id}
                        player={player}
                        present={
                          presentPlayers[
                            player.id
                          ] ?? false
                        }
                        stats={
                          playerStats[
                            player.id
                          ] ?? {
                            goals: 0,
                            yellowCards: 0,
                            redCards: 0,
                          }
                        }
                        onToggle={togglePlayer}
                        onStatChange={updatePlayerStat}
                      />
                    )
                  )}

                </div>

              )}

            </div>

          </div>


          {/* GOAL ATTRIBUTION CHECK */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">

            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00CCCD]">
              Goal Attribution Check
            </p>


            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              {/* HOME */}
              <div className="rounded-xl border border-white/10 p-4">

                <p className="text-sm font-black">
                  {match.home_team.name}
                </p>

                <p
                  className={`mt-2 text-lg font-black ${
                    homeTargetScore === null
                      ? "text-gray-500"
                      : homeGoalsMatch
                        ? "text-[#00CCCD]"
                        : "text-red-400"
                  }`}
                >
                  {homeAssignedGoals}{" / "}
                  {homeTargetScore ?? "-"}{" goals"}
                </p>

                {homeTargetScore !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    {homeGoalsMatch
                      ? "✓ All home goals are attributed."
                      : "Player goals must equal the official home score."}
                  </p>
                )}

              </div>


              {/* AWAY */}
              <div className="rounded-xl border border-white/10 p-4">

                <p className="text-sm font-black">
                  {match.away_team.name}
                </p>

                <p
                  className={`mt-2 text-lg font-black ${
                    awayTargetScore === null
                      ? "text-gray-500"
                      : awayGoalsMatch
                        ? "text-[#00CCCD]"
                        : "text-red-400"
                  }`}
                >
                  {awayAssignedGoals}{" / "}
                  {awayTargetScore ?? "-"}{" goals"}
                </p>

                {awayTargetScore !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    {awayGoalsMatch
                      ? "✓ All away goals are attributed."
                      : "Player goals must equal the official away score."}
                  </p>
                )}

              </div>

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* GOALKEEPERS */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              Goalkeeper Statistics
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Goalkeepers Who Played
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              This lets the platform calculate goalkeeper games, wins, goals allowed, clean sheets and the Golden Glove race automatically.
            </p>

          </div>


          <div className="mt-6 grid gap-4 md:grid-cols-2">

            {/* HOME GK */}
            <div>

              <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                {match.home_team.name} Goalkeeper
              </label>

              <select
                value={homeGoalkeeperId}
                onChange={(event) =>
                  setHomeGoalkeeperId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-4 font-bold outline-none focus:border-[#00CCCD]"
              >

                <option value="">
                  Select goalkeeper
                </option>

                {homeGoalkeeperOptions.map(
                  (player) => (
                    <option
                      key={player.id}
                      value={player.id}
                    >
                      {player.first_name}{" "}
                      {player.last_name}
                    </option>
                  )
                )}

              </select>


              {homeGoalkeeperOptions.length === 0 && (
                <p className="mt-2 text-xs font-bold text-red-400">
                  No present player is marked GK for this team.
                </p>
              )}

            </div>


            {/* AWAY GK */}
            <div>

              <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                {match.away_team.name} Goalkeeper
              </label>

              <select
                value={awayGoalkeeperId}
                onChange={(event) =>
                  setAwayGoalkeeperId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-4 font-bold outline-none focus:border-[#00CCCD]"
              >

                <option value="">
                  Select goalkeeper
                </option>

                {awayGoalkeeperOptions.map(
                  (player) => (
                    <option
                      key={player.id}
                      value={player.id}
                    >
                      {player.first_name}{" "}
                      {player.last_name}
                    </option>
                  )
                )}

              </select>


              {awayGoalkeeperOptions.length === 0 && (
                <p className="mt-2 text-xs font-bold text-red-400">
                  No present player is marked GK for this team.
                </p>
              )}

            </div>

          </div>

        </section>


        {/* ================================================= */}
        {/* MOTM */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              Individual Award
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Man of the Match
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Select one player who participated in this match. MOTM contributes to the MVP race.
            </p>

          </div>


          <div className="mt-6">

            <label className="text-xs font-black uppercase tracking-wider text-gray-500">
              MOTM Player
            </label>

            <select
              value={motmPlayerId}
              onChange={(event) =>
                setMotmPlayerId(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-4 font-bold outline-none focus:border-[#00CCCD]"
            >

              <option value="">
                Select Man of the Match
              </option>


              {presentHomePlayers.length > 0 && (
                <optgroup
                  label={match.home_team.name}
                >
                  {presentHomePlayers.map(
                    (player) => (
                      <option
                        key={player.id}
                        value={player.id}
                      >
                        {player.first_name}{" "}
                        {player.last_name}
                      </option>
                    )
                  )}
                </optgroup>
              )}


              {presentAwayPlayers.length > 0 && (
                <optgroup
                  label={match.away_team.name}
                >
                  {presentAwayPlayers.map(
                    (player) => (
                      <option
                        key={player.id}
                        value={player.id}
                      >
                        {player.first_name}{" "}
                        {player.last_name}
                      </option>
                    )
                  )}
                </optgroup>
              )}

            </select>

          </div>


          {selectedMotm && (
            <div className="mt-5 rounded-xl border border-[#00CCCD]/20 bg-[#00CCCD]/10 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                Selected MOTM
              </p>
              <p className="mt-1 font-black">
                {selectedMotm.first_name}{" "}
                {selectedMotm.last_name}
              </p>
            </div>
          )}

        </section>


        {/* ================================================= */}
        {/* PREVIOUS MATCHDAY POTW */}
        {/* ================================================= */}

        {match.matchday > 1 && !potwDismissed && (

          <section className="mt-8 rounded-3xl border border-[#00CCCD]/20 bg-[#00CCCD]/[0.04] p-5 sm:p-7">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                Fan Vote Result
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Matchday {match.matchday - 1} Player of the Week
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Confirm this only after the online fan vote has officially ended. POTW contributes +1 to the MVP race.
              </p>

            </div>


            {potwAlreadyRecorded ? (

              <div className="mt-6 rounded-xl border border-[#00CCCD]/20 bg-black/20 p-4">

                <p className="text-xs font-black uppercase tracking-wider text-[#00CCCD]">
                  POTW Recorded
                </p>

                <p className="mt-1 font-black">
                  {potwWinnerName || "Winner already recorded"}
                </p>

                {potwMessage && (
                  <p className="mt-2 text-xs text-gray-500">
                    {potwMessage}
                  </p>
                )}

              </div>

            ) : (

              <>

                <div className="mt-6">

                  <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Fan-voted winner
                  </label>

                  <select
                    value={potwPlayerId}
                    onChange={(event) =>
                      setPotwPlayerId(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-4 font-bold outline-none focus:border-[#00CCCD]"
                  >

                    <option value="">
                      Select Matchday {match.matchday - 1} POTW
                    </option>

                    {potwCandidates.map(
                      (player) => (
                        <option
                          key={player.id}
                          value={player.id}
                        >
                          {player.first_name}{" "}
                          {player.last_name}
                        </option>
                      )
                    )}

                  </select>


                  {potwCandidates.length === 0 && (
                    <p className="mt-3 text-xs font-bold text-yellow-300">
                      No eligible POTW candidates were found yet. Complete the previous matchday game sheets first, or choose Decide Later.
                    </p>
                  )}

                </div>


                {potwError && (
                  <p className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm font-bold text-red-400">
                    {potwError}
                  </p>
                )}


                {potwMessage && (
                  <p className="mt-4 rounded-xl bg-[#00CCCD]/10 p-4 text-sm font-bold text-[#00CCCD]">
                    {potwMessage}
                  </p>
                )}


                <div className="mt-5 flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={confirmPotwWinner}
                    disabled={
                      potwSaving ||
                      potwCandidates.length === 0
                    }
                    className="rounded-xl bg-[#00CCCD] px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {potwSaving
                      ? "Saving POTW..."
                      : "Confirm POTW Winner"}
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      setPotwDismissed(true)
                    }
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-gray-400 transition hover:border-white/30 hover:text-white"
                  >
                    Decide Later
                  </button>

                </div>

              </>

            )}

          </section>

        )}


        {/* ================================================= */}
        {/* SAVE / RESET */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">

          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Final Check
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Save Official Game Sheet
          </h2>


          <div className="mt-5 grid gap-3 sm:grid-cols-2">

            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs font-black uppercase text-gray-500">
                {match.home_team.name}
              </p>
              <p className={`mt-2 font-black ${
                homeGoalsMatch
                  ? "text-[#00CCCD]"
                  : "text-red-400"
              }`}>
                {homeAssignedGoals} / {homeTargetScore ?? "-"} goals attributed
              </p>
            </div>


            <div className="rounded-xl border border-white/10 p-4">
              <p className="text-xs font-black uppercase text-gray-500">
                {match.away_team.name}
              </p>
              <p className={`mt-2 font-black ${
                awayGoalsMatch
                  ? "text-[#00CCCD]"
                  : "text-red-400"
              }`}>
                {awayAssignedGoals} / {awayTargetScore ?? "-"} goals attributed
              </p>
            </div>

          </div>


          {message && (
            <p className="mt-6 rounded-xl bg-[#00CCCD]/10 p-4 text-sm font-bold text-[#00CCCD]">
              ✓ {message}
            </p>
          )}


          {error && (
            <p className="mt-6 rounded-xl bg-red-500/10 p-4 text-sm font-bold text-red-400">
              {error}
            </p>
          )}


          <div className="mt-7 flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={saveOfficialGameSheet}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#00CCCD] px-5 py-4 font-black text-black transition hover:bg-[#00E4E5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving Official Game Sheet..."
                : "Save Official Game Sheet"}
            </button>


            <button
              type="button"
              onClick={resetResult}
              disabled={saving}
              className="rounded-xl border border-white/10 px-5 py-4 font-black transition hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
            >
              Reset Result
            </button>

          </div>

        </section>


        {/* ================================================= */}
        {/* QUICK ADMIN LINKS */}
        {/* ================================================= */}

        <div className="mt-8 flex flex-wrap gap-4 text-sm font-black">

          <Link
            href="/admin/matches"
            className="text-[#00CCCD]"
          >
            ← Match Control
          </Link>

          <Link
            href="/admin/players"
            className="text-gray-500 transition hover:text-white"
          >
            Manage Players
          </Link>

          <Link
            href="/admin"
            className="text-gray-500 transition hover:text-white"
          >
            Admin Dashboard
          </Link>

        </div>

      </div>

    </main>

  );

}
