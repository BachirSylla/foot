import { StoreProvider } from "@/lib/store";
import { MatchDetail } from "@/components/MatchDetail";

/**
 * Page d'un match. C'est l'URL partagée par le QR : le store est scopé sur cet
 * id, donc deux matchs ouverts en parallèle ne partagent ni réponses ni compo.
 */
export default function MatchPage({ params }: { params: { id: string } }) {
  return (
    <StoreProvider matchId={params.id}>
      <MatchDetail />
    </StoreProvider>
  );
}
