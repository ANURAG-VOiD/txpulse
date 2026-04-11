import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TxPulse | Solana Transaction Monitor",
  description:
    "Monochrome Solana transaction health dashboard for confirmation latency, success rate, slot lag, and priority fee monitoring.",
  icons: {
    icon: "/txpulse.png",
    shortcut: "/txpulse.png",
    apple: "/txpulse.png",
  },
  openGraph: {
    title: "TxPulse | Solana Transaction Monitor",
    description:
      "Monochrome Solana transaction health dashboard for confirmation latency, success rate, slot lag, and priority fee monitoring.",
    images: ["/txpulse.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TxPulse | Solana Transaction Monitor",
    description:
      "Monochrome Solana transaction health dashboard for confirmation latency, success rate, slot lag, and priority fee monitoring.",
    images: ["/txpulse.png"],
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
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full bg-black antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">{children}</body>
    </html>
  );
}
