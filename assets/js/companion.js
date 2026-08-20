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
    name: "Lucky", skin: "tabby", acc: "bell", personality: "sweet",
    walks: true, tips: true, treatsOn: true,
    pace: 34, pets: 0, treatsGiven: 0,
    companion: "none", treat: "sardine"
  };
  var state = load();
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { s = {}; }
    var out = {}; for (var k in DEF) out[k] = (s[k] === undefined ? DEF[k] : s[k]);
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
    ["bell", "Gold bell"], ["bow", "Ribbon bow"], ["crown", "Tiny crown"],
    ["flowers", "Flower crown"], ["pearls", "Pearl collar"], ["scarf", "Winter scarf"],
    ["pendant", "Star pendant"], ["kerchief", "Kerchief"], ["bare", "Bare"]
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
     Accessories are drawn in two layers so they sit like something he is
     wearing rather than a sticker on his cheek: a short piece of the collar
     (accBack) tucks behind his head, coming round from the neck; the collar
     band and its charm (accFront) cross the front of his throat, centred
     under his chin. Head-top pieces (crown, flower crown) are front-only. */
  var ACC_ART = {
    // collar band under the chin + a gold bell hanging at the centre
    bell: {
      back: '<path d="M31.4 23.8Q31 26.4 28.6 28.8" stroke="#a4506f" stroke-width="2" fill="none" stroke-linecap="round"/>',
      front: '<path d="M11 26.6Q20 32.8 29 26.6" stroke="#b0567a" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
        '<path d="M20 31.6v1.5" stroke="#7d5a20" stroke-width=".9" stroke-linecap="round"/>' +
        '<circle cx="20" cy="34.9" r="2.3" fill="#e6b95e" stroke="#7d5a20" stroke-width=".8"/>' +
        '<path d="M19 34.5h2" stroke="#7d5a20" stroke-width=".7" stroke-linecap="round"/><circle cx="19.4" cy="34.1" r=".5" fill="#f6dca0"/>'
    },
    // collar band + a ribbon bow knotted at the centre
    bow: {
      back: '<path d="M31.4 23.8Q31 26.4 28.6 28.8" stroke="#d76e90" stroke-width="1.9" fill="none" stroke-linecap="round"/>',
      front: '<path d="M11 26.6Q20 32.4 29 26.6" stroke="#e8799c" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
        '<path d="M20 31.9 14.6 29.9 15.5 34.6Z" fill="#e8799c" stroke="#93304f" stroke-width=".6" stroke-linejoin="round"/>' +
        '<path d="M20 31.9 25.4 29.9 24.5 34.6Z" fill="#e8799c" stroke="#93304f" stroke-width=".6" stroke-linejoin="round"/>' +
        '<circle cx="20" cy="32" r="1.5" fill="#f7b3c7" stroke="#93304f" stroke-width=".5"/>'
    },
    // a thin cord + a little gold star pendant
    pendant: {
      back: '<path d="M31.4 24Q31 26.4 28.8 28.6" stroke="#bd9550" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
      front: '<path d="M11 26.8Q20 32.4 29 26.8" stroke="#c9a15c" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
        '<path d="M20 31.9l.95 1.95 2.15.2-1.6 1.45.5 2.1-2-1.15-2 1.15.5-2.1-1.6-1.45 2.15-.2z" fill="#e6b95e" stroke="#7d5a20" stroke-width=".6" stroke-linejoin="round"/>'
    },
    // a strand of pearls following the collar line
    pearls: {
      back: '<circle cx="30.8" cy="25.2" r="1.3" fill="#efe7dd" stroke="#a89a90" stroke-width=".55"/><circle cx="29.8" cy="27.6" r="1.3" fill="#efe7dd" stroke="#a89a90" stroke-width=".55"/>',
      front: '<circle cx="11.8" cy="27.2" r="1.4" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="14.4" cy="29.4" r="1.4" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="17.4" cy="30.9" r="1.4" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="20.6" cy="31.3" r="1.4" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="23.6" cy="30.6" r="1.4" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="26.4" cy="29" r="1.4" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/>'
    },
    // a soft winter scarf wrapping the throat, with a hanging end
    scarf: {
      back: '<path d="M31.6 23.4Q31.2 26.4 28.4 29.2" stroke="#9c4a68" stroke-width="3.6" fill="none" stroke-linecap="round"/>',
      front: '<path d="M11 26.4Q20 33.2 29 26.4" stroke="#b0567a" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M16.6 31.8l-2.2 6.8 4.8-1.3z" fill="#95496a" stroke="#7c3350" stroke-width=".6" stroke-linejoin="round"/>' +
        '<path d="M13 28.4Q20 33 27 28.4" stroke="#f7c8d8" stroke-width=".9" fill="none"/>'
    },
    // a triangle kerchief knotted at the throat
    kerchief: {
      back: '<path d="M31.4 23.8Q31 26.4 28.6 28.8" stroke="#7a3149" stroke-width="2" fill="none" stroke-linecap="round"/>',
      front: '<path d="M13.8 30.4 26.2 30.4 20 39Z" fill="#8c3b57" stroke="#571f34" stroke-width=".8" stroke-linejoin="round"/>' +
        '<circle cx="20" cy="30.4" r="1.7" fill="#8c3b57" stroke="#571f34" stroke-width=".7"/>' +
        '<circle cx="18.8" cy="32.6" r=".7" fill="#f7c8d8"/><circle cx="21.4" cy="32.4" r=".7" fill="#f7c8d8"/><circle cx="20" cy="35" r=".7" fill="#f7c8d8"/>'
    },
    // head-top pieces: no collar, just the crown / flowers resting on his head
    crown: {
      back: '', front: '<path d="M14.8 12.2l1-6 2.9 2.9 1.8-3.8 1.8 3.8 2.9-2.9 1 6z" fill="#e6b95e" stroke="#7d5a20" stroke-width=".9" stroke-linejoin="round"/><circle cx="17.4" cy="10.4" r=".85" fill="#b0567a"/><circle cx="20.5" cy="9.7" r=".95" fill="#b0567a"/><circle cx="23.6" cy="10.4" r=".85" fill="#b0567a"/>'
    },
    flowers: {
      back: '', front: '<path d="M13.4 13q3.2-4.4 6.8-4.4T27 13" stroke="#6f8f5f" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="14.6" cy="11.8" r="2" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="20.2" cy="8.8" r="2.3" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="25.8" cy="11.8" r="2" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="14.6" cy="11.8" r=".8" fill="#e6b95e"/><circle cx="20.2" cy="8.8" r=".9" fill="#e6b95e"/><circle cx="25.8" cy="11.8" r=".8" fill="#e6b95e"/>'
    }
  };
  function accBack(acc) { var a = ACC_ART[acc]; return a ? a.back : ""; }
  function accFront(acc) { var a = ACC_ART[acc]; return a ? a.front : ""; }
  function walkerSvg() {
    return '<svg width="86" height="52" viewBox="0 0 72 48" fill="none" aria-hidden="true">' +
      // tail (behind the body), with a lighter tip; rotates as one group
      '<g class="lucky-tail"><path d="M57 27q11 -1 8.6 -15.4" stroke="var(--fur)" stroke-width="5.4" fill="none" stroke-linecap="round"/><circle cx="65.4" cy="11.8" r="3" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".7"/></g>' +
      // back legs (darker for depth), with pale paw tips
      '<g class="lucky-leg" style="animation-delay:-.31s"><rect x="47" y="30.5" width="6" height="13.5" rx="3" fill="var(--fur2)"/><ellipse cx="50" cy="44" rx="3.4" ry="2.1" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".7"/></g>' +
      '<g class="lucky-leg"><rect x="28.5" y="30.5" width="6" height="13.5" rx="3" fill="var(--fur2)"/><ellipse cx="31.5" cy="44" rx="3.4" ry="2.1" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".7"/></g>' +
      // body: one smooth oval, with a soft white belly
      '<ellipse cx="42" cy="26" rx="20" ry="11.6" fill="var(--fur)"/>' +
      '<ellipse cx="39" cy="32" rx="14" ry="5.2" fill="var(--belly)"/>' +
      // front legs (coat colour), with pale paw tips
      '<g class="lucky-leg"><rect x="52.5" y="30.5" width="6" height="13.5" rx="3" fill="var(--fur)"/><ellipse cx="55.5" cy="44" rx="3.4" ry="2.1" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".7"/></g>' +
      '<g class="lucky-leg" style="animation-delay:-.31s"><rect x="33.5" y="30.5" width="6" height="13.5" rx="3" fill="var(--fur)"/><ellipse cx="36.5" cy="44" rx="3.4" ry="2.1" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".7"/></g>' +
      // ears: clean triangles with a pink inner
      '<path d="M9.4 12.6 12.4 2.3 19.4 9.1Z" fill="var(--fur)"/>' +
      '<path d="M21.4 9 28.6 2.5 30.6 12.7Z" fill="var(--fur)"/>' +
      '<path d="M12 10.7 13.4 5.1 17.1 8.7Z" fill="var(--ear)"/>' +
      '<path d="M23.4 8.9 27.1 5.5 28.4 10.9Z" fill="var(--ear)"/>' +
      // the collar comes round from behind the neck (tucks under the head)
      accBack(state.acc) +
      // head
      '<circle cx="20" cy="19.2" r="12.4" fill="var(--head)"/>' +
      // cheeks
      '<circle cx="11.6" cy="23.2" r="2.2" fill="var(--ear)" opacity=".4"/>' +
      '<circle cx="28.4" cy="23.2" r="2.2" fill="var(--ear)" opacity=".4"/>' +
      // eyes (blink) with a single highlight each
      '<ellipse class="lucky-eye" cx="15" cy="19" rx="2.5" ry="3" fill="var(--eye)"/>' +
      '<ellipse class="lucky-eye" cx="24.4" cy="19" rx="2.5" ry="3" fill="var(--eye)"/>' +
      '<circle cx="15.9" cy="17.8" r=".85" fill="#fff"/><circle cx="25.3" cy="17.8" r=".85" fill="#fff"/>' +
      // nose + gentle smile
      '<path d="M18.2 23.4h3.6l-1.8 2z" fill="var(--nose)"/>' +
      '<path d="M20 25.5c-1 1.3-3 1.3-3.8.1M20 25.5c1 1.3 3 1.3 3.8.1" stroke="var(--fur3)" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      // whiskers, both sides of the muzzle (mirrored around the head centre, x=20)
      '<path d="M3.4 20.6 11 21.6M3 23.5 11 23.3M3.4 26.4 11 25 M36.6 20.6 29 21.6M37 23.5 29 23.3M36.6 26.4 29 25" stroke="var(--fur3)" stroke-width=".8" opacity=".5" stroke-linecap="round"/>' +
      // the collar band + charm, across the front of his throat
      accFront(state.acc) + '</svg>';
  }
  var COMPANION_SVG = {
    // all face left, the way they walk. Clean single-body shapes with soft
    // outlines so they read on their own rather than as overlapping blobs.
    mouse: '<svg width="38" height="24" viewBox="0 0 38 24" fill="none">' +
      '<path d="M26 16q8 2 9-5" stroke="#b7aca6" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="18" cy="15" rx="10" ry="6.6" fill="#b0a8a3" stroke="#94897f" stroke-width=".8"/>' +
      '<circle cx="9.6" cy="8.2" r="4.3" fill="#b8b0ab" stroke="#94897f" stroke-width=".8"/>' +
      '<circle cx="9.6" cy="8.2" r="2.4" fill="#e3b9c1"/>' +
      '<circle cx="8.6" cy="14.4" r="5.5" fill="#bcb4af" stroke="#94897f" stroke-width=".8"/>' +
      '<circle cx="6.2" cy="13.6" r="1" fill="#33272a"/>' +
      '<ellipse cx="3.2" cy="15.4" rx="1.4" ry="1" fill="#d98c9a"/>' +
      '<path d="M3.2 15 .6 13.9M3.2 15.9 .6 16.8" stroke="#a99a92" stroke-width=".5" stroke-linecap="round"/>' +
      '<ellipse cx="14.4" cy="21" rx="1.8" ry="1.1" fill="#e3b9c1"/>' +
      '<ellipse cx="20.8" cy="21.2" rx="1.8" ry="1.1" fill="#e3b9c1"/></svg>',
    duckling: '<svg width="34" height="30" viewBox="0 0 34 30" fill="none">' +
      '<ellipse cx="19" cy="18.6" rx="9.8" ry="7.6" fill="#f4d06a" stroke="#d9a94a" stroke-width=".9"/>' +
      '<path d="M20 15.4q5 1 4.6 6.2-3.4.4-4.6-6.2z" fill="#e6bd52" stroke="#d1a244" stroke-width=".7"/>' +
      '<circle cx="10.4" cy="9.6" r="6" fill="#f6dd8f" stroke="#e2c56a" stroke-width=".8"/>' +
      '<path d="M9.4 3.8q.9-1.7 2.2-.4" stroke="#e2c56a" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M4.6 8.9 .5 10.4 4.6 12z" fill="#ef9a3c" stroke="#c9761c" stroke-width=".6" stroke-linejoin="round"/>' +
      '<circle cx="8.4" cy="8.4" r="1.2" fill="#33272a"/>' +
      '<path d="M16 25.8l-1.2 3.4M22 25.8l1.2 3.4" stroke="#ef9a3c" stroke-width="1.8" stroke-linecap="round"/></svg>',
    bee: '<svg width="34" height="26" viewBox="0 0 34 26" fill="none">' +
      '<path d="M28.4 15l4.2-1.5-.2 3.4z" fill="#3a2f22"/>' +
      '<ellipse cx="17" cy="15" rx="9.4" ry="6.4" fill="#f0c65c" stroke="#a97f24" stroke-width=".9"/>' +
      '<path d="M15.2 9.4v11.2M19.4 9.8v10.4M23 11.6v6.8" stroke="#3a2f22" stroke-width="2.2" stroke-linecap="round"/>' +
      '<ellipse cx="15" cy="7.6" rx="4.6" ry="2.8" fill="#eaf3fa" stroke="#bcd2e2" stroke-width=".8" opacity=".92" transform="rotate(-16 15 7.6)"/>' +
      '<ellipse cx="20.4" cy="8.2" rx="3.8" ry="2.4" fill="#eaf3fa" stroke="#bcd2e2" stroke-width=".8" opacity=".92" transform="rotate(-4 20.4 8.2)"/>' +
      '<circle cx="8.6" cy="14.6" r="4.5" fill="#3a2f22"/>' +
      '<circle cx="6.8" cy="13.4" r="1.1" fill="#fdf7ef"/>' +
      '<path d="M7 10.7 5.5 7.2M10 10.7 11.3 7.2" stroke="#3a2f22" stroke-width="1" stroke-linecap="round"/>' +
      '<circle cx="5.3" cy="6.5" r=".9" fill="#3a2f22"/><circle cx="11.5" cy="6.5" r=".9" fill="#3a2f22"/></svg>',
    snail: '<svg width="38" height="26" viewBox="0 0 38 26" fill="none">' +
      '<path d="M5 22.6q-3 0-3-2.4 0-2.6 3-2.6h15q3 0 3 2.6 0 2.4-3 2.4z" fill="#e9d6ba" stroke="#c8ad86" stroke-width=".9"/>' +
      '<circle cx="7.5" cy="16.8" r="3.7" fill="#ecdac0" stroke="#c8ad86" stroke-width=".9"/>' +
      '<path d="M5.8 13.7 4.6 9.2M9.2 13.5 10.3 9" stroke="#c8ad86" stroke-width="1.2" stroke-linecap="round"/>' +
      '<circle cx="4.4" cy="8.4" r="1.2" fill="#4a3b2f"/><circle cx="10.5" cy="8.2" r="1.2" fill="#4a3b2f"/>' +
      '<circle cx="23.5" cy="12.6" r="8.2" fill="#d9a768" stroke="#a97b45" stroke-width="1.1"/>' +
      '<path d="M23.5 12.6a3.5 3.5 0 0 1 3.5 3.5 7 7 0 0 1-10.2-1.4 9.6 9.6 0 0 1 13.2 1" fill="none" stroke="#b98a52" stroke-width="1.2" stroke-linecap="round"/></svg>',
    // Pip copies Lucky, so he wears Lucky's coat and shares his little gait.
    kitten: '<svg width="40" height="28" viewBox="0 0 40 28" fill="none">' +
      '<g class="lucky-tail"><path d="M30 17q6 0 5-6.4" stroke="var(--fur)" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="35" cy="10.6" r="1.8" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".5"/></g>' +
      '<g class="lucky-leg"><rect x="24.5" y="18.4" width="3.6" height="7.8" rx="1.8" fill="var(--fur2)"/><ellipse cx="26.3" cy="26.2" rx="2" ry="1.2" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".5"/></g>' +
      '<ellipse cx="21" cy="16.4" rx="10.4" ry="6.2" fill="var(--fur)"/>' +
      '<ellipse cx="19.4" cy="19.4" rx="7" ry="3" fill="var(--belly)"/>' +
      '<g class="lucky-leg" style="animation-delay:-.31s"><rect x="27" y="18.4" width="3.6" height="7.8" rx="1.8" fill="var(--fur)"/><ellipse cx="28.8" cy="26.2" rx="2" ry="1.2" fill="var(--paw)" stroke="var(--paw-line)" stroke-width=".5"/></g>' +
      '<path d="M5 8.6 6.4 3.2 10.6 6.8Z" fill="var(--fur)"/><path d="M12.4 6.6 16.7 3.4 17.6 8.9Z" fill="var(--fur)"/>' +
      '<path d="M6.6 7.7 7.4 4.7 9.7 6.6Z" fill="var(--ear)"/><path d="M13.6 6.5 15.9 4.9 16.5 8Z" fill="var(--ear)"/>' +
      '<circle cx="11.2" cy="12" r="6.6" fill="var(--head)"/>' +
      '<ellipse class="lucky-eye" cx="8.7" cy="12" rx="1.3" ry="1.6" fill="var(--eye)"/>' +
      '<ellipse class="lucky-eye" cx="13.7" cy="12" rx="1.3" ry="1.6" fill="var(--eye)"/>' +
      '<circle cx="9.2" cy="11.2" r=".5" fill="#fff"/><circle cx="14.2" cy="11.2" r=".5" fill="#fff"/>' +
      '<path d="M10 15h2.4l-1.2 1.3z" fill="var(--nose)"/></svg>'
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
  function faceSvg(size) {
    size = size || 34;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 40 40" fill="none" data-lucky-face="' + size + '">' +
      '<path d="M8 12l1.4-7 5.6 5z" fill="var(--fur)"/><path d="M32 12l-1.4-7-5.6 5z" fill="var(--fur)"/>' +
      '<path d="M10.5 11l.9-4 3 2.7z" fill="var(--ear)"/><path d="M29.5 11l-.9-4-3 2.7z" fill="var(--ear)"/>' +
      '<circle cx="20" cy="22" r="14" fill="var(--head)"/>' +
      '<circle cx="14.5" cy="20" r="2.1" fill="var(--eye)"/><circle cx="25.5" cy="20" r="2.1" fill="var(--eye)"/>' +
      '<circle cx="15.2" cy="19.3" r=".6" fill="#fff"/><circle cx="26.2" cy="19.3" r=".6" fill="#fff"/>' +
      '<path d="M18.4 25h3.2l-1.6 1.9z" fill="var(--nose)"/>' +
      '<path d="M20 26.9c-.9 1.3-2.6 1.3-3.4.2M20 26.9c.9 1.3 2.6 1.3 3.4.2" stroke="var(--fur3)" stroke-width="1.1" stroke-linecap="round"/>' +
      '<circle cx="11.5" cy="25.5" r="2.2" fill="var(--ear)" opacity=".5"/><circle cx="28.5" cy="25.5" r="2.2" fill="var(--ear)" opacity=".5"/>' +
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
      prefix + '.lucky-leg[style*="-.31s"]{animation-delay:-.31s !important}' +
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
    '.lucky-tail{transform-box:fill-box;transform-origin:0 100%;animation:lucky-tail 1.6s ease-in-out infinite}' +
    '.lucky-eye{transform-box:fill-box;transform-origin:50% 50%;animation:lucky-blink 4.2s ease-in-out infinite}' +
    '@keyframes lucky-walk{from{transform:translateX(0)}to{transform:translateX(calc(-100vw - 120px))}}' +
    '@keyframes lucky-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}' +
    '@keyframes lucky-leg{0%,100%{transform:rotate(15deg)}50%{transform:rotate(-15deg)}}' +
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
