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
  const recoveryListeners = new Set();
  let pendingRecovery = false;

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
      seriesId: row.series_id || null,
      bookNumber: row.book_number || null,
      commentsEnabled: row.comments_enabled !== false,
      loggedInOnly: !!row.logged_in_only,
      hideStats: !!row.hide_stats,
      _dbStatus: row.status,
      _db: true
    };
  }

  async function init() {
    if (!configured) return { enabled: false };
    try {
      // Prefer the client bundled with the site (assets/js/vendor/supabase.js);
      // fall back to a CDN import only if that script did not load.
      let createClient = (window.supabase && window.supabase.createClient) || null;
      if (!createClient) {
        const mod = await import("https://esm.sh/@supabase/supabase-js@2");
        createClient = mod.createClient;
      }
      client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      client.auth.onAuthStateChange((event, session) => {
        // A password-reset link brings the reader back with a temporary
        // recovery session. Remember it so the app can show a "set a new
        // password" screen, even if it subscribes a moment later.
        if (event === "PASSWORD_RECOVERY") {
          pendingRecovery = true;
          recoveryListeners.forEach(fn => { try { fn(); } catch (e) {} });
        }
        refreshUser(session);
      });
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
    profile = null;
    emit();                       // report the signed-in/out state right away
    if (user && client) {
      try {
        const { data } = await client.from("profiles").select("*").eq("id", user.id).single();
        profile = data || null;
      } catch (e) { profile = null; }
      emit();                     // fill in the profile when it arrives, without blocking auth state
    }
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
  // Email a reset link. It brings the reader back to the site with a recovery
  // session; PASSWORD_RECOVERY then drives the "set a new password" screen.
  async function resetPassword(email) {
    if (!client) throw new Error("Connect the backend first.");
    const redirectTo = location.origin + location.pathname;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return true;
  }
  async function updatePassword(newPassword) {
    if (!client) throw new Error("Connect the backend first.");
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    pendingRecovery = false;
    return true;
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
    q = opts.mine ? q.eq("author_id", user && user.id) : q.in("status", ["ongoing", "complete", "scheduled"]);
    if (opts.authors) q = q.in("author_id", opts.authors.length ? opts.authors : ["00000000-0000-0000-0000-000000000000"]);
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
    const row = {
      author_id: user.id, title: f.title || "Untitled", type: f.type || "original",
      source: f.source || "", summary: f.summary || "", rating: f.rating || "G",
      warnings: f.warnings || [], status: f.status || "draft",
      cover_color: f.cover_color || randomCover()
    };
    if (f.cover_image_url) row.cover_image_url = f.cover_image_url;
    if (f.series_id !== undefined) row.series_id = f.series_id;
    if (f.book_number !== undefined) row.book_number = f.book_number;
    if (f.schedule !== undefined) row.schedule = f.schedule;
    ["comments_enabled", "logged_in_only", "hide_stats"].forEach(k => { if (f[k] !== undefined) row[k] = f[k]; });
    const { data, error } = await client.from("works").insert(row).select().single();
    if (error) throw error;
    if (f.chapterBody != null) {
      const scheduled = !!f.scheduled_for;
      const published = !scheduled && (f.status || "draft") !== "draft";
      await client.from("chapters").insert({
        work_id: data.id, number: 1, title: f.chapterTitle || "", body: f.chapterBody,
        published, published_at: published ? new Date().toISOString() : null,
        scheduled_for: scheduled ? f.scheduled_for : null
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

  // Update the editable fields of a work the signed-in user owns.
  async function updateWork(id, fields) {
    if (!user) throw new Error("Sign in first.");
    const patch = {};
    ["title","type","source","summary","rating","status","cover_color","cover_image_url",
     "warnings","series_id","book_number","schedule","format",
     "comments_enabled","logged_in_only","hide_stats"].forEach(k => {
      if (fields[k] !== undefined) patch[k] = fields[k];
    });
    patch.updated_at = new Date().toISOString();
    const { data, error } = await client.from("works").update(patch).eq("id", id).eq("author_id", user.id).select().single();
    if (error) throw error;
    return data;
  }

  async function firstChapter(workId) {
    const { data, error } = await client.from("chapters").select("*").eq("work_id", workId).order("number").limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }

  // Insert a new chapter or update an existing one (pass f.id to update).
  async function saveChapter(workId, f) {
    if (!user) throw new Error("Sign in first.");
    const scheduled = !!f.scheduled_for;
    const published = !scheduled && !!f.published;
    if (f.id) {
      const patch = { title: f.title || "", body: f.body || "", updated_at: new Date().toISOString(),
                      published, scheduled_for: scheduled ? f.scheduled_for : null };
      if (published) patch.published_at = new Date().toISOString();
      const { error } = await client.from("chapters").update(patch).eq("id", f.id);
      if (error) throw error;
      return f.id;
    }
    const { data, error } = await client.from("chapters").insert({
      work_id: workId, number: f.number || 1, title: f.title || "", body: f.body || "",
      published, published_at: published ? new Date().toISOString() : null,
      scheduled_for: scheduled ? f.scheduled_for : null
    }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  // Upcoming (still-locked) scheduled chapters for a work: number + release time
  // only, never the body or title.
  async function getUpcoming(workId) {
    const { data, error } = await client.from("upcoming_chapters").select("number, scheduled_for").eq("work_id", workId).order("number");
    if (error) return [];
    return data || [];
  }

  // Replace a work's tags with exactly the given set.
  async function setTags(workId, names) {
    await client.from("work_tags").delete().eq("work_id", workId);
    if (names && names.length) await addTags(workId, names);
  }

  /* ---- series ----------------------------------------------------------- */
  async function mySeries() {
    if (!user) return [];
    const { data, error } = await client.from("series").select("*").eq("author_id", user.id).order("created_at");
    if (error) throw error;
    return data || [];
  }
  async function findOrCreateSeries(name, opts = {}) {
    if (!user) throw new Error("Sign in first.");
    const clean = String(name || "").trim();
    if (!clean) return null;
    const { data: found } = await client.from("series").select("*").eq("author_id", user.id).ilike("name", clean).maybeSingle();
    if (found) return found;
    const { data, error } = await client.from("series").insert({
      author_id: user.id, name: clean, description: opts.description || "",
      type: opts.type || "original", source: opts.source || ""
    }).select().single();
    if (error) throw error;
    return data;
  }
  async function updateSeries(id, fields) {
    if (!user) throw new Error("Sign in first.");
    const patch = {};
    ["name","description","type","source"].forEach(k => { if (fields[k] !== undefined) patch[k] = fields[k]; });
    const { error } = await client.from("series").update(patch).eq("id", id).eq("author_id", user.id);
    if (error) throw error;
  }
  // Deleting a series detaches its works automatically (works.series_id is
  // "on delete set null"), so the books stay and become standalone.
  async function deleteSeries(id) {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("series").delete().eq("id", id).eq("author_id", user.id);
    if (error) throw error;
  }
  async function countInSeries(seriesId) {
    const { count } = await client.from("works").select("id", { count: "exact", head: true }).eq("series_id", seriesId);
    return count || 0;
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

  /* ---- profiles --------------------------------------------------------- */
  const looksUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || "");
  async function updateProfile(fields) {
    if (!user) throw new Error("Sign in first.");
    const patch = {};
    ["display_name", "bio", "handle", "accent"].forEach(k => { if (fields[k] !== undefined) patch[k] = fields[k]; });
    const { data, error } = await client.from("profiles").update(patch).eq("id", user.id).select().single();
    if (error) throw error;
    profile = data || profile;
    emit();
    return data;
  }
  async function getProfile(idOrHandle) {
    if (!idOrHandle) return null;
    let q = client.from("profiles").select("*");
    q = looksUuid(idOrHandle) ? q.eq("id", idOrHandle) : q.eq("handle", idOrHandle);
    const { data } = await q.maybeSingle();
    return data || null;
  }
  async function worksByAuthor(authorId) {
    if (!authorId) return [];
    const { data, error } = await client.from("works_with_author").select("*").eq("author_id", authorId)
      .in("status", ["ongoing", "complete", "scheduled"]).order("updated_at", { ascending: false });
    if (error || !data) return [];
    const tagMap = await tagsFor(data.map(w => w.id));
    return data.map(w => toUi(w, tagMap[w.id] || []));
  }

  /* ---- community events ------------------------------------------------- */
  async function listEvents() {
    const { data, error } = await client.from("events").select("*").order("sort");
    if (error) return [];
    return data || [];
  }
  async function myEventIds() {
    if (!user) return new Set();
    const { data } = await client.from("event_participants").select("event_id").eq("user_id", user.id);
    return new Set((data || []).map(r => r.event_id));
  }
  async function toggleEventJoin(eventId, on) {
    if (!user) throw new Error("Sign in to join.");
    if (on) {
      const { error } = await client.from("event_participants").insert({ user_id: user.id, event_id: eventId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client.from("event_participants").delete().eq("user_id", user.id).eq("event_id", eventId);
      if (error) throw error;
    }
  }

  /* ---- hubs ------------------------------------------------------------- */
  async function listHubs() {
    const { data, error } = await client.from("hubs").select("*").order("sort");
    if (error) return [];
    return data || [];
  }
  async function myHubIds() {
    if (!user) return new Set();
    const { data } = await client.from("hub_members").select("hub_id").eq("user_id", user.id);
    return new Set((data || []).map(r => r.hub_id));
  }
  // Real follower count per hub, from the public membership rows.
  async function hubMemberCounts() {
    const { data } = await client.from("hub_members").select("hub_id");
    const counts = {};
    (data || []).forEach(r => { counts[r.hub_id] = (counts[r.hub_id] || 0) + 1; });
    return counts;
  }
  async function toggleHubMembership(hubId, on) {
    if (!user) throw new Error("Sign in to follow a hub.");
    if (on) {
      const { error } = await client.from("hub_members").insert({ user_id: user.id, hub_id: hubId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client.from("hub_members").delete().eq("user_id", user.id).eq("hub_id", hubId);
      if (error) throw error;
    }
  }

  /* ---- following -------------------------------------------------------- */
  async function toggleFollow(authorId, on) {
    if (!user) throw new Error("Sign in to follow.");
    if (!authorId || authorId === user.id) return;
    if (on) {
      const { error } = await client.from("follows").insert({ follower_id: user.id, following_id: authorId });
      if (error && error.code !== "23505") throw error;
    } else {
      const { error } = await client.from("follows").delete().eq("follower_id", user.id).eq("following_id", authorId);
      if (error) throw error;
    }
  }
  async function amFollowing(authorId) {
    if (!user || !authorId) return false;
    const { data } = await client.from("follows").select("following_id").eq("follower_id", user.id).eq("following_id", authorId).maybeSingle();
    return !!data;
  }
  async function followCounts(authorId) {
    if (!authorId) return { followers: 0, following: 0 };
    const f1 = await client.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", authorId);
    const f2 = await client.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", authorId);
    return { followers: f1.count || 0, following: f2.count || 0 };
  }
  async function myFollowingIds() {
    if (!user) return [];
    const { data } = await client.from("follows").select("following_id").eq("follower_id", user.id);
    return (data || []).map(r => r.following_id);
  }

  /* ---- notifications ---------------------------------------------------- */
  // A real activity feed, computed from existing tables: new chapters in works
  // you subscribe to, comments on works you wrote, and people who followed you.
  // Each source is independent, so one failing still shows the others.
  async function getNotifications() {
    if (!user || !client) return [];
    const uid = user.id;
    const items = [];
    const nameOf = (p) => (p && (p.display_name || p.handle)) || "A reader";
    async function profilesByIds(ids) {
      const uniq = [...new Set((ids || []).filter(Boolean))];
      if (!uniq.length) return {};
      const { data } = await client.from("profiles").select("id, handle, display_name").in("id", uniq);
      const m = {}; (data || []).forEach(p => { m[p.id] = p; });
      return m;
    }

    // 1. New chapters in works I subscribe to.
    try {
      const { data: subs } = await client.from("subscriptions").select("work_id").eq("user_id", uid);
      const subIds = (subs || []).map(s => s.work_id);
      if (subIds.length) {
        const { data: chs } = await client.from("chapters")
          .select("work_id, number, title, published, published_at, scheduled_for, created_at")
          .in("work_id", subIds)
          .order("created_at", { ascending: false }).limit(50);
        const now = Date.now();
        const visible = (chs || []).filter(c => c.published || (c.scheduled_for && new Date(c.scheduled_for).getTime() <= now));
        const works = await getWorksByIds(subIds).catch(() => []);
        const wById = {}; works.forEach(w => { wById[w.id] = w; });
        visible.forEach(c => items.push({
          type: "chapter",
          at: c.published_at || c.scheduled_for || c.created_at,
          workId: c.work_id,
          workTitle: wById[c.work_id] ? wById[c.work_id].title : "a work you follow",
          number: c.number,
          chapterTitle: c.title || ""
        }));
      }
    } catch (e) { /* one source failing must not sink the rest */ }

    // 2. Comments on works I authored, from other readers.
    try {
      const { data: mine } = await client.from("works").select("id, title").eq("author_id", uid);
      const myIds = (mine || []).map(w => w.id);
      const titleById = {}; (mine || []).forEach(w => { titleById[w.id] = w.title; });
      if (myIds.length) {
        const { data: cs } = await client.from("comments")
          .select("id, work_id, body, user_id, created_at")
          .in("work_id", myIds).neq("user_id", uid)
          .order("created_at", { ascending: false }).limit(50);
        const profs = await profilesByIds((cs || []).map(c => c.user_id));
        (cs || []).forEach(c => items.push({
          type: "comment",
          at: c.created_at,
          workId: c.work_id,
          workTitle: titleById[c.work_id] || "your work",
          who: nameOf(profs[c.user_id]),
          excerpt: (c.body || "").replace(/\s+/g, " ").slice(0, 90)
        }));
      }
    } catch (e) { /* ignore */ }

    // 3. New followers.
    try {
      const { data: fs } = await client.from("follows")
        .select("follower_id, created_at").eq("following_id", uid)
        .order("created_at", { ascending: false }).limit(50);
      const profs = await profilesByIds((fs || []).map(f => f.follower_id));
      (fs || []).forEach(f => items.push({
        type: "follow",
        at: f.created_at,
        who: nameOf(profs[f.follower_id]),
        whoId: f.follower_id,
        handle: profs[f.follower_id] ? profs[f.follower_id].handle : null
      }));
    } catch (e) { /* ignore */ }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, 50);
  }

  /* ---- library: bookmarks, history, lists, highlights, progress --------- */
  async function getWorksByIds(ids) {
    ids = [...new Set((ids || []).filter(Boolean))];
    if (!ids.length) return [];
    const { data, error } = await client.from("works_with_author").select("*").in("id", ids);
    if (error || !data) return [];
    const tagMap = await tagsFor(ids);
    const byId = {};
    data.forEach(w => { byId[w.id] = toUi(w, tagMap[w.id] || []); });
    return ids.map(id => byId[id]).filter(Boolean);            // preserve caller order
  }
  async function myBookmarks() {
    if (!user) return [];
    const { data } = await client.from("bookmarks").select("work_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    return getWorksByIds((data || []).map(r => r.work_id));
  }
  async function myHistory() {
    if (!user) return [];
    const { data } = await client.from("reading_progress").select("work_id, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(40);
    return getWorksByIds((data || []).map(r => r.work_id));
  }
  async function clearHistory() {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("reading_progress").delete().eq("user_id", user.id);
    if (error) throw error;
  }
  async function myLists() {
    if (!user) return [];
    const { data } = await client.from("reading_lists").select("*").eq("user_id", user.id).order("created_at");
    const lists = data || [];
    for (const l of lists) {
      const { data: items } = await client.from("reading_list_items").select("work_id").eq("list_id", l.id).limit(4);
      l._workIds = (items || []).map(r => r.work_id);
      const { count } = await client.from("reading_list_items").select("work_id", { count: "exact", head: true }).eq("list_id", l.id);
      l._count = count || 0;
    }
    return lists;
  }
  async function createList(name, isPublic) {
    if (!user) throw new Error("Sign in first.");
    const { data, error } = await client.from("reading_lists").insert({ user_id: user.id, name: name || "Untitled list", is_public: !!isPublic }).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteList(id) {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("reading_lists").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
  }
  async function listContents(listId) {
    const { data } = await client.from("reading_list_items").select("work_id").eq("list_id", listId);
    return getWorksByIds((data || []).map(r => r.work_id));
  }
  async function addToList(listId, workId) {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("reading_list_items").insert({ list_id: listId, work_id: workId });
    if (error && error.code !== "23505") throw error;
  }
  async function removeFromList(listId, workId) {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("reading_list_items").delete().eq("list_id", listId).eq("work_id", workId);
    if (error) throw error;
  }
  async function myHighlights() {
    if (!user) return [];
    const { data } = await client.from("highlights").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    const rows = data || [];
    const works = await getWorksByIds(rows.map(r => r.work_id));
    const byId = {}; works.forEach(w => { byId[w.id] = w; });
    return rows.map(r => Object.assign({}, r, { work: byId[r.work_id] || null }));
  }
  async function saveHighlight(f) {
    if (!user) throw new Error("Sign in to save highlights.");
    const { data, error } = await client.from("highlights").insert({
      user_id: user.id, work_id: f.work_id, chapter_id: f.chapter_id || null,
      paragraph_index: f.paragraph_index == null ? null : f.paragraph_index, text: f.text, note: f.note || ""
    }).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteHighlight(id) {
    if (!user) throw new Error("Sign in first.");
    const { error } = await client.from("highlights").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
  }
  async function submitReport(f) {
    if (!user) throw new Error("Sign in to report.");
    const { error } = await client.from("reports").insert({
      reporter_id: user.id,
      target_type: f.target_type || "work",
      target_id: f.target_id,
      reason: f.reason,
      detail: f.detail || ""
    });
    if (error) throw error;
    return true;
  }
  async function saveProgress(workId, chapterNumber, percent) {
    if (!user) return;
    try {
      await client.from("reading_progress").upsert({
        user_id: user.id, work_id: workId, chapter_number: chapterNumber || 1, percent: percent || 0, updated_at: new Date().toISOString()
      }, { onConflict: "user_id,work_id" });
    } catch (e) { /* progress is best-effort */ }
  }
  async function latestProgress() {
    if (!user) return null;
    const { data } = await client.from("reading_progress").select("work_id, chapter_number, percent, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1);
    return (data && data[0]) || null;
  }
  // Honest reading stats from your own progress rows (one per work opened):
  // how many works you have open, how many you touched this week, and how many
  // you are partway through. No word counts are stored, so none are invented.
  async function readingStats() {
    if (!user) return null;
    const { data } = await client.from("reading_progress").select("work_id, chapter_number, percent, updated_at").eq("user_id", user.id);
    const rows = data || [];
    const weekAgo = Date.now() - 7 * 86400000;
    const thisWeek = rows.filter(r => new Date(r.updated_at).getTime() >= weekAgo).length;
    const inProgress = rows.filter(r => (r.percent || 0) < 95).length;
    return { total: rows.length, thisWeek, inProgress };
  }

  // Per-line emoji reactions, grouped by paragraph index for a chapter.
  async function getReactions(chapterId) {
    const { data, error } = await client.from("reactions").select("paragraph_index, emoji, user_id").eq("chapter_id", chapterId);
    if (error || !data) return {};
    const map = {};
    for (const r of data) {
      const m = (map[r.paragraph_index] = map[r.paragraph_index] || { counts: {}, mine: new Set() });
      m.counts[r.emoji] = (m.counts[r.emoji] || 0) + 1;
      if (user && r.user_id === user.id) m.mine.add(r.emoji);
    }
    return map;
  }
  async function toggleReaction(chapterId, paragraphIndex, emoji, on) {
    if (!user) throw new Error("Sign in to react.");
    if (on) {
      const { error } = await client.from("reactions").insert({ chapter_id: chapterId, paragraph_index: paragraphIndex, user_id: user.id, emoji });
      if (error && error.code !== "23505") throw error;    // ignore "already reacted"
    } else {
      const { error } = await client.from("reactions").delete()
        .eq("chapter_id", chapterId).eq("paragraph_index", paragraphIndex).eq("user_id", user.id).eq("emoji", emoji);
      if (error) throw error;
    }
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
    get pendingRecovery() { return pendingRecovery; },
    clearRecovery() { pendingRecovery = false; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    onRecovery(fn) { recoveryListeners.add(fn); return () => recoveryListeners.delete(fn); },
    init, signUp, signIn, signOut, resetPassword, updatePassword,
    listWorks, getWork, getChapters, myWorks,
    createWork, updateWork, deleteWork, firstChapter, saveChapter, getUpcoming, setTags,
    mySeries, findOrCreateSeries, updateSeries, deleteSeries, countInSeries,
    toggle, myRelations, getComments, postComment, getReactions, toggleReaction, uploadCover,
    toggleFollow, amFollowing, followCounts, myFollowingIds, getNotifications,
    updateProfile, getProfile, worksByAuthor,
    listEvents, myEventIds, toggleEventJoin,
    listHubs, myHubIds, hubMemberCounts, toggleHubMembership,
    getWorksByIds, myBookmarks, myHistory, clearHistory,
    myLists, createList, deleteList, listContents, addToList, removeFromList,
    myHighlights, saveHighlight, deleteHighlight, submitReport, saveProgress, latestProgress, readingStats,
    toCard: toUi, fmtCount, relTime
  };
})();
