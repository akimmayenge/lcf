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

type Team = {
  id: number;
  name: string;
  logo_url: string | null;
};

type Match = {
  id: number;
  home_team_id: number;
  away_team_id: number;

  home_score: number | null;
  away_score: number | null;

  status: string;

  home_team: Team;
  away_team: Team;
};

export default function AdminMatchPage() {
  const params =
    useParams<{ id: string }>();

  const router = useRouter();

  const matchId =
    Number(params.id);

  const [match, setMatch] =
    useState<Match | null>(null);

  const [homeScore, setHomeScore] =
    useState("");

  const [awayScore, setAwayScore] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadMatch() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const {
        data,
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
          .eq("id", matchId)
          .single();

      if (
        matchError ||
        !data
      ) {
        setError(
          "Could not load match."
        );

        setLoading(false);
        return;
      }

      const game =
        data as unknown as Match;

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

      setLoading(false);
    }

    if (
      Number.isFinite(matchId)
    ) {
      loadMatch();
    }

  }, [
    matchId,
    router,
  ]);

  async function saveResult() {
    if (!match) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    if (
      homeScore === "" ||
      awayScore === ""
    ) {
      setError(
        "Enter both scores."
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

    const {
      error: updateError,
    } =
      await supabase
        .from("matches")
        .update({
          home_score: home,
          away_score: away,
          status: "finished",
        })
        .eq("id", match.id);

    if (updateError) {
      console.error(updateError);

      setError(
        "Could not save result."
      );

      setSaving(false);
      return;
    }

    setMatch({
      ...match,
      home_score: home,
      away_score: away,
      status: "finished",
    });

    setMessage(
      "Official result saved."
    );

    setSaving(false);
  }

  async function resetResult() {
    if (!match) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    const {
      error: resetError,
    } =
      await supabase
        .from("matches")
        .update({
          home_score: null,
          away_score: null,
          status: "upcoming",
        })
        .eq("id", match.id);

    if (resetError) {
      setError(
        "Could not reset match."
      );

      setSaving(false);
      return;
    }

    setHomeScore("");
    setAwayScore("");

    setMatch({
      ...match,
      home_score: null,
      away_score: null,
      status: "upcoming",
    });

    setMessage(
      "Match returned to upcoming."
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030707] text-white">
        Loading match...
      </main>
    );
  }

  if (
    error &&
    !match
  ) {
    return (
      <main className="min-h-screen bg-[#030707] px-6 py-32 text-white">
        <p className="text-red-400">
          {error}
        </p>
      </main>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#030707] px-6 py-32 text-white">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/admin/matches"
          className="text-sm font-black text-[#00CCCD]"
        >
          ← Match Control
        </Link>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            Official Result
          </p>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-5">

            <div className="text-center">

              <img
                src={
                  match.home_team.logo_url
                  ?? "/lcf-logo.png"
                }
                alt={match.home_team.name}
                className="mx-auto h-20 w-20 object-contain"
              />

              <p className="mt-3 font-black">
                {match.home_team.name}
              </p>

              <input
                type="number"
                min="0"
                value={homeScore}
                onChange={(event) =>
                  setHomeScore(
                    event.target.value
                  )
                }
                className="mx-auto mt-5 block w-24 rounded-xl border border-white/10 bg-black p-3 text-center text-3xl font-black outline-none focus:border-[#00CCCD]"
              />

            </div>

            <span className="font-black text-gray-500">
              VS
            </span>

            <div className="text-center">

              <img
                src={
                  match.away_team.logo_url
                  ?? "/lcf-logo.png"
                }
                alt={match.away_team.name}
                className="mx-auto h-20 w-20 object-contain"
              />

              <p className="mt-3 font-black">
                {match.away_team.name}
              </p>

              <input
                type="number"
                min="0"
                value={awayScore}
                onChange={(event) =>
                  setAwayScore(
                    event.target.value
                  )
                }
                className="mx-auto mt-5 block w-24 rounded-xl border border-white/10 bg-black p-3 text-center text-3xl font-black outline-none focus:border-[#00CCCD]"
              />

            </div>

          </div>

          {message && (
            <p className="mt-6 rounded-xl bg-[#00CCCD]/10 p-4 text-sm font-bold text-[#00CCCD]">
              {message}
            </p>
          )}

          {error && (
            <p className="mt-6 rounded-xl bg-red-500/10 p-4 text-sm font-bold text-red-400">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">

            <button
              onClick={saveResult}
              disabled={saving}
              className="flex-1 rounded-xl bg-[#00CCCD] px-5 py-3 font-black text-black disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Official Result"}
            </button>

            <button
              onClick={resetResult}
              disabled={saving}
              className="rounded-xl border border-white/10 px-5 py-3 font-black hover:border-red-500/50 hover:text-red-400"
            >
              Reset Result
            </button>

          </div>

        </section>

      </div>
    </main>
  );
}