"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Disc3, Headphones, LockKeyhole, LogOut, Play, Search, SlidersHorizontal } from "lucide-react";

export type PrivateBeat = {
  id: string;
  title: string;
  genre: string;
  bpm: number | null;
  musicalKey: string | null;
  coverUrl: string | null;
  available: boolean;
};

export function BeatVaultPlayer({ beats, label }: { beats: PrivateBeat[]; label: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("Todos");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const genres = useMemo(() => ["Todos", ...Array.from(new Set(beats.map((beat) => beat.genre).filter(Boolean))).sort()], [beats]);
  const filtered = useMemo(() => beats.filter((beat) => (
    (genre === "Todos" || beat.genre === genre)
      && [beat.title, beat.genre, beat.musicalKey || "", String(beat.bpm || "")].join(" ").toLowerCase().includes(search.toLowerCase())
  )), [beats, genre, search]);
  const active = beats.find((beat) => beat.id === activeId) ?? null;

  async function exitVault() {
    setBusy(true);
    try {
      await fetch("/api/beat-vault/logout", { method: "POST", credentials: "same-origin" });
      setActiveId(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-12 md:px-10 md:pt-20">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-gold"><LockKeyhole size={15} /> Access Granted · {label}</p>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white md:text-6xl">Private Beat Vault</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">El catálogo completo, sin cortes de preview. Uso exclusivo para escuchar y evaluar. Los derechos y licencias permanecen con sus titulares.</p>
        </div>
        <button disabled={busy} onClick={exitVault} className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition hover:border-gold hover:text-gold">
          <LogOut size={14} /> Salir
        </button>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gold/20 bg-gold/5 p-5"><Disc3 className="text-gold" size={20} /><p className="mt-3 text-3xl font-bold">{beats.length}</p><p className="text-xs uppercase tracking-wider text-white/50">Beats del catálogo</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><Headphones className="text-gold" size={20} /><p className="mt-3 text-3xl font-bold">{beats.filter((item) => item.available).length}</p><p className="text-xs uppercase tracking-wider text-white/50">Audios completos</p></div>
        <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:col-span-1"><LockKeyhole className="text-gold" size={20} /><p className="mt-3 text-lg font-semibold">Solo invitados</p><p className="text-xs uppercase tracking-wider text-white/50">Escucha privada</p></div>
      </div>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-white/15 bg-white/[0.03] px-4">
          <Search size={18} className="text-white/40" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar beat, BPM o tonalidad" aria-label="Buscar beats" className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4">
          <SlidersHorizontal size={17} className="text-gold" />
          <select aria-label="Filtrar por género" value={genre} onChange={(event) => setGenre(event.target.value)} className="h-12 min-w-40 bg-transparent text-sm text-white outline-none [&>option]:bg-black">
            {genres.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-5 text-xs uppercase tracking-widest text-white/45">{filtered.length} resultados</p>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
        {filtered.map((beat, index) => (
          <div key={beat.id} className={"flex items-center gap-4 border-b border-white/10 p-4 transition last:border-0 md:px-6 " + (activeId === beat.id ? "bg-gold/10" : "hover:bg-white/[0.03]")}>
            <span className="hidden w-6 text-center text-xs text-white/35 sm:block">{index + 1}</span>
            {beat.coverUrl ? <img src={beat.coverUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5"><Disc3 size={22} className="text-gold" /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white md:text-base">{beat.title}</p>
              <p className="mt-1 truncate text-xs text-white/50">{beat.genre || "EM Records"} · {beat.bpm ? beat.bpm + " BPM" : "BPM N/D"} · {beat.musicalKey || "Tonalidad N/D"}</p>
            </div>
            <button onClick={() => setActiveId(beat.id)} disabled={!beat.available} className="flex shrink-0 items-center gap-2 rounded-full border border-gold/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30">
              <Play size={14} /> <span className="hidden sm:inline">{!beat.available ? "No disponible" : activeId === beat.id ? "Seleccionado" : "Escuchar"}</span>
            </button>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-white/50">No se encontraron beats con esos filtros.</div>}
      </div>
      {active && active.available ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/30 bg-[#0d0d0e]/95 px-5 py-4 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 md:flex-row">
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Now Playing · Full Beat</p>
              <p className="truncate text-sm font-semibold text-white">{active.title}</p>
            </div>
            <audio key={active.id} controls controlsList="nodownload noplaybackrate" preload="metadata" autoPlay src={"/api/beat-vault/track/" + active.id} className="w-full max-w-xl" aria-label={"Reproduciendo " + active.title} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
