# Connecting Wisp to Supabase

Wisp runs as a static site (hosted on GitHub Pages) that talks directly to
Supabase for its database, accounts, and image storage. Until you connect a
project, the site runs in **demo mode** with mock data. These steps switch it
to a real, multi-user backend.

You only do this once. It takes about ten minutes and costs nothing on
Supabase's free tier.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**. Give it a name and a database password (save the
   password somewhere; you will rarely need it).
3. Pick a region close to you and create the project. It takes a minute or two
   to provision.

## 2. Create the database

1. In your project, open **SQL Editor** in the left sidebar.
2. Click **New query**, paste in the full contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates
   every table and the security rules.
3. Repeat with [`supabase/storage.sql`](supabase/storage.sql) (image upload
   buckets) and, optionally, [`supabase/seed.sql`](supabase/seed.sql) (the
   starter tag list).
4. Run [`supabase/migrations/002_features.sql`](supabase/migrations/002_features.sql)
   to add the tables for following tags, saved highlights, chapter notes, and
   per-work settings.
5. Run [`supabase/migrations/003_scheduling.sql`](supabase/migrations/003_scheduling.sql)
   to add scheduled chapter releases (a locked chapter with a live countdown
   that releases itself when its time comes).
6. Run [`supabase/migrations/004_events.sql`](supabase/migrations/004_events.sql)
   to make Community events real, so joining and leaving them persists.
7. Run [`supabase/migrations/005_work_controls.sql`](supabase/migrations/005_work_controls.sql)
   to add the per-work "hide my numbers" control.
8. Run [`supabase/migrations/006_reports.sql`](supabase/migrations/006_reports.sql)
   to make the in-app report button real, so reports are written to a table
   only you (as the project owner) can read.
9. Run [`supabase/migrations/007_hubs.sql`](supabase/migrations/007_hubs.sql)
   to make community hubs real, so following a hub persists and each hub shows
   its true follower count. Run new migration files in order as they are added.

All of these are safe to re-run if you ever need to.

## 3. Point the site at your project

1. In Supabase, open **Project Settings > API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open [`assets/js/config.js`](assets/js/config.js) in this repo and paste them
   in:

   ```js
   window.WISP_CONFIG = {
     SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi..."
   };
   ```

   Both values are safe to commit. The anon key is meant to be public; your data
   is protected by the database's Row Level Security, not by hiding the key.
4. Commit and push. GitHub Pages redeploys, and the site is now live against your
   database.

## 4. Email sign-ups (choose one)

By default Supabase asks new users to confirm their email before they can sign
in. For testing, the simplest setup is to turn that off:

- **Authentication > Providers > Email**, turn **Confirm email** off. New
  accounts can sign in immediately.

Leave it on for a real launch, and set up an email sender under
**Authentication > Emails** when you are ready. The same email sender powers
the "Forgot your password?" reset link, so password reset only sends real
mail once an email sender is configured.

## What works once connected

- Real accounts: sign up, sign in, sign out. A profile row is created
  automatically for each new account.
- Posting works from the Writing Station writes real rows to your database (you
  can watch them appear under **Table Editor > works**).
- Browse lists every published work from your database, with the same filters
  and sorting.
- Opening a work shows its real chapters; the reader shows the real chapter text
  with the full reading controls.
- Per-line comments are live: readers can open the conversation on any line and
  post, and the comment is saved to your database.
- Hearts, subscriptions, and bookmarks are saved to your account and come back
  the way you left them.
- The Writing Station lists your own works with their real stats. You can edit a
  posted work's text, upload a cover image, group works into a series, and delete
  a work.

The Home page stays a curated showcase until your own works fill it in.
Reactions, reading progress, scheduling, and comic (image) pages use the same
data layer (`assets/js/db.js`) and get wired to the screens next.

## How it is secured

Every table has Row Level Security turned on. In plain terms:

- Anyone can read published works, comments, and public profiles.
- Only the author can see or edit their own drafts.
- You can only heart, subscribe, bookmark, or comment as yourself.
- Bookmarks and reading history are private to you.

The anon key only lets the browser attempt these actions; the database decides
what is actually allowed.
