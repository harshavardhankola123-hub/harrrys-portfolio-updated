import type { Metadata } from "next";
import { Space_Grotesk, Instrument_Serif, JetBrains_Mono, Reggae_One } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Manga-title face for the envelope name — covers both Latin and Japanese glyphs
const reggaeOne = Reggae_One({
  variable: "--font-reggae-one",
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Kola Harshavardhan — Design Engineer / Motion Systems",
  description: "Portfolio of Kola Harshavardhan — design engineer building adaptive learning systems, generative AI interfaces, and kinetic editorial experiences.",
  authors: [{ name: "Kola Harshavardhan" }],
  openGraph: {
    title: "Kola Harshavardhan — Design Engineer",
    description: "Adaptive learning systems, AI interfaces, kinetic editorial experiences.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Kola Harshavardhan — Design Engineer",
    description: "Adaptive learning systems, AI interfaces, kinetic editorial experiences.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${reggaeOne.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
