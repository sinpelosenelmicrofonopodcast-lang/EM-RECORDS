# EM Records Collaborations

## Published surfaces

- `/collaborations`: campaign, published rules, verified accounts, submissions, voting and each artist's agreements.
- `/admin/collaborations`: campaign settings, catalog eligibility, private player, rights review, browser preview cropping, ranking, agreements, production checklist and audit.
- `/admin/demos`: existing general demos now use short-lived signed playback.

## Deal

50% EM/RBELD side and 50% artist side for the final master ownership and distribution income during the legal copyright term, with applicable nonwaivable legal rights. No recoupment of the offered contributions. Each side's individual recipients must be named; a side is not a single person automatically. Publishing is separately documented with authors, rights and mandates. 50/50 composition requires all relevant holders' agreement, including external-beat licensors. DGM does not automatically acquire the artist's publishing.

The contract generator is a working template, not a representation that an attorney reviewed it. Organizer, territory eligibility, promotional deliverables, applicable law, costs, delivery/release deadlines and all holders' signatures must be completed. Artist electronic acceptance records verified account, legal name, timestamp, exact text SHA-256 and revision. A PDF with every necessary signature and an admin verification are additionally required for production. No paid signature provider is installed.

The initial Romance Urbano campaign is a draft. Publishing the website does not open submissions or voting. Admin must complete the factual fields and review the rules. The opening gate must not be checked without actual review. Campaign conditions lock when opened. Five eligible highest-vote songs win; boundary ties need documented published criteria; two reserves are optional. Votes represent verified accounts, not proof of unique humans. Suspicious activity needs manual review before selection.

## Storage and costs

Same existing Supabase/Vercel project; no subscriptions, upgrades, email services, AI calls or cron jobs were added. Existing storage measured 791,371,406 bytes on implementation. New module has a conservative 100 MiB upload allocation; reservations serialize and stop if total stored+reserved size would exceed 900 MiB. This does not cap egress, account-wide usage by other modules or provider charges. Admin must still monitor existing account usage. Per-demo 5 MiB MP3; rights PDFs 2 MiB; canonical 22.05k mono PCM previews 10–30 sec. Raw file bytes upload directly to Supabase with a scoped token. API finalization verifies file size and type once. Playback redirects directly to Storage using short-lived signed URLs. Public endpoints never expose full demo pointers or private records.

Signed upload tokens expire; artist can resume an incomplete original upload. New uploads are bounded to 12 per submission. Preview creation runs in the browser, peak-normalizes the fragment and builds a new WAV. Server validates canonical WAV header, byte length and duration before approving it. Audio peak normalization is not identical perceived loudness.

Preview access stops 90 days after voting closes. Admin retention cleanup removes audio/documents of nonselected records after 90 days, excluding signed or legal-hold records. No background cleanup job was added. The admin must perform this retention action; selected records and consent/audit evidence are retained for contract operations.

## Security

All six tables use RLS, no anon/authenticated grants and no direct user policies. The service role is server-only; each HTTP mutation checks authentication, role/ownership and same origin. RPCs are security-invoker and callable only by service_role. No admin role uses user-editable metadata. Public API lists only curated fields. The advisor's RLS/no-policy notices are intentional deny-by-default, not missing user access grants.

## Distribution and registrations

No audio is uploaded to DistroKid automatically. Admin tracks correct RBELD/performer credits, ISRC, accepted individual Splits and distribution completion. Actual accounts and subscription limits still apply. Each administrator registers only authorized publishing shares, with identical coauthor data. No second publishing administrator was connected. Confirm distributor acceptance of the project's genuine artist credits before the first release.

## Verification

`node scripts/collaborations-check.mjs`: preview boundary/file format and campaign/contract checks.
`scripts/collaborations-db-check.sql`: transactional test of voting and selection; all fixture rows rolled back.
`npm run typecheck` and `npm run build`.
