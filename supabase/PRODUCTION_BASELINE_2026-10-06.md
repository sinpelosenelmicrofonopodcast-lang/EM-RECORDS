# EM Records production database baseline — 2026-10-06

The live Supabase project is the schema source of truth from this baseline forward.

Managed migrations applied directly to project rzdnfbmjiignpanncovu:
- em_records_platform_hardening_central_texas
- em_records_security_followup
- artist_consent_guardian_fields

Do not replay the older repository migration folder blindly against production. Historical SQL predates the managed migration ledger and the current live schema.

From this baseline forward:
1. inspect the live schema first;
2. create forward-only migrations;
3. test migrations before production;
4. preserve contract/version history and private music assets;
5. never reintroduce user_metadata as an authorization source.
