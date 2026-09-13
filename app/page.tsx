import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import {
  calculateStandings,
  type LeagueTeam,
  type LeagueMatch,
} from "@/lib/leagueStats";

export default async function Home() {
  const { data: teams } = await supabase
  .from("teams")
  .select(`
    id,
    name,
    slug,
    logo_url
  `)
  .eq("is_active", true);


const { data: matches } = await supabase
  .from("matches")
  .select(`
    home_team_id,
    away_team_id,
    home_score,
    away_score,
    status
  `)
  .eq("season_id", 1);


const leagueTeams =
  (teams ?? []) as unknown as LeagueTeam[];

const leagueMatches =
  (matches ?? []) as unknown as LeagueMatch[];


const standings =
  calculateStandings(
    leagueTeams,
    leagueMatches
  );


const topThree =
  standings.slice(0, 3);
  
  return (
    <main className="bg-black text-white">

      


      {/* HERO SECTION */}
      <section
        id="home"
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-15"
      >

        {/* CYAN GLOW */}
        <div className="absolute h-[80px] w-[80px] rounded-full bg-[#00CCCD]/15 blur-[150px]"></div>

        {/* HERO CONTENT */}
        <div className="relative z-6 text-center">

          <Image
            src="/lcf-logo.png"
            alt="LCF Logo"
            width={400}
            height={400}
            className="mx-auto mb-6 h-auto w-[200px] md:w-[200px]"
          />

          <h1 className="text-1xl font-black tracking-[0.10em] text-[#00CCCD] md:text-3xl">
            LCF
          </h1>

          <p className="mt-6 text-lg uppercase tracking-[0.23em] text-gray-200">
            The competition starts here
          </p>

          <a
            href="/matches"
            className="mt-10 inline-block rounded-full border border-[#00CCCD] bg-[#00CCCD] px-8 py-4 font-bold text-black transition duration-300 hover:scale-105 hover:bg-transparent hover:text-[#00CCCD]"
          >
            Explore LCF
          </a>
          </div>

          </section>

          <section className= "border-t border-black bg-[#00CCCD]  px py-8">
          <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-2xl font-black tracking-[0.10em] md:text-2xl">
            2026-27 SEASON
          </h1>

          <p className="mt-8 text-lg font-bold uppercase tracking-[0.20em] text-gray-200">
            10 Clubs. One League.
          </p>
          </div>
          </section>

         
          
          

        

        


        

        {/* HERO CONTENT */}

        

            {/* STANDINGS PREVIEW */}
    <section className="border-t border-black/10 bg-[#030707] px-6 py-12">

      <div className="mx-auto max-w-5xl">

        {/* TITLE */}
        <div className="mb-10 text-center">

          <p className="mb-3 text-3xl font-black uppercase tracking-[0.25em] text-[#00CCCD] md:text-3xl">
            Competition
          </p>

          <h2 className="text-3xl font-black text-white md:text-1xl">
            League Table
          </h2>

        </div>


        {/* SMALL TABLE */}
        <div className="overflow-hidden rounded-2xl bg-white text-black">

          {/* HEADER */}
          <div className="grid grid-cols-[50px_1fr_80px] border-b border-gray-200 bg-gray-50 px-5 py-4 text-sm font-bold text-gray-500">

            <span>#</span>

            <span>TEAM</span>

            <span className="text-center">
              PTS
            </span>

          </div>


          {/* LIVE TOP 3 */}
          {topThree.map((team, index) => (

            <div
              key={team.teamId}
              className={`
                grid grid-cols-[50px_1fr_80px]
                items-center px-5 py-4

                ${
                  index < topThree.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }
              `}
            >

              {/* POSITION */}
              <span className="font-black">
                {team.position}
              </span>


              {/* TEAM */}
              <Link
                href={'/teams/${team.slug}'}
                className="flex items-center gap-3 transition hover:text-[#008E90]"
                >
                  <img
                    src={
                      team.logoUrl ??
                      "/lcf-logo.png"

                    }
                    alt={team.name}
                    className="h-8 w-8 object-contain"
                    />
                    <span className="font-bold">
                      {team.name}
                    </span>
                </Link>


              {/* POINTS */}
              <span className="text-center font-black text-[#00CCCD]">
                {team.points}
              </span>

            </div>

          ))}

        </div>


        {/* FULL STANDINGS BUTTON */}
        <div className="mt-8 text-center">

          <Link
            href="/standings"
            className="inline-flex items-center gap-2 rounded-full border border-[#00CCCD] px-7 py-3 font-bold text-[#00CCCD] transition duration-300 hover:bg-[#00CCCD] hover:text-black"
          >
            View Full Standings →
          </Link>

        </div>

      </div>

    </section>
  
  </main>
)};