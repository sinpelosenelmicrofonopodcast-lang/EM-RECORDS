import { ActiveTrackedLink } from "@/components/shared/active-tracked-link";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { EmLogo } from "@/components/shared/em-logo";
import { TrackedLink } from "@/components/shared/tracked-link";
import { getSiteLanguage } from "@/lib/i18n/server";

export async function SiteHeaderV2(){
  const lang=await getSiteLanguage();
  const nav=[
    {href:"/collaborations",label:lang==="es"?"Colaboraciones":"Collaborations"},
    {href:"/artists",label:lang==="es"?"Artistas":"Artists"},
    {href:"/music",label:lang==="es"?"Música":"Music"},
    {href:"/beats",label:"Beats"},
    {href:"/services",label:lang==="es"?"Servicios":"Services"},
    {href:"/publishing",label:"Publishing"},
    {href:"/about",label:lang==="es"?"Nosotros":"About"}
  ];
  return <header className="sticky top-0 z-50 border-b border-white/8 bg-black/90 backdrop-blur-xl">
    <div className="mx-auto flex w-full max-w-[92rem] items-center justify-between gap-5 px-5 py-4 md:px-10">
      <TrackedLink href="/" eventName="nav_click" metadata={{target:"home_logo"}} className="flex w-[118px] items-center justify-center"><EmLogo className="opacity-95" alt="EM Records"/></TrackedLink>
      <nav className="hidden items-center gap-7 lg:flex">{nav.map(i=><ActiveTrackedLink key={i.href} href={i.href} eventName="nav_click" metadata={{target:i.href}} className="text-[11px] uppercase tracking-[0.2em] transition" activeClassName="text-gold" inactiveClassName="text-white/58 hover:text-white">{i.label}</ActiveTrackedLink>)}</nav>
      <div className="flex items-center gap-2"><LanguageToggle lang={lang}/><TrackedLink href="/artist/login" eventName="nav_click" metadata={{target:"/artist/login"}} className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/62 transition hover:border-gold/50 hover:text-gold">{lang==="es"?"Portal artista":"Artist portal"}</TrackedLink></div>
    </div>
    <div className="border-t border-white/6 lg:hidden"><nav className="mx-auto flex w-full max-w-[92rem] gap-1 overflow-x-auto px-5 py-2.5 [scrollbar-width:none]">{nav.map(i=><ActiveTrackedLink key={i.href} href={i.href} eventName="nav_click" metadata={{target:i.href,source:"mobile_header"}} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition" activeClassName="bg-gold/12 text-gold" inactiveClassName="text-white/55 hover:text-white">{i.label}</ActiveTrackedLink>)}</nav></div>
  </header>;
}
