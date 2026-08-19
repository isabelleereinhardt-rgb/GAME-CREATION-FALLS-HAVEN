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
      tips: ["Read the chapter you've been saving. It's still there.", "A comment can make a writer's whole week. Leave one.",
        "Bookmark it now; find it later. That's the whole trick.", "Take a sip of something warm. The next chapter can wait five minutes.",
        "Every work here was written by a real person. Be kind in the margins.", "Follow a tag you love and your home fills up with it."] },
    grumpy: { name: "Grumpy", glyph: "✦", mood: "Unimpressed",
      moodLine: "He will deny enjoying any of this. He is lying.",
      treat: "Finally. Put it down there.", thanks: "He is purring. He would like that stricken from the record.",
      tips: ["Still reading. Good. Don't make it weird.", "You have a bookmark button and you're still scrolling. Astonishing.",
        "That work was better than you'll admit. Heart it.", "Back to the draft. It won't finish itself.",
        "Fine. Leave a comment. The author will pretend not to care, like me."] },
    regal: { name: "Regal", glyph: "✧", mood: "Gracious",
      moodLine: "He considers your desk a throne and you its steward.",
      treat: "Tribute. Acceptable.", thanks: "The court is satisfied. You may rise.",
      tips: ["The court awaits your next chapter. Do not keep it waiting.", "A wise reader hearts what they finish. Reward good work.",
        "Sit up. Posture is half of prose.", "Name a fandom and follow its hub; let the realm come to you.",
        "Your library is a collection worth curating. Tend it."] },
    sleepy: { name: "Sleepy", glyph: "☾", mood: "Drowsy",
      moodLine: "He is mostly asleep, but he is asleep near you.",
      treat: "Mmh. Treat. Thank you.", thanks: "He carries it off to the warm spot and forgets about it.",
      tips: ["There is no hurry. The story keeps perfectly well overnight.", "One chapter counts. Rest is part of it.",
        "Everything saves itself. Close the tab whenever you like.", "A short read before bed is still a read."] },
    gremlin: { name: "Gremlin", glyph: "✸", mood: "Feral",
      moodLine: "Something was knocked off the desk. No witnesses. No suspects.",
      treat: "MINE. I am taking this under the sofa.", thanks: "Gone. Under the sofa. It lives there now.",
      tips: ["I walked across your keyboard and invented a new character. You're welcome.", "Write the unhinged version first. Be respectable in the second draft.",
        "Heart it. Heart it again. It is very satisfying.", "Comment something feral and supportive. Those are the best kind.",
        "Delete nothing in anger. I've seen you. Sleep on it."] },
    scholar: { name: "Scholar", glyph: "✜", mood: "Studious",
      moodLine: "He has read your canon twice and has notes.",
      treat: "Thank you. I shall record this in the ledger.", thanks: "Duly noted, dated, and filed under Provisions.",
      tips: ["Tag your work well; a reader two years from now will thank you.", "Consistency isn't the same as quality, but it's cheaper to fix.",
        "Leave a real comment — the specific kind, about one line.", "Regularity beats inspiration. The record shows it.",
        "Read outside your fandom once a week. It sharpens the pen."] }
  };
  function persona() { return PERSONAS[state.personality] || PERSONAS.sweet; }

  /* ---------- coat palettes ---------- */
  var SKIN_CSS =
    '[data-skin="tabby"]{--fur:#e8963f;--fur2:#cf7f2e;--fur3:#c9741f;--head:#eda256;--belly:#f8e6d2;--ear:#eeb0ae;--nose:#e08b96;--eye:#3a2a22}' +
    '[data-skin="calico"]{--fur:#f3e7d8;--fur2:#dcc6ae;--fur3:#c98a4a;--head:#f7efe4;--belly:#fffaf3;--ear:#eeb0ae;--nose:#e08b96;--eye:#3a2a22}' +
    '[data-skin="grey"]{--fur:#9aa3ad;--fur2:#7c858f;--fur3:#68717c;--head:#a7b0b9;--belly:#e9edf1;--ear:#e0aeb6;--nose:#d8929c;--eye:#2c3238}' +
    '[data-skin="tux"]{--fur:#2f2b30;--fur2:#221f24;--fur3:#4a444c;--head:#35313a;--belly:#f6f2ee;--ear:#c98f9a;--nose:#dba0aa;--eye:#f0d98a}' +
    '[data-skin="cream"]{--fur:#f2ded0;--fur2:#e2c9b6;--fur3:#cbab93;--head:#f6e6da;--belly:#fffaf5;--ear:#eeb0ae;--nose:#dd97a3;--eye:#6f7f9c}' +
    '[data-skin="siamese"]{--fur:#e6dcd0;--fur2:#c3b3a4;--fur3:#6b5648;--head:#efe7dd;--belly:#fdf8f3;--ear:#8a6a5c;--nose:#d79aa2;--eye:#5f8fc4}';

  /* ---------- drawings (author's own art, ported verbatim) ---------- */
  function accessorySvg(acc) {
    return ({
      bell: '<path d="M28.9 23.2A9.6 9.6 0 0 1 22.6 29.3" stroke="#b0567a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M26.2 27.6v1.2" stroke="#7d5a20" stroke-width=".8" stroke-linecap="round"/><circle cx="26.2" cy="30.4" r="2.2" fill="#e6b95e" stroke="#7d5a20" stroke-width=".8"/><path d="M25.3 30.1h1.8" stroke="#7d5a20" stroke-width=".7" stroke-linecap="round"/>',
      bow: '<path d="M28.9 23.2A9.6 9.6 0 0 1 22.6 29.3" stroke="#e8799c" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M26.4 27.4l-4-2.4.7 5z" fill="#e8799c" stroke="#93304f" stroke-width=".6"/><path d="M27.6 27.2l4.3-1.5-1.2 4.8z" fill="#e8799c" stroke="#93304f" stroke-width=".6"/><circle cx="27" cy="27.8" r="1.4" fill="#f7b3c7" stroke="#93304f" stroke-width=".5"/>',
      crown: '<path d="M14.8 12.2l1-6 2.9 2.9 1.8-3.8 1.8 3.8 2.9-2.9 1 6z" fill="#e6b95e" stroke="#7d5a20" stroke-width=".9"/><circle cx="17.4" cy="10.4" r=".85" fill="#b0567a"/><circle cx="20.5" cy="9.7" r=".95" fill="#b0567a"/><circle cx="23.6" cy="10.4" r=".85" fill="#b0567a"/>',
      flowers: '<path d="M13.4 13q3.2-4.4 6.8-4.4T27 13" stroke="#6f8f5f" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="14.6" cy="11.8" r="2" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="20.2" cy="8.8" r="2.3" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="25.8" cy="11.8" r="2" fill="#fdf2f5" stroke="#b0567a" stroke-width=".7"/><circle cx="14.6" cy="11.8" r=".8" fill="#e6b95e"/><circle cx="20.2" cy="8.8" r=".9" fill="#e6b95e"/><circle cx="25.8" cy="11.8" r=".8" fill="#e6b95e"/>',
      pearls: '<circle cx="28.6" cy="24" r="1.5" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="27.3" cy="26.3" r="1.5" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="25.5" cy="28.1" r="1.5" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/><circle cx="23.2" cy="29.3" r="1.5" fill="#fbf7f2" stroke="#8f7f78" stroke-width=".6"/>',
      scarf: '<path d="M29.4 22.6A10.2 10.2 0 0 1 22.4 30" stroke="#b0567a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M23.8 30l-2 6.6 4.4-1.4z" fill="#95496a" stroke="#7c3350" stroke-width=".6"/><path d="M28.4 24.4A8.4 8.4 0 0 1 23.4 29.2" stroke="#f7c8d8" stroke-width=".9" fill="none"/>',
      pendant: '<path d="M28.9 23.2A9.6 9.6 0 0 1 22.6 29.3" stroke="#c9a15c" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M26.2 28.6l.9 1.9 2 .2-1.5 1.4.5 2-1.9-1.1-1.9 1.1.5-2-1.5-1.4 2-.2z" fill="#e6b95e" stroke="#7d5a20" stroke-width=".6"/>',
      kerchief: '<path d="M28.9 23.2A9.6 9.6 0 0 1 22.6 29.3l7 6.2z" fill="#8c3b57" stroke="#571f34" stroke-width=".8"/><circle cx="26.4" cy="27.6" r=".7" fill="#f7c8d8"/><circle cx="27.8" cy="30.4" r=".7" fill="#f7c8d8"/><circle cx="24.8" cy="29.6" r=".7" fill="#f7c8d8"/>'
    })[acc] || "";
  }
  function walkerSvg() {
    return '<svg width="86" height="52" viewBox="0 0 72 48" fill="none" aria-hidden="true">' +
      '<path class="lucky-tail" d="M56 25c9-1 9-8 8-14" stroke="var(--fur)" stroke-width="5" stroke-linecap="round"/>' +
      '<rect class="lucky-leg" x="46" y="32" width="5" height="13" rx="2.5" fill="var(--fur2)"/>' +
      '<rect class="lucky-leg" x="28" y="32" width="5" height="13" rx="2.5" fill="var(--fur2)" style="animation-delay:-.31s"/>' +
      '<rect x="23" y="19" width="34" height="17" rx="8.5" fill="var(--fur)"/>' +
      '<ellipse cx="40" cy="33" rx="13" ry="4" fill="var(--belly)"/>' +
      '<path d="M32 20v14M39 20v14M46 20v15" stroke="var(--fur3)" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>' +
      '<rect class="lucky-leg" x="51" y="32" width="5" height="13" rx="2.5" fill="var(--fur)" style="animation-delay:-.31s"/>' +
      '<rect class="lucky-leg" x="33" y="32" width="5" height="13" rx="2.5" fill="var(--fur)"/>' +
      '<path d="M11 13l2-9 8 7z" fill="var(--fur)"/><path d="M22 10l8-6 .5 9z" fill="var(--fur)"/>' +
      '<path d="M13.5 11l1-4.5 3.6 3.2z" fill="var(--ear)"/><path d="M24 10l4-3 .3 4.6z" fill="var(--ear)"/>' +
      '<circle cx="20" cy="20" r="11" fill="var(--head)"/>' +
      '<path d="M17 11.5c1.6 1.4 4 1.4 5.6 0M14 15.5l3.4 1.6" stroke="var(--fur3)" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>' +
      '<circle class="lucky-eye" cx="15" cy="20" r="2" fill="var(--eye)"/>' +
      '<circle class="lucky-eye" cx="24" cy="20" r="2" fill="var(--eye)"/>' +
      '<circle cx="15.7" cy="19.3" r=".6" fill="#fff"/><circle cx="24.7" cy="19.3" r=".6" fill="#fff"/>' +
      '<path d="M18 24.4h3l-1.5 1.8z" fill="var(--nose)"/>' +
      '<path d="M19.5 26.2c-.8 1.2-2.4 1.2-3.2.2M19.5 26.2c.8 1.2 2.4 1.2 3.2.2" stroke="var(--fur3)" stroke-width="1.1" stroke-linecap="round"/>' +
      '<circle cx="11.5" cy="24" r="2.2" fill="var(--ear)" opacity=".55"/>' +
      '<circle cx="28.5" cy="24" r="2.2" fill="var(--ear)" opacity=".55"/>' +
      '<path d="M6 22.5l5 .8M6 26l5-.6M31 23.3l5-.8M31 25.4l5 .6" stroke="var(--belly)" stroke-width="1" stroke-linecap="round"/>' +
      accessorySvg(state.acc) + '</svg>';
  }
  var COMPANION_SVG = {
    mouse: '<svg width="36" height="24" viewBox="0 0 36 24" fill="none"><path d="M23 16c7 .8 10-1.4 9.4-4.4" stroke="#a99e98" stroke-width="1.5" fill="none" stroke-linecap="round"></path><ellipse cx="15" cy="15" rx="9.6" ry="6.4" fill="#a9a29d"></ellipse><circle cx="9.6" cy="8.8" r="3.7" fill="#c0b9b4"></circle><circle cx="16.4" cy="7.6" r="3.5" fill="#c0b9b4"></circle><circle cx="9.6" cy="8.8" r="2.1" fill="#e0b4bd"></circle><circle cx="16.4" cy="7.6" r="2" fill="#e0b4bd"></circle><circle cx="6.6" cy="14.4" r="4.8" fill="#b8b1ac"></circle><circle cx="4" cy="13.6" r="1" fill="#33272a"></circle><circle cx="2.2" cy="15.8" r="1" fill="#d98c9a"></circle><circle cx="12" cy="21" r="1.5" fill="#e0b4bd"></circle><circle cx="18.4" cy="21.2" r="1.5" fill="#e0b4bd"></circle></svg>',
    duckling: '<svg width="32" height="30" viewBox="0 0 32 30" fill="none"><ellipse cx="18" cy="18.6" rx="9.6" ry="7.4" fill="#f0cb63"></ellipse><path d="M19.4 15.4c4.2 1.6 4.8 5.2 1.6 7-2.6-.8-3.4-4.2-1.6-7z" fill="#e0b247"></path><circle cx="10.4" cy="10" r="5.6" fill="#f6dd8f"></circle><path d="M5.4 9.4l-4.2 1 4 2.4z" fill="#e08a3c" stroke="#b8681f" stroke-width=".6"></path><circle cx="8.8" cy="8.8" r="1.1" fill="#33272a"></circle><path d="M15 25.6l-1 3.4M21 25.6l1 3.4" stroke="#e08a3c" stroke-width="1.6" stroke-linecap="round"></path></svg>',
    bee: '<svg width="32" height="26" viewBox="0 0 32 26" fill="none"><ellipse cx="17" cy="15" rx="8.6" ry="6" fill="#f0c65c" stroke="#a97f24" stroke-width=".6"></ellipse><path d="M14 9.6v10.8M18 9.6v10.6M22 11.4v7" stroke="#3a2f22" stroke-width="2.2" stroke-linecap="round"></path><path d="M25.4 15l3.4-1.6v3.2z" fill="#3a2f22"></path><ellipse cx="15" cy="7.4" rx="5.4" ry="3.1" fill="#eaf3fa" stroke="#bcd2e2" stroke-width=".7" opacity=".9"></ellipse><circle cx="8" cy="14.4" r="4.6" fill="#3a2f22"></circle><circle cx="6.2" cy="13.4" r="1.1" fill="#fdf7ef"></circle></svg>',
    snail: '<svg width="36" height="26" viewBox="0 0 36 26" fill="none"><path d="M4 21.4h17" stroke="#cbb69c" stroke-width="4.4" stroke-linecap="round"></path><path d="M6 19.6q1.4-6 7-6" stroke="#cbb69c" stroke-width="4" fill="none" stroke-linecap="round"></path><circle cx="21.6" cy="12.6" r="8.4" fill="#d9a768" stroke="#a97b45" stroke-width="1"></circle><path d="M21.6 12.6a3.2 3.2 0 0 1 3.2 3.2 6.4 6.4 0 0 1-9.6-1.6 9 9 0 0 1 12.8 1" fill="none" stroke="#a97b45" stroke-width="1.2"></path><circle cx="7" cy="16.4" r="3.4" fill="#d6c2a8"></circle><circle cx="4" cy="8.4" r="1.1" fill="#33272a"></circle><circle cx="10" cy="8.2" r="1.1" fill="#33272a"></circle></svg>',
    kitten: '<svg width="40" height="28" viewBox="0 0 40 28" fill="none"><path class="lucky-tail" d="M28 16.4c5.6-.2 5.2-5 3.6-8" stroke="var(--fur)" stroke-width="3.2" stroke-linecap="round"></path><rect class="lucky-leg" x="15" y="18.6" width="3.2" height="7.4" rx="1.6" fill="var(--fur2)"></rect><rect class="lucky-leg" x="22.4" y="18.6" width="3.2" height="7.4" rx="1.6" fill="var(--fur2)" style="animation-delay:-.31s"></rect><rect x="11.6" y="11.6" width="17" height="10" rx="5" fill="var(--fur)"></rect><ellipse cx="20.6" cy="20" rx="6.6" ry="2.4" fill="var(--belly)"></ellipse><rect class="lucky-leg" x="18.6" y="18.6" width="3.2" height="7.4" rx="1.6" fill="var(--fur)" style="animation-delay:-.16s"></rect><rect class="lucky-leg" x="25.4" y="18.6" width="3.2" height="7.4" rx="1.6" fill="var(--fur)"></rect><path d="M6 8.6l.9-5 3.9 3.7z" fill="var(--fur)"></path><path d="M12.6 7.6l4.1-3.5.3 4.9z" fill="var(--fur)"></path><circle cx="11" cy="12.6" r="6.4" fill="var(--head)"></circle><circle cx="8.6" cy="12.4" r="1.3" fill="var(--eye)"></circle><circle cx="13.4" cy="12.4" r="1.3" fill="var(--eye)"></circle><path d="M10 15h2l-1 1.2z" fill="var(--nose)"></path></svg>'
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
  var CSS = SKIN_CSS +
    '.lucky-stage{position:fixed;left:0;right:0;bottom:0;height:250px;pointer-events:none;z-index:24;overflow:hidden}' +
    '.lucky-stage[hidden]{display:none}' +
    '.lucky-walk{position:absolute;bottom:10px;left:100vw;pointer-events:auto;cursor:pointer;animation:lucky-walk var(--pace,34s) linear infinite}' +
    '.lucky-bob{animation:lucky-bob .6s ease-in-out infinite}' +
    '.lucky-leg{transform-box:fill-box;transform-origin:50% 0;animation:lucky-leg .62s ease-in-out infinite}' +
    '.lucky-tail{transform-box:fill-box;transform-origin:0 100%;animation:lucky-tail 1.6s ease-in-out infinite}' +
    '.lucky-eye{transform-box:fill-box;transform-origin:50% 50%;animation:lucky-blink 4.2s ease-in-out infinite}' +
    '@keyframes lucky-walk{from{transform:translateX(0)}to{transform:translateX(calc(-100vw - 120px))}}' +
    '@keyframes lucky-bob{0%,100%{transform:translateY(0)}25%{transform:translateY(-2.8px)}50%{transform:translateY(0)}75%{transform:translateY(-1.4px)}}' +
    '@keyframes lucky-leg{0%,100%{transform:rotate(20deg)}50%{transform:rotate(-20deg)}}' +
    '@keyframes lucky-tail{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(16deg)}}' +
    '@keyframes lucky-blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}' +
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
    /* Lucky is an opt-in companion the reader turned on, and he has his own
       "Walk across the screen" switch in his settings — that is his off switch.
       The site's global Reduce-motion rule kills every animation with
       `* { animation: none !important }`, which would freeze him; but a
       class-specific !important beats a universal one, so we re-enable his walk
       here. Turning him off is a deliberate choice, not a motion-setting side
       effect. (Petals, confetti, and page flourishes still respect Reduce motion.) */
    ':root[data-motion="reduce"] .lucky-walk{animation:lucky-walk var(--pace,34s) linear infinite !important}' +
    ':root[data-motion="reduce"] .lucky-walk.treating{animation:lucky-hopaway 4.6s ease-in forwards !important}' +
    ':root[data-motion="reduce"] .lucky-bob{animation:lucky-bob .6s ease-in-out infinite !important}' +
    ':root[data-motion="reduce"] .lucky-leg{animation:lucky-leg .62s ease-in-out infinite !important}' +
    ':root[data-motion="reduce"] .lucky-tail{animation:lucky-tail 1.6s ease-in-out infinite !important}' +
    ':root[data-motion="reduce"] .lucky-eye{animation:lucky-blink 4.2s ease-in-out infinite !important}' +
    ':root[data-motion="reduce"] .lucky-tip{animation:tip-window var(--pace,34s) linear infinite !important}' +
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
  function pet(walk) {
    var n = (state.pets || 0) + 1;
    if (!state.treatsOn) { state.pets = n % 5; save(); paintPets(); return; }
    if (n < 5) { state.pets = n; save(); paintPets(); return; }
    // fifth pet: a treat, a little dance, and off he trots
    state.pets = 0; state.treatsGiven = (state.treatsGiven || 0) + 1; save();
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
        '<div class="lucky-pace"><input type="range" id="luckyPace" min="12" max="70" step="2" value="' + (100 - (+state.pace || 34) + 12) + '"><span class="lp-read" id="luckyPaceRead">' + esc(paceLabel(+state.pace || 34)) + '</span></div>' +
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
    if (pace) pace.addEventListener("input", function () { var secs = 100 - (+pace.value) + 12; state.pace = secs; save(); if (read) read.textContent = paceLabel(secs); render(); });
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
