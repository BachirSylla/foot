"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type Confirm = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Confirmation maison, aux couleurs de l'app (le `window.confirm` du navigateur
 * cassait l'ambiance dark néon et n'est pas stylable). API par promesse :
 *
 *   if (!(await confirm({ message: "…", tone: "danger" }))) return;
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; opts: ConfirmOptions | null }>({
    open: false,
    opts: null,
  });
  // Le `resolve` vit dans une ref, jamais dans le state : React peut rejouer un
  // updater (StrictMode), et une promesse ne doit être tranchée qu'une fois.
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<Confirm>((opts) => {
    return new Promise<boolean>((resolve) => {
      // Une seule modale à la fois : si une demande traînait, elle est annulée.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ open: true, opts });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState((s) => ({ ...s, open: false }));
    resolve?.(ok);
  }, []);

  // Échap = Annuler, comme une boîte de dialogue native.
  useEffect(() => {
    if (!state.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.open, close]);

  // Le bouton de confirmation prend le focus : Entrée valide, Échap annule.
  useEffect(() => {
    if (state.open) confirmButtonRef.current?.focus();
  }, [state.open]);

  const opts = state.opts;
  const danger = opts?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <AnimatePresence>
        {state.open && opts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => close(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 px-4 backdrop-blur"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
              className="card w-full max-w-sm p-5"
            >
              <h2 id="confirm-title" className="font-display text-lg font-bold">
                {opts.title ?? "Confirmer"}
              </h2>
              <p className="mt-1.5 text-sm text-muted">{opts.message}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => close(false)} className="btn-ghost py-3">
                  {opts.cancelLabel ?? "Annuler"}
                </button>
                <button
                  ref={confirmButtonRef}
                  onClick={() => close(true)}
                  className={`${danger ? "btn-danger" : "btn-primary"} py-3`}
                >
                  {opts.confirmLabel ?? "Confirmer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>");
  return ctx;
}
