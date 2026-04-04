# Supabase Branching

This repository is configured for one Supabase Branching source of truth:

- Git `main` -> production project
- Git `dev` -> persistent Supabase branch
- pull requests / feature branches -> ephemeral preview branches created by the Supabase GitHub integration

## Repo contract

- Keep one shared `supabase/` directory in Git.
- Root settings in `supabase/config.toml` are the production baseline and are also inherited by preview branches.
- Put persistent dev-only overrides in `[remotes.dev]`.
- Do not create a separate `supabase/` directory per Git branch.
- Do not add a second GitHub Actions flow that also runs `supabase db push` while the Supabase GitHub integration is managing branch sync.

## Files to maintain

- `supabase/config.toml`: shared baseline plus `[remotes.dev]`
- `supabase/seed.sql`: shared seed data
- `supabase/seeds/dev.sql`: optional persistent-dev-only seed data
- `.env`: production fallback frontend Supabase URL + publishable key
- `.env.development`: local development frontend Supabase URL + publishable key for the persistent `dev` branch

## Values still to fill

1. In the Supabase dashboard for the production project, confirm Branching stays enabled and this GitHub repository remains connected.
2. Confirm the persistent `dev` branch remains mapped to project ref `lquuatmjxzjomctajxns`.
3. If you later add a dedicated dev frontend domain, replace `[remotes.dev.auth].site_url = "http://localhost:8000"` with that hosted URL.
4. If you later add per-PR frontend preview deployments, extend the root `additional_redirect_urls` with the real preview host wildcard.
5. Keep shared seed data in `supabase/seed.sql`. Put dev-only fixtures in `supabase/seeds/dev.sql`, or disable `[remotes.dev.db.seed]` if you do not want branch-specific seed data.

## Auth notes

- Preview branches inherit the root auth config. Right now that allow-list covers the hosted production app plus local development on port `8000`.
- `[remotes.dev.auth]` exists only for the persistent `dev` branch, and it currently points to local development on `http://localhost:8000` because no dedicated hosted dev frontend domain was found in the repo.
- When you later add provider or SMTP secrets, prefer `env(...)` references in `supabase/config.toml` instead of hardcoding secrets.

## Local operations

- Use `npx supabase ...` inside this repo because the CLI is installed as a project dependency.
- `npm start` now reads `.env.development`, so local frontend development targets the persistent Supabase `dev` branch by default.
- Use `supabase link --project-ref <ref>` only for one-off manual operations against a specific remote project or branch.
- Open a PR and verify that Supabase creates the preview branch automatically.
