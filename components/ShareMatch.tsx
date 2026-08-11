"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Carte de partage du match : QR à scanner sur place + lien à envoyer sur WhatsApp.
 * Le lien ouvre l'app, où le joueur rejoint sans mot de passe (auth anonyme).
 */
export function ShareMatch() {
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent("⚽ Match du vendredi ! Dis si tu joues : " + shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold">Inviter les joueurs</h2>
      <p className="text-sm text-muted">
        Ils scannent (ou cliquent), entrent leur nom, et répondent. Aucun mot de passe.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {/* Fond clair derrière le QR : indispensable pour qu'il reste scannable. */}
        <div className="shrink-0 rounded-2xl bg-slate-100 p-3">
          {shareUrl ? (
            <QRCodeSVG value={shareUrl} size={160} bgColor="#0E141B" fgColor="#A3E635" />
          ) : (
            <div className="h-40 w-40" />
          )}
        </div>

        <div className="w-full space-y-2.5">
          <p className="break-all rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-[12px] text-muted">
            {shareUrl}
          </p>
          <button onClick={copy} className="btn-ghost w-full py-3">
            {copied ? "✓ Lien copié" : "🔗 Copier le lien"}
          </button>
          <button onClick={shareWhatsApp} className="btn-primary w-full py-3">
            💬 Partager sur WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}
