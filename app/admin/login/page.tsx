import Link from "next/link";
import { EmLogo } from "@/components/shared/em-logo";
import { signInAdminAction } from "@/lib/actions/admin";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error;

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md items-center px-6 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-7">
        <div className="w-[170px]">
          <EmLogo alt="EM Records admin" />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-gold">EM Records</p>
        <h1 className="mt-4 font-display text-4xl text-white">Admin Login</h1>
        <p className="mt-2 text-sm text-white/60">Secure access to artists, releases, events and submissions.</p>

        <form action={signInAdminAction} className="mt-6 space-y-3">
          <input
            type="email"
            name="email"
            required
            placeholder="admin@emrecords.com"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <input
            type="password"
            name="password"
            required
            placeholder="Password"
            className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none focus:border-gold"
          />
          <button type="submit" className="w-full rounded-full border border-gold bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black">
            Enter Dashboard
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-red-300">{decodeURIComponent(error)}</p> : null}

        <Link href="/" className="mt-6 inline-block text-xs uppercase tracking-[0.16em] text-white/45 hover:text-gold">
          Back to Website
        </Link>
      </div>
    </div>
  );
}
