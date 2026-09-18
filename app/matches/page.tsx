import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// ==========================================================
// MATCH TYPE
// ==========================================================

type Match = {
  id: number;
  date: string;
  time: string;

  homeTeam: string;
  awayTeam: string;
  homeSlug: string;
  awaySlug: string;

  homeLogo: string;
  awayLogo: string;

  gym: string;
  location: string;

  homeScore: number | null;
  awayScore: number | null;
  status: string;

  detailsHref?: string;
  previousHref?: string;
};






function MatchCard({ match }: { match: Match }) {
  return (
    <div
      className="
        flex
        h-full
        flex-col
        overflow-hidden
        rounded-2xl
        border
        border-white/10
        bg-white
        text-black
        transition
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
      "
    >

      {/* DATE + TIME */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">

        <span className="text-xs font-black uppercase tracking-wider text-gray-500">
          {match.date}
        </span>

        <span className="text-sm font-black">
          {match.time}
        </span>

      </div>



      {/* TEAMS */}
      {/* HOME TEAM */}
      <div className="flex items-center justify-between gap-4 px-4 py-1">

        <Link
          href={`/teams/${match.homeSlug}`}
          className="flex min-w-0 items-center gap-3 transition hover:text-[#008E90]"
        >

          <img
            src={match.homeLogo}
            alt={match.homeTeam}
            className="h-7 w-7 object-contain transition duration-300 hover:scale-110"
          />

          <span className="text-sm font-black">
            {match.homeTeam}
          </span>

        </Link>


        {match.status === "finished" &&
          match.homeScore !== null && (

            <span className="w-8 text-right text-2xl font-black leading-none">
              {match.homeScore}
            </span>

          )}

      </div>


      {/* VS / FULL TIME */}
      <div className="my-4 flex items-center gap-3 px-4">

        <div className="h-px flex-1 bg-gray-200" />

        <span className="text-[11px] font-black uppercase text-[#008E90]">
          {match.status === "finished" ? "FT" : "VS"}
        </span>

        <div className="h-px flex-1 bg-gray-200" />

      </div>


      {/* AWAY TEAM */}
      <div className="flex items-center justify-between gap-4 px-4 py-1">

        <Link
          href={`/teams/${match.awaySlug}`}
          className="flex min-w-0 items-center gap-3 transition hover:text-[#008E90]"
        >

          <img
            src={match.awayLogo}
            alt={match.awayTeam}
            className="h-7 w-7 object-contain transition duration-300 hover:scale-110"
          />

          <span className="text-sm font-black">
            {match.awayTeam}
          </span>

        </Link>


        {match.status === "finished" &&
          match.awayScore !== null && (

            <span className="w-8 text-right text-2xl font-black leading-none">
              {match.awayScore}
            </span>

          )}

      </div>

     



        {/* LOCATION */}
        <div className="mt-5 rounded-xl   bg-gray-50 px-3 py-3">

          <p className="text-[11px] font-black uppercase tracking-wider text-[#008E90]">
            {match.gym}
          </p>

          <p className="mt-1 text-xs font-bold text-gray-500">
            {match.location}
          </p>

        

      </div>



      {/* BUTTONS */}
      <div className="grid grid-cols-2 border-t border-gray-200">


        {/* PREVIOUS */}

        {match.previousHref ? (

          <Link
            href={match.previousHref}
            className="
              border-r
              border-gray-200
              px-3
              py-3
              text-center
              text-xs
              font-black
              transition
              hover:bg-gray-100
              hover:text-[#008E90]
            "
          >
            Previous
          </Link>

        ) : (

          <span
            className="
              cursor-not-allowed
              border-r
              border-gray-200
              px-3
              py-3
              text-center
              text-xs
              font-black
              text-gray-400
            "
          >
            Previous
          </span>

        )}



        {/* DETAILS */}

        {match.detailsHref ? (

          <Link
            href={match.detailsHref}
            className="
              bg-[#00CCCD]
              px-3
              py-3
              text-center
              text-xs
              font-black
              transition
              hover:bg-[#00E4E5]
            "
          >
            Details →
          </Link>

        ) : (

          <span
            className="
              cursor-not-allowed
              bg-[#00CCCD]
              px-3
              py-3
              text-center
              text-xs
              font-black
              opacity-60
            "
          >
            Details →
          </span>

        )}

      </div>

    </div>
  );
}



// ==========================================================
// MATCHDAY SECTION
// SAME STRUCTURE FOR EVERY MATCHDAY
// ==========================================================

function MatchdaySection({
  number,
  date,
  matches,
}: {
  number: number;
  date: string;
  matches: Match[];
}) {
  return (
    <div className="mb-20">


      {/* MATCHDAY HEADER */}
      <div
        className="
          mb-6
          flex
          flex-col
          gap-2
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >

        <h2 className="text-xl font-black leading-tight text-white sm:text-2xl">
          Matchday {number} • 2026-27 Season
        </h2>

        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 sm:text-sm">
          {date}
        </p>

      </div>



      {/* MATCHES */}

      {matches.length > 0 ? (

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
            />
          ))}

        </div>

      ) : (

        <div
          className="
            rounded-2xl
            border
            border-dashed
            border-white/10
            bg-white/[0.02]
            px-6
            py-10
            text-center
          "
        >

          <p className="text-sm font-bold text-gray-500">
            Fixtures to be announced.
          </p>

        </div>

      )}

    </div>
  );
}



// ==========================================================
// PAGE
// ==========================================================

export default async function MatchesPage() {

  // ==========================================================
  // GET ALL MATCHES FROM SUPABASE
  // ==========================================================

const { data: databaseMatches, error } = await supabase
  .from("matches")
  .select(`
    id,
    matchday,
    match_date,
    match_time,
    gym,
    location,
    status,
    home_score,
    away_score,

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
  .order("matchday", { ascending: true })
  .order("match_time", { ascending: true })
  .order("gym", { ascending: true });


  // If Supabase has a problem, show it in the terminal
  if (error) {
    console.error("Supabase error:", error);
  }

  console.log(
  "MATCHDAYS FROM DATABASE:",
  databaseMatches?.map((match) => match.matchday)
);


  // ==========================================================
  // DATABASE TYPES
  // ==========================================================
  type DatabaseTeam = {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  


  type DatabaseMatch = {
    id: number;
    matchday: number;
    match_date: string;
    match_time: string;
    gym: string | null;
    location: string | null;
    home_score: number | null;
    away_score: number | null;
    status: string;

    home_team: DatabaseTeam;
    away_team: DatabaseTeam;
  };



  // ==========================================================
  // CONVERT SUPABASE DATA INTO DATABASEMATCH[]
  // ==========================================================

  const dbMatches =
    (databaseMatches ?? []) as unknown as DatabaseMatch[];



  // ==========================================================
  // DATE FORMAT
  // 2026-09-16 → Wed 16.09.2026
  // ==========================================================

  function formatMatchDate(date: string) {

    const [year, month, day] = date.split("-");

    const dateObject = new Date(
      `${year}-${month}-${day}T12:00:00Z`
    );

    const weekday = dateObject.toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        timeZone: "UTC",
      }
    );

    return `${weekday} ${day}.${month}.${year}`;
  }



  // ==========================================================
  // TIME FORMAT
  // 21:00:00 → 9:00 PM
  // ==========================================================

  function formatMatchTime(time: string) {

    const [hourText, minute] = time.split(":");

    let hour = Number(hourText);

    const period =
      hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${period}`;
  }



  // ==========================================================
  // GET ONE MATCHDAY
  // ==========================================================

  function getMatchdayFromDatabase(
    matchdayNumber: number
  ): Match[] {

    return dbMatches

      // Only keep matches from the requested matchday
      .filter(
        (match) =>
          match.matchday === matchdayNumber
      )

      // Convert database format → MatchCard format
      .map((match) => {

        const detailsHref =
           `/matches/${match.id}`;

        return {

          id: match.id,

          date:
            formatMatchDate(match.match_date),

          time:
            formatMatchTime(match.match_time),

          homeTeam:
            match.home_team.name,

          awayTeam:
            match.away_team.name,
          homeSlug:
            match.home_team.slug,
          awaySlug:
            match.away_team.slug,

          homeLogo:
            match.home_team.logo_url
            ?? "/lcf-logo.png",

          awayLogo:
            match.away_team.logo_url
            ?? "/lcf-logo.png",

          gym:
            match.gym
            ?? "Gym TBD",

          location:
            match.location
            ?? "Location TBD",
          
          homeScore:
            match.home_score,
          awayScore:
            match.away_score,
          status:
            match.status,

          detailsHref,

          previousHref:
            `${detailsHref}#previous`,
        };
      });
  }



  // ==========================================================
  // MATCHDAYS CURRENTLY STORED IN SUPABASE
  // ==========================================================





  return (






   





        <section
      id="matches"
      className="
        min-h-screen
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
    

      <div className="mx-auto max-w-7xl">


        {/* PAGE TITLE */}
       {/* PAGE TITLE */}
      <div className="mb-14">

        <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
          2026-27 Season
        </p>

        <h1 className="mt-2 text-4xl font-black leading-none tracking-tight text-[#00CCCD] sm:text-5xl">
          Matches
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base">
          Senior LaLiga LCF • Official Fixtures
        </p>

      </div>



        {/* MATCHDAY 1 */}
        <MatchdaySection
          number={1}
          date="September 16, 2026"
          matches={getMatchdayFromDatabase(1)}
        />



        {/* MATCHDAY 2 */}
        <MatchdaySection
          number={2}
          date="September 23, 2026"
          matches={getMatchdayFromDatabase(2)}
        />

        {/* MATCHDAY 3 */}
        <MatchdaySection
          number={3}
          date="October 7, 2026"
          matches={getMatchdayFromDatabase(3)}
        />

        <MatchdaySection
          number={4}
          date="October 14, 2026"
          matches={getMatchdayFromDatabase(4)}
        />

        <MatchdaySection
          number={5}
          date="October 21, 2026"
          matches={getMatchdayFromDatabase(5)}
        />

        <MatchdaySection
          number={6}
          date="October 28, 2026"
          matches={getMatchdayFromDatabase(6)}
        />

        {/* MATCHDAY 7 */}
        <MatchdaySection
          number={7}
          date="November 4, 2026"
          matches={getMatchdayFromDatabase(7)}
        />

        {/* MATCHDAY 8 */}
        <MatchdaySection
          number={8}
          date="November 11, 2026"
          matches={getMatchdayFromDatabase(8)}
        />

        {/* MATCHDAY 9 */}
        <MatchdaySection
          number={9}
          date="November 18, 2026"
          matches={getMatchdayFromDatabase(9)}
        />

        {/* MATCHDAY 10 */}
        <MatchdaySection
          number={10}
          date="November 25, 2026"
          matches={getMatchdayFromDatabase(10)}
        />

        {/* MATCHDAY 11 */}
        <MatchdaySection
          number={11}
          date="December 2, 2026"
          matches={getMatchdayFromDatabase(11)}
        />

        {/* MATCHDAY 12 */}
        <MatchdaySection
          number={12}
          date="December 9, 2026"
          matches={getMatchdayFromDatabase(12)}
        />


        {/* MATCHDAY 13 */}
        <MatchdaySection
          number={13}
          date="December 16, 2026"
          matches={getMatchdayFromDatabase(13)}
        />

        {/* MATCHDAY 14 */}
        <MatchdaySection
          number={14}
          date="January 6, 2027"
          matches={getMatchdayFromDatabase(14)}
        />

        {/* MATCHDAY 15 */}
        <MatchdaySection
          number={15}
          date="January 13, 2027"
          matches={getMatchdayFromDatabase(15)}
        />



      </div>

    </section>
    
  );
}

