import Image from "next/image";
import Link from "next/link";

import { supabase } from "@/lib/supabase";

import {
  calculateStandings,
  type LeagueTeam,
  type LeagueMatch,
} from "@/lib/leagueStats";


export default async function Home() {

  // ==========================================
  // TEAMS
  // ==========================================

  const { data: teams } =
    await supabase
      .from("teams")
      .select(`
        id,
        name,
        slug,
        logo_url
      `)
      .eq("is_active", true);


  // ==========================================
  // MATCHES
  // ==========================================

  const { data: matches } =
    await supabase
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

    <main className="bg-[#030707] text-white">


      {/* ====================================================== */}
      {/* HERO */}
      {/* ====================================================== */}

      <section
        id="home"
        className="
          relative
          overflow-hidden
          px-4
          pb-16
          pt-40
          sm:px-6
          md:pb-24
          md:pt-44
        "
      >

        {/* SUBTLE BACKGROUND GLOW */}

        <div
          className="
            pointer-events-none
            absolute
            left-1/2
            top-40
            h-[400px]
            w-[400px]
            -translate-x-1/2
            rounded-full
            bg-[#00CCCD]/10
            blur-[180px]
          "
        />


        <div className="relative mx-auto max-w-7xl">


          {/* HERO GRID */}

          <div
            className="
              grid
              items-center
              gap-10
              lg:grid-cols-[1.05fr_0.95fr]
              lg:gap-16
            "
          >


            {/* ========================================== */}
            {/* HERO TEXT */}
            {/* ========================================== */}

            <div>


              {/* SEASON */}

              <div className="flex items-center gap-3">

                <div className="h-[3px] w-10 rounded-full bg-[#00CCCD]" />

                <p className="text-xs font-black uppercase tracking-[0.24em] text-gray-400">
                  2026-27 Season
                </p>

              </div>


              {/* TITLE */}

              <h1
                className="
                  mt-5
                  max-w-3xl
                  text-4xl
                  font-black
                  leading-[0.95]
                  tracking-tight
                  sm:text-5xl
                  md:text-6xl
                  lg:text-7xl
                "
              >
                Ligue
                <span className="block text-[#00CCCD]">
                  Competitive
                </span>
                Futsal
              </h1>


              {/* VALUES */}

              <p
                className="
                  mt-6
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.24em]
                  text-gray-400
                  sm:text-sm
                "
              >
                Competition • Respect • Professionalism
              </p>


              {/* DESCRIPTION */}

              <p
                className="
                  mt-6
                  max-w-xl
                  text-base
                  leading-7
                  text-gray-400
                  sm:text-lg
                "
              >
                LCF brings clubs and players together for an
                intense futsal season built around competition,
                community and player development.
              </p>


              {/* BUTTONS */}

              <div
                className="
                  mt-8
                  grid
                  gap-3
                  sm:flex
                  sm:flex-wrap
                "
              >

                <Link
                  href="/matches"
                  className="
                    flex
                    min-h-[52px]
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#00CCCD]
                    px-7
                    py-3
                    text-sm
                    font-black
                    text-black
                    transition
                    hover:bg-[#00E4E5]
                  "
                >
                  View Matches →
                </Link>


                <Link
                  href="/standings"
                  className="
                    flex
                    min-h-[52px]
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/15
                    px-7
                    py-3
                    text-sm
                    font-black
                    text-white
                    transition
                    hover:border-[#00CCCD]
                    hover:text-[#00CCCD]
                  "
                >
                  View Standings
                </Link>

              </div>

            </div>



            {/* ========================================== */}
            {/* PLAYER PHOTO */}
            {/* ========================================== */}

            <div
              className="
                relative
                mx-auto
                w-full
                max-w-[430px]
                lg:ml-auto
              "
            >

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-[2rem]
                  border
                  border-white/10
                  bg-white
                "
              >

                <Image
                  src="/lcf-hero-player.jpeg"
                  alt="LCF futsal player"
                  width={1187}
                  height={1772}
                  priority
                  className="
                    h-[430px]
                    w-full
                    object-cover
                    object-[center_25%]
                    sm:h-[520px]
                    lg:h-[590px]
                  "
                />


                {/* DARK BOTTOM FADE */}

                <div
                  className="
                    pointer-events-none
                    absolute
                    inset-x-0
                    bottom-0
                    h-36
                    bg-gradient-to-t
                    from-black/80
                    to-transparent
                  "
                />


                {/* PHOTO LABEL */}

                <div className="absolute bottom-5 left-5">

                  <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                    LCF
                  </p>

                  <p className="mt-1 text-sm font-bold text-white">
                    More than a league.
                  </p>

                </div>

              </div>

            </div>

          </div>



          {/* ================================================== */}
          {/* LEAGUE NUMBERS */}
          {/* ================================================== */}

          <div
            className="
              mt-12
              grid
              grid-cols-2
              gap-3
              md:mt-16
              md:grid-cols-4
            "
          >

            <LeagueStat
              value="66"
              label="Total Matches"
            />

            <LeagueStat
              value="18"
              label="Weeks of Competition"
            />

            <LeagueStat
              value="1"
              label="Champion"
            />

            <LeagueStat
              value="$1,100"
              label="1st Place Prize"
            />

          </div>


        </div>

      </section>



      {/* ====================================================== */}
      {/* SEASON MESSAGE */}
      {/* ====================================================== */}

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-8 sm:px-6">

        <div className="mx-auto max-w-7xl">

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >

            <div>

              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#00CCCD]">
                2026-27 Season
              </p>

              <h2 className="mt-2 text-2xl font-black">
                10 Clubs. One League.
              </h2>

            </div>


            <p className="max-w-xl text-sm leading-6 text-gray-400 sm:text-right">
              A competitive futsal platform connecting players,
              clubs, results, standings and individual
              performances throughout the season.
            </p>

          </div>

        </div>

      </section>



      {/* ====================================================== */}
      {/* STANDINGS PREVIEW */}
      {/* ====================================================== */}

      <section className="border-t border-black/10 bg-[#030707] px-4 py-14 sm:px-6">

        <div className="mx-auto max-w-5xl">


          {/* TITLE */}

          <div className="mb-8 text-center">

            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00CCCD]">
              Competition
            </p>

            <h2 className="mt-2 text-3xl font-black text-white">
              League Table
            </h2>

          </div>


          {/* TABLE */}

          <div className="overflow-hidden rounded-2xl bg-white text-black">


            {/* HEADER */}

            <div
              className="
                grid
                grid-cols-[40px_1fr_60px]
                border-b
                border-gray-200
                bg-gray-50
                px-4
                py-4
                text-xs
                font-black
                uppercase
                tracking-wider
                text-gray-500
                sm:grid-cols-[50px_1fr_80px]
                sm:px-5
              "
            >

              <span>
                #
              </span>

              <span>
                Team
              </span>

              <span className="text-center">
                PTS
              </span>

            </div>


            {/* TOP THREE */}

            {topThree.map(
              (team, index) => (

                <div
                  key={team.teamId}
                  className={`
                    grid
                    grid-cols-[40px_1fr_60px]
                    items-center
                    px-4
                    py-4
                    sm:grid-cols-[50px_1fr_80px]
                    sm:px-5

                    ${
                      index <
                      topThree.length - 1
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
                    href={`/teams/${team.slug}`}
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-3
                      transition
                      hover:text-[#008E90]
                    "
                  >

                    <img
                      src={
                        team.logoUrl ??
                        "/lcf-logo.png"
                      }
                      alt={team.name}
                      className="h-8 w-8 shrink-0 object-contain"
                    />

                    <span className="truncate text-sm font-bold sm:text-base">
                      {team.name}
                    </span>

                  </Link>


                  {/* POINTS */}

                  <span className="text-center font-black text-[#008E90]">
                    {team.points}
                  </span>

                </div>

              )
            )}

          </div>


          {/* FULL STANDINGS */}

          <div className="mt-8 text-center">

            <Link
              href="/standings"
              className="
                inline-flex
                min-h-[48px]
                items-center
                justify-center
                gap-2
                rounded-full
                border
                border-[#00CCCD]
                px-7
                py-3
                text-sm
                font-black
                text-[#00CCCD]
                transition
                hover:bg-[#00CCCD]
                hover:text-black
              "
            >
              View Full Standings →
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}


// ============================================================
// SMALL LEAGUE STAT CARD
// ============================================================

function LeagueStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {

  return (

    <div
      className="
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        px-4
        py-5
        text-center
        sm:px-5
      "
    >

      <p className="text-2xl font-black text-white sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 sm:text-xs">
        {label}
      </p>

    </div>

  );
}