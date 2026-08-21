/* ============================================================================
   Wisp badges — the real award art the owner supplied (assets/img/badges/*),
   placed on the site like logos. No drawn/generated art. window.WispBadges:
     CATALOG            the badge definitions (id, name, category, tier, desc, how)
     svg(id, size)      an <img> for one badge, sized to the art's real shape
     art(file, size)    an <img> for a raw art file (contest place numbers etc.)
     byId(id)           one definition
     categories()       [{key,label,badges:[...]}] grouped, only non-empty groups
     earnedFrom(stats)  ids a profile auto-earns from its own numbers
     tierLabel(t)       "Gold" | "Silver" | "Bronze"
   The look lives entirely in the PNGs; this file only maps each badge to its
   image and its meaning. Every image is trimmed to its pixels (tools/png-trim.js),
   and DIM records each file's true size so a wide ribbon, a tall rosette, and a
   five-star strip all render at a matched visual weight instead of being
   squeezed into the same square.
   ========================================================================== */
(function () {
  "use strict";

  // Where the badge PNGs live. Overridable (e.g. the standalone build points at
  // data URIs) via window.WISP_BADGE_BASE / window.WISP_BADGE_IMG.
  var BASE = (typeof window !== "undefined" && window.WISP_BADGE_BASE) || "assets/img/badges/";
  var IMG = (typeof window !== "undefined" && window.WISP_BADGE_IMG) || null;  // optional {file: dataURI}
  function src(file) { return (IMG && IMG[file]) ? IMG[file] : (BASE + file); }

  var TIER_LABEL = { gold: "Gold", silver: "Silver", bronze: "Bronze" };

  // The true pixel size of every art file, measured after trimming. Sizing
  // reads from here so the page never squashes or letterboxes the art.
  var DIM = {
    "book-gold.png": [200, 168], "bulb-gold.png": [194, 254], "calendar-gold.png": [182, 171],
    "check-gold.png": [136, 136],
    "chevron-dark-up.png": [66, 92], "chevron-dark-down.png": [58, 91],
    "chevron-silver-up.png": [66, 91], "chevron-silver-down.png": [58, 92],
    "chevron-gold-up.png": [66, 91], "chevron-gold-down.png": [59, 92],
    "community-gold.png": [303, 297], "feather-gold.png": [178, 242], "medal-gold.png": [112, 160],
    "padlock-gold.png": [151, 152],
    "place-1.png": [160, 183], "place-2.png": [160, 183], "place-3.png": [160, 183],
    "place-4.png": [156, 182], "place-5.png": [157, 182], "place-6.png": [157, 182],
    "place-7.png": [158, 182], "place-8.png": [158, 182], "place-9.png": [157, 182],
    "pushpin-gold.png": [134, 204], "recommended-seal.png": [194, 190], "ribbon-gold.png": [144, 28],
    "rosette-gold.png": [164, 235], "rosette-silver.png": [104, 148],
    "seal-gold.png": [141, 141], "seal-silver.png": [155, 155], "shield-gold.png": [139, 149],
    "star-1.png": [270, 49], "star-2.png": [262, 47], "star-3.png": [281, 51],
    "star-4.png": [266, 48], "star-5.png": [271, 47],
    "star-black.png": [170, 162], "star-burst.png": [238, 253], "star-gold.png": [155, 147],
    "target-gold.png": [236, 239], "top-1-banner.png": [337, 153],
    "top-5-medal.png": [284, 283], "top-10-medal.png": [273, 271],
    "winner-gold.png": [149, 59],
    "wreath-top-1.png": [182, 178], "wreath-top-3.png": [206, 202]
  };

  // Each badge points at one of the supplied graphics (img), and carries the
  // meaning we assign it. Milestone badges with `auto` earn themselves from the
  // profile's own numbers; the rest are granted by an editor. The contest
  // placement ids (and top-five / top-ten) are also handed out automatically
  // when a contest closes.
  var CAT = [
    // Contests & competitions ------------------------------------------------
    { id: "first-place",   name: "First Place",    cat: "contest", tier: "gold",   img: "place-1.png",       desc: "Took first in a Wisp contest.",           how: "Win first place in a contest." },
    { id: "second-place",  name: "Second Place",   cat: "contest", tier: "silver", img: "place-2.png",       desc: "Placed second in a Wisp contest.",        how: "Come in second in a contest." },
    { id: "third-place",   name: "Third Place",    cat: "contest", tier: "bronze", img: "place-3.png",       desc: "Placed third in a Wisp contest.",         how: "Come in third in a contest." },
    { id: "top-five",      name: "Top Five",       cat: "contest", tier: "gold",   img: "top-5-medal.png",   desc: "Finished in the top five of a big contest.", how: "Place fourth or fifth in a contest with six or more entries." },
    { id: "top-ten",       name: "Top Ten",        cat: "contest", tier: "silver", img: "top-10-medal.png",  desc: "Finished in the top ten of a big contest.",  how: "Place sixth through tenth in a contest with eleven or more entries." },
    { id: "grand-winner",  name: "Grand Winner",   cat: "contest", tier: "gold",   img: "winner-gold.png",   desc: "Top winner of a marquee event.",          how: "Win a major site-wide event." },
    { id: "finalist",      name: "Finalist",       cat: "contest", tier: "gold",   img: "medal-gold.png",    desc: "Reached the final round of a contest.",   how: "Be shortlisted by the judges." },
    { id: "judges-choice", name: "Judges' Choice", cat: "contest", tier: "gold",   img: "rosette-gold.png",  desc: "Singled out by the judges.",              how: "Be chosen by the contest judges." },
    { id: "peoples-choice",name: "People's Choice", cat: "contest", tier: "silver", img: "rosette-silver.png", desc: "The entry readers voted for most.",      how: "Win the reader vote in an event." },
    { id: "champion-wreath", name: "Champion's Wreath", cat: "contest", tier: "gold", img: "wreath-top-1.png", desc: "Won first place three times.",          how: "Win three contests." },
    { id: "podium-wreath", name: "Podium Laurels", cat: "contest", tier: "gold",   img: "wreath-top-3.png",  desc: "Reached the podium three times.",         how: "Place top three in three contests." },
    { id: "number-one",    name: "Number One",     cat: "contest", tier: "gold",   img: "top-1-banner.png",  desc: "Held the top spot on the charts.",        how: "Top the site charts with a work." },
    // Milestones -------------------------------------------------------------
    { id: "first-publication", name: "First Publication", cat: "milestone", tier: "gold", img: "seal-gold.png", desc: "Published a first work on Wisp.",       how: "Publish your first work.", auto: function (s) { return (s.works || 0) >= 1; } },
    { id: "shelf-of-stories", name: "Shelf of Stories", cat: "milestone", tier: "gold", img: "book-gold.png", desc: "Published five works.",                   how: "Publish five works.", auto: function (s) { return (s.works || 0) >= 5; } },
    { id: "wordsmith",     name: "Wordsmith",      cat: "milestone", tier: "gold",   img: "feather-gold.png",  desc: "Wrote fifty thousand words on Wisp.",     how: "Publish 50,000 words across your works.", auto: function (s) { return (s.words || 0) >= 50000; } },
    { id: "unlocked",      name: "Milestone Unlocked", cat: "milestone", tier: "gold", img: "padlock-gold.png", desc: "Crossed a hearts milestone.",           how: "Reach 100 hearts across your works.", auto: function (s) { return (s.hearts || 0) >= 100; } },
    { id: "breakout",      name: "Breakout",       cat: "milestone", tier: "gold",   img: "star-burst.png",    desc: "Hit five hundred hearts.",                how: "Reach 500 hearts across your works.", auto: function (s) { return (s.hearts || 0) >= 500; } },
    { id: "legend",        name: "Legend",         cat: "milestone", tier: "gold",   img: "star-black.png",    desc: "A rare, standout honor.",                 how: "Earn a special recognition from the team." },
    // Consistency & streaks --------------------------------------------------
    { id: "rising-star",   name: "Rising Star",    cat: "streak",  tier: "gold",   img: "star-gold.png",     desc: "Posted at least twice a week for a month.", how: "Update 2+ times a week, four weeks running.", auto: function (s) { return !!s.consistentMonth; } },
    { id: "old-faithful",  name: "Old Faithful",   cat: "streak",  tier: "gold",   img: "ribbon-gold.png",   desc: "Never missed an update day.",             how: "Hit every scheduled update for a season." },
    // Community & kindness ---------------------------------------------------
    { id: "guardian",      name: "Guardian",       cat: "community", tier: "gold", img: "shield-gold.png",   desc: "Helps keep Wisp kind and safe.",          how: "Be a moderator or a trusted helper." },
    { id: "verified",      name: "Verified",       cat: "community", tier: "gold", img: "check-gold.png",    desc: "A trusted, verified member.",             how: "Be verified by the Wisp team." },
    { id: "community-heart", name: "Heart of the Community", cat: "community", tier: "gold", img: "community-gold.png", desc: "Brings people together.",       how: "Build and tend a thriving hub." },
    { id: "recommended",   name: "Highly Recommended", cat: "community", tier: "gold", img: "recommended-seal.png", desc: "On the recommended shelf.",         how: "Have a work picked for the recommended shelf." },
    { id: "featured",      name: "Featured",       cat: "community", tier: "gold",   img: "pushpin-gold.png",  desc: "Pinned to the featured shelf.",           how: "Have a work chosen as a featured work." },
    { id: "bright-idea",   name: "Bright Idea",    cat: "community", tier: "gold",   img: "bulb-gold.png",     desc: "Made Wisp better with a suggestion.",     how: "Suggest an improvement the team ships." },
    { id: "event-host",    name: "Event Host",     cat: "community", tier: "gold",   img: "calendar-gold.png", desc: "Ran a community event.",                  how: "Host or help run an event." },
    { id: "on-target",     name: "Right on Target", cat: "community", tier: "gold",  img: "target-gold.png",   desc: "Delivered an exchange gift on time.",     how: "Complete a gift exchange assignment." },
    // Member rank: a plain ladder the team awards as members stay with Wisp ----
    { id: "rank-newcomer", name: "Newcomer",      cat: "rank", tier: "bronze", img: "chevron-dark-up.png",    desc: "New to Wisp.",                     how: "Join Wisp." },
    { id: "rank-regular",  name: "Regular",       cat: "rank", tier: "bronze", img: "chevron-dark-down.png",  desc: "Here often.",                      how: "Keep coming back." },
    { id: "rank-familiar", name: "Familiar Face", cat: "rank", tier: "silver", img: "chevron-silver-up.png",  desc: "A known member.",                  how: "Stay active in the community." },
    { id: "rank-veteran",  name: "Veteran",       cat: "rank", tier: "silver", img: "chevron-silver-down.png", desc: "Been around a long time.",        how: "Stick with Wisp long-term." },
    { id: "rank-oldguard", name: "Team Player",   cat: "rank", tier: "gold",   img: "chevron-gold-up.png",    desc: "A reliable, long-standing member.", how: "Keep showing up over the years." },
    { id: "rank-pillar",   name: "Pillar",        cat: "rank", tier: "gold",   img: "chevron-gold-down.png",  desc: "A core part of the community.",     how: "Earn the community's trust over time." },
    { id: "founding",      name: "Founding Member", cat: "rank", tier: "silver", img: "seal-silver.png",      desc: "Here since the early days.",        how: "Be part of Wisp's first season." },
    // Ratings ----------------------------------------------------------------
    { id: "first-rating",  name: "First Rating",   cat: "rating",  tier: "bronze", img: "star-1.png",        desc: "A reader rated one of the works.", how: "Get your first reader rating.", auto: function (s) { return (s.ratingsCount || 0) >= 1; } },
    { id: "talked-about",  name: "Talked About",   cat: "rating",  tier: "bronze", img: "star-2.png",        desc: "Ten reader ratings and counting.", how: "Collect ten ratings across your books.", auto: function (s) { return (s.ratingsCount || 0) >= 10; } },
    { id: "well-rated",    name: "Well-Rated",     cat: "rating",  tier: "bronze", img: "star-3.png",        desc: "A solid average reader rating.", how: "Average 3 stars or more across your books (5+ ratings).", auto: function (s) { return (s.ratingsCount || 0) >= 5 && (s.avgRating || 0) >= 3; } },
    { id: "highly-rated",  name: "Highly Rated",   cat: "rating",  tier: "silver", img: "star-4.png",        desc: "A high average reader rating.",  how: "Average 4 stars or more across your books (5+ ratings).", auto: function (s) { return (s.ratingsCount || 0) >= 5 && (s.avgRating || 0) >= 4; } },
    { id: "five-star",     name: "Five-Star Author", cat: "rating", tier: "gold",  img: "star-5.png",        desc: "A near-perfect average rating.", how: "Average 4.5 stars or more across your books (10+ ratings).", auto: function (s) { return (s.ratingsCount || 0) >= 10 && (s.avgRating || 0) >= 4.5; } }
  ];
  var BY = {}; CAT.forEach(function (b) { BY[b.id] = b; });

  var CAT_LABELS = {
    contest: "Contests & competitions",
    milestone: "Milestones",
    streak: "Consistency & streaks",
    community: "Community & kindness",
    rank: "Member rank",
    rating: "Reader ratings"
  };
  var CAT_ORDER = ["contest", "milestone", "streak", "community", "rank", "rating"];

  // Size one art file into a box: squarish and tall art gets the box height,
  // wide art (ribbons, banners, star strips) spreads up to 1.9x the box wide so
  // it stays legible instead of shrinking to a sliver inside a square.
  function fit(file, size) {
    var d = DIM[file]; var s = size || 56;
    if (!d) return { w: s, h: s };
    var a = d[0] / d[1];
    if (a >= 1) { var w = s * Math.min(a, 1.9); return { w: Math.round(w), h: Math.round(w / a) }; }
    return { w: Math.round(s * a), h: s };
  }
  function imgTag(file, size, alt) {
    var box = fit(file, size);
    return '<img class="wisp-badge-img" src="' + src(file) + '" width="' + box.w + '" height="' + box.h + '" alt="' + esc(alt || "") + '" loading="lazy" decoding="async">';
  }
  function svg(id, size) {
    var def = BY[id]; if (!def) return "";
    return imgTag(def.img, size, def.name);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function earnedFrom(stats) {
    stats = stats || {};
    return CAT.filter(function (b) { return typeof b.auto === "function" && b.auto(stats); }).map(function (b) { return b.id; });
  }
  function categories() {
    return CAT_ORDER
      .map(function (k) { return { key: k, label: CAT_LABELS[k], badges: CAT.filter(function (b) { return b.cat === k; }) }; })
      .filter(function (g) { return g.badges.length; });
  }

  window.WispBadges = {
    CATALOG: CAT,
    svg: svg,
    art: imgTag,          // raw art by file name (contest place numbers 4-9)
    byId: function (id) { return BY[id]; },
    categories: categories,
    earnedFrom: earnedFrom,
    tierLabel: function (t) { return TIER_LABEL[t] || ""; },
    inject: function () {}   // no-op; kept for API compatibility
  };
})();
