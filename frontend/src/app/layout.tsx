import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/providers/SolanaWalletProvider";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://txpulse.vercel.app"),
  title: "TxPulse | Watch and Decode Solana Transactions",
  description:
    "Watch Solana transaction health in real time and decode failed signatures in plain English with next-step fixes.",
  icons: {
    icon: "/txpulse.png",
    shortcut: "/txpulse.png",
    apple: "/txpulse.png",
  },
  openGraph: {
    title: "TxPulse | Watch and Decode Solana Transactions",
    description:
      "Watch Solana transaction health in real time and decode failed signatures in plain English with next-step fixes.",
    images: ["/txpulse.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TxPulse | Watch and Decode Solana Transactions",
    description:
      "Watch Solana transaction health in real time and decode failed signatures in plain English with next-step fixes.",
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
      <body className="min-h-full flex flex-col bg-black text-white">
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
