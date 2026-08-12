import { Header } from "@/components/Header";
import { MatchList } from "@/components/MatchList";

/** Accueil : la liste de tous les matchs. Chaque match a sa page /m/[id]. */
export default function Page() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
      <Header />
      <main className="mt-6 flex-1">
        <MatchList />
      </main>
    </div>
  );
}
