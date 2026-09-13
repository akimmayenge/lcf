"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type Team = {
  id: number;
  name: string;
  logo_url: string | null;
};

type Match = {
  id: number;
  matchday: number;
  match_date: string;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  status: string;

  home_team: Team;
  away_team: Team;
};

export default function AdminMatchesPage() {
  const router = useRouter();

  const [matches, setMatches] =
    useState<Match[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadMatches() {
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
        error: matchesError,
      } =
        await supabase
          .from("matches")
          .select(`
            id,
            matchday,
            match_date,
            match_time,
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
          .eq("season_id", 1)
          .order("matchday")
          .order("match_time");

      if (matchesError) {
        console.error(matchesError);
        setError(
          "Could not load matches."
        );
      } else {
        setMatches(
          (data ?? []) as unknown as Match[]
        );
      }

      setLoading(false);
    }

    loadMatches();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030707] text-white">
        Loading matches...
      </main>
    );
  }

  return (
    <main className="mt-10 min-h-screen bg-[#030707] px-6 py-32 text-white">
      <div className=" mx-auto max-w-7xl">

        <Link
          href="/admin"
          className="text-sm font-black text-[#00CCCD]"
        >
          ← Admin Dashboard
        </Link>

        <div className="mt-8">
          <p className="text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            LCF Administration
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Match Control
          </h1>
        </div>

        {error && (
          <p className="mt-6 text-red-400">
            {error}
          </p>
        )}

        <div className="mt-10 space-y-12">

          {Array.from(
            { length: 15 },
            (_, index) => index + 1
          ).map((matchday) => {

            const games =
              matches.filter(
                (match) =>
                  match.matchday ===
                  matchday
              );

            if (games.length === 0) {
              return null;
            }

            return (
              <section key={matchday}>

                <h2 className="mb-5 text-xl font-black">
                  Matchday {matchday}
                </h2>

                <div className="grid gap-4 md:grid-cols-2">

                  {games.map((match) => (
                    <Link
                      key={match.id}
                      href={`/admin/matches/${match.id}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#00CCCD]/50"
                    >

                      <div className="flex items-center justify-between">

                        <p className="text-xs font-bold text-gray-500">
                          {match.match_date}
                        </p>

                        <span className="text-xs font-black text-[#00CCCD]">
                          {match.status}
                        </span>

                      </div>

                      <div className="mt-5 space-y-3">

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-3">
                            <img
                              src={
                                match.home_team.logo_url
                                ?? "/lcf-logo.png"
                              }
                              alt={match.home_team.name}
                              className="h-9 w-9 object-contain"
                            />

                            <span className="font-black">
                              {match.home_team.name}
                            </span>
                          </div>

                          <span className="text-xl font-black">
                            {match.home_score ?? "-"}
                          </span>

                        </div>

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-3">
                            <img
                              src={
                                match.away_team.logo_url
                                ?? "/lcf-logo.png"
                              }
                              alt={match.away_team.name}
                              className="h-9 w-9 object-contain"
                            />

                            <span className="font-black">
                              {match.away_team.name}
                            </span>
                          </div>

                          <span className="text-xl font-black">
                            {match.away_score ?? "-"}
                          </span>

                        </div>

                      </div>

                      <p className="mt-5 border-t border-white/10 pt-4 text-xs font-black text-[#00CCCD]">
                        Manage Match →
                      </p>

                    </Link>
                  ))}

                </div>

              </section>
            );
          })}

        </div>
      </div>
    </main>
  );
}