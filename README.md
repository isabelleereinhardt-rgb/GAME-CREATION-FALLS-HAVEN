# Wisp

*Read stories together instead of alone.*

Wisp is a warm, quiet, literary home for fanfiction and original fiction where
the point is the conversation: talk line by line in the margins, follow the
writers you love, keep control of what you see, and never meet an ad. This
repository is the front-end for that product, built from the discovery-session
design plan and the brand asset kit.

It runs two ways from the same code, with no build step and no framework. On its
own it is a self-contained static site: open `index.html` and it runs on demo
data. Connect a Supabase project (see below) and the same site becomes a real
multi-user app with accounts, a database, and image storage.

## Live site

Deployed with GitHub Pages:

**https://isabelleereinhardt-rgb.github.io/GAME-CREATION-FALLS-HAVEN/**

Deployment runs automatically from `.github/workflows/deploy.yml` on every push.
It needs to be turned on once: open **Settings > Pages**, and under **Build and
deployment** set **Source** to **GitHub Actions**. The next push (or a manual run
of the "Deploy to GitHub Pages" workflow) publishes the site at the URL above.

A single-file build of the same site also ships as `wisp-standalone.html`, with
the fonts embedded, so you can open it directly in a browser with nothing to
install.

## Running it locally

Because the app fetches its own scripts, open it through a static server rather
than the `file://` protocol for the cleanest result:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Opening `index.html` (or the bundled `wisp-standalone.html`) directly in a
browser also works.

## What is here

```
index.html            The app shell: header, three-column layout, screen mounts,
                      theme drawer, mobile sheet, icon sprite.
assets/css/wisp.css   The whole design system: theme tokens, components, every
                      screen, responsive collapse, reduced-motion and print.
assets/js/data.js     The demo dataset: works, activity, widgets, community,
                      library, and the reading-page chapter with seeded threads.
assets/js/wisp.js     The app: hash router, screen rendering, the reading-page
                      conversation, the theming engine, and persistence.
assets/js/config.js   Where you paste your Supabase URL and anon key. Blank by
                      default, which keeps the site in demo mode.
assets/js/db.js       The data layer: accounts, works, chapters, comments,
                      hearts, subscriptions, bookmarks, and cover uploads.
supabase/             The database: schema.sql (tables, security, triggers),
                      storage.sql (image buckets), seed.sql (starter tags).
SUPABASE_SETUP.md     Step-by-step for connecting your own project.
wisp-standalone.html  The entire site bundled into one file: fonts, badge art,
                      and the spelling dictionary embedded. Generated output;
                      rebuild it with `node tools/build-standalone.js`.
tools/                build-standalone.js (regenerates the one-file build) and
                      png-trim.js (crops badge art to its pixels).
```

## Accounts and data (optional)

Leave `assets/js/config.js` blank and the site runs on the bundled demo data,
which is how the screenshots and the standalone file look. To make it a real
site, create a free Supabase project, run the SQL in `supabase/`, and paste your
project URL and anon key into `config.js`. Then sign-up and sign-in create real
accounts, posting a work saves it to your database, Browse and the reader show
what people actually post, and per-line comments, hearts, subscriptions, and
bookmarks all persist. The full walkthrough is in
[`SUPABASE_SETUP.md`](SUPABASE_SETUP.md).

Security is enforced in the database with Row Level Security, so the anon key is
safe to commit: it only lets the browser attempt actions, and the database
decides what is allowed.

## The screens

- **Home** with For You (personalized, the default) and Following (plain
  chronological) tabs, a continue-reading resume, and a picked-for-you grid.
- **Browse** with a progressive filter sidebar (Basic open, Tags and Exclude
  collapsed, a persistent exclude count), gallery and list views, and one
  search across fanwork and original mixed together.
- **The reading page**, the soul of Wisp: a calm centered column with faint
  per-paragraph markers that open a public thread and one-tap emoji reactions on
  the exact line that got you, collapsible author and content notes, Kindle-style
  highlighting, and a floating toolbar for text size, theme, margins, and
  read-aloud.
- **Work detail** with cover, rating and warnings, tags, chapter index, and the
  full set of reader actions.
- **The Writing Station**, an equipped desk: a formatting toolbar with markdown
  underneath, autosave, work details, rating and warnings, upload-only cover,
  per-work controls, and publish or schedule.
- **Library**: bookmarks, reading lists (private by default), history, and
  Things, your private highlights and notes.
- **Community Space**: async fandom and tag hubs, plus events and challenges.
- **Profile**, expressive through the same theme system.

## The theming system, which is also the accessibility engine

The gear opens a drawer with six preset looks (Warm cream is the default, then
Sepia, Slate, Midnight, OLED black, and High contrast), an accent picker,
reading size and width sliders, a reading-face choice, a dyslexia-friendly
font, reduce-motion, justify-and-hyphenate, and a margin-comment toggle. Every
setting saves to the browser, standing in for the server-side per-account sync
the real product would use, and a reset is always one tap away.

## Design commitments carried through

- Warm cream, serif, muted rose; hairline rules only, no ornaments.
- No em dashes anywhere in the copy; colons and semicolons carry the weight.
- Adult content sits behind a soft, self-attested gate that collects nothing and
  is remembered once you pass it.
- No direct messages and no on-platform resharing; the conversation stays local
  and public.
- Hearts are one per reader, quiet and un-gameable; no streaks, no ranks.
- Personalization points at the reader for better discovery, never at an
  advertiser; your data is never sold.

## Notes on the demo

The content is stand-in data for a static build. Covers are painted in CSS; the
real product requires an uploaded cover to publish. Read-aloud uses the
browser's built-in speech synthesis in place of the neural voices planned for
launch. Web fonts load from Google Fonts with a serif fallback.
