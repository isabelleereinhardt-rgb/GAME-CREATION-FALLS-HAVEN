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

  // Reader actions that persist for the session (a stand-in for the server), so
  // a work you hearted or subscribed to still reads that way when you come back.
  const userState = { hearted: new Set(), subscribed: new Set(), bookmarked: new Set(), visited: new Set(),
                      mutedTags: new Set(), blockedUsers: new Set() };
  function markVisited(id) { if (id) userState.visited.add(id); }

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

  function cover(key, className = "", extra = "") {
    const c = W.COVERS[key] || { bg:"#6d5566", deco:"" };
    return `<span class="cv ${className}" style="background:${c.bg}">${c.deco}${extra}</span>`;
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
      <span class="card__cover">${cover(w.cover)}${rate(w.rating)}${flag}${readMark}</span>
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
      <span class="list-card__cover">${cover(w.cover)}${rate(w.rating)}${userState.visited.has(w.id) ? `<span class="read-badge">${icon("check",11)} Read</span>` : ""}</span>
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
  function renderHome() {
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
              <span class="mini-cover" style="width:44px;height:60px">${cover(w.cover)}</span>
              <span>
                <span class="mini-work__title" style="display:block">${esc(w.title)}</span>
                <span class="muted" style="font-size:12.5px;display:block;margin:5px 0 0;line-height:1.5">${esc(s.note)}</span>
              </span>
            </button>`; }).join("")}
        </div>
        <p class="muted" style="font-size:12.5px;margin-top:14px">Nominated by readers and chosen by the editors, often smaller works. <a href="#/community">See who picks &rsaquo;</a></p>
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
          <div class="muted" style="font-size:11.5px;line-height:1.5">No ads. Your data is never sold.</div>
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
          <span class="resume__cover">${cover("amber")}</span>
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
    W.WORKS.forEach(w => w.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }
  function filteredWorks() {
    let list = W.WORKS.slice();
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
          <p class="section-lead">Search both at once. Most filters apply to everything; a few, like fandom or genre, apply to one type.</p>
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
              : `<div style="text-align:center;padding:70px 0;color:var(--ink3)"><p style="font-size:16px">Nothing matches yet.</p><p style="font-size:14px">Loosen a filter, or clear the exclusions.</p></div>`}
          </div>
        </div>
      </div>`;
  }

  /* ======================================================================= */
  /*  SCREEN: WORK DETAIL                                                     */
  /* ======================================================================= */
  function renderWork(id) {
    const w = W.byId[id] || W.byId.amber;
    markVisited(w.id);
    const chapters = Math.min(w.chapters, 8);
    const rows = Array.from({ length: chapters }, (_, i) => {
      const n = i + 1;
      return `<button class="chapter-row" data-read="${w.id}">
        <span class="chapter-row__n">${n}</span>
        <span class="chapter-row__title">Chapter ${n}${n === 1 ? ": The First Cold Morning" : ""}</span>
        <span class="chapter-row__when">${n <= 3 ? "posted" : "posted"} ${["3mo","2mo","6w","1mo","3w","2w","1w","9h"][i] || ""}</span>
      </button>`;
    }).join("");

    $("#screen-work").innerHTML = `
      <div class="page">
        <button class="btn--link" data-back style="margin-bottom:18px">&lsaquo; Back</button>
        <div class="work-hero">
          <span class="work-hero__cover">${cover(w.cover)}</span>
          <div class="work-hero__main">
            <span class="tag-row"><span class="pill">${w.type === "fan" ? "Fanwork" : "Original"}</span><span class="pill">${esc(w.source)}</span>${w.format === "comic" ? '<span class="pill">Comic</span>' : ""}</span>
            <h1 class="work-hero__title">${esc(w.title)}</h1>
            <div class="soft" style="font-size:16px">by <a href="#/profile">${esc(w.author)}</a></div>
            <div class="work-hero__meta">
              ${rate(w.rating)} <span>${RATE[w.rating]}</span>
              ${w.warnings.length ? `<span style="color:var(--rose-ink)">${icon("flag",14)} ${w.warnings.map(esc).join(", ")}</span>` : `<span class="muted">${icon("check",14)} No warnings</span>`}
              <span>${icon("book",14)} ${w.complete ? w.chapters + " chapters, complete" : w.chapters + " chapters, ongoing"}</span>
              <span>${w.words} words</span>
              <span>${icon("clock",14)} ${w.read}</span>
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
          <p class="soft" style="font-size:14px;margin:0;line-height:1.7">Comments are on, and anyone can read it, including logged-out visitors. You can mute a tag, block a user, or turn off the author's skin from the button above or your own settings. Your settings always win over the author's.</p>
        </div>
      </div>`;
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
      <span class="ms-cover">${cover(b.cover)}${rate(b.rating)}</span>
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
            <p class="section-lead" style="margin-bottom:0">All of your works in one place. You can have several books and several series going at once.</p>
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
        <p class="muted" style="font-size:12px;margin:10px 2px 26px">Stats stay simple: hearts, comments, reads, and bookmarks. No rankings.</p>

        ${seriesHTML}
        ${standaloneHTML}
      </div>`;
  }

  function renderWriteEditor(work) {
    const isNew = !work;
    const type = work ? (work.series ? work.series.type : work.type) : "fan";
    const source = work ? (work.series ? work.series.source : (work.source || "")) : "";
    const rating = work ? work.rating : "T";
    const title = work ? work.title : "";
    const chapters = work ? work.chapters : 0;
    const seriesName = work && work.series ? work.series.name : "";
    const st = work ? WSTATUS[work.status] : null;

    const partsHTML = chapters > 0
      ? Array.from({ length: chapters }, (_, i) => `
          <button class="part-row ${i === chapters - 1 ? "is-current" : ""}" data-toast="Open this chapter in the editor.">
            <span class="part-n">${i + 1}</span><span class="part-title">Chapter ${i + 1}</span>
          </button>`).join("")
      : `<p class="muted" style="font-size:13px;margin:0">No chapters yet. Your first one starts in the editor.</p>`;

    const typeFields = type === "fan"
      ? `<div class="field"><label>Fandom</label><input type="text" value="${esc(source)}"></div>
         <div class="field"><label>Relationship</label><input type="text" placeholder="Character A / Character B"></div>`
      : `<div class="field"><label>Setting or genre</label><input type="text" value="${esc(source)}"></div>
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
            <input class="title-input" placeholder="Title your work" value="${esc(title)}">
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
            <div class="editor" contenteditable="true" spellcheck="true" aria-label="Chapter body">
              <h2>Chapter ${chapters + 1}${isNew ? ": Untitled" : ""}</h2>
              <p>${isNew ? "Start typing, or paste from another editor." : "Pick up where you left off. Your writing saves automatically."}</p>
              <p>Format with the toolbar above, or use Markdown shortcuts.</p>
            </div>
            <div class="write-actions" style="margin-top:16px">
              <button class="btn btn--primary" data-toast="Chapter published. Subscribers will see it in their activity.">Publish chapter</button>
              <button class="btn btn--quiet" data-toast="Saved as a draft.">Save draft</button>
              <button class="btn btn--quiet" data-toast="Scheduled to post on the date you set.">Schedule &hellip;</button>
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
              <div class="field"><label>Series</label><input type="text" value="${esc(seriesName)}" placeholder="Standalone, or start a series"></div>
              <div class="field"><label>Work type</label>
                <div class="seg" role="group" aria-label="Work type">
                  <button class="${type === "fan" ? "is-on" : ""}" aria-pressed="${type === "fan"}">Fanwork</button>
                  <button class="${type === "original" ? "is-on" : ""}" aria-pressed="${type === "original"}">Original</button>
                </div>
              </div>
              ${typeFields}
              <div class="field"><label>Additional tags</label><input type="text" placeholder="Slow burn, found family, ..."></div>
              <p class="muted" style="font-size:11.5px;margin-top:2px">Up to 50 tags. Common tags have short descriptions; the rest are freeform.</p>
            </div>

            <div class="panel">
              <h4>Rating</h4>
              <div class="rate-choice">${["G","T","M","E"].map(r => `<button class="${r === rating ? "is-on" : ""}" aria-pressed="${r === rating}">${r}</button>`).join("")}</div>
              <div class="field" style="margin-top:12px"><label>Warnings</label>
                <label class="check"><input type="checkbox"> Graphic violence</label>
                <label class="check"><input type="checkbox"> Major character death</label>
                <label class="check"><input type="checkbox" checked> Choose not to warn</label>
              </div>
            </div>

            <div class="panel">
              <h4>Cover</h4>
              <div class="cover-drop" data-toast="Upload a cover image. A cover is required to publish.">${icon("plus",18)}<div style="margin-top:6px">${isNew ? "Upload a cover" : "Replace cover"}</div><div style="font-size:11px;margin-top:2px">Required to publish</div></div>
            </div>

            <div class="panel">
              <h4>Serialization</h4>
              <div class="field"><label>Update schedule, shown to readers</label><input type="text" value="${work && work.schedule ? esc(work.schedule) : ""}" placeholder="e.g. Sundays"></div>
              <p class="muted" style="font-size:12px;margin:0;line-height:1.55">Schedule chapters to post automatically, or backdate them. Readers can see your schedule.</p>
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
                <div class="stack-cvrs" style="margin-bottom:12px">${l.covers.map(cv => `<span>${cover(cv)}</span>`).join("")}</div>
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
        <p class="section-lead">Your bookmarks, lists, history, and notes. Bookmarks and history are private. Lists stay private until you share them.</p>

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
        <p class="section-lead">Hubs for fandoms and tags, plus events you can join. Everything here is public. There's no live chat or direct messages.</p>

        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Events and challenges</span><span class="muted" style="font-size:13px">Only events you have joined show up on Home</span></div>
          ${W.EVENTS.map(e => `
            <div class="event">
              <div class="event__date"><b>${e.d}</b><span class="muted" style="font-size:12px">${e.m}</span></div>
              <div style="flex:1">
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font:600 18px var(--font-display);color:var(--ink)">${esc(e.title)}</span><span class="pill">${esc(e.kind)}</span></div>
                <p class="soft" style="font-size:14px;margin:6px 0 0;line-height:1.6">${esc(e.note)}</p>
              </div>
              <button class="btn ${e.joined ? "btn--quiet" : "btn--ghost"} btn--sm" data-toast="${e.joined ? "Left the event." : "Joined. It'll show on your home."}">${e.joined ? "Joined" : "Join"}</button>
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
  function renderProfile() {
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
          <p class="soft" style="font-size:14px;margin:0;line-height:1.7">Style your profile with the same theme system as the rest of the site: accent, fonts, background, pinned works, and widgets. There's no raw HTML, and reset is one tap away. Your theme only changes your own view.</p>
        </div>
      </div>`;
    $("#themeBtn2") && $("#themeBtn2").addEventListener("click", openTheme);
  }

  /* ---- rails ------------------------------------------------------------- */
  function activityHTML() {
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
          <span class="mini-cover">${cover("room9")}</span>
          <span><span class="mini-work__title">${esc(wd.staffPick.title)}</span><span class="mini-work__by">by ${esc(wd.staffPick.author)}</span></span>
        </button>
        <p class="muted" style="font-size:12.5px;line-height:1.5;margin-top:12px">Chosen by the editors, often smaller works. <a href="#/community">See who picks &rsaquo;</a></p>
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
        <p class="muted" style="font-size:12.5px;margin:9px 0 0">No streaks or rankings.</p>
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

  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [seg, arg] = hash.split("/");
    let screen = SCREENS.includes(seg) ? seg : "home";
    if (seg === "read") screen = "reading";

    if (screen === "reading") {
      const id = arg || "amber"; const w = W.byId[id];
      if (needsGate(w)) { setActive("reading"); showGate(w, () => renderReading(id)); return; }
      renderReading(id);
    }
    else if (screen === "work") { renderWork(arg); }
    else if (screen === "browse") { renderBrowse(); }
    else if (screen === "home") { renderHome(); }
    else if (screen === "write") { renderWrite(arg); }
    else if (screen === "library") { renderLibrary(); }
    else if (screen === "community") { renderCommunity(); }
    else if (screen === "profile") { renderProfile(); }
    setActive(screen);
    closeSheet();
    closeModal();
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
    if (nav) { navigate(nav.dataset.nav); return; }

    const read = e.target.closest("[data-read]");
    if (read) { navigate("read/" + read.dataset.read); return; }

    const tagEl = e.target.closest("[data-tag]:not([data-tag-more])");
    if (tagEl) { filterState.tagsInc.add(tagEl.dataset.tag); navigate("browse"); if (location.hash.includes("browse")) renderBrowse(); return; }

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
      const wid = (location.hash.match(/#\/(?:work|read)\/([^/]+)/) || [])[1];
      const set = userState[kind === "heart" ? "hearted" : kind === "subscribe" ? "subscribed" : "bookmarked"];
      const on = tog.getAttribute("aria-pressed") !== "true";
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
        toast(on ? "Subscribed. New chapters will land in your Activity, quietly." : "Unsubscribed. No more chapter alerts for this work.");
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

  function boot() {
    buildDrawer();
    applySettings();
    renderActivity();
    renderWidgets();

    // Header and chrome.
    $("#themeBtn").addEventListener("click", openTheme);
    $("#themeClose").addEventListener("click", closeTheme);
    $("#themeScrim").addEventListener("click", (e) => { if (e.target.id === "themeScrim") closeTheme(); });
    $("#signOutBtn").addEventListener("click", () => toast("Sign out isn't wired up in this demo. You can read without an account."));
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
    if (!location.hash) location.replace("#/home");
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
