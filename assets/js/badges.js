/* ============================================================================
   Wisp badges — the real award art the owner supplied (assets/img/badges/*),
   placed on the site like logos. No drawn/generated art. window.WispBadges:
     CATALOG            the badge definitions (id, name, category, tier, desc, how)
     svg(id, size)      an <img> for one badge at the given pixel size
     byId(id)           one definition
     categories()       [{key,label,badges:[...]}] grouped, only non-empty groups
     earnedFrom(stats)  ids a profile auto-earns from its own numbers
     tierLabel(t)       "Gold" | "Silver" | "Bronze"
   The look lives entirely in the PNGs; this file only maps each badge to its
   image and its meaning.
   ========================================================================== */
(function () {
  "use strict";

  // Where the badge PNGs live. Overridable (e.g. a preview page can point at
  // data URIs) via window.WISP_BADGE_BASE.
  var BASE = (typeof window !== "undefined" && window.WISP_BADGE_BASE) || "assets/img/badges/";
  var IMG = (typeof window !== "undefined" && window.WISP_BADGE_IMG) || null;  // optional {file: dataURI}
  function src(file) { return (IMG && IMG[file]) ? IMG[file] : (BASE + file); }

  var TIER_LABEL = { gold: "Gold", silver: "Silver", bronze: "Bronze" };

  // Each badge points at one of the supplied graphics (img), and carries the
  // meaning we assign it. Milestone badges with `auto` earn themselves from the
  // profile's own numbers; the rest are granted by an editor.
  var CAT = [
    // Contests & competitions ------------------------------------------------
    { id: "first-place",   name: "First Place",    cat: "contest", tier: "gold",   img: "place-1.png",       desc: "Took first in a Wisp contest.",           how: "Win first place in a contest." },
    { id: "second-place",  name: "Second Place",   cat: "contest", tier: "silver", img: "place-2.png",       desc: "Placed second in a Wisp contest.",        how: "Come in second in a contest." },
    { id: "third-place",   name: "Third Place",    cat: "contest", tier: "bronze", img: "place-3.png",       desc: "Placed third in a Wisp contest.",         how: "Come in third in a contest." },
    { id: "grand-winner",  name: "Grand Winner",   cat: "contest", tier: "gold",   img: "winner-gold.png",   desc: "Top winner of a marquee event.",          how: "Win a major site-wide event." },
    { id: "judges-choice", name: "Judges' Choice", cat: "contest", tier: "gold",   img: "rosette-gold.png",  desc: "Singled out by the judges.",              how: "Be chosen by the contest judges." },
    { id: "peoples-choice",name: "People's Choice", cat: "contest", tier: "silver", img: "rosette-silver.png", desc: "The entry readers voted for most.",      how: "Win the reader vote in an event." },
    // Milestones -------------------------------------------------------------
    { id: "first-publication", name: "First Publication", cat: "milestone", tier: "gold", img: "seal-gold.png", desc: "Published a first work on Wisp.",       how: "Publish your first work.", auto: function (s) { return (s.works || 0) >= 1; } },
    { id: "unlocked",      name: "Milestone Unlocked", cat: "milestone", tier: "gold", img: "padlock-gold.png", desc: "Crossed a hearts milestone.",           how: "Reach 100 hearts across your works.", auto: function (s) { return (s.hearts || 0) >= 100; } },
    { id: "legend",        name: "Legend",         cat: "milestone", tier: "gold",   img: "star-black.png",    desc: "A rare, standout honor.",                 how: "Earn a special recognition from the team." },
    // Consistency & streaks --------------------------------------------------
    { id: "rising-star",   name: "Rising Star",    cat: "streak",  tier: "gold",   img: "star-gold.png",     desc: "On a strong run of updates.",             how: "Keep a long update streak going." },
    { id: "old-faithful",  name: "Old Faithful",   cat: "streak",  tier: "gold",   img: "ribbon-gold.png",   desc: "Never missed an update day.",             how: "Hit every scheduled update for a season." },
    // Community & kindness ---------------------------------------------------
    { id: "guardian",      name: "Guardian",       cat: "community", tier: "gold", img: "shield-gold.png",   desc: "Helps keep Wisp kind and safe.",          how: "Be a moderator or a trusted helper." },
    { id: "verified",      name: "Verified",       cat: "community", tier: "gold", img: "check-gold.png",    desc: "A trusted, verified member.",             how: "Be verified by the Wisp team." }
  ];
  var BY = {}; CAT.forEach(function (b) { BY[b.id] = b; });

  var CAT_LABELS = {
    contest: "Contests & competitions",
    milestone: "Milestones",
    streak: "Consistency & streaks",
    community: "Community & kindness"
  };
  var CAT_ORDER = ["contest", "milestone", "streak", "community"];

  function svg(id, size) {
    var def = BY[id]; if (!def) return "";
    var s = size || 56;
    return '<img class="wisp-badge-img" src="' + src(def.img) + '" width="' + s + '" height="' + s + '" alt="' + esc(def.name) + '" loading="lazy" decoding="async">';
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
    byId: function (id) { return BY[id]; },
    categories: categories,
    earnedFrom: earnedFrom,
    tierLabel: function (t) { return TIER_LABEL[t] || ""; },
    inject: function () {}   // no-op; kept for API compatibility
  };
})();
