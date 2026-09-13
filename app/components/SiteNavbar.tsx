"use client";

import {
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";
import {
  usePathname,
} from "next/navigation";


const navigation = [
  {
    name: "Home",
    href: "/",
  },
  {
    name: "Matches",
    href: "/matches",
  },
  {
    name: "Standings",
    href: "/standings",
  },
  {
    name: "Players",
    href: "/players",
  },
];


export default function SiteNavbar() {

  const pathname =
    usePathname();

  const [menuOpen, setMenuOpen] =
    useState(false);


  // --------------------------------
  // CHECK ACTIVE PAGE
  // --------------------------------

  function isActive(
    href: string
  ) {

    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(
      href
    );
  }


  return (
    <>

      {/* ================================= */}
      {/* MAIN NAVBAR */}
      {/* ================================= */}

      <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black">

        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">


          {/* LOGO */}

          <Link
            href="/"
            onClick={() =>
              setMenuOpen(false)
            }
            className="flex items-center gap-3"
          >

            <Image
              src="/lcf-logo.png"
              alt="LCF Logo"
              width={42}
              height={42}
              priority
              className="h-10 w-10 object-contain"
            />

            <span className="text-xl font-black tracking-[0.20em] text-[#00CCCD]">
              LCF
            </span>

          </Link>


          {/* ================================= */}
          {/* DESKTOP NAVIGATION */}
          {/* ================================= */}

          <div className="hidden items-center gap-8 md:flex">

            {navigation.map(
              (item) => {

                const active =
                  isActive(
                    item.href
                  );

                return (

                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      group
                      relative
                      py-2
                      text-sm
                      font-bold
                      transition
                      duration-200

                      ${
                        active
                          ? "text-[#00CCCD]"
                          : "text-white hover:text-[#00CCCD]"
                      }
                    `}
                  >

                    {item.name}


                    {/* ACTIVE LINE */}

                    <span
                      className={`
                        absolute
                        bottom-0
                        left-0
                        h-[2px]
                        bg-[#00CCCD]
                        transition-all
                        duration-300

                        ${
                          active
                            ? "w-full"
                            : "w-0 group-hover:w-full"
                        }
                      `}
                    />

                  </Link>

                );

              }
            )}

          </div>


          {/* ================================= */}
          {/* DESKTOP LOGIN */}
          {/* ================================= */}

          <Link
            href="/admin/login"
            className={`
              hidden
              rounded-full
              border
              px-5
              py-2
              text-sm
              font-black
              transition
              duration-300
              md:block

              ${
                pathname.startsWith(
                  "/admin"
                )
                  ? "border-[#00CCCD] bg-[#00CCCD] text-black"
                  : "border-[#00CCCD]/50 text-[#00CCCD] hover:bg-[#00CCCD] hover:text-black"
              }
            `}
          >
            Login
          </Link>


          {/* ================================= */}
          {/* MOBILE HAMBURGER */}
          {/* ================================= */}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={
              menuOpen
            }
            onClick={() =>
              setMenuOpen(
                !menuOpen
              )
            }
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              text-white
              transition
              hover:border-[#00CCCD]/60
              hover:text-[#00CCCD]
              md:hidden
            "
          >

            <div className="flex w-5 flex-col gap-[5px]">

              <span
                className={`
                  h-[2px]
                  w-full
                  bg-current
                  transition
                  duration-300

                  ${
                    menuOpen
                      ? "translate-y-[7px] rotate-45"
                      : ""
                  }
                `}
              />

              <span
                className={`
                  h-[2px]
                  w-full
                  bg-current
                  transition
                  duration-300

                  ${
                    menuOpen
                      ? "opacity-0"
                      : ""
                  }
                `}
              />

              <span
                className={`
                  h-[2px]
                  w-full
                  bg-current
                  transition
                  duration-300

                  ${
                    menuOpen
                      ? "-translate-y-[7px] -rotate-45"
                      : ""
                  }
                `}
              />

            </div>

          </button>

        </div>


        {/* ================================= */}
        {/* MOBILE MENU */}
        {/* ================================= */}

        <div
          className={`
            overflow-hidden
            border-t
            border-white/10
            bg-[#030707]
            transition-all
            duration-300
            md:hidden

            ${
              menuOpen
                ? "max-h-[430px] opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >

          <div className="space-y-2 px-4 py-5">

            {navigation.map(
              (item) => {

                const active =
                  isActive(
                    item.href
                  );

                return (

                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setMenuOpen(
                        false
                      )
                    }
                    className={`
                      flex
                      items-center
                      justify-between
                      rounded-xl
                      px-4
                      py-4
                      text-base
                      font-black
                      transition

                      ${
                        active
                          ? "bg-[#00CCCD]/10 text-[#00CCCD]"
                          : "text-white hover:bg-white/[0.05]"
                      }
                    `}
                  >

                    <span>
                      {item.name}
                    </span>


                    {active && (

                      <span className="h-2 w-2 rounded-full bg-[#00CCCD]" />

                    )}

                  </Link>

                );

              }
            )}


            {/* MOBILE LOGIN */}

            <div className="pt-3">

              <Link
                href="/admin/login"
                onClick={() =>
                  setMenuOpen(
                    false
                  )
                }
                className="
                  block
                  w-full
                  rounded-xl
                  border
                  border-[#00CCCD]/50
                  px-4
                  py-4
                  text-center
                  text-sm
                  font-black
                  text-[#00CCCD]
                  transition
                  hover:bg-[#00CCCD]
                  hover:text-black
                "
              >
                Login
              </Link>

            </div>

          </div>

        </div>

      </nav>


      {/* ================================= */}
      {/* TEAM LOGO STRIP */}
      {/* ================================= */}

      <div className="fixed left-0 top-[72px] z-40 w-full border-b border-gray-200 bg-white">

        <div
          className="
            mx-auto
            flex
            h-[64px]
            max-w-7xl
            items-center
            gap-8
            overflow-x-auto
            px-4
            sm:justify-between
            sm:gap-4
            sm:px-6
          "
        >

          <TeamLogo
            src="/LogoBlackLionGatineau.png"
            alt="Black Lion Gatineau"
          />

          <TeamLogo
            src="/LogoCIVSoccer.png"
            alt="CIV Soccer"
          />

          <TeamLogo
            src="/LogoCLSFA.jpeg"
            alt="CLSFA"
          />

          <TeamLogo
            src="/LogoDZPower.png"
            alt="DZ Power"
          />

          <TeamLogo
            src="/LogoFCButti.jpeg"
            alt="FC Butti"
          />

          <TeamLogo
            src="/LogoImpactFutsal.png"
            alt="Impact Futsal"
          />

          <TeamLogo
            src="/LogoMentalFC.png"
            alt="Mental FC"
          />

          <TeamLogo
            src="/LogoNovaMotion.png"
            alt="NovaMotion FC"
          />

          <TeamLogo
            src="/LogoSweeperBoyz.jpeg"
            alt="Sweeper Boyz"
          />

          <TeamLogo
            src="/LogoParceroFC.png"
            alt="Parcero FC"
          />

        </div>

      </div>

    </>
  );
}


// =================================
// TEAM LOGO
// =================================

function TeamLogo({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {

  return (

    <div className="flex min-w-[48px] items-center justify-center">

      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="
          h-9
          w-9
          object-contain
          transition
          duration-300
          hover:scale-110
          sm:h-10
          sm:w-10
        "
      />

    </div>

  );
}