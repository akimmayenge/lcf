"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      setLoading(false);
    }

    checkSession();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030707] text-white">
        <p className="font-black text-gray-500">
          Loading Admin...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030707] px-6 py-32 text-white">
      <div className="mx-auto max-w-7xl">

        <div className="mt-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.20em] text-[#00CCCD]">
              LCF Administration
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Admin Dashboard
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="w-fit rounded-xl border border-white/10 px-5 py-3 text-sm font-black hover:border-[#00CCCD] hover:text-[#00CCCD]"
          >
            Logout
          </button>

        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">

          <Link
            href="/admin/players"
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-1 hover:border-[#00CCCD]/50"
          >
            <p className="text-xs font-black uppercase tracking-wider text-[#00CCCD]">
              Players
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Manage Players
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Add players, portraits and team assignments.
            </p>
          </Link>

          <Link
            href="/admin/matches"
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition hover:-translate-y-1 hover:border-[#00CCCD]/50"
          >
            <p className="text-xs font-black uppercase tracking-wider text-[#00CCCD]">
              Matches
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Match Control
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Results, game sheets, goals and cards.
            </p>
          </Link>

        </div>

        <Link
          href="/"
          className="mt-10 inline-block text-sm font-black text-gray-500 hover:text-[#00CCCD]"
        >
          ← View Public Website
        </Link>

      </div>
    </main>
  );
}