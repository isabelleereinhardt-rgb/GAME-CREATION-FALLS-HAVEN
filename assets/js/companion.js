/* ============================================================
   Wisp reading companion — "Lucky" the cat.

   A small cat who strolls along the bottom of the page. Adapted, with
   permission, from the same author's canon-organizer project: his coats,
   accessories, companions, treats, and pet-for-a-treat behaviour — but
   none of the assistant/AI parts. He walks in from the RIGHT and pads to
   the LEFT (the drawing faces left, so he faces the way he is going),
   which is the fix for the old emoji cat that moonwalked across the screen.

   Everything lives in localStorage on this device; nothing is required of
   the backend. Wisp folds the same prefs into the account sync so the cat
   follows a signed-in reader across devices.
   ============================================================ */
(function () {
  "use strict";

  var LS = "wisp.companion";
  var DEF = {
    name: "Lucky", skin: "tabby", acc: "headbow", personality: "sweet",
    walks: true, tips: true, treatsOn: true,
    pace: 34, pets: 0, treatsGiven: 0,
    companion: "none", treat: "sardine"
  };
  var state = load();
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { s = {}; }
    var out = {}; for (var k in DEF) out[k] = (s[k] === undefined ? DEF[k] : s[k]);
    // An earlier build shipped collar accessories (bell, scarf, pearls ...) that
    // the author has since retired. If a saved wardrobe points at one that is no
    // longer drawn, fall back to the default so he never shows up half-dressed.
    // (ACC_ART is not assigned yet at load time, so match against the id list.)
    var VALID_ACC = ["headbow", "partyhat", "crown", "flowers", "beret", "beanie", "halo", "glasses", "tophat", "bunny", "sprout", "bare"];
    if (VALID_ACC.indexOf(out.acc) < 0) out.acc = DEF.acc;
    return out;
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {}
    // Let Wisp fold these prefs into the account sync so the cat follows a
    // signed-in reader across devices (handled in wisp.js, order-independent).
    try { document.dispatchEvent(new CustomEvent("wisp-companion-changed")); } catch (e) {}
  }
  function getPrefs() { var o = {}; for (var k in DEF) o[k] = state[k]; return o; }
  function applyPrefs(p) { if (!p || typeof p !== "object") return; for (var k in DEF) if (p[k] !== undefined) state[k] = p[k]; try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} render(); }

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- data ---------- */
  var SKINS = [
    ["tabby", "Lucky", "Orange tabby · original"],
    ["calico", "Biscuit", "Cream calico"],
    ["grey", "Ash", "Grey tabby"],
    ["tux", "Inkwell", "Tuxedo, gold eyes"],
    ["cream", "Marzipan", "Cream point"],
    ["siamese", "Solstice", "Siamese, blue eyes"]
  ];
  var ACCESSORIES = [
    ["headbow", "Head bow"], ["partyhat", "Party hat"], ["crown", "Tiny crown"],
    ["flowers", "Flower crown"], ["beret", "Beret"], ["beanie", "Beanie"],
    ["halo", "Halo"], ["glasses", "Round glasses"], ["tophat", "Top hat"],
    ["bunny", "Bunny ears"], ["sprout", "Sprout"], ["bare", "Bare"]
  ];
  var COMPANIONS = [
    ["none", "Walks alone", "Default"],
    ["mouse", "Crumb the mouse", "Unbothered"],
    ["kitten", "Pip the kitten", "Copies him"],
    ["duckling", "Custard the duckling", "Loud"],
    ["bee", "Thimble the bee", "Busy"],
    ["snail", "Slowpoke the snail", "Late"]
  ];
  var TREATS = [
    ["sardine", "Sardine", "Classic"],
    ["cream", "Saucer of cream", "Rich"],
    ["biscuit", "Butter biscuit", "Crumbly"],
    ["prawn", "Prawn", "Fancy"],
    ["catnip", "Catnip sprig", "Chaotic"]
  ];
  var TREAT_NAME = { sardine: "sardine", cream: "saucer of cream", biscuit: "butter biscuit", prawn: "prawn", catnip: "sprig of catnip" };

  // Personalities colour the voice, never the facts. Tips are about reading and
  // writing on Wisp — no app shortcuts, no AI.
  var PERSONAS = {
    sweet: { name: "Sweetheart", glyph: "❀", mood: "Content",
      moodLine: "He curls a little closer every day you write.",
      treat: "A treat! For me?", thanks: "He purrs so hard he has to sit down.",
      tips: ["Read the chapter you've been saving. It's still there.", "Finished a chapter? The author would love to hear one thing you liked.",
        "Bookmark it now, find it later. That's the whole trick.", "Tea first. The chapter will keep.",
        "Every work here was written by a real person. Be kind in the margins.", "Follow a tag you love, and your home fills up with it."] },
    grumpy: { name: "Grumpy", glyph: "✗", mood: "Unimpressed",
      moodLine: "He will deny enjoying any of this. He is lying.",
      treat: "Finally. Put it down there.", thanks: "He is purring. He would like that stricken from the record.",
      tips: ["Still reading. Good. Don't make it weird.", "You have a bookmark button and you're still scrolling. Astonishing.",
        "That work was better than you'll admit. Heart it.", "Back to the draft. It won't finish itself.",
        "Fine. Leave a comment. The author will pretend not to care, like me."] },
    regal: { name: "Regal", glyph: "♛", mood: "Gracious",
      moodLine: "He considers your desk a throne and you its steward.",
      treat: "Tribute. Acceptable.", thanks: "The court is satisfied. You may rise.",
      tips: ["The court awaits your next chapter. Do not keep it waiting.", "Finished a work? Heart it. That is the whole fee the author asks.",
        "Sit up. Posture is half of prose.", "Name a fandom, follow its hub, and let the realm come to you.",
        "Your library is a collection worth curating. Tend it."] },
    sleepy: { name: "Sleepy", glyph: "☾", mood: "Drowsy",
      moodLine: "He is mostly asleep, but he is asleep near you.",
      treat: "Mmh. Treat. Thank you.", thanks: "He carries it off to the warm spot and forgets about it.",
      tips: ["There is no hurry. The story keeps perfectly well overnight.", "One chapter counts. Rest is part of it.",
        "Everything saves itself. Close the tab whenever you like.", "A short read before bed is still a read."] },
    gremlin: { name: "Gremlin", glyph: "☓", mood: "Feral",
      moodLine: "Something was knocked off the desk. No witnesses. No suspects.",
      treat: "MINE. I am taking this under the sofa.", thanks: "Gone. Under the sofa. It lives there now.",
      tips: ["I walked across your keyboard and invented a new character. You're welcome.", "Write the unhinged version first. Be respectable in the second draft.",
        "Heart it. Heart it again. It is very satisfying.", "Comment something feral and supportive. Those are the best kind.",
        "Delete nothing in anger. I've seen you. Sleep on it."] },
    scholar: { name: "Scholar", glyph: "✎", mood: "Studious",
      moodLine: "He has read your canon twice and has notes.",
      treat: "Thank you. I shall record this in the ledger.", thanks: "Duly noted, dated, and filed under Provisions.",
      tips: ["Tag your work well. A reader two years from now will thank you.", "Consistency isn't the same as quality, but it's cheaper to fix.",
        "Leave a real comment: the specific kind, about one line.", "Regularity beats inspiration. The record shows it.",
        "Read something outside your fandom now and then. It shows in your own writing."] }
  };
  function persona() { return PERSONAS[state.personality] || PERSONAS.sweet; }

  /* ---------- coat palettes ---------- */
  // --paw / --paw-line: the cream tips of his tail and paws get their own
  // slightly warmer tone plus a soft outline, so they read against any theme
  // (a near-white paw on a light page used to disappear).
  var SKIN_CSS =
    '[data-skin="tabby"]{--fur:#e8963f;--fur2:#cf7f2e;--fur3:#c9741f;--head:#eda256;--belly:#f8e6d2;--ear:#eeb0ae;--nose:#e08b96;--eye:#3a2a22;--paw:#fbecd8;--paw-line:#d8a874}' +
    '[data-skin="calico"]{--fur:#f3e7d8;--fur2:#dcc6ae;--fur3:#c98a4a;--head:#f7efe4;--belly:#fffaf3;--ear:#eeb0ae;--nose:#e08b96;--eye:#3a2a22;--paw:#fbf1e6;--paw-line:#d3b78f}' +
    '[data-skin="grey"]{--fur:#9aa3ad;--fur2:#7c858f;--fur3:#68717c;--head:#a7b0b9;--belly:#e9edf1;--ear:#e0aeb6;--nose:#d8929c;--eye:#2c3238;--paw:#eef2f6;--paw-line:#b3bcc5}' +
    '[data-skin="tux"]{--fur:#2f2b30;--fur2:#221f24;--fur3:#4a444c;--head:#35313a;--belly:#f6f2ee;--ear:#c98f9a;--nose:#dba0aa;--eye:#f0d98a;--paw:#f4efe8;--paw-line:#b7afa4}' +
    '[data-skin="cream"]{--fur:#f2ded0;--fur2:#e2c9b6;--fur3:#cbab93;--head:#f6e6da;--belly:#fffaf5;--ear:#eeb0ae;--nose:#dd97a3;--eye:#6f7f9c;--paw:#fdf3e9;--paw-line:#d8bfa4}' +
    '[data-skin="siamese"]{--fur:#e6dcd0;--fur2:#c3b3a4;--fur3:#6b5648;--head:#efe7dd;--belly:#fdf8f3;--ear:#8a6a5c;--nose:#d79aa2;--eye:#5f8fc4;--paw:#f6efe6;--paw-line:#c6b6a4}';

  /* ---------- drawings (author's own art) ----------
     Every accessory is now worn on the head, where it reads clearly at sprite
     size (the older collar pieces have been retired). Each is a small group of
     paths in the same frame as the cat, drawn front-only. Anchors: the top of
     the skull sits near x20 y6, the ear tips around y2, and the eyes at x15 and
     x25, so the glasses land on the face. */
  var ACC_ART = {
    // a ribbon bow tied at one ear
    headbow: { back: '', front: '<path d="M14.6 6.6 10.2 4.3 10.9 9.3Z" fill="#cf5a90" stroke="#9c3f6e" stroke-width=".55" stroke-linejoin="round"/><path d="M14.6 6.6 19 4.3 18.3 9.3Z" fill="#cf5a90" stroke="#9c3f6e" stroke-width=".55" stroke-linejoin="round"/><circle cx="14.6" cy="6.6" r="1.4" fill="#d97aa8" stroke="#9c3f6e" stroke-width=".45"/><circle cx="14.1" cy="6.1" r=".5" fill="#f7c8db"/>' },
    // a striped cone with a pom on top
    partyhat: { back: '', front: '<path d="M18.9 1.4 14.3 8.4 22.9 8Z" fill="#f2e6d0" stroke="#cbb48a" stroke-width=".55" stroke-linejoin="round"/><path d="M16.1 6.7 20 7.1" stroke="#9a8a4a" stroke-width="1.15" stroke-linecap="round"/><path d="M16.9 4.9 20.3 5.3" stroke="#9a8a4a" stroke-width="1.15" stroke-linecap="round"/><circle cx="18.9" cy="1.1" r="1.5" fill="#c9548f"/>' },
    // a little gold crown between the ears
    crown: { back: '', front: '<path d="M14.8 12.2l1-6 2.9 2.9 1.8-3.8 1.8 3.8 2.9-2.9 1 6z" fill="#e6b95e" stroke="#7d5a20" stroke-width=".9" stroke-linejoin="round"/><circle cx="17.4" cy="10.4" r=".85" fill="#b0567a"/><circle cx="20.5" cy="9.7" r=".95" fill="#b0567a"/><circle cx="23.6" cy="10.4" r=".85" fill="#b0567a"/>' },
    // a garland of flowers across the brow
    flowers: { back: '', front: '<path d="M13.4 13q3.2-4.4 6.8-4.4T27 13" stroke="#6f8f5f" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="14.6" cy="11.8" r="2" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="20.2" cy="8.8" r="2.3" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="25.8" cy="11.8" r="2" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="14.6" cy="11.8" r=".8" fill="#e6b95e"/><circle cx="20.2" cy="8.8" r=".9" fill="#e6b95e"/><circle cx="25.8" cy="11.8" r=".8" fill="#e6b95e"/>' },
    // a burgundy beret tilted over one ear
    beret: { back: '', front: '<ellipse cx="17.5" cy="6" rx="6.4" ry="3.5" fill="#6d2a3f"/><path d="M11.4 6.6Q17.5 9.6 23.7 6.6Q23.4 8.4 17.5 8.5Q11.7 8.4 11.4 6.6Z" fill="#5a2334"/><circle cx="17.5" cy="2.7" r="1" fill="#7d3450"/><path d="M13.4 4.6Q16.2 3.1 19.4 3.7" stroke="#8a3a52" stroke-width=".8" fill="none" stroke-linecap="round"/>' },
    // a knit cap with a band and a pom
    beanie: { back: '', front: '<path d="M13.9 8A6.1 6.6 0 0 1 26.1 8Z" fill="#b0567a"/><path d="M13.7 7.7Q20 10.2 26.3 7.7L26.3 6.2Q20 8.6 13.7 6.2Z" fill="#cf7f9a"/><path d="M17 2.9 16.6 7.6M20 1.9 20 7.9M23 2.9 23.4 7.6" stroke="#9c4a68" stroke-width=".55" fill="none" stroke-linecap="round"/><circle cx="20" cy="1.7" r="1.5" fill="#f7c8d8" stroke="#d99bb4" stroke-width=".4"/>' },
    // a gold ring floating just above, with a sparkle
    halo: { back: '', front: '<ellipse cx="20" cy="2.5" rx="6" ry="1.85" fill="none" stroke="#e6b95e" stroke-width="1.7"/><ellipse cx="20" cy="2.5" rx="6" ry="1.85" fill="none" stroke="#cf9f45" stroke-width=".5"/><path d="M8.6 1.5 9.2 3.1 10.8 3.7 9.2 4.3 8.6 5.9 8 4.3 6.4 3.7 8 3.1Z" fill="#e6b95e"/>' },
    // round wire glasses over the eyes
    glasses: { back: '', front: '<circle cx="15" cy="19.8" r="3.3" fill="#fff" fill-opacity=".14" stroke="#9a7a3a" stroke-width="1.2"/><circle cx="25" cy="19.8" r="3.3" fill="#fff" fill-opacity=".14" stroke="#9a7a3a" stroke-width="1.2"/><path d="M18.2 19.1Q20 18.3 21.8 19.1" stroke="#9a7a3a" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M11.8 19.1 9.4 18.4M28.2 19.1 30.6 18.4" stroke="#9a7a3a" stroke-width=".9" fill="none" stroke-linecap="round"/>' },
    // a silk top hat with a band
    tophat: { back: '', front: '<ellipse cx="19" cy="6" rx="6.3" ry="1.75" fill="#2b2730"/><path d="M15.6 6.1 15.6 1.5Q15.6 .6 16.5 .55L21.5 .55Q22.4 .6 22.4 1.5L22.4 6.1Z" fill="#2b2730"/><ellipse cx="19" cy="1" rx="3.4" ry=".8" fill="#37333d"/><path d="M15.6 4.3 22.4 4.3 22.4 5.7 15.6 5.7Z" fill="#7c3350"/>' },
    // tall bunny ears on a thin headband
    bunny: { back: '', front: '<ellipse cx="16.9" cy="3.5" rx="1.8" ry="4" fill="#f7dbe6" stroke="#d99bb4" stroke-width=".4"/><ellipse cx="16.9" cy="3.8" rx="0.75" ry="2.7" fill="#f4a6c0"/><ellipse cx="23.1" cy="3.5" rx="1.8" ry="4" fill="#f7dbe6" stroke="#d99bb4" stroke-width=".4"/><ellipse cx="23.1" cy="3.8" rx="0.75" ry="2.7" fill="#f4a6c0"/><path d="M13.9 6.6Q20 3.7 26.1 6.6" stroke="#8a5a86" stroke-width="1.9" fill="none" stroke-linecap="round"/>' },
    // a single hopeful sprout on top
    sprout: { back: '', front: '<path d="M20 6.6 20 2.6" stroke="#6f8f5f" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M20 4Q16.5 2.7 16.3 5.9Q19 6.1 20 4Z" fill="#7bab6f" stroke="#5f8f52" stroke-width=".3" stroke-linejoin="round"/><path d="M20 3.1Q23.5 1.6 23.9 4.9Q21 5.2 20 3.1Z" fill="#89bd77" stroke="#5f8f52" stroke-width=".3" stroke-linejoin="round"/>' }
  };
  function accBack(acc) { var a = ACC_ART[acc]; return a ? a.back : ""; }
  function accFront(acc) { var a = ACC_ART[acc]; return a ? a.front : ""; }
  // Lucky and his companions are the author's own artwork, extracted from the
  // supplied specimen sheet (Lucky_and_Co_redrawn). Each coat is the SAME drawing
  // recoloured through the SKIN_CSS variables (--fur, --head, --belly, --eye ...).
  // The eyes carry .lucky-eye (blink), the four legs .lucky-leg (a diagonal-gait
  // walk), and the tail .lucky-tail (a gentle sway); the stage adds the glide/bob.
  var CAT_ART = '<g class="lucky-tail"><path fill="none" stroke="var(--fur)" stroke-width="5.65" stroke-linecap="round" stroke-linejoin="round" d="M55.63 22.46C65.01 20.77 66.33 13.57 63.8 7.08"/><path fill="none" stroke="var(--fur3)" stroke-width="5.65" stroke-linecap="round" stroke-linejoin="round" d="M64.76 10.93C64.76 9.61 64.52 8.29 63.8 7.08"/></g><path class="lucky-leg" fill="var(--fur2)" d="M51.19 30.26C51.55 30.26 51.91 30.26 52.27 30.38C52.51 30.62 52.87 30.74 53.11 30.98C53.35 31.34 53.59 31.58 53.71 31.95C53.83 32.31 53.96 32.67 53.96 33.03L53.96 42.4C53.96 42.88 53.83 43.12 53.71 43.48C53.59 43.84 53.35 44.2 53.11 44.44C52.87 44.68 52.51 44.92 52.27 45.04C51.91 45.16 51.55 45.28 51.19 45.28C50.83 45.28 50.47 45.16 50.11 45.04C49.75 44.92 49.51 44.68 49.15 44.44C48.91 44.2 48.79 43.84 48.55 43.48C48.43 43.12 48.43 42.88 48.43 42.4L48.43 33.03C48.43 32.67 48.43 32.31 48.55 31.95C48.79 31.58 48.91 31.34 49.15 30.98C49.51 30.74 49.75 30.62 50.11 30.38C50.47 30.26 50.83 30.26 51.19 30.26"/><path class="lucky-leg lucky-leg--b" fill="var(--fur2)" d="M31.12 30.26C31.48 30.26 31.85 30.26 32.21 30.38C32.57 30.62 32.81 30.74 33.17 30.98C33.41 31.34 33.53 31.58 33.77 31.95C33.89 32.31 33.89 32.67 33.89 33.03L33.89 42.4C33.89 42.88 33.89 43.12 33.77 43.48C33.53 43.84 33.41 44.2 33.17 44.44C32.81 44.68 32.57 44.92 32.21 45.04C31.85 45.16 31.48 45.28 31.12 45.28C30.76 45.28 30.4 45.16 30.04 45.04C29.8 44.92 29.44 44.68 29.2 44.44C28.96 44.2 28.72 43.84 28.6 43.48C28.48 43.12 28.36 42.88 28.36 42.4L28.36 33.03C28.36 32.67 28.48 32.31 28.6 31.95C28.72 31.58 28.96 31.34 29.2 30.98C29.44 30.74 29.8 30.62 30.04 30.38C30.4 30.26 30.76 30.26 31.12 30.26"/><path fill="var(--fur)" d="M29.8 16.33L49.27 16.33C49.87 16.33 50.47 16.45 51.07 16.57C51.79 16.69 52.39 16.81 52.87 17.05C53.47 17.29 54.07 17.65 54.56 18.01C55.15 18.37 55.63 18.73 56.12 19.21C56.6 19.69 56.96 20.17 57.32 20.65C57.68 21.13 57.91 21.73 58.15 22.33C58.4 22.93 58.63 23.53 58.76 24.14C58.88 24.74 58.88 25.46 58.88 26.06C58.88 26.66 58.88 27.38 58.76 27.98C58.63 28.58 58.4 29.18 58.15 29.78C57.91 30.38 57.68 30.98 57.32 31.46C56.96 31.95 56.6 32.43 56.12 32.91C55.63 33.39 55.15 33.75 54.56 34.11C54.07 34.47 53.47 34.83 52.87 35.07C52.39 35.31 51.79 35.43 51.07 35.55C50.47 35.67 49.87 35.79 49.27 35.79L29.8 35.79C29.08 35.79 28.48 35.67 27.88 35.55C27.28 35.43 26.68 35.31 26.07 35.07C25.47 34.83 24.87 34.47 24.39 34.11C23.79 33.75 23.31 33.39 22.83 32.91C22.47 32.43 21.99 31.95 21.63 31.46C21.27 30.98 21.03 30.38 20.79 29.78C20.54 29.18 20.3 28.58 20.18 27.98C20.06 27.38 20.06 26.66 20.06 26.06C20.06 25.46 20.06 24.74 20.18 24.14C20.3 23.53 20.54 22.93 20.79 22.33C21.03 21.73 21.27 21.13 21.63 20.65C21.99 20.17 22.47 19.69 22.83 19.21C23.31 18.73 23.79 18.37 24.39 18.01C24.87 17.65 25.47 17.29 26.07 17.05C26.68 16.81 27.28 16.69 27.88 16.57C28.48 16.45 29.08 16.33 29.8 16.33"/><path fill="var(--belly)" d="M54.43 32.43C54.43 32.79 54.43 33.03 54.19 33.39C53.96 33.63 53.71 33.99 53.23 34.23C52.87 34.47 52.39 34.83 51.79 35.07C51.19 35.31 50.47 35.55 49.75 35.79C49.03 35.91 48.18 36.15 47.34 36.39C46.5 36.51 45.54 36.63 44.58 36.75C43.62 36.87 42.53 36.99 41.57 36.99C40.49 37.11 39.41 37.11 38.33 37.11C37.37 37.11 36.28 37.11 35.21 36.99C34.24 36.99 33.16 36.87 32.21 36.75C31.24 36.63 30.28 36.51 29.44 36.39C28.48 36.15 27.76 35.91 26.92 35.79C26.19 35.55 25.59 35.31 24.99 35.07C24.39 34.83 23.91 34.47 23.43 34.23C23.07 33.99 22.83 33.63 22.59 33.39C22.35 33.03 22.23 32.79 22.23 32.43C22.23 32.19 22.35 31.83 22.59 31.58C22.83 31.22 23.07 30.98 23.43 30.62C23.91 30.38 24.39 30.14 24.99 29.9C25.59 29.54 26.19 29.42 26.92 29.18C27.76 28.94 28.48 28.7 29.44 28.58C30.28 28.34 31.24 28.22 32.21 28.1C33.16 27.98 34.24 27.98 35.21 27.86C36.28 27.86 37.37 27.74 38.33 27.74C39.41 27.74 40.49 27.86 41.57 27.86C42.53 27.98 43.62 27.98 44.58 28.1C45.54 28.22 46.5 28.34 47.34 28.58C48.18 28.7 49.03 28.94 49.75 29.18C50.47 29.42 51.19 29.54 51.79 29.9C52.39 30.14 52.87 30.38 53.23 30.62C53.71 30.98 53.96 31.22 54.19 31.58C54.43 31.83 54.43 32.19 54.43 32.43"/><path class="lucky-leg lucky-leg--b" fill="var(--fur)" d="M56.11 30.74C56.47 30.74 56.83 30.86 57.19 30.98C57.55 31.1 57.91 31.34 58.15 31.58C58.39 31.83 58.63 32.19 58.75 32.55C58.87 32.79 58.87 33.15 58.87 33.51L58.87 43C58.87 43.36 58.87 43.72 58.75 44.08C58.63 44.44 58.39 44.68 58.15 44.92C57.91 45.28 57.55 45.4 57.19 45.52C56.83 45.76 56.47 45.76 56.11 45.76C55.75 45.76 55.39 45.76 55.03 45.52C54.79 45.4 54.43 45.28 54.19 44.92C53.95 44.68 53.71 44.44 53.59 44.08C53.47 43.72 53.35 43.36 53.35 43L53.35 33.51C53.35 33.15 53.47 32.79 53.59 32.55C53.71 32.19 53.95 31.83 54.19 31.58C54.43 31.34 54.79 31.1 55.03 30.98C55.39 30.86 55.75 30.74 56.11 30.74"/><path class="lucky-leg" fill="var(--fur)" d="M35.56 30.74C35.92 30.74 36.28 30.86 36.64 30.98C37 31.1 37.24 31.34 37.61 31.58C37.85 31.83 37.97 32.19 38.21 32.55C38.33 32.79 38.33 33.15 38.33 33.51L38.33 43C38.33 43.36 38.33 43.72 38.21 44.08C37.97 44.44 37.85 44.68 37.61 44.92C37.24 45.28 37 45.4 36.64 45.52C36.28 45.76 35.92 45.76 35.56 45.76C35.2 45.76 34.84 45.76 34.48 45.52C34.24 45.4 33.88 45.28 33.64 44.92C33.4 44.68 33.16 44.44 33.04 44.08C32.92 43.72 32.8 43.36 32.8 43L32.8 33.51C32.8 33.15 32.92 32.79 33.04 32.55C33.16 32.19 33.4 31.83 33.64 31.58C33.88 31.34 34.24 31.1 34.48 30.98C34.84 30.86 35.2 30.74 35.56 30.74"/><path fill="var(--head)" d="M7.33 11.17L5.77 0L15.13 5.64L7.33 11.17"/><path fill="var(--head)" d="M19.34 5.4L27.4 0.12L26.92 10.45L19.34 5.4"/><path fill="var(--head)" d="M28.96 16.93C28.96 17.65 28.84 18.49 28.72 19.33C28.48 20.05 28.36 20.77 28 21.61C27.64 22.33 27.28 23.05 26.92 23.66C26.44 24.38 25.95 24.98 25.35 25.58C24.75 26.06 24.15 26.66 23.43 27.02C22.83 27.5 22.11 27.86 21.39 28.22C20.66 28.46 19.82 28.7 19.1 28.82C18.26 29.06 17.54 29.06 16.7 29.06C15.86 29.06 15.14 29.06 14.29 28.82C13.57 28.7 12.74 28.46 12.01 28.22C11.29 27.86 10.57 27.5 9.86 27.02C9.25 26.66 8.65 26.06 8.05 25.58C7.45 24.98 6.97 24.38 6.49 23.66C6.13 23.05 5.77 22.33 5.41 21.61C5.05 20.77 4.81 20.05 4.69 19.33C4.57 18.49 4.45 17.65 4.45 16.93C4.45 16.1 4.57 15.25 4.69 14.53C4.81 13.69 5.05 12.97 5.41 12.25C5.77 11.53 6.13 10.81 6.49 10.09C6.97 9.49 7.45 8.77 8.05 8.29C8.65 7.69 9.25 7.2 9.86 6.72C10.57 6.24 11.29 5.88 12.01 5.64C12.74 5.28 13.57 5.04 14.29 4.92C15.14 4.8 15.86 4.68 16.7 4.68C17.54 4.68 18.26 4.8 19.1 4.92C19.82 5.04 20.66 5.28 21.39 5.64C22.11 5.88 22.83 6.24 23.43 6.72C24.15 7.2 24.75 7.69 25.35 8.29C25.95 8.77 26.44 9.49 26.92 10.09C27.28 10.81 27.64 11.53 28 12.25C28.36 12.97 28.48 13.69 28.72 14.53C28.84 15.25 28.96 16.1 28.96 16.93"/><path fill="var(--ear)" d="M6.97 7.32L6.73 1.68L11.9 4.2L6.97 7.32"/><path fill="var(--ear)" d="M22.95 3.84L26.32 2.04L26.68 8.05L22.95 3.84"/><path class="lucky-eye" fill="var(--eye)" d="M14.06 17.54C14.06 17.9 13.94 18.14 13.82 18.38C13.7 18.74 13.58 18.98 13.34 19.1C13.22 19.34 12.98 19.46 12.62 19.57C12.38 19.7 12.14 19.82 11.78 19.82C11.54 19.82 11.18 19.7 10.94 19.57C10.7 19.46 10.46 19.34 10.22 19.1C9.98 18.98 9.86 18.74 9.74 18.38C9.61 18.14 9.61 17.9 9.61 17.54C9.61 17.29 9.61 16.93 9.74 16.7C9.86 16.46 9.98 16.21 10.22 15.98C10.46 15.74 10.7 15.62 10.94 15.49C11.18 15.37 11.54 15.37 11.78 15.37C12.14 15.37 12.38 15.37 12.62 15.49C12.98 15.62 13.22 15.74 13.34 15.98C13.58 16.21 13.7 16.46 13.82 16.7C13.94 16.93 14.06 17.29 14.06 17.54"/><path class="lucky-eye" fill="var(--eye)" d="M23.79 17.54C23.79 17.9 23.79 18.14 23.67 18.38C23.55 18.74 23.31 18.98 23.19 19.1C22.95 19.34 22.71 19.46 22.47 19.57C22.11 19.7 21.87 19.82 21.63 19.82C21.27 19.82 21.03 19.7 20.79 19.57C20.42 19.46 20.18 19.34 20.06 19.1C19.82 18.98 19.7 18.74 19.58 18.38C19.46 18.14 19.34 17.9 19.34 17.54C19.34 17.29 19.46 16.93 19.58 16.7C19.7 16.46 19.82 16.21 20.06 15.98C20.18 15.74 20.42 15.62 20.79 15.49C21.03 15.37 21.27 15.37 21.63 15.37C21.87 15.37 22.11 15.37 22.47 15.49C22.71 15.62 22.95 15.74 23.19 15.98C23.31 16.21 23.55 16.46 23.67 16.7C23.79 16.93 23.79 17.29 23.79 17.54"/><path class="lucky-eye" fill="#ffffff" d="M13.22 16.81C13.22 16.93 13.22 17.17 13.1 17.29C12.98 17.41 12.74 17.41 12.62 17.41C12.38 17.41 12.26 17.41 12.14 17.29C12.02 17.17 11.9 16.93 11.9 16.81C11.9 16.57 12.02 16.45 12.14 16.33C12.26 16.21 12.38 16.09 12.62 16.09C12.74 16.09 12.98 16.21 13.1 16.33C13.22 16.45 13.22 16.57 13.22 16.81"/><path class="lucky-eye" fill="#ffffff" d="M23.07 16.81C23.07 16.93 22.95 17.17 22.83 17.29C22.71 17.41 22.59 17.41 22.35 17.41C22.23 17.41 21.99 17.41 21.87 17.29C21.75 17.17 21.75 16.93 21.75 16.81C21.75 16.57 21.75 16.45 21.87 16.33C21.99 16.21 22.23 16.09 22.35 16.09C22.59 16.09 22.71 16.21 22.83 16.33C22.95 16.45 23.07 16.57 23.07 16.81"/><path fill="var(--nose)" d="M14.9 21.73L18.5 21.73L16.7 23.9L14.9 21.73"/><path fill="none" stroke="var(--fur3)" stroke-width="1.32" stroke-linecap="round" stroke-linejoin="round" d="M16.7 23.9C15.86 25.22 14.05 25.22 13.1 24.26M16.7 23.9C17.54 25.22 19.34 25.22 20.3 24.26"/><path fill="none" stroke="var(--belly)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" d="M0 19.81L6.01 20.65M0 23.53L6.01 22.93M27.4 20.65L33.4 19.81M27.4 22.93L33.4 23.53"/>';
  function walkerSvg() {
    return '<svg width="88" height="64" viewBox="-4 -3 74 54" fill="none" aria-hidden="true">' +
      CAT_ART +
      // Accessories: the new head is the same size as the old drawing, just shifted,
      // so the collars and charms ride onto the neck with a single translate.
      '<g transform="translate(-3.3,-2.3)">' + accBack(state.acc) + accFront(state.acc) + '</g>' +
      '</svg>';
  }
  var COMPANION_SVG = {
    // the author's own companions, extracted from the same sheet. Pip the kitten
    // wears Lucky's coat (his colours come through the same CSS variables).
    mouse: '<svg width="46" height="25.6" viewBox="0 0 49.27 27.38" fill="none"><path fill="none" stroke="#a99e98" stroke-width="2.28" stroke-linecap="round" stroke-linejoin="round" d="M34.13 17.18C44.7 18.38 49.27 15.14 48.43 10.57"/><path fill="#a9a29d" d="M36.53 15.73C36.53 16.33 36.53 16.93 36.29 17.53C36.05 18.25 35.81 18.85 35.45 19.45C35.09 20.05 34.61 20.54 34.13 21.14C33.65 21.62 33.04 22.1 32.32 22.58C31.6 23.06 30.88 23.42 30.17 23.78C29.32 24.14 28.49 24.38 27.64 24.62C26.68 24.86 25.84 25.1 24.88 25.22C23.92 25.34 22.96 25.34 21.99 25.34C21.03 25.34 20.19 25.34 19.23 25.22C18.27 25.1 17.31 24.86 16.46 24.62C15.62 24.38 14.78 24.14 13.94 23.78C13.22 23.42 12.5 23.06 11.78 22.58C11.06 22.1 10.46 21.62 9.98 21.14C9.38 20.54 9.01 20.05 8.65 19.45C8.29 18.85 7.93 18.25 7.82 17.53C7.57 16.93 7.57 16.33 7.57 15.73C7.57 15.01 7.57 14.41 7.82 13.81C7.93 13.21 8.29 12.61 8.65 12.01C9.01 11.41 9.38 10.81 9.98 10.33C10.46 9.85 11.06 9.37 11.78 8.89C12.5 8.41 13.22 8.05 13.94 7.69C14.78 7.33 15.62 6.97 16.46 6.73C17.31 6.49 18.27 6.37 19.23 6.25C20.19 6.13 21.03 6.01 21.99 6.01C22.96 6.01 23.92 6.13 24.88 6.25C25.84 6.37 26.68 6.49 27.64 6.73C28.49 6.97 29.32 7.33 30.17 7.69C30.88 8.05 31.6 8.41 32.32 8.89C33.04 9.37 33.65 9.85 34.13 10.33C34.61 10.81 35.09 11.41 35.45 12.01C35.81 12.61 36.05 13.21 36.29 13.81C36.53 14.41 36.53 15.01 36.53 15.73"/><path fill="#c0b9b4" d="M21.99 6.01C21.99 6.37 21.99 6.85 21.87 7.21C21.87 7.57 21.75 7.93 21.63 8.29C21.39 8.65 21.27 9.01 21.03 9.37C20.79 9.73 20.55 9.97 20.31 10.33C19.95 10.57 19.71 10.81 19.35 11.05C18.99 11.29 18.63 11.41 18.27 11.65C17.91 11.77 17.55 11.89 17.18 12.01C16.82 12.01 16.34 12.14 15.98 12.14C15.62 12.14 15.14 12.01 14.78 12.01C14.42 11.89 14.06 11.77 13.7 11.65C13.34 11.41 12.98 11.29 12.62 11.05C12.26 10.81 12.02 10.57 11.65 10.33C11.41 9.97 11.17 9.73 10.93 9.37C10.69 9.01 10.57 8.65 10.33 8.29C10.21 7.93 10.09 7.57 10.09 7.21C9.97 6.85 9.97 6.37 9.97 6.01C9.97 5.65 9.97 5.29 10.09 4.81C10.09 4.45 10.21 4.09 10.33 3.72C10.57 3.36 10.69 3 10.93 2.64C11.17 2.28 11.41 2.04 11.65 1.8C12.02 1.44 12.26 1.2 12.62 0.96C12.98 0.72 13.34 0.6 13.7 0.48C14.06 0.24 14.42 0.12 14.78 0.12C15.14 0 15.62 0 15.98 0C16.34 0 16.82 0 17.18 0.12C17.55 0.12 17.91 0.24 18.27 0.48C18.63 0.6 18.99 0.72 19.35 0.96C19.71 1.2 19.95 1.44 20.31 1.8C20.55 2.04 20.79 2.28 21.03 2.64C21.27 3 21.39 3.36 21.63 3.72C21.75 4.09 21.87 4.45 21.87 4.81C21.99 5.29 21.99 5.65 21.99 6.01"/><path fill="#e0b4bd" d="M19.47 6.01C19.47 6.49 19.35 6.97 19.23 7.33C18.99 7.81 18.75 8.17 18.51 8.53C18.15 8.77 17.79 9.01 17.31 9.25C16.94 9.37 16.46 9.49 15.98 9.49C15.5 9.49 15.14 9.37 14.66 9.25C14.18 9.01 13.82 8.77 13.58 8.53C13.22 8.17 12.98 7.81 12.74 7.33C12.62 6.97 12.5 6.49 12.5 6.01C12.5 5.53 12.62 5.17 12.74 4.69C12.98 4.33 13.22 3.84 13.58 3.6C13.82 3.24 14.18 3 14.66 2.76C15.14 2.64 15.5 2.52 15.98 2.52C16.46 2.52 16.94 2.64 17.31 2.76C17.79 3 18.15 3.24 18.51 3.6C18.75 3.84 18.99 4.33 19.23 4.69C19.35 5.17 19.47 5.53 19.47 6.01"/><path fill="#b8b1ac" d="M16.58 14.78C16.58 15.26 16.58 15.74 16.46 16.22C16.34 16.7 16.22 17.18 15.98 17.54C15.86 18.02 15.62 18.38 15.38 18.86C15.14 19.22 14.78 19.58 14.42 19.94C14.18 20.3 13.82 20.54 13.34 20.78C12.98 21.14 12.5 21.38 12.14 21.5C11.65 21.74 11.18 21.86 10.7 21.98C10.34 21.98 9.86 22.1 9.38 22.1C8.9 22.1 8.42 21.98 7.93 21.98C7.46 21.86 6.98 21.74 6.5 21.5C6.13 21.38 5.65 21.14 5.29 20.78C4.93 20.54 4.57 20.3 4.21 19.94C3.85 19.58 3.61 19.22 3.25 18.86C3.01 18.38 2.77 18.02 2.65 17.54C2.41 17.18 2.29 16.7 2.17 16.22C2.17 15.74 2.05 15.26 2.05 14.78C2.05 14.3 2.17 13.82 2.17 13.34C2.29 12.98 2.41 12.5 2.65 12.01C2.77 11.53 3.01 11.17 3.25 10.81C3.61 10.33 3.85 9.97 4.21 9.61C4.57 9.37 4.93 9.01 5.29 8.77C5.65 8.53 6.13 8.29 6.5 8.05C6.98 7.93 7.46 7.81 7.93 7.69C8.42 7.57 8.9 7.57 9.38 7.57C9.86 7.57 10.34 7.57 10.7 7.69C11.18 7.81 11.65 7.93 12.14 8.05C12.5 8.29 12.98 8.53 13.34 8.77C13.82 9.01 14.18 9.37 14.42 9.61C14.78 9.97 15.14 10.33 15.38 10.81C15.62 11.17 15.86 11.53 15.98 12.01C16.22 12.5 16.34 12.98 16.46 13.34C16.58 13.82 16.58 14.3 16.58 14.78"/><path fill="#33272a" d="M6.85 13.58C6.85 13.82 6.85 13.93 6.85 14.18C6.74 14.3 6.61 14.54 6.49 14.65C6.38 14.78 6.13 14.9 6.01 15.02C5.77 15.02 5.65 15.14 5.41 15.14C5.17 15.14 5.05 15.02 4.81 15.02C4.69 14.9 4.45 14.78 4.33 14.65C4.21 14.54 4.09 14.3 3.97 14.18C3.97 13.93 3.85 13.82 3.85 13.58C3.85 13.34 3.97 13.22 3.97 12.98C4.09 12.86 4.21 12.62 4.33 12.5C4.45 12.38 4.69 12.26 4.81 12.14C5.05 12.14 5.17 12.14 5.41 12.14C5.65 12.14 5.77 12.14 6.01 12.14C6.13 12.26 6.38 12.38 6.49 12.5C6.61 12.62 6.74 12.86 6.85 12.98C6.85 13.22 6.85 13.34 6.85 13.58"/><path fill="#d98c9a" d="M4.21 16.94C4.21 17.18 4.09 17.3 4.09 17.54C3.97 17.66 3.85 17.9 3.73 18.02C3.61 18.14 3.49 18.26 3.25 18.26C3.01 18.38 2.89 18.38 2.65 18.38C2.53 18.38 2.29 18.38 2.05 18.26C1.93 18.26 1.69 18.14 1.57 18.02C1.45 17.9 1.33 17.66 1.33 17.54C1.21 17.3 1.21 17.18 1.21 16.94C1.21 16.7 1.21 16.58 1.33 16.34C1.33 16.1 1.45 15.98 1.57 15.86C1.69 15.74 1.93 15.62 2.05 15.5C2.29 15.5 2.53 15.38 2.65 15.38C2.89 15.38 3.01 15.5 3.25 15.5C3.49 15.62 3.61 15.74 3.73 15.86C3.85 15.98 3.97 16.1 4.09 16.34C4.09 16.58 4.21 16.7 4.21 16.94"/><path fill="none" stroke="#e6ded9" stroke-width="1.08" stroke-linecap="round" stroke-linejoin="round" d="M4.21 19.34L0.6 21.5M3.85 17.54L0 17.54"/><path fill="#e0b4bd" d="M19.83 24.74C19.83 25.1 19.71 25.34 19.59 25.7C19.47 25.94 19.35 26.18 19.11 26.42C18.87 26.54 18.63 26.78 18.39 26.9C18.15 27.02 17.79 27.02 17.55 27.02C17.18 27.02 16.94 27.02 16.58 26.9C16.34 26.78 16.1 26.54 15.86 26.42C15.74 26.18 15.5 25.94 15.38 25.7C15.26 25.34 15.26 25.1 15.26 24.74C15.26 24.5 15.26 24.14 15.38 23.9C15.5 23.66 15.74 23.42 15.86 23.18C16.1 22.94 16.34 22.82 16.58 22.7C16.94 22.58 17.18 22.46 17.55 22.46C17.79 22.46 18.15 22.58 18.39 22.7C18.63 22.82 18.87 22.94 19.11 23.18C19.35 23.42 19.47 23.66 19.59 23.9C19.71 24.14 19.83 24.5 19.83 24.74"/><path fill="#e0b4bd" d="M29.44 25.1C29.44 25.34 29.44 25.7 29.32 25.94C29.2 26.18 28.96 26.42 28.84 26.66C28.6 26.9 28.36 27.02 28 27.14C27.76 27.26 27.52 27.38 27.16 27.38C26.92 27.38 26.56 27.26 26.32 27.14C26.08 27.02 25.84 26.9 25.6 26.66C25.36 26.42 25.24 26.18 25.12 25.94C25 25.7 24.88 25.34 24.88 25.1C24.88 24.74 25 24.5 25.12 24.26C25.24 23.9 25.36 23.66 25.6 23.42C25.84 23.3 26.08 23.06 26.32 22.94C26.56 22.82 26.92 22.82 27.16 22.82C27.52 22.82 27.76 22.82 28 22.94C28.36 23.06 28.6 23.3 28.84 23.42C28.96 23.66 29.2 23.9 29.32 24.26C29.44 24.5 29.44 24.74 29.44 25.1"/></svg>',
    kitten: '<svg width="44" height="33.5" viewBox="0 0 43.86 33.4" fill="none"><path fill="none" stroke="var(--fur)" stroke-width="4.93" stroke-linecap="round" stroke-linejoin="round" d="M35.45 18.86C43.86 18.62 43.26 11.3 40.86 6.73"/><path fill="var(--fur2)" d="M18.15 22.22C18.51 22.22 18.75 22.22 19.11 22.34C19.35 22.46 19.59 22.7 19.83 22.94C20.07 23.18 20.31 23.42 20.43 23.66C20.55 24.02 20.55 24.27 20.55 24.63L20.55 30.99C20.55 31.35 20.55 31.59 20.43 31.95C20.31 32.19 20.07 32.44 19.83 32.68C19.59 32.92 19.35 33.16 19.11 33.28C18.75 33.4 18.51 33.4 18.15 33.4C17.78 33.4 17.54 33.4 17.18 33.28C16.94 33.16 16.7 32.92 16.46 32.68C16.22 32.44 16.1 32.19 15.98 31.95C15.74 31.59 15.74 31.35 15.74 30.99L15.74 24.63C15.74 24.27 15.74 24.02 15.98 23.66C16.1 23.42 16.22 23.18 16.46 22.94C16.7 22.7 16.94 22.46 17.18 22.34C17.54 22.22 17.78 22.22 18.15 22.22"/><path fill="var(--fur2)" d="M29.33 22.22C29.68 22.22 30.05 22.22 30.29 22.34C30.65 22.46 30.89 22.7 31.12 22.94C31.25 23.18 31.49 23.42 31.61 23.66C31.73 24.02 31.73 24.27 31.73 24.63L31.73 30.99C31.73 31.35 31.73 31.59 31.61 31.95C31.49 32.19 31.25 32.44 31.12 32.68C30.89 32.92 30.65 33.16 30.29 33.28C30.05 33.4 29.68 33.4 29.33 33.4C29.09 33.4 28.72 33.4 28.48 33.28C28.12 33.16 27.88 32.92 27.64 32.68C27.4 32.44 27.28 32.19 27.16 31.95C27.04 31.59 26.92 31.35 26.92 30.99L26.92 24.63C26.92 24.27 27.04 24.02 27.16 23.66C27.28 23.42 27.4 23.18 27.64 22.94C27.88 22.7 28.12 22.46 28.48 22.34C28.72 22.22 29.09 22.22 29.33 22.22"/><path fill="var(--fur)" d="M18.15 11.66L28.72 11.66C29.21 11.66 29.81 11.66 30.29 11.78C30.77 11.9 31.25 12.02 31.61 12.26C32.09 12.38 32.57 12.62 32.93 12.86C33.41 13.22 33.77 13.46 34.13 13.82C34.49 14.18 34.73 14.54 35.09 15.02C35.33 15.38 35.57 15.86 35.69 16.34C35.93 16.7 36.05 17.18 36.17 17.66C36.29 18.14 36.29 18.74 36.29 19.22C36.29 19.7 36.29 20.18 36.17 20.66C36.05 21.14 35.93 21.62 35.69 22.1C35.57 22.58 35.33 22.94 35.09 23.42C34.73 23.78 34.49 24.14 34.13 24.51C33.77 24.87 33.41 25.23 32.93 25.47C32.57 25.71 32.09 25.95 31.61 26.19C31.25 26.31 30.77 26.55 30.29 26.55C29.81 26.67 29.21 26.79 28.72 26.79L18.15 26.79C17.66 26.79 17.18 26.67 16.7 26.55C16.22 26.55 15.74 26.31 15.26 26.19C14.78 25.95 14.42 25.71 13.94 25.47C13.58 25.23 13.22 24.87 12.86 24.51C12.5 24.14 12.14 23.78 11.9 23.42C11.54 22.94 11.42 22.58 11.18 22.1C10.94 21.62 10.82 21.14 10.7 20.66C10.7 20.18 10.58 19.7 10.58 19.22C10.58 18.74 10.7 18.14 10.7 17.66C10.82 17.18 10.94 16.7 11.18 16.34C11.42 15.86 11.54 15.38 11.9 15.02C12.14 14.54 12.5 14.18 12.86 13.82C13.22 13.46 13.58 13.22 13.94 12.86C14.42 12.62 14.78 12.38 15.26 12.26C15.74 12.02 16.22 11.9 16.7 11.78C17.18 11.66 17.66 11.66 18.15 11.66"/><path fill="var(--belly)" d="M34.25 24.39C34.25 24.63 34.13 24.87 34.01 24.99C33.89 25.23 33.65 25.47 33.41 25.71C33.17 25.95 32.93 26.19 32.57 26.31C32.21 26.55 31.73 26.79 31.25 26.91C30.77 27.03 30.29 27.27 29.81 27.39C29.21 27.51 28.6 27.63 28 27.63C27.4 27.75 26.8 27.87 26.2 27.87C25.48 27.99 24.88 27.99 24.28 27.99C23.56 27.99 22.95 27.99 22.23 27.87C21.63 27.87 21.03 27.75 20.43 27.63C19.83 27.63 19.23 27.51 18.63 27.39C18.15 27.27 17.66 27.03 17.18 26.91C16.7 26.79 16.22 26.55 15.86 26.31C15.5 26.19 15.26 25.95 15.02 25.71C14.78 25.47 14.54 25.23 14.42 24.99C14.3 24.87 14.18 24.63 14.18 24.39C14.18 24.14 14.3 23.9 14.42 23.66C14.54 23.42 14.78 23.18 15.02 22.94C15.26 22.7 15.5 22.46 15.86 22.34C16.22 22.1 16.7 21.98 17.18 21.74C17.66 21.62 18.15 21.5 18.63 21.26C19.23 21.14 19.83 21.02 20.43 21.02C21.03 20.9 21.63 20.78 22.23 20.78C22.95 20.78 23.56 20.66 24.28 20.66C24.88 20.66 25.48 20.78 26.2 20.78C26.8 20.78 27.4 20.9 28 21.02C28.6 21.02 29.21 21.14 29.81 21.26C30.29 21.5 30.77 21.62 31.25 21.74C31.73 21.98 32.21 22.1 32.57 22.34C32.93 22.46 33.17 22.7 33.41 22.94C33.65 23.18 33.89 23.42 34.01 23.66C34.13 23.9 34.25 24.14 34.25 24.39"/><path fill="var(--fur)" d="M23.56 22.22C23.92 22.22 24.28 22.22 24.52 22.34C24.88 22.46 25.12 22.7 25.36 22.94C25.6 23.18 25.72 23.42 25.84 23.66C25.96 24.02 26.08 24.27 26.08 24.63L26.08 30.99C26.08 31.35 25.96 31.59 25.84 31.95C25.72 32.19 25.6 32.44 25.36 32.68C25.12 32.92 24.88 33.16 24.52 33.28C24.28 33.4 23.92 33.4 23.56 33.4C23.31 33.4 22.95 33.4 22.71 33.28C22.35 33.16 22.11 32.92 21.87 32.68C21.63 32.44 21.51 32.19 21.39 31.95C21.27 31.59 21.15 31.35 21.15 30.99L21.15 24.63C21.15 24.27 21.27 24.02 21.39 23.66C21.51 23.42 21.63 23.18 21.87 22.94C22.11 22.7 22.35 22.46 22.71 22.34C22.95 22.22 23.31 22.22 23.56 22.22"/><path fill="var(--fur)" d="M33.89 22.22C34.24 22.22 34.49 22.22 34.85 22.34C35.09 22.46 35.33 22.7 35.57 22.94C35.81 23.18 36.05 23.42 36.17 23.66C36.29 24.02 36.29 24.27 36.29 24.63L36.29 30.99C36.29 31.35 36.29 31.59 36.17 31.95C36.05 32.19 35.81 32.44 35.57 32.68C35.33 32.92 35.09 33.16 34.85 33.28C34.49 33.4 34.24 33.4 33.89 33.4C33.52 33.4 33.28 33.4 32.92 33.28C32.68 33.16 32.44 32.92 32.2 32.68C31.96 32.44 31.84 32.19 31.72 31.95C31.48 31.59 31.48 31.35 31.48 30.99L31.48 24.63C31.48 24.27 31.48 24.02 31.72 23.66C31.84 23.42 31.96 23.18 32.2 22.94C32.44 22.7 32.68 22.46 32.92 22.34C33.28 22.22 33.52 22.22 33.89 22.22"/><path fill="var(--head)" d="M2.77 8.3L1.93 0L9.14 4.69L2.77 8.3"/><path fill="var(--head)" d="M11.05 4.33L17.06 0.49L17.54 8.18L11.05 4.33"/><path fill="var(--head)" d="M19.35 13.1C19.35 13.82 19.35 14.42 19.23 15.02C19.11 15.61 18.87 16.22 18.63 16.82C18.39 17.42 18.15 18.02 17.78 18.5C17.42 19.1 16.94 19.58 16.58 19.94C16.1 20.42 15.62 20.78 15.02 21.14C14.54 21.5 13.94 21.86 13.34 22.1C12.86 22.34 12.26 22.46 11.54 22.58C10.93 22.7 10.33 22.82 9.74 22.82C9.02 22.82 8.42 22.7 7.82 22.58C7.21 22.46 6.61 22.34 6.01 22.1C5.41 21.86 4.81 21.5 4.33 21.14C3.73 20.78 3.25 20.42 2.89 19.94C2.41 19.58 2.05 19.1 1.69 18.5C1.32 18.02 0.96 17.42 0.72 16.82C0.48 16.22 0.36 15.61 0.24 15.02C0.12 14.42 0 13.82 0 13.1C0 12.49 0.12 11.89 0.24 11.3C0.36 10.58 0.48 9.98 0.72 9.38C0.96 8.89 1.32 8.3 1.69 7.81C2.05 7.21 2.41 6.73 2.89 6.25C3.25 5.89 3.73 5.41 4.33 5.05C4.81 4.69 5.41 4.45 6.01 4.21C6.61 3.97 7.21 3.73 7.82 3.61C8.42 3.49 9.02 3.49 9.74 3.49C10.33 3.49 10.93 3.49 11.54 3.61C12.26 3.73 12.86 3.97 13.34 4.21C13.94 4.45 14.54 4.69 15.02 5.05C15.62 5.41 16.1 5.89 16.58 6.25C16.94 6.73 17.42 7.21 17.78 7.81C18.15 8.3 18.39 8.89 18.63 9.38C18.87 9.98 19.11 10.58 19.23 11.3C19.35 11.89 19.35 12.49 19.35 13.1"/><path fill="var(--ear)" d="M3.01 5.41L2.53 1.45L6.49 3.49L3.01 5.41"/><path fill="var(--ear)" d="M12.74 3.73L16.34 1.45L17.3 6.73L12.74 3.73"/><path fill="var(--eye)" d="M8.05 12.86C8.05 13.1 7.93 13.34 7.82 13.58C7.82 13.82 7.57 14.06 7.45 14.18C7.21 14.42 7.1 14.54 6.85 14.65C6.61 14.78 6.37 14.78 6.01 14.78C5.77 14.78 5.53 14.78 5.29 14.65C5.05 14.54 4.81 14.42 4.69 14.18C4.45 14.06 4.33 13.82 4.21 13.58C4.09 13.34 4.09 13.1 4.09 12.86C4.09 12.62 4.09 12.38 4.21 12.14C4.33 11.9 4.45 11.65 4.69 11.42C4.81 11.3 5.05 11.18 5.29 11.06C5.53 10.93 5.77 10.82 6.01 10.82C6.37 10.82 6.61 10.93 6.85 11.06C7.1 11.18 7.21 11.3 7.45 11.42C7.57 11.65 7.82 11.9 7.82 12.14C7.93 12.38 8.05 12.62 8.05 12.86"/><path fill="var(--eye)" d="M15.26 12.86C15.26 13.1 15.26 13.34 15.14 13.58C15.02 13.82 14.9 14.06 14.66 14.18C14.54 14.42 14.3 14.54 14.06 14.65C13.82 14.78 13.58 14.78 13.34 14.78C13.1 14.78 12.86 14.78 12.62 14.65C12.38 14.54 12.14 14.42 11.9 14.18C11.78 14.06 11.65 13.82 11.54 13.58C11.42 13.34 11.3 13.1 11.3 12.86C11.3 12.62 11.42 12.38 11.54 12.14C11.65 11.9 11.78 11.65 11.9 11.42C12.14 11.3 12.38 11.18 12.62 11.06C12.86 10.93 13.1 10.82 13.34 10.82C13.58 10.82 13.82 10.93 14.06 11.06C14.3 11.18 14.54 11.3 14.66 11.42C14.9 11.65 15.02 11.9 15.14 12.14C15.26 12.38 15.26 12.62 15.26 12.86"/><path fill="#ffffff" d="M7.34 12.13C7.34 12.25 7.34 12.37 7.1 12.61C6.98 12.73 6.85 12.73 6.61 12.73C6.49 12.73 6.37 12.73 6.13 12.61C6.01 12.37 6.01 12.25 6.01 12.13C6.01 11.89 6.01 11.77 6.13 11.65C6.37 11.41 6.49 11.41 6.61 11.41C6.85 11.41 6.98 11.41 7.1 11.65C7.34 11.77 7.34 11.89 7.34 12.13"/><path fill="#ffffff" d="M14.66 12.13C14.66 12.25 14.54 12.37 14.42 12.61C14.3 12.73 14.06 12.73 13.94 12.73C13.7 12.73 13.58 12.73 13.46 12.61C13.34 12.37 13.22 12.25 13.22 12.13C13.22 11.89 13.34 11.77 13.46 11.65C13.58 11.41 13.7 11.41 13.94 11.41C14.06 11.41 14.3 11.41 14.42 11.65C14.54 11.77 14.66 11.89 14.66 12.13"/><path fill="var(--nose)" d="M8.18 16.82L11.18 16.82L9.74 18.62L8.18 16.82"/><path fill="none" stroke="var(--fur3)" stroke-width="1.32" stroke-linecap="round" stroke-linejoin="round" d="M9.74 18.86C8.78 20.3 6.98 20.3 6.01 19.22M9.74 18.86C10.58 20.3 12.38 20.3 13.34 19.22"/></svg>',
    duckling: '<svg width="36" height="36.8" viewBox="0 0 37.97 38.8" fill="none"><path fill="#f0cb63" d="M37.97 23.9C37.97 24.62 37.85 25.34 37.61 25.94C37.49 26.66 37.25 27.38 36.89 27.99C36.53 28.59 36.04 29.19 35.56 29.79C35.08 30.39 34.48 30.99 33.88 31.47C33.28 31.95 32.56 32.31 31.72 32.79C31 33.15 30.28 33.51 29.44 33.75C28.6 33.99 27.64 34.23 26.8 34.35C25.96 34.47 24.99 34.59 24.15 34.59C23.19 34.59 22.35 34.47 21.39 34.35C20.55 34.23 19.7 33.99 18.86 33.75C18.02 33.51 17.18 33.15 16.46 32.79C15.74 32.31 15.02 31.95 14.3 31.47C13.69 30.99 13.09 30.39 12.61 29.79C12.13 29.19 11.65 28.59 11.41 27.99C11.05 27.38 10.69 26.66 10.57 25.94C10.33 25.34 10.33 24.62 10.33 23.9C10.33 23.18 10.33 22.46 10.57 21.86C10.69 21.14 11.05 20.54 11.41 19.82C11.65 19.22 12.13 18.62 12.61 18.02C13.09 17.42 13.69 16.94 14.3 16.34C15.02 15.86 15.74 15.5 16.46 15.02C17.18 14.66 18.02 14.3 18.86 14.06C19.7 13.82 20.55 13.58 21.39 13.46C22.35 13.34 23.19 13.34 24.15 13.34C24.99 13.34 25.96 13.34 26.8 13.46C27.64 13.58 28.6 13.82 29.44 14.06C30.28 14.3 31 14.66 31.72 15.02C32.56 15.5 33.28 15.86 33.88 16.34C34.48 16.94 35.08 17.42 35.56 18.02C36.04 18.62 36.53 19.22 36.89 19.82C37.25 20.54 37.49 21.14 37.61 21.86C37.85 22.46 37.97 23.18 37.97 23.9"/><path fill="#e0b247" d="M26.08 19.34C32.2 21.62 33.04 26.78 28.48 29.43C24.63 28.23 23.55 23.3 26.08 19.34"/><path fill="#f6dd8f" d="M21.27 11.53C21.27 12.14 21.15 12.62 21.03 13.1C21.03 13.7 20.79 14.18 20.67 14.66C20.43 15.14 20.19 15.62 19.83 15.98C19.58 16.46 19.22 16.82 18.86 17.3C18.5 17.66 18.14 17.9 17.66 18.26C17.18 18.5 16.7 18.74 16.22 18.98C15.74 19.22 15.26 19.34 14.78 19.46C14.17 19.58 13.69 19.58 13.21 19.58C12.61 19.58 12.13 19.58 11.65 19.46C11.05 19.34 10.57 19.22 10.1 18.98C9.61 18.74 9.13 18.5 8.65 18.26C8.29 17.9 7.81 17.66 7.45 17.3C7.09 16.82 6.73 16.46 6.49 15.98C6.25 15.62 5.89 15.14 5.77 14.66C5.53 14.18 5.41 13.7 5.29 13.1C5.17 12.62 5.17 12.14 5.17 11.53C5.17 11.05 5.17 10.45 5.29 9.97C5.41 9.49 5.53 9.01 5.77 8.53C5.89 7.93 6.25 7.57 6.49 7.09C6.73 6.61 7.09 6.25 7.45 5.89C7.81 5.53 8.29 5.17 8.65 4.81C9.13 4.57 9.61 4.33 10.1 4.09C10.57 3.97 11.05 3.73 11.65 3.61C12.13 3.61 12.61 3.48 13.21 3.48C13.69 3.48 14.17 3.61 14.78 3.61C15.26 3.73 15.74 3.97 16.22 4.09C16.7 4.33 17.18 4.57 17.66 4.81C18.14 5.17 18.5 5.53 18.86 5.89C19.22 6.25 19.58 6.61 19.83 7.09C20.19 7.57 20.43 7.93 20.67 8.53C20.79 9.01 21.03 9.49 21.03 9.97C21.15 10.45 21.27 11.05 21.27 11.53"/><path fill="#e08a3c" stroke="#b8681f" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round" d="M6.01 10.69L0 12.14L5.65 15.61L6.01 10.69"/><path fill="#33272a" d="M12.49 9.85C12.49 10.09 12.38 10.21 12.38 10.45C12.26 10.57 12.14 10.81 12.01 10.93C11.89 11.05 11.65 11.17 11.54 11.29C11.29 11.41 11.05 11.41 10.93 11.41C10.7 11.41 10.45 11.41 10.33 11.29C10.1 11.17 9.85 11.05 9.73 10.93C9.61 10.81 9.49 10.57 9.38 10.45C9.38 10.21 9.26 10.09 9.26 9.85C9.26 9.61 9.38 9.37 9.38 9.25C9.49 9.01 9.61 8.89 9.73 8.65C9.85 8.53 10.1 8.41 10.33 8.41C10.45 8.29 10.7 8.29 10.93 8.29C11.05 8.29 11.29 8.29 11.54 8.41C11.65 8.41 11.89 8.53 12.01 8.65C12.14 8.89 12.26 9.01 12.38 9.25C12.38 9.37 12.49 9.61 12.49 9.85"/><path fill="none" stroke="#f6dd8f" stroke-width="2.64" stroke-linecap="round" stroke-linejoin="round" d="M12.01 2.64C13.57 0 15.14 0 16.58 2.64"/><path fill="none" stroke="#e08a3c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M19.83 33.99L18.38 38.8M28.48 33.99L29.8 38.8"/></svg>',
    bee: '<svg width="40" height="22.7" viewBox="0 0 39.29 22.34" fill="none"><path fill="#f0c65c" stroke="#a97f24" stroke-width="0.96" stroke-linecap="round" stroke-linejoin="round" d="M33.52 13.33C33.52 13.93 33.4 14.53 33.28 15.13C33.16 15.73 32.92 16.21 32.56 16.81C32.2 17.29 31.85 17.89 31.36 18.37C30.88 18.85 30.28 19.33 29.68 19.69C29.08 20.18 28.48 20.54 27.76 20.9C27.04 21.14 26.32 21.5 25.47 21.74C24.75 21.98 23.91 22.1 23.07 22.22C22.23 22.34 21.39 22.34 20.54 22.34C19.7 22.34 18.86 22.34 18.02 22.22C17.18 22.1 16.34 21.98 15.5 21.74C14.77 21.5 14.05 21.14 13.33 20.9C12.61 20.54 11.89 20.18 11.29 19.69C10.69 19.33 10.21 18.85 9.74 18.37C9.25 17.89 8.77 17.29 8.53 16.81C8.17 16.21 7.93 15.73 7.81 15.13C7.57 14.53 7.45 13.93 7.45 13.33C7.45 12.73 7.57 12.13 7.81 11.53C7.93 10.93 8.17 10.45 8.53 9.85C8.77 9.25 9.25 8.77 9.74 8.29C10.21 7.81 10.69 7.33 11.29 6.85C11.89 6.49 12.61 6.13 13.33 5.77C14.05 5.41 14.77 5.17 15.5 4.93C16.34 4.69 17.18 4.57 18.02 4.45C18.86 4.33 19.7 4.21 20.54 4.21C21.39 4.21 22.23 4.33 23.07 4.45C23.91 4.57 24.75 4.69 25.47 4.93C26.32 5.17 27.04 5.41 27.76 5.77C28.48 6.13 29.08 6.49 29.68 6.85C30.28 7.33 30.88 7.81 31.36 8.29C31.85 8.77 32.2 9.25 32.56 9.85C32.92 10.45 33.16 10.93 33.28 11.53C33.4 12.13 33.52 12.73 33.52 13.33"/><path fill="none" stroke="#3a2f22" stroke-width="3.36" stroke-linecap="round" stroke-linejoin="round" d="M15.98 5.17L15.98 21.5M21.99 5.17L21.99 21.14M28.12 7.93L28.12 18.49"/><path fill="#3a2f22" d="M32.92 11.05L32.92 15.61L39.29 13.33L32.92 11.05"/><path fill="#3a2f22" d="M13.82 12.38C13.82 12.85 13.82 13.34 13.7 13.82C13.7 14.17 13.46 14.66 13.34 15.14C13.21 15.49 12.98 15.85 12.74 16.34C12.49 16.7 12.14 17.05 11.78 17.29C11.54 17.66 11.18 17.9 10.82 18.26C10.34 18.49 9.98 18.61 9.61 18.85C9.13 18.97 8.65 19.09 8.29 19.22C7.81 19.34 7.33 19.34 6.85 19.34C6.49 19.34 6.01 19.34 5.53 19.22C5.05 19.09 4.69 18.97 4.21 18.85C3.84 18.61 3.36 18.49 3 18.26C2.64 17.9 2.28 17.66 1.92 17.29C1.68 17.05 1.32 16.7 1.08 16.34C0.84 15.85 0.6 15.49 0.48 15.14C0.24 14.66 0.12 14.17 0.12 13.82C0 13.34 0 12.85 0 12.38C0 12.02 0 11.53 0.12 11.05C0.12 10.57 0.24 10.21 0.48 9.73C0.6 9.37 0.84 8.89 1.08 8.53C1.32 8.17 1.68 7.81 1.92 7.45C2.28 7.21 2.64 6.85 3 6.61C3.36 6.37 3.84 6.13 4.21 6.01C4.69 5.77 5.05 5.65 5.53 5.65C6.01 5.53 6.49 5.41 6.85 5.41C7.33 5.41 7.81 5.53 8.29 5.65C8.65 5.65 9.13 5.77 9.61 6.01C9.98 6.13 10.34 6.37 10.82 6.61C11.18 6.85 11.54 7.21 11.78 7.45C12.14 7.81 12.49 8.17 12.74 8.53C12.98 8.89 13.21 9.37 13.34 9.73C13.46 10.21 13.7 10.57 13.7 11.05C13.82 11.53 13.82 12.02 13.82 12.38"/><path fill="#fdf7ef" d="M5.89 10.93C5.89 11.17 5.77 11.29 5.77 11.53C5.65 11.77 5.53 11.9 5.41 12.14C5.17 12.26 5.05 12.38 4.81 12.49C4.57 12.49 4.45 12.61 4.21 12.61C3.96 12.61 3.72 12.49 3.48 12.49C3.36 12.38 3.12 12.26 3 12.14C2.88 11.9 2.76 11.77 2.64 11.53C2.52 11.29 2.52 11.17 2.52 10.93C2.52 10.69 2.52 10.45 2.64 10.21C2.76 10.09 2.88 9.85 3 9.73C3.12 9.61 3.36 9.49 3.48 9.37C3.72 9.25 3.96 9.25 4.21 9.25C4.45 9.25 4.57 9.25 4.81 9.37C5.05 9.49 5.17 9.61 5.41 9.73C5.53 9.85 5.65 10.09 5.77 10.21C5.77 10.45 5.89 10.69 5.89 10.93"/><path fill="none" stroke="#3a2f22" stroke-width="1.68" stroke-linecap="round" stroke-linejoin="round" d="M4.45 6.37L1.8 1.56M9.01 5.41L8.17 0"/></svg>',
    snail: '<svg width="44" height="28.0" viewBox="0 0 40.98 26.06" fill="none"><path fill="none" stroke="#cbb69c" stroke-width="6.73" stroke-linecap="round" stroke-linejoin="round" d="M1.69 26.06L27.4 26.06"/><path fill="none" stroke="#cbb69c" stroke-width="6.13" stroke-linecap="round" stroke-linejoin="round" d="M4.69 23.3C6.13 17.17 9.61 14.17 15.26 14.17"/><path fill="#d9a768" stroke="#a97b45" stroke-width="1.56" stroke-linecap="round" stroke-linejoin="round" d="M40.98 12.73C40.98 13.57 40.86 14.41 40.74 15.13C40.62 15.97 40.38 16.82 40.02 17.53C39.66 18.38 39.29 19.09 38.81 19.7C38.33 20.41 37.85 21.13 37.25 21.61C36.65 22.21 36.05 22.82 35.33 23.3C34.61 23.78 33.89 24.14 33.17 24.38C32.33 24.74 31.61 24.98 30.77 25.1C29.93 25.34 29.09 25.34 28.24 25.34C27.4 25.34 26.56 25.34 25.84 25.1C25 24.98 24.16 24.74 23.44 24.38C22.59 24.14 21.87 23.78 21.27 23.3C20.55 22.82 19.83 22.21 19.23 21.61C18.75 21.13 18.15 20.41 17.67 19.7C17.18 19.09 16.82 18.38 16.58 17.53C16.22 16.82 15.98 15.97 15.86 15.13C15.62 14.41 15.5 13.57 15.5 12.73C15.5 11.89 15.62 11.05 15.86 10.21C15.98 9.37 16.22 8.65 16.58 7.81C16.82 7.09 17.18 6.36 17.67 5.64C18.15 4.92 18.75 4.32 19.23 3.72C19.83 3.12 20.55 2.64 21.27 2.16C21.87 1.68 22.59 1.32 23.44 0.96C24.16 0.6 25 0.36 25.84 0.24C26.56 0.12 27.4 0 28.24 0C29.09 0 29.93 0.12 30.77 0.24C31.61 0.36 32.33 0.6 33.17 0.96C33.89 1.32 34.61 1.68 35.33 2.16C36.05 2.64 36.65 3.12 37.25 3.72C37.85 4.32 38.33 4.92 38.81 5.64C39.29 6.36 39.66 7.09 40.02 7.81C40.38 8.65 40.62 9.37 40.74 10.21C40.86 11.05 40.98 11.89 40.98 12.73"/><path fill="none" stroke="#a97b45" stroke-width="1.92" stroke-linecap="round" stroke-linejoin="round" d="M31.61 12.73C31.61 13.09 31.49 13.57 31.37 13.93C31.12 14.41 30.89 14.77 30.65 15.01C30.29 15.38 29.93 15.61 29.57 15.73C29.21 15.97 28.73 15.97 28.24 15.97C27.88 15.97 27.4 15.97 27.04 15.73C26.56 15.61 26.2 15.38 25.96 15.01C25.6 14.77 25.36 14.41 25.24 13.93C25 13.57 25 13.09 25 12.73C25 12.37 25 12.01 25 11.77C25.12 11.41 25.24 11.05 25.36 10.81C25.48 10.45 25.6 10.21 25.84 9.97C25.96 9.61 26.2 9.37 26.44 9.13C26.68 8.89 26.92 8.77 27.16 8.53C27.4 8.41 27.76 8.17 28 8.05C28.36 7.93 28.61 7.81 28.96 7.81C29.33 7.69 29.57 7.69 29.93 7.69C30.29 7.69 30.65 7.69 30.89 7.81C31.25 7.81 31.61 7.93 31.85 8.05C32.21 8.17 32.45 8.41 32.68 8.53C33.05 8.77 33.29 8.89 33.53 9.13C33.65 9.37 33.89 9.61 34.13 9.97C34.25 10.21 34.49 10.45 34.61 10.81C34.73 11.05 34.73 11.41 34.85 11.77C34.85 12.01 34.97 12.37 34.97 12.73C34.97 13.09 34.85 13.57 34.85 14.05C34.73 14.53 34.61 14.89 34.37 15.38C34.25 15.73 34.01 16.21 33.77 16.57C33.53 16.93 33.17 17.29 32.93 17.65C32.57 17.89 32.21 18.26 31.85 18.49C31.49 18.73 31.01 18.97 30.65 19.09C30.17 19.33 29.81 19.45 29.33 19.57C28.85 19.57 28.48 19.7 28 19.7C27.52 19.7 27.04 19.57 26.56 19.57C26.2 19.45 25.72 19.33 25.36 19.09C24.88 18.97 24.52 18.73 24.16 18.49C23.68 18.26 23.32 17.89 23.08 17.65C22.71 17.29 22.47 16.93 22.23 16.57C21.87 16.21 21.75 15.73 21.51 15.38C21.39 14.89 21.27 14.53 21.15 14.05C21.03 13.57 21.03 13.09 21.03 12.73"/><path fill="#d6c2a8" d="M11.3 18.49C11.3 18.73 11.3 19.09 11.18 19.46C11.18 19.82 11.06 20.05 10.94 20.41C10.82 20.78 10.7 21.02 10.46 21.26C10.22 21.61 10.1 21.85 9.86 22.09C9.62 22.34 9.38 22.58 9.02 22.7C8.78 22.94 8.42 23.06 8.18 23.18C7.82 23.3 7.58 23.42 7.22 23.54C6.86 23.54 6.5 23.54 6.13 23.54C5.89 23.54 5.53 23.54 5.17 23.54C4.81 23.42 4.57 23.3 4.21 23.18C3.85 23.06 3.61 22.94 3.37 22.7C3.01 22.58 2.77 22.34 2.53 22.09C2.29 21.85 2.05 21.61 1.93 21.26C1.69 21.02 1.57 20.78 1.45 20.41C1.33 20.05 1.21 19.82 1.09 19.46C1.09 19.09 1.09 18.73 1.09 18.49C1.09 18.14 1.09 17.78 1.09 17.41C1.21 17.05 1.33 16.82 1.45 16.46C1.57 16.21 1.69 15.85 1.93 15.61C2.05 15.26 2.29 15.02 2.53 14.78C2.77 14.53 3.01 14.29 3.37 14.17C3.61 13.93 3.85 13.81 4.21 13.69C4.57 13.57 4.81 13.45 5.17 13.45C5.53 13.33 5.89 13.33 6.13 13.33C6.5 13.33 6.86 13.33 7.22 13.45C7.58 13.45 7.82 13.57 8.18 13.69C8.42 13.81 8.78 13.93 9.02 14.17C9.38 14.29 9.62 14.53 9.86 14.78C10.1 15.02 10.22 15.26 10.46 15.61C10.7 15.85 10.82 16.21 10.94 16.46C11.06 16.82 11.18 17.05 11.18 17.41C11.3 17.78 11.3 18.14 11.3 18.49"/><path fill="none" stroke="#d6c2a8" stroke-width="2.28" stroke-linecap="round" stroke-linejoin="round" d="M4.33 13.93L1.93 7.21M9.26 13.57L10.46 6.97"/><path fill="#33272a" d="M3.25 6.36C3.25 6.6 3.25 6.73 3.13 6.97C3.13 7.21 3.01 7.33 2.77 7.57C2.65 7.69 2.53 7.81 2.29 7.93C2.05 7.93 1.81 8.05 1.69 8.05C1.45 8.05 1.21 7.93 0.97 7.93C0.84 7.81 0.6 7.69 0.48 7.57C0.36 7.33 0.24 7.21 0.12 6.97C0 6.73 0 6.6 0 6.36C0 6.12 0 5.88 0.12 5.64C0.24 5.52 0.36 5.28 0.48 5.16C0.6 5.04 0.84 4.92 0.97 4.8C1.21 4.68 1.45 4.68 1.69 4.68C1.81 4.68 2.05 4.68 2.29 4.8C2.53 4.92 2.65 5.04 2.77 5.16C3.01 5.28 3.13 5.52 3.13 5.64C3.25 5.88 3.25 6.12 3.25 6.36"/><path fill="#33272a" d="M12.38 6C12.38 6.24 12.38 6.48 12.26 6.73C12.14 6.85 12.02 7.09 11.9 7.21C11.77 7.33 11.54 7.45 11.3 7.57C11.18 7.69 10.93 7.69 10.7 7.69C10.46 7.69 10.34 7.69 10.1 7.57C9.86 7.45 9.74 7.33 9.49 7.21C9.38 7.09 9.26 6.85 9.14 6.73C9.14 6.48 9.02 6.24 9.02 6C9.02 5.76 9.14 5.64 9.14 5.4C9.26 5.16 9.38 5.04 9.49 4.8C9.74 4.68 9.86 4.56 10.1 4.44C10.34 4.44 10.46 4.32 10.7 4.32C10.93 4.32 11.18 4.44 11.3 4.44C11.54 4.56 11.77 4.68 11.9 4.8C12.02 5.04 12.14 5.16 12.26 5.4C12.38 5.64 12.38 5.76 12.38 6"/><path fill="none" stroke="#a98f74" stroke-width="1.32" stroke-linecap="round" stroke-linejoin="round" d="M3.13 20.9C4.93 22.09 6.74 22.09 8.3 20.9"/></svg>',
  };
  function companionSvg() {
    var id = state.companion;
    if (!id || id === "none" || !COMPANION_SVG[id]) return "";
    return '<div class="lucky-pal">' + COMPANION_SVG[id] + "</div>";
  }
  var TREAT_SVG = {
    sardine: '<svg width="34" height="20" viewBox="0 0 34 20" fill="none"><path d="M4 10c6-7 16-7 22 0-6 7-16 7-22 0z" fill="#9ec6d8"></path><path d="M26 10l6-5v10z" fill="#7fadc2"></path><circle cx="11" cy="9" r="1.4" fill="#2f3a42"></circle></svg>',
    cream: '<svg width="36" height="22" viewBox="0 0 36 22" fill="none"><ellipse cx="18" cy="16" rx="15" ry="5" fill="#e7dcd2"></ellipse><ellipse cx="18" cy="13" rx="11" ry="4" fill="#fdf7ef"></ellipse><ellipse cx="14" cy="12.2" rx="3" ry="1.1" fill="#fff"></ellipse></svg>',
    biscuit: '<svg width="30" height="22" viewBox="0 0 30 22" fill="none"><rect x="3" y="5" width="24" height="13" rx="4" fill="#d9a86a"></rect><path d="M8 9.5h.01M14 8.5h.01M20 10h.01M11 14h.01M18 14.5h.01" stroke="#8a5a2c" stroke-width="2.4" stroke-linecap="round"></path></svg>',
    prawn: '<svg width="32" height="24" viewBox="0 0 32 24" fill="none"><path d="M7 8c8-4 17-2 19 5-2 7-11 9-16 4" stroke="#ef9a9a" stroke-width="6" stroke-linecap="round"></path><circle cx="9.5" cy="8.5" r="1.2" fill="#7c3b3b"></circle></svg>',
    catnip: '<svg width="30" height="26" viewBox="0 0 30 26" fill="none"><path d="M15 24V8" stroke="#6f8f5f" stroke-width="2" stroke-linecap="round"></path><path d="M15 14c-6 0-8-3-8-6 4 0 8 2 8 6zM15 11c6 0 8-3 8-6-4 0-8 2-8 6z" fill="#89ab72"></path><circle cx="15" cy="5" r="2.4" fill="#c9b6e0"></circle></svg>'
  };
  function treatSvg() {
    if (!state.treatsOn) return "";
    var svg = TREAT_SVG[state.treat] || TREAT_SVG.sardine;
    return '<div class="lucky-treat">' + svg + "</div>";
  }
  // A small sitting portrait for the settings cards.
  // A sitting head crop of the same artwork, for the coat-picker cards.
  function faceSvg(size) {
    size = size || 34;
    return '<svg width="' + size + '" height="' + size + '" viewBox="-0 -2.17 33.4 33.4" fill="none" data-lucky-face="' + size + '">' +
      '<path fill="var(--head)" d="M7.33 11.17L5.77 0L15.13 5.64L7.33 11.17"/><path fill="var(--head)" d="M19.34 5.4L27.4 0.12L26.92 10.45L19.34 5.4"/><path fill="var(--head)" d="M28.96 16.93C28.96 17.65 28.84 18.49 28.72 19.33C28.48 20.05 28.36 20.77 28 21.61C27.64 22.33 27.28 23.05 26.92 23.66C26.44 24.38 25.95 24.98 25.35 25.58C24.75 26.06 24.15 26.66 23.43 27.02C22.83 27.5 22.11 27.86 21.39 28.22C20.66 28.46 19.82 28.7 19.1 28.82C18.26 29.06 17.54 29.06 16.7 29.06C15.86 29.06 15.14 29.06 14.29 28.82C13.57 28.7 12.74 28.46 12.01 28.22C11.29 27.86 10.57 27.5 9.86 27.02C9.25 26.66 8.65 26.06 8.05 25.58C7.45 24.98 6.97 24.38 6.49 23.66C6.13 23.05 5.77 22.33 5.41 21.61C5.05 20.77 4.81 20.05 4.69 19.33C4.57 18.49 4.45 17.65 4.45 16.93C4.45 16.1 4.57 15.25 4.69 14.53C4.81 13.69 5.05 12.97 5.41 12.25C5.77 11.53 6.13 10.81 6.49 10.09C6.97 9.49 7.45 8.77 8.05 8.29C8.65 7.69 9.25 7.2 9.86 6.72C10.57 6.24 11.29 5.88 12.01 5.64C12.74 5.28 13.57 5.04 14.29 4.92C15.14 4.8 15.86 4.68 16.7 4.68C17.54 4.68 18.26 4.8 19.1 4.92C19.82 5.04 20.66 5.28 21.39 5.64C22.11 5.88 22.83 6.24 23.43 6.72C24.15 7.2 24.75 7.69 25.35 8.29C25.95 8.77 26.44 9.49 26.92 10.09C27.28 10.81 27.64 11.53 28 12.25C28.36 12.97 28.48 13.69 28.72 14.53C28.84 15.25 28.96 16.1 28.96 16.93"/><path fill="var(--ear)" d="M6.97 7.32L6.73 1.68L11.9 4.2L6.97 7.32"/><path fill="var(--ear)" d="M22.95 3.84L26.32 2.04L26.68 8.05L22.95 3.84"/><path fill="var(--eye)" d="M14.06 17.54C14.06 17.9 13.94 18.14 13.82 18.38C13.7 18.74 13.58 18.98 13.34 19.1C13.22 19.34 12.98 19.46 12.62 19.57C12.38 19.7 12.14 19.82 11.78 19.82C11.54 19.82 11.18 19.7 10.94 19.57C10.7 19.46 10.46 19.34 10.22 19.1C9.98 18.98 9.86 18.74 9.74 18.38C9.61 18.14 9.61 17.9 9.61 17.54C9.61 17.29 9.61 16.93 9.74 16.7C9.86 16.46 9.98 16.21 10.22 15.98C10.46 15.74 10.7 15.62 10.94 15.49C11.18 15.37 11.54 15.37 11.78 15.37C12.14 15.37 12.38 15.37 12.62 15.49C12.98 15.62 13.22 15.74 13.34 15.98C13.58 16.21 13.7 16.46 13.82 16.7C13.94 16.93 14.06 17.29 14.06 17.54"/><path fill="var(--eye)" d="M23.79 17.54C23.79 17.9 23.79 18.14 23.67 18.38C23.55 18.74 23.31 18.98 23.19 19.1C22.95 19.34 22.71 19.46 22.47 19.57C22.11 19.7 21.87 19.82 21.63 19.82C21.27 19.82 21.03 19.7 20.79 19.57C20.42 19.46 20.18 19.34 20.06 19.1C19.82 18.98 19.7 18.74 19.58 18.38C19.46 18.14 19.34 17.9 19.34 17.54C19.34 17.29 19.46 16.93 19.58 16.7C19.7 16.46 19.82 16.21 20.06 15.98C20.18 15.74 20.42 15.62 20.79 15.49C21.03 15.37 21.27 15.37 21.63 15.37C21.87 15.37 22.11 15.37 22.47 15.49C22.71 15.62 22.95 15.74 23.19 15.98C23.31 16.21 23.55 16.46 23.67 16.7C23.79 16.93 23.79 17.29 23.79 17.54"/><path fill="#ffffff" d="M13.22 16.81C13.22 16.93 13.22 17.17 13.1 17.29C12.98 17.41 12.74 17.41 12.62 17.41C12.38 17.41 12.26 17.41 12.14 17.29C12.02 17.17 11.9 16.93 11.9 16.81C11.9 16.57 12.02 16.45 12.14 16.33C12.26 16.21 12.38 16.09 12.62 16.09C12.74 16.09 12.98 16.21 13.1 16.33C13.22 16.45 13.22 16.57 13.22 16.81"/><path fill="#ffffff" d="M23.07 16.81C23.07 16.93 22.95 17.17 22.83 17.29C22.71 17.41 22.59 17.41 22.35 17.41C22.23 17.41 21.99 17.41 21.87 17.29C21.75 17.17 21.75 16.93 21.75 16.81C21.75 16.57 21.75 16.45 21.87 16.33C21.99 16.21 22.23 16.09 22.35 16.09C22.59 16.09 22.71 16.21 22.83 16.33C22.95 16.45 23.07 16.57 23.07 16.81"/><path fill="var(--nose)" d="M14.9 21.73L18.5 21.73L16.7 23.9L14.9 21.73"/><path fill="none" stroke="var(--fur3)" stroke-width="1.32" stroke-linecap="round" stroke-linejoin="round" d="M16.7 23.9C15.86 25.22 14.05 25.22 13.1 24.26M16.7 23.9C17.54 25.22 19.34 25.22 20.3 24.26"/><path fill="none" stroke="var(--belly)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" d="M0 19.81L6.01 20.65M0 23.53L6.01 22.93M27.4 20.65L33.4 19.81M27.4 22.93L33.4 23.53"/>' +
      '</svg>';
  }

  /* ---------- CSS ---------- */
  /* Lucky is an opt-in companion with his own "Walk across the screen"
     switch — that switch is his off switch, and no motion setting should be
     able to strand him. Two different rules try to stop him: Wisp's
     data-motion="reduce" kills every animation with `*{animation:none
     !important}`, and the OS-level prefers-reduced-motion media rule
     collapses every duration to .001ms — which parked him, frozen, just off
     the right edge where `left:100vw` starts him. So his animations are
     re-enabled under BOTH conditions.

     They are re-enabled as LONGHANDS (name/duration/…), never the
     `animation:` shorthand: an !important shorthand resets animation-delay
     to 0, which had his legs swinging in unison instead of alternating and
     the treat notes rising in one clump. The global reduce rule's shorthand
     zeroes those delays with !important anyway, so the stagger delays are
     restated below at higher specificity. */
  function motionProof(prefix) {
    function re(sel, name, dur, ease, count, fill) {
      return prefix + sel + "{animation-name:" + name + " !important;animation-duration:" + dur +
        " !important;animation-timing-function:" + ease + " !important;animation-iteration-count:" + count +
        " !important" + (fill ? ";animation-fill-mode:" + fill + " !important" : "") + "}";
    }
    return re(".lucky-walk", "lucky-walk", "var(--pace,34s)", "linear", "infinite") +
      re(".lucky-walk.treating", "lucky-hopaway", "4.6s", "ease-in", "1", "forwards") +
      re(".lucky-bob", "lucky-bob", ".62s", "ease-in-out", "infinite") +
      re(".lucky-leg", "lucky-leg", ".62s", "ease-in-out", "infinite") +
      re(".lucky-tail", "lucky-tail", "1.6s", "ease-in-out", "infinite") +
      re(".lucky-eye", "lucky-blink", "4.2s", "ease-in-out", "infinite") +
      re(".lucky-tip", "tip-window", "var(--pace,34s)", "linear", "infinite") +
      re(".lucky-pal", "lucky-bob", ".62s", "ease-in-out", "infinite") +
      /* the treat dance: the hop, the treat itself, its bounce, the notes
         and sparks — none of these were re-enabled, so five pets under
         reduced motion announced a sardine that never appeared */
      re(".lucky-walk.treating .lucky-bob", "lucky-hop", ".62s", "ease-in-out", "3") +
      re(".lucky-walk.treating .lucky-treat", "treat-appear", "4.6s", "ease-out", "1", "forwards") +
      re(".lucky-walk.treating .lucky-treat svg", "treat-bounce", ".5s", "ease-in-out", "4") +
      re(".lucky-walk.treating .lucky-notes span", "note-rise", "1.6s", "ease-out", "2") +
      re(".lucky-walk.treating .lucky-sparks span", "spark", "1.1s", "ease-out", "3") +
      /* restate the stagger delays the global !important shorthand zeroed */
      prefix + ".lucky-pal{animation-delay:-.2s !important}" +
      prefix + '.lucky-leg--b,' + prefix + '.lucky-leg[style*="-.31s"]{animation-delay:-.31s !important}' +
      prefix + ".lucky-walk.treating .lucky-notes span:nth-child(2){animation-delay:.34s !important}" +
      prefix + ".lucky-walk.treating .lucky-notes span:nth-child(3){animation-delay:.68s !important}" +
      prefix + ".lucky-walk.treating .lucky-sparks span:nth-child(2){animation-delay:.3s !important}" +
      prefix + ".lucky-walk.treating .lucky-sparks span:nth-child(3){animation-delay:.6s !important}";
  }
  var CSS = SKIN_CSS +
    '.lucky-stage{position:fixed;left:0;right:0;bottom:0;height:250px;pointer-events:none;z-index:24;overflow:hidden}' +
    '.lucky-stage[hidden]{display:none}' +
    /* Gait matched exactly to the original World-Without-God cat: a slow stroll
       right-to-left with a gentle bob, an even leg swing, and a lazy tail. */
    '.lucky-walk{position:absolute;bottom:6px;left:100vw;pointer-events:auto;cursor:pointer;animation:lucky-walk var(--pace,34s) linear infinite}' +
    '.lucky-bob{animation:lucky-bob .62s ease-in-out infinite}' +
    '.lucky-leg{transform-box:fill-box;transform-origin:50% 0;animation:lucky-leg .62s ease-in-out infinite}' +
    // the opposite pair of the diagonal gait: half a cycle out of phase
    '.lucky-leg--b{animation-delay:-.31s}' +
    '.lucky-tail{transform-box:fill-box;transform-origin:0 100%;animation:lucky-tail 1.6s ease-in-out infinite}' +
    '.lucky-eye{transform-box:fill-box;transform-origin:50% 50%;animation:lucky-blink 4.2s ease-in-out infinite}' +
    '@keyframes lucky-walk{from{transform:translateX(0)}to{transform:translateX(calc(-100vw - 120px))}}' +
    '@keyframes lucky-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}' +
    '@keyframes lucky-leg{0%,100%{transform:rotate(11deg)}50%{transform:rotate(-11deg)}}' +
    '@keyframes lucky-tail{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(10deg)}}' +
    '@keyframes lucky-blink{0%,88%,100%{transform:scaleY(1)}91.5%{transform:scaleY(.08)}93.5%{transform:scaleY(.08)}97%{transform:scaleY(1)}}' +
    '@keyframes lucky-hop{0%,100%{transform:translateY(0) scaleY(1)}18%{transform:translateY(0) scaleY(.9)}50%{transform:translateY(-13px) scaleY(1.04)}82%{transform:translateY(0) scaleY(.94)}}' +
    '@keyframes lucky-hopaway{0%,58%{transform:translateX(0)}100%{transform:translateX(calc(-1 * var(--exit,92vw)))}}' +
    '.lucky-walk.treating{animation:lucky-hopaway 4.6s ease-in forwards}' +
    '.lucky-walk.treating .lucky-bob{animation:lucky-hop .62s ease-in-out 3}' +
    '.lucky-tip{position:absolute;bottom:58px;left:34px;width:250px;background:var(--card);border:1px solid var(--amber);border-radius:12px;box-shadow:0 12px 28px var(--shadow-lg);padding:9px 12px;pointer-events:none;opacity:0;animation:tip-window var(--pace,34s) linear infinite}' +
    '.lucky-tip:after{content:"";position:absolute;left:24px;bottom:-6px;width:10px;height:10px;background:var(--card);border-right:1px solid var(--amber);border-bottom:1px solid var(--amber);transform:rotate(45deg)}' +
    '.lt-head{display:flex;align-items:center;gap:7px;margin-bottom:5px}' +
    '.lt-glyph{color:var(--rose)}.lt-who{font:italic 600 14px var(--font-display);color:var(--ink)}' +
    '.lt-mood{font:9px var(--font-text);letter-spacing:.18em;text-transform:uppercase;color:var(--amber);margin-left:auto}' +
    '.lucky-tip-text{font:14px/1.45 var(--font-text);color:var(--ink2)}' +
    '.lt-foot{display:flex;align-items:center;justify-content:space-between;margin-top:7px}' +
    '.pet-meter{color:var(--rose);letter-spacing:.3em;font-size:9px}' +
    '.pet-hint{font:9px var(--font-text);letter-spacing:.16em;text-transform:uppercase;color:var(--ink3)}' +
    '@keyframes tip-window{0%,24%{opacity:0}30%,64%{opacity:1}70%,100%{opacity:0}}' +
    '.lucky-notes,.lucky-sparks{position:absolute;bottom:52px;left:44px;pointer-events:none;opacity:0}' +
    '.lucky-notes span,.lucky-sparks span{position:absolute;font-size:14px;opacity:0}' +
    '.lucky-notes span{color:var(--rose)}.lucky-sparks{left:-18px;bottom:34px}.lucky-sparks span{color:var(--amber);font-size:11px}' +
    '.lucky-walk.treating .lucky-notes,.lucky-walk.treating .lucky-sparks{opacity:1}' +
    '.lucky-walk.treating .lucky-notes span{animation:note-rise 1.6s ease-out 2}' +
    '.lucky-walk.treating .lucky-notes span:nth-child(2){animation-delay:.34s;left:15px}' +
    '.lucky-walk.treating .lucky-notes span:nth-child(3){animation-delay:.68s;left:30px}' +
    '.lucky-walk.treating .lucky-sparks span{animation:spark 1.1s ease-out 3}' +
    '.lucky-walk.treating .lucky-sparks span:nth-child(2){animation-delay:.3s;left:16px;bottom:9px}' +
    '.lucky-walk.treating .lucky-sparks span:nth-child(3){animation-delay:.6s;left:-11px;bottom:15px}' +
    '@keyframes note-rise{0%{opacity:0;transform:translate(0,0) rotate(-8deg)}22%{opacity:1}100%{opacity:0;transform:translate(11px,-34px) rotate(14deg)}}' +
    '@keyframes spark{0%{opacity:0;transform:scale(.4)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.5)}}' +
    '.lucky-walk.treating .lucky-treat svg{animation:treat-bounce .5s ease-in-out 4}' +
    '@keyframes treat-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
    '.lucky-pal{position:absolute;bottom:2px;left:92px;animation:lucky-bob .62s ease-in-out infinite;animation-delay:-.2s;line-height:0}' +
    '.lucky-treat{position:absolute;bottom:4px;left:-30px;line-height:0;opacity:0}' +
    '.lucky-walk.treating .lucky-treat{animation:treat-appear 4.6s ease-out forwards}' +
    '@keyframes treat-appear{0%{opacity:0;transform:translateY(-6px) scale(.7)}14%{opacity:1;transform:none}70%{opacity:1}100%{opacity:0}}' +
    /* Turning him off is a deliberate choice, not a motion-setting side
       effect: keep him walking under the site's Reduce-motion setting AND
       under the OS-level preference. (Petals, confetti, and page flourishes
       still respect Reduce motion.) See motionProof() above. */
    motionProof(':root[data-motion="reduce"] ') +
    '@media (prefers-reduced-motion: reduce){' + motionProof('') + '}' +
    /* settings modal */
    '.lucky-modal-back{position:fixed;inset:0;z-index:120;background:color-mix(in srgb,var(--ink) 34%,transparent);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:40px 16px}' +
    '.lucky-modal{background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 20px 60px var(--shadow-lg);width:min(640px,100%);padding:22px 22px 26px}' +
    '.lucky-modal h2{font:600 22px var(--font-display);color:var(--ink);margin:0}' +
    '.lucky-modal .lm-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}' +
    '.lucky-modal .lm-sub{color:var(--ink3);font-size:13px;margin:0 0 16px}' +
    '.lucky-modal .lm-eyebrow{font:600 10.5px/1 var(--font-text);letter-spacing:.2em;text-transform:uppercase;color:var(--rose);margin:18px 0 9px}' +
    '.lucky-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:9px}' +
    '.lucky-opt{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:9px 11px;cursor:pointer;transition:border-color .14s,background .14s}' +
    '.lucky-opt:hover{border-color:var(--rose)}' +
    '.lucky-opt.is-on{border-color:var(--rose);background:var(--rose-wash)}' +
    '.lucky-opt .lo-face{flex:none;line-height:0}' +
    '.lucky-opt .lo-name{display:block;font:italic 600 15px var(--font-display);color:var(--ink)}' +
    '.lucky-opt .lo-desc{display:block;font-size:11.5px;color:var(--ink3);margin-top:1px}' +
    '.lucky-chipwrap{display:flex;flex-wrap:wrap;gap:7px}' +
    '.lucky-chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 13px;cursor:pointer;font:14px var(--font-text);color:var(--ink2);transition:all .14s}' +
    '.lucky-chip.is-on{border-color:var(--rose);background:var(--rose-wash);color:var(--rose-ink)}' +
    '.lucky-name-in{width:100%;max-width:320px;border:1px solid var(--line);border-radius:9px;padding:9px 11px;font:16px var(--font-text);color:var(--ink);background:var(--card);outline:none}' +
    '.lucky-name-in:focus{border-color:var(--rose)}' +
    '.lucky-hrow{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--line)}' +
    '.lucky-hrow .lh-t{font-size:14.5px;color:var(--ink)}.lucky-hrow .lh-d{font-size:12px;color:var(--ink3);margin-top:2px}' +
    '.lucky-sw{flex:none;width:44px;height:26px;border-radius:999px;border:0;background:var(--line);position:relative;cursor:pointer;transition:background .16s}' +
    '.lucky-sw:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .16s;box-shadow:0 1px 3px rgba(0,0,0,.25)}' +
    '.lucky-sw.is-on{background:var(--rose)}.lucky-sw.is-on:after{transform:translateX(18px)}' +
    '.lucky-pace{display:flex;align-items:center;gap:14px;max-width:420px;margin-top:6px}' +
    '.lucky-pace input{flex:1;accent-color:var(--rose)}' +
    '.lucky-pace .lp-read{font:9px var(--font-text);letter-spacing:.16em;text-transform:uppercase;color:var(--amber);min-width:70px}' +
    '.lucky-modal .lm-done{margin-top:20px;display:flex;justify-content:flex-end}' +
    '.lucky-modal .lm-done button{border:0;background:var(--rose);color:#fff;border-radius:10px;padding:9px 20px;font:600 15px var(--font-text);cursor:pointer}' +
    /* keep him off the reading surface and out of print */
    'body.companion-hide .lucky-stage{display:none}' +
    '@media print{.lucky-stage{display:none}}';

  function injectCSS() {
    if (document.getElementById("wisp-companion-css")) return;
    var el = document.createElement("style"); el.id = "wisp-companion-css"; el.textContent = CSS;
    document.head.appendChild(el);
  }

  /* ---------- the stage ---------- */
  var stageEl = null, petTimer = null;
  var PACES = [
    [70, "A slow amble"], [50, "Strolling"], [34, "A steady pad"], [22, "Trotting"], [12, "Places to be"]
  ];
  function paceLabel(v) { var best = PACES[2]; for (var i = 0; i < PACES.length; i++) if (Math.abs(PACES[i][0] - v) < Math.abs(best[0] - v)) best = PACES[i]; return best[1]; }
  /* The slider works in named stops (indexes into PACES), the way the
     organizer's does. The old formula mapped the whole track to 42-100
     seconds: the fastest position was slower than the default, and his two
     quicker gaits could never be reached at all. A pace synced from another
     device that isn't an exact stop snaps to the nearest one. */
  function paceIndex() {
    var p = +state.pace || 34, best = 2, bd = Infinity;
    for (var i = 0; i < PACES.length; i++) { var d = Math.abs(PACES[i][0] - p); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function reduced() {
    var r = document.documentElement;
    if (r.getAttribute("data-motion") === "reduce") return true;
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function mount() {
    if (stageEl) return;
    stageEl = document.createElement("div"); stageEl.className = "lucky-stage"; stageEl.id = "luckyStage";
    document.body.appendChild(stageEl);
  }
  function petsBar() {
    if (!state.treatsOn) return "";
    var pets = state.pets || 0, dots = "";
    for (var i = 0; i < 5; i++) dots += (i < pets ? "●" : "○");
    return '<div class="lt-foot"><span class="pet-meter">' + dots + '</span><span class="pet-hint">Pet me</span></div>';
  }
  function bubbleHtml() {
    var p = persona();
    var tips = p.tips || [], line = tips.length ? tips[tipIdx % tips.length] : p.moodLine;
    return '<div class="lucky-tip"><div class="lt-head"><span class="lt-glyph">' + p.glyph + '</span>' +
      '<span class="lt-who">' + esc(name()) + '</span><span class="lt-mood">' + esc(p.mood) + '</span></div>' +
      '<div class="lucky-tip-text">' + esc(line) + '</div>' + petsBar() + '</div>';
  }
  var tipIdx = 0;
  function name() { return (state.name || "Lucky").trim() || "Lucky"; }
  function render() {
    if (!stageEl) return;
    stageEl.setAttribute("data-skin", state.skin);
    if (!state.walks) { stageEl.hidden = true; stageEl.innerHTML = ""; return; }
    stageEl.hidden = false;
    var pace = (+state.pace >= 8 && +state.pace <= 200) ? +state.pace : 34;
    stageEl.innerHTML =
      '<div class="lucky-walk" id="luckyWalk" title="Pet ' + esc(name()) + '" style="--pace:' + pace + 's">' +
        (state.tips ? bubbleHtml() : "") +
        '<div class="lucky-bob">' + walkerSvg() + '</div>' +
        companionSvg() + treatSvg() +
        '<div class="lucky-notes" aria-hidden="true"><span>&#9834;</span><span>&#9835;</span><span>&#9834;</span></div>' +
        '<div class="lucky-sparks" aria-hidden="true"><span>&#10022;</span><span>&#10023;</span><span>&#10022;</span></div>' +
      '</div>';
    var walk = stageEl.querySelector("#luckyWalk");
    walk.onclick = function () { pet(walk); };
    walk.addEventListener("animationiteration", function (e) { if (e.animationName === "lucky-walk") { tipIdx++; var t = stageEl.querySelector(".lucky-tip-text"); if (t) { var p = persona(); var tips = p.tips || []; t.textContent = tips.length ? tips[tipIdx % tips.length] : p.moodLine; } } });
  }
  // A soft, happy little sound for when Lucky earns his treat: a two-note chirp
  // over a brief low purr, built with the Web Audio API (no sound files). It
  // respects the site's sound preference and only starts from the reader's own
  // tap (a user gesture), so browsers allow it.
  var luckyAC = null;
  function soundOn() { try { return localStorage.getItem("wisp.sound") !== "off"; } catch (e) { return true; } }
  function luckySound() {
    if (!soundOn()) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      luckyAC = luckyAC || new AC();
      if (luckyAC.state === "suspended") luckyAC.resume();
      var now = luckyAC.currentTime;
      [[659.25, 0], [880, 0.13]].forEach(function (pair) {
        var o = luckyAC.createOscillator(), g = luckyAC.createGain();
        o.type = "triangle"; o.frequency.value = pair[0];
        var t = now + pair[1];
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.09, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0006, t + 0.26);
        o.connect(g); g.connect(luckyAC.destination);
        o.start(t); o.stop(t + 0.28);
      });
      // a short, low purr underneath
      var po = luckyAC.createOscillator(), pg = luckyAC.createGain();
      po.type = "sine"; po.frequency.value = 92;
      pg.gain.setValueAtTime(0.0001, now);
      pg.gain.linearRampToValueAtTime(0.05, now + 0.05);
      pg.gain.exponentialRampToValueAtTime(0.0004, now + 0.5);
      po.connect(pg); pg.connect(luckyAC.destination);
      po.start(now); po.stop(now + 0.52);
    } catch (e) {}
  }
  function pet(walk) {
    var n = (state.pets || 0) + 1;
    if (!state.treatsOn) { state.pets = n % 5; save(); paintPets(); return; }
    if (n < 5) { state.pets = n; save(); paintPets(); return; }
    // fifth pet: a treat, a little dance, a happy sound, and off he trots
    state.pets = 0; state.treatsGiven = (state.treatsGiven || 0) + 1; save();
    if (window.WispSound && window.WispSound.treat) window.WispSound.treat(); else luckySound();
    var box = walk.getBoundingClientRect();
    walk.style.left = Math.round(box.left) + "px";
    walk.style.setProperty("--exit", Math.round(box.left + box.width + 40) + "px");
    walk.classList.add("treating");
    var p = persona();
    var txt = stageEl.querySelector(".lucky-tip-text");
    if (txt) txt.textContent = p.treat + " A " + (TREAT_NAME[state.treat] || "sardine") + ".";
    var thanksAt = setTimeout(function () { var t = stageEl.querySelector(".lucky-tip-text"); if (t && p.thanks) t.textContent = p.thanks; }, 2100);
    if (petTimer) clearTimeout(petTimer);
    petTimer = setTimeout(function () {
      clearTimeout(thanksAt);
      walk.classList.remove("treating");
      walk.style.removeProperty("left"); walk.style.removeProperty("--exit");
      tipIdx++; render();
      var el = stageEl.querySelector("#luckyWalk");
      if (el && el.getAnimations) el.getAnimations({ subtree: true }).forEach(function (a) { try { a.cancel(); a.play(); } catch (e) {} });
    }, 4900);
  }
  function paintPets() {
    if (!stageEl) return;
    var meter = stageEl.querySelector(".pet-meter"); if (!meter) return;
    var pets = state.pets || 0, dots = "";
    for (var i = 0; i < 5; i++) dots += (i < pets ? "●" : "○");
    meter.textContent = dots;
  }

  // Hide him only on the immersive reading surface (out of the way while you
  // read). He strolls everywhere else, the writing station included, so writers
  // still get his company while they work.
  function updateVisibility() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var hide = /^read(\/|$)/.test(h);
    document.body.classList.toggle("companion-hide", hide);
  }

  /* ---------- one-off stroll (used by the widget button) ---------- */
  function stroll() {
    var wasWalking = state.walks;
    injectCSS(); mount();
    state.walks = true;
    // Always rebuild him so he visibly restarts a pass from the right edge right
    // now — on desktop he is already walking, so without this the button looked
    // like it did nothing. render() re-creates #luckyWalk, restarting the walk.
    render();
    updateVisibility();
    // If he was resting, send him across once and then rest again.
    if (!wasWalking) {
      var walk = stageEl && stageEl.querySelector("#luckyWalk");
      if (walk) walk.addEventListener("animationiteration", function once(e) {
        if (e.animationName !== "lucky-walk") return;
        walk.removeEventListener("animationiteration", once);
        state.walks = false; render();
      });
    }
  }

  /* ============================================================
     SETTINGS MODAL
     ============================================================ */
  function optCard(kind, id, label, desc, on) {
    return '<button class="lucky-opt' + (on ? " is-on" : "") + '" data-lucky="' + kind + '" data-val="' + esc(id) + '">' +
      (kind === "skin" ? '<span class="lo-face" data-skin="' + esc(id) + '">' + faceSvg(34) + '</span>' : "") +
      '<span><span class="lo-name">' + esc(label) + '</span>' + (desc ? '<span class="lo-desc">' + esc(desc) + '</span>' : "") + '</span></button>';
  }
  function habitRow(key, title, desc) {
    return '<div class="lucky-hrow"><div><div class="lh-t">' + esc(title) + '</div><div class="lh-d">' + esc(desc) + '</div></div>' +
      '<button class="lucky-sw' + (state[key] ? " is-on" : "") + '" data-lucky="habit" data-val="' + key + '" role="switch" aria-checked="' + (!!state[key]) + '" aria-label="' + esc(title) + '"></button></div>';
  }
  function openSettings() {
    injectCSS();
    var back = document.getElementById("luckyModalBack");
    if (back) back.remove();
    back = document.createElement("div"); back.className = "lucky-modal-back"; back.id = "luckyModalBack";
    back.innerHTML =
      '<div class="lucky-modal" data-skin="' + esc(state.skin) + '" role="dialog" aria-modal="true" aria-label="Your reading companion">' +
        '<div class="lm-head"><h2>' + esc(name()) + '</h2><button class="drawer__close" data-lucky-close aria-label="Close" style="border:0;background:none;font-size:24px;line-height:1;color:var(--ink3);cursor:pointer">&times;</button></div>' +
        '<p class="lm-sub">Your reading companion. Five pets earns him a treat.</p>' +
        '<div class="lm-eyebrow">His coat</div>' +
        '<div class="lucky-grid" data-group="skin">' + SKINS.map(function (s) { return optCard("skin", s[0], s[1], s[2], state.skin === s[0]); }).join("") + '</div>' +
        '<div class="lm-eyebrow">His name</div>' +
        '<input class="lucky-name-in" id="luckyNameIn" value="' + esc(state.name) + '" maxlength="24" aria-label="Name">' +
        '<div class="lm-eyebrow">What he\'s wearing</div>' +
        '<div class="lucky-chipwrap" data-group="acc">' + ACCESSORIES.map(function (a) { return '<button class="lucky-chip' + (state.acc === a[0] ? " is-on" : "") + '" data-lucky="acc" data-val="' + a[0] + '">' + esc(a[1]) + '</button>'; }).join("") + '</div>' +
        '<div class="lm-eyebrow">How he talks</div>' +
        '<div class="lucky-grid" data-group="personality">' + Object.keys(PERSONAS).map(function (k) { var p = PERSONAS[k]; return optCard("personality", k, p.name, p.moodLine, state.personality === k); }).join("") + '</div>' +
        '<div class="lm-eyebrow">Who walks with him</div>' +
        '<div class="lucky-grid" data-group="companion">' + COMPANIONS.map(function (c) { return optCard("companion", c[0], c[1], c[2], state.companion === c[0]); }).join("") + '</div>' +
        '<div class="lm-eyebrow">What he gets after five pets</div>' +
        '<div class="lucky-grid" data-group="treat">' + TREATS.map(function (t) { return optCard("treat", t[0], t[1], t[2], state.treat === t[0]); }).join("") + '</div>' +
        '<div class="lm-eyebrow">His habits</div>' +
        habitRow("walks", "Walk across the screen", "Turn it off for a completely still page.") +
        habitRow("tips", "Show his little notes", "The bubble he carries as he passes.") +
        habitRow("treatsOn", "Treats after five pets", "Off means he just enjoys being petted.") +
        '<div class="lm-eyebrow">How often he strolls past</div>' +
        '<div class="lucky-pace"><input type="range" id="luckyPace" min="0" max="' + (PACES.length - 1) + '" step="1" value="' + paceIndex() + '"><span class="lp-read" id="luckyPaceRead">' + esc(PACES[paceIndex()][1]) + '</span></div>' +
        '<div class="lm-done"><button data-lucky-close>Done</button></div>' +
      '</div>';
    document.body.appendChild(back);

    back.addEventListener("click", function (e) {
      if (e.target === back || e.target.closest("[data-lucky-close]")) { back.remove(); return; }
      var b = e.target.closest("[data-lucky]"); if (!b) return;
      var kind = b.getAttribute("data-lucky"), val = b.getAttribute("data-val");
      if (kind === "habit") {
        state[val] = !state[val]; save();
        b.classList.toggle("is-on", !!state[val]); b.setAttribute("aria-checked", String(!!state[val]));
        if (val === "walks") { if (state.walks) { mount(); render(); } else render(); }
        else render();
        return;
      }
      // single-select groups
      var group = b.closest("[data-group]");
      if (group) group.querySelectorAll("[data-lucky]").forEach(function (x) { x.classList.remove("is-on"); });
      b.classList.add("is-on");
      state[kind] = val; save();
      // recolor the modal + faces immediately for coat changes
      if (kind === "skin") { back.querySelector(".lucky-modal").setAttribute("data-skin", val); }
      render();
    });
    var nameIn = back.querySelector("#luckyNameIn");
    if (nameIn) nameIn.addEventListener("input", function () { state.name = nameIn.value; save(); var h = back.querySelector(".lm-head h2"); if (h) h.textContent = name(); render(); });
    var pace = back.querySelector("#luckyPace"), read = back.querySelector("#luckyPaceRead");
    if (pace) pace.addEventListener("input", function () { var p = PACES[+pace.value] || PACES[2]; state.pace = p[0]; save(); if (read) read.textContent = p[1]; render(); });
    document.addEventListener("keydown", function onKey(ev) { if (ev.key === "Escape") { var m = document.getElementById("luckyModalBack"); if (m) m.remove(); document.removeEventListener("keydown", onKey); } });
  }

  function summary() {
    var coat = (SKINS.find(function (s) { return s[0] === state.skin; }) || SKINS[0]);
    return name() + " — " + coat[2].toLowerCase() + (state.walks ? "" : " (resting)");
  }

  /* ---------- boot ---------- */
  function init() {
    injectCSS(); mount(); render(); updateVisibility();
    window.addEventListener("hashchange", updateVisibility);
    // React to Wisp's motion setting flipping at runtime.
    try {
      new MutationObserver(function () { /* CSS handles calm; nothing to do */ }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    } catch (e) {}
  }

  window.WispCompanion = {
    init: init, openSettings: openSettings, stroll: stroll, summary: summary,
    render: render, setWalks: function (on) { state.walks = !!on; save(); mount(); render(); },
    walking: function () { return !!state.walks; },
    getPrefs: getPrefs, applyPrefs: applyPrefs
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
