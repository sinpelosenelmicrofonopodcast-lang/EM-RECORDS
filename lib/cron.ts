export function isCronAuthorized(request: Request): boolean {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader) return true;

  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return authHeader === `Bearer ${secret}`;
}

