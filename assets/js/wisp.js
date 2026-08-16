/* ============================================================================
   WISP  ·  app
   A calm, single-page shell with hash routing. Powerful but gentle: deep
   features one layer down, a quiet default on top. Colons and semicolons only.
   ==========================================================================*/
(function () {
  "use strict";
  const W = window.WISP;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  // Real database ids are UUIDs; the bundled sample works use short string ids.
  const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || "");

  /* ---- settings and persistence (stands in for server-side sync) --------- */
  const DEFAULTS = { theme:"cream", accent:"default", face:"humanist", size:19, measure:66,
                     dyslexia:false, motion:false, justify:false, margins:true, view:"gallery", adultOK:false, introSeen:false };
  let settings = load();
  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem("wisp.settings") || "{}")); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save() { try { localStorage.setItem("wisp.settings", JSON.stringify(settings)); } catch (e) {} }

  /* ---- small view helpers ------------------------------------------------ */
  const RATE = { G:"General", T:"Teen", M:"Mature", E:"Explicit" };
  const WARNINGS = ["Graphic violence", "Major character death", "Underage", "Noncon", "Choose not to warn"];

  // Reader actions that persist for the session (a stand-in for the server), so
  // a work you hearted or subscribed to still reads that way when you come back.
  const userState = { hearted: new Set(), subscribed: new Set(), bookmarked: new Set(), visited: new Set(),
                      mutedTags: new Set(), blockedUsers: new Set() };
  function markVisited(id) { if (id) userState.visited.add(id); }

  /* ---- live data cache ---------------------------------------------------
     When Supabase is connected, the content screens read from these caches,
     which the loaders below fill from the database. In demo mode they stay
     empty and every accessor falls back to the bundled demo dataset, so the
     demo behaves exactly as before. */
  const LIVE = { works: [], byId: {}, chapters: {}, comments: {}, reactions: {}, upcoming: {}, series: [] };
  let liveEditor = null;   // { work, chapter } when editing a real work, else null
  let editorCover = null;  // uploaded cover URL for the current editor session
  let coverCleared = false; // true when the author removed an existing cover
  let pendingSeries = null; // series name to prefill when starting a new book in a series
  let guestBrowsing = false; // set when a visitor chooses to look around without an account
  function isLive() { return !!(window.WispDB && WispDB.enabled); }
  function activeWorks() { return isLive() ? LIVE.works : W.WORKS; }
  function activeById(id) { return LIVE.byId[id] || W.byId[id]; }   // live wins; demo fills curated links
  function loadingScreen(sel) {
    const el = $(sel); if (el) el.innerHTML = `<div class="page"><p style="text-align:center;padding:80px 0;color:var(--ink3)">Loading&hellip;</p></div>`;
  }

  /* ---- shared modal, confirm dialog, and small action menus -------------- */
  function openModal(html, label) {
    const modal = $("#modal");
    const card = $("#modalCard");
    card.setAttribute("aria-label", label || "Dialog");
    card.innerHTML = html;
    card.querySelectorAll("[data-modal-cancel]").forEach(b => b.addEventListener("click", closeModal));
    if (!modal.classList.contains("is-open")) openOverlay(modal);        // first open: full modal setup
    else { const f = focusables(card)[0]; if (f) f.focus(); }            // already open: just swap content
  }
  function closeModal() { closeOverlay($("#modal")); }

  function confirmDialog(opts, onConfirm) {
    openModal(`
      <h2>${esc(opts.title)}</h2>
      <p class="soft" style="font-size:14.5px;line-height:1.6;margin-top:8px">${opts.body}</p>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>${esc(opts.cancelText || "Cancel")}</button>
        <button class="btn ${opts.danger ? "btn--danger" : "btn--primary"}" data-confirm-ok>${esc(opts.confirmText || "Confirm")}</button>
      </div>`, opts.title);
    $("[data-confirm-ok]").addEventListener("click", () => { closeModal(); onConfirm(); });
  }

  function menuDialog(title, items) {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h2 style="font-size:20px">${esc(title)}</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="modal-menu">
        ${items.map((it, i) => `<button data-menu-item="${i}" class="${it.danger ? "danger" : ""}">${icon(it.icon, 17)}${esc(it.label)}</button>`).join("")}
      </div>`, title);
    items.forEach((it, i) => {
      const btn = $(`[data-menu-item="${i}"]`);
      if (btn) btn.addEventListener("click", () => { closeModal(); it.run(); });
    });
  }
  function icon(id, size = 16) { return `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#i-${id}"></use></svg>`; }

  // A cover shows the first meaningful letter of the title, skipping a leading
  // filler word: "The Salt and the Season" becomes S, not T.
  const COVER_STOPWORDS = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "on"]);
  function coverLetter(title) {
    if (!title) return "";
    for (const word of String(title).trim().split(/\s+/)) {
      const first = (word.match(/[A-Za-z0-9]/) || [""])[0];
      if (!first) continue;                                   // pure punctuation, skip
      const clean = word.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
      if (COVER_STOPWORDS.has(clean)) continue;               // leading filler word, skip
      return first.toUpperCase();
    }
    const m = String(title).match(/[A-Za-z0-9]/);             // fallback: first character
    return m ? m[0].toUpperCase() : "";
  }
  function cover(key, title) {
    if (key && /^https?:/.test(key)) {                        // an uploaded cover image
      return `<span class="cv"><img src="${esc(key)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover"></span>`;
    }
    const bg = (key && key[0] === "#") ? key : (W.COVERS[key] || "#6d5566");
    const letter = coverLetter(title);
    return `<span class="cv" style="background:${bg}">${letter ? `<span class="cv__letter">${esc(letter)}</span>` : ""}</span>`;
  }
  function rate(r) { return `<span class="rate rate--${r.toLowerCase()}" title="${RATE[r]}">${r}</span>`; }

  function tagRow(tags, shown = 2) {
    const head = tags.slice(0, shown).map(t => `<button class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("");
    const more = tags.length > shown ? `<button class="tag--more tag" data-tag-more>+${tags.length - shown}</button>` : "";
    return `<div class="tag-row">${head}${more}</div>`;
  }

  function statEnd(w) {
    if (w.complete) return `<span class="stat--end"><span class="pip pip--sage"></span>Complete</span>`;
    return `<span class="stat--end"><span class="pip pip--amber"></span>${esc(w.statusText)}</span>`;
  }

  function cardGallery(w) {
    const flag = w.format === "comic" ? `<span class="cover-flag">Comic</span>`
               : (w.warnings[0] ? `<span class="cover-flag">${esc(w.warnings[0])}</span>` : "");
    const timeStat = w.format === "comic"
      ? `<span class="stat">${icon("book",14)}${esc(w.chapters)}</span>`
      : `<span class="stat">${icon("eye",14)}${esc(w.reads)}</span>`;
    const readMark = userState.visited.has(w.id) ? `<span class="read-badge">${icon("check",11)} Read</span>` : "";
    return `<article class="card" data-work="${w.id}">
      <span class="card__cover">${cover(w.cover, w.title)}${rate(w.rating)}${flag}${readMark}</span>
      <span class="card__body">
        <span class="tag-row"><span class="pill">${w.type === "fan" ? "Fanwork" : "Original"}</span><span class="pill">${esc(w.source)}</span></span>
        <a class="card__title" href="#/work/${w.id}">${esc(w.title)}</a>
        <span class="card__by">by ${esc(w.author)}</span>
        <span class="card__summary">${esc(w.summary)}</span>
        ${tagRow(w.tags)}
        <span class="card__stats">
          <span class="stat stat--heart">${icon("heart",14)}${esc(w.hearts)}</span>
          <span class="stat">${icon("comment",14)}${esc(w.comments)}</span>
          ${timeStat}
          ${statEnd(w)}
        </span>
      </span>
    </article>`;
  }

  function cardList(w) {
    return `<article class="list-card" data-work="${w.id}">
      <span class="list-card__cover">${cover(w.cover, w.title)}${rate(w.rating)}${userState.visited.has(w.id) ? `<span class="read-badge">${icon("check",11)} Read</span>` : ""}</span>
      <span class="list-card__main">
        <span class="tag-row"><span class="pill">${w.type === "fan" ? "Fanwork" : "Original"}</span><span class="pill">${esc(w.source)}</span>${w.format === "comic" ? '<span class="pill">Comic</span>' : ""}</span>
        <a class="card__title" href="#/work/${w.id}" style="font-size:22px">${esc(w.title)}</a>
        <span class="card__by">by ${esc(w.author)}</span>
        <span class="card__summary" style="-webkit-line-clamp:3">${esc(w.summary)}</span>
        ${tagRow(w.tags, 4)}
        <span class="card__stats" style="border-top:0;padding-top:2px">
          <span class="stat stat--heart">${icon("heart",14)}${esc(w.hearts)}</span>
          <span class="stat">${icon("comment",14)}${esc(w.comments)}</span>
          <span class="stat">${icon("eye",14)}${esc(w.reads)}</span>
          <span class="stat">${icon("clock",14)}${esc(w.read)}</span>
          ${statEnd(w)}
        </span>
      </span>
    </article>`;
  }

  /* ======================================================================= */
  /*  SCREEN: HOME                                                            */
  /* ======================================================================= */
  let homeTab = "foryou";
  async function loadHome() {
    loadingScreen("#screen-home");
    try {
      LIVE.works = await WispDB.listWorks({ sort: "recent", limit: 30 });
      LIVE.works.forEach(w => { LIVE.byId[w.id] = w; });
    } catch (e) { console.error("[wisp] home load failed:", e); LIVE.works = LIVE.works || []; }
    renderHomeLive();
  }
  function renderHomeLive() {
    const works = LIVE.works || [];
    const grid = works.length
      ? (settings.view === "list"
          ? `<div class="stack-list">${works.map(cardList).join("")}</div>`
          : `<div class="work-grid">${works.map(cardGallery).join("")}</div>`)
      : `<div style="text-align:center;padding:64px 0;color:var(--ink3)">
           <p style="font-size:16px;color:var(--ink2)">No works have been posted yet.</p>
           <p style="font-size:14px">Be the first: write something in the Writing Station.</p>
           <p style="margin-top:16px"><button class="btn btn--primary btn--sm" data-nav="write">Go to the Writing Station</button></p>
         </div>`;
    $("#screen-home").innerHTML = `
      <div class="page">
        <h1 class="vh">Your reading home</h1>
        <div class="home-tabs">
          <button class="home-tab is-active">Latest</button>
          <div class="home-tabs__meta">
            <div class="view-toggle" role="group" aria-label="View mode">
              <button data-view="gallery" class="${settings.view === "gallery" ? "is-active" : ""}" aria-pressed="${settings.view === "gallery"}">Gallery</button>
              <button data-view="list" class="${settings.view === "list" ? "is-active" : ""}" aria-pressed="${settings.view === "list"}">List</button>
            </div>
          </div>
        </div>
        ${works.length ? `<div class="section-head"><h2>Latest works</h2><button class="btn--link" data-nav="browse">Browse all &rsaquo;</button></div>` : ""}
        ${grid}
      </div>`;
  }
  function renderHome() {
    if (isLive()) return renderHomeLive();
    const feat = ["salt","letters","amber","law","marrow","understudy"].map(id => W.byId[id]);
    const grid = settings.view === "list"
      ? `<div class="stack-list">${feat.map(cardList).join("")}</div>`
      : `<div class="work-grid">${feat.map(cardGallery).join("")}</div>`;

    const forYou = `
      <div class="section-head">
        <h2>Picked for you</h2>
        <button class="btn--link" data-nav="browse">Browse all &rsaquo;</button>
      </div>
      <p class="section-lead">Based on what you read and the tags you follow.</p>
      ${grid}

      <div class="editorial">
        <div class="eyebrow rose" style="margin-bottom:8px">Staff picks</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px">
          ${W.STAFF.map(s => { const w = W.byId[s.work]; return `
            <button class="list-tile" data-work="${w.id}" style="display:flex;gap:12px;align-items:flex-start;text-align:left">
              <span class="mini-cover" style="width:44px;height:60px">${cover(w.cover, w.title)}</span>
              <span>
                <span class="mini-work__title" style="display:block">${esc(w.title)}</span>
                <span class="muted" style="font-size:12.5px;display:block;margin:5px 0 0;line-height:1.5">${esc(s.note)}</span>
              </span>
            </button>`; }).join("")}
        </div>
        <p class="muted" style="font-size:12.5px;margin-top:14px">Nominated by readers and chosen by the editors. <a href="#/community">See who picks &rsaquo;</a></p>
      </div>`;

    const following = `<div class="stack-list" style="gap:0">
      ${W.FOLLOWING.map(f => `
        <div class="act" style="padding:16px 4px;border-bottom:1px solid var(--line2);border-radius:0;cursor:${f.work ? "pointer" : "default"}" ${f.work ? `data-work="${f.work}"` : ""}>
          <span class="act__icon">${icon(f.icon, 15)}</span>
          <span class="act__body" style="flex:1;font-size:15px">${f.html}</span>
          <span class="muted" style="font-size:12.5px">${f.time}</span>
        </div>`).join("")}
    </div>`;

    const intro = settings.introSeen ? "" : `
      <div class="explainer" id="introBar">
        <div style="flex:1;min-width:230px">
          <div class="eyebrow rose" style="margin-bottom:6px">New here</div>
          <div class="display" style="font-size:20px">How Wisp works</div>
        </div>
        <div class="explainer__steps">
          <div class="explainer__step"><span class="explainer__n">1</span><span class="soft" style="font-size:13px">Recommendations are based on what you read, not on ads.</span></div>
          <div class="explainer__step"><span class="explainer__n">2</span><span class="soft" style="font-size:13px">You can comment and react on any line as you read.</span></div>
          <div class="explainer__step"><span class="explainer__n">3</span><span class="soft" style="font-size:13px">You filter what you see, and adult content stays off until you turn it on.</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start">
          <button class="btn btn--primary btn--sm" data-toast="Sign up is instant. You can read without an account.">Create an account</button>
          <div class="muted" style="font-size:11.5px;line-height:1.5">Your data is never sold.</div>
          <button class="btn--link" id="introDismiss">Dismiss</button>
        </div>
      </div>`;

    $("#screen-home").innerHTML = `
      <div class="page">
        <h1 class="vh">Your reading home</h1>
        ${intro}
        <div class="home-tabs">
          <button class="home-tab ${homeTab === "foryou" ? "is-active" : ""}" data-hometab="foryou">For You</button>
          <button class="home-tab ${homeTab === "following" ? "is-active" : ""}" data-hometab="following">Following</button>
          <div class="home-tabs__meta">
            <div class="view-toggle" role="group" aria-label="View mode">
              <button data-view="gallery" class="${settings.view === "gallery" ? "is-active" : ""}" aria-pressed="${settings.view === "gallery"}">Gallery</button>
              <button data-view="list" class="${settings.view === "list" ? "is-active" : ""}" aria-pressed="${settings.view === "list"}">List</button>
            </div>
          </div>
        </div>

        <button class="resume" data-read="amber">
          <span class="resume__cover">${cover("amber", "A Study in Amber")}</span>
          <span class="resume__body">
            <span class="eyebrow rose" style="display:block;margin-bottom:5px">Continue reading</span>
            <span class="resume__title">A Study in Amber</span>
            <span class="progress"><span class="progress__track"><span class="progress__fill" style="width:64%"></span></span><span class="progress__label">Ch 18 of 28</span></span>
          </span>
          <span style="color:var(--rose);display:flex;align-items:center">${icon("chev",20)}</span>
        </button>

        ${homeTab === "foryou" ? forYou : following}
      </div>`;
  }

  /* ======================================================================= */
  /*  SCREEN: BROWSE  ·  progressive filters, mixed fan + original            */
  /* ======================================================================= */
  const filterState = { q:"", type:"all", ratings:new Set(), tagsInc:new Set(), tagsExc:new Set(), sort:"hearts" };
  function allTags() {
    const m = new Map();
    activeWorks().forEach(w => (w.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }
  function filteredWorks() {
    let list = activeWorks().slice();
    if (filterState.type !== "all") list = list.filter(w => w.type === filterState.type);
    if (filterState.ratings.size) list = list.filter(w => filterState.ratings.has(w.rating));
    if (filterState.tagsInc.size) list = list.filter(w => Array.from(filterState.tagsInc).every(t => w.tags.includes(t)));
    if (filterState.tagsExc.size) list = list.filter(w => !w.tags.some(t => filterState.tagsExc.has(t)));
    if (filterState.q) {
      const q = filterState.q.toLowerCase();
      list = list.filter(w => (w.title + " " + w.author + " " + w.source + " " + w.tags.join(" ") + " " + w.summary).toLowerCase().includes(q));
    }
    const num = (s) => parseFloat(String(s).replace("k", "")) * (String(s).includes("k") ? 1000 : 1);
    if (filterState.sort === "hearts") list.sort((a, b) => num(b.hearts) - num(a.hearts));
    else if (filterState.sort === "reads") list.sort((a, b) => num(b.reads) - num(a.reads));
    else if (filterState.sort === "recent") list.sort((a, b) => (a.complete ? 1 : 0) - (b.complete ? 1 : 0));
    return list;
  }
  function renderBrowse() {
    const tags = allTags();
    const excCount = filterState.tagsExc.size;
    const results = filteredWorks();
    const applied = [
      ...(filterState.type !== "all" ? [`<button class="chip-x" data-clear="type">${filterState.type === "fan" ? "Fanwork" : "Original"} ${icon("plus",12)}</button>`] : []),
      ...Array.from(filterState.ratings).map(r => `<button class="chip-x" data-clear="rating:${r}">${RATE[r]} &times;</button>`),
      ...Array.from(filterState.tagsInc).map(t => `<button class="chip-x" data-clear="inc:${esc(t)}">${esc(t)} &times;</button>`),
      ...Array.from(filterState.tagsExc).map(t => `<button class="chip-x exclude" data-clear="exc:${esc(t)}">${esc(t)} &times;</button>`)
    ].join("");

    $("#screen-browse").innerHTML = `
      <div class="page page--wide">
        <div style="margin-bottom:24px">
          <div class="eyebrow rose" style="margin-bottom:8px">Browse</div>
          <h1 class="display" style="font-size:32px">Browse fanfiction and original fiction</h1>
          <p class="section-lead">Search both at once.</p>
        </div>
        <div class="browse">
          <aside class="filters">
            <details class="filter-group" open>
              <summary>Basic ${icon("chev",16).replace("<svg","<svg class='chev'")}</summary>
              <div class="filter-body">
                <div>
                  <div class="muted" style="font-size:12px;margin-bottom:6px">Work type</div>
                  <div class="seg" role="group" aria-label="Work type">
                    <button data-type="all" class="${filterState.type === "all" ? "is-on" : ""}" aria-pressed="${filterState.type === "all"}">Both</button>
                    <button data-type="fan" class="${filterState.type === "fan" ? "is-on" : ""}" aria-pressed="${filterState.type === "fan"}">Fanwork</button>
                    <button data-type="original" class="${filterState.type === "original" ? "is-on" : ""}" aria-pressed="${filterState.type === "original"}">Original</button>
                  </div>
                </div>
                <div style="margin-top:6px">
                  <div class="muted" style="font-size:12px;margin-bottom:6px">Rating</div>
                  ${["G","T","M","E"].map(r => `<label class="check"><input type="checkbox" data-rating="${r}" ${filterState.ratings.has(r) ? "checked" : ""}> ${RATE[r]}</label>`).join("")}
                </div>
              </div>
            </details>

            <details class="filter-group">
              <summary>Tags ${icon("chev",16).replace("<svg","<svg class='chev'")}</summary>
              <div class="filter-body">
                ${tags.map(([t, n]) => `<label class="check"><input type="checkbox" data-inc="${esc(t)}" ${filterState.tagsInc.has(t) ? "checked" : ""}> ${esc(t)} <span class="n">${n}</span></label>`).join("")}
              </div>
            </details>

            <details class="filter-group">
              <summary>Exclude ${excCount ? `<span class="filter-group__count">${excCount}</span>` : ""} ${icon("chev",16).replace("<svg","<svg class='chev'")}</summary>
              <div class="filter-body">
                <p class="muted" style="font-size:12px;margin:0 0 4px">Works the same as include. Tags you have muted are always excluded.</p>
                ${tags.map(([t, n]) => `<label class="check"><input type="checkbox" data-exc="${esc(t)}" ${filterState.tagsExc.has(t) ? "checked" : ""}> ${esc(t)} <span class="n">${n}</span></label>`).join("")}
              </div>
            </details>

            <button class="btn--link" id="saveSearch" style="margin-top:16px">Save this search</button>
          </aside>

          <div>
            <div class="results-head">
              <div class="soft" style="font-size:14px"><b style="color:var(--ink)">${results.length}</b> works</div>
              <div class="sortbar" style="display:flex;gap:10px;align-items:center">
                <div class="view-toggle" role="group" aria-label="View mode">
                  <button data-view="gallery" class="${settings.view === "gallery" ? "is-active" : ""}">Gallery</button>
                  <button data-view="list" class="${settings.view === "list" ? "is-active" : ""}">List</button>
                </div>
                <select id="sortSel" aria-label="Sort">
                  <option value="hearts" ${filterState.sort === "hearts" ? "selected" : ""}>Most hearts</option>
                  <option value="reads" ${filterState.sort === "reads" ? "selected" : ""}>Most read</option>
                  <option value="recent" ${filterState.sort === "recent" ? "selected" : ""}>Recently updated</option>
                </select>
              </div>
            </div>
            ${applied ? `<div class="applied">${applied}</div>` : ""}
            ${results.length
              ? (settings.view === "list"
                  ? `<div class="stack-list">${results.map(cardList).join("")}</div>`
                  : `<div class="work-grid">${results.map(cardGallery).join("")}</div>`)
              : (activeWorks().length === 0
                  ? `<div style="text-align:center;padding:70px 0;color:var(--ink3)"><p style="font-size:16px">No works here yet.</p><p style="font-size:14px">Post the first one from the Writing Station.</p></div>`
                  : `<div style="text-align:center;padding:70px 0;color:var(--ink3)"><p style="font-size:16px">Nothing matches yet.</p><p style="font-size:14px">Loosen a filter, or clear the exclusions.</p></div>`)}
          </div>
        </div>
      </div>`;
  }

  /* ======================================================================= */
  /*  SCREEN: WORK DETAIL                                                     */
  /* ======================================================================= */
  function renderWork(id) {
    const w = activeById(id) || W.byId.amber;
    markVisited(w.id);
    let rows;
    if (w._db) {
      const now = Date.now();
      const isReleased = (c) => c.published || (c.scheduled_for && new Date(c.scheduled_for).getTime() <= now);
      const released = (LIVE.chapters[w.id] || []).filter(isReleased).sort((a, b) => a.number - b.number);
      const upcoming = (LIVE.upcoming[w.id] || []).slice().sort((a, b) => a.number - b.number);
      const releasedRows = released.map(c => `<button class="chapter-row" data-read="${w.id}">
          <span class="chapter-row__n">${c.number}</span>
          <span class="chapter-row__title">Chapter ${c.number}${c.title ? ": " + esc(c.title) : ""} <span class="ch-lock ch-lock--open" title="Released">${icon("unlock",13)}</span></span>
          <span class="chapter-row__when">posted ${WispDB.relTime(c.published_at || c.scheduled_for || c.created_at)}</span>
        </button>`).join("");
      const lockedRows = upcoming.map(u => `<div class="chapter-row chapter-row--locked" aria-label="Chapter ${u.number}, scheduled">
          <span class="chapter-row__n">${u.number}</span>
          <span class="chapter-row__title">Chapter ${u.number} <span class="ch-lock" title="Scheduled">${icon("lock",13)}</span> <span class="ch-countdown" data-countdown="${esc(u.scheduled_for)}">Time till release: &hellip;</span></span>
        </div>`).join("");
      rows = (releasedRows + lockedRows) || `<p class="muted" style="padding:14px 4px">No chapters published yet.</p>`;
    } else {
      const chapters = Math.min(w.chapters, 8);
      rows = Array.from({ length: chapters }, (_, i) => {
        const n = i + 1;
        return `<button class="chapter-row" data-read="${w.id}">
          <span class="chapter-row__n">${n}</span>
          <span class="chapter-row__title">Chapter ${n}${n === 1 ? ": The First Cold Morning" : ""}</span>
          <span class="chapter-row__when">posted ${["3mo","2mo","6w","1mo","3w","2w","1w","9h"][i] || ""}</span>
        </button>`;
      }).join("");
    }

    $("#screen-work").innerHTML = `
      <div class="page">
        <button class="btn--link" data-back style="margin-bottom:18px">&lsaquo; Back</button>
        <div class="work-hero">
          <span class="work-hero__cover">${cover(w.cover, w.title)}</span>
          <div class="work-hero__main">
            <span class="tag-row"><span class="pill">${w.type === "fan" ? "Fanwork" : "Original"}</span><span class="pill">${esc(w.source)}</span>${w.format === "comic" ? '<span class="pill">Comic</span>' : ""}</span>
            <h1 class="work-hero__title">${esc(w.title)}</h1>
            <div class="soft" style="font-size:16px">by <a href="#/profile">${esc(w.author)}</a></div>
            <div class="work-hero__meta">
              ${rate(w.rating)} <span>${RATE[w.rating]}</span>
              ${w.warnings.length ? `<span style="color:var(--rose-ink)">${icon("flag",14)} ${w.warnings.map(esc).join(", ")}</span>` : `<span class="muted">${icon("check",14)} No warnings</span>`}
              <span>${icon("book",14)} ${w.complete ? w.chapters + " chapters, complete" : w.chapters + " chapters, ongoing"}</span>
              ${w.words ? `<span>${w.words} words</span>` : ""}
              ${w.read ? `<span>${icon("clock",14)} ${w.read}</span>` : ""}
            </div>
            <p class="soft" style="font-size:16px;line-height:1.6;max-width:620px">${esc(w.summary)}</p>
            <div style="margin:16px 0">${tagRow(w.tags, 12)}</div>
            <div class="work-actions">
              <button class="btn btn--primary" data-read="${w.id}">${icon("book",16)} Start reading</button>
              <button class="btn ${userState.hearted.has(w.id) ? "btn--primary" : "btn--ghost"}" data-toggle="heart" aria-pressed="${userState.hearted.has(w.id)}">${icon("heart",16)}<span class="toggle-label">${userState.hearted.has(w.id) ? "Hearted" : "Heart"}</span></button>
              <button class="btn btn--quiet ${userState.subscribed.has(w.id) ? "is-on-quiet" : ""}" data-toggle="subscribe" aria-pressed="${userState.subscribed.has(w.id)}">${icon("bell",16)}<span class="toggle-label">${userState.subscribed.has(w.id) ? "Subscribed" : "Subscribe"}</span></button>
              <button class="btn btn--quiet ${userState.bookmarked.has(w.id) ? "is-on-quiet" : ""}" data-toggle="bookmark" aria-pressed="${userState.bookmarked.has(w.id)}">${icon("bookmark",16)}<span class="toggle-label">${userState.bookmarked.has(w.id) ? "Bookmarked" : "Bookmark"}</span></button>
              <button class="btn btn--quiet" data-share="${w.id}">${icon("share",16)} Share</button>
              <button class="btn btn--quiet" data-toast="Download as EPUB, PDF, or HTML. Downloads are free.">${icon("download",16)} Download</button>
              <button class="btn btn--quiet" data-work-overflow="${w.id}" aria-label="More options">${icon("more",16)}</button>
            </div>
            <p class="muted" style="font-size:12px;margin:2px 0 0">One heart per reader.</p>
            <div class="card__stats" style="border:0;max-width:420px;padding:0">
              <span class="stat stat--heart">${icon("heart",15)}${w.hearts} hearts</span>
              <span class="stat">${icon("comment",15)}${w.comments}</span>
              <span class="stat">${icon("eye",15)}${w.reads}</span>
            </div>
          </div>
        </div>

        <h2 class="shelf__title" style="margin-bottom:14px">Chapters</h2>
        <div class="chapter-list">${rows}</div>

        <div class="editorial" style="margin-top:30px">
          <div class="eyebrow rose" style="margin-bottom:6px">This work's settings</div>
          <p class="soft" style="font-size:14px;margin:0;line-height:1.7">Comments are on, and anyone can read this work. You can mute a tag, block a user, or turn off the author's skin. Your settings always win over the author's.</p>
        </div>
      </div>`;
    startCountdowns();
  }

  /* ---- live release countdowns ------------------------------------------- */
  let countdownTimer = null;
  function fmtCountdown(ms) {
    if (ms <= 0) return "Releasing now";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return "Time till release: " + (d ? d + (d === 1 ? " day, " : " days, ") : "") +
      pad(h) + " hours, " + pad(m) + " minutes, " + pad(sec) + " seconds";
  }
  function startCountdowns() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    const tick = () => {
      const els = $$("[data-countdown]");
      if (!els.length) { clearInterval(countdownTimer); countdownTimer = null; return; }
      const now = Date.now();
      els.forEach(el => {
        const t = new Date(el.dataset.countdown).getTime();
        const left = t - now;
        el.textContent = fmtCountdown(left);
        if (left <= 0) el.classList.add("is-due");
      });
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  /* ======================================================================= */
  /*  SCREEN: READING  ·  the soul, the conversation in the margins           */
  /* ======================================================================= */
  const REACTS = ["❤️","😭","🔥","👀","😂","🥺"];
  const openThreads = new Set();

  function paragraphHTML(p, i) {
    const has = !!p.thread;
    const count = has ? p.thread.comments.length : 0;
    const marker = `<button class="para__marker" data-para="${i}" aria-label="Open the conversation on this line">
        ${icon("comment",15)}${count ? `<span class="para__count">${count}</span>` : ""}
      </button>`;
    return `<div class="para ${has ? "has-thread" : ""}" data-para="${i}">
      ${marker}
      <p>${esc(p.t)}</p>
      <div class="thread-slot" data-slot="${i}"></div>
    </div>`;
  }

  function threadHTML(p, i) {
    const mine = (p.thread && p.thread.mine) || new Set();
    const reactChips = REACTS.map(e => {
      const n = (p.thread && p.thread.reactions[e]) || 0;
      return `<button class="react ${mine.has(e) ? "is-on" : ""}" data-react="${i}:${e}" aria-pressed="${mine.has(e)}">${e}${n ? `<small>${n}</small>` : ""}</button>`;
    }).join("");
    const comments = (p.thread ? p.thread.comments : []).map(c => `
      <div class="comment">
        <span class="comment__av" ${c.author ? 'style="background:var(--rose);color:#fbf3e8"' : ""}>${esc(c.init)}</span>
        <div>
          <div><span class="comment__who">${esc(c.who)}</span>${c.author ? ' <span class="pill" style="padding:2px 6px">Author</span>' : ""}<span class="comment__when">${esc(c.when)}</span></div>
          <div class="comment__text">${esc(c.text)}</div>
          <div class="comment__acts"><button data-heart-c>${icon("heart",12)} Heart</button><button>Reply</button></div>
        </div>
      </div>`).join("");
    return `<div class="thread">
      <div class="thread__reactions">${reactChips}<button class="react react--add" title="More reactions">${icon("plus",14)}</button></div>
      ${comments || '<p class="muted" style="font-size:13px;margin:2px 0 10px">No comments on this line yet.</p>'}
      <div class="thread__compose">
        <textarea placeholder="Reply on this line" data-compose="${i}"></textarea>
        <button class="btn btn--primary btn--sm" data-post="${i}">Post</button>
      </div>
    </div>`;
  }

  function renderReading(reqId) {
    openThreads.clear();               // the DOM is rebuilt below; open-state must reset
    const liveWork = LIVE.byId[reqId];
    if (liveWork && liveWork._db) { renderLiveReading(liveWork, LIVE.chapters[reqId] || []); return; }
    const c = W.CHAPTER;
    const flagship = (!reqId || reqId === "amber");
    const w = W.byId[reqId] || W.byId.amber;
    markVisited(flagship ? "amber" : w.id);

    if (!flagship) {
      // Honest preview for non-flagship works: full reader chrome, a short opening,
      // and a route into the flagship where the seeded conversation lives.
      $("#screen-reading").innerHTML = `
        <div class="reader">
          <div class="reader__progress"><i style="width:8%"></i></div>
          <div class="reader__wrap">
            <div class="reader__crumbs"><a href="#/work/${w.id}">${esc(w.title)}</a> ${icon("chev",12)} <span>Chapter 1</span></div>
            <h1 class="reader__title">${esc(w.title)}</h1>
            <div class="reader__by">by ${esc(w.author)}</div>
            <div class="reader__chapter">Chapter 1</div>
            <div class="reader__chapter-title">The First Cold Morning</div>
            <div class="prose" data-justify="${settings.justify ? "on" : "off"}" data-hyphen="${settings.justify ? "on" : "off"}">
              <div class="para"><p>${esc(w.summary)}</p></div>
              <div class="para"><p>This is a short preview. The reader, the adjustable width, and the theme and comfort settings work on every story.</p></div>
              <div class="note"><p>The full per-line comment demo is on our sample chapter. Open it to try it.</p>
                <p style="margin-top:12px"><button class="btn btn--primary btn--sm" data-read="amber">${icon("comment",15)} Open the sample chapter</button></p></div>
            </div>
            <div class="chapter-nav">
              <button class="btn btn--quiet btn--sm" data-work="${w.id}">&lsaquo; Work page</button>
              <button class="btn btn--quiet btn--sm" data-read="amber">Open the sample chapter &rsaquo;</button>
            </div>
          </div>
          ${readerToolsHTML()}
        </div>`;
      mountReaderTools();
      return;
    }

    $("#screen-reading").innerHTML = `
      <div class="reader">
        <div class="reader__progress" id="readProgress"><i></i></div>
        <div class="reader__wrap" id="readerWrap">
          <div class="reader__crumbs"><a href="#/work/${w.id}">${esc(c.title)}</a> ${icon("chev",12)} <span>Chapter ${c.chapterNo} of ${c.chapterCount}</span></div>
          <h1 class="reader__title">${esc(c.title)}</h1>
          <div class="reader__by">by <a href="#/profile">${esc(c.author)}</a></div>

          <div class="reader__chapter">Chapter ${c.chapterNo}</div>
          <div class="reader__chapter-title">${esc(c.chapterTitle)}</div>

          <details class="note" open>
            <summary>Author's note</summary>
            <p>${esc(c.startNote)}</p>
          </details>
          <details class="note note--content" open>
            <summary>Content notes</summary>
            <p>${esc(c.contentNote)}</p>
          </details>

          <div class="prose" id="prose" data-justify="${settings.justify ? "on" : "off"}" data-hyphen="${settings.justify ? "on" : "off"}">
            ${c.paragraphs.map(paragraphHTML).join("")}
          </div>

          <details class="note" style="margin-top:34px">
            <summary>End note</summary>
            <p>${esc(c.endNote)}</p>
            <p style="margin-top:12px;font-size:13.5px;color:var(--ink3)">Tap any line to leave a comment or a reaction.</p>
          </details>

          <div class="chapter-nav">
            <button class="btn btn--quiet" data-toast="This is the earliest chapter in the demo.">&lsaquo; Previous</button>
            <button class="btn--link" data-work="amber">Chapter index</button>
            <button class="btn btn--primary" data-toast="This is the last chapter in the demo.">Next chapter &rsaquo;</button>
          </div>
        </div>

        <div class="hl-pop" id="hlPop">
          <button data-hl="mark">Highlight</button>
          <button data-hl="note">Note</button>
          <button data-hl="copy">Copy</button>
        </div>

        ${readerToolsHTML()}
      </div>`;

    mountReaderTools();
    wireReading();
  }

  // Split a chapter body into display paragraphs: blank lines first, then any
  // remaining single newlines. Empty pieces are dropped.
  function splitParagraphs(body) {
    const text = String(body || "").replace(/\r\n/g, "\n").trim();
    if (!text) return [];
    let parts = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    if (parts.length <= 1) parts = text.split(/\n/).map(s => s.trim()).filter(Boolean);
    return parts.length ? parts : [text];
  }

  // Reader for a real, database-backed work. Full reading chrome and per-line
  // comments; the seeded reaction demo stays on the sample chapter.
  function renderLiveReading(w, chapters) {
    markVisited(w.id);
    const published = chapters.filter(c => c.published);
    const ch = published[0] || chapters[0] || null;
    const paras = ch ? splitParagraphs(ch.body) : [];
    const byPara = LIVE.comments[w.id] || {};

    const proseHTML = paras.length
      ? paras.map((t, i) => {
          const n = (byPara[i] || []).length;
          return `<div class="para" data-lpara="${i}">
            <button class="para__marker" data-lmark="${i}" aria-label="Open the conversation on this line">${icon("comment",15)}${n ? `<span class="para__count">${n}</span>` : ""}</button>
            <p>${esc(t)}</p>
            <div class="thread-slot" data-lslot="${i}"></div>
          </div>`;
        }).join("")
      : `<div class="note"><p>This work has no published chapters yet.</p></div>`;

    $("#screen-reading").innerHTML = `
      <div class="reader">
        <div class="reader__progress" id="readProgress"><i></i></div>
        <div class="reader__wrap" id="readerWrap">
          <div class="reader__crumbs"><a href="#/work/${w.id}">${esc(w.title)}</a> ${icon("chev",12)} <span>Chapter ${ch ? ch.number : 1}</span></div>
          <h1 class="reader__title">${esc(w.title)}</h1>
          <div class="reader__by">by <a href="#/work/${w.id}">${esc(w.author)}</a></div>
          ${ch ? `<div class="reader__chapter">Chapter ${ch.number}</div>${ch.title ? `<div class="reader__chapter-title">${esc(ch.title)}</div>` : ""}` : ""}
          <div class="prose" id="prose" data-justify="${settings.justify ? "on" : "off"}" data-hyphen="${settings.justify ? "on" : "off"}">
            ${proseHTML}
          </div>
          ${published.length > 1 ? `<div class="chapter-nav"><button class="btn--link" data-work="${w.id}">Chapter index</button></div>` : ""}
        </div>
        ${readerToolsHTML()}
      </div>`;

    mountReaderTools();
    if (ch) wireLiveReading(w, ch);
  }

  function wireLiveReading(w, ch) {
    $$("#screen-reading [data-lmark]").forEach(m => m.addEventListener("click", () => {
      const i = +m.dataset.lmark;
      const slot = $(`#screen-reading [data-lslot="${i}"]`);
      if (!slot) return;
      const para = slot.closest(".para");
      if (openThreads.has(i)) { openThreads.delete(i); slot.innerHTML = ""; para.classList.remove("thread-open"); return; }
      openThreads.add(i); para.classList.add("thread-open");
      openLiveThread(w, ch, i, slot);
    }));
  }

  // Render the thread for line i into its slot and bind the composer. Called
  // again after each post so the new comment shows immediately.
  function openLiveThread(w, ch, i, slot) {
    slot.innerHTML = liveThreadHTML(w, ch, i);
    const ta = slot.querySelector("textarea"); if (ta) ta.focus();
    // Reaction chips: toggle the reader's own emoji on this line.
    slot.querySelectorAll("[data-lreact]").forEach(chip => chip.addEventListener("click", async () => {
      if (!ch) return;
      if (!WispDB.signedIn) { openAuth("in"); return; }
      const [, emoji] = chip.dataset.lreact.split(":");
      const store = (LIVE.reactions[ch.id] = LIVE.reactions[ch.id] || {});
      const cell = (store[i] = store[i] || { counts: {}, mine: new Set() });
      const on = !cell.mine.has(emoji);
      // optimistic update
      cell.mine[on ? "add" : "delete"](emoji);
      cell.counts[emoji] = Math.max(0, (cell.counts[emoji] || 0) + (on ? 1 : -1));
      openLiveThread(w, ch, i, slot);
      try { await WispDB.toggleReaction(ch.id, i, emoji, on); }
      catch (e) {
        cell.mine[on ? "delete" : "add"](emoji);                 // revert on failure
        cell.counts[emoji] = Math.max(0, (cell.counts[emoji] || 0) + (on ? -1 : 1));
        openLiveThread(w, ch, i, slot);
        toast((e && e.message) || "Could not react.");
      }
    }));
    const post = slot.querySelector("[data-lpost]");
    if (!post) return;
    post.addEventListener("click", async () => {
      if (!WispDB.signedIn) { openAuth("in"); return; }
      const body = (ta.value || "").trim(); if (!body) return;
      post.disabled = true;
      try {
        await WispDB.postComment(w.id, body, ch.id, i);
        const list = (LIVE.comments[w.id] = LIVE.comments[w.id] || {});
        (list[i] = list[i] || []).push({
          body, created_at: new Date().toISOString(),
          profiles: { display_name: (WispDB.profile && WispDB.profile.display_name) || "You" }
        });
        openLiveThread(w, ch, i, slot);       // re-render with the new comment
        refreshLiveCount(w, i);
      } catch (e) { toast((e && e.message) || "Could not post."); post.disabled = false; }
    });
  }

  function refreshLiveCount(w, i) {
    const mark = $(`#screen-reading [data-lmark="${i}"]`); if (!mark) return;
    const n = ((LIVE.comments[w.id] || {})[i] || []).length;
    let badge = mark.querySelector(".para__count");
    if (n && !badge) { badge = document.createElement("span"); badge.className = "para__count"; mark.appendChild(badge); }
    if (badge) badge.textContent = n ? String(n) : (badge.remove(), "");
  }

  function liveThreadHTML(w, ch, i) {
    const rx = (ch && LIVE.reactions[ch.id] && LIVE.reactions[ch.id][i]) || { counts: {}, mine: new Set() };
    const chips = REACTS.map(e => {
      const n = rx.counts[e] || 0; const on = rx.mine && rx.mine.has(e);
      return `<button class="react ${on ? "is-on" : ""}" data-lreact="${i}:${e}" aria-pressed="${!!on}">${e}${n ? `<small>${n}</small>` : ""}</button>`;
    }).join("");
    const comments = (LIVE.comments[w.id] && LIVE.comments[w.id][i]) || [];
    const who = (c) => (c.profiles && c.profiles.display_name) || "Reader";
    const rows = comments.map(c => `
      <div class="comment">
        <span class="comment__av">${esc((who(c)[0] || "R").toUpperCase())}</span>
        <div>
          <div><span class="comment__who">${esc(who(c))}</span><span class="comment__when">${WispDB.relTime(c.created_at)}</span></div>
          <div class="comment__text">${esc(c.body)}</div>
        </div>
      </div>`).join("");
    return `<div class="thread">
      <div class="thread__reactions">${chips}</div>
      ${rows || '<p class="muted" style="font-size:13px;margin:2px 0 10px">No comments on this line yet.</p>'}
      <div class="thread__compose">
        <textarea placeholder="Reply on this line"></textarea>
        <button class="btn btn--primary btn--sm" data-lpost>Post</button>
      </div>
    </div>`;
  }

  function readerToolsHTML() {
    return `<div class="reader-tools" role="toolbar" aria-label="Reading controls">
      <button data-tool="smaller" title="Smaller text">${icon("minus",16)}</button>
      <button data-tool="bigger" title="Larger text" style="font-size:19px">A</button>
      <span class="sep"></span>
      <button data-tool="theme-cream" class="${settings.theme === "cream" ? "is-on" : ""}" aria-pressed="${settings.theme === "cream"}" title="Paper">Aa</button>
      <button data-tool="theme-sepia" class="${settings.theme === "sepia" ? "is-on" : ""}" aria-pressed="${settings.theme === "sepia"}" title="Sepia" style="color:#8a6a3a">Aa</button>
      <button data-tool="theme-oled" class="${settings.theme === "oled" ? "is-on" : ""}" aria-pressed="${settings.theme === "oled"}" title="OLED black" style="background:#111;color:#eee">Aa</button>
      <span class="sep"></span>
      <button data-tool="margins" class="${settings.margins ? "is-on" : ""}" aria-pressed="${settings.margins}" title="Toggle margin comments">${icon("comment",16)}</button>
      <button data-tool="listen" id="listenBtn" title="Read aloud">${icon("play",16)}</button>
      <button data-tool="settings" title="More reading settings">${icon("gear",16)}</button>
    </div>`;
  }

  let speaking = false;
  function mountReaderTools() {
    $$("#screen-reading [data-tool]").forEach(b => {
      b.addEventListener("click", () => {
        const t = b.dataset.tool;
        if (t === "smaller") { settings.size = Math.max(15, settings.size - 1); applySettings(); }
        else if (t === "bigger") { settings.size = Math.min(26, settings.size + 1); applySettings(); }
        else if (t.startsWith("theme-")) { settings.theme = t.slice(6); applySettings(); syncReaderThemeButtons(); }
        else if (t === "margins") { settings.margins = !settings.margins; applySettings(); b.classList.toggle("is-on", settings.margins); b.setAttribute("aria-pressed", String(settings.margins)); }
        else if (t === "settings") { openTheme(); }
        else if (t === "listen") { toggleListen(b); }
      });
    });
  }
  function syncReaderThemeButtons() {
    $$("#screen-reading [data-tool^='theme-']").forEach(b => {
      const on = b.dataset.tool === "theme-" + settings.theme;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  function toggleListen(btn) {
    if (!("speechSynthesis" in window)) { toast("Read-aloud is not available in this browser."); return; }
    if (speaking) { window.speechSynthesis.cancel(); speaking = false; btn.classList.remove("is-on"); btn.innerHTML = icon("play",16); return; }
    const text = W.CHAPTER.paragraphs.map(p => p.t.replace(/["“”]/g, "")).join(" ");
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98; u.pitch = 1;
    u.onend = () => { speaking = false; btn.classList.remove("is-on"); btn.innerHTML = icon("play",16); };
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    speaking = true; btn.classList.add("is-on"); btn.innerHTML = icon("play",16);
    toast("Reading aloud.");
  }

  // Persistent document/#main listeners are wired exactly once; they read the
  // current reading DOM at event time so re-renders never leak handlers.
  let readingGlobalsWired = false;
  function updateReadProgress() {
    const bar = $("#readProgress > i"); if (!bar) return;
    const main = $("#main");
    const max = main.scrollHeight - main.clientHeight;
    bar.style.width = max > 0 ? (100 * main.scrollTop / max) + "%" : "0%";
  }
  function wireReadingGlobalsOnce() {
    if (readingGlobalsWired) return;
    readingGlobalsWired = true;
    $("#main").addEventListener("scroll", updateReadProgress, { passive: true });
    document.addEventListener("mousedown", (e) => {
      const pop = $("#hlPop");
      if (pop && !pop.contains(e.target)) pop.style.display = "none";
    });
  }

  function wireReading() {
    wireReadingGlobalsOnce();
    updateReadProgress();

    // Open and close per-line threads.
    $$("#screen-reading .para__marker").forEach(m => m.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = +m.dataset.para;
      const para = m.closest(".para");
      const slot = $(`.thread-slot[data-slot="${i}"]`);
      if (openThreads.has(i)) {
        openThreads.delete(i); slot.innerHTML = ""; para.classList.remove("is-open");
      } else {
        openThreads.add(i); slot.innerHTML = threadHTML(W.CHAPTER.paragraphs[i], i); para.classList.add("is-open");
        wireThread(i, slot);
      }
    }));

    // Highlight popover on text selection.
    const pop = $("#hlPop");
    let lastRange = null;
    $("#prose").addEventListener("mouseup", () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { pop.style.display = "none"; return; }
      const r = sel.getRangeAt(0); lastRange = r;
      const rect = r.getBoundingClientRect();
      const host = $("#screen-reading").getBoundingClientRect();
      pop.style.display = "flex";
      pop.style.left = Math.max(8, rect.left - host.left + rect.width / 2 - 70) + "px";
      pop.style.top = (rect.top - host.top - 46) + "px";
    });
    pop.querySelectorAll("[data-hl]").forEach(b => b.addEventListener("click", () => {
      const kind = b.dataset.hl;
      if (kind === "copy") { navigator.clipboard && navigator.clipboard.writeText(String(window.getSelection())); toast("Copied."); }
      else if (lastRange) {
        try {
          const mark = document.createElement("mark"); mark.className = "hl";
          mark.appendChild(lastRange.extractContents()); lastRange.insertNode(mark);
          toast(kind === "note" ? "Saved to your highlights. Add a note in Library." : "Highlighted. Find it in Library, under Things.");
        } catch (e) { toast("Select text within one paragraph."); }
      }
      pop.style.display = "none"; window.getSelection().removeAllRanges();
    }));
  }

  function wireThread(i, slot) {
    const p = W.CHAPTER.paragraphs[i];
    slot.querySelectorAll("[data-react]").forEach(r => r.addEventListener("click", () => {
      const [, emoji] = r.dataset.react.split(":");
      p.thread = p.thread || { reactions:{}, comments:[] };
      if (!p.thread.mine) p.thread.mine = new Set();
      const on = !p.thread.mine.has(emoji);
      if (on) p.thread.mine.add(emoji); else p.thread.mine.delete(emoji);
      p.thread.reactions[emoji] = Math.max(0, (p.thread.reactions[emoji] || 0) + (on ? 1 : -1));
      r.classList.toggle("is-on", on);
      r.setAttribute("aria-pressed", String(on));
      const n = p.thread.reactions[emoji];
      r.innerHTML = emoji + (n > 0 ? `<small>${n}</small>` : "");
    }));
    slot.querySelector(".react--add") && slot.querySelector(".react--add").addEventListener("click", () => toast("A full emoji picker opens here."));
    const post = slot.querySelector(`[data-post="${i}"]`);
    const ta = slot.querySelector(`[data-compose="${i}"]`);
    post && post.addEventListener("click", () => {
      const text = ta.value.trim(); if (!text) { ta.focus(); return; }
      p.thread = p.thread || { reactions:{}, comments:[] };
      p.thread.comments.push({ who:"Rowan", init:"R", when:"now", text });
      // re-render thread and re-open
      slot.innerHTML = threadHTML(p, i); wireThread(i, slot);
      $(`.para[data-para="${i}"]`).classList.add("has-thread");
      const marker = $(`.para__marker[data-para="${i}"]`);
      if (marker) marker.innerHTML = icon("comment",15) + `<span class="para__count">${p.thread.comments.length}</span>`;
      toast("Posted on the line.");
    });
    slot.querySelectorAll("[data-heart-c]").forEach(h => h.addEventListener("click", () => h.style.color = "var(--rose)"));
  }

  /* ======================================================================= */
  /*  SCREEN: WRITING STATION  ·  a desk of many works, editor one click in    */
  /* ======================================================================= */
  const WSTATUS = {
    ongoing:   { t:"Ongoing",   pip:"amber" },
    complete:  { t:"Complete",  pip:"sage" },
    draft:     { t:"Draft",     pip:"draft" },
    scheduled: { t:"Scheduled", pip:"rose" }
  };
  function findWriterWork(id) {
    for (const s of W.WRITER.series) {
      const b = s.books.find(x => x.id === id);
      if (b) return Object.assign({}, b, { series: s });
    }
    const st = W.WRITER.standalone.find(x => x.id === id);
    return st ? Object.assign({}, st, { series: null }) : null;
  }

  function renderWrite(arg) {
    if (!arg) return renderWriteDashboard();
    if (arg === "new") return renderWriteEditor(null);
    const w = findWriterWork(arg);
    return w ? renderWriteEditor(w) : renderWriteDashboard();
  }

  /* ---- desk mutations (in-memory stand-in for the server) ---------------- */
  function allBooks() { return W.WRITER.series.flatMap(s => s.books).concat(W.WRITER.standalone); }
  function totalWorks() { return allBooks().length; }
  function deleteWork(id) {
    for (const s of W.WRITER.series) { const i = s.books.findIndex(b => b.id === id); if (i >= 0) { s.books.splice(i, 1); return; } }
    const j = W.WRITER.standalone.findIndex(b => b.id === id); if (j >= 0) W.WRITER.standalone.splice(j, 1);
  }
  function makeStandalone(id) {
    for (const s of W.WRITER.series) {
      const i = s.books.findIndex(b => b.id === id);
      if (i >= 0) { const b = s.books.splice(i, 1)[0]; delete b.book; b.type = s.type; b.source = s.source; W.WRITER.standalone.push(b); return; }
    }
  }
  function deleteSeries(id) {
    const i = W.WRITER.series.findIndex(s => s.id === id); if (i < 0) return;
    const s = W.WRITER.series.splice(i, 1)[0];
    s.books.forEach(b => { delete b.book; b.type = s.type; b.source = s.source; W.WRITER.standalone.push(b); });
  }
  function reorderBook(seriesId, bookId, dir) {
    const s = W.WRITER.series.find(x => x.id === seriesId); if (!s) return;
    const i = s.books.findIndex(b => b.id === bookId); const j = i + (dir === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= s.books.length) return;
    [s.books[i], s.books[j]] = [s.books[j], s.books[i]];
    s.books.forEach((b, k) => { if (b.book != null) b.book = k + 1; });
  }

  /* ---- manage-series dialog ---------------------------------------------- */
  function seriesModalHTML(s) {
    const arrow = (deg) => `<span style="display:inline-flex;transform:rotate(${deg}deg)">${icon("chev", 13)}</span>`;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h2 style="font-size:20px">Manage series</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Series name</label><input type="text" id="ms-name" value="${esc(s.name)}"></div>
      <div class="field"><label>Description</label><textarea id="ms-note" rows="2">${esc(s.note)}</textarea></div>
      <div class="field"><label>Order of books</label>
        <div class="reorder">
          ${s.books.map((b, i) => `
            <div class="reorder-row">
              <span>${esc(b.title)}</span>
              <span class="reorder-ctrls">
                <button data-move="up|${b.id}" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(b.title)} up">${arrow(-90)}</button>
                <button data-move="down|${b.id}" ${i === s.books.length - 1 ? "disabled" : ""} aria-label="Move ${esc(b.title)} down">${arrow(90)}</button>
              </span>
            </div>`).join("")}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
        <button class="btn--link" data-delete-series style="color:#a2444f">Delete series</button>
        <div style="display:flex;gap:10px">
          <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
          <button class="btn btn--primary" data-save-series>Save</button>
        </div>
      </div>`;
  }
  function manageSeries(id) {
    const s = W.WRITER.series.find(x => x.id === id); if (!s) return;
    openModal(seriesModalHTML(s), "Manage series");
    $$("#modalCard [data-move]").forEach(b => b.addEventListener("click", () => {
      const [dir, bid] = b.dataset.move.split("|");
      reorderBook(id, bid, dir); manageSeries(id);
      const again = $(`#modalCard [data-move="${dir}|${bid}"]`);
      (again && !again.disabled ? again : $("#modalCard [data-save-series]")).focus();
    }));
    $("#modalCard [data-save-series]").addEventListener("click", () => {
      const nm = $("#ms-name").value.trim(); if (nm) s.name = nm;
      s.note = $("#ms-note").value.trim();
      closeModal(); renderWriteDashboard(); toast("Series saved.");
    });
    $("#modalCard [data-delete-series]").addEventListener("click", () => {
      const n = s.books.length;
      confirmDialog({
        title: "Delete this series?",
        body: `The series grouping is removed. Its ${n} ${n === 1 ? "book stays" : "books stay"} in your works as standalone.`,
        confirmText: "Delete series", danger: true
      }, () => { deleteSeries(id); renderWriteDashboard(); toast("Series deleted. The books were kept."); });
    });
  }

  /* ---- per-work menu on the desk ----------------------------------------- */
  function workRowMenu(id) {
    const w = findWriterWork(id); if (!w) return;
    const items = [{ icon: "edit", label: "Edit", run: () => navigate("write/" + id) }];
    if (w.series) items.push({ icon: "book", label: "Make standalone", run: () => { makeStandalone(id); renderWriteDashboard(); toast("Moved to your standalone works."); } });
    items.push({
      icon: "trash", label: "Delete work", danger: true, run: () => {
        confirmDialog({
          title: "Delete this work?",
          body: `${esc(w.title)} and its ${w.chapters} ${w.chapters === 1 ? "chapter" : "chapters"} will be deleted. You can't undo this.`,
          confirmText: "Delete work", danger: true
        }, () => { deleteWork(id); renderWriteDashboard(); toast("Work deleted."); });
      }
    });
    menuDialog(w.title, items);
  }

  /* ---- reader work-page menu and sharing --------------------------------- */
  function copyLink(id) {
    const url = location.origin + location.pathname + "#/work/" + id;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => toast("Link copied."), () => toast("Could not copy the link."));
    else toast("Link copied.");
  }
  function workOverflow(id) {
    const w = W.byId[id]; if (!w) return;
    menuDialog(w.title, [
      { icon: "share", label: "Copy link", run: () => copyLink(id) },
      { icon: "mute", label: "Mute " + w.source, run: () => { userState.mutedTags.add(w.source); toast("Muted " + w.source + ". You won't see works tagged with it."); } },
      { icon: "user", label: "Block " + w.author, run: () => { userState.blockedUsers.add(w.author); toast("Blocked " + w.author + "."); } },
      { icon: "flag", label: "Report", run: () => confirmDialog({
          title: "Report this work?",
          body: "Reports go to the moderation team. Use this for illegal content, harassment, or spam.",
          confirmText: "Send report"
        }, () => toast("Report sent to the moderation team.")) }
    ]);
  }

  function msRow(b) {
    const st = WSTATUS[b.status];
    const isPublic = b.status === "ongoing" || b.status === "complete";
    const stats = isPublic
      ? `<span class="ms-stats"><span class="stat stat--heart">${icon("heart",13)}${b.hearts}</span><span class="stat">${icon("comment",13)}${b.comments}</span><span class="stat">${icon("eye",13)}${b.reads}</span></span>`
      : `<span class="ms-stats muted">${b.status === "scheduled" ? "Scheduled, not visible to readers yet" : "Draft, only you can see it"}</span>`;
    return `<div class="ms-row" data-edit="${b.id}">
      <span class="ms-cover">${cover(b.cover, b.title)}${rate(b.rating)}</span>
      <span class="ms-main">
        <span class="ms-title">${esc(b.title)}${b.book ? `<span class="ms-book">Book ${b.book}</span>` : ""}</span>
        <span class="ms-meta">
          <span class="ms-status"><span class="pip pip--${st.pip}"></span>${st.t}</span>
          <span class="muted">${b.chapters} ${b.chapters === 1 ? "chapter" : "chapters"}</span>
          <span class="muted">${esc(b.when)}</span>
        </span>
        ${stats}
      </span>
      <span class="ms-row__actions">
        <button class="ms-menu" data-work-menu="${b.id}" aria-label="More actions for ${esc(b.title)}">${icon("more",18)}</button>
        <button class="ms-go-btn" data-edit="${b.id}">${b.status === "draft" ? "Continue" : "Edit"} ${icon("chev",15)}</button>
      </span>
    </div>`;
  }

  function renderWriteDashboard() {
    const books = allBooks();
    const drafts = books.filter(b => b.status === "draft").length;
    const scheduled = books.filter(b => b.status === "scheduled").length;
    const seriesHTML = W.WRITER.series.map(s => `
      <section class="ms-series">
        <div class="series-head">
          <div class="series-head__title">
            <span class="series-name">${esc(s.name)}</span>
            <span class="pill">Series</span>
            <span class="pill">${s.type === "fan" ? "Fanwork" : "Original"}</span>
            <span class="pill">${esc(s.source)}</span>
          </div>
          <button class="btn--link" data-manage-series="${s.id}">Manage series</button>
        </div>
        <p class="muted" style="font-size:13px;margin:2px 0 12px">${esc(s.note)}</p>
        <div class="ms-list">
          ${s.books.map(msRow).join("")}
          <button class="ms-add" data-toast="A new book in this series keeps its characters and description.">${icon("plus",15)} Add a book to this series</button>
        </div>
      </section>`).join("");

    const standaloneHTML = `
      <section class="ms-series">
        <div class="series-head">
          <div class="series-head__title"><span class="series-name">Standalone works</span></div>
          <span class="muted" style="font-size:12.5px">${W.WRITER.standalone.length} works</span>
        </div>
        <div class="ms-list">
          ${W.WRITER.standalone.map(msRow).join("")}
          <button class="ms-add" data-edit="new">${icon("plus",15)} Start a standalone work</button>
        </div>
      </section>`;

    $("#screen-write").innerHTML = `
      <div class="page page--wide">
        <div class="write-head">
          <div>
            <h1 class="vh">Writing Station</h1>
            <div class="eyebrow rose" style="margin-bottom:8px">Writing Station</div>
            <div class="display" style="font-size:30px">Your works</div>
            <p class="section-lead" style="margin-bottom:0">All of your works in one place.</p>
          </div>
          <div class="write-actions">
            <button class="btn btn--primary" data-edit="new">${icon("plus",16)} New work</button>
            <button class="btn btn--quiet" data-toast="A series groups related books together and shares their characters.">New series</button>
          </div>
        </div>

        <div class="desk-totals">
          <div><b>${totalWorks()}</b><span>works</span></div>
          <div><b>${W.WRITER.series.length}</b><span>series</span></div>
          <div><b>${drafts}</b><span>drafts</span></div>
          <div><b>${scheduled}</b><span>scheduled</span></div>
          <div><b>${W.WRITER.totals.hearts}</b><span>hearts</span></div>
        </div>
        <p class="muted" style="font-size:12px;margin:10px 2px 26px">Your stats: hearts, comments, reads, and bookmarks.</p>

        ${seriesHTML}
        ${standaloneHTML}
      </div>`;
  }

  // Turn a plain-text chapter body into editor paragraphs.
  function bodyToEditorHTML(body) {
    const parts = splitParagraphs(body);
    return parts.length ? parts.map(p => `<p>${esc(p)}</p>`).join("") : "<p></p>";
  }

  function renderWriteEditor(work) {
    const isNew = !work;
    const editingLive = !!(work && work._db);
    const type = work ? (work.series ? work.series.type : work.type) : "fan";
    const source = work ? (work.series ? work.series.source : (work.source || "")) : "";
    const rating = work ? work.rating : "T";
    const title = work ? work.title : "";
    const chapters = work ? work.chapters : 0;
    const seriesName = editingLive
      ? (liveEditor && liveEditor.seriesName ? liveEditor.seriesName : "")
      : (isNew && pendingSeries ? pendingSeries : (work && work.series ? work.series.name : ""));
    pendingSeries = null;
    const st = work ? WSTATUS[work._dbStatus || work.status] : null;
    const tagsValue = editingLive ? (work.tags || []).join(", ") : "";
    const workWarnings = work ? (work.warnings || []) : [];
    const coverIsImage = editingLive && work.cover && /^https?:/.test(work.cover);
    editorCover = coverIsImage ? work.cover : null;
    coverCleared = false;

    // The editor holds one chapter at a time. Live edits load the real text;
    // otherwise the editor opens on a fresh chapter.
    const bodyHTML = editingLive && liveEditor && liveEditor.chapter
      ? bodyToEditorHTML(liveEditor.chapter.body)
      : `<h2>Chapter ${chapters + 1}${isNew ? ": Untitled" : ""}</h2>
         <p>${isNew ? "Start typing, or paste from another editor." : "Pick up where you left off. Your writing saves automatically."}</p>
         <p>Format with the toolbar above, or use Markdown shortcuts.</p>`;

    const partsHTML = chapters > 0
      ? Array.from({ length: chapters }, (_, i) => `
          <button class="part-row ${i === chapters - 1 ? "is-current" : ""}" data-toast="Open this chapter in the editor.">
            <span class="part-n">${i + 1}</span><span class="part-title">Chapter ${i + 1}</span>
          </button>`).join("")
      : `<p class="muted" style="font-size:13px;margin:0">No chapters yet. Your first one starts in the editor.</p>`;

    const typeFields = type === "fan"
      ? `<div class="field"><label>Fandom</label><input type="text" id="we-source" value="${esc(source)}"></div>
         <div class="field"><label>Relationship</label><input type="text" placeholder="Character A / Character B"></div>`
      : `<div class="field"><label>Setting or genre</label><input type="text" id="we-source" value="${esc(source)}"></div>
         <div class="field"><label>Characters</label><input type="text" placeholder="Registered against your series"></div>`;

    $("#screen-write").innerHTML = `
      <div class="page page--wide">
        <div class="write-head">
          <div>
            <button class="btn--link" data-nav="write" style="margin-bottom:8px">&lsaquo; All works</button>
            <h1 class="display" style="font-size:26px">${isNew ? "New work" : esc(title)}</h1>
            <div class="muted" style="font-size:13.5px;margin-top:5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              ${seriesName ? `<span>In series <b style="color:var(--ink2)">${esc(seriesName)}</b>${work.book ? `, book ${work.book}` : ""}</span><span>&middot;</span>` : ""}
              ${st ? `<span class="ms-status"><span class="pip pip--${st.pip}"></span>${st.t}</span>` : "<span>Not published yet</span>"}
            </div>
          </div>
          <div class="save-flag">${icon("check",14)} Saved just now</div>
        </div>

        <div class="writer">
          <div>
            <input class="title-input" id="we-title" placeholder="Title your work" value="${esc(title)}">
            <div class="toolbar" role="toolbar" aria-label="Formatting">
              <button title="Heading">H</button>
              <button title="Bold"><b>B</b></button>
              <button title="Italic"><i>I</i></button>
              <button title="Quote">&ldquo;</button>
              <span class="sep"></span>
              <button title="Bulleted list">&bull;</button>
              <button title="Numbered list">1.</button>
              <button title="Link">${icon("tag",15)}</button>
              <button title="Image">${icon("book",15)}</button>
              <span class="sep"></span>
              <button title="Horizontal rule"><span style="display:inline-block;width:16px;height:2px;background:currentColor;border-radius:2px"></span></button>
              <span style="margin-left:auto;font-size:12px;color:var(--ink3);padding:0 8px">Markdown shortcuts on</span>
            </div>
            <div class="editor" id="we-body" contenteditable="true" spellcheck="true" aria-label="Chapter body">${bodyHTML}</div>
            <div class="write-actions" style="margin-top:16px">
              <button class="btn btn--primary" data-publish="publish">Publish chapter</button>
              <button class="btn btn--quiet" data-publish="draft">Save draft</button>
              <button class="btn btn--quiet" data-schedule>Schedule &hellip;</button>
              <button class="btn btn--link">Preview</button>
            </div>
          </div>

          <aside>
            <div class="panel">
              <h4>Chapters</h4>
              <div class="parts">${partsHTML}</div>
              <button class="btn--link" style="margin-top:10px" data-toast="A new chapter is added to this work.">${icon("plus",13)} New chapter</button>
            </div>

            <div class="panel">
              <h4>Work details</h4>
              <div class="field"><label>Series</label><input type="text" id="we-series" value="${esc(seriesName)}" placeholder="Standalone, or start a series"></div>
              <div class="field"><label>Work type</label>
                <div class="seg" role="group" aria-label="Work type">
                  <button data-wtype="fan" class="${type === "fan" ? "is-on" : ""}" aria-pressed="${type === "fan"}">Fanwork</button>
                  <button data-wtype="original" class="${type === "original" ? "is-on" : ""}" aria-pressed="${type === "original"}">Original</button>
                </div>
              </div>
              ${typeFields}
              <div class="field"><label>Additional tags</label><input type="text" id="we-tags" placeholder="Slow burn, found family, ..."></div>
              <p class="muted" style="font-size:11.5px;margin-top:2px">Up to 50 tags. Common tags have short descriptions; the rest are freeform.</p>
            </div>

            <div class="panel">
              <h4>Rating</h4>
              <div class="rate-choice">${["G","T","M","E"].map(r => `<button data-wrate="${r}" class="${r === rating ? "is-on" : ""}" aria-pressed="${r === rating}">${r}</button>`).join("")}</div>
              <div class="field" style="margin-top:12px"><label>Warnings</label>
                ${WARNINGS.map(w => `<label class="check"><input type="checkbox" data-warn="${esc(w)}" ${workWarnings.includes(w) ? "checked" : ""}> ${esc(w)}</label>`).join("")}
              </div>
            </div>

            <div class="panel">
              <h4>Cover</h4>
              <label class="cover-drop" id="coverDrop" for="we-cover-file">
                <input type="file" id="we-cover-file" accept="image/*" hidden>
                ${icon("plus",18)}<div style="margin-top:6px" id="coverDropText">${coverIsImage ? "Replace cover" : "Upload a cover"}</div>
                <div style="font-size:11px;margin-top:2px">Required to publish</div>
              </label>
              <div id="coverPreview" style="margin-top:10px">${coverIsImage ? `<img src="${esc(work.cover)}" alt="Cover preview" style="width:100%;border-radius:10px;display:block">` : ""}</div>
              <button class="btn--link" id="coverRemove" style="margin-top:8px;color:#a2444f;${coverIsImage ? "" : "display:none"}">Remove cover</button>
            </div>

            <div class="panel">
              <h4>Serialization</h4>
              <div class="field"><label>Update schedule, shown to readers</label><input type="text" value="${work && work.schedule ? esc(work.schedule) : ""}" placeholder="e.g. Sundays"></div>
              <p class="muted" style="font-size:12px;margin:0;line-height:1.55">Schedule chapters to post automatically, or backdate them.</p>
            </div>

            <div class="panel">
              <h4>Per-work controls</h4>
              <div class="toggle-row"><span>Allow inline comments</span><label class="switch"><input type="checkbox" checked aria-label="Allow inline comments"><span class="track"></span><span class="knob"></span></label></div>
              <div class="toggle-row"><span>Moderate before posting</span><label class="switch"><input type="checkbox" aria-label="Moderate before posting"><span class="track"></span><span class="knob"></span></label></div>
              <div class="toggle-row"><span>Logged-in readers only</span><label class="switch"><input type="checkbox" aria-label="Logged-in readers only"><span class="track"></span><span class="knob"></span></label></div>
              <div class="toggle-row"><span>Post anonymously</span><label class="switch"><input type="checkbox" aria-label="Post anonymously"><span class="track"></span><span class="knob"></span></label></div>
              <div class="toggle-row"><span>Hide my numbers</span><label class="switch"><input type="checkbox" aria-label="Hide my numbers"><span class="track"></span><span class="knob"></span></label></div>
            </div>

            <div class="panel">
              <h4>Notes and workspace</h4>
              <p class="muted" style="font-size:13px;line-height:1.6;margin:0">Attach outlines, character sheets, and worldbuilding notes to this work and its series.</p>
              <button class="btn--link" style="margin-top:10px">Open workspace</button>
            </div>
          </aside>
        </div>
      </div>`;

    // Real cover upload (live mode only; demo mode explains it needs a backend).
    const coverInput = $("#we-cover-file");
    if (coverInput) coverInput.addEventListener("change", async () => {
      const file = coverInput.files && coverInput.files[0];
      if (!file) return;
      if (!isLive()) { toast("Connect Supabase to upload a cover."); coverInput.value = ""; return; }
      if (!WispDB.signedIn) { openAuth("in"); return; }
      const drop = $("#coverDrop"); if (drop) drop.style.opacity = "0.6";
      try {
        const url = await WispDB.uploadCover(file);
        editorCover = url; coverCleared = false;
        const prev = $("#coverPreview");
        if (prev) prev.innerHTML = `<img src="${esc(url)}" alt="Cover preview" style="width:100%;border-radius:10px;display:block">`;
        const rm = $("#coverRemove"); if (rm) rm.style.display = "";
        const dt = $("#coverDropText"); if (dt) dt.textContent = "Replace cover";
        toast("Cover uploaded.");
      } catch (e) { toast((e && e.message) || "Could not upload the cover."); }
      finally { if (drop) drop.style.opacity = ""; }
    });
    const coverRemove = $("#coverRemove");
    if (coverRemove) coverRemove.addEventListener("click", () => {
      editorCover = null; coverCleared = true;
      if (coverInput) coverInput.value = "";
      const prev = $("#coverPreview"); if (prev) prev.innerHTML = "";
      coverRemove.style.display = "none";
      const dt = $("#coverDropText"); if (dt) dt.textContent = "Upload a cover";
      toast("Cover removed. It reverts to the title-letter cover when you save.");
    });
  }

  /* ======================================================================= */
  /*  SCREEN: LIBRARY                                                         */
  /* ======================================================================= */
  let libTab = "bookmarks";
  function renderLibrary() {
    const L = W.LIBRARY;
    const gridOf = (ids) => `<div class="work-grid">${ids.map(id => cardGallery(W.byId[id])).join("")}</div>`;

    const panes = {
      bookmarks: `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Bookmarks</span><span class="muted" style="font-size:13px">${L.bookmarks.length} works</span></div>${gridOf(L.bookmarks)}</div>`,
      lists: `
        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Reading lists</span><button class="btn btn--quiet btn--sm" data-toast="New list. Private by default.">${icon("plus",14)} New list</button></div>
          <div class="list-grid">
            ${L.lists.map(l => `
              <div class="list-tile">
                <div class="stack-cvrs" style="margin-bottom:12px">${l.covers.map(id => { const w = W.byId[id]; return `<span>${cover(w ? w.cover : id, w ? w.title : "")}</span>`; }).join("")}</div>
                <div style="font:600 17px var(--font-display);color:var(--ink)">${esc(l.name)}</div>
                <div class="muted" style="font-size:12.5px;margin-top:4px">${l.count} works &middot; ${l.public ? "Public" : "Private"}</div>
              </div>`).join("")}
          </div>
          <p class="muted" style="font-size:12.5px;margin-top:12px">Lists are private by default. Make one public and anyone can browse it.</p>
        </div>`,
      history: `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Recently read</span><button class="btn--link" data-toast="History cleared for this session.">Clear history</button></div>${gridOf(L.history)}</div>`,
      things: `
        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Things</span><span class="muted" style="font-size:13px">Your private highlights and notes</span></div>
          ${L.things.map(t => { const w = W.byId[t.work]; return `
            <div class="thing">
              <div style="font:500 15px var(--font-read);color:var(--ink)">${esc(t.text)}</div>
              <div class="soft" style="font-size:13.5px;margin-top:6px">${esc(t.note)}</div>
              <div class="thing__src">from <a href="#/work/${w.id}">${esc(w.title)}</a> &middot; only you can see this</div>
            </div>`; }).join("")}
        </div>`
    };

    $("#screen-library").innerHTML = `
      <div class="page page--wide">
        <div class="eyebrow rose" style="margin-bottom:8px">Library</div>
        <h1 class="display" style="font-size:30px;margin-bottom:6px">Your library</h1>
        <p class="section-lead">Your bookmarks, lists, history, and notes.</p>

        <div class="subtabs">
          ${[["bookmarks","Bookmarks"],["lists","Reading lists"],["history","History"],["things","Things"]].map(([k, n]) =>
            `<button class="subtab ${libTab === k ? "is-active" : ""}" data-libtab="${k}">${n}</button>`).join("")}
        </div>
        ${panes[libTab]}
      </div>`;
  }

  /* ======================================================================= */
  /*  SCREEN: COMMUNITY SPACE                                                 */
  /* ======================================================================= */
  function renderCommunity() {
    $("#screen-community").innerHTML = `
      <div class="page page--wide">
        <div class="eyebrow rose" style="margin-bottom:8px">Community Space</div>
        <h1 class="display" style="font-size:30px;margin-bottom:6px">Community</h1>
        <p class="section-lead">Hubs for fandoms and tags, plus events you can join.</p>

        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Events and challenges</span><span class="muted" style="font-size:13px">Only events you have joined show up on Home</span></div>
          ${W.EVENTS.map((e, i) => `
            <div class="event">
              <div class="event__date"><b>${e.d}</b><span class="muted" style="font-size:12px">${e.m}</span></div>
              <div style="flex:1">
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font:600 18px var(--font-display);color:var(--ink)">${esc(e.title)}</span><span class="pill">${esc(e.kind)}</span></div>
                <p class="soft" style="font-size:14px;margin:6px 0 0;line-height:1.6">${esc(e.note)}</p>
              </div>
              <button class="btn ${e.joined ? "btn--quiet" : "btn--ghost"} btn--sm" data-event="${i}" aria-pressed="${e.joined}">${e.joined ? "Joined" : "Join"}</button>
            </div>`).join("")}
          <p class="muted" style="font-size:12.5px;margin-top:10px">Collections now; full gift exchanges will come as the community grows.</p>
        </div>

        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Hubs</span><button class="btn--link">Browse all hubs &rsaquo;</button></div>
          <div class="hub-grid">
            ${W.HUBS.map(h => `
              <div class="hub">
                <div class="hub__name"><span style="color:var(--rose)">${icon(h.icon,16)}</span>${esc(h.name)}</div>
                <div class="muted" style="font-size:12px;margin:3px 0 8px">${esc(h.kind)} &middot; ${esc(h.members)} readers</div>
                <p class="soft" style="font-size:13.5px;margin:0;line-height:1.55">${esc(h.note)}</p>
                <button class="btn--link" style="margin-top:10px" data-toast="Followed the hub.">Follow &rsaquo;</button>
              </div>`).join("")}
          </div>
        </div>

        <div class="editorial">
          <div class="eyebrow rose" style="margin-bottom:6px">Reporting and support</div>
          <p class="soft" style="font-size:14px;margin:0;line-height:1.7">Most discussion, bug reports, and support happen on the Wisp Discord. The in-app report button is for urgent cases and goes straight to the moderation team. Fiction is allowed as long as it's tagged and warned. The limits are illegal content, targeted harassment, doxxing, threats against real people, and spam.</p>
        </div>
      </div>`;
  }

  /* ======================================================================= */
  /*  SCREEN: PROFILE                                                         */
  /* ======================================================================= */
  function renderProfileSignedOut() {
    $("#screen-profile").innerHTML = `
      <div class="page page--wide">
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px;margin-bottom:16px">Sign in to see your profile.</p>
          <button class="btn btn--primary" data-auth="in">Sign in</button>
        </div>
      </div>`;
  }
  function renderProfileLive(works) {
    const p = WispDB.profile || {};
    const name = p.display_name || "You";
    const handle = p.handle ? "@" + p.handle : "";
    const published = (works || []).filter(w => w.status === "ongoing" || w.status === "complete");
    const hearts = (works || []).reduce((n, w) => n + (+w.hearts_count || 0), 0);
    const pinnedCards = published.length
      ? `<div class="work-grid">${published.map(w => cardGallery(WispDB.toCard(w))).join("")}</div>`
      : `<p class="muted" style="font-size:14px;padding:16px 4px">Nothing published yet. Your posted works will show here.</p>`;
    $("#screen-profile").innerHTML = `
      <div class="page page--wide">
        <div class="profile-hero">
          <div class="profile-hero__av">${esc((name[0] || "?").toUpperCase())}</div>
          <div style="flex:1;min-width:220px">
            <h1 class="display" style="font-size:28px">${esc(name)}</h1>
            <div class="muted" style="font-size:14px">${esc(handle)}</div>
            ${p.bio ? `<p class="soft" style="font-size:15px;line-height:1.6;margin:10px 0 0;max-width:560px">${esc(p.bio)}</p>` : ""}
            <div class="profile-stats">
              <div><b>${published.length}</b><span>Works</span></div>
              <div><b>${WispDB.fmtCount(hearts)}</b><span>Hearts</span></div>
              <div><b>0</b><span>Followers</span></div>
              <div><b>0</b><span>Following</span></div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn--quiet btn--sm" id="themeBtn2">${icon("gear",15)} Customize theme</button>
            <button class="btn btn--quiet btn--sm" data-nav="write">${icon("edit",15)} Your works</button>
          </div>
        </div>
        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Published works</span></div>
          ${pinnedCards}
        </div>
      </div>`;
    $("#themeBtn2") && $("#themeBtn2").addEventListener("click", openTheme);
  }
  async function loadProfile() {
    if (!WispDB.signedIn) { renderProfileSignedOut(); return; }
    loadingScreen("#screen-profile");
    try { renderProfileLive(await WispDB.myWorks()); }
    catch (e) { console.error("[wisp] profile load failed:", e); renderProfileLive([]); }
  }
  function renderProfile() {
    if (isLive()) return loadProfile();
    const P = W.PROFILE;
    $("#screen-profile").innerHTML = `
      <div class="page page--wide">
        <div class="profile-hero">
          <div class="profile-hero__av">${esc(P.name[0])}</div>
          <div style="flex:1;min-width:220px">
            <h1 class="display" style="font-size:28px">${esc(P.name)}</h1>
            <div class="muted" style="font-size:14px">${esc(P.handle)} &middot; ${esc(P.joined)}</div>
            <p class="soft" style="font-size:15px;line-height:1.6;margin:10px 0 0;max-width:560px">${esc(P.bio)}</p>
            <div class="profile-stats">
              <div><b>${P.stats.works}</b><span>Works</span></div>
              <div><b>${P.stats.hearts}</b><span>Hearts</span></div>
              <div><b>${P.stats.followers}</b><span>Followers</span></div>
              <div><b>${P.stats.following}</b><span>Following</span></div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn--quiet btn--sm" id="themeBtn2">${icon("gear",15)} Customize theme</button>
            <button class="btn btn--quiet btn--sm" data-toast="Arrange your profile theme, pinned works, and widgets here.">Edit profile</button>
          </div>
        </div>

        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Pinned works</span></div>
          <div class="work-grid">${P.pinned.map(id => cardGallery(W.byId[id])).join("")}</div>
        </div>

        <div class="editorial">
          <div class="eyebrow rose" style="margin-bottom:6px">Your profile</div>
          <p class="soft" style="font-size:14px;margin:0;line-height:1.7">Style your profile with the same theme system as the rest of the site: accent, fonts, background, pinned works, and widgets. Your theme only changes your own view.</p>
        </div>
      </div>`;
    $("#themeBtn2") && $("#themeBtn2").addEventListener("click", openTheme);
  }

  /* ---- rails ------------------------------------------------------------- */
  function activityHTML() {
    if (isLive()) {
      return `<div class="act-list"><p class="muted" style="font-size:13px;padding:10px 4px;line-height:1.6">No activity yet. When people heart, comment on, or follow your work, it shows up here.</p></div>`;
    }
    return Object.entries(W.ACTIVITY).map(([g, items]) => `
      <div class="rail__group">${g}</div>
      <div class="act-list">
        ${items.map(a => `
          <button class="act" ${a.work ? `data-work="${a.work}"` : ""}>
            <span class="act__icon ${a.rose ? "rose" : ""}">${icon(a.icon, 14)}</span>
            <span class="act__body">${a.html}<span class="act__time">${a.time}</span></span>
          </button>`).join("")}
      </div>`).join("");
  }
  function renderActivity() { $("#activityMount").innerHTML = activityHTML(); }

  let luckyIdx = 0;
  function widgetHTML() {
    if (isLive()) {
      return `
        <div class="widget">
          <div class="widget__label" style="margin-bottom:10px">Lucky</div>
          <p class="muted" style="font-size:12.5px;margin:6px 0 12px">Once there are works to draw from, this picks a random one for you.</p>
          <button class="btn btn--ghost btn--full" data-nav="browse">${icon("shuffle",15)} Browse works</button>
        </div>
        <div class="widget">
          <div class="widget__label">Your week</div>
          <div style="font:15px/1.5 var(--font-read);color:var(--ink2)">Reading stats show up here as you read.</div>
        </div>`;
    }
    const wd = W.WIDGETS;
    return `
      <div class="widget">
        <div class="widget__label" style="margin-bottom:10px">Lucky</div>
        <div class="widget__title lucky-title" style="min-height:44px">${esc(wd.luckyPool[luckyIdx % wd.luckyPool.length])}</div>
        <p class="muted" style="font-size:12.5px;margin:6px 0 12px">A random work from the tags you follow.</p>
        <button class="btn btn--ghost btn--full" data-lucky>${icon("shuffle",15)} Surprise me</button>
      </div>

      <div class="widget">
        <div class="widget__label">Staff picks</div>
        <button class="mini-work" data-work="room9" style="background:none;border:0;text-align:left;cursor:pointer;width:100%">
          <span class="mini-cover">${cover("room9", wd.staffPick.title)}</span>
          <span><span class="mini-work__title">${esc(wd.staffPick.title)}</span><span class="mini-work__by">by ${esc(wd.staffPick.author)}</span></span>
        </button>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin-top:12px">Chosen by the Wisp editors. <a href="#/community">See who picks &rsaquo;</a></p>
      </div>

      <div class="widget">
        <div class="widget__label">A tag you follow</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="display:inline-flex;align-items:center;gap:7px;font:18px var(--font-display);color:var(--ink)"><span style="color:var(--rose)">${icon("tag",15)}</span>${esc(wd.tag.name)}</span>
          <span style="font-size:12.5px;color:var(--rose-ink);background:var(--rose-wash);border-radius:999px;padding:3px 9px">${wd.tag.newCount} new</span>
        </div>
        <p class="muted" style="font-size:12.5px;margin:10px 0 0">${wd.tag.week} works this week. <a href="#/browse">Open tag &rsaquo;</a></p>
      </div>

      <div class="widget">
        <div class="widget__label">This week</div>
        <div style="font:17px/1.35 var(--font-display);color:var(--ink)">You read ${wd.week.works} works,<br>${wd.week.words} words.</div>
      </div>`;
  }
  function renderWidgets() { $("#widgetMount").innerHTML = widgetHTML(); }

  /* ======================================================================= */
  /*  THEME ENGINE  ·  the accessibility engine too                          */
  /* ======================================================================= */
  const PRESETS = [
    { id:"cream",    name:"Warm cream",   chips:["#f4efe4","#ab5a67","#2c2620"] },
    { id:"sepia",    name:"Sepia",        chips:["#ecdfc4","#a5545f","#4a3b28"] },
    { id:"slate",    name:"Slate",        chips:["#e8eaee","#9c5566","#23262c"] },
    { id:"midnight", name:"Midnight",     chips:["#26242d","#d98a99","#ece7f0"] },
    { id:"oled",     name:"OLED black",   chips:["#000000","#e0919f","#f1eef4"] },
    { id:"contrast", name:"High contrast",chips:["#ffffff","#99303f","#131313"] }
  ];
  const ACCENTS = [
    { id:"default", c:"#ab5a67" }, { id:"plum", c:"#7d5a86" }, { id:"sea", c:"#4f8079" },
    { id:"ember", c:"#b1673f" }, { id:"indigo", c:"#5f6bb0" }
  ];

  function applySettings() {
    const r = document.documentElement;
    r.setAttribute("data-theme", settings.theme);
    if (settings.accent === "default") r.removeAttribute("data-accent"); else r.setAttribute("data-accent", settings.accent);
    r.setAttribute("data-readface", settings.face);
    settings.dyslexia ? r.setAttribute("data-dyslexia", "on") : r.removeAttribute("data-dyslexia");
    settings.motion ? r.setAttribute("data-motion", "reduce") : r.removeAttribute("data-motion");
    r.style.setProperty("--read-size", settings.size + "px");
    r.style.setProperty("--measure", settings.measure);
    document.body.classList.toggle("hide-margins", !settings.margins);
    const themeColor = { cream:"#f4efe4", sepia:"#ecdfc4", slate:"#e8eaee", midnight:"#211f26", oled:"#000000", contrast:"#ffffff" }[settings.theme];
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = themeColor;
    // reflect prose justify on any open reader
    $$(".prose").forEach(p => { p.dataset.justify = settings.justify ? "on" : "off"; p.dataset.hyphen = settings.justify ? "on" : "off"; });
    save();
    syncDrawer();
  }

  function syncDrawer() {
    $$("#presetSwatches .swatch").forEach(s => s.classList.toggle("is-on", s.dataset.preset === settings.theme));
    $$("#accentRow .accent-dot").forEach(a => a.classList.toggle("is-on", a.dataset.accent === settings.accent));
    $$("#faceSeg button").forEach(b => { const on = b.dataset.face === settings.face; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    const sv = $("#sizeVal"), ss = $("#sizeSlider"); if (sv && ss) { ss.value = settings.size; sv.textContent = settings.size + "px"; }
    const mv = $("#measureVal"), ms = $("#measureSlider"); if (mv && ms) { ms.value = settings.measure; mv.textContent = settings.measure + "ch"; }
    const set = (id, v) => { const e = $(id); if (e) e.checked = v; };
    set("#optDyslexia", settings.dyslexia); set("#optMotion", settings.motion);
    set("#optJustify", settings.justify); set("#optMargins", settings.margins);
    syncReaderThemeButtons();
  }

  function buildDrawer() {
    $("#presetSwatches").innerHTML = PRESETS.map(p => `
      <button class="swatch" data-preset="${p.id}">
        <span class="swatch__chips">${p.chips.map(c => `<span style="background:${c}"></span>`).join("")}</span>
        <span class="swatch__name">${p.name}</span>
      </button>`).join("");
    $("#accentRow").innerHTML = ACCENTS.map(a => `<button class="accent-dot" data-accent="${a.id}" style="background:${a.c}" title="${a.id}" aria-label="Accent ${a.id}"></button>`).join("");

    $$("#presetSwatches .swatch").forEach(s => s.addEventListener("click", () => { settings.theme = s.dataset.preset; applySettings(); }));
    $$("#accentRow .accent-dot").forEach(a => a.addEventListener("click", () => { settings.accent = a.dataset.accent; applySettings(); }));
    $$("#faceSeg button").forEach(b => b.addEventListener("click", () => { settings.face = b.dataset.face; applySettings(); }));
    $("#sizeSlider").addEventListener("input", e => { settings.size = +e.target.value; applySettings(); });
    $("#measureSlider").addEventListener("input", e => { settings.measure = +e.target.value; applySettings(); });
    $("#optDyslexia").addEventListener("change", e => { settings.dyslexia = e.target.checked; applySettings(); });
    $("#optMotion").addEventListener("change", e => { settings.motion = e.target.checked; applySettings(); });
    $("#optJustify").addEventListener("change", e => { settings.justify = e.target.checked; applySettings(); });
    $("#optMargins").addEventListener("change", e => { settings.margins = e.target.checked; applySettings(); });
    $("#resetTheme").addEventListener("click", () => { settings = Object.assign({}, DEFAULTS, { adultOK: settings.adultOK }); applySettings(); toast("Reset to defaults."); });
  }

  // Shared modal-overlay plumbing: move focus in, trap Tab, make the app inert,
  // restore focus on close. Used by the theme drawer, the mobile sheets, and
  // (partly) the content gate.
  let lastFocus = null;
  let trapHandler = null;
  function focusables(el) {
    return Array.from(el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(n => n.offsetParent !== null);
  }
  function openOverlay(el, focusSel) {
    lastFocus = document.activeElement;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    const app = $("#app"); if (app) app.setAttribute("inert", "");
    const target = (focusSel && el.querySelector(focusSel)) || focusables(el)[0];
    if (target) target.focus();
    trapHandler = (e) => {
      if (e.key !== "Tab") return;
      const f = focusables(el); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    el.addEventListener("keydown", trapHandler);
  }
  function closeOverlay(el) {
    if (!el.classList.contains("is-open")) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    const app = $("#app"); if (app) app.removeAttribute("inert");
    if (trapHandler) { el.removeEventListener("keydown", trapHandler); trapHandler = null; }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function openTheme() { syncDrawer(); openOverlay($("#themeScrim"), "#themeClose"); }
  function closeTheme() { closeOverlay($("#themeScrim")); }

  /* ======================================================================= */
  /*  ADULT GATE / CONTENT WARNING                                            */
  /* ======================================================================= */
  function needsGate(w) { return w && (w.rating === "E") && !settings.adultOK; }
  function showGate(w, onPass) {
    $("#gateMount").innerHTML = `
      <div class="gate" role="dialog" aria-modal="true" aria-label="Content notice">
        <div class="gate__card">
          <div class="eyebrow rose" style="justify-content:center;margin-bottom:10px">Content notice</div>
          <h2>${esc(w.title)}</h2>
          <p>This work is rated <b>${RATE[w.rating]}</b>${w.warnings.length ? " and carries the following warnings:" : "."}</p>
          ${w.warnings.length ? `<div class="gate__warnings">${w.warnings.map(x => `<span class="pill">${esc(x)}</span>`).join("")}</div>` : ""}
          <p style="font-size:13.5px;color:var(--ink3)">A soft, self-attested check. Nothing is collected, no ID, no account flag. We remember your choice so this stops appearing.</p>
          <div class="gate__actions">
            <button class="btn btn--quiet" data-gate="back">Take me back</button>
            <button class="btn btn--primary" data-gate="ok">I am 18 or older, continue</button>
          </div>
        </div>
      </div>`;
    const app = $("#app"); if (app) app.setAttribute("inert", "");
    const dismiss = () => { if (app) app.removeAttribute("inert"); $("#gateMount").innerHTML = ""; };
    $('[data-gate="back"]').addEventListener("click", () => { dismiss(); navigate("home"); });
    $('[data-gate="ok"]').addEventListener("click", () => { settings.adultOK = true; save(); dismiss(); onPass(); });
    $('[data-gate="ok"]').focus();
  }

  /* ======================================================================= */
  /*  ROUTER                                                                  */
  /* ======================================================================= */
  const SCREENS = ["home","browse","reading","work","write","library","community","profile"];
  const NAV_FOR = { home:"home", browse:"home", reading:null, work:null, write:"write", library:"library", community:"community", profile:null };

  let currentScreen = null;
  function setActive(screen) {
    // Leaving the reader stops any read-aloud in progress.
    if (currentScreen === "reading" && screen !== "reading" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); speaking = false;
    }
    currentScreen = screen;
    $$(".screen").forEach(s => s.classList.toggle("is-active", s.dataset.screen === screen));
    $$(".nav__item").forEach(n => {
      const on = n.dataset.nav === NAV_FOR[screen];
      n.classList.toggle("is-active", on);
      on ? n.setAttribute("aria-current", "page") : n.removeAttribute("aria-current");
    });
    $$(".sheet__nav button").forEach(n => {
      const on = n.dataset.nav === screen;
      n.classList.toggle("is-active", on);
      on ? n.setAttribute("aria-current", "page") : n.removeAttribute("aria-current");
    });
    // Reading and writing are focused surfaces: hide both rails for a calm,
    // centered column. Browse hides the widget rail so results get room.
    $("#railLeft").hidden  = (screen === "reading" || screen === "write");
    $("#railRight").hidden = (screen === "reading" || screen === "write" || screen === "browse");
    $("#main").scrollTop = 0;
    $("#main").focus({ preventScroll:true });
  }

  /* ======================================================================= */
  /*  LIVE LOADERS  ·  fetch from Supabase, then hand off to the renderers    */
  /* ======================================================================= */
  async function seedRelations(id) {
    if (!WispDB.signedIn) return;
    try {
      const [h, s, b] = await Promise.all([
        WispDB.myRelations("hearts", [id]),
        WispDB.myRelations("subscriptions", [id]),
        WispDB.myRelations("bookmarks", [id])
      ]);
      h.has(id) ? userState.hearted.add(id) : userState.hearted.delete(id);
      s.has(id) ? userState.subscribed.add(id) : userState.subscribed.delete(id);
      b.has(id) ? userState.bookmarked.add(id) : userState.bookmarked.delete(id);
    } catch (e) { /* leave toggles at their defaults */ }
  }

  async function loadBrowse() {
    loadingScreen("#screen-browse");
    try {
      const list = await WispDB.listWorks({ sort: "recent", limit: 60 });
      LIVE.works = list;
      list.forEach(w => { LIVE.byId[w.id] = w; });
    } catch (e) { console.error("[wisp] browse load failed:", e); LIVE.works = []; }
    renderBrowse();
  }

  async function loadWork(id) {
    loadingScreen("#screen-work");
    try {
      const w = await WispDB.getWork(id);
      LIVE.byId[id] = w;
      LIVE.chapters[id] = await WispDB.getChapters(id).catch(() => []);
      LIVE.upcoming[id] = await WispDB.getUpcoming(id).catch(() => []);
      await seedRelations(id);
      renderWork(id);
    } catch (e) {
      if (W.byId[id]) { renderWork(id); return; }         // a curated demo link
      $("#screen-work").innerHTML = `<div class="page"><button class="btn--link" data-back style="margin-bottom:18px">&lsaquo; Back</button><p style="padding:40px 0;color:var(--ink3)">This work could not be found.</p></div>`;
    }
  }

  async function loadReading(id) {
    loadingScreen("#screen-reading");
    let w = null;
    try {
      w = await WispDB.getWork(id);
      LIVE.byId[id] = w;
      LIVE.chapters[id] = await WispDB.getChapters(id).catch(() => []);
      const grouped = {};
      (await WispDB.getComments(id).catch(() => [])).forEach(r => {
        const k = r.paragraph_index == null ? -1 : r.paragraph_index;
        (grouped[k] = grouped[k] || []).push(r);
      });
      LIVE.comments[id] = grouped;
      const shownCh = (LIVE.chapters[id].filter(c => c.published)[0]) || LIVE.chapters[id][0];
      if (shownCh) LIVE.reactions[shownCh.id] = await WispDB.getReactions(shownCh.id).catch(() => ({}));
    } catch (e) {
      const dw = W.byId[id];                                // fall back to a demo/sample chapter
      if (needsGate(dw)) { showGate(dw, () => renderReading(id)); return; }
      renderReading(id || "amber"); return;
    }
    if (needsGate(w)) { showGate(w, () => renderReading(id)); return; }
    renderReading(id);
  }

  /* ---- writing desk (live) ----------------------------------------------- */
  function dbToDeskRow(r) {
    return {
      id: r.id, title: r.title, status: r.status,
      cover: r.cover_image_url || r.cover_color || "#6d5566",
      rating: r.rating, chapters: +r.chapters_count || 0,
      hearts: WispDB.fmtCount(r.hearts_count), comments: WispDB.fmtCount(r.comments_count),
      reads: WispDB.fmtCount(r.reads_count),
      when: "Updated " + WispDB.relTime(r.updated_at),
      book: r.book_number || null,
      seriesId: r.series_id || null
    };
  }
  function liveMsRow(b) {
    const st = WSTATUS[b.status] || WSTATUS.draft;
    const isPublic = b.status === "ongoing" || b.status === "complete";
    const stats = isPublic
      ? `<span class="ms-stats"><span class="stat stat--heart">${icon("heart",13)}${b.hearts}</span><span class="stat">${icon("comment",13)}${b.comments}</span><span class="stat">${icon("eye",13)}${b.reads}</span></span>`
      : `<span class="ms-stats muted">${b.status === "scheduled" ? "Scheduled, not visible to readers yet" : "Draft, only you can see it"}</span>`;
    return `<div class="ms-row" data-edit="${b.id}">
      <span class="ms-cover">${cover(b.cover, b.title)}${rate(b.rating)}</span>
      <span class="ms-main">
        <span class="ms-title">${esc(b.title)}${b.book ? `<span class="ms-book">Book ${b.book}</span>` : ""}</span>
        <span class="ms-meta">
          <span class="ms-status"><span class="pip pip--${st.pip}"></span>${st.t}</span>
          <span class="muted">${b.chapters} ${b.chapters === 1 ? "chapter" : "chapters"}</span>
          <span class="muted">${esc(b.when)}</span>
        </span>
        ${stats}
      </span>
      <span class="ms-row__actions">
        <button class="ms-menu" data-live-menu="${b.id}" aria-label="More actions for ${esc(b.title)}">${icon("more",18)}</button>
        <button class="ms-go-btn" data-edit="${b.id}">Edit ${icon("chev",15)}</button>
      </span>
    </div>`;
  }
  function renderLiveDashboard(rows, series) {
    const books = rows.map(dbToDeskRow);
    LIVE.desk = books;                        // manage-series reads this back
    LIVE.series = series || [];
    const drafts = books.filter(b => b.status === "draft").length;
    const scheduled = books.filter(b => b.status === "scheduled").length;
    const hearts = rows.reduce((n, r) => n + (+r.hearts_count || 0), 0);

    const seriesSections = (series || []).map(s => {
      const inSeries = books.filter(b => b.seriesId === s.id).sort((a, b) => (a.book || 0) - (b.book || 0));
      return `
        <section class="ms-series">
          <div class="series-head">
            <div class="series-head__title">
              <span class="series-name">${esc(s.name)}</span>
              <span class="pill">Series</span>
              <span class="pill">${s.type === "fan" ? "Fanwork" : "Original"}</span>
              ${s.source ? `<span class="pill">${esc(s.source)}</span>` : ""}
            </div>
            <button class="btn--link" data-live-series="${s.id}">Manage series</button>
          </div>
          ${s.description ? `<p class="muted" style="font-size:13px;margin:2px 0 12px">${esc(s.description)}</p>` : ""}
          <div class="ms-list">
            ${inSeries.length ? inSeries.map(liveMsRow).join("") : `<p class="muted" style="font-size:13px;padding:8px 4px">No books in this series yet.</p>`}
            <button class="ms-add" data-add-series-book="${esc(s.name)}">${icon("plus",15)} Add a book to this series</button>
          </div>
        </section>`;
    }).join("");

    const standalone = books.filter(b => !b.seriesId);
    const standaloneSection = `
      <section class="ms-series">
        <div class="series-head">
          <div class="series-head__title"><span class="series-name">Standalone works</span></div>
          <span class="muted" style="font-size:12.5px">${standalone.length} ${standalone.length === 1 ? "work" : "works"}</span>
        </div>
        <div class="ms-list">
          ${standalone.length ? standalone.map(liveMsRow).join("") : `<p class="muted" style="font-size:13px;padding:8px 4px">No standalone works yet.</p>`}
          <button class="ms-add" data-edit="new">${icon("plus",15)} Start a standalone work</button>
        </div>
      </section>`;

    const empty = books.length === 0 && (series || []).length === 0;

    $("#screen-write").innerHTML = `
      <div class="page page--wide">
        <div class="write-head">
          <div>
            <h1 class="vh">Writing Station</h1>
            <div class="eyebrow rose" style="margin-bottom:8px">Writing Station</div>
            <div class="display" style="font-size:30px">Your works</div>
            <p class="section-lead" style="margin-bottom:0">All of your works in one place.</p>
          </div>
          <div class="write-actions">
            <button class="btn btn--primary" data-edit="new">${icon("plus",16)} New work</button>
            <button class="btn btn--quiet" data-new-series>New series</button>
          </div>
        </div>
        <div class="desk-totals">
          <div><b>${books.length}</b><span>works</span></div>
          <div><b>${(series || []).length}</b><span>series</span></div>
          <div><b>${drafts}</b><span>drafts</span></div>
          <div><b>${WispDB.fmtCount(hearts)}</b><span>hearts</span></div>
        </div>
        ${empty ? `<p class="muted" style="padding:20px 4px">You have not posted anything yet. Start your first work below.</p>` : ""}
        ${seriesSections}
        ${standaloneSection}
      </div>`;
  }
  function renderWriteSignedOut() {
    $("#screen-write").innerHTML = `
      <div class="page page--wide">
        <div class="write-head"><div>
          <div class="eyebrow rose" style="margin-bottom:8px">Writing Station</div>
          <div class="display" style="font-size:30px">Your works</div>
        </div></div>
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px;margin-bottom:16px">Sign in to see your works and post new ones.</p>
          <button class="btn btn--primary" data-auth="in">Sign in</button>
        </div>
      </div>`;
  }
  async function loadWriteDashboard() {
    if (!WispDB.signedIn) { renderWriteSignedOut(); return; }
    loadingScreen("#screen-write");
    try {
      const [works, series] = await Promise.all([
        WispDB.myWorks(),
        WispDB.mySeries().catch(() => [])
      ]);
      LIVE.series = series;
      renderLiveDashboard(works, series);
    } catch (e) { console.error("[wisp] my-works load failed:", e); renderLiveDashboard([], []); }
  }

  async function loadWriteEditor(id) {
    if (!WispDB.signedIn) { renderWriteSignedOut(); return; }
    loadingScreen("#screen-write");
    try {
      const [work, chapter, series] = await Promise.all([
        WispDB.getWork(id),
        WispDB.firstChapter(id).catch(() => null),
        WispDB.mySeries().catch(() => [])
      ]);
      LIVE.series = series;
      const s = work.seriesId ? series.find(x => x.id === work.seriesId) : null;
      liveEditor = { work, chapter, seriesName: s ? s.name : "" };
      renderWriteEditor(work);
    } catch (e) { liveEditor = null; toast("Could not open that work."); loadWriteDashboard(); }
  }
  function liveWorkMenu(id) {
    const b = (LIVE.desk || []).find(x => x.id === id) || LIVE.byId[id] || {};
    const title = b.title || "this work";
    menuDialog(title, [
      { icon: "edit", label: "Edit", run: () => navigate("write/" + id) },
      { icon: "book", label: "View as reader", run: () => navigate("work/" + id) },
      { icon: "share", label: "Copy link", run: () => copyLink(id) },
      { icon: "trash", label: "Delete work", danger: true, run: () => confirmDialog({
          title: "Delete this work?",
          body: `${esc(title)} and its chapters will be deleted. You can't undo this.`,
          confirmText: "Delete work", danger: true
        }, async () => {
          try { await WispDB.deleteWork(id); toast("Work deleted."); loadWriteDashboard(); }
          catch (e) { toast((e && e.message) || "Could not delete."); }
        }) }
    ]);
  }

  /* ---- manage a live series ---------------------------------------------- */
  async function reorderLiveBook(seriesId, bookId, dir) {
    const books = (LIVE.desk || []).filter(b => b.seriesId === seriesId).sort((a, b) => (a.book || 0) - (b.book || 0));
    const i = books.findIndex(b => b.id === bookId); const j = i + (dir === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= books.length) return;
    const a = books[i], b = books[j];
    try {
      // Swap their book numbers (fall back to positions if unset).
      const an = a.book || (i + 1), bn = b.book || (j + 1);
      await WispDB.updateWork(a.id, { book_number: bn });
      await WispDB.updateWork(b.id, { book_number: an });
      await loadWriteDashboard();
      const s = (LIVE.series || []).find(x => x.id === seriesId);
      if (s) liveManageSeries(seriesId);
    } catch (e) { toast((e && e.message) || "Could not reorder."); }
  }
  function liveManageSeries(id) {
    const s = (LIVE.series || []).find(x => x.id === id); if (!s) return;
    const books = (LIVE.desk || []).filter(b => b.seriesId === id).sort((a, b) => (a.book || 0) - (b.book || 0));
    const arrow = (deg) => `<span style="display:inline-flex;transform:rotate(${deg}deg)">${icon("chev", 13)}</span>`;
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h2 style="font-size:20px">Manage series</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Series name</label><input type="text" id="ms-name" value="${esc(s.name)}"></div>
      <div class="field"><label>Description</label><textarea id="ms-note" rows="2">${esc(s.description || "")}</textarea></div>
      ${books.length ? `<div class="field"><label>Order of books</label>
        <div class="reorder">
          ${books.map((b, i) => `
            <div class="reorder-row">
              <span>${esc(b.title)}</span>
              <span class="reorder-ctrls">
                <button data-lmove="up|${b.id}" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(b.title)} up">${arrow(-90)}</button>
                <button data-lmove="down|${b.id}" ${i === books.length - 1 ? "disabled" : ""} aria-label="Move ${esc(b.title)} down">${arrow(90)}</button>
              </span>
            </div>`).join("")}
        </div>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
        <button class="btn--link" data-ldelete-series style="color:#a2444f">Delete series</button>
        <div style="display:flex;gap:10px">
          <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
          <button class="btn btn--primary" data-lsave-series>Save</button>
        </div>
      </div>`, "Manage series");
    $$("#modalCard [data-lmove]").forEach(btn => btn.addEventListener("click", () => {
      const [dir, bid] = btn.dataset.lmove.split("|");
      reorderLiveBook(id, bid, dir);
    }));
    $("#modalCard [data-lsave-series]").addEventListener("click", async () => {
      const name = $("#ms-name").value.trim();
      try {
        await WispDB.updateSeries(id, { name: name || s.name, description: $("#ms-note").value.trim() });
        closeModal(); toast("Series saved."); loadWriteDashboard();
      } catch (e) { toast((e && e.message) || "Could not save the series."); }
    });
    $("#modalCard [data-ldelete-series]").addEventListener("click", () => {
      const n = books.length;
      confirmDialog({
        title: "Delete this series?",
        body: `The series grouping is removed. Its ${n} ${n === 1 ? "book stays" : "books stay"} in your works as standalone.`,
        confirmText: "Delete series", danger: true
      }, async () => {
        try { await WispDB.deleteSeries(id); closeModal(); toast("Series deleted. The books were kept."); loadWriteDashboard(); }
        catch (e) { toast((e && e.message) || "Could not delete the series."); }
      });
    });
  }
  function newLiveSeries() {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h2 style="font-size:20px">New series</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:14px">A series groups related books together. You can also create one just by typing its name in a work's Series field.</p>
      <div class="field"><label>Series name</label><input type="text" id="ns-name" placeholder="The Locked Tide"></div>
      <div class="field"><label>Description</label><textarea id="ns-note" rows="2" placeholder="What ties these books together"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" data-ns-create>Create series</button>
      </div>`, "New series");
    $("#modalCard [data-ns-create]").addEventListener("click", async () => {
      const name = $("#ns-name").value.trim(); if (!name) { toast("Give the series a name."); return; }
      try {
        await WispDB.findOrCreateSeries(name, { description: $("#ns-note").value.trim() });
        closeModal(); toast("Series created."); loadWriteDashboard();
      } catch (e) { toast((e && e.message) || "Could not create the series."); }
    });
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [seg, arg] = hash.split("/");
    let screen = SCREENS.includes(seg) ? seg : "home";
    if (seg === "read") screen = "reading";

    setActive(screen);
    closeSheet();
    closeModal();

    const live = isLive();
    if (screen === "reading") {
      if (live) { loadReading(arg || ""); return; }
      const id = arg || "amber"; const w = W.byId[id];
      if (needsGate(w)) { showGate(w, () => renderReading(id)); return; }
      renderReading(id);
    }
    else if (screen === "work") { live ? loadWork(arg || "") : renderWork(arg); }
    else if (screen === "browse") { live ? loadBrowse() : renderBrowse(); }
    else if (screen === "home") { live ? loadHome() : renderHome(); }
    else if (screen === "write") {
      if (!live) renderWrite(arg);
      else if (!arg) loadWriteDashboard();
      else if (arg === "new") { liveEditor = null; editorCover = null; renderWriteEditor(null); }
      else loadWriteEditor(arg);
    }
    else if (screen === "library") { renderLibrary(); }
    else if (screen === "community") { renderCommunity(); }
    else if (screen === "profile") { renderProfile(); }
  }

  function navigate(to) { location.hash = "#/" + to; }

  /* ======================================================================= */
  /*  GLOBAL WIRING                                                           */
  /* ======================================================================= */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-on"), 2600);
  }

  function openSheet() { openOverlay($("#navSheet")); }
  function closeSheet() { closeOverlay($("#navSheet")); closeOverlay($("#railSheet")); }
  function openRailSheet(kind) {
    const body = $("#railSheetBody");
    if (kind === "activity") body.innerHTML = `<h2 class="rail__title" style="margin-bottom:4px">Activity</h2><p class="rail__note">Recent activity from the people and works you follow.</p>${activityHTML()}`;
    else body.innerHTML = `<h2 class="rail__title" style="margin-bottom:16px">Widgets</h2>${widgetHTML()}`;
    openOverlay($("#railSheet"));
  }

  // Event delegation for the whole app.
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      if (nav.dataset.nav === "profile" && window.WispDB && WispDB.enabled && !WispDB.signedIn) { openAuth("in"); return; }
      navigate(nav.dataset.nav); return;
    }

    const wt = e.target.closest("#screen-write [data-wtype]");
    if (wt) { $$("#screen-write [data-wtype]").forEach(b => { const on = b === wt; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }); return; }
    const wr = e.target.closest("#screen-write [data-wrate]");
    if (wr) { $$("#screen-write [data-wrate]").forEach(b => { const on = b === wr; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }); return; }
    const pub = e.target.closest("[data-publish]");
    if (pub) { handlePublish(pub.dataset.publish); return; }
    const sched = e.target.closest("[data-schedule]");
    if (sched) { openScheduleDialog(); return; }

    const read = e.target.closest("[data-read]");
    if (read) { navigate("read/" + read.dataset.read); return; }

    const tagEl = e.target.closest("[data-tag]:not([data-tag-more])");
    if (tagEl) { filterState.tagsInc.add(tagEl.dataset.tag); navigate("browse"); if (location.hash.includes("browse")) renderBrowse(); return; }

    const lm = e.target.closest("[data-live-menu]");
    if (lm) { liveWorkMenu(lm.dataset.liveMenu); return; }
    const lsr = e.target.closest("[data-live-series]");
    if (lsr) { liveManageSeries(lsr.dataset.liveSeries); return; }
    const asb = e.target.closest("[data-add-series-book]");
    if (asb) { pendingSeries = asb.dataset.addSeriesBook; navigate("write/new"); return; }
    const nsr = e.target.closest("[data-new-series]");
    if (nsr) { newLiveSeries(); return; }
    const ev = e.target.closest("[data-event]");
    if (ev) {
      const i = +ev.dataset.event; const evt = W.EVENTS[i]; if (!evt) return;
      evt.joined = !evt.joined;
      toast(evt.joined ? "Joined. It'll show on your home." : "Left the event.");
      renderCommunity(); return;
    }
    const au = e.target.closest("[data-auth]");
    if (au) { openAuth(au.dataset.auth || "in"); return; }
    const guest = e.target.closest("[data-guest]");
    if (guest) { guestBrowsing = true; hideAuthGate(); navigate("home"); return; }

    const work = e.target.closest("[data-work]");
    if (work && !e.target.closest("[data-read]")) { navigate("work/" + work.dataset.work); return; }

    const back = e.target.closest("[data-back]");
    if (back) { history.length > 1 ? history.back() : navigate("home"); return; }

    const wm = e.target.closest("[data-work-menu]");
    if (wm) { workRowMenu(wm.dataset.workMenu); return; }
    const mgs = e.target.closest("[data-manage-series]");
    if (mgs) { manageSeries(mgs.dataset.manageSeries); return; }
    const wo = e.target.closest("[data-work-overflow]");
    if (wo) { workOverflow(wo.dataset.workOverflow); return; }
    const shr = e.target.closest("[data-share]");
    if (shr) { copyLink(shr.dataset.share); return; }

    const edit = e.target.closest("[data-edit]");
    if (edit) { navigate("write/" + edit.dataset.edit); return; }

    const tog = e.target.closest("[data-toggle]");
    if (tog) {
      const kind = tog.dataset.toggle;
      if (isLive() && !WispDB.signedIn) { openAuth("in"); return; }   // must be signed in to act
      const wid = (location.hash.match(/#\/(?:work|read)\/([^/]+)/) || [])[1];
      const set = userState[kind === "heart" ? "hearted" : kind === "subscribe" ? "subscribed" : "bookmarked"];
      const on = tog.getAttribute("aria-pressed") !== "true";
      if (isLive() && isUuid(wid)) {          // only persist real works; samples toggle visually only
        const table = kind === "heart" ? "hearts" : kind === "subscribe" ? "subscriptions" : "bookmarks";
        WispDB.toggle(table, wid, on).catch(err => toast((err && err.message) || "Could not save that."));
      }
      tog.setAttribute("aria-pressed", String(on));
      if (wid) { on ? set.add(wid) : set.delete(wid); }
      const label = tog.querySelector(".toggle-label");
      if (kind === "heart") {
        tog.classList.toggle("btn--primary", on);
        tog.classList.toggle("btn--ghost", !on);
        if (label) label.textContent = on ? "Hearted" : "Heart";
        toast(on ? "This work has been hearted." : "Heart removed.");
      } else if (kind === "subscribe") {
        tog.classList.toggle("is-on-quiet", on);
        if (label) label.textContent = on ? "Subscribed" : "Subscribe";
        toast(on ? "Subscribed. You'll see new chapters in your activity." : "Unsubscribed. You won't get chapter alerts.");
      } else {
        tog.classList.toggle("is-on-quiet", on);
        if (label) label.textContent = on ? "Bookmarked" : "Bookmark";
        toast(on ? "Saved to your Library." : "Removed from your Library.");
      }
      return;
    }

    if (e.target.closest("#introDismiss")) { settings.introSeen = true; save(); const bar = $("#introBar"); if (bar) bar.remove(); return; }

    if (e.target.closest("[data-lucky]")) {
      luckyIdx++;
      const t = W.WIDGETS.luckyPool[luckyIdx % W.WIDGETS.luckyPool.length];
      $$(".lucky-title").forEach(el => el.textContent = t);
      return;
    }

    const rs = e.target.closest("[data-railsheet]");
    if (rs) { openRailSheet(rs.dataset.railsheet); return; }

    const tst = e.target.closest("[data-toast]");
    if (tst) { toast(tst.dataset.toast); return; }

    const ht = e.target.closest("[data-hometab]");
    if (ht) { homeTab = ht.dataset.hometab; renderHome(); return; }

    const view = e.target.closest("[data-view]");
    if (view) { settings.view = view.dataset.view; save(); route(); return; }

    const lt = e.target.closest("[data-libtab]");
    if (lt) { libTab = lt.dataset.libtab; renderLibrary(); return; }
  });


  // Browse controls (delegated separately because they use inputs/selects).
  document.addEventListener("change", (e) => {
    const r = e.target.closest("[data-rating]");
    if (r) { r.checked ? filterState.ratings.add(r.dataset.rating) : filterState.ratings.delete(r.dataset.rating); renderBrowse(); return; }
    const inc = e.target.closest("[data-inc]");
    if (inc) { inc.checked ? filterState.tagsInc.add(inc.dataset.inc) : filterState.tagsInc.delete(inc.dataset.inc); if (inc.checked) filterState.tagsExc.delete(inc.dataset.inc); renderBrowse(); return; }
    const exc = e.target.closest("[data-exc]");
    if (exc) { exc.checked ? filterState.tagsExc.add(exc.dataset.exc) : filterState.tagsExc.delete(exc.dataset.exc); if (exc.checked) filterState.tagsInc.delete(exc.dataset.exc); renderBrowse(); return; }
    const sel = e.target.closest("#sortSel");
    if (sel) { filterState.sort = sel.value; renderBrowse(); return; }
  });

  document.addEventListener("click", (e) => {
    const type = e.target.closest("[data-type]");
    if (type) { filterState.type = type.dataset.type; renderBrowse(); return; }
    const clr = e.target.closest("[data-clear]");
    if (clr) {
      const [k, v] = clr.dataset.clear.split(":");
      if (k === "type") filterState.type = "all";
      else if (k === "rating") filterState.ratings.delete(v);
      else if (k === "inc") filterState.tagsInc.delete(v);
      else if (k === "exc") filterState.tagsExc.delete(v);
      renderBrowse(); return;
    }
    if (e.target.closest("#saveSearch")) { toast("Search saved. It won't send notifications."); return; }
  });

  /* ======================================================================= */
  /*  ACCOUNTS  ·  sign in / sign up (real when Supabase is connected)        */
  /* ======================================================================= */
  // A full-screen welcome gate shown before the app when the site is connected
  // to a backend and nobody is signed in (the hard sign-in wall).
  function renderAuthGate(loading, mode) {
    const el = $("#authGate"); if (!el) return;
    if (loading) {
      // While the connection resolves, show only a quiet branded splash (no
      // form), so an already-signed-in reader never sees the form flash past.
      el.innerHTML = `<div class="authgate__panel authgate__panel--loading"><div class="authgate__brand">WISP</div></div>`;
    } else {
      const isUp = mode === "up";
      el.innerHTML = `
        <div class="authgate__panel">
          <div class="authgate__brand">WISP</div>
          <p class="authgate__tag">Read stories together instead of alone.</p>
          <h2 class="authgate__h">${isUp ? "Create your account" : "Sign in"}</h2>
          ${authFormHTML(isUp)}
          <button class="btn--link authgate__guest" data-guest>Look around first</button>
        </div>`;
      const panel = el.querySelector(".authgate__panel");
      wireAuthForm(panel, isUp,
        () => renderAuthGate(false, isUp ? "in" : "up"),
        (res) => { if (isUp && res.needsConfirm) renderAuthGate(false, "in"); /* sign-in hides the gate via the auth emit */ });
      const focusEl = panel.querySelector('[data-af="name"], [data-af="email"]');
      if (focusEl) focusEl.focus();
    }
    el.classList.add("is-open");
    const app = $("#app"); if (app) app.setAttribute("inert", "");
  }
  function hideAuthGate() {
    const el = $("#authGate"); if (el) { el.classList.remove("is-open"); el.innerHTML = ""; }
    const app = $("#app"); if (app) app.removeAttribute("inert");
  }
  function updateAuthGate() {
    if (!window.WispDB || !WispDB.enabled) { hideAuthGate(); return; }   // demo: no gate
    if (WispDB.signedIn || guestBrowsing) hideAuthGate();
    else renderAuthGate(false, "in");
  }

  function syncAuthHeader() {
    const link = $("#signOutBtn"); const avatar = $(".avatar-btn");
    if (!window.WispDB || !WispDB.enabled) return;             // demo mode: leave the header as-is
    updateAuthGate();
    renderActivity(); renderWidgets();                         // rails reflect the connected state
    if (WispDB.signedIn) {
      const name = (WispDB.profile && WispDB.profile.display_name) || "You";
      if (link) link.textContent = "Sign out";
      if (avatar) { avatar.textContent = name[0].toUpperCase(); avatar.title = name; }
    } else {
      if (link) link.textContent = "Sign in";
      if (avatar) { avatar.textContent = "?"; avatar.title = "Sign in"; }
    }
  }

  // Shared sign-in / sign-up form, used both in the modal (in-app) and inline in
  // the sign-in wall. Fields are addressed by data-attribute, scoped to a root
  // element, so the two copies never collide.
  function authFormHTML(isUp) {
    return `
      <form data-authform novalidate>
        ${isUp ? '<div class="field"><label>Display name</label><input type="text" data-af="name" autocomplete="name" required></div>' : ""}
        <div class="field"><label>Email</label><input type="email" data-af="email" autocomplete="email" required></div>
        <div class="field"><label>Password</label><input type="password" data-af="pw" autocomplete="${isUp ? "new-password" : "current-password"}" minlength="6" required></div>
        <div data-af="error" style="display:none;color:#a2444f;font-size:13px;margin:4px 0 10px"></div>
        <button class="btn btn--primary btn--full" type="submit" data-af="submit" style="margin-top:6px">${isUp ? "Create account" : "Sign in"}</button>
      </form>
      <p class="muted" style="font-size:13px;text-align:center;margin-top:14px">
        ${isUp ? "Already have an account?" : "New to Wisp?"}
        <button class="btn--link" data-af="switch" type="button">${isUp ? "Sign in" : "Create one"}</button>
      </p>`;
  }
  function wireAuthForm(root, isUp, onSwitch, onSuccess) {
    if (!root) return;
    const q = (sel) => root.querySelector(sel);
    const err = q('[data-af="error"]');
    const sw = q('[data-af="switch"]'); if (sw) sw.addEventListener("click", onSwitch);
    const form = q('[data-authform]'); if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (q('[data-af="email"]').value || "").trim();
      const pw = q('[data-af="pw"]').value || "";
      const nameEl = q('[data-af="name"]'); const name = nameEl ? nameEl.value.trim() : "";
      if (!email || pw.length < 6) {
        err.textContent = "Enter an email and a password of at least 6 characters.";
        err.style.display = "block"; return;
      }
      const btn = q('[data-af="submit"]'); btn.disabled = true; btn.textContent = isUp ? "Creating..." : "Signing in...";
      err.style.display = "none";
      try {
        if (isUp) {
          const r = await WispDB.signUp(email, pw, name);
          if (!r.session) { onSuccess({ needsConfirm: true }); toast("Account created. Check your email to confirm, then sign in."); return; }
        } else {
          await WispDB.signIn(email, pw);
        }
        onSuccess({}); toast(isUp ? "Welcome to Wisp." : "Signed in.");
      } catch (ex) {
        err.textContent = (ex && ex.message) || "Something went wrong."; err.style.display = "block";
        btn.disabled = false; btn.textContent = isUp ? "Create account" : "Sign in";
      }
    });
  }
  function openAuth(mode) {
    const isUp = mode === "up";
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:22px">${isUp ? "Create your account" : "Sign in"}</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:16px">${isUp ? "Join Wisp to post works, comment, and keep a library." : "Welcome back."}</p>
      ${authFormHTML(isUp)}`, isUp ? "Create account" : "Sign in");
    wireAuthForm($("#modalCard"), isUp,
      () => openAuth(isUp ? "in" : "up"),
      () => closeModal());
  }

  async function handlePublish(kind, scheduleTime) {
    if (!window.WispDB || !WispDB.enabled) {
      toast(kind === "schedule" ? "Scheduling needs the backend. Connect Supabase to schedule releases."
        : kind === "draft" ? "Saved as a draft. Connect Supabase to save it for real."
        : "Chapter published. Connect Supabase to save it for real.");
      return;
    }
    if (!WispDB.signedIn) { openAuth("in"); return; }
    const val = (id) => { const e = $(id); return e ? e.value.trim() : ""; };
    const title = val("#we-title") || "Untitled";
    const bodyEl = $("#we-body"); const body = bodyEl ? bodyEl.innerText.trim() : "";
    const typeBtn = $("#screen-write [data-wtype].is-on"); const type = typeBtn ? typeBtn.dataset.wtype : "original";
    const rateBtn = $("#screen-write [data-wrate].is-on"); const rating = rateBtn ? rateBtn.dataset.wrate : "G";
    const tags = val("#we-tags").split(",").map(s => s.trim()).filter(Boolean);
    const warnings = $$("#screen-write [data-warn]:checked").map(el => el.dataset.warn);
    const source = val("#we-source");
    const seriesName = val("#we-series");
    const scheduled_for = kind === "schedule" ? scheduleTime : null;
    // "Save draft" on an already-published work saves changes without pulling it
    // back to draft; only new works and existing drafts actually become drafts.
    const wasPublished = liveEditor && liveEditor.work &&
      (liveEditor.work._dbStatus === "ongoing" || liveEditor.work._dbStatus === "complete");
    const status = kind === "schedule" ? "scheduled"
      : kind === "draft" ? (wasPublished ? liveEditor.work._dbStatus : "draft")
      : "ongoing";
    try {
      // Resolve the series field to an id (find-or-create), or standalone.
      let series_id = null;
      if (seriesName) {
        const s = await WispDB.findOrCreateSeries(seriesName, { type, source });
        series_id = s ? s.id : null;
      }

      if (liveEditor && liveEditor.work) {
        // Editing an existing work: update its fields, its first chapter, and tags.
        const id = liveEditor.work.id;
        const fields = { title, type, source, rating, status, series_id, warnings };
        if (editorCover) fields.cover_image_url = editorCover;
        else if (coverCleared) fields.cover_image_url = null;   // revert to the letter cover
        await WispDB.updateWork(id, fields);
        await WispDB.saveChapter(id, {
          id: liveEditor.chapter ? liveEditor.chapter.id : null,
          number: liveEditor.chapter ? liveEditor.chapter.number : 1,
          title: liveEditor.chapter ? liveEditor.chapter.title : "",
          body, published: status === "ongoing" || status === "complete", scheduled_for
        });
        await WispDB.setTags(id, tags);
        toast(kind === "schedule" ? "Scheduled. It releases at the time you set."
          : kind === "draft" ? (wasPublished ? "Changes saved." : "Draft saved.") : "Changes published.");
      } else {
        // New work.
        let book_number;
        if (series_id) book_number = (await WispDB.countInSeries(series_id).catch(() => 0)) + 1;
        await WispDB.createWork({ title, type, source, rating, tags, warnings, chapterBody: body, status,
          cover_image_url: editorCover, series_id, book_number, scheduled_for });
        toast(kind === "schedule" ? "Scheduled. It releases at the time you set."
          : kind === "draft" ? "Draft saved to your account." : "Published. It is now in your works.");
      }
      liveEditor = null; editorCover = null;
      navigate("write");
    } catch (e) { toast((e && e.message) || "Could not save."); }
  }

  // Ask for a release time, then schedule the chapter for it.
  function openScheduleDialog() {
    if (isLive() && !WispDB.signedIn) { openAuth("in"); return; }
    // Default suggestion: tomorrow, same time (local), formatted for datetime-local.
    const dt = new Date(Date.now() + 86400000);
    const pad = (n) => String(n).padStart(2, "0");
    const localVal = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Schedule this chapter</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:14px">Readers see the chapter as locked with a live countdown until this time; then it releases on its own.</p>
      <div class="field"><label>Release date and time</label><input type="datetime-local" id="sched-when" value="${localVal}"></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" data-sched-go>Schedule release</button>
      </div>`, "Schedule this chapter");
    $("#modalCard [data-sched-go]").addEventListener("click", () => {
      const raw = $("#sched-when").value;
      if (!raw) { toast("Pick a date and time."); return; }
      const when = new Date(raw);
      if (isNaN(when.getTime()) || when.getTime() <= Date.now()) { toast("Pick a time in the future."); return; }
      closeModal();
      handlePublish("schedule", when.toISOString());
    });
  }

  // Pull-to-refresh: pull down at the top of the page (touch) or overscroll up
  // on a trackpad to reload, so readers never have to close the tab. Disabled in
  // the reader (its own scrolling comes first) and while the sign-in wall is up.
  function wirePullToRefresh() {
    const main = $("#main"), ptr = $("#ptr");
    if (!main || !ptr) return;
    const ring = ptr.querySelector(".ptr__ring");
    const TRIGGER = 72, WHEEL_TRIGGER = 150, MAX = 110;
    let startY = 0, pulling = false, dist = 0, refreshing = false, wheelIdle = null;

    function gateUp() { return !!(window.WispDB && WispDB.enabled && !WispDB.signedIn && !guestBrowsing); }
    function canPull() {
      const modal = $("#modal");
      return !refreshing && main.scrollTop <= 0 && currentScreen !== "reading"
        && !gateUp() && !(modal && modal.classList.contains("is-open"));
    }
    function setPull(px) {
      dist = Math.max(0, px);                         // raw pull amount (drives the trigger)
      const vis = Math.min(dist, MAX);                // clamped for the visual travel
      ptr.classList.toggle("is-visible", vis > 6);
      ptr.style.transform = `translate(-50%, ${-60 + Math.min(vis * 0.62, 74)}px)`;
      if (ring) ring.style.transform = `rotate(${Math.min(dist / TRIGGER, 1) * 300}deg)`;
    }
    function reset() { ptr.classList.remove("is-visible"); ptr.style.transform = ""; dist = 0; pulling = false; }
    function refresh() {
      refreshing = true;
      ptr.classList.add("is-visible", "is-refreshing");
      ptr.style.transform = "translate(-50%, 16px)";
      setTimeout(() => location.reload(), 420);
    }

    main.addEventListener("touchstart", (e) => {
      pulling = canPull() && e.touches.length === 1;
      if (pulling) startY = e.touches[0].clientY;
    }, { passive: true });
    main.addEventListener("touchmove", (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && main.scrollTop <= 0) { setPull(dy * 0.5); if (dist > 6) e.preventDefault(); }
      else { reset(); }
    }, { passive: false });
    main.addEventListener("touchend", () => { if (pulling && dist >= TRIGGER) refresh(); else reset(); });

    main.addEventListener("wheel", (e) => {
      if (!canPull()) return;
      if (e.deltaY < 0) {
        setPull(dist + (-e.deltaY) * 0.5);
        clearTimeout(wheelIdle);
        if (dist >= WHEEL_TRIGGER) { refresh(); return; }
        wheelIdle = setTimeout(reset, 200);
      }
    }, { passive: true });
  }

  function boot() {
    buildDrawer();
    applySettings();
    renderActivity();
    renderWidgets();

    // Header and chrome.
    $("#themeBtn").addEventListener("click", openTheme);
    $("#themeClose").addEventListener("click", closeTheme);
    $("#themeScrim").addEventListener("click", (e) => { if (e.target.id === "themeScrim") closeTheme(); });
    $("#signOutBtn").addEventListener("click", () => {
      if (!window.WispDB || !WispDB.enabled) { toast("Sign out isn't wired up in demo mode. Connect Supabase to enable accounts."); return; }
      if (WispDB.signedIn) WispDB.signOut().then(() => { guestBrowsing = false; toast("Signed out."); updateAuthGate(); });
      else openAuth("in");
    });
    $("#notifBtn").addEventListener("click", () => {
      if (window.matchMedia("(max-width:1040px)").matches) openRailSheet("activity");
      else toast("Notifications show up in your activity feed. Most are off by default.");
    });
    $("#railSheet").addEventListener("click", (e) => { if (e.target.id === "railSheet" || e.target.closest("[data-railclose]")) closeOverlay($("#railSheet")); });
    $("#addWidget").addEventListener("click", () => toast("Add widgets from the tray, like Lucky, highlighter, and read-aloud."));
    $("#customizeWidgets").addEventListener("click", () => toast("Rearrange, add, or remove widgets."));
    $("#menuBtn").addEventListener("click", openSheet);
    $("#navSheet").addEventListener("click", (e) => { if (e.target.id === "navSheet") closeSheet(); });

    // Search: type and press Enter to browse.
    const si = $("#searchInput");
    si.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { filterState.q = si.value.trim(); navigate("browse"); if (location.hash.includes("browse")) renderBrowse(); }
    });

    // Esc closes overlays.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeModal(); closeTheme(); closeSheet(); }
    });
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

    window.addEventListener("hashchange", route);
    wirePullToRefresh();
    if (!location.hash) location.replace("#/home");
    route();

    // Connect the backend if config.js has credentials; otherwise stay in demo.
    if (window.WispDB) {
      // Cover the app with a quiet branded splash the moment a backend is
      // configured, before the async connection resolves, so it never flashes
      // underneath and an already-signed-in reader never sees the sign-in form.
      if (WispDB.configured) renderAuthGate(true);
      WispDB.onChange(syncAuthHeader);
      WispDB.init().then(() => {
        syncAuthHeader();
        // If the connection failed (demo fallback), don't leave the splash up.
        if (!WispDB.enabled) hideAuthGate();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
