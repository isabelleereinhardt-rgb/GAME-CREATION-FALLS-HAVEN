/* ============================================================================
   Wisp badges — hand-drawn metallic award art, no emoji.
   A single self-contained module. window.WispBadges exposes:
     CATALOG            the badge definitions (id, name, category, tier, desc, how)
     svg(id, size)      an <svg> string for one badge, at the given pixel size
     byId(id)           one definition
     categories()       [{key,label,badges:[...]}] grouped for a case grid
     earnedFrom(stats)  ids a profile auto-earns from its own numbers
   The metallic look is three tiers (bronze / silver / gold) sharing one set of
   gradients injected once; each badge is a medallion (smooth disc, scalloped
   seal, or five-point star) carrying an engraved emblem, some with ribbon tails.
   ========================================================================== */
(function () {
  "use strict";

  // ---- tier metals --------------------------------------------------------
  var TIER = {
    bronze: { a: "#ffdcb8", b: "#e0a064", c: "#b06a34", d: "#7a441e", ink: "#5e3416", ring: "#c9814a", label: "Bronze" },
    silver: { a: "#ffffff", b: "#dde5ec", c: "#adb9c6", d: "#7c8996", ink: "#566470", ring: "#c3ccd6", label: "Silver" },
    gold:   { a: "#fff6cf", b: "#f6d45f", c: "#d09b1f", d: "#8f6b12", ink: "#6f520d", ring: "#e6ba3c", label: "Gold" }
  };
  var RIBBON = { main: "#b04a5e", dark: "#8a3547", light: "#c86d7f" };   // Wisp-rose award ribbon

  // ---- geometry helpers (run once, at load) -------------------------------
  function pt(cx, cy, r, ang) { return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)]; }
  function poly(cx, cy, r, n, rot) {
    var d = "", i, p; for (i = 0; i < n; i++) { p = pt(cx, cy, r, rot + i * 2 * Math.PI / n); d += (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2); }
    return d + "Z";
  }
  function starPath(cx, cy, ro, ri, points, rot) {
    var d = "", i, ang, r, p;
    for (i = 0; i < points * 2; i++) { ang = rot + i * Math.PI / points; r = i % 2 ? ri : ro; p = pt(cx, cy, r, ang); d += (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2); }
    return d + "Z";
  }
  // A scalloped seal edge: alternating out/in points smoothed with quadratics.
  function scallop(cx, cy, r, teeth, depth) {
    var n = teeth * 2, d = "", i, ang, rr, p;
    for (i = 0; i <= n; i++) {
      ang = -Math.PI / 2 + i * Math.PI / teeth; rr = i % 2 ? r - depth : r; p = pt(cx, cy, rr, ang);
      d += (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2);
    }
    return d + "Z";
  }
  var SEAL = scallop(32, 30, 27, 16, 3.4);
  var STAR = starPath(32, 30, 27, 12.2, 5, -Math.PI / 2);
  var COG  = poly(32, 30, 27, 28, 0);   // fine gear ring for seals' outer trim

  // ---- gradient defs (injected once) --------------------------------------
  function grads() {
    var out = "";
    Object.keys(TIER).forEach(function (k) {
      var t = TIER[k];
      out +=
        '<linearGradient id="wb-face-' + k + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + t.a + '"/><stop offset=".5" stop-color="' + t.b + '"/><stop offset="1" stop-color="' + t.c + '"/></linearGradient>' +
        '<linearGradient id="wb-rim-' + k + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + t.b + '"/><stop offset="1" stop-color="' + t.d + '"/></linearGradient>' +
        '<radialGradient id="wb-spec-' + k + '" cx=".35" cy=".3" r=".7">' +
          '<stop offset="0" stop-color="#fff" stop-opacity=".65"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>';
    });
    out +=
      '<linearGradient id="wb-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + RIBBON.light + '"/><stop offset="1" stop-color="' + RIBBON.dark + '"/></linearGradient>';
    return out;
  }
  function inject() {
    if (typeof document === "undefined" || document.getElementById("wisp-badge-defs")) return;
    var host = document.createElement("div");
    host.id = "wisp-badge-defs"; host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    host.innerHTML = '<svg width="0" height="0"><defs>' + grads() + "</defs></svg>";
    (document.body || document.documentElement).appendChild(host);
  }

  // ---- medallion bases ----------------------------------------------------
  function ribbons() {
    // two pleated tails hanging behind the medallion, chevron-notched at the tips
    return '<g>' +
      '<path d="M23 44 L15 66 L21 62 L25 68 L31 48 Z" fill="url(#wb-ribbon)"/>' +
      '<path d="M41 44 L49 66 L43 62 L39 68 L33 48 Z" fill="url(#wb-ribbon)"/>' +
      '<path d="M23 44 L31 48 L25 68 L21 62 Z" fill="' + RIBBON.dark + '" opacity=".28"/>' +
      '</g>';
  }
  function discBase(t, k) {
    return '<circle cx="32" cy="30" r="27" fill="url(#wb-rim-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="23.5" fill="url(#wb-face-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="23.5" fill="url(#wb-spec-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="23.5" fill="none" stroke="' + t.d + '" stroke-opacity=".35" stroke-width="1"/>' +
      '<circle cx="32" cy="30" r="19.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>';
  }
  function sealBase(t, k) {
    return '<path d="' + COG + '" fill="url(#wb-rim-' + k + ')"/>' +
      '<path d="' + SEAL + '" fill="url(#wb-rim-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="21" fill="url(#wb-face-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="21" fill="url(#wb-spec-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="21" fill="none" stroke="' + t.d + '" stroke-opacity=".35" stroke-width="1"/>' +
      '<circle cx="32" cy="30" r="17.5" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1"/>';
  }
  function starBase(t, k) {
    return '<path d="' + STAR + '" fill="url(#wb-rim-' + k + ')"/>' +
      '<path d="' + starPath(32, 30, 23, 10.2, 5, -Math.PI / 2) + '" fill="url(#wb-face-' + k + ')"/>' +
      '<path d="' + starPath(32, 30, 23, 10.2, 5, -Math.PI / 2) + '" fill="url(#wb-spec-' + k + ')"/>' +
      '<circle cx="32" cy="30" r="9.5" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1"/>';
  }

  // ---- emblems (engraved in the tier ink, centered ~ (32,30)) -------------
  // Each returns markup drawn in `ink`. Kept simple so they read down to ~28px.
  var EM = {
    star: function (ink) { return '<path d="' + starPath(32, 30, 11, 4.6, 5, -Math.PI / 2) + '" fill="' + ink + '"/>'; },
    trophy: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M25 20h14v6a7 7 0 0 1-14 0z"/><path d="M25 22c-4 0-5-2-5-4h5M39 22c4 0 5-2 5-4h-5"/><path d="M32 33v4M27 41h10M29 41l1-4h4l1 4"/></g>'; },
    heart: function (ink) { return '<path d="M32 40c-9-6-12-10-12-14a5.4 5.4 0 0 1 10-2.6A5.4 5.4 0 0 1 44 26c0 4-3 8-12 14z" fill="' + ink + '"/>'; },
    quill: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M42 19c-8 1-16 7-19 15-1 3-2 6-2 6s3-1 6-2c8-3 14-11 15-19z"/><path d="M23 40l7-7M39 23c-4 2-8 5-11 9"/></g>'; },
    book: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M32 22c-3-2-7-2.6-11-2v18c4-.6 8 0 11 2 3-2 7-2.6 11-2V20c-4-.6-8 0-11 2z"/><path d="M32 22v18"/></g>'; },
    books: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round"><rect x="21" y="34" width="22" height="7" rx="1.5"/><rect x="23" y="27" width="18" height="7" rx="1.5"/><rect x="25" y="20" width="14" height="7" rx="1.5"/></g>'; },
    flame: function (ink) { return '<path d="M32 18c1 5-3 6-3 10a3 3 0 0 0 6 0c0-1-.4-2-1-3 3 1 5 4 5 7a7 7 0 0 1-14 0c0-6 5-9 7-14z" fill="' + ink + '"/>'; },
    calendar: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="20" y="21" width="24" height="20" rx="2.5"/><path d="M20 27h24M26 18v5M38 18v5"/><path d="M29 34l2.5 2.5 5-5"/></g>'; },
    hourglass: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M23 19h18M23 41h18"/><path d="M25 19c0 7 7 8 7 11 0-3 7-4 7-11M25 41c0-7 7-8 7-11 0 3 7 4 7 11"/></g>'; },
    laurel: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.1" stroke-linecap="round"><path d="M26 42c-6-3-9-9-8-17M25 24c1 2 3 3 5 3M24 30c1 2 3 3 5 3M24 36c1 2 3 3 5 3"/><path d="M38 42c6-3 9-9 8-17M39 24c-1 2-3 3-5 3M40 30c-1 2-3 3-5 3M40 36c-1 2-3 3-5 3"/></g>'; },
    handheart: function (ink) { return '<path d="M32 21c-3.4-3.2-8.2.2-6.1 3.9 1.1 2 6.1 5.1 6.1 5.1s5-3.1 6.1-5.1c2.1-3.7-2.7-7.1-6.1-3.9z" fill="' + ink + '"/>' + '<path d="M19 33c3.5 6 8 9 13 9s9.5-3 13-9" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/>' + '<path d="M22 36l-2.5 3M42 36l2.5 3" fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"/>'; },
    chat: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M20 24h24v13H31l-6 5v-5h-5z"/><path d="M26 30h12M26 34h7"/></g>'; },
    magnifier: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"><circle cx="30" cy="28" r="7.5"/><path d="M35.5 33.5L42 40"/></g>'; },
    door: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M24 41V21h11a3 3 0 0 1 3 3v17"/><path d="M22 41h20M33 31h.02"/><path d="M40 26l4-3v18l-4-3"/></g>'; },
    owl: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M22 27a10 10 0 0 1 20 0v6a10 10 0 0 1-20 0z"/><circle cx="28" cy="29" r="2.6" fill="' + ink + '"/><circle cx="36" cy="29" r="2.6" fill="' + ink + '"/><path d="M32 32l-2 2h4zM22 22l3 4M42 22l-3 4"/></g>'; },
    cliff: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M20 40h9l0-8 4 0 0 6 3 0 0-12 8 0"/><path d="M20 40v-6M44 40v-8"/></g>'; },
    goblin: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M22 24l4 3M42 24l-4 3"/><path d="M23 30a9 9 0 0 1 18 0c0 6-4 11-9 11s-9-5-9-11z"/><circle cx="29" cy="31" r="1.7" fill="' + ink + '"/><circle cx="35" cy="31" r="1.7" fill="' + ink + '"/><path d="M28 36c2 2 6 2 8 0"/></g>'; },
    bolt: function (ink) { return '<path d="M35 17l-12 16h7l-3 14 12-17h-7z" fill="' + ink + '"/>'; },
    snowflake: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"><path d="M32 18v24M22 24l20 12M42 24l-20 12"/><path d="M32 22l-3 3M32 22l3 3M32 38l-3-3M32 38l3-3M24 27l1 4M24 27l4-1M40 33l-1-4M40 33l-4 1M24 33l4 1M24 33l1-4M40 27l-4-1M40 27l-1 4"/></g>'; },
    sprout: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M32 42V28"/><path d="M32 30c-2-5-7-6-11-5 0 5 4 8 11 7zM32 32c2-6 7-7 11-6 0 5-4 8-11 7z"/></g>'; },
    sun: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linecap="round"><circle cx="32" cy="30" r="7"/><path d="M32 17v4M32 39v4M19 30h4M41 30h4M23 21l3 3M41 39l-3-3M41 21l-3 3M23 39l3-3"/></g>'; },
    leaf: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"><path d="M42 20c-12 0-20 6-20 15 0 3 1 5 1 5s2-13 15-16c-8 5-11 10-12 15"/><path d="M23 40c0-8 6-16 19-20"/></g>'; },
    cake: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M22 41h20v-9H22z"/><path d="M22 36c3 2 5 2 6.7 0 1.7 2 3.6 2 6.6 0 1.7 2 3.7 2 6.7 0"/><path d="M32 32v-6M29 22c0 2 3 2 3 0 0-1.5-1.5-2.5-1.5-2.5S29 20.5 29 22z"/></g>'; },
    rosette: function (ink) { return '<g fill="none" stroke="' + ink + '" stroke-width="2"><circle cx="32" cy="30" r="8"/><circle cx="32" cy="30" r="3.4" fill="' + ink + '"/></g>' + '<path d="' + starPath(32, 30, 12.5, 8, 12, -Math.PI / 2) + '" fill="none" stroke="' + ink + '" stroke-width="1.4" opacity=".7"/>'; },
    number: function (ink, txt) { return '<text x="32" y="34.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="15" fill="' + ink + '">' + (txt || "100") + "</text>"; }
  };

  // ---- the catalog --------------------------------------------------------
  // base: "disc" | "seal" | "star" ; ribbon: true adds award tails.
  // auto: a function(stats) -> bool for badges a profile earns from its own
  // numbers; the rest are granted (contests, community, silly, seasonal).
  var CAT = [
    // Contests & competitions
    { id: "grand-prize",      name: "Grand Prize",        cat: "contest", tier: "gold",   base: "star", emblem: "star",    ribbon: true,  desc: "First place in a Wisp contest.", how: "Win a site contest or competition." },
    { id: "runner-up",        name: "Runner-Up",          cat: "contest", tier: "silver", base: "star", emblem: "star",    ribbon: true,  desc: "Second place in a Wisp contest.", how: "Place second in a contest." },
    { id: "honorable-mention",name: "Honorable Mention",  cat: "contest", tier: "bronze", base: "seal", emblem: "rosette", ribbon: true,  desc: "A standout entry the judges loved.", how: "Earn a judges' shout-out in a contest." },
    { id: "peoples-choice",   name: "People's Choice",    cat: "contest", tier: "gold",   base: "seal", emblem: "heart",   ribbon: true,  desc: "The entry readers voted for most.", how: "Win the reader vote in an event." },
    // Consistency & streaks
    { id: "old-faithful",     name: "Old Faithful",       cat: "streak",  tier: "gold",   base: "disc", emblem: "calendar", desc: "Never missed an update day.", how: "Keep every scheduled update for a season." },
    { id: "kept-the-flame",   name: "Kept the Flame",     cat: "streak",  tier: "gold",   base: "disc", emblem: "flame",    desc: "A long, unbroken update streak.", how: "Post on a streak of many weeks." },
    { id: "clockwork",        name: "Clockwork",          cat: "streak",  tier: "silver", base: "disc", emblem: "hourglass",desc: "Updates you could set a watch by.", how: "Update on the same day, week after week." },
    // Milestones
    { id: "first-words",      name: "First Words",        cat: "milestone", tier: "bronze", base: "seal", emblem: "quill",  desc: "Published a first work on Wisp.", how: "Publish your first work.", auto: function (s) { return s.works >= 1; } },
    { id: "wordsmith",        name: "Wordsmith",          cat: "milestone", tier: "silver", base: "disc", emblem: "book",   desc: "Crossed a real word-count milestone.", how: "Write a lot of words across your works.", auto: function (s) { return (s.words || 0) >= 50000; } },
    { id: "prolific",         name: "Prolific",           cat: "milestone", tier: "gold",   base: "disc", emblem: "books",  desc: "A shelf's worth of published works.", how: "Publish ten or more works.", auto: function (s) { return s.works >= 10; } },
    { id: "beloved",          name: "Beloved",            cat: "milestone", tier: "gold",   base: "seal", emblem: "heart",  desc: "Readers left a lot of hearts.", how: "Gather 500 hearts across your works.", auto: function (s) { return (s.hearts || 0) >= 500; } },
    { id: "century-club",     name: "Century Club",       cat: "milestone", tier: "silver", base: "disc", emblem: "number", desc: "Passed one hundred hearts.", how: "Reach 100 hearts.", auto: function (s) { return (s.hearts || 0) >= 100; } },
    // Community & kindness
    { id: "kind-soul",        name: "Kind Soul",          cat: "community", tier: "gold",   base: "disc", emblem: "handheart", desc: "Steady warmth to other writers.", how: "Be recognized for consistent kindness." },
    { id: "cheerleader",      name: "Cheerleader",        cat: "community", tier: "silver", base: "disc", emblem: "chat",   desc: "Always in the comments, cheering.", how: "Leave lots of supportive comments." },
    { id: "beta-reader",      name: "Beta Reader",        cat: "community", tier: "bronze", base: "disc", emblem: "magnifier", desc: "Gives thoughtful, careful feedback.", how: "Beta-read and give helpful notes." },
    { id: "welcome-wagon",    name: "Welcome Wagon",      cat: "community", tier: "silver", base: "disc", emblem: "door",   desc: "First to welcome the new folks.", how: "Greet and help newcomers settle in." },
    // Silly personality
    { id: "night-owl",        name: "Night Owl",          cat: "silly",   tier: "silver", base: "disc", emblem: "owl",    desc: "Posts at deeply unreasonable hours.", how: "Publish something after midnight." },
    { id: "cliffhanger",      name: "Cliffhanger Villain",cat: "silly",   tier: "bronze", base: "disc", emblem: "cliff",  desc: "Ends chapters right there. Cruel.", how: "Be infamous for your cliffhangers." },
    { id: "comment-goblin",   name: "Comment Goblin",     cat: "silly",   tier: "bronze", base: "disc", emblem: "goblin", desc: "Lurks in every comment section.", how: "Comment absolutely everywhere." },
    { id: "speed-demon",      name: "Speed Demon",        cat: "silly",   tier: "gold",   base: "disc", emblem: "bolt",   desc: "Updates faster than anyone can read.", how: "Post updates at a blistering pace." },
    // Seasonal / event
    { id: "winter-tale",      name: "Winter Tale",        cat: "seasonal", tier: "silver", base: "seal", emblem: "snowflake", desc: "Wrote for the winter event.", how: "Take part in a winter event." },
    { id: "spring-bloom",     name: "Spring Bloom",       cat: "seasonal", tier: "gold",   base: "seal", emblem: "sprout", desc: "Wrote for the spring event.", how: "Take part in a spring event." },
    { id: "summer-reader",    name: "Summer Reader",      cat: "seasonal", tier: "gold",   base: "seal", emblem: "sun",    desc: "Finished the summer reading run.", how: "Complete a summer reading challenge." },
    { id: "autumn-quill",     name: "Autumn Quill",       cat: "seasonal", tier: "bronze", base: "seal", emblem: "leaf",   desc: "Wrote for the autumn event.", how: "Take part in a fall event." },
    { id: "anniversary",      name: "Anniversary",        cat: "seasonal", tier: "gold",   base: "seal", emblem: "cake",   desc: "Here for a Wisp anniversary.", how: "Be around for the site's birthday." }
  ];
  var BY = {}; CAT.forEach(function (b) { BY[b.id] = b; });

  var CATS = [
    { key: "contest",   label: "Contests & competitions" },
    { key: "streak",    label: "Consistency & streaks" },
    { key: "milestone", label: "Milestones" },
    { key: "community", label: "Community & kindness" },
    { key: "silly",     label: "Silly personality" },
    { key: "seasonal",  label: "Seasonal & events" }
  ];

  // ---- compose one badge --------------------------------------------------
  function inner(def) {
    var t = TIER[def.tier] || TIER.gold, k = def.tier || "gold";
    var base = def.base === "star" ? starBase(t, k) : def.base === "seal" ? sealBase(t, k) : discBase(t, k);
    var em = EM[def.emblem] ? EM[def.emblem](t.ink, def.emblem === "number" ? "100" : "") : "";
    return (def.ribbon ? ribbons() : "") + base + em;
  }
  function svg(id, size) {
    var def = BY[id]; if (!def) return "";
    var s = size || 56;
    return '<svg class="wisp-badge-svg" viewBox="0 0 64 72" width="' + s + '" height="' + (s * 72 / 64).toFixed(1) + '" role="img" aria-label="' + def.name + '">' + inner(def) + "</svg>";
  }

  function earnedFrom(stats) {
    stats = stats || {};
    return CAT.filter(function (b) { return typeof b.auto === "function" && b.auto(stats); }).map(function (b) { return b.id; });
  }
  function categories() {
    return CATS.map(function (c) { return { key: c.key, label: c.label, badges: CAT.filter(function (b) { return b.cat === c.key; }) }; });
  }

  window.WispBadges = {
    CATALOG: CAT,
    svg: svg,
    byId: function (id) { return BY[id]; },
    categories: categories,
    earnedFrom: earnedFrom,
    tierLabel: function (t) { return (TIER[t] || {}).label || ""; },
    inject: inject
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
    else inject();
  }
})();
