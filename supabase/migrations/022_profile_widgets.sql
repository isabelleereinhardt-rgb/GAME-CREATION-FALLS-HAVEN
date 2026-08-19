-- Wisp · migration 022: per-account widget station
--
-- The installable widgets (timers, spinners, sticky notes, and so on) used to
-- live only in the browser's localStorage, so a reader who set them up on a
-- laptop saw an empty station on their phone. Store them on the profile instead,
-- keyed to the account, so the widget station follows the reader across devices.
--
-- Shape: { "installed": ["clock","streak", ...], "state": { "streak": {...}, ... } }
-- Safe to re-run.

alter table public.profiles
  add column if not exists widgets jsonb not null default '{}'::jsonb;

-- The existing profiles_update_own policy already scopes updates to auth.uid() = id,
-- so a reader can only write their own widget station. No new policy needed.
