import type { Metadata, Viewport } from "next";
// Polices auto-hébergées (aucun appel réseau au build).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "TeamMix — Équipes équilibrées, sans favoritisme",
  description:
    "Déclare ta dispo et tes postes. L'appli génère deux équipes équilibrées pour le match du vendredi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TeamMix" },
};

export const viewport: Viewport = {
  themeColor: "#0A0E12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
        <PWARegister />
      </body>
    </html>
  );
}
