import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-gold">404</p>
      <h1 className="mt-4 font-display text-5xl text-white">Not found</h1>
      <p className="mt-3 text-sm text-white/65">This page does not exist in the EM ecosystem.</p>
      <Link href="/" className="mt-8 rounded-full border border-gold px-6 py-3 text-xs uppercase tracking-[0.2em] text-gold">
        Back Home
      </Link>
    </div>
  );
}
