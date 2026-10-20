"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ArrowRight, LoaderCircle } from "lucide-react";

export function BeatVaultLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/beat-vault/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo verificar la clave.");
        return;
      }
      setCode("");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-gold/30 bg-black/80 p-7 shadow-2xl md:p-10">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
        <LockKeyhole size={26} />
      </div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-gold">Private Listening · By Invitation Only</p>
      <h1 className="font-display text-3xl font-bold uppercase text-white md:text-4xl">Beat Vault</h1>
      <p className="mt-4 text-sm leading-7 text-white/65">
        Escucha los beats completos de EM Records. Esta área está reservada para personas que recibieron una clave privada.
      </p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <label htmlFor="vault-key" className="block text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Clave de acceso</label>
        <input
          id="vault-key"
          type="password"
          autoComplete="off"
          required
          minLength={8}
          maxLength={120}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Introduce tu clave privada"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-white outline-none transition focus:border-gold"
        />
        {error ? <p role="alert" className="text-sm text-red-300">{error}</p> : null}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 font-semibold uppercase tracking-[0.16em] text-black transition hover:brightness-110 disabled:opacity-60">
          {loading ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          {loading ? "Verificando..." : "Entrar al catálogo privado"}
        </button>
      </form>
      <p className="mt-6 text-xs text-white/40">Acceso personal. No compartas la clave ni las grabaciones.</p>
    </div>
  );
}
