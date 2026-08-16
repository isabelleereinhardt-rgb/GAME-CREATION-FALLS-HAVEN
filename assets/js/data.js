/* ============================================================================
   WISP  ·  demo dataset
   Stand-in content for a static build. In the real product these rows come
   from the reader's own behavior and the works people post. Covers are painted
   here; the live product requires an uploaded cover to publish.
   ==========================================================================*/
window.WISP = (function () {

  /* Cover paints: a background plus a little decorative geometry. Hairlines
     and washes only, never ornaments. */
  const COVERS = {
    tide:    { bg: "#9e5560", deco: '<i style="width:150px;height:150px;border-radius:50%;background:rgba(247,230,207,.14);right:-46px;bottom:-52px"></i><i style="width:1px;height:70px;background:rgba(247,230,207,.4);left:26px;top:26px"></i>' },
    letters: { bg: "#6a7385", deco: '<i style="left:0;right:0;top:44px;height:1px;background:rgba(247,240,225,.35)"></i><i style="left:0;right:0;top:74px;height:1px;background:rgba(247,240,225,.28)"></i><i style="left:0;right:0;top:104px;height:1px;background:rgba(247,240,225,.2)"></i>' },
    amber:   { bg: "#2c2620", deco: '<i style="width:90px;height:90px;border-radius:50%;background:rgba(214,163,140,.28);left:50%;top:50%;transform:translate(-50%,-50%)"></i><i style="width:130px;height:130px;border-radius:50%;border:1px solid rgba(214,163,140,.22);left:50%;top:50%;transform:translate(-50%,-50%)"></i>' },
    law:     { bg: "#a9743f", deco: '<i style="width:2px;height:100%;background:rgba(44,38,32,.16);left:34px"></i><i style="width:2px;height:100%;background:rgba(44,38,32,.12);left:44px"></i><i style="width:40px;height:40px;border-radius:50%;background:rgba(247,240,225,.2);right:24px;top:28px"></i>' },
    marrow:  { bg: "#6f7d63", deco: '<i style="width:60px;height:60px;border-radius:50%;background:rgba(247,240,225,.16);left:24px;bottom:-18px"></i><i style="width:34px;height:34px;border-radius:50%;background:rgba(247,240,225,.14);left:70px;bottom:14px"></i>' },
    stage:   { bg: "#6d5566", deco: '<i style="inset:20px;border:1px solid rgba(247,240,225,.22);border-radius:4px"></i><i style="left:50%;top:20px;bottom:20px;width:1px;background:rgba(247,240,225,.18)"></i>' },
    room9:   { bg: "#4c5a63", deco: '<i style="width:34px;height:34px;border:1px solid rgba(247,240,225,.3);left:50%;top:50%;transform:translate(-50%,-50%);border-radius:4px"></i>' },
    frost:   { bg: "#748a97", deco: '<i style="width:120px;height:1px;background:rgba(255,255,255,.3);left:20px;top:60px;transform:rotate(-8deg)"></i><i style="width:90px;height:1px;background:rgba(255,255,255,.22);left:40px;top:96px;transform:rotate(-8deg)"></i>' },
    ash:     { bg: "#7a4a44", deco: '<i style="width:120px;height:120px;border-radius:50%;background:rgba(0,0,0,.18);right:-30px;top:-30px"></i>' },
    ledger:  { bg: "#59614f", deco: '<i style="left:24px;right:24px;top:40px;height:1px;background:rgba(247,240,225,.28)"></i><i style="left:24px;right:24px;top:70px;height:1px;background:rgba(247,240,225,.2)"></i><i style="left:24px;right:24px;top:100px;height:1px;background:rgba(247,240,225,.14)"></i>' },
    orbit:   { bg: "#3f4a6b", deco: '<i style="width:110px;height:110px;border-radius:50%;border:1px solid rgba(214,200,247,.3);left:50%;top:50%;transform:translate(-50%,-50%)"></i><i style="width:12px;height:12px;border-radius:50%;background:rgba(214,200,247,.6);left:50%;top:16%;transform:translateX(-50%)"></i>' },
    hearth:  { bg: "#b06a44", deco: '<i style="width:70px;height:70px;border-radius:50%;background:rgba(247,240,225,.2);left:50%;bottom:-30px;transform:translateX(-50%)"></i>' },
    veil:    { bg: "#575170", deco: '<i style="left:30%;top:0;bottom:0;width:1px;background:rgba(247,240,225,.24)"></i><i style="left:60%;top:0;bottom:0;width:1px;background:rgba(247,240,225,.16)"></i>' },
    quill:   { bg: "#8a6d3f", deco: '<i style="width:1px;height:110px;background:rgba(44,38,32,.3);left:40px;top:22px;transform:rotate(18deg)"></i>' }
  };

  /* Works. type: fan | original. rating: G/T/M/E. format: prose | comic. */
  const WORKS = [
    { id:"salt", type:"fan", source:"The Locked Tide", cover:"tide", rating:"M",
      title:"The Salt and the Season", author:"Ren Adeyemi",
      summary:"A smuggler and the harbor witch who keeps arresting her, over one long winter.",
      warnings:[], tags:["Slow Burn","Enemies to Lovers","Harbor Town","Found Family","Pining","Magic","Sea"],
      hearts:"4.2k", comments:"380", reads:"61k", updated:"2d", status:"amber", statusText:"Updated 2d",
      complete:false, chapters:14, words:"88,400", read:"5h" },

    { id:"letters", type:"original", source:"Literary", cover:"letters", rating:"T",
      title:"Letters to the Lighthouse Keeper", author:"Junia Vale",
      summary:"Two strangers write to the same lighthouse for a year, never meaning to fall.",
      warnings:[], tags:["Epistolary","Slow Burn","Quiet","Grief","Correspondence"],
      hearts:"2.9k", comments:"210", reads:"33k", updated:"complete", status:"sage", statusText:"Complete",
      complete:true, chapters:22, words:"64,100", read:"4h" },

    { id:"amber", type:"fan", source:"Holmesian", cover:"amber", rating:"E",
      title:"A Study in Amber", author:"cormorant",
      summary:"A locked room, a missing violinist, and one very distracted detective.",
      warnings:["Graphic Violence"], tags:["Case Fic","Mutual Pining","Slow Burn","Period Piece","Hurt/Comfort","First Person","Unreliable Narrator","Fog","Violin"],
      hearts:"7.1k", comments:"1.2k", reads:"210k", updated:"9h", status:"amber", statusText:"Updated 9h",
      complete:false, chapters:28, words:"142,900", read:"9h" },

    { id:"law", type:"original", source:"Progression", cover:"law", rating:"T",
      title:"Nine Tenths of the Law", author:"tidewrack",
      summary:"She stole a god's inventory. Now the whole pantheon wants a refund.",
      warnings:[], tags:["LitRPG","Heist","Banter","Antihero","Gods","System"],
      hearts:"5.5k", comments:"640", reads:"210k", updated:"1d", status:"amber", statusText:"Updated 1d",
      complete:false, chapters:41, words:"301,200", read:"18h" },

    { id:"marrow", type:"original", source:"Cozy", cover:"marrow", rating:"G",
      title:"Marrow & Bloom", author:"Ivo Sterm",
      summary:"A tired botanist inherits a greenhouse that only grows what people grieve.",
      warnings:[], tags:["Found Family","No Romance","Grief","Cozy","Magical Realism","Plants"],
      hearts:"1.8k", comments:"96", reads:"22k", updated:"complete", status:"sage", statusText:"Complete",
      complete:true, chapters:12, words:"41,700", read:"3h" },

    { id:"understudy", type:"fan", source:"Stagelight", cover:"stage", rating:"T", format:"comic",
      title:"The Understudy", author:"pomegranate.wav",
      summary:"The lead breaks a leg; her understudy breaks something worse: character.",
      warnings:[], tags:["Fake Dating","Rivals","Theatre","Slow Burn","Comic","Enemies to Lovers"],
      hearts:"3.3k", comments:"420", reads:"88k", updated:"4d", status:"amber", statusText:"Updated 4d",
      complete:false, chapters:19, words:"webtoon", read:"2h" },

    { id:"room9", type:"fan", source:"Holmesian", cover:"room9", rating:"M",
      title:"The Tenant of Room 9", author:"cormorant",
      summary:"A boarding house, a locked door on the top floor, and a lodger who never leaves.",
      warnings:["Some Horror"], tags:["Gothic","Mystery","Slow Burn","Period Piece","Ghost Story"],
      hearts:"2.1k", comments:"180", reads:"29k", updated:"6h", status:"amber", statusText:"Updated 6h",
      complete:false, chapters:7, words:"33,800", read:"2.5h" },

    { id:"frost", type:"original", source:"Fantasy", cover:"frost", rating:"T",
      title:"The Frost Between Us", author:"anneliese k.",
      summary:"A winter that will not end, and the two rival mages sworn to break it together.",
      warnings:[], tags:["Enemies to Lovers","Slow Burn","Magic","Rivals","Winter","Reluctant Allies"],
      hearts:"6.4k", comments:"720", reads:"151k", updated:"3d", status:"amber", statusText:"Updated 3d",
      complete:false, chapters:33, words:"198,000", read:"12h" },

    { id:"ash", type:"fan", source:"The Locked Tide", cover:"ash", rating:"E",
      title:"Ashfall", author:"Ren Adeyemi",
      summary:"After the harbor burns, the witch and the smuggler are the only two who remember why.",
      warnings:["Graphic Violence","Major Character Death"], tags:["Angst","Hurt/Comfort","Post-Canon","Grief","Slow Burn"],
      hearts:"3.8k", comments:"510", reads:"72k", updated:"1w", status:"sage", statusText:"Complete",
      complete:true, chapters:9, words:"54,200", read:"3.5h" },

    { id:"ledger", type:"original", source:"Literary", cover:"ledger", rating:"G",
      title:"The Ledger of Small Kindnesses", author:"Ivo Sterm",
      summary:"A village accountant starts recording every kind act, and the book starts writing back.",
      warnings:[], tags:["Cozy","Magical Realism","No Romance","Small Town","Whimsy"],
      hearts:"1.2k", comments:"88", reads:"17k", updated:"5d", status:"amber", statusText:"Updated 5d",
      complete:false, chapters:6, words:"22,900", read:"1.5h" },

    { id:"orbit", type:"original", source:"Sci-Fi", cover:"orbit", rating:"M",
      title:"Low Orbit, Long Goodbye", author:"nb.corvid",
      summary:"Two salvage pilots, one dying station, and the eight hours before the last shuttle.",
      warnings:[], tags:["Science Fiction","Slow Burn","Second Chances","Space","Bittersweet"],
      hearts:"4.9k", comments:"330", reads:"96k", updated:"2d", status:"amber", statusText:"Updated 2d",
      complete:false, chapters:16, words:"71,500", read:"4.5h" },

    { id:"hearth", type:"fan", source:"Stagelight", cover:"hearth", rating:"G",
      title:"House Lights", author:"pomegranate.wav",
      summary:"The whole cast is snowed into the theatre on closing night, and nobody wants to go home.",
      warnings:[], tags:["Found Family","Fluff","Ensemble","One Shot","Comfort"],
      hearts:"2.6k", comments:"140", reads:"38k", updated:"complete", status:"sage", statusText:"Complete",
      complete:true, chapters:1, words:"8,900", read:"35m" },

    { id:"veil", type:"fan", source:"Holmesian", cover:"veil", rating:"M", format:"comic",
      title:"Between the Acts", author:"inkwell.press",
      summary:"A fancomic: the detective and the doctor, told entirely in the silences the cases leave behind.",
      warnings:[], tags:["Comic","Domestic","Slice of Life","Established Relationship","Quiet"],
      hearts:"3.1k", comments:"260", reads:"64k", updated:"3d", status:"amber", statusText:"Updated 3d",
      complete:false, chapters:11, words:"webtoon", read:"1.5h" },

    { id:"quill", type:"original", source:"Fantasy", cover:"quill", rating:"T",
      title:"The Cartographer's Apprentice", author:"anneliese k.",
      summary:"Every map she draws comes true. Her master would very much like her to stop.",
      warnings:[], tags:["Magic","Coming of Age","Adventure","Mentor","Worldbuilding"],
      hearts:"3.4k", comments:"290", reads:"58k", updated:"4d", status:"amber", statusText:"Updated 4d",
      complete:false, chapters:24, words:"120,400", read:"7h" }
  ];

  const byId = Object.fromEntries(WORKS.map(w => [w.id, w]));

  /* Activity feed, grouped. */
  const ACTIVITY = {
    Today: [
      { icon:"reply", rose:true, html:"<b>Junia Vale</b> replied to your comment on <i>Letters to the Lighthouse Keeper</i>", time:"12 minutes ago", work:"letters" },
      { icon:"book", html:"<b>The Locked Tide</b> posted Chapter 14 of <i>The Salt and the Season</i>", time:"1 hour ago", work:"salt" },
      { icon:"heart", rose:true, html:"<b>cormorant</b> and 23 others hearted your work <i>Tin Roof, Tin Heart</i>", time:"3 hours ago" },
      { icon:"tag", html:"4 new works in <b>slow burn</b>", time:"5 hours ago" }
    ],
    Earlier: [
      { icon:"user", html:"<b>tidewrack</b> followed you", time:"1 day ago" },
      { icon:"comment", rose:true, html:"<b>Ren Adeyemi</b> featured your comment on <i>The Salt and the Season</i>", time:"1 day ago", work:"salt" }
    ]
  };

  /* Following feed (plain chronological signal). */
  const FOLLOWING = [
    { icon:"book", html:"<b>The Locked Tide</b> posted <i>Chapter 14: The Long Thaw</i> of The Salt and the Season", time:"1h", work:"salt" },
    { icon:"book", html:"<b>cormorant</b> posted a new work, <i>The Tenant of Room 9</i>", time:"6h", work:"room9" },
    { icon:"book", html:"<b>tidewrack</b> posted <i>Chapter 41</i> of Nine Tenths of the Law", time:"1d", work:"law" },
    { icon:"user", html:"<b>Junia Vale</b> is now following <b>Ivo Sterm</b>", time:"2d" }
  ];

  /* The reading page: one chapter of A Study in Amber, structured for the
     conversation. Some paragraphs carry a seeded thread. */
  const CHAPTER = {
    workId: "amber",
    title: "A Study in Amber",
    author: "cormorant",
    chapterNo: 18,
    chapterCount: 28,
    chapterTitle: "The Violinist's Empty Chair",
    startNote: "Thank you for every comment on the last chapter; I read all of them twice. This one is a little quieter, and a little colder. The case turns here.",
    contentNote: "Content notes for this chapter: a description of a minor injury, and one scene of held-breath peril. Nothing graphic on the page.",
    endNote: "The amber, of course, was never the point. Next chapter: the concert hall, at last. If a line got you, the margin is right there.",
    paragraphs: [
      { t: "The room had the particular silence of a place that had been loud an hour ago. I stood in the doorway and let it settle on me, the way he had taught me to, before I let a single fact arrange itself into a story." },
      { t: "There was the chair, drawn back from the music stand at an angle no one leaves a chair. There was the violin, laid across the seat with a care that did not match the disorder of the rest. And there was the window, open two inches at the bottom, in January, in a house that paid for its coal by the scuttle.",
        thread: { reactions: { "👀": 12, "🔥": 4 }, comments: [
          { who:"Junia Vale", init:"J", when:"2h", text:"the violin laid down with care while everything else is chaos. that one detail tells you she meant to come back." },
          { who:"tidewrack", init:"t", when:"1h", text:"the coal-by-the-scuttle line doing so much work here. we know exactly how poor this household is in nine words." }
        ] } },
      { t: "He was already at the window, of course. He had a way of arriving at the important thing before I had finished noticing there was an important thing, and then waiting for me by it, patient as a cat, so that I might have the small pleasure of catching up." },
      { t: "\"Two inches,\" he said, without turning. \"Tell me why two inches and not the whole sash.\"" },
      { t: "I came to stand beside him. The cold came in through the gap in a thin, deliberate ribbon, and I understood, as I often did in his company, that the answer had been sitting in plain sight, waiting for someone rude enough to look at it directly.",
        thread: { reactions: { "🥺": 31, "❤️": 58, "😭": 9 }, comments: [
          { who:"anneliese k.", init:"a", when:"3h", text:"\"rude enough to look at it directly.\" i am unwell. the whole dynamic between them is in that clause." },
          { who:"Ivo Sterm", init:"I", when:"2h", text:"the way the narration keeps handing him the credit and keeping the tenderness for itself. i could read a thousand chapters of this." },
          { who:"cormorant", init:"c", when:"1h", text:"author here, just quietly delighted you caught the thing this line was doing. thank you.", author:true }
        ] } },
      { t: "\"Someone wished to be heard leaving,\" I said, \"but not seen. The gap is enough for sound and not for a face.\"" },
      { t: "\"Better,\" he said, and the word warmed me more than the dead grate ever could have. \"Now. The amber.\"" },
      { t: "It sat on the music stand where the sheet music should have been: a single bead of it, old and clouded, with something dark suspended at its heart. An insect, I thought at first. Then I looked, in the way he had taught me, and saw that it was not an insect at all." },
      { t: "\"You see it,\" he said. It was not a question. He never asked me whether I saw a thing; he only ever asked me to say it aloud, so that the saying might make it true for both of us." },
      { t: "\"It's a key,\" I said. \"A very small one. Someone drowned a key in amber and left it here for us to find.\" I paused. \"Or for someone else to find, and we are simply the ones who came.\"",
        thread: { reactions: { "🔥": 22, "👀": 15 }, comments: [
          { who:"nb.corvid", init:"n", when:"4h", text:"\"or for someone else to find, and we are simply the ones who came.\" the narrator learning to think in branches. the mentorship arc is right here in the punctuation." }
        ] } },
      { t: "He turned to me then, and there was in his face the thing he never said and I never asked him to, and the cold room held it between us for exactly as long as it was allowed to, which was not very long at all." },
      { t: "\"Come,\" he said, tucking the amber into his breast pocket as though it had always belonged there. \"We are going to be late, and the dead do not wait, but the living sometimes do, if you ask them nicely and bring a violin.\"" }
    ]
  };

  /* Widget station content. */
  const WIDGETS = {
    luckyPool: ["The Salt and the Season","A Study in Amber","Marrow & Bloom","Nine Tenths of the Law","The Frost Between Us","Low Orbit, Long Goodbye"],
    staffPick: { title:"The Tenant of Room 9", author:"cormorant", cover:"room9" },
    tag: { name:"slow burn", newCount:4, week:23 },
    week: { works:3, words:"41,000" }
  };

  /* Editorial / staff picks list. */
  const STAFF = [
    { work:"marrow", note:"A greenhouse for grief, and not one wasted word. Small, and it stayed with us." },
    { work:"room9", note:"Gothic done with restraint. The scares are all in what the prose declines to say." },
    { work:"ledger", note:"Under a thousand hearts and it should not be. Kind, strange, and quietly perfect." }
  ];

  /* Community hubs and events. */
  const HUBS = [
    { name:"The Locked Tide", kind:"Fandom", members:"3.4k", note:"Harbor witches, smugglers, and one very slow-burning winter.", icon:"tag" },
    { name:"slow burn", kind:"Tag", members:"18k", note:"For readers who like it to take exactly as long as it takes.", icon:"tag" },
    { name:"Holmesian", kind:"Fandom", members:"9.1k", note:"Cases, fog, and the space between two chairs by a fire.", icon:"tag" },
    { name:"Original Progression", kind:"Tag", members:"6.7k", note:"Systems, ladders, and the long climb. Fanfic and original both welcome.", icon:"tag" },
    { name:"Cozy & No Romance", kind:"Tag", members:"5.2k", note:"Warmth without a love plot. Found family lives here.", icon:"tag" },
    { name:"Webcomics", kind:"Format", members:"4.4k", note:"Vertical scroll and page-by-page. Fancomics and originals, mixed.", icon:"book" }
  ];

  const EVENTS = [
    { d:"14", m:"Sep", title:"Slow Burn September", kind:"Collection", note:"A month-long collection. Post anything where it takes its time. Open to fanwork and original.", joined:true },
    { d:"01", m:"Oct", title:"The Locked Tide Winter Exchange", kind:"Exchange", note:"Sign-ups open. Full gift-matching returns for this round; give a prompt, get a prompt.", joined:false },
    { d:"20", m:"Oct", title:"Small Works Spotlight", kind:"Nomination", note:"Nominate a work under a thousand hearts. The editors read every nomination.", joined:false }
  ];

  /* Library. */
  const LIBRARY = {
    bookmarks: ["amber","salt","frost","letters","orbit"],
    history: ["amber","law","understudy","marrow","room9"],
    lists: [
      { name:"Winter reading", count:8, covers:["frost","salt","letters"], public:false },
      { name:"Comfort re-reads", count:12, covers:["marrow","hearth","ledger"], public:true },
      { name:"To finish someday", count:5, covers:["law","amber","quill"], public:false }
    ],
    things: [
      { work:"amber", text:"\"rude enough to look at it directly\"", note:"the whole relationship in one clause. come back to this." },
      { work:"letters", text:"\"I have started three letters and burned all three...\"", note:"how she writes avoidance without ever naming it." },
      { work:"marrow", text:"\"The greenhouse only grew what people had lost.\"", note:"the premise stated once, plainly, then never explained again. trust the reader." }
    ]
  };

  /* Profile. */
  const PROFILE = {
    name:"Rowan",
    handle:"@rowan.reads",
    bio:"Reader first, writer on the good days. I keep the harbor lights on for slow burns and quiet endings.",
    stats:{ works:6, hearts:"9.4k", following:112, followers:"1.3k" },
    pinned:["salt","amber"],
    joined:"Joined 2024"
  };

  return { COVERS, WORKS, byId, ACTIVITY, FOLLOWING, CHAPTER, WIDGETS, STAFF, HUBS, EVENTS, LIBRARY, PROFILE };
})();
