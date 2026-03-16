import type { ReactNode } from "react";
import Link from "next/link";
import { ActiveNavLink } from "@/components/shared/active-nav-link";
import { EmLogo } from "@/components/shared/em-logo";

type SidebarNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

type SidebarFormAction = (() => void | Promise<void>) | ((formData: FormData) => void | Promise<void>);

type SidebarShellProps = {
  title: string;
  navItems: SidebarNavItem[];
  children: ReactNode;
  sidebarWidthClass?: string;
  action?: {
    label: string;
    formAction: SidebarFormAction;
  };
};

export function SidebarShell({ title, navItems, children, sidebarWidthClass = "md:grid-cols-[220px_1fr]", action }: SidebarShellProps) {
  return (
    <div className={`app-shell grid gap-6 ${sidebarWidthClass}`}>
      <aside className="app-panel h-fit rounded-[28px] p-4 md:sticky md:top-24 md:p-5">
        <Link href="/" className="mb-5 flex w-[130px] items-center justify-center">
          <EmLogo alt="EM Records" />
        </Link>
        <div className="border-b border-white/10 pb-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-gold">{title}</p>
          <p className="mt-2 text-sm text-white/50">Navigation and controls for this workspace.</p>
        </div>
        <nav className="mt-4 space-y-1.5">
          {navItems.map((item) => (
            <ActiveNavLink
              key={item.href}
              href={item.href}
              exact={item.exact}
              className="block rounded-2xl px-3 py-2.5 text-sm transition"
              activeClassName="border border-gold/35 bg-gold/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              inactiveClassName="border border-transparent text-white/72 hover:border-white/12 hover:bg-white/[0.03] hover:text-white"
            >
              {item.label}
            </ActiveNavLink>
          ))}
        </nav>

        {action ? (
          <form action={action.formAction} className="mt-5 border-t border-white/10 pt-4">
            <button
              type="submit"
              className="w-full rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-gold hover:text-gold"
            >
              {action.label}
            </button>
          </form>
        ) : null}
      </aside>

      <section className="space-y-6">{children}</section>
    </div>
  );
}
