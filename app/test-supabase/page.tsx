import { supabase } from "@/lib/supabase";

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from("matches")
    .select(`
      id,
      matchday,
      match_date,
      match_time,
      gym,
      location,
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
      )
    `)
    .eq("season_id", 1)
    .eq("matchday", 1)
    .order("match_time", { ascending: true })
    .order("gym", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-black p-10 text-red-500">
        <h1 className="text-2xl font-black">
          Supabase Error
        </h1>

        <pre className="mt-6 whitespace-pre-wrap">
          {error.message}
        </pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-3xl font-black text-[#00CCCD]">
        LCF Supabase Test
      </h1>

      <p className="mt-2 text-gray-400">
        Matchday 1 data coming from Supabase.
      </p>

      <pre className="mt-8 overflow-x-auto rounded-xl bg-white/10 p-6">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}