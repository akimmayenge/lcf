import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

import SiteNavbar from
  "./components/SiteNavbar";


const geistSans = Geist({
  variable:
    "--font-geist-sans",

  subsets: [
    "latin",
  ],
});


const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",

    subsets: [
      "latin",
    ],
  });


export const metadata:
  Metadata = {

  title:
    "Ligue Competitive Futsal | LCF",

  description:
    "Official website of Ligue Competitive Futsal. Matches, standings, players, statistics and Copa LCF.",

};


export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {

  return (

    <html
      lang="en"
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        h-full
        antialiased
      `}
    >

      <body className="min-h-full bg-[#030707] pb-20 md:pb-0">

        <SiteNavbar />

        {children}

      </body>

    </html>

  );
}