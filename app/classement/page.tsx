import Link from "next/link";
import { Header } from "@/components/Header";
import { Standings } from "@/components/Standings";
import { TopScorers } from "@/components/TopScorers";

/**
 * Classement interne, agrégé sur tous les matchs terminés — et, en dessous, le
 * classement séparé des meilleurs buteurs (les buts ne donnent aucun point).
 */
export default function ClassementPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      <Header />

      <Link
        href="/"
        className="mt-5 inline-flex w-fit items-center gap-1.5 text-[13px] text-muted transition hover:text-slate-200"
      >
        ← Tous les matchs
      </Link>

      <main className="mt-3 flex-1 space-y-8">
        <Standings />
        <TopScorers />
      </main>
    </div>
  );
}
