/* ============================================================================
   Wisp · data layer
   Talks to Supabase when config.js has a URL + anon key; otherwise the app runs
   on the demo dataset (window.WISP). Every data call is async and defensive, so
   a backend hiccup degrades to the demo instead of breaking the page.
   ==========================================================================*/
window.WispDB = (function () {
  const cfg = window.WISP_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  let client = null;
  let user = null;       // Supabase auth user, or null
  let profile = null;    // row from public.profiles, or null
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(); } catch (e) {} });

  const COVER_PALETTE = ["#9e5560","#6a7385","#2c2620","#a9743f","#566b4e","#6d5566",
                         "#4c5a63","#748a97","#7a4a44","#59614f","#3f4a6b","#b06a44","#575170","#8a6d3f"];
  function randomCover() { return COVER_PALETTE[Math.floor(Date.now() % COVER_PALETTE.length)]; }

  function fmtCount(n) {
    n = +n || 0;
    if (n >= 1000) { const k = n / 1000; return (k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")) + "k"; }
    return String(n);
  }
  function relTime(ts) {
    if (!ts) return "just now";
    const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + "m";
    if (s < 86400) return Math.round(s / 3600) + "h";
    if (s < 604800) return Math.round(s / 86400) + "d";
    if (s < 2629800) return Math.round(s / 604800) + "w";
    return Math.round(s / 2629800) + "mo";
  }

  // Map a database row (from works_with_author) to the shape the UI renders.
  function toUi(row, tags) {
    return {
      id: row.id,
      type: row.type,
      source: row.source || "",
      cover: row.cover_image_url || row.cover_color || "#6d5566",
      rating: row.rating,
      title: row.title,
      author: row.author_name || "Unknown",
      authorHandle: row.author_handle || "",
      summary: row.summary || "",
      warnings: row.warnings || [],
      tags: tags || [],
      hearts: fmtCount(row.hearts_count),
      comments: fmtCount(row.comments_count),
      reads: fmtCount(row.reads_count),
      complete: row.status === "complete",
      status: row.status === "complete" ? "sage" : "amber",
      statusText: row.status === "complete" ? "Complete" : "Updated " + relTime(row.updated_at),
      chapters: +row.chapters_count || 0,
      words: "",
      read: "",
      format: row.format || "prose",
      _dbStatus: row.status,
      _db: true
    };
  }

  async function init() {
    if (!configured) return { enabled: false };
    try {
      const mod = await import("https://esm.sh/@supabase/supabase-js@2");
      client = mod.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      client.auth.onAuthStateChange((_event, session) => { refreshUser(session); });
      const { data } = await client.auth.getSession();
      await refreshUser(data ? data.session : null);
      return { enabled: true };
    } catch (e) {
      console.error("[wisp] Supabase init failed, falling back to demo mode:", e);
      client = null;
      return { enabled: false, error: e };
    }
  }

  async function refreshUser(session) {
    user = session ? session.user : null;
    if (user && client) {
      try {
        const { data } = await client.from("profiles").select("*").eq("id", user.id).single();
        profile = data || null;
      } catch (e) { profile = null; }
    } else {
      profile = null;
    }
    emit();
  }

  /* ---- auth ------------------------------------------------------------- */
  async function signUp(email, password, displayName) {
    const handle = (displayName || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || ("reader" + Math.floor(Date.now() % 10000));
    const { data, error } = await client.auth.signUp({
      email, password, options: { data: { display_name: displayName || handle, handle } }
    });
    if (error) throw error;
    if (data.session) await refreshUser(data.session);
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await refreshUser(data.session);
    return data;
  }
  async function signOut() {
    if (client) await client.auth.signOut();
    user = null; profile = null; emit();
  }

  /* ---- reads ------------------------------------------------------------ */
  async function tagsFor(ids) {
    if (!ids.length) return {};
    const { data, error } = await client.from("work_tags").select("work_id, tags(name)").in("work_id", ids);
    if (error || !data) return {};
    const m = {};
    for (const r of data) { if (r.tags) (m[r.work_id] = m[r.work_id] || []).push(r.tags.name); }
    return m;
  }

  async function listWorks(opts = {}) {
    let q = client.from("works_with_author").select("*");
    q = opts.mine ? q.eq("author_id", user && user.id) : q.in("status", ["ongoing", "complete"]);
    if (opts.type && opts.type !== "all") q = q.eq("type", opts.type);
    const sort = opts.sort || "hearts";
    if (sort === "reads") q = q.order("reads_count", { ascending: false });
    else if (sort === "recent") q = q.order("updated_at", { ascending: false });
    else q = q.order("hearts_count", { ascending: false });
    q = q.limit(opts.limit || 60);
    const { data, error } = await q;
    if (error) throw error;
    const tagMap = await tagsFor(data.map(w => w.id));
    return data.map(w => toUi(w, tagMap[w.id] || []));
  }

  async function getWork(id) {
    const { data, error } = await client.from("works_with_author").select("*").eq("id", id).single();
    if (error) throw error;
    const tagMap = await tagsFor([id]);
    return toUi(data, tagMap[id] || []);
  }

  async function getChapters(workId) {
    const { data, error } = await client.from("chapters").select("*").eq("work_id", workId).order("number");
    if (error) throw error;
    return data || [];
  }

  async function myWorks() {
    if (!user) return { series: [], standalone: [] };
    const { data, error } = await client.from("works_with_author").select("*").eq("author_id", user.id).order("updated_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /* ---- writes ----------------------------------------------------------- */
  async function createWork(f) {
    if (!user) throw new Error("Sign in to publish.");
    const { data, error } = await client.from("works").insert({
      author_id: user.id, title: f.title || "Untitled", type: f.type || "original",
      source: f.source || "", summary: f.summary || "", rating: f.rating || "G",
      warnings: f.warnings || [], status: f.status || "draft",
      cover_color: f.cover_color || randomCover()
    }).select().single();
    if (error) throw error;
    if (f.chapterBody != null) {
      const published = (f.status || "draft") !== "draft";
      await client.from("chapters").insert({
        work_id: data.id, number: 1, title: f.chapterTitle || "", body: f.chapterBody,
        published, published_at: published ? new Date().toISOString() : null
      });
    }
    if (f.tags && f.tags.length) await addTags(data.id, f.tags);
    return data;
  }

  async function deleteWork(workId) {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("works").delete().eq("id", workId).eq("author_id", user.id);
    if (error) throw error;
  }

  async function addTags(workId, names) {
    for (const raw of names) {
      const name = String(raw).trim(); if (!name) continue;
      let { data: tag } = await client.from("tags").select("id").eq("name", name).maybeSingle();
      if (!tag) { const r = await client.from("tags").insert({ name }).select("id").single(); tag = r.data; }
      if (tag) await client.from("work_tags").insert({ work_id: workId, tag_id: tag.id });
    }
  }

  // Generic per-user relation toggle for hearts / subscriptions / bookmarks.
  async function toggle(table, workId, on) {
    if (!user) throw new Error("Sign in first.");
    if (on) {
      const { error } = await client.from(table).insert({ user_id: user.id, work_id: workId });
      if (error && error.code !== "23505") throw error;       // ignore "already exists"
    } else {
      const { error } = await client.from(table).delete().eq("user_id", user.id).eq("work_id", workId);
      if (error) throw error;
    }
  }
  async function myRelations(table, workIds) {
    if (!user || !workIds.length) return new Set();
    const { data } = await client.from(table).select("work_id").eq("user_id", user.id).in("work_id", workIds);
    return new Set((data || []).map(r => r.work_id));
  }

  async function getComments(workId) {
    const { data, error } = await client.from("comments")
      .select("id, body, paragraph_index, created_at, user_id, profiles(display_name)")
      .eq("work_id", workId).order("created_at");
    if (error) throw error;
    return data || [];
  }
  async function postComment(workId, body, chapterId, paragraphIndex) {
    if (!user) throw new Error("Sign in to comment.");
    const { data, error } = await client.from("comments").insert({
      work_id: workId, chapter_id: chapterId || null,
      paragraph_index: paragraphIndex == null ? null : paragraphIndex,
      user_id: user.id, body
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function uploadCover(file) {
    if (!user) throw new Error("Sign in to upload.");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = user.id + "/" + Date.now() + "." + ext;
    const { error } = await client.storage.from("covers").upload(path, file, { upsert: true });
    if (error) throw error;
    return client.storage.from("covers").getPublicUrl(path).data.publicUrl;
  }

  return {
    get configured() { return configured; },
    get enabled() { return !!client; },     // true only after the client actually connects
    get client() { return client; },
    get user() { return user; },
    get profile() { return profile; },
    get signedIn() { return !!user; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    init, signUp, signIn, signOut,
    listWorks, getWork, getChapters, myWorks,
    createWork, deleteWork, toggle, myRelations, getComments, postComment, uploadCover,
    fmtCount, relTime
  };
})();
