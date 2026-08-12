import { Header } from "@/components/Header";
import { Standings } from "@/components/Standings";

/** Classement interne, agrégé sur tous les matchs terminés. */
export default function ClassementPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      <Header />

      <main className="mt-6 flex-1">
        <Standings />
      </main>
    </div>
  );
}
