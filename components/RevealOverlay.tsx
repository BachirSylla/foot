"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { DEMO_PLAYERS } from "@/lib/mock";
import { TeamsBoard } from "./TeamsBoard";

export function RevealOverlay() {
  const { revealing, result, availablePlayers, actions } = useStore();
  const [phase, setPhase] = useState<"suspense" | "reveal">("suspense");
  const [flashName, setFlashName] = useState("");

  const open = revealing && !!result;

  // Défilement de noms pendant le suspense.
  useEffect(() => {
    if (!open || phase !== "suspense") return;
    const pool = availablePlayers.length ? availablePlayers : DEMO_PLAYERS;
    const id = setInterval(() => {
      setFlashName(pool[Math.floor(Math.random() * pool.length)].name);
    }, 90);
    return () => clearInterval(id);
  }, [open, phase, availablePlayers]);

  // Séquence : suspense -> reveal.
  useEffect(() => {
    if (!open) {
      setPhase("suspense");
      return;
    }
    setPhase("suspense");
    const t = setTimeout(() => setPhase("reveal"), 1900);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 px-4 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {phase === "suspense" ? (
                <motion.div
                  key="suspense"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative grid h-24 w-24 place-items-center">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-lime/20 border-t-lime" />
                    <span className="text-4xl">⚽</span>
                  </div>
                  <h2 className="mt-6 font-display text-2xl font-bold">Composition en cours…</h2>
                  <p className="mt-1 text-sm text-muted">L'algorithme équilibre les deux équipes</p>
                  <div className="mt-5 h-7">
                    <motion.span
                      key={flashName}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display text-lg font-semibold text-lime"
                    >
                      {flashName}
                    </motion.span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="reveal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full"
                >
                  <motion.h2
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 text-center font-display text-2xl font-bold"
                  >
                    Voici les équipes ! 🎉
                  </motion.h2>

                  {result && <TeamsBoard result={result} animate />}

                  <div className="mt-5 flex justify-center gap-3">
                    <button onClick={() => actions.endReveal()} className="btn-ghost px-6 py-3">
                      Fermer
                    </button>
                    <button onClick={() => actions.publish()} className="btn-primary px-6 py-3">
                      🔒 Publier
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
