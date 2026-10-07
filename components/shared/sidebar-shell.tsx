import type { ReactNode } from "react";
import Link from "next/link";
import { ActiveNavLink } from "@/components/shared/active-nav-link";
import { EmLogo } from "@/components/shared/em-logo";

type SidebarNavItem={href:string;label:string;exact?:boolean;group?:string};
type SidebarFormAction=(()=>void|Promise<void>)|((formData:FormData)=>void|Promise<void>);
type Props={title:string;navItems:SidebarNavItem[];children:ReactNode;sidebarWidthClass?:string;action?:{label:string;formAction:SidebarFormAction}};

export function SidebarShell({title,navItems,children,sidebarWidthClass="md:grid-cols-[238px_1fr]",action}:Props){
  let lastGroup="";
  return <div className={`app-shell grid gap-6 ${sidebarWidthClass}`}>
    <aside className="admin-rail h-fit rounded-[28px] p-4 md:sticky md:top-24 md:p-5">
      <Link href="/" className="mb-5 flex w-[126px] items-center justify-center"><EmLogo alt="EM Records"/></Link>
      <div className="border-b border-white/10 pb-4"><p className="text-[10px] uppercase tracking-[0.28em] text-gold">{title}</p><p className="mt-2 text-sm text-white/48">Operate the label from signal to action.</p></div>
      <nav className="mt-4 space-y-1">{navItems.map(item=>{const show=Boolean(item.group&&item.group!==lastGroup);if(item.group)lastGroup=item.group;return <div key={item.href}>{show?<p className="mb-1 mt-5 px-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/32">{item.group}</p>:null}<ActiveNavLink href={item.href} exact={item.exact} className="block rounded-xl px-3 py-2.5 text-sm transition" activeClassName="bg-white/[0.08] text-white shadow-[inset_2px_0_0_#c6a85b]" inactiveClassName="text-white/62 hover:bg-white/[0.035] hover:text-white">{item.label}</ActiveNavLink></div>})}</nav>
      {action?<form action={action.formAction} className="mt-6 border-t border-white/10 pt-4"><button type="submit" className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/60 transition hover:border-gold/60 hover:text-gold">{action.label}</button></form>:null}
    </aside>
    <section className="min-w-0 space-y-6">{children}</section>
  </div>;
}