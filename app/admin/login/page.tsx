"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030707] px-6 text-white">
      <div className="w-full max-w-md">

        <Link
          href="/"
          className="text-sm font-black text-[#00CCCD]"
        >
          ← Back to LCF
        </Link>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.03] p-8">

          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
            LCF Administration
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Admin Login
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Authorized LCF administrators only.
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#00CCCD]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-[#00CCCD]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm font-bold text-red-400">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#00CCCD] px-5 py-3 font-black text-black transition hover:bg-[#00E4E5] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Login"}
            </button>

          </form>
        </section>
      </div>
    </main>
  );
}