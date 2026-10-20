"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, LockKeyhole, PlusCircle, ShieldOff } from "lucide-react";

type VaultKey = {
  id: string;
  label: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export function BeatVaultManager({ initialKeys, availableBeats, totalBeats }: { initialKeys: VaultKey[]; availableBeats: number; totalBeats: number }) {
  const [keys, setKeys] = useState(initialKeys);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(30);
  const [newCode, setNewCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNewCode("");
    try {
      const res = await fetch("/api/admin/beat-vault/keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", label, days })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudo crear la clave.");
      setKeys((previous) => [payload.key, ...previous]);
      setNewCode(payload.code);
      setLabel("");
      setCopied(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("¿Revocar esta clave y desconectar inmediatamente a todas las personas que la usan?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/beat-vault/keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id })
      });
      if (!res.ok) throw new Error("No se pudo revocar la clave.");
      setKeys((previous) => previous.map((item) => item.id === id ? { ...item, is_active: false } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ocurrió un error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">EM Records · Private Listening</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">Beat Vault · Admin</h1>
          <p className="mt-2 text-sm text-white/60">Controla las invitaciones para escuchar los beats completos sin abrir el almacenamiento público.</p>
        </div>
        <Link href="/beat-vault" target="_blank" className="rounded-full border border-gold/50 px-5 py-2 text-xs uppercase tracking-widest text-gold">Abrir portal</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="metric-card rounded-2xl p-5"><p className="text-xs uppercase tracking-widest text-white/55">Beats del catálogo</p><p className="mt-2 text-3xl font-semibold">{totalBeats}</p></div>
        <div className="metric-card rounded-2xl p-5"><p className="text-xs uppercase tracking-widest text-white/55">Audio privado disponible</p><p className="mt-2 text-3xl font-semibold">{availableBeats}</p></div>
        <div className="metric-card rounded-2xl p-5"><p className="text-xs uppercase tracking-widest text-white/55">Claves activas</p><p className="mt-2 text-3xl font-semibold">{keys.filter((item) => item.is_active && (!item.expires_at || Date.parse(item.expires_at) > Date.now())).length}</p></div>
      </div>
      <section className="rounded-2xl border border-gold/25 bg-gold/5 p-6">
        <div className="flex items-center gap-2 text-gold"><PlusCircle size={19} /><h2 className="font-display text-xl font-semibold">Crear acceso privado</h2></div>
        <p className="mt-2 text-sm text-white/60">Cada clave es individualmente revocable. El código solo se muestra una vez al crearlo.</p>
        <form onSubmit={create} className="mt-5 flex flex-col gap-3 lg:flex-row">
          <input required maxLength={80} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre del invitado o grupo" aria-label="Nombre del invitado" className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-white outline-none focus:border-gold" />
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Vencimiento" className="rounded-xl border border-white/20 bg-black px-4 py-3 text-white">
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
            <option value={0}>Sin vencimiento</option>
          </select>
          <button disabled={busy} type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 font-semibold text-black disabled:opacity-60"><KeyRound size={17} /> Generar clave</button>
        </form>
        {newCode ? (
          <div className="mt-5 rounded-xl border border-gold/40 bg-black/70 p-4">
            <p className="text-xs uppercase tracking-widest text-gold">Copia y comparte esta clave ahora</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <code className="break-all text-base font-semibold text-white">{newCode}</code>
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(newCode); setCopied(true); }} className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-xs text-white">
                {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copiada" : "Copiar clave"}
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50">URL para invitados: /beat-vault. La clave no volverá a mostrarse en este panel.</p>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      </section>
      <section className="overflow-hidden rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 border-b border-white/10 p-5"><LockKeyhole size={19} className="text-gold" /><h2 className="font-display text-xl font-semibold">Invitaciones emitidas</h2></div>
        {keys.length === 0 ? <p className="p-6 text-sm text-white/50">Todavía no hay claves. Genera la primera arriba.</p> : null}
        {keys.map((key) => {
          const active = key.is_active && (!key.expires_at || Date.parse(key.expires_at) > Date.now());
          return (
            <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5 last:border-0">
              <div><p className="font-medium text-white">{key.label}</p><p className="mt-1 text-xs text-white/50">Creada: {new Date(key.created_at).toLocaleDateString("es-US")} · {key.expires_at ? "Vence: " + new Date(key.expires_at).toLocaleDateString("es-US") : "Sin vencimiento"}</p></div>
              <div className="flex items-center gap-3">
                <span className={"text-xs font-medium " + (active ? "text-gold" : "text-white/40")}>{active ? "Activa" : "Inactiva"}</span>
                {active ? <button disabled={busy} onClick={() => revoke(key.id)} className="flex items-center gap-1 rounded-full border border-red-400/40 px-3 py-2 text-xs text-red-200 disabled:opacity-40"><ShieldOff size={14} /> Revocar</button> : null}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
