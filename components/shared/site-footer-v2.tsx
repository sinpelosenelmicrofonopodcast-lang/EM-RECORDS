import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { getSiteLanguage } from "@/lib/i18n/server";
import { getSocialLinks } from "@/lib/queries";

export async function SiteFooterV2(){
  const lang=await getSiteLanguage();
  const social=await getSocialLinks();
  return <footer className="border-t border-white/8 bg-[#050505]">
    <div className="mx-auto grid w-full max-w-[92rem] gap-10 px-6 py-16 md:grid-cols-[1.35fr_.8fr_.8fr] md:px-10">
      <div><div className="flex w-[180px] items-center justify-center"><EmLogo alt="EM Records LLC"/></div><p className="mt-5 max-w-md text-sm leading-relaxed text-white/48">{lang==="es"?"Disquera, producción y publishing. Construimos música, artistas y propiedad intelectual con estrategia real.":"Label, production and publishing. We build music, artists and intellectual property with real strategy."}</p><p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-gold">Don't chase the wave. Create it.</p></div>
      <div><p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{lang==="es"?"Trabaja con EM":"Work with EM"}</p><div className="mt-4 flex flex-col gap-2.5 text-sm text-white/65"><Link href="/services">Services</Link><Link href="/beats">Beats</Link><Link href="/sync-licensing">Sync Licensing</Link><Link href="/join">{lang==="es"?"Enviar música":"Submit Music"}</Link><Link href="/artist/login">{lang==="es"?"Portal del artista":"Artist Portal"}</Link></div></div>
      <div><p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{lang==="es"?"Explora":"Explore"}</p><div className="mt-4 flex flex-col gap-2.5 text-sm text-white/65"><Link href="/artists">Artists</Link><Link href="/music">Music</Link><Link href="/publishing">Publishing</Link><Link href="/press">Press</Link><Link href="/about">About</Link><Link href="/legal">Legal</Link></div>{social.length?<div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gold/75">{social.map(x=><a key={x.id} href={x.url} target="_blank" rel="noreferrer">{x.label}</a>)}</div>:null}</div>
    </div>
    <div className="border-t border-white/8 px-6 py-5 text-center text-[10px] uppercase tracking-[0.16em] text-white/30">© {new Date().getFullYear()} EM Records LLC · Publishing by DGM Music</div>
  </footer>;
}
