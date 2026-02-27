import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-14 md:grid-cols-3 md:px-10">
        <div>
          <div className="w-[220px]">
            <EmLogo alt="EM Records LLC" />
          </div>
          <p className="mt-3 max-w-sm text-sm text-white/60">
            Dark modern latin urban label with international vision. Powered by culture, discipline and execution.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Social</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-gold">
              Instagram
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-gold">
              YouTube
            </a>
            <a href="https://open.spotify.com" target="_blank" rel="noreferrer" className="hover:text-gold">
              Spotify
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Legal</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            <Link href="/legal" className="hover:text-gold">
              Terms, Privacy, Copyright, DMCA
            </Link>
            <Link href="/licensing" className="hover:text-gold">
              Licensing
            </Link>
            <Link href="/publishing" className="hover:text-gold">
              Publishing by DGM Music
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs uppercase tracking-[0.16em] text-white/50">
        Copyright {new Date().getFullYear()} EM Records LLC. All rights reserved.
      </div>
    </footer>
  );
}
