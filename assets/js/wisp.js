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

  /* ---- typography: fonts and roles readers can restyle ------------------- */
  const TYPE_FONTS = [
    { id: "playfair",     name: "Playfair Display",    stack: "'Playfair Display', Georgia, serif" },
    { id: "cormorant",    name: "Cormorant Garamond",  stack: "'Cormorant Garamond', Georgia, serif" },
    { id: "ebgaramond",   name: "EB Garamond",         stack: "'EB Garamond', Georgia, serif" },
    { id: "lora",         name: "Lora",                stack: "'Lora', Georgia, serif" },
    { id: "newsreader",   name: "Newsreader",          stack: "'Newsreader', Georgia, serif" },
    { id: "crimson",      name: "Crimson Pro",         stack: "'Crimson Pro', Georgia, serif" },
    { id: "merriweather", name: "Merriweather",        stack: "'Merriweather', Georgia, serif" },
    { id: "inter",        name: "Inter",               stack: "'Inter', system-ui, sans-serif" },
    { id: "system",       name: "System sans",         stack: "system-ui, -apple-system, sans-serif" }
  ];
  const TYPE_FONT_MAP = TYPE_FONTS.reduce((m, f) => { m[f.id] = f.stack; return m; }, {});
  // Roles map to the elements the reader actually renders: the chapter title and
  // subtitle, the three prose heading levels (# ## ###), body text, and captions.
  // size 0 for body means "follow the reading-size slider".
  const TYPE_ROLES = [
    { id: "title",    label: "Title",       font: "playfair",   size: 34 },
    { id: "subtitle", label: "Subtitle",    font: "playfair",   size: 24 },
    { id: "h1",       label: "Heading 1",   font: "playfair",   size: 27 },
    { id: "h2",       label: "Heading 2",   font: "playfair",   size: 23 },
    { id: "h3",       label: "Heading 3",   font: "playfair",   size: 20 },
    { id: "body",     label: "Normal text", font: "auto",       size: 0 },
    { id: "caption",  label: "Caption",     font: "newsreader", size: 13 }
  ];
  function typographyDefaults() {
    const t = {};
    TYPE_ROLES.forEach(r => { t[r.id] = { font: r.font, size: r.size, color: "" }; });
    return t;
  }

  /* ---- settings and persistence (stands in for server-side sync) --------- */
  const DEFAULTS = { theme:"cream", accent:"default", face:"humanist", size:19, measure:66,
                     dyslexia:false, motion:false, justify:false, margins:true, view:"gallery", adultOK:false, introSeen:false, comicMode:"strip",
                     typography: typographyDefaults() };
  let settings = load();
  function load() {
    try {
      const s = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem("wisp.settings") || "{}"));
      // Fill in any typography roles missing from an older saved blob.
      s.typography = Object.assign(typographyDefaults(), s.typography || {});
      return s;
    }
    catch (e) { return Object.assign({}, DEFAULTS, { typography: typographyDefaults() }); }
  }
  function save() { try { localStorage.setItem("wisp.settings", JSON.stringify(settings)); } catch (e) {} }

  /* ---- small view helpers ------------------------------------------------ */
  const RATE = { G:"General", T:"Teen", M:"Mature", E:"Explicit" };
  // What each rating means, shown in the hover/tap tooltips so a reader or
  // writer never has to guess what a single letter stands for.
  const RATE_INFO = {
    G: { label: "General", desc: "Suitable for all readers." },
    T: { label: "Teen", desc: "Mild themes, language, or violence. Around 13+." },
    M: { label: "Mature", desc: "Sexual content, strong violence, or heavy themes. For adults." },
    E: { label: "Explicit", desc: "Explicit sexual content or extreme material. 18+ only." }
  };
  function rateTip(r) { const i = RATE_INFO[r]; return i ? i.label + ": " + i.desc : (RATE[r] || r); }
  const WARNING_INFO = {
    "Graphic violence": "Detailed violence, gore, or injury.",
    "Major character death": "A main character dies.",
    "Underage": "Sexual content involving minors is depicted or implied.",
    "Noncon": "Nonconsensual sexual content.",
    "Choose not to warn": "The author has chosen not to flag specific warnings."
  };
  const WARNINGS = ["Graphic violence", "Major character death", "Underage", "Noncon", "Choose not to warn"];
  // Seed suggestions for the tag autocomplete: broad book categories first, then
  // common story tags. In live mode the tags already in the database are merged in.
  const TAG_SUGGEST = [
    // Core genres and the starter set.
    "Romance", "Mystery", "Fantasy", "Science Fiction", "Fanfiction", "Poetry", "Horror", "Thriller",
    "Historical", "Adventure", "Contemporary", "Literary Fiction", "Young Adult", "Drama", "Comedy",
    "Action", "Paranormal", "Dystopian", "Slice of Life", "LGBTQ+", "Nonfiction", "Short Story",
    "Slow Burn", "Enemies to Lovers", "Found Family", "Friends to Lovers", "Angst", "Fluff",
    "Hurt/Comfort", "Coming of Age", "Alternate Universe", "Time Travel", "Magic", "Vampires",
    "Werewolves", "Dragons", "Royalty", "Academia", "Small Town", "Second Chance", "Forbidden Love",
    "Redemption", "Revenge", "Heist", "Survival", "Mythology", "Fairy Tale Retelling", "Gothic",
    "Noir", "Cyberpunk", "Steampunk", "Space Opera", "Soulmates", "Grumpy/Sunshine",
    // Genres and subgenres.
    "Urban Fantasy", "High Fantasy", "Dark Fantasy", "Epic Fantasy", "Portal Fantasy", "Sword and Sorcery",
    "Grimdark", "Magical Realism", "Hard Science Fiction", "Space Western", "Post-Apocalyptic", "Apocalyptic",
    "Alien Invasion", "First Contact", "Military Science Fiction", "Time Loop", "Multiverse", "Parallel Worlds",
    "Cozy Mystery", "Crime", "Detective", "Whodunit", "Legal Drama", "Medical Drama", "Political Drama",
    "Espionage", "Spy Fiction", "Techno-Thriller", "Psychological Thriller", "Psychological Horror",
    "Body Horror", "Cosmic Horror", "Survival Horror", "Supernatural", "Occult", "Witchcraft", "Demons",
    "Angels", "Ghosts", "Zombies", "Fae", "Mermaids", "Shapeshifters", "Superhero", "Antihero",
    "Chosen One", "Quest", "Road Trip", "Treasure Hunt", "War Story", "Western", "Pirates", "Vikings",
    "Regency", "Victorian", "Medieval", "Renaissance", "Ancient World", "Wild West", "Roaring Twenties",
    "Cold War", "Near Future", "Far Future", "Retelling", "Crossover", "Anthology", "Novella",
    "Flash Fiction", "Drabble", "Serial Fiction", "Epistolary", "Diary Format", "Unreliable Narrator",
    "Multiple POV", "Dark Academia", "Light Academia", "Utopia",
    // Romance tropes.
    "Fake Dating", "Fake Relationship", "Marriage of Convenience", "Arranged Marriage", "Accidental Marriage",
    "Secret Relationship", "Office Romance", "Boss and Employee", "Bodyguard Romance", "Single Parent",
    "Best Friends to Lovers", "Childhood Friends", "Reunited Lovers", "Rivals to Lovers", "Frenemies",
    "Opposites Attract", "Forced Proximity", "Only One Bed", "Snowed In", "Roommates to Lovers",
    "Neighbors to Lovers", "Pen Pals", "Long Distance", "Love Triangle", "Love at First Sight",
    "Unrequited Love", "Pining", "Mutual Pining", "Idiots in Love", "Oblivious Crush", "Jealousy",
    "Possessive Love", "Protective Partner", "First Love", "Age Gap", "Height Difference", "Meet Cute",
    "Wedding", "Honeymoon", "Fake Marriage", "Marriage in Trouble", "Reconciliation", "Sports Romance",
    "Rock Star Romance", "Celebrity Romance", "Billionaire Romance", "Cowboy Romance", "Mafia Romance",
    "Motorcycle Club", "Holiday Romance", "Summer Romance", "Winter Romance", "Slow Dancing",
    // Relationship and comfort dynamics.
    "Touch-Starved", "Emotional Hurt/Comfort", "Whump", "Caretaking", "Domestic Fluff",
    "Established Relationship", "Getting Together", "Breakup", "Make Up", "Grief", "Healing",
    "Trauma Recovery", "Sibling Bond", "Parenthood", "Mentor and Protege", "Rivalry", "Competition",
    "Tournament Arc", "Mental Health", "Anxiety Representation", "Neurodivergent Character",
    "Disability Representation", "Chronic Illness",
    // Tone and craft descriptors.
    "Wholesome", "Feel-Good", "Heartwarming", "Bittersweet", "Tragedy", "Tearjerker", "Dark Themes",
    "Humor", "Satire", "Parody", "Crack Treated Seriously", "Whimsical", "Cozy", "Atmospheric",
    "Fast-Paced", "Character-Driven", "Plot-Driven", "World Building", "Ensemble Cast",
    "Strong Female Lead", "Morally Grey", "Complex Characters", "Banter", "Witty Dialogue", "Snark",
    "Angst with a Happy Ending", "Happy Ending", "Bittersweet Ending", "Open Ending", "Cliffhanger",
    "Plot Twist", "Twist Ending",
    // Settings and situations.
    "Boarding School", "Magic School", "Summer Camp", "Coffee Shop", "Bookshop", "Bakery", "Hospital AU",
    "Space Station", "Spaceship", "Island Setting", "Underwater", "Afterlife", "Dream World",
    "Virtual Reality", "Castle", "Kingdom", "Empire", "Rebellion", "Resistance", "Court Intrigue",
    "Assassins", "Bounty Hunter", "Mercenary", "Knights", "Wizards", "Elves", "Dwarves",
    "Gods and Mortals", "Demigods", "Prophecy", "Curse", "Immortality", "Reincarnation", "Body Swap",
    "Amnesia", "Secret Identity", "Double Life", "Undercover", "Betrayal", "Sacrifice", "Prison Break",
    "Space Colony", "Wartime", "Post-War", "College AU", "High School AU", "Soulmate AU",
    // Poetry and formats.
    "Poetry Collection", "Free Verse", "Sonnet", "Spoken Word", "Screenplay", "Stage Play",
    "Graphic Novel", "Webcomic", "Illustrated", "Interactive Fiction",
    // LGBTQ+ identities and relationships.
    "Lesbian", "Gay", "Bisexual", "Pansexual", "Asexual", "Aromantic", "Demisexual", "Demiromantic",
    "Biromantic", "Panromantic", "Homoromantic", "Aroace", "Transgender", "Trans Man", "Trans Woman",
    "Nonbinary", "Genderfluid", "Genderqueer", "Agender", "Bigender", "Intersex", "Two-Spirit", "Queer",
    "Questioning", "WLW", "MLM", "Sapphic", "Achillean", "Yuri", "Yaoi", "Boys' Love", "Girls' Love",
    "Butch", "Femme", "T4T", "Polyamory", "Polyamorous", "Coming Out", "Gender Euphoria",
    "Gender Dysphoria", "Pride", "Trans Joy", "Chosen Family", "Omnisexual", "Graysexual", "Abrosexual",
    "Trans Character", "Nonbinary Character", "Sapphic Romance", "Achillean Romance", "Queerplatonic",
    // Manga, manhwa, and webnovel tropes.
    "Isekai", "Reverse Isekai", "Transmigration", "Regression", "Regressor", "Returnee", "Villainess",
    "Otome Isekai", "System", "Cultivation", "Xianxia", "Wuxia", "Murim", "Danmei", "BL", "GL",
    "Shounen", "Shoujo", "Seinen", "Josei", "Shounen-ai", "Shoujo-ai", "Omegaverse",
    "Alpha/Beta/Omega", "Fated Mates", "Mating Bond", "Pack Dynamics", "Heat Cycle", "Rebirth",
    "Necromancer", "Summoner", "Dungeon Crawl", "Hunter", "Gate", "Leveling System", "Tower Climbing",
    "Constellation", "Academy", "Sect", "Overpowered Protagonist", "Weak to Strong", "Face Slapping",
    "Reincarnated Villain", "Second Chance at Life", "Reverse Harem", "Harem", "Demonic Cultivation",
    "Novel Transmigration", "Game Transmigration", "Extra's POV", "Immortal", "Sword Cultivation",
    // Fandom and AO3-style story tags.
    "Canon Divergence", "Canon Compliant", "Post-Canon", "Pre-Canon", "Missing Scene", "Fix-It Fic",
    "Everyone Lives", "No Powers AU", "Modern AU", "Historical AU", "Royalty AU", "Coffee Shop AU",
    "Bakery AU", "Hanahaki Disease", "Case Fic", "Kid Fic", "De-Aged", "Family Feels", "Domestic Bliss",
    "Single Dad", "Single Mom", "Adoption", "Meet the Family", "Miscommunication", "One-Sided Love",
    "Requited Love", "Redemption Arc", "Villain Redemption", "Villain POV", "Antagonist POV",
    "Villain Origin Story", "Character Study", "Introspection", "Songfic", "One Shot", "Two Shot",
    "Fluff and Angst", "Angst and Feels", "Hurt No Comfort", "Nightmares", "Panic Attacks", "Recovery",
    "Self-Discovery", "First Kiss", "First Time", "Love Confession", "Reunion", "Forgiveness",
    "Sharing a Bed", "Huddling for Warmth", "Friends with Benefits", "Enemies to Friends to Lovers",
    "Idiots to Lovers", "Getting Back Together", "Christmas", "Halloween", "Valentine's Day", "Birthday",
    "Beach Episode", "Festival", "Camping", "Sleepover", "Slow Build", "Angst with a Hopeful Ending",
    "Feelings Realization", "What If", "Divergent Timeline", "Not Beta Read", "Dead Dove: Do Not Eat",
    // More dynamics, moods, and aesthetics.
    "Rivals", "Childhood Enemies", "Ex to Lovers", "Coworkers to Lovers", "Love/Hate Relationship",
    "Yearning", "Devotion", "Protectiveness", "Codependency", "Vulnerability", "Repressed Feelings",
    "Emotional Constipation", "Denial", "Acceptance", "Matchmaking", "Blind Date", "Marriage Pact",
    "Wingman", "Slow Realization", "Cottagecore", "Fairycore", "Goblincore", "Cozy Fantasy",
    "Liminal Spaces", "Nostalgia", "Melancholy", "Ethereal", "Whimsy", "Surreal", "Absurdist",
    "Dreamlike", "Tension", "Devotional",
    // Speculative flavours.
    "Superpowers", "Mutants", "Androids", "Artificial Intelligence", "Cyborg", "Mecha", "Kaiju",
    "Cloning", "Space Exploration", "Generation Ship", "Wormholes", "Simulation Theory", "Alchemy",
    "Rune Magic", "Blood Magic", "Elemental Magic", "Divination", "Tarot", "Ghost Hunting", "Cryptids",
    "Urban Legends", "Folklore", "Sea Monsters", "Eldritch", "Lovecraftian", "Haunted House",
    "Possession", "Exorcism", "Astral Projection", "Shapeshifting", "Familiars", "Enchanted Forest",
    // Alternate-universe flavours.
    "Firefighter AU", "Police AU", "Detective AU", "Doctor AU", "Lawyer AU", "Teacher AU", "Chef AU",
    "Barista AU", "Musician AU", "Artist AU", "Writer AU", "Athlete AU", "Florist AU", "Tattoo Artist AU",
    "Mechanic AU", "Pilot AU", "Soldier AU", "Spy AU", "Assassin AU", "Superhero AU", "Mermaid AU",
    "Vampire AU", "Werewolf AU", "Ghost AU", "Angel AU", "Demon AU", "Fae AU", "Pirate AU", "Space AU",
    "Apocalypse AU", "Zombie AU", "Band AU", "Sports AU", "Fantasy AU", "Sci-Fi AU"
  ];

  // Pre-seeded fandoms, the same idea as the tag list: writers pick from a big
  // starter set, and admins add more from the panel (categories, scope=fandom).
  // Anything a writer types that is not here still saves and gets suggested to
  // everyone else (see listFandoms). Covers books, TV, film, anime, games, more.
  const FANDOMS = [
    // Books and book series.
    "Harry Potter", "Percy Jackson and the Olympians", "The Heroes of Olympus", "The Kane Chronicles",
    "Magnus Chase and the Gods of Asgard", "The Lord of the Rings", "The Hobbit", "The Silmarillion",
    "A Song of Ice and Fire", "The Chronicles of Narnia", "The Hunger Games", "Divergent", "The Maze Runner",
    "Twilight", "The Mortal Instruments", "The Infernal Devices", "A Court of Thorns and Roses",
    "Throne of Glass", "Crescent City", "Six of Crows", "Shadow and Bone", "Red Queen", "Caraval",
    "The Cruel Prince", "The Folk of the Air", "Fourth Wing", "The Empyrean", "Warrior Cats", "Wings of Fire",
    "Keeper of the Lost Cities", "The Inheritance Cycle", "Eragon", "His Dark Materials", "The Wheel of Time",
    "The Stormlight Archive", "Mistborn", "The Cosmere", "The Kingkiller Chronicle", "The Witcher",
    "Discworld", "The Dresden Files", "Outlander", "The Selection", "Shatter Me", "An Ember in the Ashes",
    "The Raven Cycle", "The Lunar Chronicles", "Renegades", "Artemis Fowl", "Alex Rider",
    "A Series of Unfortunate Events", "Redwall", "The Land of Stories", "The School for Good and Evil",
    "Miss Peregrine's Home for Peculiar Children", "The Giver", "The Book Thief", "To Kill a Mockingbird",
    "Pride and Prejudice", "Jane Eyre", "Wuthering Heights", "Little Women", "Anne of Green Gables",
    "Sherlock Holmes", "Dracula", "Frankenstein", "The Great Gatsby", "Les Miserables",
    "The Phantom of the Opera", "Dune", "The Foundation Series", "Ender's Game",
    "The Hitchhiker's Guide to the Galaxy", "1984", "Brave New World", "Fahrenheit 451",
    "The Handmaid's Tale", "Good Omens", "American Gods", "The Baby-Sitters Club", "Diary of a Wimpy Kid",
    "Goosebumps", "Nancy Drew", "The Hardy Boys",
    // Television.
    "Supernatural", "Doctor Who", "Sherlock", "Stranger Things", "Game of Thrones", "House of the Dragon",
    "Breaking Bad", "Better Call Saul", "The Office", "Friends", "Parks and Recreation",
    "Brooklyn Nine-Nine", "Community", "How I Met Your Mother", "The Big Bang Theory", "Grey's Anatomy",
    "The Vampire Diaries", "The Originals", "Teen Wolf", "Riverdale", "Gossip Girl", "Pretty Little Liars",
    "Glee", "Buffy the Vampire Slayer", "Angel", "The X-Files", "Star Trek",
    "Star Trek: The Next Generation", "The Mandalorian", "WandaVision", "Loki", "The Boys",
    "The Umbrella Academy", "Wednesday", "Heartstopper", "Sex Education", "Euphoria", "Peaky Blinders",
    "The Crown", "Bridgerton", "Outer Banks", "Cobra Kai", "The Last of Us", "House", "Lucifer",
    "Once Upon a Time", "Merlin", "Downton Abbey", "Money Heist", "Squid Game", "Dark", "Ted Lasso",
    "Succession", "The Walking Dead", "Arcane", "Castlevania", "Our Flag Means Death", "The Sandman",
    "Andor", "Ahsoka",
    // Film and film franchises.
    "Star Wars", "Marvel Cinematic Universe", "The Avengers", "Spider-Man", "Iron Man",
    "Guardians of the Galaxy", "Thor", "Black Panther", "Deadpool", "X-Men", "DC Extended Universe",
    "Batman", "Superman", "Wonder Woman", "Justice League", "Aquaman", "The Dark Knight", "Joker",
    "Fantastic Beasts", "Pirates of the Caribbean", "Jurassic Park", "Jurassic World", "Indiana Jones",
    "The Matrix", "Back to the Future", "Ghostbusters", "Alien", "Predator", "The Terminator",
    "Blade Runner", "Mad Max", "John Wick", "Fast & Furious", "Mission: Impossible", "James Bond",
    "The Fault in Our Stars", "Frozen", "Encanto", "Moana", "Tangled", "The Lion King",
    "Beauty and the Beast", "Aladdin", "The Little Mermaid", "Toy Story", "Finding Nemo", "Coco", "Up",
    "Inside Out", "The Incredibles", "How to Train Your Dragon", "Shrek", "Kung Fu Panda",
    "Despicable Me", "Spider-Man: Into the Spider-Verse", "Barbie", "Oppenheimer", "Avatar", "Interstellar",
    "Inception", "La La Land", "The Greatest Showman",
    // Anime and manga.
    "Naruto", "Boruto", "Dragon Ball", "Dragon Ball Z", "One Piece", "Bleach", "Attack on Titan",
    "Demon Slayer", "My Hero Academia", "Jujutsu Kaisen", "Death Note", "Fullmetal Alchemist",
    "Fullmetal Alchemist: Brotherhood", "Hunter x Hunter", "Tokyo Ghoul", "Sailor Moon",
    "Cardcaptor Sakura", "Fruits Basket", "Ouran High School Host Club", "Fairy Tail", "Black Clover",
    "Chainsaw Man", "Spy x Family", "Haikyuu!!", "Kuroko's Basketball", "Yuri!!! on Ice", "Free!",
    "Neon Genesis Evangelion", "Cowboy Bebop", "Code Geass", "Sword Art Online", "Re:Zero",
    "That Time I Got Reincarnated as a Slime", "Mob Psycho 100", "One Punch Man",
    "JoJo's Bizarre Adventure", "Inuyasha", "Pokemon", "Digimon", "Yu-Gi-Oh!", "Bungo Stray Dogs",
    "Vinland Saga", "Dr. Stone", "The Promised Neverland", "Toilet-Bound Hanako-kun", "Given",
    "Banana Fish", "Hetalia", "Studio Ghibli", "Spirited Away", "Howl's Moving Castle",
    "My Neighbor Totoro", "Princess Mononoke",
    // Video games.
    "The Legend of Zelda", "Super Mario", "Kingdom Hearts", "Final Fantasy", "Final Fantasy VII",
    "Undertale", "Deltarune", "Genshin Impact", "Honkai: Star Rail", "Overwatch", "League of Legends",
    "Valorant", "Minecraft", "Fortnite", "The Elder Scrolls", "Skyrim", "Fallout", "Mass Effect",
    "Dragon Age", "Red Dead Redemption", "Grand Theft Auto", "God of War", "Horizon Zero Dawn",
    "Cyberpunk 2077", "The Witcher 3", "Dark Souls", "Elden Ring", "Bloodborne", "Hades",
    "Stardew Valley", "Animal Crossing", "Splatoon", "Sonic the Hedgehog", "Kirby", "Metroid",
    "Persona 5", "Danganronpa", "Ace Attorney", "Life is Strange", "Detroit: Become Human", "Portal",
    "Half-Life", "BioShock", "Resident Evil", "Silent Hill", "Five Nights at Freddy's", "Hollow Knight",
    "Celeste", "Among Us", "Apex Legends", "Destiny", "World of Warcraft", "Baldur's Gate 3",
    "Team Fortress 2",
    // Cartoons, comics, and animation.
    "Avatar: The Last Airbender", "The Legend of Korra", "Steven Universe", "Adventure Time",
    "Gravity Falls", "Rick and Morty", "BoJack Horseman", "The Owl House", "Amphibia",
    "She-Ra and the Princesses of Power", "Voltron: Legendary Defender", "Danny Phantom", "Kim Possible",
    "Phineas and Ferb", "Ben 10", "Winx Club", "My Little Pony: Friendship is Magic", "Hazbin Hotel",
    "Helluva Boss", "Invincible", "The Amazing World of Gumball", "Total Drama", "Scooby-Doo",
    "Teenage Mutant Ninja Turtles", "Teen Titans", "Miraculous Ladybug",
    // Musicals, tabletop, and web media.
    "Hamilton", "Dear Evan Hansen", "Wicked", "Heathers", "Beetlejuice", "Six", "Hadestown",
    "Be More Chill", "Epic: The Musical", "Critical Role", "Dungeons & Dragons", "The Magnus Archives",
    "Welcome to Night Vale", "Homestuck", "RWBY",
    // Netflix and other streaming series.
    "You", "Ozark", "Elite", "Never Have I Ever", "Ginny & Georgia", "XO, Kitty", "Julie and the Phantoms",
    "Fate: The Winx Saga", "Warrior Nun", "Locke & Key", "The Haunting of Hill House", "Midnight Mass",
    "First Kill", "Heartbreak High", "The Queen's Gambit", "Enola Holmes", "The Kissing Booth",
    "To All the Boys I've Loved Before", "Beef", "Maid", "The Get Down",
    "Only Murders in the Building", "The Great", "Normal People", "The Summer I Turned Pretty",
    "The Marvelous Mrs. Maisel", "The Lord of the Rings: The Rings of Power", "Fleabag", "Reacher",
    "Gen V", "The Expanse",
    // CW and network TV.
    "Arrow", "The Flash", "Supergirl", "DC's Legends of Tomorrow", "Batwoman", "Black Lightning",
    "Legacies", "Roswell, New Mexico", "Charmed", "Dynasty", "All American", "Jane the Virgin",
    "Crazy Ex-Girlfriend", "iZombie", "The 100", "Reign", "Smallville", "One Tree Hill", "Veronica Mars",
    "Gilmore Girls", "Chilling Adventures of Sabrina", "Sabrina the Teenage Witch",
    // ABC Family / Freeform.
    "The Fosters", "Switched at Birth", "Shadowhunters", "Good Trouble", "grown-ish", "The Bold Type",
    "Motherland: Fort Salem", "Cruel Summer", "Baby Daddy", "Young & Hungry", "Ravenswood", "Stitchers",
    // Nickelodeon.
    "iCarly", "Victorious", "Sam & Cat", "Drake & Josh", "Zoey 101", "The Fairly OddParents",
    "SpongeBob SquarePants", "Invader Zim", "Rugrats", "Hey Arnold!", "Big Time Rush", "Henry Danger",
    "The Loud House", "Kenan & Kel", "All That", "Ned's Declassified School Survival Guide",
    // Disney and Disney Channel.
    "Hannah Montana", "Wizards of Waverly Place", "That's So Raven", "Lizzie McGuire",
    "The Suite Life of Zack and Cody", "Descendants", "High School Musical",
    "High School Musical: The Musical: The Series", "Andi Mack", "Girl Meets World", "Boy Meets World",
    "Shake It Up", "Austin & Ally", "Jessie", "Good Luck Charlie", "K.C. Undercover",
    "Sonny with a Chance", "DuckTales", "Star vs. the Forces of Evil", "Recess",
    // Cartoon Network.
    "Teen Titans Go!", "Codename: Kids Next Door", "Ed, Edd n Eddy", "Courage the Cowardly Dog",
    "The Powerpuff Girls", "Dexter's Laboratory", "Samurai Jack", "Craig of the Creek", "We Bare Bears",
    "Foster's Home for Imaginary Friends", "Chowder", "Infinity Train", "Generator Rex",
    // HBO / Max and premium cable.
    "True Blood", "Westworld", "The Sopranos", "Barry", "Titans", "Doom Patrol", "Young Justice",
    "Harley Quinn", "Pretty Little Liars: Original Sin",
    // More anime and manga.
    "Solo Leveling", "Blue Lock", "Oshi no Ko", "Frieren", "Bocchi the Rock!", "Komi Can't Communicate",
    "Kaguya-sama: Love Is War", "Horimiya", "Toradora!", "Clannad", "Your Lie in April",
    "A Silent Voice", "Your Name", "Weathering with You", "Violet Evergarden", "Made in Abyss",
    "Fire Force", "Assassination Classroom", "Soul Eater", "Blue Exorcist", "Seraph of the End",
    "No Game No Life", "KonoSuba", "Overlord", "The Rising of the Shield Hero", "Mushoku Tensei",
    "Classroom of the Elite", "Kakegurui", "Erased", "Steins;Gate", "Angel Beats!", "Gintama",
    "Hellsing", "Berserk", "Devilman Crybaby", "Parasyte", "Yu Yu Hakusho", "Rurouni Kenshin", "Trigun",
    "Beastars", "Sasaki and Miyano", "The Apothecary Diaries", "Delicious in Dungeon", "SK8 the Infinity",
    "Wonder Egg Priority", "Ranma 1/2", "Yona of the Dawn", "Nana", "Skip Beat!", "Ouran",
    // Manhwa, manhua, and webtoons.
    "Tower of God", "The God of High School", "Noblesse", "Lookism", "Omniscient Reader's Viewpoint",
    "True Beauty", "Lore Olympus", "unOrdinary", "I Love Yoo", "Let's Play", "SubZero",
    "The Remarried Empress", "Who Made Me a Princess", "Heaven Official's Blessing",
    "The Untamed", "Grandmaster of Demonic Cultivation", "Mo Dao Zu Shi",
    "Tian Guan Ci Fu", "The Beginning After the End", "Villains Are Destined to Die",
    // Video games (more).
    "Fire Emblem", "Fire Emblem: Three Houses", "Xenoblade Chronicles", "Nier: Automata", "Bayonetta",
    "Mystic Messenger", "Obey Me!", "Twisted Wonderland", "Fate/Grand Order", "Fate/stay night",
    "Project Sekai", "Ensemble Stars", "Cookie Run", "Identity V", "Arknights", "Honkai Impact 3rd",
    "Wuthering Waves", "Zenless Zone Zero", "Love and Deepspace", "Marvel Rivals", "Helldivers 2",
    "Palworld", "Lethal Company", "Balatro", "Vampire Survivors", "Slay the Spire", "It Takes Two",
    "Cuphead", "Ori and the Blind Forest", "Outer Wilds", "Disco Elysium", "Subnautica", "Terraria",
    "Roblox", "Sky: Children of the Light", "Tears of the Kingdom", "Splatoon 3",
    // Music and bands (real-person fandoms).
    "BTS", "BLACKPINK", "Stray Kids", "TWICE", "EXO", "SEVENTEEN", "NCT", "ATEEZ",
    "TOMORROW X TOGETHER", "ENHYPEN", "Red Velvet", "ITZY", "aespa", "IVE", "NewJeans", "LE SSERAFIM",
    "GOT7", "MONSTA X", "BIGBANG", "Girls' Generation", "One Direction", "5 Seconds of Summer",
    "The Beatles", "Taylor Swift", "Harry Styles", "Ariana Grande", "Billie Eilish", "Olivia Rodrigo",
    "Lady Gaga", "Beyonce", "Justin Bieber", "Selena Gomez", "Doja Cat", "Sabrina Carpenter",
    "Ed Sheeran", "Shawn Mendes", "Panic! at the Disco", "My Chemical Romance", "Fall Out Boy",
    "Twenty One Pilots", "Paramore", "Imagine Dragons", "Coldplay", "Queen", "Nirvana", "Maneskin",
    "Lana Del Rey", "SZA", "The Weeknd", "Dua Lipa", "Melanie Martinez", "Mitski", "Hozier", "Conan Gray",
    // Creators and online fandoms.
    "Dream SMP", "Minecraft YouTubers", "Hermitcraft", "Game Grumps", "Dan and Phil",
    "Genshin Impact Creators",
    // Nickelodeon teen/tween (2000s-2010s).
    "Make It Pop", "Every Witch Way", "Talia in the Kitchen", "WITS Academy", "The Haunted Hathaways",
    "Nicky, Ricky, Dicky & Dawn", "100 Things to Do Before High School", "Bella and the Bulldogs",
    "Game Shakers", "School of Rock", "Knight Squad", "Cousins for Life", "Star Falls", "House of Anubis",
    "True Jackson, VP", "How to Rock", "Supah Ninjas", "Marvin Marvin", "Fred: The Show", "The Thundermans",
    "Danger Force", "The Amanda Show", "Unfabulous", "Romeo!", "The Naked Brothers Band", "Rags",
    "Are You Afraid of the Dark?", "Side Hustle", "The Astronauts", "That Girl Lay Lay", "Ride",
    "Hunter Street",
    // Disney Channel teen/tween (2000s-2010s).
    "The Suite Life on Deck", "Cory in the House", "So Random!", "A.N.T. Farm", "Dog with a Blog",
    "Liv and Maddie", "Best Friends Whenever", "BUNK'D", "Stuck in the Middle", "Raven's Home",
    "Sydney to the Max", "Coop & Cami Ask the World", "Just Roll with It", "Gabby Duran & the Unsittables",
    "Phil of the Future", "Even Stevens", "Camp Rock", "The Cheetah Girls", "Zeke and Luther",
    "Pair of Kings", "Kickin' It", "Lab Rats", "Mighty Med", "Lab Rats: Elite Force", "Crash & Bernstein",
    "I Didn't Do It", "Mech-X4", "Gamer's Guide to Pretty Much Everything", "Aaron Stone", "Bizaardvark",
    "Walk the Prank", "Randy Cunningham: 9th Grade Ninja", "Milo Murphy's Law", "ZOMBIES", "Teen Beach Movie",
    "Lemonade Mouth", "Starstruck", "Princess Protection Program", "Radio Rebel", "Bad Hair Day",
    "Girl vs. Monster", "Invisible Sister", "Frenemies", "How to Build a Better Boy", "Cloud 9", "Zapped",
    "Wizards of Waverly Place: The Movie", "The Suite Life Movie", "Adventures in Babysitting",
    // Teen dramas and comedies (2000s-2010s).
    "The O.C.", "Dawson's Creek", "Everwood", "90210", "Life Unexpected", "Hellcats", "Privileged",
    "The Secret Life of the American Teenager", "Greek", "Awkward.", "Faking It", "Skins", "Misfits",
    "The Inbetweeners", "My Mad Fat Diary", "Waterloo Road", "Hollyoaks", "SKAM", "Young Royals", "Kyle XY",
    "The Nine Lives of Chloe King", "Twisted", "Chasing Life", "Famous in Love", "Beyond", "The Lying Game",
    "Make It or Break It", "Jane by Design", "Recovery Road", "Freaks and Geeks", "Friday Night Lights",
    "Everything Sucks!", "I Am Not Okay with This", "Trinkets", "Daybreak", "On My Block", "Grand Army",
    "The Society", "Panic", "Genera+ion", "Love, Victor",
    // Canadian, British, and Australian teen shows.
    "Degrassi: The Next Generation", "Degrassi", "Instant Star", "The Latest Buzz", "How to Be Indie",
    "Mr. Young", "Some Assembly Required", "Max & Shred", "The Next Step", "Lost & Found Music Studios",
    "Backstage", "Life with Derek", "Radio Free Roscoe", "Naturally, Sadie", "Dance Academy",
    "Blue Water High", "H2O: Just Add Water", "Mako Mermaids", "The Elephant Princess", "Nowhere Boys",
    "The Worst Witch", "Young Dracula", "Wolfblood", "The Sarah Jane Adventures", "M.I. High",
    "Tracy Beaker Returns", "The Dumping Ground", "Wizards vs Aliens", "Evermoor", "The Lodge",
    "Find Me in Paris", "The Bureau of Magical Things", "So Awkward", "The Worst Year of My Life, Again",
    "Dead Gorgeous",
    // Animated teen/tween.
    "W.I.T.C.H.", "Totally Spies!", "Martin Mystery", "Monster High", "Ever After High", "Bratz",
    "LoliRock", "Braceface", "6teen", "Stoked", "Grojband", "Detentionaire", "My Life as a Teenage Robot",
    "Sabrina: The Animated Series", "As Told by Ginger", "The Weekenders", "Pepper Ann", "Lloyd in Space",
    "The Proud Family", "Fillmore!", "American Dragon: Jake Long", "The Replacements", "Yin Yang Yo!",
    "Wander Over Yonder", "Motorcity", "Sym-Bionic Titan", "Class of the Titans", "Storm Hawks",
    "Bakugan Battle Brawlers", "Beyblade", "Winx Club: World of Winx", "Trollz", "Atomic Betty",
    "Kappa Mikey", "The Cramp Twins", "Chalk Zone", "Angela Anaconda",
    // Expanded catalog: individual films (MCU, DC, horror, animation), franchises,
    // more TV, books, anime/manga, manhwa/webtoons, video games, musicals, and music.
    "Iron Man 2", "Iron Man 3", "The Incredible Hulk", "Captain America: The First Avenger",
    "Captain America: The Winter Soldier", "Captain America: Civil War", "Captain America: Brave New World", "Thor: The Dark World",
    "Thor: Ragnarok", "Thor: Love and Thunder", "The Avengers: Age of Ultron", "Avengers: Infinity War",
    "Avengers: Endgame", "Guardians of the Galaxy Vol. 2", "Guardians of the Galaxy Vol. 3", "Ant-Man",
    "Ant-Man and the Wasp", "Ant-Man and the Wasp: Quantumania", "Doctor Strange", "Doctor Strange in the Multiverse of Madness",
    "Spider-Man: Homecoming", "Spider-Man: Far From Home", "Spider-Man: No Way Home", "Black Panther: Wakanda Forever",
    "Captain Marvel", "The Marvels", "Black Widow", "Shang-Chi and the Legend of the Ten Rings",
    "Eternals", "Deadpool 2", "Deadpool & Wolverine", "Thunderbolts",
    "Moon Knight", "Ms. Marvel", "She-Hulk: Attorney at Law", "Hawkeye",
    "The Falcon and the Winter Soldier", "Secret Invasion", "Echo", "Agatha All Along",
    "Agents of S.H.I.E.L.D.", "Agent Carter", "Daredevil", "Daredevil: Born Again",
    "Jessica Jones", "Luke Cage", "Iron Fist", "The Defenders",
    "The Punisher", "Runaways", "Cloak & Dagger", "Legion",
    "The Gifted", "Helstrom", "Werewolf by Night", "Venom",
    "Venom: Let There Be Carnage", "Venom: The Last Dance", "Morbius", "Madame Web",
    "Kraven the Hunter", "Spider-Man: Across the Spider-Verse", "Spider-Man 2", "Spider-Man 3",
    "The Amazing Spider-Man", "The Amazing Spider-Man 2", "Man of Steel", "Batman v Superman: Dawn of Justice",
    "Zack Snyder's Justice League", "Suicide Squad", "The Suicide Squad", "Birds of Prey",
    "Shazam!", "Shazam! Fury of the Gods", "Black Adam", "Blue Beetle",
    "Aquaman and the Lost Kingdom", "Wonder Woman 1984", "The Batman", "Joker: Folie a Deux",
    "Creature Commandos", "Peacemaker", "Batman Begins", "The Dark Knight Rises",
    "Watchmen", "V for Vendetta", "Constantine", "Catwoman",
    "Green Lantern", "Gotham", "Pennyworth", "Krypton",
    "Stargirl", "Naomi", "The Penguin", "Injustice",
    "Batman: The Animated Series", "Justice League Unlimited", "The New Batman Adventures", "Batman Beyond",
    "Static Shock", "Superman: The Animated Series", "Ready or Not", "Scream",
    "Scream 2", "Scream 3", "Scream 4", "Scream VI",
    "Halloween", "A Nightmare on Elm Street", "Friday the 13th", "Child's Play",
    "Chucky", "The Texas Chain Saw Massacre", "Hellraiser", "Saw",
    "Jigsaw", "The Conjuring", "The Conjuring 2", "The Conjuring 3",
    "Annabelle", "Annabelle: Creation", "The Nun", "The Nun II",
    "La Llorona", "Insidious", "Insidious: Chapter 2", "Insidious: The Red Door",
    "Sinister", "The Exorcist", "The Omen", "Rosemary's Baby",
    "The Shining", "It", "It Chapter Two", "Pet Sematary",
    "The Ring", "The Grudge", "Paranormal Activity", "Hereditary",
    "Midsommar", "The Witch", "The Lighthouse", "Get Out",
    "Us", "Nope", "A Quiet Place", "A Quiet Place Part II",
    "A Quiet Place: Day One", "Bird Box", "The Babadook", "It Follows",
    "The Cabin in the Woods", "Cabin Fever", "The Descent", "28 Days Later",
    "28 Weeks Later", "28 Years Later", "World War Z", "Train to Busan",
    "The Purge", "The Purge: Anarchy", "M3GAN", "Smile",
    "Smile 2", "Barbarian", "Talk to Me", "Longlegs",
    "The Black Phone", "Sinners", "Terrifier", "Terrifier 2",
    "Terrifier 3", "Art the Clown", "Winnie-the-Pooh: Blood and Honey", "The Menu",
    "Fresh", "Bones and All", "Crimson Peak", "The Substance",
    "Immaculate", "The First Omen", "Abigail", "Cuckoo",
    "Speak No Evil", "Heretic", "Nosferatu", "Wolf Man",
    "The Invisible Man", "Doctor Sleep", "The Haunting in Connecticut", "Ouija",
    "The Autopsy of Jane Doe", "The Others", "The Sixth Sense", "The Blair Witch Project",
    "Evil Dead", "The Evil Dead", "Evil Dead Rise", "Army of Darkness",
    "Drag Me to Hell", "Poltergeist", "Candyman", "The Craft",
    "Jennifer's Body", "Fear Street", "Fear Street: 1994", "Fear Street: 1978",
    "Fear Street: 1666", "Happy Death Day", "Freaky", "Totally Killer",
    "Bodies Bodies Bodies", "X", "Pearl", "MaXXXine",
    "House of 1000 Corpses", "The Devil's Rejects", "The Hills Have Eyes", "Wrong Turn",
    "Final Destination", "Final Destination Bloodlines", "The Strangers", "You're Next",
    "Hush", "Gerald's Game", "1922", "In the Tall Grass",
    "Crawl", "The Meg", "The Shallows", "47 Meters Down",
    "The Autopsy", "Malignant", "Old", "Split",
    "Glass", "Unbreakable", "Signs", "The Village",
    "Lights Out", "The Boy", "Brahms: The Boy II", "The Woman in Black",
    "Mama", "The Orphanage", "Orphan", "Orphan: First Kill",
    "Goodnight Mommy", "The Wailing", "The Host", "Gonjiam",
    "Noroi", "Ju-On", "One Cut of the Dead", "His House",
    "The Ritual", "Apostle", "Gretel & Hansel", "Saint Maud",
    "Lamb", "Possessor", "Titane", "Raw",
    "Trap", "The Watchers", "Werewolves Within", "Vampires vs. the Bronx",
    "The Fog", "They Live", "Escape from New York", "Prince of Darkness",
    "In the Mouth of Madness", "Village of the Damned", "The Thing", "Christine",
    "Turning Red", "Luca", "Onward", "Soul",
    "Elemental", "Lightyear", "Cars", "Cars 2",
    "Cars 3", "A Bug's Life", "Ratatouille", "WALL-E",
    "Brave", "Monsters, Inc.", "Monsters University", "Toy Story 2",
    "Toy Story 3", "Toy Story 4", "Finding Dory", "The Good Dinosaur",
    "Incredibles 2", "Inside Out 2", "Frozen II", "Wreck-It Ralph",
    "Ralph Breaks the Internet", "Big Hero 6", "Zootopia", "Zootopia 2",
    "Wish", "Raya and the Last Dragon", "Strange World", "Bolt",
    "The Princess and the Frog", "Winnie the Pooh", "Chicken Little", "Meet the Robinsons",
    "Treasure Planet", "Atlantis: The Lost Empire", "Lilo & Stitch", "Brother Bear",
    "Home on the Range", "The Emperor's New Groove", "Fantasia", "Pinocchio",
    "Dumbo", "Bambi", "Cinderella", "Peter Pan",
    "Sleeping Beauty", "101 Dalmatians", "The Jungle Book", "The Aristocats",
    "Robin Hood", "The Rescuers", "The Fox and the Hound", "The Black Cauldron",
    "The Great Mouse Detective", "Oliver & Company", "Pocahontas", "The Hunchback of Notre Dame",
    "Hercules", "Mulan", "Tarzan", "Fantasia 2000",
    "Dinosaur", "Kung Fu Panda 2", "Kung Fu Panda 3", "Kung Fu Panda 4",
    "How to Train Your Dragon 2", "How to Train Your Dragon: The Hidden World", "Madagascar", "Madagascar 2",
    "Madagascar 3", "Penguins of Madagascar", "Shrek 2", "Shrek the Third",
    "Shrek Forever After", "Puss in Boots", "Puss in Boots: The Last Wish", "Megamind",
    "Monsters vs. Aliens", "Trolls", "Trolls World Tour", "Trolls Band Together",
    "The Croods", "The Croods: A New Age", "The Bad Guys", "The Bad Guys 2",
    "Abominable", "Spirit: Stallion of the Cimarron", "Sinbad: Legend of the Seven Seas", "The Prince of Egypt",
    "The Road to El Dorado", "Antz", "Bee Movie", "Shark Tale",
    "Over the Hedge", "Flushed Away", "Rise of the Guardians", "Home",
    "Captain Underpants", "Boss Baby", "The Boss Baby: Family Business", "Ruby Gillman, Teenage Kraken",
    "Migration", "Orion and the Dark", "The Wild Robot", "Sing",
    "Sing 2", "Despicable Me 2", "Despicable Me 3", "Despicable Me 4",
    "Minions", "Minions: The Rise of Gru", "The Secret Life of Pets", "The Secret Life of Pets 2",
    "The Lorax", "Hop", "Dr. Seuss' The Grinch", "Horton Hears a Who!",
    "Ice Age", "Ice Age: The Meltdown", "Ice Age: Dawn of the Dinosaurs", "Ice Age: Continental Drift",
    "Rio", "Rio 2", "Ferdinand", "Spies in Disguise",
    "The Peanuts Movie", "Blue Sky Studios", "Coraline", "ParaNorman",
    "The Boxtrolls", "Kubo and the Two Strings", "Missing Link", "Wendell & Wild",
    "Corpse Bride", "The Nightmare Before Christmas", "James and the Giant Peach", "Isle of Dogs",
    "Fantastic Mr. Fox", "The Book of Life", "Wallace & Gromit", "Chicken Run",
    "Shaun the Sheep Movie", "The Pirates! Band of Misfits", "Early Man", "Flow",
    "Klaus", "The Mitchells vs. the Machines", "The Sea Beast", "Nimona",
    "Guillermo del Toro's Pinocchio", "I Lost My Body", "Wolfwalkers", "The Secret of Kells",
    "Song of the Sea", "The Breadwinner", "Ernest & Celestine", "The Triplets of Belleville",
    "Persepolis", "Waltz with Bashir", "Sausage Party", "Anomalisa",
    "The Lego Movie", "The Lego Movie 2: The Second Part", "The Lego Batman Movie", "The Lego Ninjago Movie",
    "Playmobil: The Movie", "The Angry Birds Movie", "The Angry Birds Movie 2", "The Emoji Movie",
    "Wonder Park", "UglyDolls", "Smallfoot", "Storks",
    "Sherlock Gnomes", "Gnomeo & Juliet", "The Star", "Norm of the North",
    "The Super Mario Bros. Movie", "Sonic the Hedgehog 2", "Sonic the Hedgehog 3", "Detective Pikachu",
    "Uncharted", "Mortal Kombat", "Mortal Kombat 2", "Rampage",
    "Tomb Raider", "Warcraft", "Assassin's Creed", "Prince of Persia",
    "Silent Hill: Revelation", "Doom", "Max Payne", "Hitman",
    "Hitman: Agent 47", "Need for Speed", "Gran Turismo", "A Minecraft Movie",
    "Borderlands", "The King's Man", "Kingsman: The Secret Service", "Kingsman: The Golden Circle",
    "Transformers", "Transformers: Revenge of the Fallen", "Transformers: Dark of the Moon", "Transformers: Age of Extinction",
    "Transformers: The Last Knight", "Bumblebee", "Transformers: Rise of the Beasts", "Transformers One",
    "G.I. Joe: The Rise of Cobra", "G.I. Joe: Retaliation", "Snake Eyes", "Godzilla",
    "Godzilla: King of the Monsters", "Godzilla vs. Kong", "Godzilla x Kong: The New Empire", "Kong: Skull Island",
    "Godzilla Minus One", "Pacific Rim", "Pacific Rim: Uprising", "MonsterVerse",
    "Cloverfield", "10 Cloverfield Lane", "The Cloverfield Paradox", "Independence Day",
    "Independence Day: Resurgence", "War of the Worlds", "The Day After Tomorrow", "2012",
    "San Andreas", "Geostorm", "Twister", "Twisters",
    "Greenland", "Sharknado", "Snakes on a Plane", "Anaconda",
    "Deep Blue Sea", "Jaws", "The Karate Kid", "The Bourne Identity",
    "The Bourne Supremacy", "The Bourne Ultimatum", "The Bourne Legacy", "Jason Bourne",
    "Taken", "Taken 2", "Taken 3", "The Equalizer",
    "The Equalizer 2", "The Equalizer 3", "Nobody", "Atomic Blonde",
    "Salt", "Red", "The Accountant", "Sicario",
    "Sicario: Day of the Soldado", "The Old Guard", "Extraction", "Extraction 2",
    "The Gray Man", "6 Underground", "Red Notice", "Bullet Train",
    "The Fall Guy", "The Beekeeper", "Monkey Man", "Kate",
    "Gunpowder Milkshake", "Peppermint", "Ballerina", "John Wick: Chapter 2",
    "John Wick: Chapter 3 - Parabellum", "John Wick: Chapter 4", "The Raid", "The Raid 2",
    "Ip Man", "Ong-Bak", "Crouching Tiger, Hidden Dragon", "Hero",
    "House of Flying Daggers", "Shang-Chi", "Everything Everywhere All at Once", "Crazy Rich Asians",
    "The Hangover", "The Hangover Part II", "The Hangover Part III", "Bridesmaids",
    "Superbad", "21 Jump Street", "22 Jump Street", "Pineapple Express",
    "This Is the End", "Tropic Thunder", "Zoolander", "Anchorman",
    "Anchorman 2", "Step Brothers", "Talladega Nights", "Napoleon Dynamite",
    "Mean Girls", "Legally Blonde", "Legally Blonde 2", "Clueless",
    "Bring It On", "White Chicks", "Grown Ups", "Grown Ups 2",
    "Happy Gilmore", "Billy Madison", "Big Daddy", "The Waterboy",
    "Dumb and Dumber", "Ace Ventura: Pet Detective", "The Mask", "Liar Liar",
    "Bruce Almighty", "The Truman Show", "Groundhog Day", "Coming to America",
    "Coming 2 America", "The Nutty Professor", "Beverly Hills Cop", "Beverly Hills Cop: Axel F",
    "Bad Boys", "Bad Boys II", "Bad Boys for Life", "Bad Boys: Ride or Die",
    "Rush Hour", "Rush Hour 2", "Rush Hour 3", "Central Intelligence",
    "Jumanji", "Jumanji: Welcome to the Jungle", "Jumanji: The Next Level", "Night at the Museum",
    "The Mummy", "The Mummy Returns", "The Scorpion King", "National Treasure",
    "National Treasure: Book of Secrets", "The Da Vinci Code", "Angels & Demons", "Inferno",
    "Now You See Me", "Now You See Me 2", "Ocean's Eleven", "Ocean's Twelve",
    "Ocean's Thirteen", "Ocean's 8", "The Italian Job", "Baby Driver",
    "Drive", "Ford v Ferrari", "Le Mans '66", "Rush",
    "Days of Thunder", "Avatar: The Way of Water", "Avatar: Fire and Ash", "Blade Runner 2049",
    "Arrival", "Ex Machina", "Annihilation", "Gravity",
    "The Martian", "Ad Astra", "Passengers", "Elysium",
    "District 9", "Chappie", "Looper", "Edge of Tomorrow",
    "Oblivion", "Tron", "Tron: Legacy", "Tron: Ares",
    "Ready Player One", "The Fifth Element", "Total Recall", "Minority Report",
    "A.I. Artificial Intelligence", "Prometheus", "Alien: Covenant", "Alien: Romulus",
    "Aliens", "Alien 3", "Alien Resurrection", "The Predator",
    "Prey", "Alien vs. Predator", "Terminator 2: Judgment Day", "Terminator 3: Rise of the Machines",
    "Terminator Salvation", "Terminator Genisys", "Terminator: Dark Fate", "RoboCop",
    "Real Steel", "The Hunger Games: Catching Fire", "The Hunger Games: Mockingjay - Part 1", "The Hunger Games: Mockingjay - Part 2",
    "The Hunger Games: The Ballad of Songbirds & Snakes", "Maze Runner: The Scorch Trials", "Maze Runner: The Death Cure", "The 5th Wave",
    "Chaos Walking", "Mortal Engines", "Valerian and the City of a Thousand Planets", "Jupiter Ascending",
    "Cloud Atlas", "The Matrix Reloaded", "The Matrix Revolutions", "The Matrix Resurrections",
    "Dune: Part Two", "Dune: Part One", "Foundation", "Silo",
    "Snowpiercer", "Mickey 17", "Parasite", "Okja",
    "Memories of Murder", "The Chronicles of Narnia: Prince Caspian", "The Chronicles of Narnia: The Voyage of the Dawn Treader", "The Golden Compass",
    "Stardust", "The Princess Bride", "Willow", "Labyrinth",
    "The Dark Crystal", "The NeverEnding Story", "The Spiderwick Chronicles", "Bridge to Terabithia",
    "Percy Jackson & the Olympians: The Lightning Thief", "Percy Jackson: Sea of Monsters", "Beautiful Creatures", "The Mortal Instruments: City of Bones",
    "Vampire Academy", "Warm Bodies", "I Am Legend", "The Book of Eli",
    "Mad Max: Fury Road", "Furiosa: A Mad Max Saga", "Waterworld", "Escape from L.A.",
    "Children of Men", "The Road", "A Boy and His Dog", "Zombieland",
    "Zombieland: Double Tap", "Shaun of the Dead", "Hot Fuzz", "The World's End",
    "Scott Pilgrim vs. the World", "Kick-Ass", "Kick-Ass 2", "Hancock",
    "Chronicle", "Brightburn", "Super", "Defendor",
    "Sky High", "Mystery Men", "Push", "Jumper",
    "Lucy", "Limitless", "Harry Potter and the Sorcerer's Stone", "Harry Potter and the Chamber of Secrets",
    "Harry Potter and the Prisoner of Azkaban", "Harry Potter and the Goblet of Fire", "Harry Potter and the Order of the Phoenix", "Harry Potter and the Half-Blood Prince",
    "Harry Potter and the Deathly Hallows", "Fantastic Beasts and Where to Find Them", "Fantastic Beasts: The Crimes of Grindelwald", "Fantastic Beasts: The Secrets of Dumbledore",
    "Hogwarts Legacy", "The Lord of the Rings: The Fellowship of the Ring", "The Lord of the Rings: The Two Towers", "The Lord of the Rings: The Return of the King",
    "The Hobbit: An Unexpected Journey", "The Hobbit: The Desolation of Smaug", "The Hobbit: The Battle of the Five Armies", "The War of the Rohirrim",
    "Pirates of the Caribbean: The Curse of the Black Pearl", "Pirates of the Caribbean: Dead Man's Chest", "Pirates of the Caribbean: At World's End", "Pirates of the Caribbean: On Stranger Tides",
    "Pirates of the Caribbean: Dead Men Tell No Tales", "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe", "Star Wars: The Phantom Menace", "Star Wars: Attack of the Clones",
    "Star Wars: Revenge of the Sith", "Star Wars: A New Hope", "Star Wars: The Empire Strikes Back", "Star Wars: Return of the Jedi",
    "Star Wars: The Force Awakens", "Star Wars: The Last Jedi", "Star Wars: The Rise of Skywalker", "Rogue One: A Star Wars Story",
    "Solo: A Star Wars Story", "The Clone Wars", "Star Wars Rebels", "The Book of Boba Fett",
    "Obi-Wan Kenobi", "The Acolyte", "Skeleton Crew", "Star Wars: Visions",
    "The Bad Batch", "Tales of the Jedi", "Star Wars: Knights of the Old Republic", "Star Wars Jedi: Fallen Order",
    "Star Wars Jedi: Survivor", "Star Wars: Squadrons", "Star Wars Battlefront", "The Notebook",
    "A Walk to Remember", "Dear John", "The Vow", "Safe Haven",
    "The Lucky One", "The Longest Ride", "The Best of Me", "Me Before You",
    "Five Feet Apart", "Everything, Everything", "The Sun Is Also a Star", "Midnight Sun",
    "If I Stay", "Paper Towns", "Love, Simon", "The Perks of Being a Wallflower",
    "The Spectacular Now", "The Half of It", "All the Bright Places", "Chemical Hearts",
    "Words on Bathroom Walls", "Purple Hearts", "The Kissing Booth 2", "The Kissing Booth 3",
    "To All the Boys: P.S. I Still Love You", "To All the Boys: Always and Forever", "Tall Girl", "Tall Girl 2",
    "Sierra Burgess Is a Loser", "Do Revenge", "He's All That", "She's All That",
    "10 Things I Hate About You", "Anyone but You", "Set It Up", "Always Be My Maybe",
    "The Idea of You", "Ticket to Paradise", "Marry Me", "The Lost City",
    "Crazy, Stupid, Love", "Friends with Benefits", "No Strings Attached", "How to Lose a Guy in 10 Days",
    "The Proposal", "27 Dresses", "Bride Wars", "Bridget Jones's Diary",
    "Bridget Jones: The Edge of Reason", "Bridget Jones's Baby", "Bridget Jones: Mad About the Boy", "Notting Hill",
    "Love Actually", "Four Weddings and a Funeral", "About Time", "Yesterday",
    "The Holiday", "Serendipity", "Sleepless in Seattle", "You've Got Mail",
    "When Harry Met Sally", "Pretty Woman", "Ghost", "Dirty Dancing",
    "Grease", "Grease 2", "Footloose", "Flashdance",
    "Mamma Mia!", "Mamma Mia! Here We Go Again", "Enchanted", "Disenchanted",
    "The Princess Diaries", "The Princess Diaries 2: Royal Engagement", "Ella Enchanted", "A Cinderella Story",
    "Another Cinderella Story", "The Prince & Me", "What a Girl Wants", "Chasing Liberty",
    "The Lizzie McGuire Movie", "Freaky Friday", "Freakier Friday", "Herbie: Fully Loaded",
    "Confessions of a Teenage Drama Queen", "Aquamarine", "New York Minute", "Get a Clue",
    "13 Going on 30", "Just My Luck", "Sydney White", "John Tucker Must Die",
    "She's the Man", "Raise Your Voice", "Step Up", "Step Up 2: The Streets",
    "Step Up 3D", "Step Up Revolution", "Step Up All In", "Save the Last Save the Last Dance",
    "Center Stage", "Honey", "Stomp the Yard", "Coyote Ugly",
    "Burlesque", "Rock of Ages", "Pitch Perfect", "Pitch Perfect 2",
    "Pitch Perfect 3", "A Star Is Born", "Bohemian Rhapsody", "Rocketman",
    "Elvis", "Bob Marley: One Love", "Straight Outta Compton", "8 Mile",
    "Whiplash", "Sing Street", "Once", "Begin Again",
    "Nomadland", "The Shape of Water", "Moonlight", "Green Book",
    "Spotlight", "12 Years a Slave", "Birdman", "The Artist",
    "The King's Speech", "Slumdog Millionaire", "No Country for Old Men", "There Will Be Blood",
    "The Departed", "Million Dollar Baby", "Crash", "Chicago",
    "A Beautiful Mind", "Gladiator", "Gladiator II", "American Beauty",
    "Shakespeare in Love", "Titanic", "Braveheart", "Forrest Gump",
    "Schindler's List", "The Silence of the Lambs", "Dances with Wolves", "Rain Man",
    "CODA", "The Power of the Dog", "Belfast", "Drive My Way",
    "Drive My Car", "Minari", "The Father", "Sound of Metal",
    "Judas and the Black Messiah", "Promising Young Woman", "Mank", "Once Upon a Time in Hollywood",
    "1917", "Jojo Rabbit", "Marriage Story", "The Irishman",
    "The Whale", "The Banshees of Inisherin", "Tar", "Women Talking",
    "All Quiet on the Western Front", "Poor Things", "American Fiction", "The Holdovers",
    "The Zone of Interest", "Past Lives", "Killers of the Flower Moon", "Anatomy of a Fall",
    "Maestro", "Anora", "The Brutalist", "Conclave",
    "A Complete Unknown", "Emilia Perez", "Wicked: For Good", "Nickel Boys",
    "September 5", "A Real Pain", "Pulp Fiction", "Reservoir Dogs",
    "Kill Bill: Vol. 1", "Kill Bill: Vol. 2", "Django Unchained", "Inglourious Basterds",
    "The Hateful Eight", "Jackie Brown", "Death Proof", "Fight Club",
    "American Psycho", "A Clockwork Orange", "Trainspotting", "Se7en",
    "Zodiac", "Gone Girl", "The Girl with the Dragon Tattoo", "Prisoners",
    "Nightcrawler", "Goodfellas", "Casino", "The Godfather",
    "The Godfather Part II", "The Godfather Part III", "Scarface", "Heat",
    "Collateral", "The Town", "Gone Baby Gone", "Mystic River",
    "L.A. Confidential", "Chinatown", "The Usual Suspects", "Memento",
    "Shutter Island", "The Prestige", "Tenet", "Dunkirk",
    "The Big Lebowski", "Fargo", "O Brother, Where Art Thou?", "Burn After Reading",
    "True Grit", "Inside Llewyn Davis", "The Grand Budapest Hotel", "Moonrise Kingdom",
    "The French Dispatch", "Asteroid City", "The Royal Tenenbaums", "Rushmore",
    "The Life Aquatic with Steve Zissou", "Boogie Nights", "Magnolia", "Punch-Drunk Love",
    "The Master", "Phantom Thread", "Licorice Pizza", "Uncut Gems",
    "Good Time", "Home Alone", "Home Alone 2: Lost in New York", "Elf",
    "The Santa Clause", "The Polar Express", "A Christmas Story", "National Lampoon's Christmas Vacation",
    "The Grinch", "Jingle All the Way", "Deck the Halls", "Four Christmases",
    "Last Christmas", "Love Hard", "The Princess Switch", "A Christmas Prince",
    "Falling for Christmas", "The Parent Trap", "Matilda", "Matilda the Musical",
    "The BFG", "Charlie and the Chocolate Factory", "Willy Wonka & the Chocolate Factory", "Wonka",
    "The Witches", "Nanny McPhee", "Mary Poppins", "Mary Poppins Returns",
    "Bedknobs and Broomsticks", "Chitty Chitty Bang Bang", "Willy Wonka", "The Sound of Music",
    "Hook", "Pan", "Finding Neverland", "A Wrinkle in Time",
    "The Secret Garden", "The Little Princess", "Paddington", "Paddington 2",
    "Paddington in Peru", "Christopher Robin", "Peter Rabbit", "Peter Rabbit 2: The Runaway",
    "Stuart Little", "Stuart Little 2", "Cats & Dogs", "Beethoven",
    "Marley & Me", "A Dog's Purpose", "A Dog's Journey", "A Dog's Way Home",
    "Hachi: A Dog's Tale", "Free Willy", "Dolphin Tale", "War Horse",
    "Black Beauty", "Seabiscuit", "Secretariat", "Bend It Like Beckham",
    "Remember the Titans", "The Blind Side", "Coach Carter", "We Are Marshall",
    "Rudy", "Miracle", "Moneyball", "Field of Dreams",
    "A League of Their Own", "The Sandlot", "Space Jam", "Space Jam: A New Legacy",
    "Air Bud", "The Mighty Ducks", "Cool Runnings", "Happy Gilmore 2",
    "Mr. Robot", "True Detective", "Sharp Objects", "Big Little Lies",
    "Mare of Easttown", "The Undoing", "The Night Of", "Chernobyl",
    "Band of Brothers", "The Pacific", "Generation Kill", "Boardwalk Empire",
    "Deadwood", "Rome", "The Wire", "The Newsroom",
    "Silicon Valley", "Veep", "Curb Your Enthusiasm", "Entourage",
    "Six Feet Under", "Oz", "Carnivale", "Big Love",
    "The Leftovers", "Lovecraft Country", "Perry Mason", "The Gilded Age",
    "The White Lotus", "Industry", "Somebody Somewhere", "Hacks",
    "The Righteous Gemstones", "Winning Time", "Yellowjackets", "Dead to Me",
    "Mindhunter", "Narcos", "Narcos: Mexico", "Line of Duty",
    "Bodyguard", "Broadchurch", "Happy Valley", "Luther",
    "The Fall", "Killing Eve", "Slow Horses", "The Night Manager",
    "Endeavour", "Vera", "Midsomer Murders", "Inspector Morse",
    "Poirot", "Miss Marple", "Grantchester", "Death in Paradise",
    "Shetland", "Unforgotten", "The Sinner", "The Killing",
    "Bloodline", "Bosch", "True Detective: Night Country", "Yellowstone",
    "1883", "1923", "Lawmen: Bass Reeves", "Landman",
    "Tulsa King", "Mayor of Kingstown", "Justified", "Sons of Anarchy",
    "Mayans M.C.", "Vikings", "Vikings: Valhalla", "The Last Kingdom",
    "Britannia", "Knightfall", "Barbarians", "Marco Polo",
    "Spartacus", "Black Sails", "Poldark", "Sanditon",
    "Belgravia", "Downton Abbey: A New Era", "The Buccaneers", "Dickinson",
    "Catherine the Great", "Victoria", "The Tudors", "Wolf Hall",
    "The White Queen", "The White Princess", "The Spanish Princess", "Medici",
    "Borgia", "The Borgias", "The Serpent Queen", "Mary & George",
    "My Lady Jane", "A Discovery of Witches", "Abbott Elementary", "What We Do in the Shadows",
    "Ghosts", "Ghosts (UK)", "Schitt's Creek", "Kim's Convenience",
    "Superstore", "The Good Place", "30 Rock", "Arrested Development",
    "It's Always Sunny in Philadelphia", "New Girl", "The Mindy Project", "Happy Endings",
    "Cougar Town", "Scrubs", "Modern Family", "Frasier",
    "Cheers", "Seinfeld", "Everybody Loves Raymond", "The King of Queens",
    "Two and a Half Men", "Malcolm in the Middle", "That '70s Show", "That '90s Show",
    "The Fresh Prince of Bel-Air", "Fuller House", "Full House", "Family Matters",
    "Saved by the Bell", "Home Improvement", "Roseanne", "The Conners",
    "Married... with Children", "Ted", "Reservation Dogs", "Rutherford Falls",
    "Atlanta", "Insecure", "Master of None", "Girls",
    "Broad City", "Pen15", "Ramy", "Dave",
    "The Bear", "Shrinking", "Loot", "Palm Royale",
    "Physical", "Mythic Quest", "For All Mankind", "Severance",
    "Invasion", "See", "Defending Jacob", "Black Bird",
    "The Morning Show", "Little America", "Home Before Dark", "Central Park",
    "Family Guy", "American Dad!", "The Cleveland Show", "Bob's Burgers",
    "The Simpsons", "Futurama", "King of the Hill", "Disenchantment",
    "Big Mouth", "Human Resources", "F Is for Family", "Paradise PD",
    "Brickleberry", "Archer", "Solar Opposites", "Inside Job",
    "Close Enough", "Final Space", "Tuca & Bertie", "Undone",
    "Pantheon", "Common Side Effects", "Scavengers Reign", "Primal",
    "Blue Eye Samurai", "Love, Death & Robots", "Robot Chicken", "Aqua Teen Hunger Force",
    "The Venture Bros.", "Metalocalypse", "Superjail!", "Squidbillies",
    "Moral Orel", "Smiling Friends", "Battlestar Galactica", "Firefly",
    "Stargate SG-1", "Stargate Atlantis", "Stargate Universe", "Farscape",
    "Babylon 5", "Fringe", "Warehouse 13", "Eureka",
    "Continuum", "Orphan Black", "Sense8", "Altered Carbon",
    "Black Mirror", "Electric Dreams", "Devs", "Tales from the Loop",
    "Raised by Wolves", "Humans", "Real Humans", "Person of Interest",
    "Travelers", "12 Monkeys", "Colony", "Falling Skies",
    "The 4400", "Roswell", "V", "Star Trek: Deep Space Nine",
    "Star Trek: Voyager", "Star Trek: Enterprise", "Star Trek: Discovery", "Star Trek: Picard",
    "Star Trek: Strange New Worlds", "Star Trek: Lower Decks", "Star Trek: Prodigy", "Doctor Who (Classic)",
    "Torchwood", "Class", "Primeval", "Being Human",
    "In the Flesh", "The Nevers", "Carnival Row", "Cursed",
    "The Witcher: Blood Origin", "The Magicians", "The Shannara Chronicles", "Emerald City",
    "Once Upon a Time in Wonderland", "Grimm", "Sleepy Hollow", "Van Helsing",
    "Wynonna Earp", "The Winchesters", "Ash vs Evil Dead", "Interview with the Vampire",
    "Mayfair Witches", "Let the Right One In", "The Passage", "NOS4A2",
    "Castle Rock", "The Outsider", "Chapelwaite", "From",
    "Servant", "The Terror", "Wayward Pines", "Manifest",
    "The Wilds", "The Order", "October Faction", "Sweet Tooth",
    "The Boys Presents: Diabolical", "Paper Girls", "Night Sky", "Halo",
    "Cyberpunk: Edgerunners", "Twisted Metal", "The Cuphead Show!", "Castlevania: Nocturne",
    "Tekken: Bloodline", "DOTA: Dragon's Blood", "Sonic Prime", "The Legend of Vox Machina",
    "The Dragon Prince", "Trollhunters", "3Below", "Wizards",
    "Kipo and the Age of Wonderbeasts", "Hilda", "The Hollow", "Kid Cosmic",
    "RuPaul's Drag Race", "Survivor", "Big Brother", "The Amazing Race",
    "Love Island", "The Bachelor", "The Bachelorette", "Too Hot to Handle",
    "Love Is Blind", "The Circle", "Selling Sunset", "Vanderpump Rules",
    "The Real Housewives", "Keeping Up with the Kardashians", "The Kardashians", "Queer Eye",
    "Nailed It!", "The Great British Bake Off", "MasterChef", "Top Chef",
    "Hell's Kitchen", "Chopped", "Iron Chef", "The Masked Singer",
    "The Voice", "American Idol", "America's Got Talent", "Dancing with the Stars",
    "So You Think You Can Dance", "Project Runway", "America's Next Top Model", "Shark Tank",
    "Antiques Roadshow", "The Poppy War", "The Burning God", "Babel",
    "Yellowface", "The Priory of the Orange Tree", "A Day of Fallen Night", "The Broken Earth",
    "The Fifth Season", "The Poppy War Trilogy", "Gideon the Ninth", "The Locked Tomb",
    "This Is How You Lose the Time War", "The Atlas Six", "The Invisible Life of Addie LaRue", "The Starless Sea",
    "The Night Circus", "Ninth House", "Hell Bent", "Circe",
    "The Song of Achilles", "Ariadne", "Stone Blind", "A Thousand Ships",
    "Elektra", "Clytemnestra", "The Silence of the Girls", "Lore",
    "Daughter of the Moon Goddess", "The Jasmine Throne", "The City of Brass", "The Daevabad Trilogy",
    "The Wrath and the Dawn", "Flame in the Mist", "The Bird and the Blade", "Spin the Dawn",
    "These Violent Delights", "Our Violent Ends", "Chloe Gong", "Foul Lady Fortune",
    "The Gilded Wolves", "The Bone Witch", "Legendborn", "Bloodmarked",
    "Cemetery Boys", "The Sunbearer Trials", "Iron Widow", "Zachary Ying and the Dragon Emperor",
    "Descendant of the Crane", "Girls of Paper and Fire", "The Astonishing Color of After", "Loveless",
    "Radio Silence", "Solitaire", "I Was Born for This", "Nick and Charlie",
    "Aristotle and Dante Discover the Secrets of the Universe", "Simon vs. the Homo Sapiens Agenda", "Leah on the Offbeat", "The Upside of Unrequited",
    "What If It's Us", "Here's to Us", "They Both Die at the End", "The First to Die at the End",
    "History Is All You Left Me", "More Happy Than Not", "Infinity Son", "Red, White & Royal Blue",
    "One Last Stop", "I Kissed Shara Wheeler", "The Seven Husbands of Evelyn Hugo", "Daisy Jones & the Six",
    "Malibu Rising", "Carrie Soto Is Back", "The Love Hypothesis", "Love on the Brain",
    "Check & Mate", "Icebreaker", "Icebreaker (Hannah Grace)", "Twisted Love",
    "Twisted Games", "Twisted Hate", "Twisted Lies", "Punk 57",
    "Corrupt", "Credence", "Bully", "It Ends with Us",
    "It Starts with Us", "Verity", "Ugly Love", "November 9",
    "Reminders of Him", "Confess", "Hopeless", "Regretting You",
    "Too Late", "Heart Bones", "Layla", "A Little Life",
    "Conversations with Friends", "Beautiful World, Where Are You", "Intermezzo", "The Secret History",
    "The Goldfinch", "The Little Friend", "Where the Crawdads Sing", "The Nightingale",
    "The Four Winds", "The Great Alone", "Lessons in Chemistry", "Tomorrow, and Tomorrow, and Tomorrow",
    "A Man Called Ove", "The Midnight Library", "Klara and the Sun", "Never Let Me Go",
    "The Remains of the Day", "Beloved", "The Color Purple", "Their Eyes Were Watching God",
    "The Kite Runner", "A Thousand Splendid Suns", "Life of Pi", "The Alchemist",
    "The Curious Incident of the Dog in the Night-Time", "Room", "Nine Perfect Strangers", "The Husband's Secret",
    "The Girl on the Train", "The Woman in the Window", "The Silent Patient", "The Maidens",
    "The Housemaid", "The Housemaid's Secret", "Behind Closed Doors", "The Wife Between Us",
    "The Couple Next Door", "In a Dark, Dark Wood", "The Woman in Cabin 10", "The Turn of the Key",
    "One by One", "The It Girl", "Rock Paper Scissors", "None of This Is True",
    "Then She Was Gone", "The Family Upstairs", "The Guest List", "The Hunting Party",
    "The Paris Apartment", "The Sanatorium", "The Thursday Murder Club", "The Man Who Died Twice",
    "The Bullet That Missed", "The Last Devil to Die", "A Good Girl's Guide to Murder", "Good Girl, Bad Blood",
    "As Good as Dead", "One of Us Is Lying", "One of Us Is Next", "Two Can Keep a Secret",
    "The Cousins", "You'll Be the Death of Me", "Nothing More to Tell", "We Were Liars",
    "Family of Liars", "The Inheritance Games", "The Hawthorne Legacy", "The Final Gambit",
    "The Brothers Hawthorne", "Truly Devious", "The Naturals", "Karen M. McManus",
    "People We Meet on Vacation", "Beach Read", "Book Lovers", "Happy Place",
    "Funny Story", "Emily Henry", "The Spanish Love Deception", "The American Roommate Experiment",
    "Part of Your World", "Meet Cute Diary", "The Charm Offensive", "Delilah Green Doesn't Care",
    "Written in the Stars", "The Unhoneymooners", "In a Holidaze", "The Hating Game",
    "99 Percent Mine", "The Kiss Quotient", "The Bride Test", "The Heart Principle",
    "Get a Life, Chloe Brown", "Take a Hint, Dani Brown", "Act Your Age, Eve Brown", "A Court of Mist and Fury",
    "A Court of Wings and Ruin", "A Court of Frost and Starlight", "A Court of Silver Flames", "House of Earth and Blood",
    "House of Sky and Breath", "House of Flame and Shadow", "Assassin's Blade", "Crown of Midnight",
    "Heir of Fire", "Queen of Shadows", "Empire of Storms", "Tower of Dawn",
    "Kingdom of Ash", "Iron Flame", "Onyx Storm", "Powerless",
    "Reckless", "Lawless", "Serpent & Dove", "Blood & Honey",
    "Gods & Monsters", "The Ballad of Never After", "Once Upon a Broken Heart", "A Curse for True Love",
    "Zodiac Academy", "The Fae Isles", "From Blood and Ash", "A Kingdom of Flesh and Fire",
    "The Crown of Gilded Bones", "The War of Two Queens", "A Soul of Ash and Blood", "A Shadow in the Ember",
    "Blood and Ash", "The Wicked King", "The Queen of Nothing", "The Stolen Heir",
    "The Prisoner's Throne", "Divine Rivals", "Ruthless Vows", "The Atlas Paradox",
    "The Atlas Complex", "A Deadly Education", "The Last Graduate", "The Golden Enclaves",
    "Scholomance", "Uprooted", "Spinning Silver", "The Bear and the Nightingale",
    "The Girl in the Tower", "The Winter of the Witch", "The Ten Thousand Doors of January", "The Once and Future Witches",
    "The Hazel Wood", "The Wicked Deep", "Winterwood", "House of Salt and Sorrows",
    "Small Favors", "Vicious", "Vengeful", "A Darker Shade of Magic",
    "A Gathering of Shadows", "A Conjuring of Light", "Shades of Magic", "The Fragile Threads of Power",
    "This Savage Song", "Our Dark Duet", "The Anatomy of Curiosity", "Romeo and Juliet",
    "Hamlet", "Macbeth", "A Midsummer Night's Dream", "Othello",
    "King Lear", "The Tempest", "Much Ado About Nothing", "Twelfth Night",
    "Julius Caesar", "The Odyssey", "The Iliad", "The Aeneid",
    "Beowulf", "The Canterbury Tales", "Paradise Lost", "The Divine Comedy",
    "Don Quixote", "Moby-Dick", "The Scarlet Letter", "The Adventures of Huckleberry Finn",
    "The Adventures of Tom Sawyer", "Great Expectations", "A Tale of Two Cities", "Oliver Twist",
    "David Copperfield", "A Christmas Carol", "Emma", "Sense and Sensibility",
    "Persuasion", "Mansfield Park", "Northanger Abbey", "The Picture of Dorian Gray",
    "The Importance of Being Earnest", "The Strange Case of Dr Jekyll and Mr Hyde", "The War of the Worlds", "The Time Machine",
    "Twenty Thousand Leagues Under the Sea", "Journey to the Center of the Earth", "Around the World in Eighty Days", "The Count of Monte Cristo",
    "The Three Musketeers", "The Hunchback of Notre-Dame", "Crime and Punishment", "The Brothers Karamazov",
    "Anna Karenina", "War and Peace", "The Master and Margarita", "One Hundred Years of Solitude",
    "The Metamorphosis", "The Trial", "Heart of Darkness", "Lord of the Flies",
    "Animal Farm", "Of Mice and Men", "The Grapes of Wrath", "East of Eden",
    "The Catcher in the Rye", "The Bell Jar", "Slaughterhouse-Five", "Catch-22",
    "On the Road", "A Farewell to Arms", "The Old Man and the Sea", "The Sun Also Rises",
    "Invisible Man", "Native Son", "Go Tell It on the Mountain", "The Awakening",
    "The House on Mango Street", "The Outsiders", "The Chocolate War", "A Separate Peace",
    "Rebecca", "The Virgin Suicides", "Bakuman", "Death Parade",
    "91 Days", "Baccano!", "Durarara!!", "Monster",
    "20th Century Boys", "Pluto", "Kaiji", "Akagi",
    "Golden Kamuy", "Kingdom", "Historie", "Vagabond",
    "Real", "Slam Dunk", "The First Slam Dunk", "Ping Pong the Animation",
    "Megalo Box", "Ashita no Joe", "Hajime no Ippo", "Baki the Grappler",
    "Grappler Baki", "Kengan Ashura", "Kengan Omega", "Record of Ragnarok",
    "Fist of the North Star", "Saint Seiya", "Knights of the Zodiac", "Ranking of Kings",
    "The Eminence in Shadow", "Log Horizon", "The Devil Is a Part-Timer!", "Grimgar of Fantasy and Ash",
    "Grimoire of Zero", "Death March to the Parallel World Rhapsody", "In Another World with My Smartphone", "Wise Man's Grandchild",
    "How Not to Summon a Demon Lord", "Cautious Hero", "The Saga of Tanya the Evil", "Ascendance of a Bookworm",
    "By the Grace of the Gods", "So I'm a Spider, So What?", "Reincarnated as a Sword", "The Faraway Paladin",
    "Farming Life in Another World", "Campfire Cooking in Another World with My Absurd Skill", "I've Been Killing Slimes for 300 Years", "Jobless Reincarnation",
    "The Ancient Magus' Bride", "Somali and the Forest Spirit", "To Your Eternity", "March Comes in Like a Lion",
    "Barakamon", "Silver Spoon", "Yotsuba&!", "Nichijou",
    "Azumanga Daioh", "Lucky Star", "K-On!", "Hidamari Sketch",
    "Non Non Biyori", "Laid-Back Camp", "A Place Further than the Universe", "Girls' Last Tour",
    "Sound! Euphonium", "Hyouka", "The Melancholy of Haruhi Suzumiya", "Daily Lives of High School Boys",
    "Grand Blue", "Prison School", "Golden Boy", "Nozaki-kun",
    "Monthly Girls' Nozaki-kun", "Wotakoi", "Recovery of an MMO Junkie", "My Dress-Up Darling",
    "Rent-A-Girlfriend", "Domestic Girlfriend", "Nisekoi", "The Quintessential Quintuplets",
    "We Never Learn", "Gotoubun no Hanayome", "Rascal Does Not Dream of Bunny Girl Senpai", "The Pet Girl of Sakurasou",
    "Golden Time", "White Album 2", "Little Busters!", "Kanon",
    "Air", "Charlotte", "Plastic Memories", "Anohana",
    "Tsuki ga Kirei", "Just Because!", "After the Rain", "O Maidens in Your Savage Season",
    "Bloom Into You", "Adachi and Shimamura", "Citrus", "Whispered Words",
    "Yagate Kimi ni Naru", "Wandering Son", "Sweet Blue Flowers", "Kase-san and Morning Glories",
    "I Married My Best Friend to Shut My Parents Up", "Cardcaptor Sakura: Clear Card", "Magic Knight Rayearth", "Tsubasa: Reservoir Chronicle",
    "xxxHOLiC", "Chobits", "Clover", "Angelic Layer",
    "Kobato", "Legal Drug", "RG Veda", "X/1999",
    "Tokyo Babylon", "CLAMP School Detectives", "Sakura Wars", "Revolutionary Girl Utena",
    "Paradise Kiss", "Peach Girl", "Boys Over Flowers", "Hana Yori Dango",
    "Kimi ni Todoke", "Say I Love You", "My Little Monster", "Lovely Complex",
    "Special A", "Maid Sama!", "Vampire Knight", "Dengeki Daisy",
    "Hana-Kimi", "Akatsuki no Yona", "Snow White with the Red Hair", "The Story of Saiunkoku",
    "Kamisama Kiss", "Fruits Basket: Prelude", "Natsume's Book of Friends", "Kamichama Karin",
    "Shugo Chara!", "Tokyo Mew Mew", "Mermaid Melody", "Pretty Cure",
    "Futari wa Pretty Cure", "Smile PreCure!", "Sailor Moon Crystal", "Wedding Peach",
    "Magical DoReMi", "Ojamajo Doremi", "Little Witch Academia", "Flip Flappers",
    "Puella Magi Madoka Magica", "Yuki Yuna Is a Hero", "Magical Girl Raising Project", "Magical Girl Site",
    "Symphogear", "Nanoha", "Magical Girl Lyrical Nanoha", "Lyrical Nanoha",
    "Princess Tutu", "Kill la Kill", "Gurren Lagann", "Promare",
    "Darling in the Franxx", "Aldnoah.Zero", "Cross Ange", "Valvrave the Liberator",
    "Guilty Crown", "Mardock Scramble", "Psycho-Pass", "Ghost in the Shell",
    "Ghost in the Shell: Stand Alone Complex", "Serial Experiments Lain", "Texhnolyze", "Ergo Proxy",
    "Boogiepop Phantom", "Paranoia Agent", "Perfect Blue", "Millennium Actress",
    "Tokyo Godfathers", "Paprika", "Wolf Children", "The Boy and the Beast",
    "Mirai", "Belle", "Summer Wars", "The Girl Who Leapt Through Time",
    "The Tale of the Princess Kaguya", "Only Yesterday", "Whisper of the Heart", "The Cat Returns",
    "Ponyo", "Kiki's Delivery Service", "Castle in the Sky", "Nausicaa of the Valley of the Wind",
    "Porco Rosso", "The Wind Rises", "From Up on Poppy Hill", "Grave of the Fireflies",
    "Pom Poko", "The Secret World of Arrietty", "When Marnie Was There", "Earwig and the Witch",
    "The Boy and the Heron", "Suzume", "Children Who Chase Lost Voices", "5 Centimeters per Second",
    "The Garden of Words", "The Place Promised in Our Early Days", "Maquia: When the Promised Flower Blooms", "In This Corner of the World",
    "A Whisker Away", "Words Bubble Up Like Soda Pop", "Josee, the Tiger and the Fish", "The Deer King",
    "Ride Your Wave", "Lu Over the Wall", "Night Is Short, Walk On Girl", "The Tatami Galaxy",
    "Keep Your Hands Off Eizouken!", "Devilman", "Cyborg 009", "Astro Boy",
    "Gigantor", "Space Battleship Yamato", "Mobile Suit Gundam", "Gundam Wing",
    "Gundam SEED", "Gundam 00", "Iron-Blooded Orphans", "Gundam: The Witch from Mercury",
    "Mobile Suit Gundam: The Origin", "Macross", "Robotech", "Escaflowne",
    "The Vision of Escaflowne", "Full Metal Panic!", "Martian Successor Nadesico", "Outlaw Star",
    "Trigun Stampede", "Space Dandy", "Michiko & Hatchin", "Samurai Champloo",
    "Afro Samurai", "Basilisk", "Ninja Scroll", "Sword of the Stranger",
    "Dororo", "Blade of the Immortal", "House of Five Leaves", "Mononoke",
    "Ayakashi", "Requiem for the Phantom", "Darker than Black", "Eden of the East",
    "The Big O", "RahXephon", "Gunslinger Girl", "Noir",
    "Madlax", "El Cazador de la Bruja", "Black Lagoon", "Jormungand",
    "Canaan", "Phantom", "Gangsta.", "Btooom!",
    "Deadman Wonderland", "Elfen Lied", "Future Diary", "Mirai Nikki",
    "Higurashi: When They Cry", "Umineko: When They Cry", "School Days", "Corpse Party",
    "Another", "Shiki", "Ghost Hunt", "Hell Girl",
    "Yamishibai", "Junji Ito Collection", "Uzumaki", "Tomie",
    "Gyo", "Remina", "The Enigma of Amigara Fault", "PTSD Radio",
    "Solo Leveling: Ragnarok", "The Legend of the Northern Blade", "Nano Machine", "Return of the Mount Hua Sect",
    "Second Life Ranker", "The Great Mage Returns After 4000 Years", "A Returner's Magic Should Be Special", "Overgeared",
    "The Gamer", "Hardcore Leveling Warrior", "Volcanic Age", "Peerless Dad",
    "Terror Man", "Sweet Home", "Bastard", "Shotgun Boy",
    "Hive", "Pigpen", "The Horizon", "Distant Sky",
    "All of Us Are Dead", "0.0000001% Mob Character", "The Boxer", "Weak Hero",
    "How to Fight", "Viral Hit", "Study Group", "Wind Breaker",
    "Free Draw", "Get Schooled", "Eleceed", "Hooky",
    "Purple Hyacinth", "Beware of the Villainess!", "Death Is the Only Ending for the Villainess", "The Villainess Reverses the Hourglass",
    "The Villainess Turns the Hourglass", "Doctor Elise: The Royal Lady with the Lamp", "Suddenly Became a Princess One Day", "The Abandoned Empress",
    "Empress of Another World", "Daughter of the Emperor", "The Younger Male Lead Fell for Me Before the Destruction", "Not Sew Wicked Stepmom",
    "The Perks of Being an S-Class Heroine", "Reformation of the Deadbeat Noble", "Trash of the Count's Family", "The Reason Why Raeliana Ended Up at the Duke's Mansion",
    "The Duke's Teacher", "Kill the Villainess", "The Villainess Is a Marionette", "I'm the Max-Level Newbie",
    "SSS-Class Suicide Hunter", "The S-Classes That I Raised", "Solo Max-Level Newbie", "Damn Reincarnation",
    "The Novel's Extra", "Omniscient Reader", "Your Throne", "Under the Oak Tree",
    "Reverse Villain", "The World After the Fall", "Return of the Blossoming Blade", "Chronicles of the Demon Faction",
    "Tomb Raider King", "Everyone Else Is a Returnee", "The Tutorial Is Too Hard", "Kill the Hero",
    "A Business Proposal", "Cheese in the Trap", "Yumi's Cells", "Odd Girl Out",
    "About Death", "Age Matters", "Boyfriend of the Dead", "Winter Woods",
    "The Doctor Is Too Good", "Semantic Error", "Sign", "Cherry Blossoms After Winter",
    "Bj Alex", "Jinx", "Payback", "Love for Sale",
    "Define the Relationship", "Warehouse", "Blood Bank", "Killing Stalking",
    "Painter of the Night", "The Blood of Madam Giselle", "Legs That Won't Walk", "At the End of the Road",
    "No Love Zone", "To Take an Enemy's Heart", "Love Shuttle", "Sign (BL)",
    "Roommates", "Here U Are", "19 Days", "Their Story",
    "Tan Jiu", "SHWD", "Punderworld", "Muted",
    "Castle Swimmer", "The Kiss Bet", "Cursed Princess Club", "My Deepest Secret",
    "Down to Earth", "Wet Sand", "Boyfriends.", "Heartstopper (Webtoon)",
    "The Doctors Are Out", "Small World", "Gourmet Hound", "The Last of Us Part II",
    "Ghost of Tsushima", "Marvel's Spider-Man", "Marvel's Spider-Man 2", "Marvel's Spider-Man: Miles Morales",
    "Marvel's Wolverine", "Uncharted 2: Among Thieves", "Uncharted 3: Drake's Deception", "Uncharted 4: A Thief's End",
    "The Last of Us Part I", "God of War Ragnarok", "Gran Turismo 7", "Death Stranding",
    "Death Stranding 2", "Days Gone", "inFamous", "The Order: 1886",
    "Concord", "Astro Bot", "Ratchet & Clank", "Ratchet & Clank: Rift Apart",
    "Sackboy: A Big Adventure", "LittleBigPlanet", "Gravity Rush", "Demon's Souls",
    "Sekiro: Shadows Die Twice", "Armored Core VI: Fires of Rubicon", "Nioh", "Nioh 2",
    "Lies of P", "Wo Long: Fallen Dynasty", "Stellar Blade", "Black Myth: Wukong",
    "Final Fantasy XVI", "Final Fantasy VII Remake", "Final Fantasy VII Rebirth", "Final Fantasy XV",
    "Final Fantasy XIV", "Final Fantasy X", "Final Fantasy IX", "Final Fantasy VIII",
    "Final Fantasy VI", "Final Fantasy IV", "Final Fantasy Tactics", "Crisis Core: Final Fantasy VII",
    "Kingdom Hearts II", "Kingdom Hearts III", "Kingdom Hearts: Birth by Sleep", "Kingdom Hearts: Chain of Memories",
    "Chrono Trigger", "Chrono Cross", "Secret of Mana", "Trials of Mana",
    "Xenogears", "Xenosaga", "Xenoblade Chronicles 2", "Xenoblade Chronicles 3",
    "Dragon Quest", "Dragon Quest XI", "Ni no Kuni", "Ni no Kuni II",
    "Tales of Symphonia", "Tales of Vesperia", "Tales of Berseria", "Tales of Arise",
    "Tales of the Abyss", "Star Ocean", "Octopath Traveler", "Octopath Traveler II",
    "Bravely Default", "Triangle Strategy", "Fire Emblem: Awakening", "Fire Emblem Fates",
    "Fire Emblem: Path of Radiance", "Fire Emblem Engage", "Fire Emblem Heroes", "Advance Wars",
    "Disgaea", "Valkyria Chronicles", "13 Sentinels: Aegis Rim", "Persona 3",
    "Persona 4", "Persona 4 Golden", "Persona 5 Royal", "Persona 5 Strikers",
    "Shin Megami Tensei", "Shin Megami Tensei V", "Catherine", "Etrian Odyssey",
    "Metaphor: ReFantazio", "The Legend of Heroes: Trails in the Sky", "Trails of Cold Steel", "Trails from Zero",
    "Ys", "Monster Hunter", "Monster Hunter: World", "Monster Hunter Rise",
    "Monster Hunter Wilds", "Pokemon Scarlet and Violet", "Pokemon Sword and Shield", "Pokemon Legends: Arceus",
    "Pokemon Sun and Moon", "Pokemon X and Y", "Pokemon Black and White", "Pokemon Diamond and Pearl",
    "Pokemon Ruby and Sapphire", "Pokemon Gold and Silver", "Pokemon Red and Blue", "Pokemon GO",
    "Pokemon Mystery Dungeon", "Pokemon Unite", "Temtem", "Nexomon",
    "Coromon", "Cassette Beasts", "Monster Sanctuary", "Ooblets",
    "Slime Rancher", "Slime Rancher 2", "Spiritfarer", "Cult of the Lamb",
    "Dave the Diver", "Coral Island", "Fields of Mistria", "My Time at Portia",
    "My Time at Sandrock", "Story of Seasons", "Harvest Moon", "Rune Factory",
    "Rune Factory 4", "Rune Factory 5", "Graveyard Keeper", "Moonstone Island",
    "Sun Haven", "Wylde Flowers", "Roots of Pacha", "Littlewood",
    "Potion Craft", "Potionomics", "Travellers Rest", "Grimoire Groves",
    "Kynseed", "Ova Magica", "The Sims", "The Sims 2",
    "The Sims 3", "The Sims 4", "SimCity", "Cities: Skylines",
    "RollerCoaster Tycoon", "Planet Coaster", "Planet Zoo", "Zoo Tycoon",
    "Two Point Hospital", "Two Point Campus", "Frostpunk", "Frostpunk 2",
    "Banished", "Rimworld", "Dwarf Fortress", "Factorio",
    "Satisfactory", "Oxygen Not Included", "Timberborn", "Manor Lords",
    "Kenshi", "Age of Empires", "Age of Empires II", "Age of Empires IV",
    "Age of Mythology", "Company of Heroes", "Command & Conquer", "StarCraft",
    "StarCraft II", "Warcraft III", "Warhammer 40,000: Dawn of War", "Total War: Warhammer",
    "Total War: Three Kingdoms", "Total War: Rome", "Civilization", "Civilization VI",
    "Civilization V", "Sid Meier's Civilization", "Crusader Kings III", "Europa Universalis IV",
    "Hearts of Iron IV", "Stellaris", "Victoria 3", "XCOM",
    "XCOM 2", "XCOM: Enemy Unknown", "Into the Breach", "FTL: Faster Than Light",
    "Darkest Dungeon", "Darkest Dungeon II", "Hades II", "Dead Cells",
    "Rogue Legacy", "Hyper Light Drifter", "Enter the Gungeon", "The Binding of Isaac",
    "Risk of Rain", "Risk of Rain 2", "Nuclear Throne", "Spelunky",
    "Spelunky 2", "Gungeon", "Noita", "Loop Hero",
    "Backpack Hero", "Peglin", "Luck be a Landlord", "Inscryption",
    "Cultist Simulator", "Sunless Sea", "Sunless Skies", "Fallen London",
    "Planescape: Torment", "Baldur's Gate", "Baldur's Gate II", "Neverwinter Nights",
    "Divinity: Original Sin", "Divinity: Original Sin II", "Pillars of Eternity", "Pathfinder: Kingmaker",
    "Pathfinder: Wrath of the Righteous", "Tyranny", "Wasteland 3", "Fallout 3",
    "Fallout: New Vegas", "Fallout 4", "Fallout 76", "The Elder Scrolls III: Morrowind",
    "The Elder Scrolls IV: Oblivion", "The Elder Scrolls Online", "Starfield", "Avowed",
    "Dragon Age: Origins", "Dragon Age II", "Dragon Age: Inquisition", "Dragon Age: The Veilguard",
    "Mass Effect 2", "Mass Effect 3", "Mass Effect: Andromeda", "Mass Effect Legendary Edition",
    "Star Wars: The Old Republic", "Knights of the Old Republic II", "Jade Empire", "Anthem",
    "Destiny 2", "Warframe", "The Division", "The Division 2",
    "Borderlands 2", "Borderlands 3", "Tiny Tina's Wonderlands", "Borderlands: The Pre-Sequel",
    "Gearbox", "Left 4 Dead", "Left 4 Dead 2", "Back 4 Blood",
    "Payday 2", "Payday 3", "Rainbow Six Siege", "Rainbow Six Extraction",
    "Escape from Tarkov", "Hunt: Showdown", "DayZ", "Rust",
    "ARK: Survival Evolved", "ARK: Survival Ascended", "Conan Exiles", "Valheim",
    "Grounded", "The Forest", "Sons of the Forest", "Green Hell",
    "Raft", "Subnautica: Below Zero", "No Man's Sky", "Astroneer",
    "Deep Rock Galactic", "Sea of Thieves", "Sea of Stars", "Overwatch 2",
    "Paladins", "Titanfall", "Titanfall 2", "Battlefield",
    "Battlefield 1", "Battlefield 2042", "Call of Duty", "Call of Duty: Modern Warfare",
    "Call of Duty: Warzone", "Call of Duty: Black Ops", "Call of Duty: Black Ops Cold War", "Counter-Strike",
    "Counter-Strike 2", "PUBG: Battlegrounds", "Halo: Combat Evolved", "Halo 2",
    "Halo 3", "Halo: Reach", "Halo Infinite", "Halo 4",
    "Halo 5: Guardians", "Gears of War", "Gears 5", "Forza Horizon",
    "Forza Horizon 5", "Forza Motorsport", "Ori and the Will of the Wisps", "Hi-Fi Rush",
    "Pentiment", "Hellblade: Senua's Sacrifice", "Senua's Saga: Hellblade II", "Tunic",
    "Sifu", "Neon White", "Cocoon", "Death's Door",
    "Immortals Fenyx Rising", "Assassin's Creed II", "Assassin's Creed: Brotherhood", "Assassin's Creed: Odyssey",
    "Assassin's Creed: Origins", "Assassin's Creed: Valhalla", "Assassin's Creed Mirage", "Assassin's Creed Shadows",
    "Assassin's Creed: Black Flag", "Watch Dogs", "Watch Dogs 2", "Watch Dogs: Legion",
    "Far Cry", "Far Cry 3", "Far Cry 5", "Far Cry 6",
    "Ghost Recon", "Splinter Cell", "The Crew", "For Honor",
    "Prince of Persia: The Lost Crown", "Beyond Good and Evil", "Rayman", "Rayman Legends",
    "Rayman Origins", "Just Dance", "Rocksmith", "Guitar Hero",
    "Rock Band", "Beat Saber", "Dance Dance Revolution", "osu!",
    "Friday Night Funkin'", "Muse Dash", "Cytus", "Deemo",
    "Arcaea", "Phigros", "A Dance of Fire and Ice", "Rhythm Heaven",
    "Crypt of the NecroDancer", "Metal: Hellsinger", "Sayonara Wild Hearts", "Grand Theft Auto V",
    "Grand Theft Auto IV", "Grand Theft Auto: San Andreas", "Grand Theft Auto: Vice City", "Grand Theft Auto III",
    "Red Dead Redemption 2", "Red Dead Online", "L.A. Noire", "Max Payne 3",
    "Sleeping Dogs", "Mafia", "Mafia II", "Mafia III",
    "Yakuza", "Yakuza 0", "Yakuza: Like a Dragon", "Like a Dragon: Infinite Wealth",
    "Like a Dragon Gaiden", "Judgment", "Lost Judgment", "Sonic Frontiers",
    "Sonic Mania", "Sonic Adventure", "Sonic Adventure 2", "Sonic Generations",
    "Sonic Colors", "Sonic Unleashed", "Sonic Superstars", "Shadow the Hedgehog",
    "Super Mario Odyssey", "Super Mario Galaxy", "Super Mario Galaxy 2", "Super Mario Sunshine",
    "Super Mario 64", "Super Mario Bros. Wonder", "Super Mario 3D World", "Super Mario Maker",
    "Super Mario Maker 2", "New Super Mario Bros.", "Mario Kart 8", "Mario Kart 8 Deluxe",
    "Mario Kart World", "Mario Party", "Super Mario Party", "Mario Party Superstars",
    "Paper Mario", "Paper Mario: The Thousand-Year Door", "Paper Mario: The Origami King", "Mario & Luigi",
    "Mario & Luigi: Brothership", "Luigi's Mansion", "Luigi's Mansion 3", "Super Smash Bros.",
    "Super Smash Bros. Ultimate", "Super Smash Bros. Melee", "Super Smash Bros. Brawl", "The Legend of Zelda: Breath of the Wild",
    "The Legend of Zelda: Ocarina of Time", "The Legend of Zelda: Majora's Mask", "The Legend of Zelda: The Wind Waker", "The Legend of Zelda: Twilight Princess",
    "The Legend of Zelda: Skyward Sword", "The Legend of Zelda: A Link to the Past", "The Legend of Zelda: Link's Awakening", "The Legend of Zelda: Echoes of Wisdom",
    "Hyrule Warriors", "Metroid Prime", "Metroid Dread", "Metroid: Samus Returns",
    "Super Metroid", "Metroid Prime 4", "Donkey Kong Country", "Donkey Kong Country: Tropical Freeze",
    "Donkey Kong Bananza", "Yoshi's Crafted World", "Kirby and the Forgotten Land", "Kirby Star Allies",
    "Kirby's Return to Dream Land", "Pikmin", "Pikmin 4", "Pikmin 3",
    "Bayonetta 2", "Bayonetta 3", "Astral Chain", "Star Fox",
    "F-Zero", "Punch-Out!!", "Earthbound", "Mother 3",
    "Golden Sun", "Wario Land", "WarioWare", "Splatoon 2",
    "Nintendogs", "Animal Crossing: New Horizons", "Animal Crossing: New Leaf", "Pokemon Trading Card Game",
    "Yu-Gi-Oh! Master Duel", "Magic: The Gathering", "Hearthstone", "Legends of Runeterra",
    "Marvel Snap", "Gwent", "Teamfight Tactics", "Dota 2",
    "Smite", "Heroes of the Storm", "Mobile Legends", "Wild Rift",
    "Brawl Stars", "Clash Royale", "Clash of Clans", "Hay Day",
    "Candy Crush Saga", "Angry Birds", "Plants vs. Zombies", "Plants vs. Zombies 2",
    "Plants vs. Zombies: Garden Warfare", "Bejeweled", "Cut the Rope", "Fruit Ninja",
    "Temple Run", "Subway Surfers", "Crossy Road", "Flappy Bird",
    "Geometry Dash", "Monument Valley", "Monument Valley 2", "Alto's Odyssey",
    "Alto's Adventure", "Gris", "Journey", "Flower",
    "Abzu", "The Pathless", "Gorogoa", "Baba Is You",
    "The Witness", "Braid", "Fez", "Limbo",
    "Inside", "Little Nightmares", "Little Nightmares II", "Little Nightmares III",
    "Playdead", "Unpacking", "A Little to the Left", "Dorfromantik",
    "Islanders", "Townscaper", "Tiny Glade", "Cozy Grove",
    "A Short Hike", "Chicory: A Colorful Tale", "Wandersong", "Kentucky Route Zero",
    "Oxenfree", "Oxenfree II", "Night in the Woods", "Firewatch",
    "What Remains of Edith Finch", "Gone Home", "Tacoma", "Her Story",
    "Telling Lies", "Immortality", "The Stanley Parable", "The Beginner's Guide",
    "Stanley Parable: Ultra Deluxe", "Untitled Goose Game", "Goose Game", "Human: Fall Flat",
    "Gang Beasts", "Fall Guys", "Pummel Party", "Overcooked",
    "Overcooked 2", "Moving Out", "Unravel", "Unravel Two",
    "A Way Out", "Split Fiction", "Brothers: A Tale of Two Sons", "Trine",
    "Cuphead: The Delicious Last Course", "Hollow Knight: Silksong", "Ori", "Blasphemous",
    "Blasphemous II", "Ender Lilies", "Ender Magnolia", "Grime",
    "Salt and Sanctuary", "Momodora", "Bloodstained: Ritual of the Night", "Axiom Verge",
    "Guacamelee!", "Metroidvania", "Shovel Knight", "Cave Story",
    "Owlboy", "Iconoclasts", "The Messenger", "Chained Echoes",
    "Crosscode", "Undertale Yellow", "Deltarune Chapter 2", "Omori",
    "Ib", "Yume Nikki", "The Witch's House", "Mad Father",
    "Angels of Death", "Misao", "Fran Bow", "Little Misfortune",
    "Bendy and the Ink Machine", "Poppy Playtime", "Garten of Banban", "Doki Doki Literature Club",
    "Slay the Princess", "Scarlet Hollow", "Night Cascades", "Buckshot Roulette",
    "Lobotomy Corporation", "Library of Ruina", "Limbus Company", "Project Moon",
    "Pathologic", "Signalis", "Fatal Frame", "Project Zero",
    "Clock Tower", "Rule of Rose", "Haunting Ground", "Dead Space",
    "Dead Space 2", "Dead Space 3", "The Callisto Protocol", "Alien: Isolation",
    "Amnesia: The Dark Descent", "Amnesia: The Bunker", "Soma", "Outlast",
    "Outlast 2", "The Outlast Trials", "Layers of Fear", "Observer",
    "Visage", "Phasmophobia", "Devour", "The Mortuary Assistant",
    "Resident Evil 2", "Resident Evil 3", "Resident Evil 4", "Resident Evil 7: Biohazard",
    "Resident Evil Village", "Resident Evil 5", "Resident Evil 6", "Resident Evil: Revelations",
    "Silent Hill 2", "Silent Hill 2 Remake", "Silent Hill f", "Silent Hill: Ascension",
    "The Evil Within", "The Evil Within 2", "Until Dawn", "The Quarry",
    "The Dark Pictures Anthology", "Man of Medan", "Little Hope", "House of Ashes",
    "The Devil in Me", "Life is Strange 2", "Life is Strange: True Colors", "Life is Strange: Double Exposure",
    "Life is Strange: Before the Storm", "The Awesome Adventures of Captain Spirit", "Tell Me Why", "Beyond: Two Souls",
    "Heavy Rain", "As Dusk Falls", "The Walking Dead: The Telltale Series", "The Wolf Among Us",
    "Batman: The Telltale Series", "Tales from the Borderlands", "Twelve Minutes", "The Case of the Golden Idol",
    "Return of the Obra Dinn", "Outer Wilds: Echoes of the Eye", "Citizen Sleeper", "Roadwarden",
    "Norco", "Disco Elysium: The Final Cut", "Suzerain", "Amnesia (Otome)",
    "Diabolik Lovers", "Uta no Prince-sama", "Hakuoki", "Collar x Malice",
    "Code: Realize", "Cafe Enchante", "Piofiore: Fated Memories", "Norn9",
    "Period Cube", "Bustafellows", "Olympia Soiree", "Variable Barricade",
    "Radiant Tale", "Dairoku", "The Charming Empire", "Ozmafia!!",
    "Nightshade", "Steam Prison", "Sweet Fuse", "The Arcana",
    "Lovestruck", "Choices: Stories You Play", "Episode", "Chapters",
    "MonCom", "Tears of Themis", "Mr. Love: Queen's Choice", "Ikemen Sengoku",
    "Ikemen Vampire", "Ikemen Prince", "Ikemen Villains", "Cupid Parasite",
    "Jack Jeanne", "9 R.I.P.", "Paradigm Paradox", "Winter's Wish",
    "Doki Doki Literature Club Plus!", "Katawa Shoujo", "Rewrite", "Fate/hollow ataraxia",
    "Tsukihime", "Melty Blood", "Fate/Extra", "Fate/Samurai Remnant",
    "Danganronpa 2: Goodbye Despair", "Danganronpa V3: Killing Harmony", "Danganronpa Another Episode", "Zero Escape",
    "999: Nine Hours, Nine Persons, Nine Doors", "Virtue's Last Reward", "Zero Time Dilemma", "AI: The Somnium Files",
    "AI: The Somnium Files - nirvanA Initiative", "Raging Loop", "Root Letter", "Ace Attorney Investigations",
    "Phoenix Wright: Ace Attorney", "Apollo Justice: Ace Attorney", "The Great Ace Attorney Chronicles", "Ghost Trick: Phantom Detective",
    "Famicom Detective Club", "Paranormasight", "The Centennial Case", "Master Detective Archives: Rain Code",
    "Process of Elimination", "Cats", "Rent", "The Book of Mormon",
    "Avenue Q", "Spring Awakening", "Next to Normal", "In the Heights",
    "Fun Home", "Kinky Boots", "Come From Away", "Waitress",
    "Falsettos", "Ride the Cyclone", "The Prom", "Mean Girls the Musical",
    "Legally Blonde the Musical", "Some Like It Hot", "Moulin Rouge!", "Moulin Rouge! The Musical",
    "Frozen the Musical", "Aladdin the Musical", "The Lion King the Musical", "Newsies",
    "Anastasia", "Bring It On: The Musical", "Tuck Everlasting", "The Addams Family",
    "Little Shop of Horrors", "Sweeney Todd", "Into the Woods", "Sunday in the Park with George",
    "Company", "Follies", "Merrily We Roll Along", "A Little Night Music",
    "Assassins", "Pippin", "Godspell", "Jesus Christ Superstar",
    "Joseph and the Amazing Technicolor Dreamcoat", "Evita", "Cabaret", "West Side Story",
    "My Fair Lady", "Oklahoma!", "Carousel", "The King and I",
    "Fiddler on the Roof", "Funny Girl", "Gypsy", "Guys and Dolls",
    "Annie", "42nd Street", "A Chorus Line", "Dreamgirls",
    "Hairspray", "Grease the Musical", "Jagged Little Pill", "& Juliet",
    "MJ the Musical", "The Cher Show", "Beautiful: The Carole King Musical", "Tina",
    "Jersey Boys", "Bat Out of Hell", "SpongeBob SquarePants: The Musical", "Shucked",
    "Kimberly Akimbo", "A Strange Loop", "Slave Play", "The Outsiders the Musical",
    "Water for Elephants", "Suffs", "The Notebook the Musical", "Back to the Future: The Musical",
    "Death Becomes Her", "Maybe Happy Ending", "Operation Mincemeat", "Stereophonic",
    "The Adventure Zone", "Critical Role: The Legend of Vox Machina", "Dimension 20", "Not Another D&D Podcast",
    "Dungeons and Daddies", "Worlds Beyond Number", "The Glass Cannon", "Friends at the Table",
    "The Penumbra Podcast", "Wolf 359", "The Bright Sessions", "Alice Isn't Dead",
    "Within the Wires", "The Amelia Project", "Death by Dying", "Old Gods of Appalachia",
    "The Magnus Protocol", "Malevolent", "The White Vault", "Archive 81",
    "Limetown", "The Black Tapes", "Rabbits", "Tanis",
    "The NoSleep Podcast", "SCP Foundation", "The Backrooms", "Marble Hornets",
    "Ted the Caver", "Petscop", "Local58", "Gemini Home Entertainment",
    "The Mandela Catalogue", "The Walten Files", "Analog Horror", "Camp Here & There",
    "Midnight Burger", "Station Blue", "The Silt Verses", "Camp Damascus",
    "The Two Princes", "Girl in Space", "Zombies, Run!", "The Sandman (comics)",
    "Watchmen (comics)", "V for Vendetta (comics)", "Saga", "The Walking Dead (comics)",
    "Invincible (comics)", "Sweet Tooth (comics)", "Y: The Last Man", "Fables",
    "Locke & Key (comics)", "Hellboy", "B.P.R.D.", "Sin City",
    "300", "Kick-Ass (comics)", "Kingsman (comics)", "Wanted",
    "The Umbrella Academy (comics)", "Paper Girls (comics)", "Descender", "East of West",
    "Monstress", "The Wicked + The Divine", "Sex Criminals", "Rat Queens",
    "Bitch Planet", "Nimona (comic)", "Lumberjanes", "Giant Days",
    "Squirrel Girl", "Ms. Marvel (comics)", "Runaways (comics)", "Young Avengers",
    "Hawkeye (comics)", "Daredevil (comics)", "The Amazing Spider-Man (comics)", "Ultimate Spider-Man",
    "Spider-Gwen", "Miles Morales: Spider-Man", "X-Men (comics)", "New Mutants",
    "The Uncanny X-Men", "House of X", "Powers of X", "Immortal Hulk",
    "Thor (comics)", "Loki (comics)", "Vision", "Scarlet Witch",
    "Batman (comics)", "Detective Comics", "Nightwing", "Batgirl",
    "Robin", "Red Hood and the Outlaws", "Batman: The Long Halloween", "Batman: Year One",
    "Batman: The Killing Joke", "Superman: Red Son", "All-Star Superman", "Wonder Woman (comics)",
    "The Flash (comics)", "Green Lantern (comics)", "Aquaman (comics)", "Justice League (comics)",
    "Teen Titans (comics)", "The Boys (comics)", "Preacher", "Transmetropolitan",
    "Sandman: Overture", "Bone", "Amulet", "Scott Pilgrim (comics)",
    "Persepolis (comic)", "Maus", "Sonic the Hedgehog (IDW)", "Teenage Mutant Ninja Turtles (IDW)",
    "My Little Pony (comics)", "The Breakfast Club", "Ferris Bueller's Day Off", "Sixteen Candles",
    "Pretty in Pink", "Say Anything...", "Weird Science", "The Goonies",
    "Stand by Me", "E.T. the Extra-Terrestrial", "Close Encounters of the Third Kind", "Gremlins",
    "The Lost Boys", "Beetlejuice Beetlejuice", "Edward Scissorhands", "Batman Returns",
    "Big", "Splash", "WarGames", "Short Circuit",
    "Flight of the Navigator", "Legend", "Ladyhawke", "Clue",
    "Weekend at Bernie's", "Bill & Ted's Excellent Adventure", "Bill & Ted Face the Music", "Wayne's World",
    "Dazed and Confused", "Empire Records", "Reality Bites", "Singles",
    "Clerks", "Mallrats", "Chasing Amy", "Dogma",
    "Jay and Silent Bob Strike Back", "Office Space", "Being John Malkovich", "Eternal Sunshine of the Spotless Mind",
    "The Science of Sleep", "Where the Wild Things Are", "Adaptation", "Her",
    "Lost in Translation", "Marie Antoinette", "Somewhere", "The Bling Ring",
    "Priscilla", "Little Miss Sunshine", "Juno", "Nick and Norah's Infinite Playlist",
    "Scott Pilgrim", "500 Days of Summer", "Ruby Sparks", "Safety Not Guaranteed",
    "Garden State", "Away We Go", "The Way Way Back", "Me and Earl and the Dying Girl",
    "Palo Alto", "The Edge of Seventeen", "Booksmart", "Lady Bird",
    "Eighth Grade", "Mid90s", "Skate Kitchen", "The Florida Project",
    "Call Me by Your Name", "God's Own Country", "Weekend", "Portrait of a Lady on Fire",
    "Blue Is the Warmest Color", "Carol", "The Handmaiden", "Brokeback Mountain",
    "Milk", "Dallas Buyers Club", "The Danish Girl", "A Fantastic Woman",
    "Pariah", "Tangerine", "Rafiki", "Happiest Season",
    "Bros", "Fire Island", "Bottoms", "But I'm a Cheerleader",
    "Alex Strangelove", "The Miseducation of Cameron Post", "Boy Erased", "Beautiful Thing",
    "Pride", "Blue Lock: Episode Nagi", "Ao Ashi", "Days",
    "Inazuma Eleven", "Captain Tsubasa", "Whistle!", "Giant Killing",
    "Diamond no Ace", "Ace of Diamond", "Major", "Big Windup!",
    "Cross Game", "Touch", "H2", "One Outs",
    "Mix", "Baby Steps", "The Prince of Tennis", "New Prince of Tennis",
    "Chihayafuru", "Hikaru no Go", "Initial D", "MF Ghost",
    "Wangan Midnight", "Overtake!", "Capeta", "Yowamushi Pedal",
    "Bakuten!!", "Skate-Leading Stars", "Cheer Boys!!", "Welcome to the Ballroom",
    "Free! Iwatobi Swim Club", "DIVE!!", "Backflip!!", "Tsurune",
    "Run with the Wind", "All Out!!", "Two Car", "Number24",
    "Stars Align", "Farewell, My Dear Cramer", "Wind Breaker (2024)", "Keijo!!!!!!!!",
    "Hanebado!", "Harukana Receive", "Scorching Ping Pong Girls", "Battery",
    "Rihanna", "Drake", "Kendrick Lamar", "Kanye West",
    "Nicki Minaj", "Cardi B", "Megan Thee Stallion", "Travis Scott",
    "Post Malone", "Bad Bunny", "Karol G", "Rosalia",
    "Shakira", "J Balvin", "Peso Pluma", "Kali Uchis",
    "Tyler, the Creator", "Frank Ocean", "Childish Gambino", "Chance the Rapper",
    "J. Cole", "A$AP Rocky", "Lil Nas X", "Chappell Roan",
    "Gracie Abrams", "Noah Kahan", "Zach Bryan", "Morgan Wallen",
    "Luke Combs", "Kacey Musgraves", "Chris Stapleton", "Miranda Lambert",
    "Carrie Underwood", "Kelsea Ballerini", "Maren Morris", "Shania Twain",
    "Dolly Parton", "Fleetwood Mac", "The Rolling Stones", "Led Zeppelin",
    "Pink Floyd", "The Who", "The Doors", "David Bowie",
    "Prince", "Michael Jackson", "Whitney Houston", "Mariah Carey",
    "Madonna", "Cher", "Elton John", "Billy Joel",
    "Bruce Springsteen", "Bob Dylan", "The Eagles", "Aerosmith",
    "Guns N' Roses", "Metallica", "Iron Maiden", "Black Sabbath",
    "Slipknot", "System of a Down", "Linkin Park", "Green Day",
    "Blink-182", "Sum 41", "Simple Plan", "Good Charlotte",
    "All Time Low", "Pierce the Veil", "Sleeping with Sirens", "Bring Me the Horizon",
    "A Day to Remember", "The Used", "Taking Back Sunday", "Dashboard Confessional",
    "Jimmy Eat World", "Weezer", "The Killers", "Arctic Monkeys",
    "The Strokes", "Tame Impala", "The 1975", "Vampire Weekend",
    "Foster the People", "Bastille", "OneRepublic", "Maroon 5",
    "Train", "Radiohead", "Muse", "The Smiths",
    "Joy Division", "The Cure", "Depeche Mode", "New Order",
    "Gorillaz", "Daft Punk", "The Chemical Brothers", "Calvin Harris",
    "David Guetta", "Marshmello", "The Chainsmokers", "Zedd",
    "Skrillex", "Deadmau5", "Avicii", "Kygo",
    "Illenium", "Porter Robinson", "Madeon", "Flume",
    "ODESZA", "Rufus Du Sol", "Fred again..", "Charli XCX",
    "Troye Sivan", "Lorde", "Halsey", "Bebe Rexha",
    "Camila Cabello", "Fifth Harmony", "Little Mix", "Spice Girls",
    "Backstreet Boys", "NSYNC", "Jonas Brothers", "New Kids on the Block",
    "Boyz II Men", "Destiny's Child", "TLC", "En Vogue",
    "Salt-N-Pepa", "The Pussycat Dolls", "Girls Aloud", "Steps",
    "S Club 7", "Westlife", "Boyzone", "Take That",
    "McFly", "Busted", "The Wanted", "The Vamps",
    "Why Don't We", "PRETTYMUCH", "In Real Life", "CNCO",
    "Now United", "JYP", "SM Entertainment", "HYBE",
    "YG Entertainment", "TVXQ", "Super Junior", "SHINee",
    "f(x)", "2NE1", "Wonder Girls", "KARA",
    "Sistar", "Apink", "MAMAMOO", "GFRIEND",
    "OH MY GIRL", "WJSN", "Lovelyz", "DIA",
    "gugudan", "PRISTIN", "IZONE", "fromis_9",
    "STAYC", "Kep1er", "NMIXX", "ILLIT",
    "BABYMONSTER", "KISS OF LIFE", "tripleS", "Weeekly",
    "Billlie", "Purple Kiss", "Dreamcatcher", "Everglow",
    "(G)I-DLE", "CLC", "Cignature", "Rocket Punch",
    "Weki Meki", "BTOB", "INFINITE", "VIXX",
    "PENTAGON", "The Boyz", "Golden Child", "Victon",
    "ONF", "AB6IX", "CIX", "Verivery",
    "ONEUS", "TEMPEST", "TREASURE", "P1Harmony",
    "CRAVITY", "WayV", "NCT 127", "NCT DREAM",
    "RIIZE", "ZEROBASEONE", "BOYNEXTDOOR", "TWS",
    "&TEAM", "Xdinary Heroes", "DAY6", "N.Flying",
    "FTISLAND", "CNBLUE", "AKMU", "IU",
    "Taeyeon", "Chungha", "Sunmi", "Hyuna",
    "Jessi", "Lee Hi", "Heize", "Zico",
    "Jay Park", "DPR", "Agust D", "RM",
    "Jimin", "Jung Kook", "Jin", "J-Hope",
    "Suga", "Lisa", "Jennie", "Rose",
    "Jisoo", "BABYMETAL", "ONE OK ROCK", "RADWIMPS",
    "YOASOBI", "Ado", "Aimer", "Kenshi Yonezu",
    "Vaundy", "Fujii Kaze", "Official HIGE DANdism", "King Gnu",
    "Mrs. Green Apple", "Eve", "Reol", "Yorushika",
    "ZUTOMAYO", "Kessoku Band", "Hatsune Miku", "Vocaloid",
    "Kagamine Rin/Len", "Megurine Luka", "Utada Hikaru", "Perfume",
    "Money Heist: Korea", "Hellbound", "My Name", "The Glory",
    "Mask Girl", "Bloodhounds", "D.P.", "Move to Heaven",
    "Extraordinary Attorney Woo", "It's Okay to Not Be Okay", "Crash Landing on You", "Business Proposal",
    "Vincenzo", "Goblin", "Descendants of the Sun", "Guardian: The Lonely and Great God",
    "Hotel del Luna", "Nevertheless", "Our Beloved Summer", "Twenty-Five Twenty-One",
    "Hometown Cha-Cha-Cha", "Start-Up", "Itaewon Class", "Reply 1988",
    "Reply 1997", "Reply 1994", "Weightlifting Fairy Kim Bok-joo", "Strong Girl Bong-soon",
    "My Love from the Star", "Boys Over Flowers (Korean)", "The Heirs", "Doom at Your Service",
    "Lovestruck in the City", "The King: Eternal Monarch", "Alchemy of Souls", "Moon Lovers: Scarlet Heart Ryeo",
    "Love Alarm", "Squid Game: The Challenge", "Physical: 100", "Single's Inferno",
    "The Untamed (Live Action)", "Word of Honor", "Nirvana in Fire", "The Story of Minglan",
    "Eternal Love", "Ashes of Love", "Love Between Fairy and Devil", "Till the End of the Moon",
    "Story of Yanxi Palace", "Ruyi's Royal Love in the Palace", "The Empress of China", "Scarlet Heart",
    "Meteor Garden", "A Love So Beautiful", "Put Your Head on My Shoulder", "Skate Into Love",
    "Hidden Love", "Love O2O", "Go Ahead", "The King's Avatar",
    "Guardian", "SCI Mystery", "The Sleuth of the Ming Dynasty", "Winter Begonia",
    "History of BL", "2gether", "Bad Buddy", "SOTUS",
    "Cutie Pie", "KinnPorsche", "Not Me", "A Tale of Thousand Stars",
    "I Told Sunset About You", "He's Coming to Me", "Dark Blue Kiss", "Theory of Love",
    "Until We Meet Again", "The Eclipse", "Semantic Error (Drama)", "Love in the Air",
    "My School President", "Moonlight Chicken", "Only Friends", "Vice Versa",
    "Between Us", "The Warp Effect", "Gaya Sa Pelikula", "Elite (Spanish)",
    "Money Heist (La Casa de Papel)", "Cable Girls", "Money Heist: Berlin", "The Cook of Castamar",
    "Alta Mar", "Grand Hotel", "Velvet", "Cathedral of the Sea",
    "Who Killed Sara?", "Dark Desire", "Control Z", "Rebelde",
    "Rebelde Way", "Soy Luna", "Violetta", "Chiquititas",
    "Floricienta", "Patito Feo", "Casi Angeles", "El Internado",
    "The Time in Between", "Fatmagul", "The Protector", "Kurulus: Osman",
    "Dirilis: Ertugrul", "Love Is in the Air (Sen Cal Kapimi)", "Forbidden Fruit", "The Girl Named Feriha",
    "Black Money Love", "Endless Love (Kara Sevda)", "Early Bird", "Another Self",
    "As the Crow Flies", "Kaiju No. 8", "Sakamoto Days", "Dandadan",
    "Blue Box", "Mashle: Magic and Muscles", "Undead Unluck", "Hell's Paradise",
    "The Elusive Samurai", "Shangri-La Frontier", "Ragna Crimson", "Zom 100: Bucket List of the Dead",
    "Synduality Noir", "Tengoku Daimakyo", "Heavenly Delusion", "Vinland Saga Season 2",
    "Hell's Paradise: Jigokuraku", "The Apothecary Diaries Season 2", "Frieren: Beyond Journey's End", "The Dangers in My Heart",
    "A Sign of Affection", "The Fragrant Flower Blooms with Dignity", "Skip and Loafer", "My Happy Marriage",
    "A Condition Called Love", "The Café Terrace and Its Goddesses", "2.5 Dimensional Seduction", "Alya Sometimes Hides Her Feelings in Russian",
    "Girls Band Cry", "Look Back", "The Colors Within", "Blue Period",
    "Ranking of Kings: The Treasure Chest of Courage", "Buddy Daddies", "Tomo-chan Is a Girl!", "The Ice Guy and His Cool Female Colleague",
    "Insomniacs After School", "Skip to Loafer", "My New Boss Is Goofy", "Makeine: Too Many Losing Heroines",
    "Oshi no Ko Season 2", "Bocchi the Rock! (Movie)", "The Idolmaster", "Love Live!",
    "Love Live! Sunshine!!", "Love Live! Nijigasaki", "Love Live! Superstar!!", "BanG Dream!",
    "D4DJ", "Zombie Land Saga", "Show by Rock!!", "Uma Musume Pretty Derby",
    "Carole & Tuesday", "Detroit Metal City", "Beck: Mongolian Chop Squad", "Sound! Euphonium: Liz and the Blue Bird",
    "Given (Movie)", "Cherry Magic!", "Sasaki and Miyano: Graduation", "The Night Beyond the Tricornered Window",
    "Twittering Birds Never Fly", "Doukyusei", "Umibe no Étranger", "The Stranger by the Shore",
    "Hitorijime My Hero", "Love Stage!!", "Junjou Romantica", "Sekai-ichi Hatsukoi",
    "Ten Count", "Antique Bakery", "No. 6", "Fake",
    "Gravitation", "Loveless (anime)", "Togainu no Chi", "DRAMAtical Murder",
    "Dakaichi", "Sarazanmai", "Yarichin Bitch Club", "LEGO",
    "LEGO Ninjago", "LEGO Bionicle", "LEGO Friends", "LEGO City",
    "LEGO Star Wars", "Bionicle", "Hero Factory", "Barbie (Franchise)",
    "L.O.L. Surprise!", "Rainbow High", "My Little Pony: A New Generation", "My Little Pony: Make Your Mark",
    "Care Bears", "Strawberry Shortcake", "Rainbow Brite", "Polly Pocket",
    "Littlest Pet Shop", "Hot Wheels", "Transformers: Prime", "Transformers: Animated",
    "Beast Wars", "Beyblade Burst", "Bakugan: Battle Planet", "Yo-kai Watch",
    "Digimon Adventure", "Digimon Tamers", "Digimon Frontier", "Digimon Adventure tri.",
    "Digimon Survive", "Tamagotchi", "Sonic Boom", "Pac-Man",
    "Angry Birds Toons", "Skylanders", "Amiibo", "Funko Pop",
    "American Girl", "MrBeast", "PewDiePie", "Markiplier",
    "Jacksepticeye", "Ninja", "Pokimane", "Corpse Husband",
    "Sykkuno", "Valkyrae", "Disguised Toast", "TommyInnit",
    "Wilbur Soot", "Technoblade", "GeorgeNotFound", "Sapnap",
    "Karl Jacobs", "Quackity", "BadBoyHalo", "Ranboo",
    "Tubbo", "Philza", "Nihachu", "Foolish Gamers",
    "Jschlatt", "Corpse", "Dream Team", "Sidemen",
    "KSI", "Miniminter", "Vikkstar123", "Zerkaa",
    "TBJZL", "Behzinga", "W2S", "The Try Guys",
    "Good Mythical Morning", "Rhett and Link", "Cody Ko", "Drew Gooden",
    "Danny Gonzalez", "Jenna Marbles", "Emma Chamberlain", "David Dobrik",
    "Vlog Squad", "Smosh", "CollegeHumor", "Dropout",
    "Game Theory", "Film Theory", "MatPat", "The Slow Mo Guys",
    "Vsauce", "Kurzgesagt", "Rooster Teeth", "Achievement Hunter",
    "Funhaus", "gen:LOCK", "Camp Camp", "Nomad of Nowhere",
    "Red vs. Blue", "Death Battle", "ScrewAttack", "The Amazing Digital Circus",
    "Murder Drones", "Lackadaisy", "Hazbin Hotel (Fandom)", "Vivziepop",
    "Glitch Productions", "Battle for Dream Island", "Inanimate Insanity", "Object Show",
    "Ollie's Pack", "Eddsworld", "Asdfmovie", "Cyanide & Happiness",
    "Homestar Runner", "Salad Fingers", "Don't Hug Me I'm Scared", "Local 58",
    "Ben Drowned", "Sonic.exe", "Slender Man", "Jeff the Killer",
    "Creepypasta", "The SCP Foundation", "Five Nights at Freddy's: Security Breach", "FNaF: Sister Location",
    "FNaF World", "Freddy Fazbear's Pizzeria Simulator", "Ultimate Custom Night", "Five Nights at Freddy's: Help Wanted",
    "Baldi's Basics", "Bendy and the Dark Revival", "Hello Neighbor", "Granny",
    "Choo-Choo Charles", "Amanda the Adventurer", "Hello Kitty", "Sanrio",
    "My Melody", "Kuromi", "Cinnamoroll", "Pompompurin",
    "Keroppi", "Gudetama", "Aggretsuko", "Little Twin Stars",
    "Pochacco", "Badtz-Maru", "Sumikko Gurashi", "Rilakkuma",
    "San-X", "Molang", "Pusheen", "Miffy",
    "Moomin", "Winnie the Pooh (Franchise)", "Peppa Pig", "Bluey",
    "Paw Patrol", "Cocomelon", "Hey Duggee", "Sesame Street",
    "The Muppets", "Fraggle Rock", "Muppet Babies", "Teenage Mutant Ninja Turtles: Mutant Mayhem",
    "Jujutsu Kaisen 0", "Demon Slayer: Mugen Train", "Demon Slayer: To the Hashira Training", "Demon Slayer: Infinity Castle",
    "My Hero Academia: Two Heroes", "My Hero Academia: Heroes Rising", "My Hero Academia: World Heroes' Mission", "My Hero Academia: You're Next",
    "One Piece Film: Red", "One Piece Film: Gold", "One Piece: Stampede", "Dragon Ball Super: Broly",
    "Dragon Ball Super: Super Hero", "Naruto the Movie", "Boruto: Naruto the Movie", "The Last: Naruto the Movie",
    "Sword Art Online: Ordinal Scale", "Made in Abyss: Dawn of the Deep Soul", "Fate/stay night: Heaven's Feel", "Violet Evergarden: The Movie",
    "A Silent Voice (Movie)", "Your Name (Movie)", "Suzume (Movie)", "Look Back (Movie)",
    "Bubble", "Drifting Home", "Goodbye, Don Glees!", "Poupelle of Chimney Town",
    "Fireworks", "Penguin Highway", "Okko's Inn", "Modest Heroes",
    "Warriors: The New Prophecy", "Warriors: Power of Three", "Warriors: Omen of the Stars", "Warriors: Dawn of the Clans",
    "Seekers", "Survivors", "Bravelands", "Guardians of Ga'Hoole",
    "The Underland Chronicles", "Gregor the Overlander", "The 39 Clues", "Spirit Animals",
    "The Land of Stories: The Wishing Spell", "Fablehaven", "Dragonwatch", "The Beyonders",
    "Five Kingdoms", "Charlie Bone", "Children of the Red King", "The Sisters Grimm",
    "Beyond the Spiderwick Chronicles", "The Bartimaeus Sequence", "Percy Jackson: The Chalice of the Gods", "The Sun and the Star",
    "Daughter of the Deep", "The Trials of Apollo", "The Hidden Oracle", "The Dark Prophecy",
    "The Burning Maze", "The Tyrant's Tomb", "The Tower of Nero", "Camp Half-Blood Chronicles",
    "Trials of Apollo", "Skulduggery Pleasant", "Cirque du Freak", "The Saga of Darren Shan",
    "The Demonata", "Young Bond", "CHERUB", "Henderson's Boys",
    "Robert Muchamore", "Gone", "Michael Grant", "Front Lines",
    "BZRK", "Monster (Michael Grant)", "The Enemy", "Charlie Higson",
    "The Program", "The Treatment", "The Darkest Minds", "Never Fade",
    "In the Afterlight", "The Darkest Minds Trilogy", "Prodigy", "Champion",
    "Rebel", "Marie Lu", "The Young Elites", "Warcross",
    "Wildcard", "Skyhunter", "Steelheart", "Firefight",
    "Calamity", "The Reckoners", "Skyward", "Starsight",
    "Cytonic", "Defiant", "The Rithmatist", "Alcatraz Versus the Evil Librarians",
    "The Reckoners Series", "Uglies", "Pretties", "Specials",
    "Extras", "Impostors", "Leviathan", "Behemoth",
    "Goliath", "Scott Westerfeld", "The Testing", "Matched",
    "Crossed", "Reached", "Delirium", "Pandemonium",
    "Requiem", "Lauren Oliver", "Before I Fall", "The Program (Suzanne Young)",
    "Legend (Marie Lu)", "The Fifth Wave", "The Infinite Sea", "The Last Star",
    "Rick Yancey", "The Monstrumologist", "Miss Peregrine's", "Hollow City",
    "Library of Souls", "A Map of Days", "The Conference of the Birds", "The Desolations of Devil's Acre",
    "Splintered", "Unhinged", "Ensnared", "The Wonderland trilogy",
    "A.G. Howard", "Dorothy Must Die", "The Wicked Will Rise", "Yellow Brick War",
    "The End of Oz", "Danielle Paige", "The Rose and the Dagger", "Renee Ahdieh",
    "Smoke in the Sun", "The Beautiful", "The Damned", "The Righteous",
    "The Risen", "Stalking Jack the Ripper", "Hunting Prince Dracula", "Escaping from Houdini",
    "Capturing the Devil", "Kerri Maniscalco", "Kingdom of the Wicked", "Kingdom of the Cursed",
    "Kingdom of the Feared", "Shelby Mahurin", "Blood & Honey (Mahurin)", "Gods & Monsters (Mahurin)",
    "Ace of Shades", "King of Fools", "Queen of Volts", "The Shadow Game",
    "Amanda Foody", "All of Us Villains", "All of Our Demise", "The Wicker King",
    "The Boneless Mercies", "Small Town Monsters", "Sawkill Girls", "Furyborn",
    "Kingsbane", "Lightbringer", "Claire Legrand", "The Darkest Part of the Forest",
    "The Coldest Girl in Coldtown", "The Modern Faerie Tales", "Holly Black", "Book of Night",
    "The Stolen Heir Duology", "The Poet X", "With the Fire on High", "Clap When You Land",
    "Elizabeth Acevedo", "The Hate U Give", "On the Come Up", "Concrete Rose",
    "Angie Thomas", "Dear Martin", "Dear Justyce", "Nic Stone",
    "Nicola Yoon", "Instructions for Dancing", "Children of Blood and Bone", "Children of Virtue and Vengeance",
    "Children of Anguish and Anarchy", "Tomi Adeyemi", "Tracy Deonn", "A Song of Wraiths and Ruin",
    "A Chorus of Dragons", "Roseanne A. Brown", "Raybearer", "Redemptor",
    "Jordan Ifueko", "Skin of the Sea", "Natasha Bowen", "The Gilded Ones",
    "Namina Forna", "Ace of Spades", "Faridah Abike-Iyimide", "This Poison Heart",
    "This Wicked Fate", "Kalynn Bayron", "Cinderella Is Dead", "You're Not Supposed to Die Tonight",
    "Vampires Never Get Old", "WWE", "AEW", "NJPW",
    "New Japan Pro-Wrestling", "WWE NXT", "Lucha Underground", "Impact Wrestling",
    "Formula 1", "Drive to Survive", "NASCAR", "MotoGP",
    "Gran Turismo (Film)", "Fallout (TV series)", "Shogun", "Ripley",
    "3 Body Problem", "The Three-Body Problem", "Baby Reindeer", "Fool Me Once",
    "The Perfect Couple", "A Man in Full", "Presumed Innocent", "Lessons in Chemistry (TV)",
    "Daisy Jones & the Six (TV)", "The Summer I Turned Pretty (TV)", "My Life with the Walter Boys", "Maxton Hall",
    "Nobody Wants This", "The Diplomat", "Bodkin", "The Night Agent",
    "The Recruit", "Citadel", "Reacher (TV)", "Cross",
    "The Lincoln Lawyer", "Suits", "The Good Wife", "The Good Fight",
    "Scandal", "How to Get Away with Murder", "Grey's Anatomy: Station 19", "Station 19",
    "9-1-1", "9-1-1: Lone Star", "Chicago Fire", "Chicago Med",
    "Chicago P.D.", "Law & Order", "Law & Order: SVU", "Law & Order: Organized Crime",
    "FBI", "NCIS", "NCIS: Los Angeles", "NCIS: Hawaii",
    "Criminal Minds", "Criminal Minds: Evolution", "Bones", "Castle",
    "The Mentalist", "Elementary", "White Collar", "Psych",
    "Monk", "Burn Notice", "Leverage", "Leverage: Redemption",
    "Suits (Reboot)", "Ballard", "Matlock", "Elsbeth",
    "Poker Face", "Only Murders in the Building (Fandom)", "Death and Other Details", "A Murder at the End of the World",
    "The Afterparty", "Based on a True Story", "The Resort", "Search Party",
    "Ted Lasso (Fandom)", "Shrinking (Fandom)", "Hacks (Fandom)", "The Bear (Fandom)",
    "Gravity Falls (Fandom)", "The Owl House (Fandom)", "Amphibia (Fandom)", "Hilda (Fandom)",
    "The Dragon Prince (Fandom)", "Kipo (Fandom)", "Centaurworld", "Molly of Denali",
    "Ridley Jones", "Spirit Rangers", "City of Ghosts", "Dead End: Paranormal Park",
    "The Ghost and Molly McGee", "Hamster & Gretel", "Kiff", "Primos",
    "Big City Greens", "DuckTales (2017)", "Star vs. the Forces of Evil (Fandom)", "Steven Universe Future",
    "OK K.O.! Let's Be Heroes", "Summer Camp Island", "Victor and Valentino", "Elliott from Earth",
    "The Fungies!", "Tig n' Seek", "Jellystone!", "Bugs Bunny Builders",
    "Looney Tunes Cartoons", "Animaniacs", "Animaniacs (2020)", "Tiny Toon Adventures",
    "Tiny Toons Looniversity", "Pinky and the Brain", "Freakazoid!", "The Sylvester & Tweety Mysteries",
    "Duck Dodgers", "Loonatics Unleashed", "Wabbit", "New Looney Tunes",
    "The Flash (2023)", "Blue Beetle (Fandom)", "Static", "Milestone Comics",
    "Icon", "Hardware", "Spawn", "Witchblade",
    "The Darkness", "Cyberforce", "Youngblood", "Savage Dragon",
    "ShadowHawk", "Invincible Universe", "Radiant Black", "The Boys Universe",
    "Something Is Killing the Children", "The Nice House on the Lake", "Nightwing (2021)", "Poison Ivy",
    "Catwoman (Comics)", "Harley Quinn (Comics)", "Gotham City Sirens", "Birds of Prey (Comics)",
    "Suicide Squad (Comics)", "Task Force X", "Green Arrow (Comics)", "Black Canary",
    "The Question", "Booster Gold", "Shazam (Comics)", "Black Adam (Comics)",
    "Zatanna", "Constantine (Comics)", "Swamp Thing", "Doom Patrol (Comics)",
    "Justice League Dark", "Deathstroke", "Lobo", "Martian Manhunter",
    "Cyborg", "Beast Boy", "Raven", "Starfire",
    "Kid Flash", "Blackfire", "Slayers", "Record of Lodoss War",
    "Berserk (2016)", "Claymore", "Deadman Wonderland (Manga)", "D.Gray-man",
    "Blue Exorcist (Manga)", "Nabari no Ou", "07-Ghost", "Pandora Hearts",
    "Vanitas no Carte", "The Case Study of Vanitas", "Black Butler", "Kuroshitsuji",
    "Yana Toboso", "Elegant Yokai Apartment Life", "Mononofu", "The Ancient Magus' Bride (Manga)",
    "Fushigi Yuugi", "Ayashi no Ceres", "Alice 19th", "Absolute Boyfriend",
    "Imadoki!", "Ceres, Celestial Legend", "Yu Watase", "Basara",
    "From Far Away", "Please Save My Earth", "Angel Sanctuary", "Count Cain",
    "Godchild", "Kaori Yuki", "Petshop of Horrors", "Descendants of Darkness",
    "Wild Adapter", "Saiyuki", "Bus Gamer", "Loveless (Yun Kouga)",
    "Gundam 00 (Kouga)", "Earthian", "Gestalt", "Crimson Spell",
    "Yellow (Tateno Makoto)", "Only the Ring Finger Knows", "Gravitation (Maki Murakami)", "Fake (Sanami Matoh)",
    "New York New York", "Tokyo Babylon (CLAMP)", "Legal Drug (CLAMP)", "Stardew Valley (Fandom)",
    "Coral Island (Fandom)", "Spiritfarer (Fandom)", "Ooblets (Fandom)", "Wylde Flowers (Fandom)",
    "Palia", "Wandering Village", "Terra Nil", "Dredge",
    "Dave the Diver (Fandom)", "Vampire Survivors (Fandom)", "Brotato", "20 Minutes Till Dawn",
    "Halls of Torment", "Deep Rock Galactic: Survivor", "Cassette Beasts (Fandom)", "Sea of Stars (Fandom)",
    "Chained Echoes (Fandom)", "Eastward", "Tunic (Fandom)", "Death's Door (Fandom)",
    "Hyper Light Breaker", "Blue Prince", "Animal Well", "Balatro (Fandom)",
    "Pizza Tower", "Antonblast", "Ultrakill", "Neon White (Fandom)",
    "Pseudoregalia", "Lunacid", "Voices of the Void", "Content Warning",
    "Lethal Company (Fandom)", "REPO", "Buckshot Roulette (Fandom)", "Peak",
    "Schedule I", "Palworld (Fandom)", "Wuthering Waves (Fandom)", "Zenless Zone Zero (Fandom)",
    "Reverse: 1999", "Snowbreak: Containment Zone", "Nikke: Goddess of Victory", "Blue Archive",
    "Girls' Frontline", "Girls Frontline 2: Exilium", "Path to Nowhere", "Aether Gazer",
    "Punishing: Gray Raven", "Tower of Fantasy", "Genshin Impact (Fandom)", "Honkai: Star Rail (Fandom)",
    "Honkai Impact 3rd (Fandom)", "Azur Lane", "Arknights (Fandom)", "Fate/Grand Order (Fandom)",
    "Uma Musume Pretty Derby (Game)", "Cookie Run: Kingdom", "Cookie Run: OvenBreak", "Cookie Run (Fandom)",
    "Disney Twisted-Wonderland", "IDOLiSH7", "A3!", "Hypnosis Mic",
    "SideM", "The Idolmaster: Shiny Colors", "Uta no Prince-sama (Game)", "B-Project",
    "Tsukipro", "Tsukiuta", "Argonavis", "Paradox Live",
    "Helios Rising Heroes", "Obey Me! Nightbringer", "Mystic Messenger (Fandom)", "Tears of Themis (Fandom)",
    "Love and Deepspace (Fandom)", "For All Time", "Amnesia: Memories", "Collar x Malice (Fandom)",
    "Piofiore no Bansho", "Death end re;Quest", "Mary Skelter", "Danganronpa (Fandom)",
    "Zero Escape (Fandom)", "Steins;Gate 0", "Chaos;Head", "Chaos;Child",
    "Robotics;Notes", "Occultic;Nine", "Anonymous;Code", "Corpse Party (Fandom)",
    "Higurashi (Fandom)", "Umineko (Fandom)", "07th Expansion", "Rose Guns Days",
    "The House in Fata Morgana", "Raging Loop (Fandom)", "Song of Saya", "Saya no Uta",
    "Subarashiki Hibi", "Muv-Luv", "Muv-Luv Alternative", "Grisaia",
    "The Fruit of Grisaia", "If My Heart Had Wings", "Aokana", "Rewrite (Fandom)",
    "Little Busters! (Fandom)", "Kanon (Fandom)", "Air (Fandom)", "Planetarian",
    "Summer Pockets", "Loopers", "Stella of the End", "Angel Beats! (Fandom)",
    "Jurassic World: Fallen Kingdom", "Jurassic World: Dominion", "Jurassic World Rebirth", "The Lost World: Jurassic Park",
    "Jurassic Park III", "King Kong", "Skull Island", "Planet of the Apes",
    "Rise of the Planet of the Apes", "Dawn of the Planet of the Apes", "War for the Planet of the Apes", "Kingdom of the Planet of the Apes",
    "The Meg 2: The Trench", "Rampage (Film)", "Godzilla (2014)", "Shin Godzilla",
    "Godzilla Singular Point", "Ultraman", "Ultraman: Rising", "Kamen Rider",
    "Super Sentai", "Power Rangers", "Power Rangers (2017)", "Mighty Morphin Power Rangers",
    "Power Rangers Dino Fury", "Power Rangers Beast Morphers", "Voltron", "Gundam Build Fighters",
    "Digimon Ghost Game", "Digimon Universe: App Monsters", "Yu-Gi-Oh! GX", "Yu-Gi-Oh! 5D's",
    "Yu-Gi-Oh! Zexal", "Yu-Gi-Oh! Arc-V", "Yu-Gi-Oh! Vrains", "Yu-Gi-Oh! Sevens",
    "Yu-Gi-Oh! Go Rush!!", "Beyblade Metal Fusion", "Beyblade X", "Cardfight!! Vanguard",
    "Duel Masters", "Future Card Buddyfight", "Bakugan (2007)", "Monsuno",
    "Chaotic", "Redakai", "Dinosaur King", "B-Daman",
    "Zoids", "Medabots", "The Last of Us (HBO)", "Fallout (Amazon)",
    "Twisted Metal (TV)", "Gran Turismo (2023)", "The Super Mario Bros. Movie (Fandom)", "Sonic the Hedgehog (Film Series)",
    "Detective Pikachu (Fandom)", "Rampage (2018)", "Werewolves Within (Film)", "Monster Hunter (Film)",
    "Resident Evil (Film Series)", "Resident Evil: Welcome to Raccoon City", "Resident Evil (Netflix)", "Castlevania (Fandom)",
    "Arcane (Fandom)", "Cyberpunk: Edgerunners (Fandom)", "Dragon Age: Absolution", "DOTA: Dragon's Blood (Fandom)",
    "League of Legends (Fandom)", "Valorant (Fandom)", "Overwatch (Fandom)", "Apex Legends (Fandom)",
    "Inglourious Basterds (Fandom)", "1917 (Fandom)", "Saving Private Ryan", "Black Hawk Down",
    "American Sniper", "Lone Survivor", "Hacksaw Ridge", "Fury",
    "Dunkirk (Fandom)", "The Hurt Locker", "Zero Dark Thirty", "13 Hours",
    "Green Zone", "Jarhead", "Full Metal Jacket", "Apocalypse Now",
    "Platoon", "Born on the Fourth of July", "Good Morning, Vietnam", "The Deer Hunter",
    "Letters from Iwo Jima", "Flags of Our Fathers", "Midway", "Pearl Harbor",
    "Windtalkers", "The Great Escape", "Bridge on the River Kwai", "The Dirty Dozen",
    "Where Eagles Dare", "Unforgiven", "Tombstone", "Wyatt Earp",
    "3:10 to Yuma", "Open Range", "Django Unchained (Fandom)", "The Hateful Eight (Fandom)",
    "True Grit (Fandom)", "The Magnificent Seven", "The Good, the Bad and the Ugly", "Once Upon a Time in the West",
    "A Fistful of Dollars", "For a Few Dollars More", "Hell or High Water", "No Country for Old Men (Fandom)",
    "The Power of the Dog (Fandom)", "News of the World", "The Sisters Brothers", "The Harder They Fall",
    "Bone Tomahawk", "The Revenant", "Meek's Cutoff", "First Cow",
    "The Assassination of Jesse James by the Coward Robert Ford", "Deadwood: The Movie", "Creed", "Creed II",
    "Creed III", "Rocky", "Rocky II", "Rocky III",
    "Rocky IV", "Rocky V", "Rocky Balboa", "Raging Bull",
    "The Fighter", "Million Dollar Baby (Fandom)", "Southpaw", "Warrior",
    "The Wrestler", "Foxcatcher", "I, Tonya", "King Richard",
    "Battle of the Sexes", "Ford v Ferrari (Fandom)", "Rush (Fandom)", "Talladega Nights (Fandom)",
    "Days of Thunder (Fandom)", "The Sandlot (Fandom)", "Field of Dreams (Fandom)", "42",
    "Bull Durham", "Major League", "The Natural", "For Love of the Game",
    "Trouble with the Curve", "The Rookie", "Fever Pitch", "Remember the Titans (Fandom)",
    "Friday Night Lights (Film)", "The Waterboy (Fandom)", "Any Given Sunday", "Draft Day",
    "Concussion", "The Blind Side (Fandom)", "We Are Marshall (Fandom)", "Rudy (Fandom)",
    "Radio", "The Express", "Brian's Song", "Hoosiers",
    "Coach Carter (Fandom)", "Glory Road", "He Got Game", "White Men Can't Jump",
    "Love & Basketball", "Blue Chips", "Space Jam (Fandom)", "Uncle Drew",
    "Hustle", "The Way Back", "McFarland, USA", "Million Dollar Arm",
    "The Legend of Bagger Vance", "Happy Gilmore (Fandom)", "Caddyshack", "Tin Cup",
    "The Greatest Game Ever Played", "Cinderella Man", "Ali", "When We Were Kings",
    "Bend It Like Beckham (Fandom)", "Goal!", "The Damned United", "Next Goal Wins",
    "The Boondocks", "Black Dynamite", "Mike Tyson Mysteries", "China, IL",
    "Mr. Pickles", "Hoops", "Chozen", "Legends of Chamberlain Heights",
    "Bordertown", "Allen Gregory", "Sit Down, Shut Up", "Napoleon Dynamite (TV)",
    "The Great North", "HouseBroken", "Duncanville", "Bless the Harts",
    "The Awesomes", "Ugly Americans", "Golan the Insatiable", "Neo Yokio",
    "Tigtone", "Ballmastrz: 9009", "Lazor Wulf", "YOLO: Crystal Fantasy",
    "Mr. Birchum", "RRR", "Baahubali", "Baahubali 2: The Conclusion",
    "KGF", "KGF: Chapter 2", "Pushpa", "Pushpa 2: The Rule",
    "Dangal", "3 Idiots", "PK", "Bajrangi Bhaijaan",
    "Padmaavat", "Lagaan", "Devdas", "Kabhi Khushi Kabhie Gham",
    "Dilwale Dulhania Le Jayenge", "Kal Ho Naa Ho", "Zindagi Na Milegi Dobara", "Gully Boy",
    "Brahmastra", "War", "Pathaan", "Jawan",
    "Animal", "Kalki 2898 AD", "Leo", "Vikram",
    "Jailer", "Master", "96", "Ponniyin Selvan",
    "Parasite (Fandom)", "Oldboy", "The Handmaiden (Fandom)", "Train to Busan (Fandom)",
    "Burning", "Decision to Leave", "The Wailing (Fandom)", "I Saw the Devil",
    "A Tale of Two Sisters", "Crouching Tiger, Hidden Dragon (Fandom)", "House of Flying Daggers (Fandom)", "Hero (Fandom)",
    "In the Mood for Love", "Chungking Express", "Fallen Angels", "The Grandmaster",
    "Amelie", "The Intouchables", "La Haine", "Blue Is the Warmest Color (Fandom)",
    "Portrait of a Lady on Fire (Fandom)", "Run Lola Run", "Das Boot", "The Lives of Others",
    "Downfall", "Goodbye Lenin!", "Toni Erdmann", "Cinema Paradiso",
    "Life Is Beautiful", "The Great Beauty", "Call Me by Your Name (Fandom)", "Roma",
    "Y Tu Mama Tambien", "Pan's Labyrinth", "The Devil's Backbone", "Volver",
    "Talk to Her", "All About My Mother", "City of God", "Central Station",
    "The Motorcycle Diaries", "Wild Tales", "The Secret in Their Eyes", "A Separation",
    "The Salesman", "Children of Heaven", "Taste of Cherry", "Trolls (Franchise)",
    "The Smurfs", "Smurfs", "Alvin and the Chipmunks", "The Chipmunks",
    "Garfield", "The Garfield Movie", "Peanuts", "Snoopy",
    "Calvin and Hobbes", "The Far Side", "Dilbert", "Archie Comics",
    "Betty and Veronica", "Sabrina the Teenage Witch (Archie)", "Josie and the Pussycats", "Jughead",
    "Sonic the Comic", "Beano", "Dandy", "Asterix",
    "The Adventures of Tintin", "Tintin", "Lucky Luke", "Spirou",
    "Blake and Mortimer", "Corto Maltese", "Valerian", "The Incal",
    "Metabarons", "Blacksad", "Persepolis (Fandom)", "Aya of Yop City",
    "Blankets", "Habibi", "Fun Home (Comic)", "Are You My Mother?",
    "Ghost World", "Black Hole", "Daytripper", "Habibi (Fandom)",
    "March", "American Born Chinese", "Boxers & Saints", "The Best We Could Do",
    "They Called Us Enemy", "New Kid", "Class Act", "Roller Girl",
    "Sisters", "Guts", "Drama", "Real Friends",
    "El Deafo", "The Prince and the Dressmaker", "Snapdragon", "Witch Hat Atelier",
    "A Silent Voice (Manga)",
  ];
  // Build the attributes that make any element carry a hover/focus/tap tooltip.
  function tipAttrs(text) { const t = esc(text); return `data-tip="${t}" tabindex="0" aria-label="${t}"`; }

  // A single shared tooltip bubble, shown on hover, keyboard focus, or tap for
  // anything carrying a data-tip attribute. This is how a reader learns what a
  // rating letter or a warning means without leaving the page.
  let tipEl = null;
  function ensureTip() {
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "wisp-tip"; tipEl.setAttribute("role", "tooltip"); document.body.appendChild(tipEl); }
    return tipEl;
  }
  function showTip(target) {
    const text = target.getAttribute("data-tip"); if (!text) return;
    const el = ensureTip();
    el.textContent = text;
    el.classList.add("is-open");
    const r = target.getBoundingClientRect();
    const tw = el.offsetWidth, th = el.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.top - th - 9, place = "top";
    if (top < 8) { top = r.bottom + 9; place = "bottom"; }   // flip below when there's no room above
    el.style.left = left + "px"; el.style.top = top + "px"; el.dataset.place = place;
    el.style.setProperty("--tip-arrow", Math.max(12, Math.min(r.left + r.width / 2 - left, tw - 12)) + "px");
  }
  function hideTip() { if (tipEl) tipEl.classList.remove("is-open"); }
  function initTips() {
    document.addEventListener("mouseover", (e) => { const t = e.target.closest("[data-tip]"); if (t) showTip(t); });
    document.addEventListener("mouseout", (e) => { if (e.target.closest("[data-tip]")) hideTip(); });
    document.addEventListener("focusin", (e) => { const t = e.target.closest("[data-tip]"); if (t) showTip(t); });
    document.addEventListener("focusout", hideTip);
    // Tap: a pure info marker (a span/icon, not a button or link) shows its tip
    // and doesn't fall through to a parent card's navigation.
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tip]");
      if (t && /^(SPAN|SVG|I|EM|B|SMALL)$/.test(t.tagName)) {
        e.preventDefault(); e.stopPropagation();
        const open = tipEl && tipEl.classList.contains("is-open") && tipEl.textContent === t.getAttribute("data-tip");
        open ? hideTip() : showTip(t);
        return;
      }
      if (!t) hideTip();
    }, true);
    window.addEventListener("scroll", hideTip, true);
    window.addEventListener("resize", hideTip);
  }

  // ---- serialization schedule: a friendly day + time an author updates on ---
  const SCHED_DAYS = [
    { v: "", l: "No set schedule" },
    { v: "every day", l: "Every day" },
    { v: "on weekdays", l: "Weekdays" },
    { v: "on weekends", l: "Weekends" },
    { v: "on Sundays", l: "Sundays" }, { v: "on Mondays", l: "Mondays" }, { v: "on Tuesdays", l: "Tuesdays" },
    { v: "on Wednesdays", l: "Wednesdays" }, { v: "on Thursdays", l: "Thursdays" }, { v: "on Fridays", l: "Fridays" },
    { v: "on Saturdays", l: "Saturdays" },
    { v: "every other week", l: "Every other week" }, { v: "monthly", l: "Monthly" }
  ];
  function fmtClock(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ""); if (!m) return "";
    let h = +m[1]; const mi = m[2]; const ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + mi + " " + ap;
  }
  function composeSchedule(day, time) {
    if (!day) return "";
    return day + (time ? " at " + fmtClock(time) + " ET" : "");
  }
  // Best-effort prefill from whatever text is already stored on the work.
  function parseSchedule(text) {
    const s = (text || "").toLowerCase(); let day = "", time = "";
    const found = SCHED_DAYS.find(d => d.v && s.indexOf(d.v.toLowerCase()) >= 0)
      || SCHED_DAYS.find(d => d.v && s.indexOf(d.l.toLowerCase()) >= 0);
    if (found) day = found.v;
    const t24 = /(\d{1,2}):(\d{2})/.exec(s);
    if (t24) {
      let h = +t24[1]; const mi = t24[2];
      if (/pm/.test(s) && h < 12) h += 12; if (/am/.test(s) && h === 12) h = 0;
      time = String(h).padStart(2, "0") + ":" + mi;
    }
    return { day: day, time: time };
  }
  // Several update days, joined for readers with semicolons (brand: no dashes).
  function composeScheduleMulti(pairs) {
    return (pairs || []).map(p => composeSchedule(p.day, p.time)).filter(Boolean).join("; ");
  }
  // Parse a stored schedule (one or several) back into day/time pairs to edit.
  function parseScheduleMulti(text) {
    const parts = String(text || "").split(/;\s*/).map(s => s.trim()).filter(Boolean);
    const pairs = parts.map(parseSchedule).filter(p => p.day);
    return pairs.length ? pairs : [{ day: "", time: "" }];
  }
  // One editable schedule row: a day dropdown, a time, and a remove control.
  function schedRowHTML(pair) {
    const opts = SCHED_DAYS.map(d => `<option value="${esc(d.v)}"${d.v === (pair.day || "") ? " selected" : ""}>${esc(d.l)}</option>`).join("");
    return `<div class="sched-row" data-sr>
      <select class="sr-day admin-select" aria-label="Update day">${opts}</select>
      <input type="time" class="sr-time" value="${esc(pair.time || "")}" aria-label="Update time (Eastern)">
      <button type="button" class="sr-del" data-sr-del aria-label="Remove this day">${icon("trash", 13)}</button>
    </div>`;
  }
  function schedRowsHTML(pairs) { return (pairs && pairs.length ? pairs : [{ day: "", time: "" }]).map(schedRowHTML).join(""); }

  // ---- a lightweight autocomplete for a comma-separated text input ----------
  // Completes the token after the last comma from suggestFn(); accept with click,
  // Enter, or Tab; navigate with the arrow keys; Escape closes.
  function attachAutocomplete(input, suggestFn) {
    const wrap = document.createElement("div"); wrap.className = "ac-wrap";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    const menu = document.createElement("div"); menu.className = "ac-menu"; wrap.appendChild(menu);
    let items = [], active = -1;
    const curToken = () => { const v = input.value; const i = v.lastIndexOf(","); return v.slice(i + 1).replace(/^\s+/, ""); };
    const entered = () => input.value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    function close() { menu.classList.remove("is-open"); menu.innerHTML = ""; items = []; active = -1; }
    function paint() { menu.querySelectorAll(".ac-item").forEach((b, i) => b.classList.toggle("is-active", i === active)); }
    function render() {
      const tok = curToken().trim().toLowerCase();
      if (!tok) { close(); return; }
      const has = new Set(entered());
      const all = (suggestFn() || []);
      const pre = all.filter(s => s.toLowerCase().startsWith(tok) && !has.has(s.toLowerCase()));
      const sub = all.filter(s => !s.toLowerCase().startsWith(tok) && s.toLowerCase().indexOf(tok) >= 0 && !has.has(s.toLowerCase()));
      items = pre.concat(sub).slice(0, 8);
      if (!items.length) { close(); return; }
      active = 0;
      menu.innerHTML = items.map((s, i) => `<button type="button" class="ac-item${i === 0 ? " is-active" : ""}" data-ac="${i}">${esc(s)}</button>`).join("");
      menu.classList.add("is-open");
    }
    function accept(i) {
      const s = items[i]; if (!s) return;
      const v = input.value; const idx = v.lastIndexOf(",");
      input.value = (idx >= 0 ? v.slice(0, idx + 1) + " " : "") + s + ", ";
      close(); input.focus();
    }
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(items.length - 1, active + 1); paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(0, active - 1); paint(); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); accept(active < 0 ? 0 : active); }
      else if (e.key === "Escape") { close(); }
    });
    menu.addEventListener("mousedown", (e) => { const b = e.target.closest("[data-ac]"); if (b) { e.preventDefault(); accept(+b.dataset.ac); } });
    input.addEventListener("blur", () => setTimeout(close, 140));
  }

  // Reader actions that persist for the session (a stand-in for the server), so
  // a work you hearted or subscribed to still reads that way when you come back.
  const userState = { hearted: new Set(), subscribed: new Set(), bookmarked: new Set(), visited: new Set(),
                      mutedTags: new Set(), blockedUsers: new Set(), following: new Set() };
  function markVisited(id) { if (id) userState.visited.add(id); }

  // Muted tags/sources and blocked authors persist across reloads (localStorage
  // via settings) and are honored in filteredWorks(), so they actually hide works.
  function persistPrefs() {
    settings.muted = Array.from(userState.mutedTags);
    settings.blocked = Array.from(userState.blockedUsers);
    save();
  }
  function muteTag(tag) {
    if (!tag) return;
    userState.mutedTags.add(tag); persistPrefs();
    toast("Muted " + tag + ". You won't see works tagged with it.");
    if (currentScreen === "browse") renderBrowse();
  }
  function blockUser(author) {
    if (!author) return;
    userState.blockedUsers.add(author); persistPrefs();
    toast("Blocked " + author + ".");
    if (currentScreen === "browse") renderBrowse();
  }

  /* ---- live data cache ---------------------------------------------------
     When Supabase is connected, the content screens read from these caches,
     which the loaders below fill from the database. In demo mode they stay
     empty and every accessor falls back to the bundled demo dataset, so the
     demo behaves exactly as before. */
  const LIVE = { works: [], byId: {}, chapters: {}, comments: {}, reactions: {}, upcoming: {}, series: [], events: [], myEvents: new Set(),
                 lib: { bookmarks: null, history: null, lists: null, things: null }, viewingList: null, resume: null, followingWorks: [], notifications: null,
                 hubs: [], myHubs: new Set(), hubCounts: {}, readingStats: null, hubPage: null, seriesPage: null };
  let liveEditor = null;   // { work, chapter } when editing a real work, else null
  let editorCover = null;  // uploaded cover URL for the current editor session
  let coverCleared = false; // true when the author removed an existing cover
  let editorFormat = "prose";   // "prose" or "comic" for the work being edited
  let editorPages = [];         // comic page image URLs, in order
  let editorProseHTML = "";     // stashed prose editor HTML, so a format toggle doesn't lose it
  let editorLineSpace = (() => { try { return localStorage.getItem("wisp.editorLineSpace") || "normal"; } catch (e) { return "normal"; } })();
  let dictation = null;         // active SpeechRecognition session, when dictating
  let comicIndex = 0;           // current page in the comic reader's single-page mode
  let comicKeyHandler = null;   // keydown handler for comic paging, removed between renders
  let pendingSeries = null; // series name to prefill when starting a new book in a series
  let guestBrowsing = false; // set when a visitor chooses to look around without an account
  let lastAuthUid;           // last signed-in user id, so we re-render only on real identity changes
  let profileShownFor = null; // uid whose loaded profile the current render reflects
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
  function rate(r) { return `<span class="rate rate--${r.toLowerCase()}" data-tip="${esc(rateTip(r))}" tabindex="0" role="img" aria-label="Rated ${esc((RATE_INFO[r] || {}).label || RATE[r] || r)}">${r}</span>`; }
  // The rating as a small pill for the card body, so it never sits on the cover.
  function ratePill(r) { const k = String(r || "G").toLowerCase(); return `<span class="pill pill--rate rate--${k}" data-tip="${esc(rateTip(r))}" tabindex="0" role="img" aria-label="Rated ${esc((RATE_INFO[r] || {}).label || RATE[r] || r)}">${esc(r)}</span>`; }

  function tagRow(tags, shown = 2) {
    const head = tags.slice(0, shown).map(t => `<button class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("");
    const rest = tags.slice(shown);
    // The +N button carries the hidden tags so a click can reveal them in place.
    const more = rest.length ? `<button class="tag--more tag" data-tag-more="${esc(JSON.stringify(rest))}">+${rest.length}</button>` : "";
    return `<div class="tag-row">${head}${more}</div>`;
  }

  // A work's fandom/source can hold several fandoms, comma-separated. Show each as
  // its own bubble (Wattpad-style), each linking to that fandom's collection, so a
  // multi-fandom crossover never reads as one long run-on pill.
  function splitSource(source) {
    return String(source || "").split(",").map(s => s.trim()).filter(Boolean);
  }
  function sourcePills(source, cls) {
    const extra = cls ? " " + cls : "";
    return splitSource(source).map(s =>
      `<button class="pill pill--link${extra}" data-tag="${esc(s)}">${esc(s)}</button>`).join("");
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
      <span class="card__cover">${cover(w.cover, w.title)}${flag}${readMark}</span>
      <span class="card__body">
        <span class="tag-row"><button class="pill pill--link" data-browse-type="${w.type}">${w.type === "fan" ? "Fanwork" : "Original"}</button>${sourcePills(w.source)}</span>
        <span class="card__titlerow"><a class="card__title" href="#/work/${w.id}">${esc(w.title)}</a>${ratePill(w.rating)}</span>
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

  // A compact, scannable row: a small cover, the title and author on one line,
  // a one-line summary, then tight inline metadata. Denser than the gallery
  // card on purpose, so more works fit on screen at once.
  function cardList(w) {
    const flag = w.format === "comic" ? "Comic" : (w.warnings[0] ? w.warnings[0] : "");
    return `<article class="list-card" data-work="${w.id}">
      <span class="list-card__cover">${cover(w.cover, w.title)}${userState.visited.has(w.id) ? `<span class="read-badge">${icon("check",11)} Read</span>` : ""}</span>
      <span class="list-card__main">
        <span class="list-card__line">
          <a class="list-card__title" href="#/work/${w.id}">${esc(w.title)}</a>
          ${ratePill(w.rating)}
          <span class="list-card__by">by ${esc(w.author)}</span>
        </span>
        <span class="list-card__summary">${esc(w.summary)}</span>
        <span class="list-card__meta">
          <button class="pill pill--sm pill--link" data-browse-type="${w.type}">${w.type === "fan" ? "Fanwork" : "Original"}</button>
          ${sourcePills(w.source, "pill--sm")}
          ${flag ? `<span class="pill pill--sm">${esc(flag)}</span>` : ""}
          <span class="list-card__stats">
            <span class="stat stat--heart">${icon("heart",13)}${esc(w.hearts)}</span>
            <span class="stat">${icon("eye",13)}${esc(w.reads)}</span>
            <span class="stat">${icon("comment",13)}${esc(w.comments)}</span>
            ${w.format === "comic" ? `<span class="stat">${icon("book",13)}${esc(w.chapters)}</span>` : `<span class="stat">${icon("clock",13)}${esc(w.read)}</span>`}
          </span>
        </span>
      </span>
    </article>`;
  }

  /* ======================================================================= */
  /*  SCREEN: HOME                                                            */
  /* ======================================================================= */
  let homeTab = "foryou";
  let liveHomeTab = "latest";
  async function loadHome() {
    loadingScreen("#screen-home");
    try {
      LIVE.works = await WispDB.listWorks({ sort: "recent", limit: 30 });
      LIVE.works.forEach(w => { LIVE.byId[w.id] = w; });
      LIVE.featured = await WispDB.listFeatured().catch(() => []);   // staff picks (admin-curated)
      LIVE.featured.forEach(w => { LIVE.byId[w.id] = w; });
      LIVE.resume = null; LIVE.followingWorks = []; LIVE.joinedEvents = [];
      if (WispDB.signedIn) {
        const p = await WispDB.latestProgress().catch(() => null);
        if (p) {
          const works = await WispDB.getWorksByIds([p.work_id]).catch(() => []);
          if (works[0]) LIVE.resume = { work: works[0], progress: p };
        }
        const ids = await WispDB.myFollowingIds().catch(() => []);
        LIVE.followingWorks = ids.length ? await WispDB.listWorks({ authors: ids, sort: "recent", limit: 30 }).catch(() => []) : [];
        // Events the reader has joined show as a compact strip they can click into.
        const [evs, mine] = await Promise.all([WispDB.listEvents().catch(() => []), WispDB.myEventIds().catch(() => new Set())]);
        const nowE = Date.now();
        LIVE.joinedEvents = (evs || []).filter(e => mine.has(e.id) && !eventExpired(e, nowE));
        loadReadingStats(true);   // refresh the week widget with anything read since
      }
    } catch (e) { console.error("[wisp] home load failed:", e); LIVE.works = LIVE.works || []; }
    renderHomeLive();
  }
  function renderHomeLive() {
    const following = liveHomeTab === "following";
    const works = following ? (LIVE.followingWorks || []) : (LIVE.works || []);
    const gridOf = (ws) => settings.view === "list"
      ? `<div class="stack-list">${ws.map(cardList).join("")}</div>`
      : `<div class="work-grid">${ws.map(cardGallery).join("")}</div>`;
    const grid = works.length ? gridOf(works)
      : following
        ? `<div style="text-align:center;padding:64px 0;color:var(--ink3)"><p style="font-size:16px;color:var(--ink2)">Nothing here yet.</p><p style="font-size:14px">Follow authors and their new works show up here.</p></div>`
        : `<div style="text-align:center;padding:64px 0;color:var(--ink3)">
             <p style="font-size:16px;color:var(--ink2)">No works have been posted yet.</p>
             <p style="font-size:14px">Be the first: write something in the Writing Station.</p>
             <p style="margin-top:16px"><button class="btn btn--primary btn--sm" data-nav="write">Go to the Writing Station</button></p>
           </div>`;
    $("#screen-home").innerHTML = `
      <div class="page">
        <h1 class="vh">Your reading home</h1>
        <div class="home-tabs">
          <button class="home-tab ${!following ? "is-active" : ""}" data-lhometab="latest">Latest</button>
          ${WispDB.signedIn ? `<button class="home-tab ${following ? "is-active" : ""}" data-lhometab="following">Following</button>` : ""}
          <div class="home-tabs__meta">
            <div class="view-toggle" role="group" aria-label="View mode">
              <button data-view="gallery" class="${settings.view === "gallery" ? "is-active" : ""}" aria-pressed="${settings.view === "gallery"}">Gallery</button>
              <button data-view="list" class="${settings.view === "list" ? "is-active" : ""}" aria-pressed="${settings.view === "list"}">List</button>
            </div>
          </div>
        </div>
        ${!following && LIVE.resume ? `<button class="resume" data-read="${LIVE.resume.work.id}">
          <span class="resume__cover">${cover(LIVE.resume.work.cover, LIVE.resume.work.title)}</span>
          <span class="resume__body">
            <span class="eyebrow rose" style="display:block;margin-bottom:5px">Continue reading</span>
            <span class="resume__title">${esc(LIVE.resume.work.title)}</span>
            <span class="progress"><span class="progress__track"><span class="progress__fill" style="width:${Math.max(6, LIVE.resume.progress.percent || 6)}%"></span></span><span class="progress__label">Chapter ${LIVE.resume.progress.chapter_number || 1}${LIVE.resume.progress.percent ? " &middot; " + Math.round(LIVE.resume.progress.percent) + "%" : ""}</span></span>
          </span>
          <span style="color:var(--rose);display:flex;align-items:center">${icon("chev",20)}</span>
        </button>` : ""}
        ${(LIVE.joinedEvents && LIVE.joinedEvents.length) ? `<section class="home-events">
          <div class="section-head"><h2>Your events</h2></div>
          <div class="home-events__row">
            ${LIVE.joinedEvents.map(e => {
              const dm = e.starts_at ? easternDayMonth(e.starts_at) : { day: e.day || "", month: e.month || "" };
              return `<a class="home-event" href="#/event/${e.id}">
                <span class="home-event__date"><b>${esc(dm.day)}</b><span>${esc(dm.month)}</span></span>
                <span class="home-event__body"><span class="home-event__title">${esc(e.title)}</span><span class="home-event__kind">${esc(e.kind || "Event")}</span></span>
                <span class="home-event__go">${icon("chev",16)}</span>
              </a>`;
            }).join("")}
          </div>
        </section>` : ""}
        ${(!following && LIVE.featured && LIVE.featured.length) ? `<section class="editorial" style="margin-bottom:26px">
          <div class="eyebrow rose" style="margin-bottom:8px">Staff picks</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px">
            ${LIVE.featured.map(w => `
              <button class="list-tile" data-work="${w.id}" style="display:flex;gap:12px;align-items:flex-start;text-align:left">
                <span class="mini-cover" style="width:44px;height:60px">${cover(w.cover, w.title)}</span>
                <span>
                  <span class="mini-work__title" style="display:block">${esc(w.title)}</span>
                  <span class="muted" style="font-size:12.5px;display:block;margin:5px 0 0;line-height:1.5">${esc(w.featuredNote || ("by " + w.author))}</span>
                </span>
              </button>`).join("")}
          </div>
          <p class="muted" style="font-size:12.5px;margin-top:14px">Chosen by the Wisp editors.</p>
        </section>` : ""}
        ${works.length ? `<div class="section-head"><h2>${following ? "From authors you follow" : "Latest works"}</h2>${!following ? '<button class="btn--link" data-nav="browse">Browse all &rsaquo;</button>' : ""}</div>` : ""}
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
  const filterState = { q:"", type:"all", status:"all", ratings:new Set(), tagsInc:new Set(), tagsExc:new Set(), sort:"hearts" };
  // The tag include/exclude sections are search-and-add: a search box, live
  // matches you click to add, and removable chips for what you picked. The query
  // and which box to refocus persist across the browse re-render so typing then
  // clicking a match feels continuous.
  const browseTagQ = { inc: "", exc: "" };
  let browseTagFocus = null;
  // Every tag a reader can pick from: the ones actually on works (most common
  // first), then the full catalog the editor autocompletes against. Deduped.
  function tagCatalog() {
    const seen = new Set(), out = [];
    const push = (t) => { const v = (t || "").trim(); if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); } };
    allTags().forEach(([t]) => push(t));
    (TAG_SUGGEST || []).forEach(push);
    (browseTagsFromDB || []).forEach(push);
    return out;
  }
  let browseTagsFromDB = [];
  function tagFilterSection(kind) {
    const chosen = kind === "inc" ? filterState.tagsInc : filterState.tagsExc;
    const chips = Array.from(chosen).map(t =>
      `<button class="tagsel${kind === "exc" ? " tagsel--exc" : ""}" data-clear="${kind}:${esc(t)}">${esc(t)} &times;</button>`).join("");
    const ph = kind === "inc" ? "Search tags to include" : "Search tags to exclude";
    return `<div class="tagfilter">
        ${chips ? `<div class="tagfilter__chosen">${chips}</div>` : ""}
        <input class="tagfilter__search" type="search" autocomplete="off" placeholder="${ph}" data-tagsearch="${kind}" aria-label="${ph}">
        <div class="tagfilter__results" data-tagresults="${kind}"></div>
      </div>`;
  }
  // Fill a section's live results from the current query, excluding what's already
  // chosen on either side. Touches only the results box, so the search keeps focus.
  function renderTagResults(kind) {
    const box = document.querySelector(`[data-tagresults="${kind}"]`); if (!box) return;
    const q = (browseTagQ[kind] || "").trim().toLowerCase();
    const chosenInc = filterState.tagsInc, chosenExc = filterState.tagsExc;
    let matches = tagCatalog().filter(t => {
      const lc = t.toLowerCase();
      if (chosenInc.has(t) || chosenExc.has(t)) return false;
      return !q || lc.indexOf(q) >= 0;
    });
    // With no query, show a handful of popular starters; with one, show more.
    matches = matches.slice(0, q ? 40 : 18);
    box.innerHTML = matches.length
      ? matches.map(t => `<button class="tag-pick" data-tagadd="${kind}:${esc(t)}">${icon("plus", 12)} ${esc(t)}</button>`).join("")
      : `<p class="muted" style="font-size:12px;margin:6px 2px 0">${q ? "No tags match &ldquo;" + esc(browseTagQ[kind]) + "&rdquo;." : "Start typing to find a tag."}</p>`;
  }
  // After the browse screen re-renders, put the queries back and refocus the box
  // the reader was using, so add-then-keep-searching flows without interruption.
  function restoreTagFilters() {
    ["inc", "exc"].forEach(kind => {
      const input = document.querySelector(`[data-tagsearch="${kind}"]`);
      if (input) input.value = browseTagQ[kind] || "";
      renderTagResults(kind);
    });
    if (browseTagFocus) {
      const input = document.querySelector(`[data-tagsearch="${browseTagFocus}"]`);
      if (input) { input.focus(); const v = input.value; input.value = ""; input.value = v; }
      browseTagFocus = null;
    }
  }
  function statusFilter(list) {
    if (filterState.status === "ongoing") return list.filter(w => !w.complete);
    if (filterState.status === "complete") return list.filter(w => w.complete);
    return list;
  }
  function allTags() {
    const m = new Map();
    activeWorks().forEach(w => (w.tags || []).forEach(t => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }
  function filteredWorks() {
    let list = activeWorks().slice();
    if (filterState.type !== "all") list = list.filter(w => w.type === filterState.type);
    list = statusFilter(list);
    if (filterState.ratings.size) list = list.filter(w => filterState.ratings.has(w.rating));
    if (filterState.tagsInc.size) list = list.filter(w => Array.from(filterState.tagsInc).every(t => w.tags.includes(t)));
    if (filterState.tagsExc.size) list = list.filter(w => !w.tags.some(t => filterState.tagsExc.has(t)));
    if (userState.mutedTags.size) list = list.filter(w => !userState.mutedTags.has(w.source) && !(w.tags || []).some(t => userState.mutedTags.has(t)));
    if (userState.blockedUsers.size) list = list.filter(w => !userState.blockedUsers.has(w.author));
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
  // In live mode the backend has already applied search, type, rating, and
  // sort, so keep its order and only refine by tag include/exclude and the
  // reader's mutes and blocks. In demo mode everything is filtered in place.
  function browseResults() {
    if (!isLive()) return filteredWorks();
    let list = (LIVE.works || []).slice();
    list = statusFilter(list);
    if (filterState.tagsInc.size) list = list.filter(w => Array.from(filterState.tagsInc).every(t => w.tags.includes(t)));
    if (filterState.tagsExc.size) list = list.filter(w => !w.tags.some(t => filterState.tagsExc.has(t)));
    if (userState.mutedTags.size) list = list.filter(w => !userState.mutedTags.has(w.source) && !(w.tags || []).some(t => userState.mutedTags.has(t)));
    if (userState.blockedUsers.size) list = list.filter(w => !userState.blockedUsers.has(w.author));
    return list;
  }
  // ---- Saved searches (kept on this device) --------------------------------
  function savedSearches() { return Array.isArray(settings.savedSearches) ? settings.savedSearches : []; }
  function currentSearchSnapshot() {
    return {
      q: filterState.q || "", type: filterState.type || "all", sort: filterState.sort || "hearts",
      ratings: Array.from(filterState.ratings), tagsInc: Array.from(filterState.tagsInc), tagsExc: Array.from(filterState.tagsExc)
    };
  }
  function sameSearch(a, b) {
    const norm = (s) => JSON.stringify({
      q: s.q || "", type: s.type || "all", sort: s.sort || "hearts",
      ratings: [...(s.ratings || [])].sort(), tagsInc: [...(s.tagsInc || [])].sort(), tagsExc: [...(s.tagsExc || [])].sort()
    });
    return norm(a) === norm(b);
  }
  function searchLabel(s) {
    const bits = [];
    if (s.q) bits.push(`“${s.q}”`);
    if (s.type && s.type !== "all") bits.push(s.type === "fan" ? "Fanwork" : "Original");
    (s.ratings || []).forEach(r => bits.push(RATE[r] || r));
    (s.tagsInc || []).forEach(t => bits.push(t));
    (s.tagsExc || []).forEach(t => bits.push("not " + t));
    if (!bits.length) bits.push("All works");
    return bits.join(" · ");
  }
  function saveCurrentSearch() {
    const snap = currentSearchSnapshot();
    const list = savedSearches().slice();
    if (list.some(s => sameSearch(s, snap))) { toast("That search is already saved."); return; }
    list.unshift(snap);
    settings.savedSearches = list.slice(0, 12);
    save();
    renderBrowse();
    toast("Search saved to this device.");
  }
  function applySavedSearch(i) {
    const s = savedSearches()[i]; if (!s) return;
    filterState.q = s.q || ""; filterState.type = s.type || "all"; filterState.sort = s.sort || "hearts";
    filterState.ratings = new Set(s.ratings || []);
    filterState.tagsInc = new Set(s.tagsInc || []);
    filterState.tagsExc = new Set(s.tagsExc || []);
    const si = $("#searchInput"); if (si) si.value = filterState.q;
    refreshBrowse();
  }
  function removeSavedSearch(i) {
    const list = savedSearches().slice();
    list.splice(i, 1);
    settings.savedSearches = list;
    save();
    renderBrowse();
  }

  function renderBrowse() {
    const excCount = filterState.tagsExc.size;
    const results = browseResults();
    const saved = savedSearches();
    const savedHTML = saved.length ? `<div class="saved-searches">
        <span class="saved-searches__label">${icon("bookmark",13)} Saved</span>
        ${saved.map((s, i) => `<span class="saved-chip"><button class="saved-chip__go" data-apply-search="${i}">${esc(searchLabel(s))}</button><button class="saved-chip__x" data-del-search="${i}" aria-label="Remove saved search">&times;</button></span>`).join("")}
      </div>` : "";
    const applied = [
      ...(filterState.q ? [`<button class="chip-x" data-clear="q">&ldquo;${esc(filterState.q)}&rdquo; &times;</button>`] : []),
      ...(filterState.type !== "all" ? [`<button class="chip-x" data-clear="type">${filterState.type === "fan" ? "Fanwork" : "Original"} ${icon("plus",12)}</button>`] : []),
      ...(filterState.status !== "all" ? [`<button class="chip-x" data-clear="status">${filterState.status === "complete" ? "Complete" : "In progress"} &times;</button>`] : []),
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
                <div style="margin-top:12px">
                  <div class="muted" style="font-size:12px;margin-bottom:6px">Status</div>
                  <div class="seg" role="group" aria-label="Status">
                    <button data-status="all" class="${filterState.status === "all" ? "is-on" : ""}" aria-pressed="${filterState.status === "all"}">Any</button>
                    <button data-status="ongoing" class="${filterState.status === "ongoing" ? "is-on" : ""}" aria-pressed="${filterState.status === "ongoing"}">In progress</button>
                    <button data-status="complete" class="${filterState.status === "complete" ? "is-on" : ""}" aria-pressed="${filterState.status === "complete"}">Complete</button>
                  </div>
                </div>
                <div style="margin-top:12px">
                  <div class="muted" style="font-size:12px;margin-bottom:6px">Rating</div>
                  ${["G","T","M","E"].map(r => `<label class="check"><input type="checkbox" data-rating="${r}" ${filterState.ratings.has(r) ? "checked" : ""}> ${RATE[r]}</label>`).join("")}
                </div>
              </div>
            </details>

            <details class="filter-group" open>
              <summary>Tags ${filterState.tagsInc.size ? `<span class="filter-group__count">${filterState.tagsInc.size}</span>` : ""} ${icon("chev",16).replace("<svg","<svg class='chev'")}</summary>
              <div class="filter-body">
                <p class="muted" style="font-size:12px;margin:0 0 8px">Search and tap the tags you want to see.</p>
                ${tagFilterSection("inc")}
              </div>
            </details>

            <details class="filter-group">
              <summary>Exclude ${excCount ? `<span class="filter-group__count">${excCount}</span>` : ""} ${icon("chev",16).replace("<svg","<svg class='chev'")}</summary>
              <div class="filter-body">
                <p class="muted" style="font-size:12px;margin:0 0 8px">Search and tap tags to hide. Tags you have muted are always excluded.</p>
                ${tagFilterSection("exc")}
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
            ${savedHTML}
            ${applied ? `<div class="applied">${applied}</div>` : ""}
            ${results.length
              ? (settings.view === "list"
                  ? `<div class="stack-list">${results.map(cardList).join("")}</div>`
                  : `<div class="work-grid">${results.map(cardGallery).join("")}</div>`)
              : (filterState.q
                  ? `<div style="text-align:center;padding:70px 0;color:var(--ink3)"><p style="font-size:16px">No works match &ldquo;${esc(filterState.q)}&rdquo;.</p><p style="font-size:14px">Try a different word, or clear the search.</p></div>`
                  : activeWorks().length === 0
                    ? `<div style="text-align:center;padding:70px 0;color:var(--ink3)"><p style="font-size:16px">No works here yet.</p><p style="font-size:14px">Post the first one from the Writing Station.</p></div>`
                    : `<div style="text-align:center;padding:70px 0;color:var(--ink3)"><p style="font-size:16px">Nothing matches yet.</p><p style="font-size:14px">Loosen a filter, or clear the exclusions.</p></div>`)}
          </div>
        </div>
      </div>`;
    // Repopulate the tag search boxes and restore focus so add-then-search flows.
    restoreTagFilters();
    // Pull the live tag list once so the catalog is richer than the demo works.
    if (isLive() && !browseTagsFromDB.length && window.WispDB && WispDB.listTags) {
      WispDB.listTags(600).then(list => {
        if (Array.isArray(list) && list.length) { browseTagsFromDB = list; renderTagResults("inc"); renderTagResults("exc"); }
      }).catch(() => {});
    }
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
      const releasedRows = released.map(c => `<button class="chapter-row" data-read="${w.id}/${c.number}">
          <span class="chapter-row__n">${c.number}</span>
          <span class="chapter-row__title">Chapter ${c.number}${c.title ? ": " + esc(c.title) : ""} <span class="ch-lock ch-lock--open" title="Released">${icon("unlock",13)}</span></span>
          <span class="chapter-row__when">posted ${WispDB.relTime(c.published_at || c.scheduled_for || c.created_at)}</span>
        </button>`).join("");
      const lockedRows = upcoming.map(u => `<div class="chapter-row chapter-row--locked" aria-label="Chapter ${u.number}, scheduled">
          <span class="chapter-row__n">${u.number}</span>
          <span class="chapter-row__title">Chapter ${u.number} <span class="ch-lock" title="Scheduled">${icon("lock",13)}</span> <span class="ch-countdown" data-countdown="${esc(u.scheduled_for)}">Time till release: &hellip;</span></span>
          <span class="chapter-row__when">${esc(fmtEasternStamp(u.scheduled_for))}</span>
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
            <span class="tag-row"><button class="pill pill--link" data-browse-type="${w.type}">${w.type === "fan" ? "Fanwork" : "Original"}</button>${sourcePills(w.source)}${w.format === "comic" ? '<span class="pill">Comic</span>' : ""}</span>
            <h1 class="work-hero__title">${esc(w.title)}</h1>
            ${w._db && w.seriesId && w.seriesName ? `<div style="font-size:14px;margin:2px 0 4px"><a href="#/series/${w.seriesId}" class="series-crumb">${icon("book",13)} ${esc(w.seriesName)}${w.book ? `, book ${w.book}` : ""}</a></div>` : ""}
            <div class="soft" style="font-size:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span>by <a href="#/${w._db && w.authorId ? "user/" + (w.authorHandle || w.authorId) : "profile"}">${esc(w.author)}</a></span>
              ${(w._db && w.authorId && !(WispDB.profile && WispDB.profile.id === w.authorId))
                ? `<button class="btn btn--quiet btn--sm ${userState.following.has(w.authorId) ? "is-on-quiet" : ""}" data-follow="${w.authorId}" aria-pressed="${userState.following.has(w.authorId)}">${userState.following.has(w.authorId) ? "Following" : "Follow"}</button>`
                : ""}
            </div>
            <div class="work-hero__meta">
              ${rate(w.rating)} <span>${RATE[w.rating]}</span>
              ${w.warnings.length ? `<span style="color:var(--rose-ink)">${icon("flag",14)} ${w.warnings.map(esc).join(", ")}</span>` : `<span class="muted">${icon("check",14)} No warnings</span>`}
              <span>${icon("book",14)} ${w.complete ? w.chapters + " chapters, complete" : w.chapters + " chapters, ongoing"}</span>
              ${w.words ? `<span>${w.words} words</span>` : ""}
              ${w.read ? `<span>${icon("clock",14)} ${w.read}</span>` : ""}
            </div>
            <p class="soft" style="font-size:16px;line-height:1.6;max-width:620px">${w.summary ? esc(w.summary) : '<span class="muted">No synopsis yet. Open the work to start reading.</span>'}</p>
            ${w.schedule && !w.complete ? `<p class="work-schedule">${icon("clock",14)} Updates ${esc(w.schedule)}</p>` : ""}
            <div style="margin:16px 0">${tagRow(w.tags, 12)}</div>
            <div class="work-actions">
              <button class="btn btn--primary" data-read="${w.id}">${icon("book",16)} Start reading</button>
              <button class="btn ${userState.hearted.has(w.id) ? "btn--primary" : "btn--ghost"}" data-toggle="heart" aria-pressed="${userState.hearted.has(w.id)}">${icon("heart",16)}<span class="toggle-label">${userState.hearted.has(w.id) ? "Hearted" : "Heart"}</span></button>
              <button class="btn btn--quiet ${userState.subscribed.has(w.id) ? "is-on-quiet" : ""}" data-toggle="subscribe" aria-pressed="${userState.subscribed.has(w.id)}">${icon("bell",16)}<span class="toggle-label">${userState.subscribed.has(w.id) ? "Subscribed" : "Subscribe"}</span></button>
              <button class="btn btn--quiet ${userState.bookmarked.has(w.id) ? "is-on-quiet" : ""}" data-toggle="bookmark" aria-pressed="${userState.bookmarked.has(w.id)}">${icon("bookmark",16)}<span class="toggle-label">${userState.bookmarked.has(w.id) ? "Bookmarked" : "Bookmark"}</span></button>
              <button class="btn btn--quiet" data-share="${w.id}">${icon("share",16)} Share</button>
              <button class="btn btn--quiet" data-download="${w.id}">${icon("download",16)} Download</button>
              <button class="btn btn--quiet" data-work-overflow="${w.id}" aria-label="More options">${icon("more",16)}</button>
            </div>
            ${w.hideStats ? "" : `<div class="card__stats" style="border:0;max-width:420px;padding:0">
              <span class="stat stat--heart">${icon("heart",15)}${w.hearts} hearts</span>
              <span class="stat">${icon("comment",15)}${w.comments}</span>
              <span class="stat">${icon("eye",15)}${w.reads}</span>
            </div>`}
          </div>
        </div>

        <h2 class="shelf__title" style="margin-bottom:14px">Chapters</h2>
        <div class="chapter-list">${rows}</div>
      </div>`;
    startCountdowns();
  }

  /* ---- Eastern Time (ET) anchoring ---------------------------------------
     Scheduling and release countdowns are anchored to US Eastern Time
     (America/New_York, which shifts between EST and EDT with daylight saving),
     so a release time means the same clock time for every reader, whatever
     timezone their own device is in. */
  const EASTERN_TZ = "America/New_York";
  function easternParts(instant) {
    const dtf = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN_TZ, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = {};
    dtf.formatToParts(instant).forEach(x => { if (x.type !== "literal") p[x.type] = x.value; });
    return p;
  }
  // How far Eastern Time sits from UTC, in ms, at a given instant (handles DST).
  function easternOffsetMs(instant) {
    const p = easternParts(instant);
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return asUTC - instant.getTime();
  }
  // Read an Eastern wall-clock "YYYY-MM-DDThh:mm" as the absolute instant it names.
  function easternWallToInstant(raw) {
    const naive = Date.parse(raw + "Z");                 // first read the wall time as if it were UTC
    if (isNaN(naive)) return new Date(NaN);
    let off = easternOffsetMs(new Date(naive));
    let instant = naive - off;
    const off2 = easternOffsetMs(new Date(instant));     // correct once across a DST boundary
    if (off2 !== off) instant = naive - off2;
    return new Date(instant);
  }
  // Format an instant as the "YYYY-MM-DDThh:mm" a datetime-local input wants, in ET.
  function toEasternInputValue(instant) {
    const p = easternParts(instant);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  // A human release stamp in ET, e.g. "Aug 20, 2026, 6:00 PM ET".
  function fmtEasternStamp(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", { timeZone: EASTERN_TZ, month: "short", day: "numeric",
      year: "numeric", hour: "numeric", minute: "2-digit" }).format(d) + " ET";
  }
  // The short date badge (day + month abbreviation) for an instant, in ET.
  function easternDayMonth(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { day: "", month: "" };
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN_TZ, month: "short", day: "numeric" }).formatToParts(d);
    const m = parts.find(p => p.type === "month"), day = parts.find(p => p.type === "day");
    return { day: day ? day.value : "", month: m ? m.value : "" };
  }

  /* ---- live countdowns (chapter releases and events) --------------------- */
  let countdownTimer = null;
  function fmtCountdown(ms, label, doneText) {
    label = label || "Time till release";
    if (ms <= 0) return doneText || "Releasing now";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return label + ": " + (d ? d + (d === 1 ? " day, " : " days, ") : "") +
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
        el.textContent = fmtCountdown(left, el.dataset.countdownLabel, el.dataset.countdownDone);
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
  let editingComment = null;   // id of the comment currently being edited inline

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
          <div><span class="comment__who">${esc(c.who)}</span>${c.author ? ' <span class="pill" style="padding:2px 6px">Author</span>' : ""}${badgeMiniRow(c.badges || (c.author ? ["beloved", "kept-the-flame"] : []))}<span class="comment__when">${esc(c.when)}</span></div>
          <div class="comment__text">${esc(c.text)}</div>
          <div class="comment__acts"><button data-heart-c>${icon("heart",12)} Heart</button><button data-reply>Reply</button></div>
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

  function renderReading(reqId, chapterNum) {
    openThreads.clear();               // the DOM is rebuilt below; open-state must reset
    const liveWork = LIVE.byId[reqId];
    if (liveWork && liveWork._db) { renderLiveReading(liveWork, LIVE.chapters[reqId] || [], chapterNum); return; }
    const c = W.CHAPTER;
    // Restore any demo comments kept on this device, so they survive a reload.
    (loadLocalComments("demo") || []).forEach(r => {
      const p = c.paragraphs[r.paragraph_index]; if (!p) return;
      p.thread = p.thread || { reactions: {}, comments: [] };
      if (!p.thread.comments.some(x => x.id === r.id)) p.thread.comments.push({ id: r.id, who: r.display_name || "You", init: ((r.display_name || "Y")[0] || "Y").toUpperCase(), when: "saved", text: r.body });
    });
    const flagship = (!reqId || reqId === "amber");
    const w = W.byId[reqId] || W.byId.amber;
    markVisited(flagship ? "amber" : w.id);
    notifyReadActivity((flagship ? "amber" : w.id) + ":" + (chapterNum || 1));
    startReadSession(wordCountOf((W.CHAPTER && W.CHAPTER.paragraphs ? W.CHAPTER.paragraphs.join(" ") : "")));

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
        <div class="reader__progress" id="readProgress"><i></i><span class="reader__pct" aria-hidden="true">0%</span></div>
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

  // ---- Markdown (a small, safe subset) -------------------------------------
  // Chapter bodies are stored as Markdown. We never inject raw user HTML: every
  // value passes through esc() before any of our own tags are added, so the
  // reader stays XSS-safe. Supported: # headings, > quotes, - / 1. lists,
  // --- rules, and inline **bold**, *italic*, `code`, and [links](https://...).
  const MD_CA = String.fromCharCode(0xE000), MD_CB = String.fromCharCode(0xE001);

  function mdInline(text) {
    let s = esc(String(text == null ? "" : text));
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return MD_CA + (codes.length - 1) + MD_CB; });
    // Inline image, before the link rule so the leading ! is not left behind.
    // s is already escaped, so u/a are safe to drop into attributes as-is.
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, a, u) =>
      /^https?:\/\//i.test(u) ? `<img src="${u}" alt="${a}" loading="lazy" decoding="async" style="max-width:100%;height:auto">` : m);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) =>
      /^(https?:|mailto:)/i.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${t}</a>` : m);
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
         .replace(/__([^_]+?)__/g, "<strong>$1</strong>");
    // Highlight (==text==) and underline (++text++), before single * / _ italics.
    s = s.replace(/==([^=]+?)==/g, '<mark class="hl">$1</mark>');
    s = s.replace(/\+\+([^+]+?)\+\+/g, "<u>$1</u>");
    // Per-word font size: {{18|exact point size}}, plus older {+bigger+}/{-smaller-}.
    s = s.replace(/\{\{(\d{1,3}(?:\.\d)?)\|([^{}]+?)\}\}/g, (m, n, t) => `<span style="font-size:${Math.max(8, Math.min(96, Math.round(+n)))}px">${t}</span>`);
    s = s.replace(/\{\+([^{}]+?)\+\}/g, '<span class="fs-lg">$1</span>');
    s = s.replace(/\{-([^{}]+?)-\}/g, '<span class="fs-sm">$1</span>');
    s = s.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
         .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?!_)/g, "$1<em>$2</em>");
    s = s.replace(new RegExp(MD_CA + "(\\d+)" + MD_CB, "g"), (_, i) => `<code>${codes[+i]}</code>`);
    return s;
  }

  function splitBlocks(body) {
    const text = String(body == null ? "" : body).replace(/\r\n/g, "\n").trim();
    if (!text) return [];
    let parts = text.split(/\n{2,}/).map(s => s.replace(/^\n+|\n+$/g, "")).filter(s => s.trim());
    if (parts.length <= 1 && /\n/.test(text)) {
      parts = [];
      let buf = [];
      const flush = () => { if (buf.length) { parts.push(buf.join("\n")); buf = []; } };
      for (const line of text.split(/\n/)) {
        if (!line.trim()) { flush(); continue; }
        buf.push(line);
        if (!/^\s*([-*]\s+|\d+\.\s+|>\s?)/.test(line)) flush();
      }
      flush();
    }
    return parts.length ? parts : [text];
  }

  // ---- Embeds: images and safe, sandboxed interactive frames ---------------
  // A chapter can embed media on its own line: ![alt](url) for an image, or
  // @[label](url) for a rich embed. Only https is allowed. Interactive frames
  // are built for a fixed provider whitelist (video, maps, audio) and rendered
  // sandboxed; anything else becomes a plain link card. No user HTML is injected.
  function embedInfo(url) {
    let u; try { u = new URL(url); } catch (e) { return null; }
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, ""), path = u.pathname;
    if (host === "youtu.be") { const id = path.slice(1).split("/")[0]; if (/^[\w-]{6,}$/.test(id)) return { kind: "video", src: "https://www.youtube-nocookie.com/embed/" + id }; }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const m = path.match(/^\/embed\/([\w-]{6,})/); if (m) return { kind: "video", src: "https://www.youtube-nocookie.com/embed/" + m[1] };
      const id = u.searchParams.get("v"); if (id && /^[\w-]{6,}$/.test(id)) return { kind: "video", src: "https://www.youtube-nocookie.com/embed/" + id };
    }
    if (host === "vimeo.com") { const id = path.split("/").filter(Boolean)[0]; if (/^\d+$/.test(id)) return { kind: "video", src: "https://player.vimeo.com/video/" + id }; }
    if (host === "player.vimeo.com" && /^\/video\/\d+/.test(path)) return { kind: "video", src: u.origin + path };
    if ((host === "google.com" || host === "maps.google.com") && /^\/maps\/embed/.test(path)) return { kind: "map", src: u.href };
    if (host === "google.com" && /^\/maps/.test(path)) { const q = u.searchParams.get("q"); if (q) return { kind: "map", src: "https://maps.google.com/maps?q=" + encodeURIComponent(q) + "&z=14&output=embed" }; }
    if (host === "openstreetmap.org" && /^\/export\/embed/.test(path)) return { kind: "map", src: u.href };
    if (host === "open.spotify.com" && /^\/(track|album|playlist|episode|show)\//.test(path)) return { kind: "audio", src: "https://open.spotify.com/embed" + path };
    return null;
  }
  function imageEmbedHTML(url, alt, size) {
    if (!/^https:\/\//i.test(url)) return `<p>${mdInline("![" + alt + "](" + url + ")")}</p>`;
    const sz = (size === "small" || size === "medium") ? size : "full";
    return `<figure class="embed embed--img is-${sz}" data-size="${sz}"><img src="${esc(url)}" alt="${esc(alt || "")}" loading="lazy" decoding="async">${alt ? `<figcaption>${esc(alt)}</figcaption>` : ""}</figure>`;
  }
  function linkCardHTML(url, label) {
    let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
    return `<a class="embed embed--link" href="${esc(url)}" target="_blank" rel="noopener nofollow"><span class="embed-link__label">${esc(label || url)}</span><span class="embed-link__host">${esc(host)} &#8599;</span></a>`;
  }
  function richEmbedHTML(url, label) {
    const info = embedInfo(url);
    if (!info) return linkCardHTML(url, label);
    const allow = info.kind === "video" ? 'allow="fullscreen; picture-in-picture; encrypted-media"'
      : info.kind === "audio" ? 'allow="encrypted-media; clipboard-write"' : "";
    let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
    // Send just the origin (not the full URL): providers like YouTube need to
    // see the embedding domain or they refuse with a "player configuration error".
    const frame = `<div class="embed--${info.kind}"><iframe src="${esc(info.src)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation" ${allow} allowfullscreen title="${esc(label || "Embedded content")}"></iframe></div>`;
    // A caption link so readers can jump straight to the source (like the sample).
    const src = `<figcaption class="embed__source"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc((label && label.trim()) || ("Open on " + host))} <span aria-hidden="true">&#8599;</span></a></figcaption>`;
    return `<figure class="embed embed--rich">${frame}${src}</figure>`;
  }

  function renderBlock(block) {
    // A leading [[center]] / [[right]] token sets the block's alignment.
    let raw = String(block), align = "";
    const am = raw.match(/^\[\[(center|right)\]\]\s?/);
    if (am) { align = am[1]; raw = raw.slice(am[0].length); }
    const sa = align ? ` style="text-align:${align}"` : "";
    const lines = raw.split(/\n/);
    const first = lines[0].trim();
    const img = lines.length === 1 && first.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+?)(?:\s+"(small|medium|full)")?\)$/);
    if (img) return imageEmbedHTML(img[2], img[1], img[3]);
    const emb = lines.length === 1 && first.match(/^@\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/);
    if (emb) return richEmbedHTML(emb[2], emb[1]);
    if (lines.length === 1 && /^(-{3,}|\*{3,}|_{3,})$/.test(first)) return "<hr>";
    const h = lines.length === 1 && first.match(/^(#{1,3})\s+(.*)$/);
    if (h) { const tag = ["h2", "h3", "h4"][h[1].length - 1]; return `<${tag}${sa}>${mdInline(h[2])}</${tag}>`; }
    if (lines.every(l => /^>\s?/.test(l)))
      return `<blockquote${sa}>${lines.map(l => mdInline(l.replace(/^>\s?/, ""))).join("<br>")}</blockquote>`;
    if (lines.every(l => /^[-*]\s+/.test(l.trim())))
      return `<ul${sa}>` + lines.map(l => `<li>${mdInline(l.trim().replace(/^[-*]\s+/, ""))}</li>`).join("") + "</ul>";
    if (lines.every(l => /^\d+\.\s+/.test(l.trim())))
      return `<ol${sa}>` + lines.map(l => `<li>${mdInline(l.trim().replace(/^\d+\.\s+/, ""))}</li>`).join("") + "</ol>";
    return `<p${sa}>${lines.map(l => mdInline(l)).join("<br>")}</p>`;
  }

  function mdToHtmlBlocks(body) { return splitBlocks(body).map(renderBlock); }

  // ---- Editor DOM -> Markdown (for saving) ---------------------------------
  // Walks the contenteditable and serializes it back to Markdown. Handles what
  // execCommand and typing produce: <p>/<div> paragraphs, <h2>-<h6>, <blockquote>,
  // <ul>/<ol>, <hr>, and inline <strong>/<b>, <em>/<i>, <a>, <code>, <br>.
  function inlineToMd(node) {
    let out = "";
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.nodeName.toLowerCase();
      if (tag === "br") { out += "\n"; return; }
      if (tag === "img") { const src = n.getAttribute("src") || ""; const alt = n.getAttribute("alt") || ""; out += src ? `![${alt}](${src})` : ""; return; }
      const inner = inlineToMd(n);
      if (tag === "strong" || tag === "b") out += inner.trim() ? `**${inner}**` : inner;
      else if (tag === "em" || tag === "i") out += inner.trim() ? `*${inner}*` : inner;
      else if (tag === "u" || tag === "ins") out += inner.trim() ? `++${inner}++` : inner;
      else if (tag === "mark") out += inner.trim() ? `==${inner}==` : inner;
      else if (tag === "span" && n.style && n.style.fontSize) { const px = Math.round(parseFloat(n.style.fontSize)); out += (inner.trim() && px) ? `{{${px}|${inner}}}` : inner; }
      else if (tag === "span" && n.classList && n.classList.contains("fs-lg")) out += inner.trim() ? `{+${inner}+}` : inner;
      else if (tag === "span" && n.classList && n.classList.contains("fs-sm")) out += inner.trim() ? `{-${inner}-}` : inner;
      else if (tag === "code") out += "`" + inner + "`";
      else if (tag === "a") { const href = n.getAttribute("href") || ""; out += /^(https?:|mailto:)/i.test(href) ? `[${inner}](${href})` : inner; }
      else out += inner;
    });
    return out;
  }

  // A centered or right-aligned block keeps its alignment through Markdown with
  // a small leading token the renderer understands. Left is the default (none).
  function alignPrefix(node) {
    let a = "";
    try { a = (node.style && node.style.textAlign) || node.getAttribute("align") || ""; } catch (e) {}
    a = String(a).toLowerCase();
    return a === "center" ? "[[center]] " : (a === "right" ? "[[right]] " : "");
  }
  function serializeBlock(node, tag) {
    if (tag === "hr") return "---";
    if (tag === "ul")
      return Array.from(node.children).filter(c => c.nodeName.toLowerCase() === "li")
        .map(li => "- " + inlineToMd(li).replace(/\s+/g, " ").trim()).filter(s => s !== "-").join("\n");
    if (tag === "ol")
      return Array.from(node.children).filter(c => c.nodeName.toLowerCase() === "li")
        .map((li, i) => (i + 1) + ". " + inlineToMd(li).replace(/\s+/g, " ").trim()).filter(s => !/^\d+\.$/.test(s)).join("\n");
    if (tag === "blockquote")
      return inlineToMd(node).replace(/^\n+|\n+$/g, "").split("\n").map(l => "> " + l).join("\n");
    if (tag === "h1" || tag === "h2") return alignPrefix(node) + "# " + inlineToMd(node).replace(/\s+/g, " ").trim();
    if (tag === "h3") return alignPrefix(node) + "## " + inlineToMd(node).replace(/\s+/g, " ").trim();
    if (/^h[4-6]$/.test(tag)) return alignPrefix(node) + "### " + inlineToMd(node).replace(/\s+/g, " ").trim();
    return alignPrefix(node) + inlineToMd(node).replace(/\n{2,}/g, "\n").replace(/^\n+|\n+$/g, "");
  }

  // An inserted image or an embed lives in the editor as a <figure> (or a bare
  // <img>). Serialize it back to its Markdown line so it round-trips exactly:
  // the URL rides in an attribute, never as fragile editable text.
  function figureOrImgToMd(node) {
    const isImg = node.nodeName.toLowerCase() === "img";
    const img = isImg ? node : (node.querySelector ? node.querySelector("img") : null);
    if (img) {
      const src = img.getAttribute("src") || "", alt = img.getAttribute("alt") || "";
      if (!src) return "";
      // The chosen scale rides in the Markdown "title" slot: ![alt](url "small").
      let size = "";
      if (node.getAttribute) size = node.getAttribute("data-size") || "";
      if (!size && node.classList) size = node.classList.contains("is-small") ? "small" : node.classList.contains("is-medium") ? "medium" : "";
      return (size === "small" || size === "medium") ? `![${alt}](${src} "${size}")` : `![${alt}](${src})`;
    }
    const a = node.querySelector ? node.querySelector(".embed__source a[href], a[href]") : null;
    if (a) {
      const href = a.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href)) return "";
      let label = (a.textContent || "").replace(/↗/g, "").trim();
      if (/^Open on /.test(label)) label = "";
      return `@[${label}](${href})`;
    }
    return "";
  }

  // contenteditable sometimes drops typed text *inside* an embed figure (e.g. a
  // writer clicks just under a video and the caret lands within the player's
  // element). figureOrImgToMd only captures the embed itself, so that stray text
  // would be lost on save. This pulls back any writer text the figure is holding
  // that is not part of the embed's own chrome (the iframe, its source link, the
  // image and its caption, the hover tools) so it survives serialization.
  function figureStrayText(node) {
    if (!node || node.nodeType !== 1 || !node.cloneNode) return "";
    const clone = node.cloneNode(true);
    clone.querySelectorAll(
      "iframe, img, figcaption, .embed__source, .img-tools, .embed-link__label, .embed-link__host, [class*='embed--']"
    ).forEach(n => n.remove());
    return (clone.textContent || "")
      .replace(new RegExp(String.fromCharCode(0xA0), "g"), " ")
      .replace(/\s+/g, " ").trim();
  }

  function editorHtmlToMd(el) {
    if (!el) return "";
    const BLOCK = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "hr", "pre"]);
    const blocks = [];
    let inlineBuf = "";
    const NBSP = new RegExp(String.fromCharCode(0xA0), "g");
    const flushInline = () => {
      const md = inlineBuf.replace(NBSP, " ").replace(/^\n+|\n+$/g, "");
      if (md.trim()) blocks.push(md);
      inlineBuf = "";
    };
    Array.from(el.childNodes).forEach(node => {
      const tag = node.nodeType === 1 ? node.nodeName.toLowerCase() : "";
      if (node.nodeType === 1 && (tag === "figure" || tag === "img")) {
        flushInline();
        const b = figureOrImgToMd(node);
        if (b && b.trim()) blocks.push(b);
        // Recover any text the writer typed that got absorbed into the figure.
        const stray = figureStrayText(node);
        if (stray) blocks.push(stray);
      } else if (node.nodeType === 1 && BLOCK.has(tag)) {
        flushInline();
        const b = serializeBlock(node, tag);
        if (b && b.trim()) blocks.push(b);
      } else if (node.nodeType === 3) {
        inlineBuf += node.nodeValue;
      } else if (node.nodeType === 1) {
        inlineBuf += tag === "br" ? "\n" : inlineToMd(node);
      }
    });
    flushInline();
    return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // A small handle so the markdown pipeline can be exercised by tests.
  window.WispMD = { inline: mdInline, blocks: mdToHtmlBlocks, toMd: editorHtmlToMd };

  // ---- Download / export ---------------------------------------------------
  // Readers can keep any work as EPUB (for e-readers), a single HTML page,
  // plain text, or print it to PDF. All built in the browser, no server.
  function mdToPlainText(body) {
    return String(body || "").replace(/\r\n/g, "\n")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^[-*]\s+/gm, "• ")
      .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "* * *")
      .replace(/\*\*([^*]+?)\*\*/g, "$1").replace(/__([^_]+?)__/g, "$1")
      .replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1$2")
      .replace(/(^|[^_\w])_(?!\s)([^_]+?)_(?!_)/g, "$1$2")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
      .trim();
  }

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // Minimal ZIP writer, store method (no compression) so it needs no library.
  function zipStore(files) {
    const enc = new TextEncoder();
    const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
    const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data);
      const crc = crc32(data);
      const header = [...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
      parts.push(new Uint8Array(header), name, data);
      central.push({ name, crc, len: data.length, offset });
      offset += header.length + name.length + data.length;
    }
    const centralStart = offset;
    for (const c of central) {
      const cd = [...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
        ...u32(c.crc), ...u32(c.len), ...u32(c.len), ...u16(c.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(c.offset)];
      parts.push(new Uint8Array(cd), c.name);
      offset += cd.length + c.name.length;
    }
    const centralSize = offset - centralStart;
    const end = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(central.length), ...u16(central.length),
      ...u32(centralSize), ...u32(centralStart), ...u16(0)];
    parts.push(new Uint8Array(end));
    let total = 0; parts.forEach(p => total += p.length);
    const out = new Uint8Array(total);
    let pos = 0; parts.forEach(p => { out.set(p, pos); pos += p.length; });
    return out;
  }

  const EXPORT_CSS = "html{font-family:Georgia,'Iowan Old Style',serif;color:#2b2622;background:#fbf9f5;line-height:1.7}" +
    "body{max-width:40em;margin:0 auto;padding:48px 22px 80px}" +
    "h1{font-size:1.9em;line-height:1.2;margin:0 0 .2em}.by{color:#8a7f74;margin:0 0 2.4em;font-style:italic}" +
    ".summary{color:#5b5147;font-style:italic;border-left:3px solid #d9a7a0;padding-left:14px;margin:0 0 2.4em}" +
    ".ch{margin:0 0 3em}.ch h2{font-size:1.35em;margin:2em 0 .8em}" +
    "blockquote{border-left:3px solid #d9a7a0;padding-left:16px;color:#5b5147;font-style:italic;margin:0 0 1.2em}" +
    "hr{border:0;height:1px;background:#e4ddd2;width:60%;margin:2.4em auto}a{color:#b06a60}" +
    "code{font-family:ui-monospace,Menlo,monospace;font-size:.9em;background:#f0ebe2;border-radius:4px;padding:.1em .35em}" +
    "footer{margin-top:4em;color:#a89e92;font-size:.85em;text-align:center}@media print{body{padding:0}a{color:inherit}}";

  function buildWorkHtml(work, chapters) {
    const chHtml = chapters.map(c =>
      `<section class="ch"><h2>Chapter ${c.number}${c.title ? ": " + esc(c.title) : ""}</h2>\n${mdToHtmlBlocks(c.body).join("\n")}</section>`
    ).join("\n");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${esc(work.title)}</title><style>${EXPORT_CSS}</style></head><body>` +
      `<h1>${esc(work.title)}</h1><p class="by">by ${esc(work.author)}</p>` +
      (work.summary ? `<p class="summary">${esc(work.summary)}</p>` : "") +
      chHtml +
      `<footer>Saved from Wisp.</footer></body></html>`;
  }

  function buildPlainText(work, chapters) {
    const header = `${work.title}\nby ${work.author}\n`;
    const body = chapters.map(c => `\n\nChapter ${c.number}${c.title ? ": " + c.title : ""}\n\n${mdToPlainText(c.body)}`).join("");
    return header + body.trim() + "\n\nSaved from Wisp.\n";
  }

  function xhtmlBlocks(body) {
    return mdToHtmlBlocks(body).join("\n").replace(/<hr>/g, "<hr/>").replace(/<br>/g, "<br/>");
  }

  function buildEpub(work, chapters) {
    const enc = new TextEncoder();
    const files = [{ name: "mimetype", data: enc.encode("application/epub+zip") }];
    files.push({ name: "META-INF/container.xml", data:
      `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n <rootfiles>\n  <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n </rootfiles>\n</container>` });
    const chFiles = chapters.map(c => ({
      id: `ch${c.number}`, href: `chapter-${c.number}.xhtml`,
      title: `Chapter ${c.number}${c.title ? ": " + c.title : ""}`,
      xhtml: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><meta charset="utf-8"/><title>${esc(c.title || ("Chapter " + c.number))}</title></head><body><h2>Chapter ${c.number}${c.title ? ": " + esc(c.title) : ""}</h2>\n${xhtmlBlocks(c.body)}</body></html>`
    }));
    chFiles.forEach(cf => files.push({ name: `OEBPS/${cf.href}`, data: cf.xhtml }));
    const uid = "urn:wisp:" + String(work.id || work.title).replace(/[^a-z0-9]/gi, "");
    const manifest = chFiles.map(cf => `<item id="${cf.id}" href="${cf.href}" media-type="application/xhtml+xml"/>`).join("\n    ");
    const spine = chFiles.map(cf => `<itemref idref="${cf.id}"/>`).join("\n    ");
    files.push({ name: "OEBPS/content.opf", data:
      `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="pub-id">${esc(uid)}</dc:identifier><dc:title>${esc(work.title)}</dc:title><dc:creator>${esc(work.author)}</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest>\n    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n    ${manifest}\n  </manifest><spine>\n    ${spine}\n  </spine></package>` });
    const navItems = chFiles.map(cf => `<li><a href="${cf.href}">${esc(cf.title)}</a></li>`).join("\n     ");
    files.push({ name: "OEBPS/nav.xhtml", data:
      `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en"><head><meta charset="utf-8"/><title>Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>\n     ${navItems}\n    </ol></nav></body></html>` });
    return zipStore(files);
  }

  function downloadBlob(filename, mime, data) {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function printWork(work, chapters) {
    const win = window.open("", "_blank");
    if (!win) { toast("Allow pop-ups to print or save as PDF."); return; }
    win.document.open();
    win.document.write(buildWorkHtml(work, chapters));
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (e) {} }, 350);
  }

  // Collect a work's released chapters (real text) for export; fall back to the
  // summary for sample works that have no readable body yet.
  function gatherExport(id) {
    const w = activeById(id);
    if (!w) return null;
    const raw = releasedChapters((LIVE.chapters[id] || []).slice());
    let chapters = raw.map(c => ({ number: c.number, title: c.title || "", body: c.body || "" }))
      .filter(c => c.body && c.body.trim());
    if (!chapters.length) chapters = [{ number: 1, title: "", body: w.summary || "This work has no readable chapters yet." }];
    return { work: w, chapters };
  }

  function slugify(s) {
    return (String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)) || "wisp-work";
  }

  function openDownload(id) {
    const data = gatherExport(id);
    if (!data) { toast("Could not prepare this work for download."); return; }
    const slug = slugify(data.work.title);
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Download</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="soft" style="font-size:14px;margin:0 0 16px">&ldquo;${esc(data.work.title)}&rdquo; · ${data.chapters.length} chapter${data.chapters.length === 1 ? "" : "s"}. Yours to keep, free.</p>
      <div class="dl-grid">
        <button class="btn btn--quiet" data-dl="epub">${icon("book",16)} EPUB</button>
        <button class="btn btn--quiet" data-dl="html">${icon("download",16)} HTML page</button>
        <button class="btn btn--quiet" data-dl="text">${icon("download",16)} Plain text</button>
        <button class="btn btn--quiet" data-dl="pdf">${icon("download",16)} Print or PDF</button>
      </div>`, "Download");
    $("#modalCard").querySelectorAll("[data-dl]").forEach(b => b.addEventListener("click", () => {
      const kind = b.dataset.dl;
      try {
        if (kind === "epub") downloadBlob(slug + ".epub", "application/epub+zip", buildEpub(data.work, data.chapters));
        else if (kind === "html") downloadBlob(slug + ".html", "text/html;charset=utf-8", buildWorkHtml(data.work, data.chapters));
        else if (kind === "text") downloadBlob(slug + ".txt", "text/plain;charset=utf-8", buildPlainText(data.work, data.chapters));
        else if (kind === "pdf") { printWork(data.work, data.chapters); return; }
        closeModal();
        toast("Saved to your device.");
      } catch (e) { toast((e && e.message) || "Could not build that file."); }
    }));
  }

  window.WispExport = { epub: buildEpub, html: buildWorkHtml, text: buildPlainText, plain: mdToPlainText, crc32, zip: zipStore };

  // Reader for a real, database-backed work. Full reading chrome and per-line
  // comments; the seeded reaction demo stays on the sample chapter.
  function renderLiveReading(w, chapters, chapterNum) {
    markVisited(w.id);
    notifyReadActivity(w.id + ":" + (chapterNum || 1));
    if (w.loggedInOnly && !WispDB.signedIn) {
      $("#screen-reading").innerHTML = `<div class="reader"><div class="reader__wrap" style="text-align:center;padding:60px 20px">
        <h1 class="reader__title">${esc(w.title)}</h1>
        <p class="soft" style="font-size:15px;margin:14px 0 18px">The author made this work readable only to signed-in readers.</p>
        <button class="btn btn--primary" data-auth="in">Sign in to read</button>
      </div></div>`;
      return;
    }
    const commentsOn = w.commentsEnabled !== false;
    const readable = releasedChapters(chapters);
    const ch = (chapterNum && readable.find(c => c.number === +chapterNum)) || readable[0] || chapters[0] || null;
    startReadSession(ch ? wordCountOf(ch.body) : 0);   // learn the reader's pace quietly
    const idx = ch ? readable.findIndex(c => c.number === ch.number) : -1;
    const prev = idx > 0 ? readable[idx - 1] : null;
    const next = idx >= 0 && idx < readable.length - 1 ? readable[idx + 1] : null;
    const isComic = w.format === "comic";
    const paras = ch ? (isComic ? splitPages(ch.body) : mdToHtmlBlocks(ch.body)) : [];
    const byPara = (ch && LIVE.comments[ch.id]) || {};
    if (isComic) comicIndex = 0;
    const comicMode = settings.comicMode || "strip";

    const proseHTML = paras.length
      ? paras.map((item, i) => {
          const n = (byPara[i] || []).length;
          const inner = isComic
            ? `<img class="comic-page-img" src="${esc(item)}" alt="Page ${i + 1}" loading="lazy" decoding="async">`
            : item;
          return `<div class="para${isComic ? " para--page" : ""}${isComic && i === 0 ? " is-current" : ""}" data-lpara="${i}">
            ${commentsOn ? `<button class="para__marker" data-lmark="${i}" aria-label="Open the conversation on this ${isComic ? "page" : "line"}">${icon("comment",15)}${n ? `<span class="para__count">${n}</span>` : ""}</button>` : ""}
            ${inner}
            <div class="thread-slot" data-lslot="${i}"></div>
          </div>`;
        }).join("")
      : `<div class="note"><p>${isComic ? "This comic has no pages yet." : "This work has no published chapters yet."}</p></div>`;

    $("#screen-reading").innerHTML = `
      <div class="reader${isComic ? " reader--comic" : ""}">
        <div class="reader__progress" id="readProgress"><i></i><span class="reader__pct" aria-hidden="true">0%</span></div>
        <div class="reader__wrap" id="readerWrap">
          <div class="reader__crumbs"><a href="#/work/${w.id}">${esc(w.title)}</a> ${icon("chev",12)} <span>Chapter ${ch ? ch.number : 1}${readable.length > 1 ? " of " + readable.length : ""}</span></div>
          <h1 class="reader__title">${esc(w.title)}</h1>
          <div class="reader__by">by <a href="#/${w.authorId ? "user/" + (w.authorHandle || w.authorId) : "work/" + w.id}">${esc(w.author)}</a></div>
          ${ch ? `<div class="reader__chapter">Chapter ${ch.number}</div>${ch.title ? `<div class="reader__chapter-title">${esc(ch.title)}</div>` : ""}` : ""}
          ${isComic && paras.length ? `<div class="comic-bar">
            <div class="seg seg--sm" role="group" aria-label="Reading mode">
              <button data-comic-mode="strip" class="${comicMode === "strip" ? "is-on" : ""}" aria-pressed="${comicMode === "strip"}">Long strip</button>
              <button data-comic-mode="single" class="${comicMode === "single" ? "is-on" : ""}" aria-pressed="${comicMode === "single"}">Single page</button>
            </div>
          </div>` : ""}
          <div class="prose" id="prose" data-comic="${isComic ? "on" : "off"}" data-comic-mode="${isComic ? comicMode : "strip"}" data-justify="${settings.justify ? "on" : "off"}" data-hyphen="${settings.justify ? "on" : "off"}">
            ${proseHTML}
          </div>
          ${isComic && paras.length ? `<div class="comic-pager" id="comicPager" style="${comicMode === "single" ? "" : "display:none"}">
            <button class="btn btn--quiet btn--sm" data-comic-prev>${icon("chev",13).replace("<svg", "<svg style='transform:rotate(180deg)'")} Prev</button>
            <span class="comic-pager__count" id="comicCount">Page 1 / ${paras.length}</span>
            <button class="btn btn--quiet btn--sm" data-comic-next>Next ${icon("chev",13)}</button>
          </div>` : ""}
          ${readable.length > 1 ? `<div class="chapter-nav">
            ${prev ? `<button class="btn btn--quiet btn--sm" data-read="${w.id}/${prev.number}">&lsaquo; Previous</button>` : "<span></span>"}
            <button class="btn--link" data-work="${w.id}">Chapter index</button>
            ${next ? `<button class="btn btn--primary btn--sm" data-read="${w.id}/${next.number}">Next chapter &rsaquo;</button>` : "<span></span>"}
          </div>` : ""}
        </div>
        <div class="hl-pop" id="hlPopLive">
          <button data-lhl="mark">Highlight</button>
          <button data-lhl="note">Note</button>
          <button data-lhl="copy">Copy</button>
        </div>
        ${readerToolsHTML()}
      </div>`;

    mountReaderTools();
    if (ch) { wireLiveReading(w, ch); wireLiveHighlights(w, ch); wireReadingGlobalsOnce(); }
    if (ch && isComic && paras.length) wireComicReader(paras.length);
    // Record that this work was opened, for history + Continue reading.
    if (WispDB.signedIn && ch) WispDB.saveProgress(w.id, ch.number, 0);
  }

  // The comic reader: long-strip by default, or single-page with a counter,
  // arrow keys, and click-to-turn. The mode is remembered on the device.
  function wireComicReader(count) {
    const prose = $("#prose");
    if (!prose || prose.dataset.comic !== "on") return;
    const pager = $("#comicPager"), countEl = $("#comicCount");
    const pages = () => $$("#prose .para--page");
    const setCurrent = (i) => {
      comicIndex = Math.max(0, Math.min(count - 1, i));
      pages().forEach((p, idx) => p.classList.toggle("is-current", idx === comicIndex));
      if (countEl) countEl.textContent = `Page ${comicIndex + 1} / ${count}`;
      if (prose.dataset.comicMode === "single") {
        const cur = pages()[comicIndex];
        if (cur) cur.scrollIntoView({ block: "start", behavior: "auto" });
      }
    };
    const setMode = (mode) => {
      settings.comicMode = mode; save();
      prose.dataset.comicMode = mode;
      $$("#screen-reading .comic-bar [data-comic-mode]").forEach(b => {
        const on = b.dataset.comicMode === mode; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on));
      });
      if (pager) pager.style.display = mode === "single" ? "" : "none";
      if (mode === "single") setCurrent(comicIndex);
    };
    $$("#screen-reading .comic-bar [data-comic-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.comicMode)));
    if (pager) {
      const p = pager.querySelector("[data-comic-prev]"), n = pager.querySelector("[data-comic-next]");
      if (p) p.addEventListener("click", () => setCurrent(comicIndex - 1));
      if (n) n.addEventListener("click", () => setCurrent(comicIndex + 1));
    }
    // Tap the right or left half of the current page to turn, in single mode.
    prose.addEventListener("click", (e) => {
      if (prose.dataset.comicMode !== "single") return;
      if (e.target.closest(".para__marker") || e.target.closest(".thread")) return;
      const img = e.target.closest(".comic-page-img"); if (!img) return;
      const r = img.getBoundingClientRect();
      setCurrent(comicIndex + ((e.clientX - r.left) > r.width / 2 ? 1 : -1));
    });
    // Arrow keys, only while reading a comic in single-page mode.
    if (comicKeyHandler) document.removeEventListener("keydown", comicKeyHandler);
    comicKeyHandler = (e) => {
      if (currentScreen !== "reading" || prose.dataset.comicMode !== "single") return;
      if (e.key === "ArrowRight") { e.preventDefault(); setCurrent(comicIndex + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setCurrent(comicIndex - 1); }
    };
    document.addEventListener("keydown", comicKeyHandler);
    setMode(settings.comicMode || "strip");
  }

  // Text-selection highlight popover for real works: saves to the highlights
  // table so it appears in Library > Things.
  function wireLiveHighlights(w, ch) {
    const pop = $("#hlPopLive"), prose = $("#prose");
    if (!pop || !prose) return;
    let lastText = "", lastRange = null;
    const hide = () => { pop.style.display = "none"; };
    prose.addEventListener("mouseup", () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) { hide(); return; }
      lastText = sel.toString().trim();
      lastRange = sel.getRangeAt(0);
      const rect = lastRange.getBoundingClientRect();
      const host = $("#screen-reading").getBoundingClientRect();
      pop.style.display = "flex";
      pop.style.left = Math.max(8, rect.left - host.left + rect.width / 2 - 70) + "px";
      pop.style.top = (rect.top - host.top - 46) + "px";
    });
    pop.querySelectorAll("[data-lhl]").forEach(b => b.addEventListener("click", async () => {
      const kind = b.dataset.lhl, text = lastText;
      if (kind === "copy") { navigator.clipboard && navigator.clipboard.writeText(text); toast("Copied."); hide(); window.getSelection().removeAllRanges(); return; }
      if (!WispDB.signedIn) { openAuth("in"); hide(); return; }
      if (!text) { hide(); return; }
      try { const mk = document.createElement("mark"); mk.className = "hl"; mk.appendChild(lastRange.extractContents()); lastRange.insertNode(mk); } catch (e) {}
      hide(); window.getSelection().removeAllRanges();
      if (kind === "note") { openNoteDialog(w, ch, text); return; }
      try { await WispDB.saveHighlight({ work_id: w.id, chapter_id: ch.id, text }); toast("Highlighted. Find it in Library, under Things."); }
      catch (e) { toast((e && e.message) || "Could not save the highlight."); }
    }));
  }
  function openNoteDialog(w, ch, text) {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <h2 style="font-size:20px">Add a note</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <blockquote style="border-left:3px solid var(--rose);padding:4px 0 4px 12px;margin:0 0 12px;color:var(--ink2);font:italic 14px var(--font-read)">${esc(text)}</blockquote>
      <div class="field"><label>Your note</label><textarea id="hl-note" rows="3" placeholder="What struck you here"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Skip</button>
        <button class="btn btn--primary" data-hl-save>Save to Things</button>
      </div>`, "Add a note");
    const finish = async (note) => {
      try { await WispDB.saveHighlight({ work_id: w.id, chapter_id: ch.id, text, note }); closeModal(); toast("Saved to your highlights."); }
      catch (e) { toast((e && e.message) || "Could not save."); }
    };
    $("#modalCard [data-hl-save]").addEventListener("click", () => finish($("#hl-note").value.trim()));
  }

  function wireLiveReading(w, ch) {
    $$("#screen-reading [data-lmark]").forEach(m => m.addEventListener("click", () => {
      const i = +m.dataset.lmark;
      const slot = $(`#screen-reading [data-lslot="${i}"]`);
      if (!slot) return;
      const para = slot.closest(".para");
      if (openThreads.has(i)) { openThreads.delete(i); slot.innerHTML = ""; para.classList.remove("is-open"); return; }
      openThreads.add(i); para.classList.add("is-open"); editingComment = null;
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
      const myName = (WispDB.profile && WispDB.profile.display_name) || "You";
      const myId = WispDB.user && WispDB.user.id;
      const pushLocal = (id, created) => {
        const list = (LIVE.comments[ch.id] = LIVE.comments[ch.id] || {});
        (list[i] = list[i] || []).push({ id, user_id: myId, body, created_at: created, paragraph_index: i, chapter_id: ch.id, profiles: { display_name: myName } });
        saveLocalComment(w.id, { id, user_id: myId, chapter_id: ch.id, paragraph_index: i, body, created_at: created, display_name: myName });
        openLiveThread(w, ch, i, slot); refreshLiveCount(ch, i);
      };
      try {
        const saved = await WispDB.postComment(w.id, body, ch.id, i);
        pushLocal((saved && saved.id) || ("local-" + Date.now()), (saved && saved.created_at) || new Date().toISOString());
      } catch (e) {
        // Server write failed (table not migrated, sample work, offline). Keep it
        // on the device so the reader does not lose it on reload.
        pushLocal("local-" + Date.now(), new Date().toISOString());
        toast("Saved on this device — couldn't reach the server.");
      }
    });

    // Owner controls: edit or delete a comment you wrote.
    const findComment = (id) => ((LIVE.comments[ch.id] && LIVE.comments[ch.id][i]) || []).find(c => c.id === id);
    slot.querySelectorAll("[data-cedit]").forEach(b => b.addEventListener("click", () => {
      editingComment = b.dataset.cedit; openLiveThread(w, ch, i, slot);
    }));
    slot.querySelectorAll("[data-ccancel]").forEach(b => b.addEventListener("click", () => {
      editingComment = null; openLiveThread(w, ch, i, slot);
    }));
    slot.querySelectorAll("[data-csave]").forEach(b => b.addEventListener("click", async () => {
      const id = b.dataset.csave;
      const ta2 = slot.querySelector("[data-cedit-ta]");
      const nb = (ta2 && ta2.value || "").trim();
      if (!nb) return;
      b.disabled = true;
      try {
        let saved = null;
        if (!/^local-/.test(id)) saved = await WispDB.editComment(id, nb);
        const c = findComment(id);
        if (c) { c.body = nb; c.edited_at = (saved && saved.edited_at) || new Date().toISOString(); }
        // keep the device mirror in step
        saveLocalComment(w.id, { id, user_id: (c && c.user_id) || (WispDB.user && WispDB.user.id), chapter_id: ch.id, paragraph_index: i, body: nb, created_at: (c && c.created_at) || new Date().toISOString(), display_name: (c && c.profiles && c.profiles.display_name) || "You" });
        editingComment = null; openLiveThread(w, ch, i, slot);
        toast("Comment updated.");
      } catch (e) { b.disabled = false; toast((e && e.message) || "Could not update."); }
    }));
    slot.querySelectorAll("[data-cdel]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.cdel;
      confirmDialog({ title: "Delete this comment?", body: "It will be removed for everyone.", confirmText: "Delete", danger: true }, async () => {
        try {
          if (!/^local-/.test(id)) await WispDB.deleteComment(id);   // device-only comments skip the server
          removeLocalComment(w.id, id);
          const arr = (LIVE.comments[ch.id] && LIVE.comments[ch.id][i]) || [];
          const idx = arr.findIndex(c => c.id === id);
          if (idx >= 0) arr.splice(idx, 1);
          editingComment = null; openLiveThread(w, ch, i, slot);
          refreshLiveCount(ch, i);
          toast("Comment deleted.");
        } catch (e) { toast((e && e.message) || "Could not delete."); }
      });
    }));
  }

  function refreshLiveCount(ch, i) {
    const mark = $(`#screen-reading [data-lmark="${i}"]`); if (!mark) return;
    const n = ((LIVE.comments[ch.id] || {})[i] || []).length;
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
    const comments = (ch && LIVE.comments[ch.id] && LIVE.comments[ch.id][i]) || [];
    const who = (c) => (c.profiles && c.profiles.display_name) || "Reader";
    const myId = WispDB.user && WispDB.user.id;
    const rows = comments.map(c => {
      const mine = !!(myId && c.user_id === myId && c.id);
      if (mine && editingComment === c.id) {
        return `<div class="comment" data-comment="${c.id}">
          <span class="comment__av">${esc((who(c)[0] || "R").toUpperCase())}</span>
          <div style="flex:1">
            <div><span class="comment__who">${esc(who(c))}</span></div>
            <textarea class="comment__edit" data-cedit-ta>${esc(c.body)}</textarea>
            <div class="comment__editacts"><button class="btn btn--primary btn--sm" data-csave="${c.id}">Save</button><button class="btn btn--quiet btn--sm" data-ccancel>Cancel</button></div>
          </div>
        </div>`;
      }
      return `<div class="comment" data-comment="${c.id || ""}">
        <span class="comment__av">${esc((who(c)[0] || "R").toUpperCase())}</span>
        <div style="flex:1">
          <div><span class="comment__who">${esc(who(c))}</span><span class="comment__when">${WispDB.relTime(c.created_at)}${c.edited_at ? " &middot; edited" : ""}</span></div>
          <div class="comment__text">${esc(c.body)}</div>
          ${mine ? `<div class="comment__acts"><button class="cact" data-cedit="${c.id}">Edit</button><button class="cact" data-cdel="${c.id}">Delete</button></div>` : ""}
        </div>
      </div>`;
    }).join("");
    return `<div class="thread">
      <div class="thread__reactions">${chips}</div>
      ${rows || '<p class="muted" style="font-size:13px;margin:2px 0 10px">No comments on this line yet.</p>'}
      <div class="thread__compose">
        <textarea placeholder="Reply on this line"></textarea>
        <button class="btn btn--primary btn--sm" data-lpost>Post</button>
      </div>
    </div>`;
  }

  // Small handle so the comment thread's owner-controls render can be tested.
  window.WispThread = {
    html: (w, ch, i) => liveThreadHTML(w, ch, i),
    edit(id) { editingComment = id; },
    inject(chId, i, arr) { (LIVE.comments[chId] = LIVE.comments[chId] || {})[i] = arr; }
  };

  // Resilient local mirror for line comments. A comment a reader posts is kept on
  // the device too, so it survives a reload even when the server write silently
  // fails (the comments table not migrated yet, a bundled sample work, offline).
  // On load these are merged with the server's, deduped by id, so nothing a reader
  // typed disappears. Same philosophy as the draft autosave.
  function lcKey(workId) { return "wisp.comments." + (workId || "demo"); }
  function loadLocalComments(workId) {
    try { const v = JSON.parse(localStorage.getItem(lcKey(workId)) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function saveLocalComment(workId, row) {
    try { const a = loadLocalComments(workId).filter(r => r.id !== row.id); a.push(row); localStorage.setItem(lcKey(workId), JSON.stringify(a.slice(-500))); } catch (e) {}
  }
  function removeLocalComment(workId, id) {
    try { localStorage.setItem(lcKey(workId), JSON.stringify(loadLocalComments(workId).filter(r => r.id !== id))); } catch (e) {}
  }
  // Merge device-kept comments into LIVE.comments for a work, skipping any the
  // server already returned (matched by id).
  function mergeLocalComments(workId) {
    const rows = loadLocalComments(workId); if (!rows.length) return;
    rows.forEach(r => {
      const cid = r.chapter_id || "_", k = r.paragraph_index == null ? -1 : r.paragraph_index;
      const byCh = (LIVE.comments[cid] = LIVE.comments[cid] || {});
      const arr = (byCh[k] = byCh[k] || []);
      if (arr.some(c => c.id === r.id)) return;                  // server already has it
      arr.push({ id: r.id, user_id: r.user_id, body: r.body, created_at: r.created_at, paragraph_index: r.paragraph_index, chapter_id: r.chapter_id, profiles: { display_name: r.display_name || "You" }, _local: true });
    });
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
      <button data-tool="autoscroll" id="autoScrollBtn" title="Auto-scroll"><span style="display:inline-flex;transform:rotate(90deg)">${icon("chev",16)}</span></button>
      <button data-tool="top" title="Back to the top"><span style="display:inline-flex;transform:rotate(-90deg)">${icon("chev",16)}</span></button>
      <span class="sep"></span>
      <button data-tool="margins" class="${settings.margins ? "is-on" : ""}" aria-pressed="${settings.margins}" title="Toggle margin comments">${icon("comment",16)}</button>
      <button data-tool="listen" id="listenBtn" title="Read aloud">${icon("play",16)}</button>
      <button data-tool="settings" title="More reading settings">${icon("gear",16)}</button>
    </div>`;
  }
  // Hands-free reading: tap to cycle off / slow / medium / fast.
  const AUTO_SPEEDS = [0, 0.5, 1.1, 2.1];
  let autoScrollState = 0, autoScrollTimer = null;
  // Whichever element actually scrolls the reader (the app shell or the window).
  function readerScroller() {
    const m = $("#main");
    if (m && m.scrollHeight > m.clientHeight + 4) return m;
    return document.scrollingElement || document.documentElement;
  }
  function tickAutoScroll() {
    const el = readerScroller(); const px = AUTO_SPEEDS[autoScrollState] || 0;
    if (!el || px <= 0) { stopAutoScroll(); return; }
    el.scrollTop += px;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) { stopAutoScroll(); toast("You reached the end of the page."); }
  }
  function stopAutoScroll() { autoScrollState = 0; if (autoScrollTimer) clearInterval(autoScrollTimer); autoScrollTimer = null; updateAutoScrollBtn(); }
  function cycleAutoScroll() {
    autoScrollState = (autoScrollState + 1) % AUTO_SPEEDS.length;
    if (autoScrollTimer) { clearInterval(autoScrollTimer); autoScrollTimer = null; }
    if (autoScrollState > 0) { autoScrollTimer = setInterval(tickAutoScroll, 16); toast("Auto-scroll: " + ["off", "slow", "medium", "fast"][autoScrollState]); }
    updateAutoScrollBtn();
  }
  function updateAutoScrollBtn() {
    const b = $("#autoScrollBtn"); if (!b) return;
    b.classList.toggle("is-on", autoScrollState > 0);
    b.setAttribute("title", autoScrollState === 0 ? "Auto-scroll" : "Auto-scroll: " + ["off", "slow", "medium", "fast"][autoScrollState]);
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
        else if (t === "autoscroll") { cycleAutoScroll(); }
        else if (t === "top") { const el = readerScroller(); if (el && el.scrollTo) el.scrollTo({ top: 0, behavior: "smooth" }); else if (el) el.scrollTop = 0; stopAutoScroll(); }
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
  // The exact chapter text on screen right now, demo or live: each paragraph's
  // own words, skipping the comment marker and its thread slot.
  function readerText() {
    const parts = [];
    document.querySelectorAll("#screen-reading .para").forEach(par => {
      let t = "";
      par.childNodes.forEach(n => {
        if (n.nodeType === 1 && (n.classList.contains("para__marker") || n.classList.contains("thread-slot"))) return;
        t += n.textContent || "";
      });
      t = t.trim();
      if (t) parts.push(t);
    });
    return parts.join(" ");
  }
  function toggleListen(btn) {
    if (!("speechSynthesis" in window)) { toast("Read-aloud is not available in this browser."); return; }
    if (speaking) { window.speechSynthesis.cancel(); speaking = false; btn.classList.remove("is-on"); btn.innerHTML = icon("play",16); return; }
    const text = readerText().replace(/["“”]/g, "").trim();
    if (!text) { toast("Nothing to read on this page yet."); return; }
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
    const el = readerScroller();
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? Math.min(100, Math.round(100 * el.scrollTop / max)) : 0;
    bar.style.width = pct + "%";
    const chip = $("#readProgress .reader__pct"); if (chip) chip.textContent = pct + "%";
  }
  function wireReadingGlobalsOnce() {
    if (readingGlobalsWired) return;
    readingGlobalsWired = true;
    $("#main").addEventListener("scroll", updateReadProgress, { passive: true });
    document.addEventListener("mousedown", (e) => {
      ["#hlPop", "#hlPopLive"].forEach(sel => {
        const pop = $(sel);
        if (pop && !pop.contains(e.target)) pop.style.display = "none";
      });
    });
    // Tap anywhere outside an open inline-comment thread to close it. On a phone
    // this saves readers from scrolling back up to the line marker every time.
    document.addEventListener("click", (e) => {
      if (!openThreads.size) return;
      // A Post / Edit / Delete inside a thread re-renders the slot, which detaches
      // the element that was clicked. By the time this bubbles here that element is
      // no longer in the document — treat that as an inside click, never as a
      // tap-away, or we would wipe the comment the reader just posted.
      if (e.target && e.target.isConnected === false) return;
      if (e.target.closest(".thread-slot") || e.target.closest("[data-lslot]") ||
          e.target.closest(".para__marker") || e.target.closest("[data-lmark]") ||
          e.target.closest(".hl-pop")) return;
      closeAllInlineThreads();
    });
  }
  // Close every open per-line comment thread (both the demo and live readers).
  function closeAllInlineThreads() {
    if (!openThreads.size) return;
    openThreads.forEach(i => {
      const slot = $(`#screen-reading .thread-slot[data-slot="${i}"]`) || $(`#screen-reading [data-lslot="${i}"]`);
      if (slot) { slot.innerHTML = ""; const para = slot.closest(".para"); if (para) para.classList.remove("is-open"); }
    });
    openThreads.clear();
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

  const EXTRA_REACTS = ["✨","💔","😮","🫶","😔","🙌"];
  function wireThread(i, slot) {
    const p = W.CHAPTER.paragraphs[i];
    const toggleReact = (r) => {
      const emoji = r.dataset.react.split(":")[1];
      p.thread = p.thread || { reactions:{}, comments:[] };
      if (!p.thread.mine) p.thread.mine = new Set();
      const on = !p.thread.mine.has(emoji);
      if (on) p.thread.mine.add(emoji); else p.thread.mine.delete(emoji);
      p.thread.reactions[emoji] = Math.max(0, (p.thread.reactions[emoji] || 0) + (on ? 1 : -1));
      r.classList.toggle("is-on", on);
      r.setAttribute("aria-pressed", String(on));
      const n = p.thread.reactions[emoji];
      r.innerHTML = emoji + (n > 0 ? `<small>${n}</small>` : "");
    };
    slot.querySelectorAll("[data-react]").forEach(r => r.addEventListener("click", () => toggleReact(r)));
    const addBtn = slot.querySelector(".react--add");
    // The "+" opens a small palette of extra reactions; each picked emoji becomes
    // a live reaction chip, wired like the rest. Clicking "+" again closes it.
    addBtn && addBtn.addEventListener("click", () => {
      const row = addBtn.parentElement;
      const open = row.querySelectorAll("[data-react-extra]").length > 0;
      if (open) { row.querySelectorAll("[data-react-extra]").forEach(el => el.remove()); return; }
      const already = new Set(Array.from(row.querySelectorAll("[data-react]")).map(el => el.dataset.react.split(":")[1]));
      EXTRA_REACTS.filter(e => !already.has(e)).forEach(e => {
        const b = document.createElement("button");
        b.className = "react"; b.setAttribute("data-react", i + ":" + e); b.setAttribute("data-react-extra", "1");
        b.setAttribute("aria-pressed", "false"); b.textContent = e;
        b.addEventListener("click", () => { b.removeAttribute("data-react-extra"); toggleReact(b); });
        row.insertBefore(b, addBtn);
      });
    });
    const post = slot.querySelector(`[data-post="${i}"]`);
    const ta = slot.querySelector(`[data-compose="${i}"]`);
    post && post.addEventListener("click", () => {
      const text = ta.value.trim(); if (!text) { ta.focus(); return; }
      p.thread = p.thread || { reactions:{}, comments:[] };
      const cid = "local-" + Date.now();
      p.thread.comments.push({ id: cid, who:"Rowan", init:"R", when:"now", text });
      saveLocalComment("demo", { id: cid, paragraph_index: i, body: text, display_name: "Rowan", created_at: new Date().toISOString() });
      // re-render thread and re-open
      slot.innerHTML = threadHTML(p, i); wireThread(i, slot);
      $(`.para[data-para="${i}"]`).classList.add("has-thread");
      const marker = $(`.para__marker[data-para="${i}"]`);
      if (marker) marker.innerHTML = icon("comment",15) + `<span class="para__count">${p.thread.comments.length}</span>`;
      toast("Posted on the line.");
    });
    slot.querySelectorAll("[data-heart-c]").forEach(h => h.addEventListener("click", () => h.style.color = "var(--rose)"));
    // Reply jumps the reader straight to the compose box for this line.
    slot.querySelectorAll("[data-reply]").forEach(rb => rb.addEventListener("click", () => { ta && ta.focus(); }));
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
    const pub = w.status === "ongoing" || w.status === "complete" || w.status === undefined;
    if (pub) items.push({ icon: "lock", label: "Unpublish", run: () => confirmDialog({
        title: "Unpublish this work?",
        body: `${esc(w.title)} will be hidden from readers and moved back to your drafts. You can publish it again any time.`,
        confirmText: "Unpublish"
      }, () => { w.status = "draft"; renderWriteDashboard(); toast("Unpublished. It's back in your drafts."); }) });
    else items.push({ icon: "unlock", label: "Publish now", run: () => { w.status = "ongoing"; renderWriteDashboard(); toast("Published. It's live for readers."); } });
    items.push({
      icon: "trash", label: "Delete work", danger: true, run: () => {
        confirmDialog({
          title: "Delete this work?",
          body: `${esc(w.title)} and its ${w.chapters} ${w.chapters === 1 ? "chapter" : "chapters"} will be deleted. You can't undo this. To take it down for now, use Unpublish instead.`,
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
    const w = activeById(id); if (!w) return;
    const items = [{ icon: "share", label: "Copy link", run: () => copyLink(id) }];
    if (w._db && isUuid(id)) items.push({ icon: "book", label: "Add to reading list", run: () => openAddToList(id) });
    items.push(
      { icon: "mute", label: "Mute " + w.source, run: () => { muteTag(w.source); } },
      { icon: "user", label: "Block " + w.author, run: () => { blockUser(w.author); } },
      { icon: "flag", label: "Report", run: () => openReportDialog(id) }
    );
    menuDialog(w.title, items);
  }

  // The report button hands off to a short moderation form (opens in a new
  // tab). Reporting works whether or not the reader is signed in.
  const REPORT_FORM = "https://forms.gle/GWvPX1vrbVfUddYL8";
  function openReportDialog(id) {
    const w = activeById(id);
    if (!w) return;
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Report this work</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="soft" style="font-size:14px;margin:0 0 6px;line-height:1.6">Reports go to the moderation team through a short form. Please name the work and say what's wrong.</p>
      ${w.title ? `<p class="soft" style="font-size:13px;margin:0 0 14px"><span class="muted">Reporting:</span> ${esc(w.title)}</p>` : ""}
      <p class="soft" style="font-size:13px;margin:0 0 16px;line-height:1.6">Fiction is allowed when it's tagged and warned; the limits are illegal content, targeted harassment, doxxing, threats against real people, and spam.</p>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <a class="btn btn--primary" href="${REPORT_FORM}" target="_blank" rel="noopener noreferrer" data-modal-cancel>Open the report form</a>
      </div>`, "Report this work");
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

        ${seriesHTML}
        ${standaloneHTML}
      </div>`;
  }

  // Turn a plain-text chapter body into editor paragraphs.
  // The exact guidance shown in the empty editor. Old drafts (written before the
  // placeholder became an overlay) may have this baked into the saved body; strip
  // it on load so it never resurfaces as real content or in Preview.
  const EDITOR_PLACEHOLDER = "Start typing, or paste from another editor. Format with the toolbar above, or use Markdown shortcuts.";
  function stripEditorPlaceholder(body) {
    let b = String(body || "");
    b = b.replace(/Start typing,\s*or paste from another editor\.\s*(?:Format with the toolbar above,\s*or use Markdown shortcuts\.)?/gi, "");
    return b.replace(/^\s+/, "");
  }
  function bodyToEditorHTML(body) {
    const blocks = mdToHtmlBlocks(stripEditorPlaceholder(body));
    return blocks.length ? blocks.join("") : "<p></p>";
  }

  // A comic chapter's body is its page image URLs, one per line.
  function splitPages(body) {
    return String(body || "").split(/\r?\n+/).map(s => s.trim()).filter(u => /^https?:\/\//i.test(u));
  }

  // The editor's main writing area swaps between prose and a comic page manager.
  function proseZoneHTML(bodyHTML) {
    const alignSVG = (a) => {
      const rows = a === "center" ? ["4 20", "7 17", "5 19"] : a === "right" ? ["4 20", "10 20", "6 20"] : ["4 20", "4 14", "4 18"];
      const lines = rows.map((r, i) => { const [x1, x2] = r.split(" "); return `<line x1="${x1}" y1="${6 + i * 6}" x2="${x2}" y2="${6 + i * 6}"/>`; }).join("");
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${lines}</svg>`;
    };
    const micSVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/></svg>`;
    const sp = editorLineSpace || "normal";
    return `
      <div class="toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" title="Heading" data-fmt="h2">H</button>
        <button type="button" title="Bold" data-fmt="bold"><b>B</b></button>
        <button type="button" title="Italic" data-fmt="italic"><i>I</i></button>
        <button type="button" title="Underline" data-fmt="underline"><u>U</u></button>
        <button type="button" title="Highlight" data-fmt="highlight"><span style="background:color-mix(in srgb,var(--amber) 55%,transparent);border-radius:3px;padding:0 4px">H</span></button>
        <span class="fs-ctrl" title="Font size of the selected text">
          <button type="button" data-fmt="fs-dec" aria-label="Smaller">&minus;</button>
          <input type="number" id="we-fontsize" min="8" max="96" step="1" value="18" aria-label="Font size">
          <button type="button" data-fmt="fs-inc" aria-label="Bigger">+</button>
        </span>
        <button type="button" title="Quote" data-fmt="quote">&ldquo;</button>
        <span class="sep"></span>
        <button type="button" title="Align left" data-fmt="align-left">${alignSVG("left")}</button>
        <button type="button" title="Align center" data-fmt="align-center">${alignSVG("center")}</button>
        <button type="button" title="Align right" data-fmt="align-right">${alignSVG("right")}</button>
        <span class="sep"></span>
        <button type="button" title="Bulleted list" data-fmt="ul">&bull;</button>
        <button type="button" title="Numbered list" data-fmt="ol">1.</button>
        <button type="button" title="Link" data-fmt="link">${icon("tag",15)}</button>
        <span class="sep"></span>
        <button type="button" title="Upload an image from your device" data-fmt="image">${icon("upload",13)} Image</button>
        <button type="button" title="Embed a video, map, or audio by link" data-fmt="embed">${icon("external",13)} Embed</button>
        <button type="button" title="Dictate: speak and it types for you" data-fmt="dictate" id="we-dictate">${micSVG}</button>
        <button type="button" title="Check grammar and spelling" data-fmt="grammar" id="we-grammar">${icon("check",13)} Grammar</button>
        <span class="sep"></span>
        <button type="button" title="Horizontal rule" data-fmt="hr"><span style="display:inline-block;width:16px;height:2px;background:currentColor;border-radius:2px"></span></button>
        <label class="tb-space" title="Line spacing while you write">Spacing
          <select id="we-linespace" aria-label="Line spacing">
            <option value="compact"${sp === "compact" ? " selected" : ""}>Compact</option>
            <option value="normal"${sp === "normal" ? " selected" : ""}>Normal</option>
            <option value="relaxed"${sp === "relaxed" ? " selected" : ""}>Relaxed</option>
          </select>
        </label>
      </div>
      <div class="editor" id="we-body" contenteditable="true" spellcheck="true" aria-label="Chapter body" style="line-height:${lineSpaceValue(sp)}" data-placeholder="Start typing, or paste from another editor. Format with the toolbar above, or use Markdown shortcuts.">${bodyHTML}</div>`;
  }
  const LINE_SPACE = { compact: "1.45", normal: "1.7", relaxed: "2.05" };
  function lineSpaceValue(k) { return LINE_SPACE[k] || LINE_SPACE.normal; }
  function comicZoneHTML() {
    return `
      <div class="comic-editor">
        <div class="comic-editor__head">
          <span>Pages <span class="muted">(${editorPages.length})</span></span>
          <span class="comic-editor__add">
            <label class="btn btn--quiet btn--sm" for="we-page-file">${icon("upload",13)} Upload<input type="file" id="we-page-file" accept="image/*" hidden></label>
            <button type="button" class="btn btn--quiet btn--sm" data-page-url>${icon("plus",13)} Add by URL</button>
          </span>
        </div>
        ${editorPages.length
          ? `<div class="comic-pages">${editorPages.map((u, i) => `
              <div class="comic-page">
                <span class="comic-page__n">${i + 1}</span>
                <img src="${esc(u)}" alt="Page ${i + 1}" class="comic-page__img" loading="lazy">
                <div class="comic-page__acts">
                  <button type="button" class="cact" data-page-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">&uarr;</button>
                  <button type="button" class="cact" data-page-down="${i}" ${i === editorPages.length - 1 ? "disabled" : ""} aria-label="Move down">&darr;</button>
                  <button type="button" class="cact" data-page-del="${i}" aria-label="Remove page">Remove</button>
                </div>
              </div>`).join("")}</div>`
          : `<p class="muted" style="padding:18px 2px;line-height:1.6">No pages yet. Upload your first page, or add one by URL. Each image is one page; readers scroll it top to bottom.</p>`}
      </div>`;
  }
  function bodyZoneHTML(bodyHTML) {
    return editorFormat === "comic" ? comicZoneHTML() : proseZoneHTML(bodyHTML == null ? editorProseHTML : bodyHTML);
  }
  function refreshBodyZone() {
    const z = $("#we-body-zone");
    if (!z) return;
    z.innerHTML = bodyZoneHTML();
    wireBodyZone();
    if (editorFormat !== "comic") { const ed = $("#we-body"); if (ed) { ["input", "keyup", "paste", "cut", "focus", "blur"].forEach(ev => ed.addEventListener(ev, () => setTimeout(updateEditorEmpty, 0))); updateEditorEmpty(); } }
  }
  function wireBodyZone() {
    if (editorFormat !== "comic") return;
    const addPage = (url) => { if (url) { editorPages.push(url); refreshBodyZone(); } };
    const fileInput = $("#we-page-file");
    if (fileInput) fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!isLive()) { toast("Connect Supabase to upload pages."); fileInput.value = ""; return; }
      if (!WispDB.signedIn) { openAuth("in"); return; }
      try { const url = await WispDB.uploadCover(file); addPage(url); toast("Page added."); }
      catch (e) { toast((e && e.message) || "Could not upload the page."); }
    });
    const urlBtn = $("#we-body-zone [data-page-url]");
    if (urlBtn) urlBtn.addEventListener("click", () => {
      const url = (window.prompt("Image address for this page (https://...)", "https://") || "").trim();
      if (!url || url === "https://") return;
      if (!/^https?:\/\//i.test(url)) { toast("Page addresses need to start with https://"); return; }
      addPage(url);
    });
    $$("#we-body-zone [data-page-del]").forEach(b => b.addEventListener("click", () => { editorPages.splice(+b.dataset.pageDel, 1); refreshBodyZone(); }));
    $$("#we-body-zone [data-page-up]").forEach(b => b.addEventListener("click", () => { const i = +b.dataset.pageUp; if (i > 0) { [editorPages[i - 1], editorPages[i]] = [editorPages[i], editorPages[i - 1]]; refreshBodyZone(); } }));
    $$("#we-body-zone [data-page-down]").forEach(b => b.addEventListener("click", () => { const i = +b.dataset.pageDown; if (i < editorPages.length - 1) { [editorPages[i + 1], editorPages[i]] = [editorPages[i], editorPages[i + 1]]; refreshBodyZone(); } }));
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
    const isComplete = !!(work && (work._dbStatus === "complete" || work.complete));
    const tagsValue = editingLive ? (work.tags || []).join(", ") : "";
    const workWarnings = work ? (work.warnings || []) : [];
    const coverIsImage = editingLive && work.cover && /^https?:/.test(work.cover);
    editorCover = coverIsImage ? work.cover : null;
    coverCleared = false;

    // Prose or comic. A comic chapter's body is a list of page image URLs.
    editorFormat = (work && work.format === "comic") ? "comic" : "prose";
    editorPages = (editorFormat === "comic" && editingLive && liveEditor && liveEditor.chapter)
      ? splitPages(liveEditor.chapter.body) : [];

    // The editor holds one chapter at a time. Live edits load the real text;
    // otherwise the editor opens on a fresh chapter.
    // A fresh chapter opens EMPTY: the guidance lives in a placeholder overlay,
    // never as real text, so nothing gets published unless the writer types it.
    const bodyHTML = editingLive && liveEditor && liveEditor.chapter
      ? bodyToEditorHTML(liveEditor.chapter.body)
      : "<p><br></p>";
    editorProseHTML = bodyHTML;

    const schedPairs = parseScheduleMulti(work && work.schedule);
    const liveChs = editingLive && liveEditor && liveEditor.allChapters ? liveEditor.allChapters : null;
    const partsHTML = liveChs
      ? liveChs.map((c, i) => `
          <div class="part-row ${liveEditor.chapter && c.id === liveEditor.chapter.id ? "is-current" : ""}">
            <button class="part-open" data-edit-chapter="${c.number}">
              <span class="part-n">${c.number}</span><span class="part-title">${c.title ? esc(c.title) : "Chapter " + c.number}${c.published ? "" : " &middot; draft"}</span>
            </button>
            <span class="part-move">
              <button class="part-mv" data-ch-move="${c.number}:up" ${i === 0 ? "disabled" : ""} aria-label="Move chapter up">${icon("chev", 13)}</button>
              <button class="part-mv part-mv--down" data-ch-move="${c.number}:down" ${i === liveChs.length - 1 ? "disabled" : ""} aria-label="Move chapter down">${icon("chev", 13)}</button>
              <button class="part-mv part-mv--del" data-ch-del="${c.number}" ${liveChs.length <= 1 ? "disabled" : ""} aria-label="Delete chapter">${icon("trash", 13)}</button>
            </span>
          </div>`).join("")
      : (chapters > 0
        ? Array.from({ length: chapters }, (_, i) => `
            <button class="part-row ${i === chapters - 1 ? "is-current" : ""}" data-toast="Open this chapter in the editor.">
              <span class="part-n">${i + 1}</span><span class="part-title">Chapter ${i + 1}</span>
            </button>`).join("")
        : `<p class="muted" style="font-size:13px;margin:0">No chapters yet. Your first one starts in the editor.</p>`);

    const typeFields = type === "fan"
      ? `<div class="field"><label>Fandom</label><input type="text" id="we-source" value="${esc(source)}"></div>`
      : `<div class="field"><label>Setting or genre</label><input type="text" id="we-source" value="${esc(source)}"></div>`;

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
          <div class="save-flag" id="we-saveflag" aria-live="polite">${icon("check",14)} ${isNew ? "Not saved yet" : "Saved"}</div>
        </div>

        <div class="writer">
          <div>
            <input class="title-input" id="we-title" placeholder="Title your work" value="${esc(title)}">
            <div id="we-body-zone">${bodyZoneHTML(bodyHTML)}</div>
            <div class="write-actions" style="margin-top:16px">
              <button class="btn btn--primary" data-publish="publish">Publish chapter</button>
              <button class="btn btn--quiet" data-publish="draft">Save draft</button>
              <button class="btn btn--quiet" data-schedule>Schedule &hellip;</button>
              <button class="btn btn--link" data-preview>Preview</button>
            </div>
          </div>

          <aside>
            <div class="panel">
              <h4>Chapters</h4>
              <div class="parts">${partsHTML}</div>
              <button class="btn--link" style="margin-top:10px" ${editingLive ? "data-new-chapter" : `data-toast="Publish this work first, then you can add chapters."`}>${icon("plus",13)} New chapter</button>
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
              <div class="field"><label>Format</label>
                <div class="seg" role="group" aria-label="Format">
                  <button data-wformat="prose" class="${editorFormat === "prose" ? "is-on" : ""}" aria-pressed="${editorFormat === "prose"}">Book</button>
                  <button data-wformat="comic" class="${editorFormat === "comic" ? "is-on" : ""}" aria-pressed="${editorFormat === "comic"}">Comic</button>
                </div>
              </div>
              <div class="field"><label>Status</label>
                <div class="seg" role="group" aria-label="Work status">
                  <button data-wstatus="ongoing" class="${isComplete ? "" : "is-on"}" aria-pressed="${!isComplete}">In progress</button>
                  <button data-wstatus="complete" class="${isComplete ? "is-on" : ""}" aria-pressed="${isComplete}">Completed</button>
                </div>
                <p class="muted" style="font-size:11.5px;margin-top:4px">Marks the whole work finished. Readers see a Complete badge and can filter by it.</p>
              </div>
              ${typeFields}
              <div class="field"><label>Additional tags</label><input type="text" id="we-tags" placeholder="Slow burn, found family, ..."></div>
              <p class="muted" style="font-size:11.5px;margin-top:2px">Up to 50 tags. Common tags have short descriptions; the rest are freeform.</p>
            </div>

            <div class="panel">
              <h4>Rating</h4>
              <div class="rate-choice">${["G","T","M","E"].map(r => `<button data-wrate="${r}" class="${r === rating ? "is-on" : ""}" aria-pressed="${r === rating}" data-tip="${esc(rateTip(r))}">${r}</button>`).join("")}</div>
              <p class="rate-meaning" id="wrate-meaning">${esc(rateTip(rating))}</p>
              <div class="field" style="margin-top:12px"><label>Warnings</label>
                ${WARNINGS.map(w => `<label class="check"><input type="checkbox" data-warn="${esc(w)}" ${workWarnings.includes(w) ? "checked" : ""}> ${esc(w)} <span class="warn-info" ${tipAttrs(WARNING_INFO[w] || w)}>${icon("flag", 11)}</span></label>`).join("")}
              </div>
            </div>

            <div class="panel">
              <h4>Cover</h4>
              <label class="cover-drop" id="coverDrop" for="we-cover-file">
                <input type="file" id="we-cover-file" accept="image/*" hidden>
                ${icon("upload",22)}<div style="margin-top:6px" id="coverDropText">${coverIsImage ? "Replace cover" : "Upload a cover"}</div>
                <div style="font-size:11px;margin-top:2px">Required to publish</div>
              </label>
              <div id="coverPreview" style="margin-top:10px">${coverIsImage ? `<img src="${esc(work.cover)}" alt="Cover preview" style="width:100%;border-radius:10px;display:block">` : ""}</div>
              <button class="btn--link" id="coverRemove" style="margin-top:8px;color:#a2444f;${coverIsImage ? "" : "display:none"}">Remove cover</button>
            </div>

            <div class="panel">
              <h4>Serialization</h4>
              <div class="field"><label>Update schedule, shown to readers</label>
                <div id="we-sched-list">${schedRowsHTML(schedPairs)}</div>
                <button type="button" class="btn--link" id="we-sched-add" style="margin-top:8px">${icon("plus",13)} Add another day</button>
                <p class="muted" id="we-sched-echo" style="font-size:12px;margin:8px 0 0;line-height:1.5"></p>
              </div>
              <p class="muted" style="font-size:12px;margin:0;line-height:1.55">Add as many update days and times as you like. Readers see them on the work page, under the synopsis. Use the chapter Schedule button to post automatically.</p>
            </div>

            <div class="panel">
              <h4>Per-work controls</h4>
              <div class="toggle-row"><span>Allow inline comments</span><label class="switch"><input type="checkbox" id="we-comments" ${(editingLive ? work.commentsEnabled !== false : true) ? "checked" : ""} aria-label="Allow inline comments"><span class="track"></span><span class="knob"></span></label></div>
              <div class="toggle-row"><span>Logged-in readers only</span><label class="switch"><input type="checkbox" id="we-loggedin" ${editingLive && work.loggedInOnly ? "checked" : ""} aria-label="Logged-in readers only"><span class="track"></span><span class="knob"></span></label></div>
              <div class="toggle-row"><span>Hide my numbers</span><label class="switch"><input type="checkbox" id="we-hidestats" ${editingLive && work.hideStats ? "checked" : ""} aria-label="Hide my numbers"><span class="track"></span><span class="knob"></span></label></div>
            </div>

          </aside>
        </div>
      </div>`;

    wireBodyZone();   // comic page manager, when the work is a comic

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

    // Serialization: several update days, added or removed with the + / trash.
    const getv = (sel) => { const el = $(sel); return el ? el.value : ""; };
    const schedPairsNow = () => $$("#we-sched-list [data-sr]").map(row => ({
      day: (row.querySelector(".sr-day") || {}).value || "",
      time: (row.querySelector(".sr-time") || {}).value || ""
    }));
    const schedEcho = () => { const el = $("#we-sched-echo"); if (!el) return;
      const s = composeScheduleMulti(schedPairsNow());
      el.textContent = s ? "Readers will see: Updates " + s : "No schedule shown to readers."; };
    const schedList = $("#we-sched-list");
    if (schedList) {
      schedList.addEventListener("input", schedEcho);
      schedList.addEventListener("click", (e) => {
        const del = e.target.closest("[data-sr-del]"); if (!del) return;
        const rows = $$("#we-sched-list [data-sr]");
        if (rows.length <= 1) { const r = rows[0]; if (r) { const d = r.querySelector(".sr-day"); const t = r.querySelector(".sr-time"); if (d) d.value = ""; if (t) t.value = ""; } }
        else del.closest("[data-sr]").remove();
        schedEcho();
      });
    }
    const schedAdd = $("#we-sched-add");
    if (schedAdd && schedList) schedAdd.addEventListener("click", () => {
      schedList.insertAdjacentHTML("beforeend", schedRowHTML({ day: "", time: "" }));
      schedEcho();
    });
    schedEcho();

    // Hub names double as tags and fandoms: a hub gathers every work tagged
    // with (or set in) its name, so surfacing hub names in the suggestions is
    // how a writer knows to tag into "Winx Club" and land in that hub.
    const hubNamesP = isLive()
      ? WispDB.listHubs().then(hs => (hs || []).map(h => h.name).filter(Boolean)).catch(() => [])
      : Promise.resolve([]);

    // Additional-tags autocomplete: house categories, hub names, and tags in use.
    // Each source merges in as it resolves, so a slow one never holds up the rest.
    const tagsInput = $("#we-tags");
    if (tagsInput) {
      const acTags = TAG_SUGGEST.slice();
      attachAutocomplete(tagsInput, () => acTags);
      if (isLive()) {
        const have = new Set(acTags.map(s => s.toLowerCase()));
        const merge = (arr) => (arr || []).forEach(n => { const v = (n || "").trim(); if (v && !have.has(v.toLowerCase())) { acTags.push(v); have.add(v.toLowerCase()); } });
        WispDB.listTags(500).then(merge).catch(() => {});
        hubNamesP.then(merge).catch(() => {});
      }
    }

    // Fandom autocomplete on the source field for fanworks: the big pre-seeded
    // list, plus any fandoms the admin added, plus hub names, plus every fandom
    // already used on the site, so one writer's fandom suggests it to the next.
    const srcInput = $("#we-source");
    if (srcInput && type === "fan") {
      const acFandoms = FANDOMS.slice();
      attachAutocomplete(srcInput, () => acFandoms);
      if (isLive()) {
        const have = new Set(acFandoms.map(s => s.toLowerCase()));
        const merge = (arr) => (arr || []).forEach(n => { const v = (n || "").trim(); if (v && !have.has(v.toLowerCase())) { acFandoms.push(v); have.add(v.toLowerCase()); } });
        WispDB.listCategories("fandom").then(cs => merge((cs || []).map(c => c.name))).catch(() => {});
        WispDB.listFandoms(1000).then(merge).catch(() => {});
        hubNamesP.then(merge).catch(() => {});
      }
    }

    // Placeholder overlay: the guidance shows only while the editor is empty,
    // so it can never be saved as real chapter text. Keep it in sync as the
    // writer types, pastes, or clears everything back out.
    const bodyEd = $("#we-body");
    if (bodyEd) {
      ["input", "keyup", "paste", "cut", "focus", "blur"].forEach(ev =>
        bodyEd.addEventListener(ev, () => setTimeout(updateEditorEmpty, 0)));
      // Images carry their own controls: scale (small/medium/full) and remove.
      decorateEditorImages();
      // Video/map/audio embeds become non-editable, each with a paragraph after.
      decorateEditorEmbeds();
      bodyEd.addEventListener("click", (e) => {
        const gm = e.target.closest(".gc-mark");
        if (gm) { e.preventDefault(); openGrammarPop(gm); return; }
        const sz = e.target.closest("[data-img-size]");
        if (sz) { const fig = sz.closest("figure.embed--img"); if (fig) { const v = sz.dataset.imgSize; fig.setAttribute("data-size", v); fig.classList.remove("is-small", "is-medium", "is-full"); fig.classList.add("is-" + v); } e.preventDefault(); return; }
        const del = e.target.closest("[data-img-del]");
        if (del) { const fig = del.closest("figure.embed--img"); if (fig) fig.remove(); updateEditorEmpty(); e.preventDefault(); return; }
        const fig = e.target.closest("figure.embed--img");
        if (fig) { fig.classList.toggle("is-active"); }
      });
      updateEditorEmpty();
    }
    // Autosave: any edit to the body or the side fields marks the draft dirty and
    // schedules a debounced write, so a chapter is never lost by navigating away.
    const writerRoot = $("#screen-write");
    if (writerRoot) {
      writerRoot.addEventListener("input", markEditorDirty);
      writerRoot.addEventListener("change", markEditorDirty);
    }
    // Set the initial flag honestly: a loaded work is saved; a new one is not yet.
    setSaveFlag((liveEditor && liveEditor.work) ? "saved" : "idle");
    // Line spacing while writing (a comfort setting; readers keep their own).
    const lineSel = $("#we-linespace");
    if (lineSel) lineSel.addEventListener("change", () => {
      editorLineSpace = lineSel.value;
      try { localStorage.setItem("wisp.editorLineSpace", editorLineSpace); } catch (e) {}
      if (bodyEd) bodyEd.style.lineHeight = lineSpaceValue(editorLineSpace);
    });
    // Font-size box: apply on change, and mirror the selection's size (Docs-like).
    const fsInp = $("#we-fontsize");
    if (fsInp) {
      fsInp.addEventListener("change", () => applyFontSize(fsInp.value));
      fsInp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyFontSize(fsInp.value); } });
    }
    if (bodyEd) ["mouseup", "keyup", "touchend"].forEach(ev => bodyEd.addEventListener(ev, () => setTimeout(syncFontSizeBox, 0)));
    // Backstop: remember the editor's selection whenever it changes, so a size
    // nudge can act on it even after a toolbar tap blurs the field (mobile).
    document.addEventListener("selectionchange", rememberEditorSelection);

    // Reorder chapters up or down (live works only).
    $$("#screen-write [data-ch-move]").forEach(b => b.addEventListener("click", async () => {
      if (!isLive() || !liveEditor || !liveEditor.work) { toast("Reordering needs the connected site."); return; }
      const parts = b.dataset.chMove.split(":"), num = +parts[0], dir = parts[1];
      const chs = liveEditor.allChapters || [];
      const idx = chs.findIndex(c => c.number === num); if (idx < 0) return;
      const j = dir === "up" ? idx - 1 : idx + 1; if (j < 0 || j >= chs.length) return;
      const other = chs[j].number, wid = liveEditor.work.id;
      const openId = liveEditor.chapter ? liveEditor.chapter.id : null;
      $$("#screen-write [data-ch-move]").forEach(x => x.disabled = true);
      try {
        await WispDB.swapChapterNumbers(wid, num, other);
        const fresh = await WispDB.getChapters(wid).catch(() => []);
        const openNum = ((fresh.find(c => c.id === openId)) || {}).number || 1;
        toast("Chapter moved.");
        navigate("write/" + wid + "/" + openNum);
      } catch (e) { toast((e && e.message) || "Could not reorder."); $$("#screen-write [data-ch-move]").forEach(x => x.disabled = false); }
    }));

    // Delete a single chapter, then renumber the rest so there are no gaps.
    $$("#screen-write [data-ch-del]").forEach(b => b.addEventListener("click", () => {
      if (!isLive() || !liveEditor || !liveEditor.work) { toast("Deleting chapters needs the connected site."); return; }
      const num = +b.dataset.chDel;
      const chs = liveEditor.allChapters || [];
      if (chs.length <= 1) { toast("A work needs at least one chapter. Delete the work instead."); return; }
      const ch = chs.find(c => c.number === num); if (!ch) return;
      const wid = liveEditor.work.id;
      const openId = liveEditor.chapter ? liveEditor.chapter.id : null;
      confirmDialog({ title: "Delete this chapter?", body: `Chapter ${num}${ch.title ? " (" + esc(ch.title) + ")" : ""} will be removed. This can't be undone.`, confirmText: "Delete chapter", danger: true },
        async () => {
          try {
            await WispDB.deleteChapter(ch.id);
            // Close the gap: renumber remaining chapters to 1..n (ascending is safe).
            const fresh = (await WispDB.getChapters(wid).catch(() => [])).slice().sort((a, b) => a.number - b.number);
            for (let i = 0; i < fresh.length; i++) { if (fresh[i].number !== i + 1) await WispDB.setChapterNumber(fresh[i].id, i + 1); }
            const still = (await WispDB.getChapters(wid).catch(() => [])).slice().sort((a, b) => a.number - b.number);
            const openNum = ((still.find(c => c.id === openId)) || still[0] || { number: 1 }).number;
            toast("Chapter deleted.");
            navigate("write/" + wid + "/" + openNum);
          } catch (e) { toast((e && e.message) || "Could not delete the chapter."); }
        });
    }));
  }

  /* ======================================================================= */
  /*  SCREEN: LIBRARY                                                         */
  /* ======================================================================= */
  let libTab = "bookmarks";

  function libSubtabs() {
    return `<div class="subtabs">${[["bookmarks","Bookmarks"],["lists","Reading lists"],["history","History"],["things","Things"]]
      .map(([k, n]) => `<button class="subtab ${libTab === k ? "is-active" : ""}" data-libtab="${k}">${n}</button>`).join("")}</div>`;
  }
  function libShell(inner) {
    $("#screen-library").innerHTML = `
      <div class="page page--wide">
        <div class="eyebrow rose" style="margin-bottom:8px">Library</div>
        <h1 class="display" style="font-size:30px;margin-bottom:6px">Your library</h1>
        <p class="section-lead">Your bookmarks, lists, history, and notes.</p>
        ${libSubtabs()}
        ${inner}
      </div>`;
  }
  function renderLibrarySignedOut() {
    $("#screen-library").innerHTML = `
      <div class="page page--wide">
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px;margin-bottom:16px">Sign in to see your library.</p>
          <button class="btn btn--primary" data-auth="in">Sign in</button>
        </div>
      </div>`;
  }
  async function loadLibrary() {
    if (!WispDB.signedIn) { renderLibrarySignedOut(); return; }
    if (LIVE.viewingList) { renderLibraryListView(); return; }
    loadingScreen("#screen-library");
    try {
      if (libTab === "bookmarks") LIVE.lib.bookmarks = await WispDB.myBookmarks();
      else if (libTab === "history") LIVE.lib.history = await WispDB.myHistory();
      else if (libTab === "lists") LIVE.lib.lists = await WispDB.myLists();
      else if (libTab === "things") LIVE.lib.things = await WispDB.myHighlights();
    } catch (e) { console.error("[wisp] library load failed:", e); }
    renderLibraryLive();
  }
  function renderLibraryLive() {
    const gridOf = (works) => `<div class="work-grid">${works.map(cardGallery).join("")}</div>`;
    const empty = (msg, act) => `<div class="empty-note"><p>${msg}</p>${act || ""}</div>`;
    const goBrowse = `<a class="btn btn--primary btn--sm" href="#/browse">Browse works</a>`;
    let pane = "";
    if (libTab === "bookmarks") {
      const bm = LIVE.lib.bookmarks || [];
      pane = `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Bookmarks</span><span class="muted" style="font-size:13px">${bm.length} ${bm.length === 1 ? "work" : "works"}</span></div>
        ${bm.length ? gridOf(bm) : empty("No bookmarks yet. Go find some works to save.", goBrowse)}</div>`;
    } else if (libTab === "history") {
      const h = LIVE.lib.history || [];
      pane = `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Recently read</span>${h.length ? `<button class="btn--link" data-clear-history>Clear history</button>` : ""}</div>
        ${h.length ? gridOf(h) : empty("Nothing read yet. Go find some works to read.", goBrowse)}</div>`;
    } else if (libTab === "lists") {
      const lists = LIVE.lib.lists || [];
      pane = `<div class="shelf">
        <div class="shelf__head"><span class="shelf__title">Reading lists</span><button class="btn btn--quiet btn--sm" data-new-list>${icon("plus",14)} New list</button></div>
        ${lists.length ? `<div class="list-grid">${lists.map(l => `
          <button class="list-tile" data-open-list="${l.id}" style="text-align:left;background:none;border:0;cursor:pointer;width:100%">
            <div style="font:600 17px var(--font-display);color:var(--ink)">${esc(l.name)}</div>
            <div class="muted" style="font-size:12.5px;margin-top:4px">${l._count || 0} ${(l._count || 0) === 1 ? "work" : "works"} &middot; ${l.is_public ? "Public" : "Private"}</div>
          </button>`).join("")}</div>` : empty("No lists yet. Make one to group your works.")}
      </div>`;
    } else if (libTab === "things") {
      const things = LIVE.lib.things || [];
      pane = `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Things</span><span class="muted" style="font-size:13px">Your private highlights and notes</span></div>
        ${things.length ? things.map(t => `
          <div class="thing">
            <div style="font:500 15px var(--font-read);color:var(--ink)">${esc(t.text)}</div>
            ${t.note ? `<div class="soft" style="font-size:13.5px;margin-top:6px">${esc(t.note)}</div>` : ""}
            <div class="thing__src">${t.work ? `from <a href="#/work/${t.work.id}">${esc(t.work.title)}</a> &middot; ` : ""}<button class="btn--link" data-del-highlight="${t.id}" style="color:#a2444f">Delete</button></div>
          </div>`).join("") : empty("No highlights yet. Highlight a line while you read.")}
      </div>`;
    }
    libShell(pane);
  }
  async function renderLibraryListView() {
    const l = LIVE.viewingList;
    loadingScreen("#screen-library");
    let works = [];
    try { works = await WispDB.listContents(l.id); } catch (e) {}
    const rows = works.length
      ? works.map(w => `<div class="ms-row" data-work="${w.id}">
          <span class="ms-cover">${cover(w.cover, w.title)}${rate(w.rating)}</span>
          <span class="ms-main"><span class="ms-title">${esc(w.title)}</span><span class="ms-meta"><span class="muted">by ${esc(w.author)}</span></span></span>
          <span class="ms-row__actions"><button class="btn--link" data-list-remove="${w.id}" style="color:#a2444f">Remove</button></span>
        </div>`).join("")
      : `<p class="muted" style="padding:24px 4px">This list is empty. Add works from a work's page.</p>`;
    $("#screen-library").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-lib-back style="margin-bottom:14px">&lsaquo; All lists</button>
        <div class="write-head"><div>
          <h1 class="display" style="font-size:28px">${esc(l.name)}</h1>
          <p class="section-lead" style="margin-bottom:0">${l.is_public ? "Public" : "Private"} list</p>
        </div>
        <div class="write-actions"><button class="btn btn--quiet btn--sm" data-list-delete="${l.id}" style="color:#a2444f">Delete list</button></div>
        </div>
        <div class="ms-list">${rows}</div>
      </div>`;
  }
  function openNewListDialog() {
    if (!WispDB.signedIn) { openAuth("in"); return; }
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h2 style="font-size:20px">New reading list</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>List name</label><input type="text" id="nl-name" placeholder="Comfort reads"></div>
      <label class="check"><input type="checkbox" id="nl-public"> Make this list public</label>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" data-nl-create>Create list</button>
      </div>`, "New reading list");
    $("#modalCard [data-nl-create]").addEventListener("click", async () => {
      const name = $("#nl-name").value.trim(); if (!name) { toast("Give the list a name."); return; }
      try { await WispDB.createList(name, $("#nl-public").checked); closeModal(); toast("List created."); LIVE.lib.lists = null; libTab = "lists"; LIVE.viewingList = null; loadLibrary(); }
      catch (e) { toast((e && e.message) || "Could not create the list."); }
    });
  }
  async function openAddToList(workId) {
    if (!WispDB.signedIn) { openAuth("in"); return; }
    let lists = [];
    try { lists = await WispDB.myLists(); } catch (e) {}
    const items = lists.length
      ? lists.map(l => `<button class="modal-menu-btn" data-add-to="${l.id}" style="display:flex;justify-content:space-between;width:100%;text-align:left;background:none;border:0;padding:10px 8px;cursor:pointer;border-radius:8px"><span>${esc(l.name)}</span><span class="muted" style="font-size:12.5px">${l._count || 0}</span></button>`).join("")
      : `<p class="muted" style="font-size:13px;padding:6px 8px">No lists yet.</p>`;
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <h2 style="font-size:20px">Add to a reading list</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="modal-menu">${items}</div>
      <div class="modal-actions" style="margin-top:14px"><button class="btn btn--quiet btn--full" data-al-new>${icon("plus",14)} New list</button></div>`, "Add to a reading list");
    $$("#modalCard [data-add-to]").forEach(b => b.addEventListener("click", async () => {
      try { await WispDB.addToList(b.dataset.addTo, workId); closeModal(); toast("Added to the list."); LIVE.lib.lists = null; }
      catch (e) { toast((e && e.message) || "Could not add."); }
    }));
    $("#modalCard [data-al-new]").addEventListener("click", async () => {
      const name = prompt && typeof prompt === "function" ? null : null;   // avoid blocking prompt; open the create dialog instead
      closeModal(); openNewListDialog();
    });
  }
  function renderLibrary() {
    if (isLive()) { loadLibrary(); return; }
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
      history: `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Recently read</span><button class="btn--link" data-toast="Clearing your history works once the site is connected and you're signed in.">Clear history</button></div>${gridOf(L.history)}</div>`,
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
  // How the community events list is ordered. "soonest" = nearest event date
  // first; "latest" = most recently added first. Remembered across visits.
  let eventSort = (function () { try { return localStorage.getItem("wisp.eventSort") || "latest"; } catch (e) { return "latest"; } })();
  function eventStartMs(e) { return e.starts_at ? new Date(e.starts_at).getTime() : null; }
  function eventEndMs(e) { return e.ends_at ? new Date(e.ends_at).getTime() : null; }
  function eventCreatedMs(e) { return e.created_at ? new Date(e.created_at).getTime() : 0; }
  // An event is "ended" once its end time has passed. Events with no end time
  // (a point in time, or undated) never count as ended.
  function eventEnded(e, now) { const em = eventEndMs(e); return em != null && now >= em; }
  // Ended events drop off the lists 24 hours after they finish, to cut clutter.
  function eventExpired(e, now) { const em = eventEndMs(e); return em != null && now >= em + 86400000; }
  function sortEvents(list, mode) {
    const arr = list.slice();
    if (mode === "soonest") {
      arr.sort((a, b) => {
        const sa = eventStartMs(a), sb = eventStartMs(b);
        if (sa == null && sb == null) return eventCreatedMs(b) - eventCreatedMs(a);
        if (sa == null) return 1;                 // undated events sink to the bottom
        if (sb == null) return -1;
        return sa - sb;                            // earliest date first
      });
    } else {
      arr.sort((a, b) => eventCreatedMs(b) - eventCreatedMs(a));   // newest added first
    }
    return arr;
  }

  // Gift exchanges get the same ordering choice. "soonest" ranks by the close
  // (match_at) time, nearest first; exchanges with no close time sink down.
  let exchangeSort = (function () { try { return localStorage.getItem("wisp.exchangeSort") || "latest"; } catch (e) { return "latest"; } })();
  function sortExchanges(list, mode) {
    const arr = list.slice();
    if (mode === "soonest") {
      arr.sort((a, b) => {
        const ma = a.match_at ? new Date(a.match_at).getTime() : null;
        const mb = b.match_at ? new Date(b.match_at).getTime() : null;
        if (ma == null && mb == null) return eventCreatedMs(b) - eventCreatedMs(a);
        if (ma == null) return 1;
        if (mb == null) return -1;
        return ma - mb;
      });
    } else {
      arr.sort((a, b) => eventCreatedMs(b) - eventCreatedMs(a));
    }
    return arr;
  }
  // When an exchange's close time has passed and it's still taking sign-ups,
  // run matching. Matching is admin-only, so this fires from an admin's browser
  // the next time they load the community page (the static-site stand-in for a
  // scheduled job). Best effort: too few sign-ups just leaves it open.
  async function autoMatchDueExchanges(list) {
    if (!isLive() || !WispDB.isAdmin) return false;
    const now = Date.now();
    let ran = false;
    for (const x of (list || [])) {
      if (x.status === "signups" && x.match_at && new Date(x.match_at).getTime() <= now) {
        try { await WispDB.runMatching(x.id); x.status = "matched"; ran = true; }
        catch (e) { /* not enough sign-ups yet, or a transient error: leave it open */ }
      }
    }
    return ran;
  }

  async function loadCommunity() {
    loadingScreen("#screen-community");
    try {
      const [events, mine, hubs, myHubs, hubCounts, exchanges] = await Promise.all([
        WispDB.listEvents(),
        WispDB.myEventIds().catch(() => new Set()),
        WispDB.listHubs().catch(() => []),
        WispDB.myHubIds().catch(() => new Set()),
        WispDB.hubMemberCounts().catch(() => ({})),
        WispDB.listExchanges().catch(() => [])
      ]);
      LIVE.events = events;
      LIVE.myEvents = mine;
      LIVE.hubs = hubs;
      LIVE.myHubs = myHubs;
      LIVE.hubCounts = hubCounts;
      LIVE.exchanges = exchanges;
      // If any exchange is past its close time, run matching (admin only).
      if (await autoMatchDueExchanges(LIVE.exchanges)) {
        LIVE.exchanges = await WispDB.listExchanges().catch(() => LIVE.exchanges);
        toast("An exchange reached its close time; matching ran.");
      }
    } catch (e) { console.error("[wisp] community load failed:", e); }
    renderCommunity();
  }
  function renderCommunity() {
    $("#screen-community").innerHTML = `
      <div class="page page--wide">
        <div class="eyebrow rose" style="margin-bottom:8px">Community Space</div>
        <h1 class="display" style="font-size:30px;margin-bottom:6px">Community</h1>
        <p class="section-lead">Hubs for fandoms and tags, plus events you can join.</p>

        <div class="shelf">
          <div class="shelf__head">
            <span class="shelf__title">Events and challenges</span>
            <div class="event-sort" role="group" aria-label="Sort events">
              <button class="event-sort__btn${eventSort === "soonest" ? " is-on" : ""}" data-event-sort="soonest" aria-pressed="${eventSort === "soonest"}">Soonest</button>
              <button class="event-sort__btn${eventSort === "latest" ? " is-on" : ""}" data-event-sort="latest" aria-pressed="${eventSort === "latest"}">Latest</button>
            </div>
          </div>
          <p class="muted event-sort__note">Only events you have joined show up on Home. Showing ${eventSort === "soonest" ? "nearest dates first" : "most recently added first"}.</p>
          ${(() => {
            const now = Date.now();
            const live = isLive();
            const source = live ? LIVE.events : W.EVENTS;
            const visible = source.filter(e => !eventExpired(e, now));    // drop events ended over a day ago
            const rows = sortEvents(visible, eventSort).map((e) => {
              const joined = live ? LIVE.myEvents.has(e.id) : e.joined;
              const btnAttr = live ? `data-event-join="${e.id}"` : `data-event="${W.EVENTS.indexOf(e)}"`;
              const ended = eventEnded(e, now);
              // When an event has a real start time, the badge and a live countdown
              // are both derived from it (in Eastern Time); otherwise fall back to
              // the stored day/month text with no countdown.
              const dm = e.starts_at ? easternDayMonth(e.starts_at) : { day: e.d || e.day || "", month: e.m || e.month || "" };
              const startMs = eventStartMs(e);
              const endMs = eventEndMs(e);
              let countdown = "";
              if (startMs && now < startMs) {
                countdown = `<div class="event__count"><span class="ch-countdown" data-countdown="${esc(e.starts_at)}" data-countdown-label="Starts in" data-countdown-done="Happening now">Starts in: &hellip;</span></div>`;
              } else if (ended) {
                countdown = `<div class="event__count muted">Ended ${esc(fmtEasternStamp(e.ends_at))}</div>`;
              } else if (startMs) {
                countdown = `<div class="event__count is-due">Happening now${endMs ? ", ends " + esc(fmtEasternStamp(e.ends_at)) : ""}</div>`;
              }
              // Joining closes once an event ends; members keep access to the space.
              const action = ended
                ? (live && joined ? `<a class="btn btn--ghost btn--sm" href="#/event/${e.id}">Open space</a>` : `<span class="event__ended-tag">Ended</span>`)
                : `${live && joined ? `<a class="btn btn--ghost btn--sm" href="#/event/${e.id}">Open space</a>` : ""}<button class="btn ${joined ? "btn--quiet" : "btn--ghost"} btn--sm" ${btnAttr} aria-pressed="${joined}">${joined ? "Joined" : "Join"}</button>`;
              return `<div class="event">
                <div class="event__date"><b>${esc(dm.day)}</b><span class="muted" style="font-size:12px">${esc(dm.month)}</span></div>
                <div style="flex:1">
                  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font:600 18px var(--font-display);color:var(--ink)">${esc(e.title)}</span><span class="pill">${esc(e.kind)}</span></div>
                  <p class="soft" style="font-size:14px;margin:6px 0 0;line-height:1.6">${esc(e.note)}</p>
                  ${countdown}
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${action}</div>
              </div>`;
            }).join("");
            return rows || `<p class="muted" style="font-size:14px;padding:14px 2px;line-height:1.6">No events running right now. New collections and challenges will appear here when they open.</p>`;
          })()}
        </div>

        ${isLive() ? `<div class="shelf">
          <div class="shelf__head">
            <span class="shelf__title">Gift exchanges</span>
            <div class="event-sort" role="group" aria-label="Sort exchanges">
              <button class="event-sort__btn${exchangeSort === "soonest" ? " is-on" : ""}" data-exchange-sort="soonest" aria-pressed="${exchangeSort === "soonest"}">Soonest</button>
              <button class="event-sort__btn${exchangeSort === "latest" ? " is-on" : ""}" data-exchange-sort="latest" aria-pressed="${exchangeSort === "latest"}">Latest</button>
            </div>
          </div>
          <p class="muted event-sort__note">Sign up with a request and an offer; you'll be matched to write for someone. Showing ${exchangeSort === "soonest" ? "nearest close dates first" : "most recently added first"}.</p>
          ${(() => {
            const list = LIVE.exchanges || [];
            if (!list.length) return `<p class="muted" style="font-size:14px;padding:12px 2px;line-height:1.6">No gift exchanges yet. When one opens, you can sign up here.</p>`;
            const now = Date.now();
            return sortExchanges(list, exchangeSort).map(x => {
              const st = EX_STATUS[x.status] || EX_STATUS.signups;
              const cta = x.status === "signups" ? "Sign up" : x.status === "matched" ? "Your assignment" : x.status === "revealed" ? "Your gift" : "View";
              // A close time gives readers a live countdown while sign-ups are open.
              let countdown = "";
              if (x.match_at && x.status === "signups") {
                const ms = new Date(x.match_at).getTime();
                countdown = now < ms
                  ? `<div class="event__count"><span class="ch-countdown" data-countdown="${esc(x.match_at)}" data-countdown-label="Sign-ups close in" data-countdown-done="Matching now">Sign-ups close in: &hellip;</span></div>`
                  : `<div class="event__count is-due">Sign-ups closed; matching soon</div>`;
              }
              return `<div class="event">
                <div style="flex:1">
                  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font:600 18px var(--font-display);color:var(--ink)">${esc(x.title)}</span><span class="pill">${st.label}</span></div>
                  ${x.note ? `<p class="soft" style="font-size:14px;margin:6px 0 0;line-height:1.6">${esc(x.note)}</p>` : ""}
                  ${countdown}
                </div>
                <button class="btn btn--ghost btn--sm" data-exchange-open="${x.id}">${cta}</button>
              </div>`;
            }).join("");
          })()}
        </div>` : ""}

        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Hubs</span></div>
          ${(() => {
            const cards = (isLive() ? LIVE.hubs : W.HUBS).map(h => {
              const live = isLive();
              const following = live ? LIVE.myHubs.has(h.id) : false;
              const count = live ? (LIVE.hubCounts[h.id] || 0) : null;
              const meta = live
                ? `${esc(h.kind)} &middot; ${count === 0 ? "no followers yet" : count + (count === 1 ? " follower" : " followers")}`
                : `${esc(h.kind)} &middot; ${esc(h.members)} readers`;
              const btn = live
                ? `<button class="btn btn--sm ${following ? "btn--quiet" : "btn--ghost"}" data-hub-follow="${h.id}" aria-pressed="${following}">${following ? "Following" : "Follow"}</button>`
                : `<button class="btn--link" data-toast="Following a hub keeps its new works close. This turns on once the site is connected.">Follow &rsaquo;</button>`;
              return `<div class="hub${live ? " hub--link" : ""}" ${live ? `data-hub-open="${h.id}"` : ""}>
                <div class="hub__name"><span style="color:var(--rose)">${icon(h.icon,16)}</span>${esc(h.name)}</div>
                <div class="muted" style="font-size:12px;margin:3px 0 8px">${meta}</div>
                <p class="soft" style="font-size:13.5px;margin:0;line-height:1.55">${esc(h.note)}</p>
                <div class="hub__foot">${btn}${live ? `<span class="hub__see">See works ${icon("chev",12)}</span>` : ""}</div>
              </div>`;
            }).join("");
            return cards
              ? `<div class="hub-grid">${cards}</div>`
              : `<p class="muted" style="font-size:14px;padding:6px 2px;line-height:1.6">No hubs yet. Once hubs are set up, they show here for readers to follow.</p>`;
          })()}
        </div>

        <div class="editorial">
          <div class="eyebrow rose" style="margin-bottom:6px">Reporting and support</div>
          <p class="soft" style="font-size:14px;margin:0 0 12px;line-height:1.7">Most discussion, bug reports, and support happen on the <a href="https://discord.gg/Mk2BAfBqt" target="_blank" rel="noopener nofollow" style="text-decoration:underline;text-underline-offset:2px">Wisp Discord</a>. The in-app report button is for urgent cases and goes straight to the moderation team. Fiction is allowed as long as it's tagged and warned. The limits are illegal content, targeted harassment, doxxing, threats against real people, and spam.</p>
          <div class="legal-links">
            <a class="btn--link" href="https://discord.gg/Mk2BAfBqt" target="_blank" rel="noopener nofollow">${icon("user",14)} Join the Discord</a>
            <button class="btn--link" data-legal="terms">Terms of use</button>
            <button class="btn--link" data-legal="privacy">Privacy</button>
            <button class="btn--link" data-legal="content">Content and copyright</button>
          </div>
        </div>
      </div>`;
    startCountdowns();   // events with a start time count down live, like chapter releases
  }

  // ---- Hub landing page ----------------------------------------------------
  async function loadHubPage(id) {
    loadingScreen("#screen-community");
    LIVE.hubPage = null;
    try {
      const detail = await WispDB.hubDetail(id);
      if (!detail) { renderHubNotFound(); return; }
      const works = await WispDB.worksInHub(detail.hub).catch(() => []);
      const widgets = await WispDB.listHubWidgets(id).catch(() => []);
      const polls = {};
      await Promise.all(widgets.filter(w => w.kind === "poll").map(async w => {
        const [tally, mine] = await Promise.all([
          WispDB.pollTally(w.id).catch(() => ({})),
          WispDB.myPollVote(w.id).catch(() => null)
        ]);
        polls[w.id] = { tally: tally, mine: mine };
      }));
      const stats = {
        followers: detail.count || 0,
        works: works.length,
        hearts: works.reduce((s, w) => s + (w.heartsN || 0), 0),
        reads: works.reduce((s, w) => s + (w.readsN || 0), 0),
        comments: works.reduce((s, w) => s + (w.commentsN || 0), 0)
      };
      LIVE.hubPage = { detail, works, widgets, polls, stats };
    } catch (e) {
      console.error("[wisp] hub load failed:", e);
      renderHubNotFound(); return;
    }
    renderHubPage();
  }
  function renderHubNotFound() {
    $("#screen-community").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="community" style="margin-bottom:18px">&lsaquo; All hubs</button>
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px">That hub could not be found.</p>
        </div>
      </div>`;
  }
  function renderHubUnavailable() {
    $("#screen-community").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="community" style="margin-bottom:18px">&lsaquo; All hubs</button>
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px">These pages open once the site is connected to its backend.</p>
        </div>
      </div>`;
  }

  /* ---- event space: a private feed for the event's members --------------- */
  async function loadEventSpace(id) {
    loadingScreen("#screen-community");
    let ev = null, isMember = false, count = 0, posts = [], notify = true;
    try {
      ev = await WispDB.getEvent(id);
      if (ev) {
        const mine = await WispDB.myEventIds().catch(() => new Set());
        isMember = mine.has(id);
        count = await WispDB.eventMemberCount(id).catch(() => 0);
        if (isMember) {
          posts = await WispDB.listEventPosts(id).catch(() => []);
          notify = await WispDB.myEventNotify(id).catch(() => true);
        }
      }
    } catch (e) { console.error("[wisp] event space load failed:", e); }
    LIVE.eventSpace = { ev: ev, isMember: isMember, count: count, posts: posts, notify: notify };
    renderEventSpace();
  }
  function eventCountdownHTML(ev) {
    const now = Date.now();
    const startMs = ev.starts_at ? new Date(ev.starts_at).getTime() : null;
    const endMs = ev.ends_at ? new Date(ev.ends_at).getTime() : null;
    if (startMs && now < startMs) return `<span class="ch-countdown" data-countdown="${esc(ev.starts_at)}" data-countdown-label="Starts in" data-countdown-done="Happening now">Starts in: &hellip;</span>`;
    if (startMs && endMs && now >= endMs) return `Ended ${esc(fmtEasternStamp(ev.ends_at))}`;
    if (startMs) return `Happening now${endMs ? ", ends " + esc(fmtEasternStamp(ev.ends_at)) : ""}`;
    return "";
  }
  function renderEventSpace() {
    const sp = LIVE.eventSpace; if (!sp) return;
    const ev = sp.ev;
    if (!ev) {
      $("#screen-community").innerHTML = `<div class="page page--wide"><button class="btn--link" data-nav="community" style="margin-bottom:18px">&lsaquo; Community</button><div class="editorial" style="text-align:center;padding:50px 20px"><p class="soft" style="font-size:16px">That event could not be found.</p></div></div>`;
      return;
    }
    const dm = ev.starts_at ? easternDayMonth(ev.starts_at) : { day: ev.day || "", month: ev.month || "" };
    const cd = eventCountdownHTML(ev);
    const head = `
      <button class="btn--link" data-nav="community" style="margin-bottom:16px">&lsaquo; Community</button>
      <div class="event-space__head">
        <div class="event__date" style="align-self:flex-start">${dm.day ? `<b>${esc(dm.day)}</b><span class="muted" style="font-size:12px">${esc(dm.month)}</span>` : ""}</div>
        <div style="flex:1;min-width:220px">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><h1 class="display" style="font-size:26px">${esc(ev.title)}</h1><span class="pill">${esc(ev.kind || "Event")}</span></div>
          ${ev.note ? `<p class="soft" style="font-size:15px;margin:8px 0 0;line-height:1.6">${esc(ev.note)}</p>` : ""}
          <div class="muted" style="font-size:13px;margin-top:8px;display:flex;gap:14px;flex-wrap:wrap">
            ${cd ? `<span class="event-space__count">${cd}</span>` : ""}
            <span>${sp.count} ${sp.count === 1 ? "member" : "members"}</span>
          </div>
        </div>
      </div>`;

    const ended = eventEnded(ev, Date.now());
    let bodyHTML;
    if (!sp.isMember) {
      bodyHTML = ended
        ? `<div class="event-space__gate">
            <p class="soft" style="font-size:15px">This event has ended, so it's no longer open to join.</p>
          </div>`
        : `<div class="event-space__gate">
            <p class="soft" style="font-size:15px">This space is for people taking part in the event. Join to see and share posts.</p>
            <button class="btn btn--primary" data-event-space-join="${esc(ev.id)}">Join this event</button>
          </div>`;
    } else {
      const notifyOn = sp.notify !== false;
      const compose = `<div class="event-post-compose">
        <textarea id="ev-post" rows="3" placeholder="Share an update, a question, or an image with the event..."></textarea>
        <input type="file" id="ev-img" accept="image/*" hidden>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <button class="btn--link" data-event-add-img style="font-size:13px">${icon("plus",13)} Add image</button>
            <button class="btn--link" data-event-notify="${esc(ev.id)}" aria-pressed="${notifyOn}" style="font-size:13px">${icon(notifyOn ? "bell" : "mute",13)} ${notifyOn ? "Notifications on" : "Notifications off"}</button>
            <button class="btn--link" data-event-space-leave="${esc(ev.id)}" style="color:#a2444f;font-size:13px">Leave the event</button>
          </div>
          <button class="btn btn--primary btn--sm" data-event-post="${esc(ev.id)}">Post</button>
        </div>
      </div>`;
      const isAdmin = !!(WispDB.isAdmin);
      const feed = sp.posts.length
        ? sp.posts.map(p => {
            const name = p.author ? (p.author.display_name || "A reader") : "A reader";
            const mine = WispDB.user && p.user_id === WispDB.user.id;
            const acts = [];
            if (isAdmin) acts.push(`<button class="btn--link event-post__pin" data-event-post-pin="${esc(p.id)}:${p.pinned ? "0" : "1"}" style="font-size:12px;margin-left:auto">${p.pinned ? "Unpin" : "Pin"}</button>`);
            if (mine) acts.push(`<button class="btn--link event-post__del" data-event-post-del="${esc(p.id)}" style="font-size:12px;color:#a2444f;${isAdmin ? "" : "margin-left:auto"}">Delete</button>`);
            return `<div class="event-post${p.pinned ? " event-post--pinned" : ""}">
              <div class="event-post__head">
                ${p.pinned ? `<span class="event-post__pinned">${icon("bookmark",12)} Pinned</span>` : ""}
                <span class="event-post__who">${esc(name)}</span>
                <span class="event-post__when">${esc(WispDB.relTime(p.created_at))}</span>
                ${acts.join("")}
              </div>
              <div class="event-post__body prose">${mdToHtmlBlocks(p.body).join("")}</div>
            </div>`;
          }).join("")
        : `<p class="muted" style="font-size:14px;padding:14px 2px">No posts yet. Be the first to say something.</p>`;
      bodyHTML = compose + `<div class="event-space__feed">${feed}</div>`;
    }

    $("#screen-community").innerHTML = `<div class="page page--wide">${head}${bodyHTML}</div>`;
    startCountdowns();
    wireEventSpace(ev.id);
  }
  function wireEventSpace(id) {
    const scr = $("#screen-community");
    const join = scr.querySelector("[data-event-space-join]");
    join && join.addEventListener("click", async () => {
      try { await WispDB.toggleEventJoin(id, true); celebrate("You're in!", "Welcome to the event space.", "🎉"); loadEventSpace(id); }
      catch (e) { toast((e && e.message) || "Could not join."); }
    });
    const leave = scr.querySelector("[data-event-space-leave]");
    leave && leave.addEventListener("click", () => {
      confirmDialog({ title: "Leave this event?", body: "You'll leave the event space and stop seeing its posts. You can rejoin any time.", confirmText: "Leave event", danger: true },
        async () => { try { await WispDB.toggleEventJoin(id, false); toast("Left the event."); navigate("community"); } catch (e) { toast((e && e.message) || "Could not leave."); } });
    });
    // Upload an image and drop it into the post as an inline embed.
    const addImg = scr.querySelector("[data-event-add-img]"), imgInput = scr.querySelector("#ev-img");
    addImg && addImg.addEventListener("click", () => {
      if (!isLive()) { toast("Connect the site to upload images."); return; }
      imgInput && imgInput.click();
    });
    imgInput && imgInput.addEventListener("change", async () => {
      const file = imgInput.files && imgInput.files[0]; if (!file) return;
      addImg.textContent = "Uploading...";
      try {
        const url = await WispDB.uploadCover(file);
        const ta = $("#ev-post"); const sep = ta.value && !/\n$/.test(ta.value) ? "\n" : "";
        ta.value += sep + "![](" + url + ")\n"; ta.focus();
        toast("Image added. Post to share it.");
      } catch (e) { toast((e && e.message) || "Could not upload the image."); }
      addImg.innerHTML = icon("plus", 13) + " Add image"; imgInput.value = "";
    });
    const post = scr.querySelector("[data-event-post]");
    post && post.addEventListener("click", async () => {
      const body = ($("#ev-post").value || "").trim();
      if (!body) { toast("Write something or add an image first."); return; }
      post.disabled = true;
      try { await WispDB.postToEvent(id, body); loadEventSpace(id); }
      catch (e) { post.disabled = false; toast((e && e.message) || "Could not post."); }
    });
    scr.querySelectorAll("[data-event-post-del]").forEach(b => b.addEventListener("click", () => {
      confirmDialog({ title: "Delete this post?", body: "Your post is removed from the event space.", confirmText: "Delete", danger: true },
        async () => { try { await WispDB.deleteEventPost(b.dataset.eventPostDel); loadEventSpace(id); } catch (e) { toast((e && e.message) || "Could not delete."); } });
    }));
    // Admin: pin or unpin a post so it sits at the top of the space.
    scr.querySelectorAll("[data-event-post-pin]").forEach(b => b.addEventListener("click", async () => {
      const parts = b.dataset.eventPostPin.split(":"), pid = parts[0], on = parts[1] === "1";
      try { await WispDB.pinEventPost(pid, on); toast(on ? "Post pinned." : "Post unpinned."); loadEventSpace(id); }
      catch (e) { toast((e && e.message) || "Could not update the pin."); }
    }));
    // Turn this event's activity notifications on or off for me.
    const notif = scr.querySelector("[data-event-notify]");
    notif && notif.addEventListener("click", async () => {
      const on = notif.getAttribute("aria-pressed") !== "true";
      try {
        await WispDB.setEventNotify(id, on);
        if (LIVE.eventSpace) LIVE.eventSpace.notify = on;
        toast(on ? "You'll be notified about this event's activity." : "Notifications off for this event.");
        renderEventSpace();
      } catch (e) { toast((e && e.message) || "Could not update notifications."); }
    });
  }
  // ---- hub widgets: small admin-placed blocks on a hub page ----------------
  const WIDGET_KINDS = {
    note: "Note", countdown: "Countdown", links: "Links", poll: "Poll",
    image: "Image", quote: "Quote", list: "List", progress: "Progress bar",
    button: "Button", video: "Video", faq: "FAQ"
  };
  function safeUrl(u) { try { const x = new URL(u); return (x.protocol === "https:" || x.protocol === "http:") ? x.href : ""; } catch (e) { return ""; } }
  const PROGRESS_SOURCES = { manual: "Manual", followers: "followers", hearts: "hearts", reads: "reads", works: "works", comments: "comments" };
  function hubWidgetHTML(w, polls, stats) {
    const cfg = w.config || {};
    const title = w.title ? `<div class="hubw__title">${esc(w.title)}</div>` : "";
    let body = "";
    if (w.kind === "note") {
      body = `<div class="hubw__body prose">${mdToHtmlBlocks(cfg.body || "").join("")}</div>`;
    } else if (w.kind === "countdown") {
      const iso = cfg.target || "";
      const ms = iso ? new Date(iso).getTime() : NaN;
      if (!iso || isNaN(ms)) {
        body = `<p class="muted" style="font-size:13px;margin:0">No date set yet.</p>`;
      } else if (Date.now() >= ms) {
        body = `<div class="hubw__countdown hubw__countdown--done">${esc(cfg.done || "It's here.")}</div>`;
      } else {
        body = `<div class="hubw__countdown" data-countdown="${esc(iso)}" data-countdown-label="" data-countdown-done="${esc(cfg.done || "It's here.")}">&hellip;</div>
          <p class="muted hubw__sub">${esc(fmtEasternStamp(iso))}</p>`;
      }
    } else if (w.kind === "links") {
      const items = (Array.isArray(cfg.items) ? cfg.items : []).map(it => ({ label: it.label || it.url || "", url: safeUrl(it.url || "") })).filter(it => it.url);
      body = items.length
        ? `<ul class="hubw__links">${items.map(it => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">${icon("external", 13)}<span>${esc(it.label)}</span></a></li>`).join("")}</ul>`
        : `<p class="muted" style="font-size:13px;margin:0">No links yet.</p>`;
    } else if (w.kind === "poll") {
      body = pollWidgetHTML(w, (polls && polls[w.id]) || { tally: {}, mine: null });
    } else if (w.kind === "image") {
      const url = safeUrl(cfg.url || "");
      const inner = url ? `<img src="${esc(url)}" alt="${esc(cfg.caption || w.title || "")}" loading="lazy" decoding="async">` : `<p class="muted" style="font-size:13px;margin:0">No image set yet.</p>`;
      const link = safeUrl(cfg.link || "");
      body = `<figure class="hubw__image">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : inner}${cfg.caption ? `<figcaption>${esc(cfg.caption)}</figcaption>` : ""}</figure>`;
    } else if (w.kind === "quote") {
      body = cfg.text
        ? `<blockquote class="hubw__quote">${esc(cfg.text)}</blockquote>${cfg.cite ? `<p class="hubw__cite">&mdash; ${esc(cfg.cite)}</p>` : ""}`
        : `<p class="muted" style="font-size:13px;margin:0">No quote yet.</p>`;
    } else if (w.kind === "list") {
      const items = (Array.isArray(cfg.items) ? cfg.items : []).filter(Boolean);
      body = items.length
        ? `<ul class="hubw__list">${items.map(it => `<li>${esc(it)}</li>`).join("")}</ul>`
        : `<p class="muted" style="font-size:13px;margin:0">No items yet.</p>`;
    } else if (w.kind === "progress") {
      const src = cfg.source || "manual";
      const cur = src !== "manual" && stats && stats[src] != null ? stats[src] : Math.max(0, +cfg.current || 0);
      const tot = Math.max(0, +cfg.target || 0);
      const rawPct = tot > 0 ? Math.min(100, (cur / tot) * 100) : 0;
      const pct = Math.round(rawPct);
      // Once there is any progress, show at least a sliver so 1 of 400 still reads.
      const barPct = cur > 0 && tot > 0 ? Math.max(3, rawPct) : rawPct;
      const unit = src !== "manual" ? PROGRESS_SOURCES[src] : (cfg.unit || "");
      body = `<div class="hubw__progress${pct >= 100 ? " is-full" : ""}"><span class="hubw__progress-bar" style="width:${barPct}%"></span></div>
        <p class="muted hubw__sub">${cur}${tot ? " / " + tot : ""}${unit ? " " + esc(unit) : ""} &middot; ${pct}%</p>`;
    } else if (w.kind === "button") {
      const url = safeUrl(cfg.url || "");
      body = url
        ? `<a class="btn btn--primary btn--full hubw__button" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(cfg.label || "Open")}</a>`
        : `<p class="muted" style="font-size:13px;margin:0">No link set yet.</p>`;
    } else if (w.kind === "video") {
      const url = safeUrl(cfg.url || "");
      body = url ? richEmbedHTML(url, cfg.title || w.title || "") : `<p class="muted" style="font-size:13px;margin:0">No video set yet.</p>`;
    } else if (w.kind === "faq") {
      const items = (Array.isArray(cfg.items) ? cfg.items : []).filter(it => it && it.q);
      body = items.length
        ? `<div class="hubw__faq">${items.map(it => `<details><summary>${esc(it.q)}</summary><div class="hubw__faq-a">${mdToHtmlBlocks(it.a || "").join("")}</div></details>`).join("")}</div>`
        : `<p class="muted" style="font-size:13px;margin:0">No questions yet.</p>`;
    }
    return `<section class="hubw hubw--${esc(w.kind)}">${title}${body}</section>`;
  }
  function pollWidgetHTML(w, state) {
    const cfg = w.config || {};
    const options = Array.isArray(cfg.options) ? cfg.options : [];
    const tally = state.tally || {};
    const mine = (state.mine === 0 || state.mine) ? state.mine : null;
    const total = Object.keys(tally).reduce((s, k) => s + (tally[k] || 0), 0);
    const q = cfg.question ? `<p class="hubw__poll-q">${esc(cfg.question)}</p>` : "";
    // The leading option(s), so the winner reads clearly like a YouTube poll.
    const top = total ? Math.max(...options.map((_, i) => tally[i] || 0)) : 0;
    const rows = options.map((opt, i) => {
      const c = tally[i] || 0;
      const rawPct = total ? (c / total) * 100 : 0;
      const pct = Math.round(rawPct);
      const barPct = c > 0 ? Math.max(3, rawPct) : 0;   // a sliver once it has a vote
      const picked = mine === i;
      const lead = total > 0 && c === top && c > 0;
      return `<button class="hubw__poll-opt${picked ? " is-picked" : ""}${lead ? " is-lead" : ""}${pct >= 100 ? " is-full" : ""}" data-poll-vote="${esc(w.id)}:${i}" aria-pressed="${picked}">
        <span class="hubw__poll-bar" style="width:${barPct}%"></span>
        <span class="hubw__poll-label">${esc(opt)}${picked ? " " + icon("check", 12) : ""}</span>
        <span class="hubw__poll-pct">${pct}%</span>
      </button>`;
    }).join("");
    const foot = `<p class="muted hubw__sub">${total} ${total === 1 ? "vote" : "votes"}${mine !== null ? " &middot; tap another option to change your vote" : ""}</p>`;
    return `${q}<div class="hubw__poll">${rows}</div>${foot}`;
  }
  function wireHubWidgets() {
    const scr = $("#screen-community");
    scr.querySelectorAll("[data-poll-vote]").forEach(b => b.addEventListener("click", async () => {
      if (!isLive() || !WispDB.signedIn) { toast("Sign in to vote in this poll."); return; }
      const parts = b.dataset.pollVote.split(":"), wid = parts[0], choice = +parts[1];
      const st = (LIVE.hubPage && LIVE.hubPage.polls && LIVE.hubPage.polls[wid]) || null;
      if (st && st.mine === choice) return;                       // already my pick
      try {
        await WispDB.castPollVote(wid, choice);
        // Refresh just this poll's tally and re-render in place.
        const [tally, mine] = await Promise.all([WispDB.pollTally(wid), WispDB.myPollVote(wid)]);
        if (LIVE.hubPage && LIVE.hubPage.polls) LIVE.hubPage.polls[wid] = { tally: tally, mine: mine };
        renderHubPage();
      } catch (e) { toast((e && e.message) || "Could not record your vote."); }
    }));
  }
  function renderHubPage() {
    const hp = LIVE.hubPage;
    if (!hp) return;
    const { hub, count, following } = hp.detail;
    const works = hp.works || [];
    const widgets = hp.widgets || [];
    const countLabel = count === 0 ? "No followers yet" : count + (count === 1 ? " follower" : " followers");
    const widgetRail = widgets.length
      ? `<div class="hub-widgets">${widgets.map(w => hubWidgetHTML(w, hp.polls, hp.stats)).join("")}</div>`
      : "";
    $("#screen-community").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="community" style="margin-bottom:18px">&lsaquo; All hubs</button>
        <div class="hub-hero">
          <div class="hub-hero__main">
            <div class="eyebrow rose" style="margin-bottom:6px">${esc(hub.kind || "Hub")}</div>
            <h1 class="display" style="font-size:30px;margin:0 0 6px"><span style="color:var(--rose);vertical-align:middle;margin-right:6px">${icon(hub.icon || "tag", 22)}</span>${esc(hub.name)}</h1>
            <p class="section-lead" style="margin:0 0 10px">${esc(hub.note || "")}</p>
            <div class="muted" style="font-size:13px">${countLabel}</div>
          </div>
          <button class="btn ${following ? "btn--quiet" : "btn--primary"}" data-hub-follow="${hub.id}" aria-pressed="${following}">${following ? "Following" : "Follow"}</button>
        </div>

        ${widgetRail}

        <div class="shelf" style="margin-top:24px">
          <div class="shelf__head"><span class="shelf__title">Works in this hub</span>${works.length ? `<span class="muted" style="font-size:13px">${works.length} ${works.length === 1 ? "work" : "works"}</span>` : ""}</div>
          ${works.length
            ? `<div class="work-grid">${works.map(cardGallery).join("")}</div>`
            : `<div class="editorial" style="text-align:center;padding:40px 20px">
                 <div class="empty-ic" style="color:var(--ink3);margin-bottom:8px">${icon("book", 30)}</div>
                 <p class="soft" style="font-size:15px;margin:0 0 6px">No works here yet.</p>
                 <p class="muted" style="font-size:13px;margin:0">Tag a work &ldquo;${esc(hub.name)}&rdquo;${/format/i.test(hub.kind || "") ? " or post it as a comic" : (hub.kind === "Fandom" ? " or set it as the fandom" : "")} and it shows up here.</p>
               </div>`}
        </div>
      </div>`;
    startCountdowns();
    wireHubWidgets();
  }

  // ---- Series landing page -------------------------------------------------
  // ---- Tag collection page: every work carrying a tag/fandom ---------------
  async function loadTagPage(name) {
    name = decodeURIComponent(name || "").trim();
    loadingScreen("#screen-browse");
    let works = [];
    try {
      if (isLive()) { works = await WispDB.worksByTag(name).catch(() => []); works.forEach(w => { LIVE.byId[w.id] = w; }); }
      else { const nl = name.toLowerCase(); works = W.WORKS.filter(w => (w.source || "").toLowerCase() === nl || (w.type === "fan" ? "fanwork" : "original") === nl || (w.tags || []).some(t => t.toLowerCase() === nl)); }
    } catch (e) { console.error("[wisp] tag page load failed:", e); }
    LIVE.tagPage = { name: name, works: works };
    renderTagPage();
  }
  function renderTagPage() {
    const tp = LIVE.tagPage; if (!tp) return;
    const works = tp.works || [];
    const grid = works.length
      ? (settings.view === "list" ? `<div class="stack-list">${works.map(cardList).join("")}</div>` : `<div class="work-grid" style="margin-top:18px">${works.map(cardGallery).join("")}</div>`)
      : `<div style="text-align:center;padding:64px 0;color:var(--ink3)"><p style="font-size:16px;color:var(--ink2)">Nothing tagged &ldquo;${esc(tp.name)}&rdquo; yet.</p><p style="font-size:14px">As works pick up this tag, they'll gather here.</p></div>`;
    $("#screen-browse").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="browse" style="margin-bottom:16px">&lsaquo; All works</button>
        <div class="eyebrow rose" style="margin-bottom:6px">Tag</div>
        <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap">
          <h1 class="display" style="font-size:30px;margin:0">${esc(tp.name)}</h1>
          <span class="muted" style="font-size:14px">${works.length} ${works.length === 1 ? "work" : "works"}</span>
        </div>
        <p class="section-lead" style="margin-top:6px">Everything tagged or set in &ldquo;${esc(tp.name)}&rdquo;.</p>
        ${grid}
      </div>`;
  }

  async function loadSeriesPage(id) {
    loadingScreen("#screen-browse");
    LIVE.seriesPage = null;
    try {
      const series = await WispDB.getSeries(id);
      if (!series) { renderSeriesNotFound(); return; }
      const books = await WispDB.worksInSeries(id).catch(() => []);
      books.forEach(w => { LIVE.byId[w.id] = w; });
      LIVE.seriesPage = { series, books };
    } catch (e) {
      console.error("[wisp] series load failed:", e);
      renderSeriesNotFound(); return;
    }
    renderSeriesPage();
  }
  function renderSeriesNotFound() {
    $("#screen-browse").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="browse" style="margin-bottom:18px">&lsaquo; Browse</button>
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px">That series could not be found.</p>
        </div>
      </div>`;
  }
  function renderSeriesUnavailable() {
    $("#screen-browse").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="browse" style="margin-bottom:18px">&lsaquo; Browse</button>
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px">Series pages open once the site is connected to its backend.</p>
        </div>
      </div>`;
  }
  function renderSeriesPage() {
    const sp = LIVE.seriesPage;
    if (!sp) return;
    const { series, books } = sp;
    const author = books[0] ? books[0].author : "";
    const authorLink = books[0] && books[0].authorId ? `#/user/${books[0].authorHandle || books[0].authorId}` : "";
    $("#screen-browse").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-nav="browse" style="margin-bottom:18px">&lsaquo; Browse</button>
        <div class="hub-hero">
          <div class="hub-hero__main">
            <div class="eyebrow rose" style="margin-bottom:6px">Series${series.type === "fan" ? " &middot; Fanwork" : ""}${series.source ? " &middot; " + esc(series.source) : ""} &middot; ${series.status === "complete" ? "Complete" : "Ongoing"}</div>
            <h1 class="display" style="font-size:30px;margin:0 0 6px">${esc(series.name)}</h1>
            ${author ? `<div class="soft" style="font-size:15px;margin:0 0 8px">by ${authorLink ? `<a href="${authorLink}">${esc(author)}</a>` : esc(author)}</div>` : ""}
            ${series.description ? `<p class="section-lead" style="margin:0">${esc(series.description)}</p>` : ""}
          </div>
          <div class="muted" style="font-size:13px;white-space:nowrap">${books.length} ${books.length === 1 ? "book" : "books"}</div>
        </div>

        <div class="shelf" style="margin-top:24px">
          <div class="shelf__head"><span class="shelf__title">Books in order</span></div>
          ${books.length
            ? `<div class="series-books">${books.map((w, idx) => `
                <div class="series-book">
                  <span class="series-book__n">${idx + 1}</span>
                  <div class="series-book__card">${cardList(w)}</div>
                </div>`).join("")}</div>`
            : `<div class="editorial" style="text-align:center;padding:40px 20px">
                 <p class="soft" style="font-size:15px;margin:0">No published books in this series yet.</p>
               </div>`}
        </div>
      </div>`;
  }

  // Plain-language policy pages, shown in a modal. Written to match how Wisp
  // actually works; the operator can adjust the wording as the site grows.
  const LEGAL = {
    terms: {
      title: "Terms of use",
      html: `
        <p class="soft" style="font-size:12.5px;margin:0 0 16px">Last updated: August 2026</p>
        <p>Wisp is a place to read and to post written works. By using it, you agree to these terms. If you do not agree, please do not use the site.</p>
        <h3>Your account</h3>
        <p>You are responsible for what happens under your account; keep your password to yourself. One account belongs to one person. Tell the moderators if you think someone else is using it.</p>
        <h3>Your work stays yours</h3>
        <p>You keep ownership of everything you post. By posting, you give Wisp permission to store your work and show it to readers, which is what makes the site work. You can edit or delete your work at any time, and deleting it withdraws that permission going forward.</p>
        <h3>The rules</h3>
        <p>Tag and warn your works honestly. Fiction is welcome, including fanwork, as long as it is tagged and warned. The limits are illegal content, targeted harassment, doxxing, threats against real people, and spam.</p>
        <h3>Moderation</h3>
        <p>Reports are reviewed by the moderation team. Works that break the rules can be removed, and accounts that break them can be suspended or closed.</p>
        <h3>No promises about uptime</h3>
        <p>Wisp is offered as it is. It can change, pause, or go offline; keep your own copy of anything you cannot bear to lose. The download button on any work saves a copy to your device.</p>
        <h3>Changes</h3>
        <p>These terms can change. When they do, the date above changes; continuing to use the site means you accept the current version.</p>`
    },
    privacy: {
      title: "Privacy",
      html: `
        <p class="soft" style="font-size:12.5px;margin:0 0 16px">Last updated: August 2026</p>
        <p>This explains what Wisp keeps and why. The short version: Wisp keeps what it needs to be your reading and writing home, and nothing more.</p>
        <h3>What is stored</h3>
        <p>Your account holds an email address and a display name. As you use the site it also stores the things you make and do: works and chapters, comments, hearts, subscriptions, bookmarks, reading lists, highlights, reading progress, event sign-ups, and any reports you file. These are kept so the site works and comes back the way you left it.</p>
        <h3>What is public and what is private</h3>
        <p>Published works, comments, and public profiles are visible to everyone. Your drafts, bookmarks, reading history, highlights, and reports are private to you. This is enforced in the database itself by row-level security, not just hidden in the page.</p>
        <h3>What Wisp does not do</h3>
        <p>Wisp does not sell your data and does not run third-party advertising trackers. Downloads are built in your browser and are not sent anywhere.</p>
        <h3>On your device</h3>
        <p>Your reading preferences, such as theme and text size, are stored on your own device. Your sign-in session is stored in your browser by the backend so you stay signed in.</p>
        <h3>Deleting things</h3>
        <p>You can delete any work you posted. To close your account and remove its data, contact the moderators through the community links.</p>`
    },
    content: {
      title: "Content and copyright",
      html: `
        <p class="soft" style="font-size:12.5px;margin:0 0 16px">Last updated: August 2026</p>
        <h3>What is allowed</h3>
        <p>Wisp is for written fiction, including fanwork. Post what you like, as long as it is tagged and warned so readers can choose for themselves.</p>
        <h3>The limits</h3>
        <p>The limits are illegal content, targeted harassment, doxxing, threats against real people, and spam. Work that crosses these lines is removed.</p>
        <h3>Ratings and warnings</h3>
        <p>Rate and warn your work honestly. Untagged or mis-rated work can be reported, and the moderators may add a warning or take the work down.</p>
        <h3>Copyright</h3>
        <p>Fanwork is transformative and is welcome here. Even so, if you believe a work copies yours without permission, report it: name the work, say what it copies, and leave a way to reach you. Verified claims are actioned, and repeat infringement can close an account.</p>
        <h3>How to report</h3>
        <p>Use the report button on any work, or reach the moderators through the community links. Urgent cases go straight to the team.</p>`
    }
  };
  function openLegal(kind) {
    const doc = LEGAL[kind] || LEGAL.terms;
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <h2 style="font-size:22px">${esc(doc.title)}</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="legal-body">${doc.html}</div>
      <div class="modal-actions" style="margin-top:16px"><button class="btn btn--primary" data-modal-cancel>Close</button></div>`, doc.title);
  }

  /* ======================================================================= */
  /*  SCREEN: PROFILE                                                         */
  /* ======================================================================= */
  /* =========================================================================
     BADGES  ·  the metallic award case (art lives in window.WispBadges)
     A profile's badges = what was granted/showcased (stored on the profile, or
     in localStorage when there is no backend) plus what its own numbers earn.
     ========================================================================= */
  let lastBadgeCase = { ids: [], name: "" };   // powers the "+N" / View-all opener
  function badgeLocalKey(who) { return "wisp.badges." + (who || "me"); }
  function readLocalBadges(who) {
    try { const v = JSON.parse(localStorage.getItem(badgeLocalKey(who)) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeLocalBadges(who, ids) {
    try { localStorage.setItem(badgeLocalKey(who), JSON.stringify(ids || [])); } catch (e) {}
  }
  // Stored (granted) badge ids for a profile: the DB column when present, else
  // the on-device fallback so the case still works without a backend.
  function storedBadgesFor(profileObj, who) {
    if (profileObj && Array.isArray(profileObj.badges) && profileObj.badges.length) return profileObj.badges.slice();
    return readLocalBadges(who);
  }
  // Ordered earned ids: granted ∪ auto-earned(from own numbers), in catalog order.
  function earnedBadgeIds(stored, stats) {
    if (!window.WispBadges) return [];
    const set = new Set(Array.isArray(stored) ? stored : []);
    if (stats) WispBadges.earnedFrom(stats).forEach(id => set.add(id));
    return WispBadges.CATALOG.map(b => b.id).filter(id => set.has(id));
  }
  function badgeChip(id, size, cls) {
    if (!window.WispBadges) return "";
    const def = WispBadges.byId(id); if (!def) return "";
    return `<span class="wisp-badge ${cls || ""}" data-badge="${esc(id)}" tabindex="0" role="button" aria-label="${esc(def.name)}, ${esc(WispBadges.tierLabel(def.tier))}">${WispBadges.svg(id, size || 44)}</span>`;
  }
  function badgeRowHTML(ids, max, size) {
    ids = ids || [];
    if (!ids.length) return "";
    const cap = max || 7, shown = ids.slice(0, cap), extra = ids.length - shown.length;
    return `<div class="badge-row">${shown.map(id => badgeChip(id, size || 38)).join("")}${extra > 0 ? `<button class="badge-more" data-badge-case aria-label="See all badges">+${extra}</button>` : ""}</div>`;
  }
  // The full case: every badge, earned ones bright, the rest dimmed as goals.
  function badgeCaseHTML(earnedIds) {
    if (!window.WispBadges) return "";
    const earned = new Set(earnedIds || []);
    return WispBadges.categories().map(c => {
      const cells = c.badges.map(b => `<div class="badge-cell ${earned.has(b.id) ? "is-earned" : "is-locked"}">${badgeChip(b.id, 54)}<span class="badge-cell__name">${esc(b.name)}</span></div>`).join("");
      return `<div class="badge-group"><div class="badge-group__label">${esc(c.label)}</div><div class="badge-grid">${cells}</div></div>`;
    }).join("");
  }
  function openBadgeCase(earnedIds, name) {
    const earned = (earnedIds || []).length;
    const total = window.WispBadges ? WispBadges.CATALOG.length : 0;
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h2 style="font-size:20px">${name ? esc(name) + "'s badge case" : "Badge case"}</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin:0 0 14px">${earned} of ${total} earned. Hover or tap a badge to see what it takes.</p>
      <div class="badge-case">${badgeCaseHTML(earnedIds)}</div>`, "Badge case");
  }
  // A small set of badges beside a name (comments, cards). Silent if none.
  function badgeMiniRow(ids, max) {
    ids = ids || []; if (!ids.length) return "";
    return `<span class="badge-mini">${ids.slice(0, max || 3).map(id => badgeChip(id, 18, "wisp-badge--mini")).join("")}</span>`;
  }

  /* ---- hover / focus detail card ---- */
  let badgePopEl = null, badgePopHideT = null;
  function ensureBadgePop() {
    if (badgePopEl) return badgePopEl;
    badgePopEl = document.createElement("div");
    badgePopEl.className = "badge-pop"; badgePopEl.id = "badgePop";
    badgePopEl.addEventListener("mouseenter", () => clearTimeout(badgePopHideT));
    badgePopEl.addEventListener("mouseleave", hideBadgePop);
    document.body.appendChild(badgePopEl);
    return badgePopEl;
  }
  function showBadgePop(chip) {
    if (!window.WispBadges) return;
    const id = chip.getAttribute("data-badge"); const def = WispBadges.byId(id); if (!def) return;
    clearTimeout(badgePopHideT);
    const pop = ensureBadgePop();
    pop.innerHTML =
      `<div class="badge-pop__art">${WispBadges.svg(id, 66)}</div>` +
      `<div class="badge-pop__body"><div class="badge-pop__name">${esc(def.name)}</div>` +
      `<div class="badge-pop__tier badge-pop__tier--${def.tier}">${esc(WispBadges.tierLabel(def.tier))}</div>` +
      `<div class="badge-pop__desc">${esc(def.desc)}</div>` +
      `<div class="badge-pop__how">${esc(def.how)}</div></div>`;
    pop.classList.add("is-on");
    const r = chip.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.top - ph - 10;
    if (top < 8) top = r.bottom + 10;
    pop.style.left = left + "px"; pop.style.top = top + "px";
  }
  function hideBadgePop() { badgePopHideT = setTimeout(() => { if (badgePopEl) badgePopEl.classList.remove("is-on"); }, 90); }

  function renderProfileSignedOut() {
    $("#screen-profile").innerHTML = `
      <div class="page page--wide">
        <div class="editorial" style="text-align:center;padding:50px 20px">
          <p class="soft" style="font-size:16px;margin-bottom:16px">Sign in to see your profile.</p>
          <button class="btn btn--primary" data-auth="in">Sign in</button>
        </div>
      </div>`;
  }
  function renderProfileLive(works, counts) {
    const p = WispDB.profile || {};
    counts = counts || { followers: 0, following: 0 };
    const name = p.display_name || "You";
    const handle = p.handle ? "@" + p.handle : "";
    const published = (works || []).filter(w => w.status === "ongoing" || w.status === "complete");
    const hearts = (works || []).reduce((n, w) => n + (+w.hearts_count || 0), 0);
    const earned = earnedBadgeIds(storedBadgesFor(p, WispDB.user && WispDB.user.id), { works: published.length, hearts: hearts, words: p.words || 0 });
    lastBadgeCase = { ids: earned, name: name };
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
              <div><b>${WispDB.fmtCount(counts.followers)}</b><span>Followers</span></div>
              <div><b>${WispDB.fmtCount(counts.following)}</b><span>Following</span></div>
            </div>
            ${earned.length ? badgeRowHTML(earned, 7, 40) : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn--quiet btn--sm" id="themeBtn2">${icon("gear",15)} Customize theme</button>
            <button class="btn btn--quiet btn--sm" data-edit-profile>${icon("edit",15)} Edit profile</button>
            <button class="btn btn--quiet btn--sm" data-nav="write">${icon("book",15)} Your works</button>
          </div>
        </div>
        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Badge case</span><span class="shelf__note">${earned.length} of ${window.WispBadges ? WispBadges.CATALOG.length : 0} earned</span></div>
          <div class="badge-case">${badgeCaseHTML(earned)}</div>
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
    try {
      const uid = WispDB.user && WispDB.user.id;
      const [works, counts] = await Promise.all([
        WispDB.myWorks(),
        uid ? WispDB.followCounts(uid).catch(() => ({ followers: 0, following: 0 })) : { followers: 0, following: 0 }
      ]);
      renderProfileLive(works, counts);
    } catch (e) { console.error("[wisp] profile load failed:", e); renderProfileLive([]); }
  }
  function openEditProfile() {
    const p = WispDB.profile || {};
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Edit profile</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Display name</label><input type="text" id="ep-name" value="${esc(p.display_name || "")}"></div>
      <div class="field"><label>Handle</label><input type="text" id="ep-handle" value="${esc(p.handle || "")}" placeholder="yourname"></div>
      <div class="field"><label>Bio</label><textarea id="ep-bio" rows="3" placeholder="Reader first, writer on the good days.">${esc(p.bio || "")}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" data-ep-save>Save</button>
      </div>`, "Edit profile");
    $("#modalCard [data-ep-save]").addEventListener("click", async () => {
      const name = $("#ep-name").value.trim();
      const handle = $("#ep-handle").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const bio = $("#ep-bio").value.trim();
      if (!name) { toast("Give yourself a display name."); return; }
      try { await WispDB.updateProfile({ display_name: name, handle: handle || null, bio }); closeModal(); toast("Profile saved."); loadProfile(); }
      catch (e) { toast(/duplicate|unique/i.test((e && e.message) || "") ? "That handle is taken." : ((e && e.message) || "Could not save.")); }
    });
  }
  // Another reader's public profile: their works and a follow button.
  async function loadUserProfile(idOrHandle) {
    loadingScreen("#screen-profile");
    try {
      const p = await WispDB.getProfile(idOrHandle);
      if (!p) { $("#screen-profile").innerHTML = `<div class="page page--wide"><p style="padding:40px 0;color:var(--ink3)">That reader could not be found.</p></div>`; return; }
      if (WispDB.profile && WispDB.profile.id === p.id) { navigate("profile"); return; }   // it's you
      const [works, counts, following] = await Promise.all([
        WispDB.worksByAuthor(p.id).catch(() => []),
        WispDB.followCounts(p.id).catch(() => ({ followers: 0, following: 0 })),
        WispDB.signedIn ? WispDB.amFollowing(p.id).catch(() => false) : false
      ]);
      renderUserProfile(p, works, counts, following);
    } catch (e) { console.error("[wisp] user profile load failed:", e); $("#screen-profile").innerHTML = `<div class="page page--wide"><p style="padding:40px 0;color:var(--ink3)">Could not open that profile.</p></div>`; }
  }
  function renderUserProfile(p, works, counts, following) {
    const name = p.display_name || "Reader";
    const hearts = (works || []).reduce((n, w) => n + (+((w.hearts_count != null) ? w.hearts_count : w.hearts) || 0), 0);
    const earned = earnedBadgeIds(storedBadgesFor(p, p.id), { works: works.length, hearts: hearts, words: p.words || 0 });
    lastBadgeCase = { ids: earned, name: name };
    const worksHTML = works.length
      ? `<div class="work-grid">${works.map(cardGallery).join("")}</div>`
      : `<p class="muted" style="font-size:14px;padding:16px 4px">No published works yet.</p>`;
    $("#screen-profile").innerHTML = `
      <div class="page page--wide">
        <button class="btn--link" data-back style="margin-bottom:14px">&lsaquo; Back</button>
        <div class="profile-hero">
          <div class="profile-hero__av">${esc((name[0] || "?").toUpperCase())}</div>
          <div style="flex:1;min-width:220px">
            <h1 class="display" style="font-size:28px">${esc(name)}</h1>
            <div class="muted" style="font-size:14px">${p.handle ? "@" + esc(p.handle) : ""}</div>
            ${p.bio ? `<p class="soft" style="font-size:15px;line-height:1.6;margin:10px 0 0;max-width:560px">${esc(p.bio)}</p>` : ""}
            <div class="profile-stats">
              <div><b>${works.length}</b><span>Works</span></div>
              <div><b>${WispDB.fmtCount(counts.followers)}</b><span>Followers</span></div>
              <div><b>${WispDB.fmtCount(counts.following)}</b><span>Following</span></div>
            </div>
            ${earned.length ? badgeRowHTML(earned, 7, 40) : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn ${following ? "btn--quiet is-on-quiet" : "btn--primary"} btn--sm" data-follow="${p.id}" aria-pressed="${following}">${following ? "Following" : "Follow"}</button>
          </div>
        </div>
        ${earned.length ? `<div class="shelf"><div class="shelf__head"><span class="shelf__title">Badge case</span><button class="btn--link" data-badge-case>View all</button></div><div class="badge-case">${badgeCaseHTML(earned)}</div></div>` : ""}
        <div class="shelf"><div class="shelf__head"><span class="shelf__title">Works</span></div>${worksHTML}</div>
      </div>`;
    if (following) userState.following.add(p.id); else userState.following.delete(p.id);
  }
  function renderProfile() {
    if (isLive()) return loadProfile();
    const P = W.PROFILE;
    // A demo showcase so the badge case is populated to look at without a backend.
    const demoStored = readLocalBadges("me");
    const demoBadges = demoStored.length ? demoStored : ["grand-prize", "kept-the-flame", "beloved", "night-owl", "spring-bloom", "kind-soul", "first-words"];
    const earned = earnedBadgeIds(demoBadges, { works: P.stats.works, hearts: 640, words: 60000 });
    lastBadgeCase = { ids: earned, name: P.name };
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
            ${badgeRowHTML(earned, 7, 40)}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn--quiet btn--sm" id="themeBtn2">${icon("gear",15)} Customize theme</button>
            <button class="btn btn--quiet btn--sm" data-toast="Arrange your profile theme, pinned works, and widgets here.">Edit profile</button>
          </div>
        </div>

        <div class="shelf">
          <div class="shelf__head"><span class="shelf__title">Badge case</span><span class="shelf__note">${earned.length} of ${window.WispBadges ? WispBadges.CATALOG.length : 0} earned</span></div>
          <div class="badge-case">${badgeCaseHTML(earned)}</div>
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
      if (!WispDB.signedIn) {
        return `<div class="act-list"><p class="muted" style="font-size:13px;padding:10px 4px;line-height:1.6">Sign in to see new chapters, comments, and followers here.</p></div>`;
      }
      const items = LIVE.notifications;
      if (items === null) {
        return `<div class="act-list"><p class="muted" style="font-size:13px;padding:10px 4px;line-height:1.6">Gathering your activity...</p></div>`;
      }
      if (!items.length) {
        return `<div class="act-list"><p class="muted" style="font-size:13px;padding:14px 4px;line-height:1.6">You're all caught up. New chapters, comments, and new followers show up here.</p></div>`;
      }
      const order = ["Today", "This week", "Earlier"];
      const groups = {};
      items.forEach(n => { const b = notifBucket(n.at); (groups[b] = groups[b] || []).push(n); });
      return order.filter(b => groups[b]).map(b => `
        <div class="rail__group">${b}</div>
        <div class="act-list">${groups[b].map(notifItemHTML).join("")}</div>`).join("");
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

  // ---- Live notifications feed ---------------------------------------------
  const NOTIF_SEEN_KEY = "wisp.notif.seen";
  function notifSeen() { try { return localStorage.getItem(NOTIF_SEEN_KEY) || ""; } catch (e) { return ""; } }
  function setNotifSeen(iso) { try { localStorage.setItem(NOTIF_SEEN_KEY, iso); } catch (e) {} }

  function timeAgoShort(iso) {
    const d = new Date(iso).getTime();
    if (!d) return "";
    const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
    if (s < 60) return "just now";
    const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
    const dd = Math.floor(h / 24); if (dd < 7) return dd + "d ago";
    const w = Math.floor(dd / 7); if (w < 5) return w + "w ago";
    return Math.floor(dd / 30) + "mo ago";
  }
  function notifBucket(iso) {
    const dd = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (dd < 1) return "Today";
    if (dd < 7) return "This week";
    return "Earlier";
  }
  function notifItemHTML(n) {
    const seen = notifSeen();
    const isNew = seen && new Date(n.at).getTime() > new Date(seen).getTime();
    let ic, body, attrs;
    if (n.type === "chapter") {
      ic = "book";
      body = `New chapter in <b>${esc(n.workTitle)}</b>: chapter ${n.number}${n.chapterTitle ? ", " + esc(n.chapterTitle) : ""}${n.hub ? ` <span class="soft">&middot; ${esc(n.hub)} hub</span>` : ""}`;
      attrs = `data-read="${esc(n.workId)}/${n.number}"`;
    } else if (n.type === "comment") {
      ic = "comment";
      body = `<b>${esc(n.who)}</b> commented on <b>${esc(n.workTitle)}</b>${n.excerpt ? `: <span class="soft">${esc(n.excerpt)}</span>` : ""}`;
      attrs = `data-work="${esc(n.workId)}"`;
    } else if (n.type === "event_post") {
      ic = "users";
      body = `<b>${esc(n.who)}</b> posted in <b>${esc(n.eventTitle)}</b>${n.excerpt ? `: <span class="soft">${esc(n.excerpt)}</span>` : ""}`;
      attrs = `data-open-event="${esc(n.eventId)}"`;
    } else {
      ic = "user";
      body = `<b>${esc(n.who)}</b> started following you`;
      attrs = (n.handle || n.whoId) ? `data-nav-user="${esc(n.handle || n.whoId)}"` : "";
    }
    return `<button class="act${isNew ? " act--new" : ""}" ${attrs}>
      <span class="act__icon ${n.type === "follow" ? "rose" : ""}">${icon(ic, 14)}</span>
      <span class="act__body">${body}<span class="act__time">${timeAgoShort(n.at)}</span></span>
    </button>`;
  }
  function unreadCount() {
    const seen = notifSeen();
    if (!seen) return 0;
    const t = new Date(seen).getTime();
    return (LIVE.notifications || []).filter(n => new Date(n.at).getTime() > t).length;
  }
  function updateNotifBadge() {
    const btn = $("#notifBtn");
    if (!btn) return;
    const n = isLive() && WispDB.signedIn ? unreadCount() : 0;
    btn.classList.toggle("has-unread", n > 0);
    btn.setAttribute("aria-label", n > 0 ? `Notifications, ${n} new` : "Notifications");
  }
  function markNotificationsSeen() {
    const items = LIVE.notifications || [];
    setNotifSeen(items.length ? items[0].at : new Date().toISOString());
    updateNotifBadge();
    renderActivity();   // clears the per-item "new" marks
  }
  async function loadNotifications(force) {
    if (!isLive() || !WispDB.signedIn) { LIVE.notifications = null; updateNotifBadge(); return; }
    if (LIVE.notifications !== null && !force) { updateNotifBadge(); return; }
    try {
      const items = await WispDB.getNotifications();
      LIVE.notifications = items;
      // First ever visit: treat what is already there as seen, so the badge
      // only lights up for things that arrive from now on.
      if (!notifSeen()) setNotifSeen(items.length ? items[0].at : new Date().toISOString());
    } catch (e) {
      LIVE.notifications = LIVE.notifications || [];
    }
    renderActivity();
    updateNotifBadge();
  }
  // Small handle so the feed's pure view logic can be exercised by tests.
  window.WispNotif = {
    itemHTML: notifItemHTML, bucket: notifBucket, ago: timeAgoShort,
    seen: notifSeen, setSeen: setNotifSeen, unread: unreadCount,
    inject(items) { LIVE.notifications = items; }
  };

  /* ---- notifications dropdown (the bell) --------------------------------- */
  let notifPopEl = null;
  function notifPopContent() {
    if (!isLive()) return `<div class="notif-pop__head">Notifications</div><div class="act-list"><p class="muted" style="font-size:13px;padding:12px;line-height:1.6">Notifications appear here once the site is connected. Most are off by default.</p></div>`;
    if (!WispDB.signedIn) return `<div class="notif-pop__head">Notifications</div><div class="act-list"><p class="muted" style="font-size:13px;padding:12px;line-height:1.6">Sign in to see new chapters, comments, and followers.</p></div>`;
    return `<div class="notif-pop__head">Notifications</div>${activityHTML()}`;
  }
  function notifOutside(e) { if (notifPopEl && !notifPopEl.contains(e.target) && !e.target.closest("#notifBtn")) closeNotifPop(); }
  function notifEsc(e) { if (e.key === "Escape") closeNotifPop(); }
  function closeNotifPop() {
    if (notifPopEl) notifPopEl.classList.remove("is-open");
    document.removeEventListener("click", notifOutside, true);
    document.removeEventListener("keydown", notifEsc);
  }
  function renderNotifPop() {
    if (!notifPopEl || !notifPopEl.classList.contains("is-open")) return;
    notifPopEl.innerHTML = notifPopContent();
    // Notification rows navigate through the global click handler; close after.
    notifPopEl.querySelectorAll(".act[data-read], .act[data-work], .act[data-nav-user], .act[data-open-event]").forEach(b => b.addEventListener("click", closeNotifPop));
  }
  function toggleNotifPop() {
    if (!notifPopEl) {
      notifPopEl = document.createElement("div");
      notifPopEl.className = "notif-pop"; notifPopEl.id = "notifPop";
      notifPopEl.setAttribute("role", "dialog"); notifPopEl.setAttribute("aria-label", "Notifications");
      document.body.appendChild(notifPopEl);
    }
    if (notifPopEl.classList.contains("is-open")) { closeNotifPop(); return; }
    const btn = $("#notifBtn"); const r = btn.getBoundingClientRect();
    notifPopEl.style.top = (r.bottom + 8) + "px";
    notifPopEl.style.right = Math.max(8, window.innerWidth - r.right) + "px";
    notifPopEl.classList.add("is-open");
    renderNotifPop();
    // Fetch fresh notifications, then re-render into the open popover.
    if (isLive() && WispDB.signedIn) {
      loadNotifications(true).then(() => { renderNotifPop(); updateNotifBadge(); });
    }
    markNotificationsSeen();
    setTimeout(() => { document.addEventListener("click", notifOutside, true); document.addEventListener("keydown", notifEsc); }, 0);
  }

  let luckyIdx = 0;
  function baseWidgetHTML() {
    if (isLive()) {
      return `
        <div class="widget">
          <div class="widget__label" style="margin-bottom:10px">Lucky</div>
          <p class="muted" style="font-size:12.5px;margin:6px 0 12px">Once there are works to draw from, this picks a random one for you.</p>
          <button class="btn btn--ghost btn--full" data-nav="browse">${icon("shuffle",15)} Browse works</button>
        </div>
        <div class="widget">
          <div class="widget__label">Your week</div>
          ${readingStatsHTML()}
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
  function widgetHTML() { return baseWidgetHTML() + installedWidgetsHTML(); }
  function renderWidgets() {
    const m = $("#widgetMount"); if (m) { m.innerHTML = widgetHTML(); wireMiniWidgets(m); }
    // Keep the open mobile widget sheet in lockstep, so a tap updates what the
    // reader is actually looking at on a phone — not just the hidden desktop rail.
    const sheetBody = $("#railSheetBody");
    if (sheetBody && $("#railSheet") && $("#railSheet").classList.contains("is-open") && /Widgets/.test(sheetBody.textContent || "")) {
      sheetBody.innerHTML = `<h2 class="rail__title" style="margin-bottom:16px">Widgets</h2>${widgetHTML()}`;
      wireMiniWidgets(sheetBody);
    }
  }

  /* ---- Installable mini-widgets: quality-of-life, synced to your account ---- */
  // A shelf of small widgets a reader can add to their widget station: timers,
  // spinners, ambient fun. The station is held in memory, mirrored to localStorage
  // for instant paint and guests, and (when signed in) synced to the account so it
  // follows the reader across devices. It degrades to localStorage-only if the
  // profiles.widgets column has not been migrated yet.
  const MW = { installed: [], state: {} };
  (function mwInitLocal() {
    try { MW.installed = JSON.parse(localStorage.getItem("wisp.widgets.installed") || "[]"); } catch (e) { MW.installed = []; }
    try { MW.state = JSON.parse(localStorage.getItem("wisp.widgets.state") || "{}"); } catch (e) { MW.state = {}; }
    if (!Array.isArray(MW.installed)) MW.installed = [];
    if (!MW.state || typeof MW.state !== "object") MW.state = {};
  })();
  function mwPersistLocal() {
    try { localStorage.setItem("wisp.widgets.installed", JSON.stringify(MW.installed)); } catch (e) {}
    try { localStorage.setItem("wisp.widgets.state", JSON.stringify(MW.state)); } catch (e) {}
  }
  let mwRemoteTimer = null;
  function mwPersistRemote() {
    if (!(window.WispDB && WispDB.enabled && WispDB.signedIn && WispDB.saveWidgets)) return;
    if (mwRemoteTimer) clearTimeout(mwRemoteTimer);
    mwRemoteTimer = setTimeout(() => {
      mwRemoteTimer = null;
      const payload = { installed: MW.installed, state: MW.state };
      if (window.WispCompanion && WispCompanion.getPrefs) payload.companion = WispCompanion.getPrefs();
      try { WispDB.saveWidgets(payload); } catch (e) {}
    }, 700);
  }
  function mwPersist() { mwPersistLocal(); mwPersistRemote(); }
  function mwLoad() { return MW.installed.slice(); }
  function mwSave(ids) { MW.installed = Array.isArray(ids) ? ids.slice() : []; mwPersist(); }
  function mwState(id) { return MW.state[id] || {}; }
  function mwSetState(id, patch) { MW.state[id] = Object.assign({}, MW.state[id], patch); mwPersist(); return MW.state[id]; }

  // On sign-in, pull the account's saved station. The account wins across devices;
  // if it has none yet, seed it from whatever is already on this device.
  let mwSyncedFor = null;
  function mwSyncFromAccount() {
    if (!(window.WispDB && WispDB.enabled && WispDB.signedIn && WispDB.profile)) { mwSyncedFor = null; return; }
    const pid = WispDB.profile.id;
    if (mwSyncedFor === pid) return;
    mwSyncedFor = pid;
    const remote = WispDB.getWidgets ? WispDB.getWidgets() : null;
    const hasWidgets = remote && typeof remote === "object" &&
      ((Array.isArray(remote.installed) && remote.installed.length) || (remote.state && Object.keys(remote.state).length));
    const hasCompanion = remote && typeof remote === "object" && remote.companion && typeof remote.companion === "object";
    if (hasWidgets) {
      MW.installed = Array.isArray(remote.installed) ? remote.installed.slice() : [];
      MW.state = (remote.state && typeof remote.state === "object") ? remote.state : {};
      mwPersistLocal();
      applyAmbientWidgetState();
      renderWidgetsEverywhere();
    }
    // The reading companion (Lucky) rides in the same synced blob.
    if (hasCompanion && window.WispCompanion && WispCompanion.applyPrefs) WispCompanion.applyPrefs(remote.companion);
    if (!hasWidgets && !hasCompanion) mwPersistRemote();   // account empty (or column unmigrated): upload this device's state
  }
  // Reflect ambient toggles (petals, focus mode) after a cross-device sync.
  function applyAmbientWidgetState() {
    const installed = new Set(MW.installed);
    togglePetals(installed.has("petals") && !!(MW.state.petals && MW.state.petals.on));
    document.body.classList.toggle("focus-mode", installed.has("focus") && !!(MW.state.focus && MW.state.focus.on));
    armWaterReminders();
  }

  // ---- Water goal + hourly reminders ---------------------------------------
  // Readers set a daily glasses goal and, if they ask for it, Wisp nudges them
  // about once an hour during waking hours until they reach it. Nudges use the
  // browser's notifications when granted, and fall back to an in-app toast so a
  // reader with notifications off still gets the reminder while the tab is open.
  function waterGoal(s) { const g = s && +s.goal; return g >= 1 && g <= 20 ? g : 8; }
  function requestNotifyPermission() {
    return new Promise(resolve => {
      try {
        if (!("Notification" in window)) return resolve("unsupported");
        if (Notification.permission !== "default") return resolve(Notification.permission);
        const p = Notification.requestPermission(res => resolve(res || Notification.permission));
        if (p && p.then) p.then(res => resolve(res)).catch(() => resolve(Notification.permission));
      } catch (e) { resolve("denied"); }
    });
  }
  function waterNotify() {
    const s = mwState("water"); const today = todayKey();
    const n = s.day === today ? (s.n || 0) : 0;
    const goal = waterGoal(s);
    const left = Math.max(0, goal - n);
    const body = left <= 1 ? "One more glass to reach today's goal." : left + " more glasses to reach today's goal.";
    let shown = false;
    try {
      if (("Notification" in window) && Notification.permission === "granted") {
        const nt = new Notification("Time for a glass of water", { body: body, tag: "wisp-water", renotify: true });
        nt.onclick = function () { try { window.focus(); } catch (e) {} nt.close(); };
        shown = true;
      }
    } catch (e) {}
    if (!shown && document.getElementById("toast")) toast("Time for a glass of water — " + body);
  }
  let waterTimer = null;
  function waterReminderTick() {
    if (!MW.installed || MW.installed.indexOf("water") < 0) return;
    const s = mwState("water");
    if (!s.remind) return;
    const today = todayKey();
    const n = s.day === today ? (s.n || 0) : 0;
    if (n >= waterGoal(s)) return;                         // met for today, rest easy
    const hour = new Date().getHours();
    if (hour < 8 || hour >= 22) return;                    // no overnight pings
    const last = +s.last || 0;
    if (Date.now() - last < 60 * 60 * 1000) return;        // at most one an hour
    mwSetState("water", { last: Date.now() });
    waterNotify();
  }
  function armWaterReminders() {
    if (waterTimer) return;
    // Check every few minutes; the tick itself throttles to one nudge an hour.
    waterTimer = setInterval(waterReminderTick, 4 * 60 * 1000);
    setTimeout(waterReminderTick, 12000);                  // a first check shortly after load
  }
  // A small handle so the reminder logic can be exercised by tests.
  window.WispWater = { tick: waterReminderTick, notify: waterNotify, goal: waterGoal };

  // A few tracking widgets fill themselves in from real reading, so the reader
  // never has to tap +1. Called when a chapter opens in the reader; each chapter
  // counts once per day, and the streak logs itself the first time you read today.
  function notifyReadActivity(chapterKey) {
    const installed = new Set(mwLoad());
    if (!installed.has("chapters-today") && !installed.has("streak")) return;
    const today = todayKey();
    let changed = false;
    if (installed.has("chapters-today")) {
      const s = mwState("chapters-today");
      const seen = (s.day === today && Array.isArray(s.seen)) ? s.seen.slice() : [];
      const base = (s.day === today ? (s.n || 0) : 0);
      if (chapterKey && seen.indexOf(chapterKey) < 0) {
        seen.push(chapterKey);
        mwSetState("chapters-today", { n: base + 1, day: today, seen }); changed = true;
      } else if (s.day !== today) {
        mwSetState("chapters-today", { n: 0, day: today, seen: [] }); changed = true;
      }
    }
    if (installed.has("streak")) {
      const s = mwState("streak");
      if (s.last !== today) {
        const y = new Date(Date.now() - 86400000); const yk = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
        const nc = (s.last === yk ? (s.count || 0) + 1 : 1);
        mwSetState("streak", { count: nc, last: today }); changed = true;
      }
    }
    if (changed) renderWidgets();
  }

  // Reading pace, learned quietly. A read session opens when a chapter opens and
  // closes when the reader leaves it; if it lasted a sensible span, the words
  // divided by the minutes feed a rolling average, so the pace widget fills in on
  // its own with no typing. Idle tabs and skims are filtered out by the bounds.
  let readSession = null;
  function wordCountOf(text) { return String(text || "").trim().split(/\s+/).filter(Boolean).length; }
  function startReadSession(words) {
    finalizeReadSession();
    if (words > 40 && mwLoad().indexOf("wpm") >= 0) readSession = { start: Date.now(), words: words };
  }
  function finalizeReadSession() {
    if (!readSession) return;
    const mins = (Date.now() - readSession.start) / 60000;
    const words = readSession.words; readSession = null;
    if (mins < 0.4 || mins > 40) return;                 // too brief to trust, or an idle tab
    const wpm = Math.round(words / mins);
    if (wpm < 60 || wpm > 1000) return;                  // outside a believable human range
    if (mwLoad().indexOf("wpm") < 0) return;
    const s = mwState("wpm");
    const n = Math.min(s.n || 0, 19);                    // rolling window of the last ~20 reads
    const avg = s.avg ? Math.round((s.avg * n + wpm) / (n + 1)) : wpm;
    mwSetState("wpm", { avg: avg, n: (s.n || 0) + 1 });
    renderWidgets();
  }
  const todayKey = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtDur = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };

  const MW_QUOTES = [
    "Write drunk on the story; edit sober on the page.", "A word after a word after a word is power.",
    "You can always edit a bad page. You can't edit a blank one.", "Start where you are. Use what you have.",
    "The first draft is you telling yourself the story.", "Fill your paper with the breathings of your heart.",
    "There is no greater agony than an untold story inside you.", "Write the book you want to read.",
    "Almost all good writing begins with terrible first efforts.", "Read a thousand books, and your words will flow."
  ];
  const MW_PROMPTS = [
    "Two strangers share the last seat on the last train.", "A letter arrives twenty years late.",
    "The lighthouse keeper writes to no one, every night.", "Your character finds a door that wasn't there yesterday.",
    "A rivalry softens over a shared umbrella.", "The town forgets one person a little more each day.",
    "A god retires and takes a job at a coffee shop.", "The map is accurate, except for one island.",
    "They swap lives for a week and neither wants to swap back.", "The heirloom clock runs backward when someone lies."
  ];
  const MW_FORTUNES = [
    "A plot twist is coming; lean into it.", "The chapter you fear is the one worth writing.",
    "Someone will reread your words tonight.", "A comment will make your whole week.",
    "Rest is part of the craft. Take the afternoon.", "Your next idea is closer than you think.",
    "Kindness returns to you in kudos.", "The muse favours the writer who shows up."
  ];
  const MW_EIGHTBALL = [
    "It is certain.", "Without a doubt.", "Yes, definitely.", "Signs point to yes.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Don't count on it.", "My reply is no.", "Very doubtful."
  ];
  const MW_AFFIRM = [
    "Your voice is worth hearing.", "You are allowed to write badly today.", "Small progress is still progress.",
    "Your story matters to someone.", "You are a writer because you write.", "Finished beats perfect.",
    "One paragraph is a victory.", "You are exactly the right person to tell this."
  ];
  const MW_FACTS = [
    "The longest novel ever published runs over 1.2 million words.", "The word 'fangirl' entered dictionaries in 2016.",
    "Fanfiction predates the internet by centuries.", "Reading fiction measurably boosts empathy.",
    "The average adult reads about 240 words a minute.", "'Serendipity' was coined by a novelist in 1754.",
    "Shakespeare invented over 1,700 words we still use.", "A 'wisp' is a small twist of something, like a story."
  ];

  // A compact spinner widget: a display line and a button that picks a new item.
  function pickerWidget(id, name, icon, blurb, items, btn) {
    return { id, name, icon, blurb, render() {
        return `<p class="mw-out" data-mw-out>${esc(rand(items))}</p>
          <button class="btn btn--ghost btn--full btn--sm" data-mw-roll>${esc(btn)}</button>`;
      }, wire(el) {
        const out = el.querySelector("[data-mw-out]"), b = el.querySelector("[data-mw-roll]");
        b && b.addEventListener("click", () => { out.textContent = rand(items); out.classList.remove("mw-pop"); void out.offsetWidth; out.classList.add("mw-pop"); });
      } };
  }

  // A real die face: pips for a d6, the rolled number on a polygon for a d20.
  function dieFaceSVG(sides, v) {
    if (sides === 6) {
      const P = { 1: [[10, 10]], 2: [[5, 5], [15, 15]], 3: [[5, 5], [10, 10], [15, 15]],
        4: [[5, 5], [15, 5], [5, 15], [15, 15]], 5: [[5, 5], [15, 5], [10, 10], [5, 15], [15, 15]],
        6: [[5, 5], [15, 5], [5, 10], [15, 10], [5, 15], [15, 15]] };
      const pips = (P[v] || P[1]).map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.1" fill="var(--card)"/>`).join("");
      return `<svg viewBox="0 0 20 20" width="56" height="56" aria-label="${v}"><rect x="1" y="1" width="18" height="18" rx="4.5" fill="var(--ink)"/>${pips}</svg>`;
    }
    return `<svg viewBox="0 0 20 20" width="56" height="56" aria-label="${v}"><path d="M10 1.4 18.6 6.3v7.4L10 18.6 1.4 13.7V6.3z" fill="var(--ink)"/><text x="10" y="13.4" text-anchor="middle" font-size="8" font-weight="700" fill="var(--card)" font-family="var(--font-text)">${v}</text></svg>`;
  }
  // A small figure that stretches while the break runs.
  function stretchFigSVG() {
    return `<svg class="mw-fig-svg" viewBox="0 0 60 64" width="72" height="76" fill="none" aria-hidden="true">
      <circle cx="30" cy="12" r="7" fill="var(--rose)"/>
      <rect class="mw-fig-torso" x="26" y="19" width="8" height="22" rx="4" fill="var(--rose-ink)"/>
      <path class="mw-fig-arm mw-fig-arm--l" d="M28 24 L14 34" stroke="var(--rose)" stroke-width="4.5" stroke-linecap="round"/>
      <path class="mw-fig-arm mw-fig-arm--r" d="M32 24 L46 34" stroke="var(--rose)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M27 40 L22 60" stroke="var(--rose-ink)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M33 40 L38 60" stroke="var(--rose-ink)" stroke-width="4.5" stroke-linecap="round"/>
    </svg>`;
  }
  // Backward-compatible readers for the to-do list and sticky notes, which grew
  // richer shapes (checkable items, multiple notes) than their first versions.
  function normalizeTodo(items) {
    if (!Array.isArray(items)) return [];
    return items.map(it => typeof it === "string" ? { text: it, done: false } : { text: (it && it.text) || "", done: !!(it && it.done) });
  }
  function normalizeStickies(s) {
    if (s && Array.isArray(s.notes)) return s.notes.map(n => ({ text: (n && n.text) || "" }));
    if (s && typeof s.text === "string" && s.text) return [{ text: s.text }];
    return [{ text: "" }];
  }

  const MINI_WIDGETS = [
    { id: "clock", name: "Live clock", icon: "clock", blurb: "The current time.", render() { return `<div class="mw-big" data-mw-clock>--:--</div>`; },
      wire(el) { const t = el.querySelector("[data-mw-clock]"); const upd = () => { const d = new Date(); let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; t.textContent = h + ":" + String(d.getMinutes()).padStart(2, "0") + " " + ap; }; upd(); miniInterval(setInterval(upd, 1000)); } },
    { id: "reading-timer", name: "Reading timer", icon: "clock", blurb: "A stopwatch for reading.",
      render() { const s = mwState("reading-timer"); const el = (s.running ? (Date.now() - s.start + (s.acc || 0)) : (s.acc || 0)); return `<div class="mw-big" data-mw-time>${fmtDur(el)}</div><div class="mw-row"><button class="btn btn--ghost btn--sm" data-mw-toggle>${s.running ? "Pause" : "Start"}</button><button class="btn btn--quiet btn--sm" data-mw-reset>Reset</button></div>`; },
      wire(el) { const disp = el.querySelector("[data-mw-time]"); const draw = () => { const s = mwState("reading-timer"); disp.textContent = fmtDur(s.running ? (Date.now() - s.start + (s.acc || 0)) : (s.acc || 0)); };
        el.querySelector("[data-mw-toggle]").addEventListener("click", () => { const s = mwState("reading-timer"); if (s.running) mwSetState("reading-timer", { running: false, acc: (s.acc || 0) + (Date.now() - s.start) }); else mwSetState("reading-timer", { running: true, start: Date.now() }); renderWidgets(); });
        el.querySelector("[data-mw-reset]").addEventListener("click", () => { mwSetState("reading-timer", { running: false, acc: 0, start: 0 }); renderWidgets(); });
        if (mwState("reading-timer").running) miniInterval(setInterval(draw, 500)); } },
    { id: "pomodoro", name: "Pomodoro", icon: "clock", blurb: "25 on, 5 off.",
      render() { const s = mwState("pomodoro"); const left = s.endsAt ? s.endsAt - Date.now() : 25 * 60000; return `<div class="mw-big" data-mw-pom>${fmtDur(left > 0 ? left : 0)}</div><p class="mw-sub" data-mw-pom-ph>${s.phase === "break" ? "Break" : "Focus"}</p><div class="mw-row"><button class="btn btn--ghost btn--sm" data-mw-pom-go>${s.endsAt ? "Stop" : "Start"}</button></div>`; },
      wire(el) { const disp = el.querySelector("[data-mw-pom]"); const ph = el.querySelector("[data-mw-pom-ph]");
        const tick = () => { const s = mwState("pomodoro"); if (!s.endsAt) return; let left = s.endsAt - Date.now(); if (left <= 0) { const nextBreak = s.phase !== "break"; mwSetState("pomodoro", { phase: nextBreak ? "break" : "focus", endsAt: Date.now() + (nextBreak ? 5 : 25) * 60000 }); toast(nextBreak ? "Focus done. Take a 5 minute break." : "Break over. Back to it."); left = mwState("pomodoro").endsAt - Date.now(); } disp.textContent = fmtDur(left); ph.textContent = mwState("pomodoro").phase === "break" ? "Break" : "Focus"; };
        el.querySelector("[data-mw-pom-go]").addEventListener("click", () => { const s = mwState("pomodoro"); if (s.endsAt) mwSetState("pomodoro", { endsAt: 0, phase: "focus" }); else mwSetState("pomodoro", { endsAt: Date.now() + 25 * 60000, phase: "focus" }); renderWidgets(); });
        if (mwState("pomodoro").endsAt) miniInterval(setInterval(tick, 500)); } },
    { id: "word-sprint", name: "Word sprint", icon: "edit", blurb: "A timed writing burst.",
      render() { const s = mwState("word-sprint"); const left = s.endsAt ? s.endsAt - Date.now() : 0; return s.endsAt ? `<div class="mw-big" data-mw-sp>${fmtDur(left > 0 ? left : 0)}</div><div class="mw-row"><button class="btn btn--quiet btn--sm" data-mw-sp-stop>Stop</button></div>` : `<div class="mw-row" data-mw-sp-pick>${[10, 15, 20].map(m => `<button class="btn btn--ghost btn--sm" data-mw-sp="${m}">${m} min</button>`).join("")}</div>`; },
      wire(el) { el.querySelectorAll("[data-mw-sp]").forEach(b => b.addEventListener("click", () => { mwSetState("word-sprint", { endsAt: Date.now() + (+b.dataset.mwSp) * 60000 }); renderWidgets(); }));
        const stop = el.querySelector("[data-mw-sp-stop]"); stop && stop.addEventListener("click", () => { mwSetState("word-sprint", { endsAt: 0 }); renderWidgets(); });
        const disp = el.querySelector("[data-mw-sp]"); if (mwState("word-sprint").endsAt) miniInterval(setInterval(() => { const s = mwState("word-sprint"); const left = s.endsAt - Date.now(); const d = el.querySelector("[data-mw-sp]"); if (left <= 0) { mwSetState("word-sprint", { endsAt: 0 }); toast("Sprint done. Great work."); renderWidgets(); return; } if (d) d.textContent = fmtDur(left); }, 500)); } },
    { id: "streak", name: "Reading streak", icon: "check", blurb: "Days in a row.",
      render() { const s = mwState("streak"); return `<div class="mw-big">${s.count || 0} 🔥</div><p class="mw-sub">${s.last === todayKey() ? "Logged for today" : "Not logged today"}</p><button class="btn btn--ghost btn--full btn--sm" data-mw-streak ${s.last === todayKey() ? "disabled" : ""}>I read today</button>`; },
      wire(el) { const b = el.querySelector("[data-mw-streak]"); b && b.addEventListener("click", () => { const s = mwState("streak"); const y = new Date(Date.now() - 86400000); const yk = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate(); const cont = s.last === yk; const nc = cont ? (s.count || 0) + 1 : 1; mwSetState("streak", { count: nc, last: todayKey() }); if (nc >= 3 && nc % 5 === 0) celebrate(nc + " day streak!", "Keep it going.", "🔥"); else if (!reducedMotion()) confettiBurst(); renderWidgets(); }); } },
    { id: "countdown", name: "Countdown", icon: "clock", blurb: "Days until a date.",
      render() { const s = mwState("countdown"); if (!s.target) return `<p class="mw-sub">No date set yet.</p><button class="btn btn--ghost btn--full btn--sm" data-mw-cd-set>Set a date</button>`; const days = Math.ceil((new Date(s.target).getTime() - Date.now()) / 86400000); return `<div class="mw-big">${days >= 0 ? days : 0}</div><p class="mw-sub">${days > 0 ? "days to " : days === 0 ? "today: " : "since "}${esc(s.label || "your date")}</p><button class="btn btn--quiet btn--full btn--sm" data-mw-cd-set>Change</button>`; },
      wire(el) { const b = el.querySelector("[data-mw-cd-set]"); b && b.addEventListener("click", () => { const t = (window.prompt("Date (YYYY-MM-DD)", mwState("countdown").target || "") || "").trim(); if (!t) return; const label = (window.prompt("What is it? (optional)", mwState("countdown").label || "") || "").trim(); mwSetState("countdown", { target: t, label }); renderWidgets(); }); } },
    pickerWidget("quote", "Quote of the day", "quote", "A writing quote.", MW_QUOTES, "New quote"),
    pickerWidget("prompt", "Writing prompt", "edit", "A story prompt.", MW_PROMPTS, "New prompt"),
    pickerWidget("fortune", "Fortune cookie", "quote", "A tiny fortune.", MW_FORTUNES, "Crack it open"),
    pickerWidget("eightball", "Magic 8-ball", "eye", "Ask a question.", MW_EIGHTBALL, "Ask again"),
    pickerWidget("affirmation", "Affirmation", "heart", "A kind word.", MW_AFFIRM, "Another"),
    pickerWidget("didyouknow", "Did you know", "book", "A book fact.", MW_FACTS, "Tell me more"),
    { id: "fandom-roulette", name: "Fandom roulette", icon: "shuffle", blurb: "A random fandom.",
      render() { const f = rand(FANDOMS); return `<p class="mw-out" data-mw-out>${esc(f)}</p><button class="btn btn--ghost btn--full btn--sm" data-mw-roll>Spin</button>`; },
      wire(el) { const out = el.querySelector("[data-mw-out]"); el.querySelector("[data-mw-roll]").addEventListener("click", () => { const f = rand(FANDOMS); out.textContent = f; out.classList.remove("mw-pop"); void out.offsetWidth; out.classList.add("mw-pop"); }); out.style.cursor = "pointer"; out.addEventListener("click", () => navigate("tag/" + encodeURIComponent(out.textContent))); } },
    { id: "tag-roulette", name: "Tag roulette", icon: "tag", blurb: "A random tag.",
      render() { const t = rand(TAG_SUGGEST); return `<p class="mw-out" data-mw-out>${esc(t)}</p><button class="btn btn--ghost btn--full btn--sm" data-mw-roll>Spin</button>`; },
      wire(el) { const out = el.querySelector("[data-mw-out]"); el.querySelector("[data-mw-roll]").addEventListener("click", () => { const t = rand(TAG_SUGGEST); out.textContent = t; out.classList.remove("mw-pop"); void out.offsetWidth; out.classList.add("mw-pop"); }); out.style.cursor = "pointer"; out.addEventListener("click", () => navigate("tag/" + encodeURIComponent(out.textContent))); } },
    { id: "dice", name: "Dice roller", icon: "die", blurb: "Roll a d6 or a d20.",
      render() { return `<div class="mw-die" data-mw-dieface>${dieFaceSVG(6, 1)}</div><div class="mw-row"><button class="btn btn--ghost btn--sm" data-mw-die="6">Roll d6</button><button class="btn btn--quiet btn--sm" data-mw-die="20">Roll d20</button></div>`; },
      wire(el) {
        const face = el.querySelector("[data-mw-dieface]");
        el.querySelectorAll("[data-mw-die]").forEach(b => b.addEventListener("click", () => {
          const sides = +b.dataset.mwDie;
          face.classList.remove("is-rolling"); void face.offsetWidth; face.classList.add("is-rolling");
          let ticks = 0;
          const iv = setInterval(() => { const v = 1 + Math.floor(Math.random() * sides); face.innerHTML = dieFaceSVG(sides, v); ticks++; if (ticks >= 9) { clearInterval(iv); face.classList.remove("is-rolling"); } }, 65);
          miniInterval(iv);
        }));
      } },
    { id: "coin", name: "Coin flip", icon: "shuffle", blurb: "Heads or tails.",
      render() { return `<div class="mw-big" data-mw-out>?</div><button class="btn btn--ghost btn--full btn--sm" data-mw-roll>Flip</button>`; },
      wire(el) { const out = el.querySelector("[data-mw-out]"); el.querySelector("[data-mw-roll]").addEventListener("click", () => { out.textContent = Math.random() < 0.5 ? "Heads" : "Tails"; out.classList.remove("mw-pop"); void out.offsetWidth; out.classList.add("mw-pop"); }); } },
    { id: "mood", name: "Mood check", icon: "heart", blurb: "Your mood, kept for the week.",
      render() {
        const s = mwState("mood");
        const set = ["😀", "🙂", "😐", "😔", "😠", "😴", "🥰", "🤔"];
        const today = todayKey();
        const hist = (s.history && typeof s.history === "object") ? s.history : {};
        const todayEmoji = hist[today] || (s.day === today ? s.emoji : "");
        // The last seven days ending today, so a reader can see the week at a glance.
        const wdInit = ["S", "M", "T", "W", "T", "F", "S"];
        let week = "";
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          const key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
          const em = hist[key] || (key === today ? todayEmoji : "");
          week += `<span class="mw-mood-day${key === today ? " is-today" : ""}"><span class="mw-mood-emoji${em ? "" : " is-empty"}">${em || "·"}</span><span class="mw-mood-wd">${wdInit[d.getDay()]}</span></span>`;
        }
        return `<div class="mw-moods">${set.map(m => `<button class="mw-mood ${todayEmoji === m ? "is-on" : ""}" data-mw-mood="${m}" aria-label="Set today's mood to ${m}">${m}</button>`).join("")}</div>` +
          `<p class="mw-eyebrow-sm">This week</p><div class="mw-mood-week">${week}</div>`;
      },
      wire(el) {
        el.querySelectorAll("[data-mw-mood]").forEach(b => b.addEventListener("click", () => {
          const s = mwState("mood");
          const today = todayKey();
          const hist = Object.assign({}, (s.history && typeof s.history === "object") ? s.history : {});
          hist[today] = b.dataset.mwMood;
          // Keep about six weeks of history; drop anything older so it never grows.
          const cutoff = Date.now() - 42 * 86400000;
          Object.keys(hist).forEach(k => { const p = k.split("-"); const t = new Date(+p[0], (+p[1]) - 1, +p[2]).getTime(); if (isFinite(t) && t < cutoff) delete hist[k]; });
          mwSetState("mood", { emoji: b.dataset.mwMood, day: today, history: hist });
          renderWidgets();
        }));
      } },
    { id: "sticky", name: "Sticky notes", icon: "edit", blurb: "Notes that stick around.",
      render() { const notes = normalizeStickies(mwState("sticky")); return `<div class="mw-stickies">${notes.map((nt, i) => `<div class="mw-sticky-card"><textarea class="mw-sticky" data-mw-sticky="${i}" placeholder="Jot something...">${esc(nt.text)}</textarea><button class="mw-sticky-del" data-mw-sticky-del="${i}" aria-label="Remove note">&times;</button></div>`).join("")}</div><button class="btn btn--ghost btn--full btn--sm" data-mw-sticky-add>${icon("plus", 13)} New note</button>`; },
      wire(el) {
        const notes = () => normalizeStickies(mwState("sticky"));
        el.querySelectorAll("[data-mw-sticky]").forEach(t => { let tm = null; t.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => { const arr = notes(); const i = +t.dataset.mwSticky; if (arr[i]) { arr[i].text = t.value; mwSetState("sticky", { notes: arr }); } }, 300); }); });
        const add = el.querySelector("[data-mw-sticky-add]"); if (add) add.addEventListener("click", () => { const arr = notes(); arr.push({ text: "" }); mwSetState("sticky", { notes: arr }); renderWidgets(); });
        el.querySelectorAll("[data-mw-sticky-del]").forEach(b => b.addEventListener("click", () => { const arr = notes(); arr.splice(+b.dataset.mwStickyDel, 1); if (!arr.length) arr.push({ text: "" }); mwSetState("sticky", { notes: arr }); renderWidgets(); }));
      } },
    { id: "to-read", name: "To-read list", icon: "bookmark", blurb: "A checkable reading list.",
      render() { const items = normalizeTodo(mwState("to-read").items); return `<ul class="mw-todo">${items.length ? items.map((it, i) => `<li class="${it.done ? "is-done" : ""}"><button class="mw-todo-box" data-mw-tr-toggle="${i}" aria-pressed="${it.done}" aria-label="${it.done ? "Mark not done" : "Mark done"}">${it.done ? icon("check", 12) : ""}</button><span class="mw-todo-txt">${esc(it.text)}</span><button class="mw-li-del" data-mw-tr-del="${i}" aria-label="Remove">&times;</button></li>`).join("") : '<li class="mw-todo-empty">Nothing yet. Add something to read.</li>'}</ul><form class="mw-todo-add" data-mw-tr-form><input type="text" class="mw-todo-in" data-mw-tr-in placeholder="Add a title or note" maxlength="140"><button class="btn btn--ghost btn--sm" type="submit">Add</button></form>`; },
      wire(el) {
        const items = () => normalizeTodo(mwState("to-read").items);
        const form = el.querySelector("[data-mw-tr-form]"), input = el.querySelector("[data-mw-tr-in]");
        if (form) form.addEventListener("submit", (e) => { e.preventDefault(); const v = (input.value || "").trim(); if (!v) return; const arr = items(); arr.push({ text: v, done: false }); mwSetState("to-read", { items: arr }); renderWidgets(); setTimeout(() => { const box = el.closest(".mini-widget") ? el : document; const nx = (box.querySelector ? box : document).querySelector('[data-mw="to-read"] [data-mw-tr-in]'); if (nx) nx.focus(); }, 0); });
        el.querySelectorAll("[data-mw-tr-toggle]").forEach(b => b.addEventListener("click", () => { const arr = items(); const i = +b.dataset.mwTrToggle; if (arr[i]) { arr[i].done = !arr[i].done; mwSetState("to-read", { items: arr }); renderWidgets(); } }));
        el.querySelectorAll("[data-mw-tr-del]").forEach(b => b.addEventListener("click", () => { const arr = items(); arr.splice(+b.dataset.mwTrDel, 1); mwSetState("to-read", { items: arr }); renderWidgets(); }));
      } },
    { id: "water", name: "Water nudge", icon: "check", blurb: "Track water, hourly nudges.",
      render() {
        const s = mwState("water"); const today = todayKey();
        const n = s.day === today ? (s.n || 0) : 0;
        const goal = waterGoal(s);
        const met = n >= goal;
        const pct = Math.min(100, Math.round(n / goal * 100));
        const remind = !!s.remind;
        const dots = Array.from({ length: goal }, (_, i) => `<span class="mw-water-dot${i < n ? " is-full" : ""}"></span>`).join("");
        return `
          <div class="mw-water${met ? " is-met" : ""}">
            <div class="mw-water-head"><span class="mw-water-count">${n}<span class="mw-water-of"> / ${goal}</span></span><span class="mw-water-label">${met ? "goal met 🎉" : "glasses today"}</span></div>
            <div class="mw-water-dots">${dots}</div>
            <div class="mw-water-bar" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${goal}"><span style="width:${pct}%"></span></div>
            <div class="mw-row">
              <button class="btn btn--ghost btn--sm" data-mw-water="1">${icon("water", 13)} Had a glass</button>
              <button class="btn btn--quiet btn--sm" data-mw-water="-1" ${n ? "" : "disabled"}>Undo</button>
            </div>
            <div class="mw-water-cfg">
              <span class="mw-water-goalset">Daily goal <span class="mw-stepper"><button data-mw-water-goal="-1" aria-label="Lower goal">&minus;</button><b>${goal}</b><button data-mw-water-goal="1" aria-label="Raise goal">+</button></span></span>
              <button class="mw-water-remind${remind ? " is-on" : ""}" data-mw-water-remind aria-pressed="${remind}">${icon(remind ? "bell" : "mute", 12)} ${remind ? "Reminders on" : "Remind me hourly"}</button>
            </div>
          </div>`;
      },
      wire(el) {
        el.querySelectorAll("[data-mw-water]").forEach(b => b.addEventListener("click", () => {
          const s = mwState("water"); const today = todayKey();
          const cur = s.day === today ? (s.n || 0) : 0;
          const goal = waterGoal(s);
          const n = Math.max(0, cur + (+b.dataset.mwWater));
          mwSetState("water", { n, day: today });
          if (+b.dataset.mwWater > 0 && cur < goal && n >= goal) celebrate("You hit your water goal", "That's " + goal + " glasses today. Nicely done.", "💧");
          renderWidgets();
        }));
        el.querySelectorAll("[data-mw-water-goal]").forEach(b => b.addEventListener("click", () => {
          const s = mwState("water");
          const goal = Math.max(1, Math.min(20, waterGoal(s) + (+b.dataset.mwWaterGoal)));
          mwSetState("water", { goal }); renderWidgets();
        }));
        const rb = el.querySelector("[data-mw-water-remind]");
        if (rb) rb.addEventListener("click", () => {
          const s = mwState("water");
          const turningOn = !s.remind;
          // Flip the preference right away; ask for notification permission in the
          // background so the toggle never waits on the browser prompt. In-app
          // toast nudges still work even if the reader declines notifications.
          mwSetState("water", { remind: turningOn, last: turningOn ? Date.now() : (s.last || 0) });
          if (turningOn) { armWaterReminders(); requestNotifyPermission().catch(() => {}); }
          renderWidgets();
          toast(turningOn ? "I'll nudge you about once an hour until you reach your goal." : "Water reminders off.");
        });
      } },
    { id: "stretch", name: "Stretch break", icon: "leaf", blurb: "A guided little stretch.",
      render() { return `<div class="mw-stretch" data-mw-stretch><div class="mw-fig" data-mw-fig>${stretchFigSVG()}</div><p class="mw-sub" data-mw-stretch-txt>Been reading a while? Take twenty seconds.</p><button class="btn btn--ghost btn--full btn--sm" data-mw-stretch-go>Stretch with me</button></div>`; },
      wire(el) {
        const wrap = el.querySelector("[data-mw-stretch]"), fig = el.querySelector("[data-mw-fig]"), txt = el.querySelector("[data-mw-stretch-txt]"), go = el.querySelector("[data-mw-stretch-go]");
        const steps = [["Reach up, tall as you can", "up", 5000], ["Ease over to the left", "left", 4000], ["and over to the right", "right", 4000], ["Roll your shoulders back", "roll", 4000], ["Look far past the screen", "gaze", 3500]];
        go.addEventListener("click", () => {
          if (wrap.classList.contains("is-stretching")) return;
          wrap.classList.add("is-stretching"); go.disabled = true;
          let i = 0;
          const run = () => {
            if (i >= steps.length) { wrap.classList.remove("is-stretching"); fig.removeAttribute("data-pose"); txt.textContent = "Nice. Your shoulders thank you."; go.disabled = false; return; }
            const s = steps[i]; txt.textContent = s[0]; fig.setAttribute("data-pose", s[1]); i++;
            const t = setTimeout(run, s[2]); miniCleanup(() => clearTimeout(t));
          };
          run();
        });
      } },
    { id: "breathing", name: "Breathing", icon: "heart", blurb: "A 4-7-8 breathing circle.",
      render() { return `<div class="mw-breathe" data-mw-breathe><span class="mw-breathe__dot"></span><span class="mw-breathe__txt">Tap to begin</span></div>`; },
      wire(el) { const box = el.querySelector("[data-mw-breathe]"); const txt = box.querySelector(".mw-breathe__txt"); let on = false, ph = 0; const phases = [["Breathe in", 4000, "in"], ["Hold", 7000, "hold"], ["Breathe out", 8000, "out"]]; let tm = null; const step = () => { const [label, ms, cls] = phases[ph % 3]; txt.textContent = label; box.classList.remove("is-in", "is-hold", "is-out"); box.classList.add("is-" + cls); ph++; tm = setTimeout(step, ms); }; box.addEventListener("click", () => { on = !on; if (on) { ph = 0; step(); } else { clearTimeout(tm); box.classList.remove("is-in", "is-hold", "is-out"); txt.textContent = "Tap to begin"; } }); miniCleanup(() => clearTimeout(tm)); } },
    { id: "cat", name: "Lucky the cat", icon: "paw", blurb: "A cat who strolls the page.",
      render() { const sum = (window.WispCompanion && WispCompanion.summary) ? WispCompanion.summary() : "Your reading companion."; return `<p class="mw-sub" data-mw-cat-sum>${esc(sum)}</p><div class="mw-row"><button class="btn btn--ghost btn--sm" data-mw-cat-customize>Customize</button><button class="btn btn--quiet btn--sm" data-mw-cat-stroll>Take a stroll</button></div>`; },
      wire(el) {
        const cz = el.querySelector("[data-mw-cat-customize]"); if (cz) cz.addEventListener("click", () => { if (window.WispCompanion) WispCompanion.openSettings(); });
        const st = el.querySelector("[data-mw-cat-stroll]"); if (st) st.addEventListener("click", () => { if (window.WispCompanion) WispCompanion.stroll(); });
      } },
    { id: "confetti", name: "Confetti", icon: "party", blurb: "A burst of confetti.",
      render() { return `<p class="mw-sub">Finished a chapter? Give yourself a moment.</p><button class="btn btn--ghost btn--full btn--sm" data-mw-conf>Celebrate</button>`; },
      wire(el) { el.querySelector("[data-mw-conf]").addEventListener("click", confettiBurst); } },
    { id: "petals", name: "Falling petals", icon: "leaf", blurb: "Petals drifting down.",
      render() { const on = !!mwState("petals").on; return `<p class="mw-sub">A quiet, drifting backdrop.</p><button class="btn ${on ? "btn--primary" : "btn--ghost"} btn--full btn--sm" data-mw-petals>${on ? "Turn off" : "Turn on"}</button>`; },
      wire(el) { el.querySelector("[data-mw-petals]").addEventListener("click", () => { const on = !mwState("petals").on; mwSetState("petals", { on }); togglePetals(on); renderWidgets(); }); } },
    { id: "focus", name: "Focus mode", icon: "book", blurb: "Everything but the page, dimmed.",
      render() { const on = !!mwState("focus").on; return `<p class="mw-sub">Quiets everything but the page.</p><button class="btn ${on ? "btn--primary" : "btn--ghost"} btn--full btn--sm" data-mw-focus>${on ? "Turn off" : "Turn on"}</button>`; },
      wire(el) { el.querySelector("[data-mw-focus]").addEventListener("click", () => { const on = !mwState("focus").on; mwSetState("focus", { on }); document.body.classList.toggle("focus-mode", on); renderWidgets(); }); } },
    { id: "accent", name: "Accent shuffler", icon: "palette", blurb: "A new accent color.",
      render() { return `<p class="mw-sub">Current accent: <b>${esc(settings.accent || "default")}</b></p><button class="btn btn--ghost btn--full btn--sm" data-mw-accent>Shuffle</button>`; },
      wire(el) { el.querySelector("[data-mw-accent]").addEventListener("click", () => { const ids = ACCENTS.map(a => a.id).filter(x => x !== settings.accent); settings.accent = rand(ids); applySettings(); renderWidgets(); }); } },
    { id: "wpm", name: "Reading pace", icon: "clock", blurb: "Learned as you read.",
      render() { const s = mwState("wpm"); return s.avg ? `<div class="mw-big">${s.avg}</div><p class="mw-sub">words per minute${s.n ? " · from " + s.n + " " + (s.n === 1 ? "read" : "reads") : ""}</p>` : `<p class="mw-sub">Read a chapter or two and I'll learn your pace on my own. No typing.</p>`; },
      wire() {} },
    { id: "chapters-today", name: "Chapters today", icon: "book", blurb: "Counts as you read.",
      render() {
        const s = mwState("chapters-today");
        const n = s.day === todayKey() ? (s.n || 0) : 0;
        return n
          ? `<div class="mw-big">${n}</div><p class="mw-sub">${n === 1 ? "chapter" : "chapters"} read today · counted for you</p>`
          : `<p class="mw-sub">Open a chapter and it counts here on its own. No tapping needed.</p>`;
      },
      wire() {} },
    { id: "gratitude", name: "Gratitude line", icon: "heart", blurb: "One good thing today.",
      render() { const s = mwState("gratitude"); return s.day === todayKey() && s.text ? `<p class="mw-out">${esc(s.text)}</p><button class="btn btn--quiet btn--full btn--sm" data-mw-grat>Change</button>` : `<button class="btn btn--ghost btn--full btn--sm" data-mw-grat>Add one good thing</button>`; },
      wire(el) { el.querySelector("[data-mw-grat]").addEventListener("click", () => { const v = (window.prompt("One good thing today") || "").trim(); if (!v) return; mwSetState("gratitude", { text: v, day: todayKey() }); renderWidgets(); }); } },
    { id: "spinner", name: "Yes or no", icon: "shuffle", blurb: "Yes, no, or maybe.",
      render() { return `<div class="mw-big" data-mw-out>?</div><button class="btn btn--ghost btn--full btn--sm" data-mw-roll>Decide</button>`; },
      wire(el) { const out = el.querySelector("[data-mw-out]"); el.querySelector("[data-mw-roll]").addEventListener("click", () => { out.textContent = rand(["Yes", "No", "Maybe", "Later", "Go for it", "Not now"]); out.classList.remove("mw-pop"); void out.offsetWidth; out.classList.add("mw-pop"); }); } }
  ];

  // Timer/interval bookkeeping so re-renders never leak or double up.
  let miniIntervals = [], miniCleanups = [];
  function miniInterval(id) { miniIntervals.push(id); }
  function miniCleanup(fn) { miniCleanups.push(fn); }
  function clearMiniTimers() { miniIntervals.forEach(clearInterval); miniIntervals = []; miniCleanups.forEach(fn => { try { fn(); } catch (e) {} }); miniCleanups = []; }

  function installedWidgetsHTML() {
    const ids = mwLoad();
    const cards = ids.map(id => {
      const def = MINI_WIDGETS.find(w => w.id === id); if (!def) return "";
      return `<div class="widget mini-widget" data-mw="${esc(id)}">
        <div class="widget__label mw-head"><span>${icon(def.icon || "book", 13)} ${esc(def.name)}</span><button class="mw-remove" data-mw-remove="${esc(id)}" aria-label="Remove ${esc(def.name)}">&times;</button></div>
        <div class="mw-body">${def.render()}</div>
      </div>`;
    }).join("");
    return cards + `<button class="widget mw-add" data-mw-open>${icon("plus", 15)} Add widgets</button>`;
  }
  function wireMiniWidgets(root) {
    clearMiniTimers();
    const scope = root || document;
    scope.querySelectorAll(".mini-widget").forEach(card => {
      const id = card.dataset.mw; const def = MINI_WIDGETS.find(w => w.id === id);
      const body = card.querySelector(".mw-body");
      if (def && def.wire && body) { try { def.wire(body); } catch (e) {} }
    });
    scope.querySelectorAll("[data-mw-remove]").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); const id = b.dataset.mwRemove; mwSave(mwLoad().filter(x => x !== id)); renderWidgetsEverywhere(); }));
    scope.querySelectorAll("[data-mw-open]").forEach(b => b.addEventListener("click", openWidgetPicker));
  }
  // Both the desktop rail and the open mobile sheet reflect an install change.
  // renderWidgets now refreshes both surfaces, so this is a thin alias kept for
  // the install/remove call sites.
  function renderWidgetsEverywhere() { renderWidgets(); }
  function openWidgetPicker() {
    const installed = new Set(mwLoad());
    const rows = MINI_WIDGETS.map(def => `<button class="mw-pick-row ${installed.has(def.id) ? "is-in" : ""}" data-mw-pick="${esc(def.id)}">
      <span class="mw-pick-ic">${icon(def.icon || "book", 16)}</span>
      <span class="mw-pick-txt"><span class="mw-pick-name">${esc(def.name)}</span><span class="mw-pick-blurb">${esc(def.blurb)}</span></span>
      <span class="mw-pick-act">${installed.has(def.id) ? icon("check", 15) + " Added" : icon("plus", 15) + " Add"}</span>
    </button>`).join("");
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Add widgets</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin:0 0 14px">Little extras for your widget station. Signed in, they follow you across devices. Tap to add or remove.</p>
      <div class="mw-pick-list">${rows}</div>
      <div class="modal-actions" style="margin-top:16px"><button class="btn btn--primary" data-modal-cancel>Done</button></div>`, "Add widgets");
    $$("#modalCard [data-mw-pick]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.mwPick; const ids = mwLoad();
      if (ids.includes(id)) { mwSave(ids.filter(x => x !== id)); if (id === "petals") togglePetals(false); if (id === "focus") document.body.classList.remove("focus-mode"); }
      else mwSave(ids.concat([id]));
      const nowIn = mwLoad().includes(id);
      b.classList.toggle("is-in", nowIn);
      b.querySelector(".mw-pick-act").innerHTML = nowIn ? icon("check", 15) + " Added" : icon("plus", 15) + " Add";
      renderWidgetsEverywhere();
    }));
  }

  // ---- page-level effects for the fun widgets ----
  // These fun effects are driven by the Web Animations API rather than CSS
  // @keyframes on purpose: iOS Low Power Mode (and the OS Reduce Motion setting)
  // set prefers-reduced-motion, and the global reduced-motion CSS rule collapses
  // every animation to ~0ms. A reader who deliberately taps "Here, kitty" or turns
  // petals on should still see them, so we animate in JS, which that rule can't reach.
  function catWalk() {
    const c = document.createElement("div"); c.className = "mw-catrun"; c.textContent = "🐈";
    document.body.appendChild(c);
    const done = () => { if (c.parentNode) c.remove(); };
    try {
      const a = c.animate([
        { left: "-60px", transform: "translateY(0)" },
        { transform: "translateY(-6px)", offset: 0.49 },
        { transform: "translateY(0)", offset: 0.5 },
        { left: "106%", transform: "translateY(0)" }
      ], { duration: 8000, easing: "linear", fill: "forwards" });
      a.addEventListener("finish", done);
    } catch (e) { c.style.left = "50%"; }   // no WAA: at least show the cat briefly
    setTimeout(done, 9000);
  }
  // A celebratory burst from the center of the screen: pieces shoot outward in all
  // directions, then fall away. (Center, not raining from the top edge.)
  function confettiBurst() {
    const box = document.createElement("div"); box.className = "mw-confetti";
    const colors = ["#ab5a67", "#7d5a86", "#4f8079", "#b1673f", "#5f6bb0", "#d9a7a0"];
    const N = 34;
    for (let i = 0; i < N; i++) { const p = document.createElement("i"); p.style.left = "50%"; p.style.top = "50%"; p.style.background = colors[i % colors.length]; box.appendChild(p); }
    document.body.appendChild(box);
    const reach = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    box.querySelectorAll("i").forEach((p, i) => {
      const ang = (i / N) * Math.PI * 2 + Math.random() * 0.5;
      const dist = reach * (0.55 + Math.random() * 0.6);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.floor(Math.random() * 360));
      try {
        p.animate([
          { transform: "translate(-50%, -50%) rotate(0)", opacity: 1, offset: 0 },
          { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7}px)) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 90}px)) rotate(${spin}deg)`, opacity: 0, offset: 1 }
        ], { duration: 1300 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
      } catch (e) {}
    });
    setTimeout(() => box.remove(), 2200);
  }
  // A brief, gentle chime built with the Web Audio API (no sound files). Muted
  // by the sound preference or reduced-motion; needs a user gesture to start.
  let audioCtx = null;
  function soundOn() { try { return localStorage.getItem("wisp.sound") !== "off"; } catch (e) { return true; } }
  function reducedMotion() { return !!(settings && settings.motion) || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function playChime() {
    if (!soundOn() || reducedMotion()) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "sine"; o.frequency.value = f;
        const t = now + i * 0.1;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(t); o.stop(t + 0.32);
      });
    } catch (e) {}
  }
  // A small, brief celebration: a pop-in card, confetti, and the chime. It does
  // not take over the screen and fades on its own.
  function celebrate(title, sub, emoji) {
    if (!reducedMotion()) confettiBurst();
    playChime();
    const el = document.createElement("div");
    el.className = "celebrate";
    el.innerHTML = `<div class="celebrate__card"><div class="celebrate__emoji">${emoji || "🎉"}</div><div class="celebrate__title">${esc(title || "Nice!")}</div>${sub ? `<div class="celebrate__sub">${esc(sub)}</div>` : ""}</div>`;
    document.body.appendChild(el);
    const close = () => { el.classList.remove("is-on"); setTimeout(() => el.remove(), 320); };
    setTimeout(() => el.classList.add("is-on"), 10);
    setTimeout(close, 1900);
    el.addEventListener("click", close);
  }
  // A big heart that pops in the center and fades, the way a double-tap does.
  function bigHeart() {
    if (reducedMotion()) return;
    const h = document.createElement("div"); h.className = "mw-bigheart"; h.textContent = "❤";
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 820);
  }
  // A small shower of hearts floating up from a button, for hearting a work.
  function heartBurst(el) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const box = document.createElement("div"); box.className = "mw-hearts";
    for (let i = 0; i < 8; i++) {
      const h = document.createElement("i"); h.textContent = "❤";
      h.style.left = (r.left + r.width / 2) + "px"; h.style.top = (r.top + r.height / 2) + "px";
      h.style.setProperty("--dx", (Math.random() * 70 - 35).toFixed(0) + "px");
      h.style.setProperty("--dy", (-40 - Math.random() * 50).toFixed(0) + "px");
      h.style.animationDelay = (Math.random() * 0.1).toFixed(2) + "s";
      box.appendChild(h);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 1100);
  }
  let petalTimer = null;
  function togglePetals(on) {
    let layer = $("#mwPetals");
    if (!on) { if (petalTimer) { clearInterval(petalTimer); petalTimer = null; } if (layer) layer.remove(); return; }
    if (!layer) { layer = document.createElement("div"); layer.id = "mwPetals"; layer.className = "mw-petals"; document.body.appendChild(layer); }
    if (petalTimer) return;
    petalTimer = setInterval(() => {
      if (!document.getElementById("mwPetals")) { clearInterval(petalTimer); petalTimer = null; return; }
      const p = document.createElement("i"); p.textContent = "🌸"; p.style.left = Math.random() * 100 + "%"; p.style.fontSize = (10 + Math.random() * 10) + "px";
      layer.appendChild(p);
      const dur = 6000 + Math.random() * 5000;
      try {
        p.animate([
          { transform: "translateY(-26px) translateX(0) rotate(0)", opacity: 0 },
          { opacity: 0.9, offset: 0.12 },
          { transform: "translateY(102vh) translateX(40px) rotate(220deg)", opacity: 0.5 }
        ], { duration: dur, easing: "linear", fill: "forwards" });
      } catch (e) {}
      setTimeout(() => p.remove(), dur + 500);
    }, 900);
  }
  // Restore ambient effects the reader left on, once per load.
  function restoreMiniEffects() {
    if (mwState("petals").on) togglePetals(true);
    if (mwState("focus").on) document.body.classList.add("focus-mode");
  }

  // The "Your week" widget, from real reading progress. Only counts we can
  // actually derive: no invented word totals.
  function readingStatsHTML() {
    if (!WispDB.signedIn) {
      return `<div style="font:15px/1.5 var(--font-read);color:var(--ink2)">Sign in, and your reading shows up here.</div>`;
    }
    const s = LIVE.readingStats;
    if (s === null) {
      return `<div style="font:15px/1.5 var(--font-read);color:var(--ink2)">Reading stats show up here as you read.</div>`;
    }
    if (!s.total) {
      return `<div style="font:15px/1.5 var(--font-read);color:var(--ink2)">Open a work and your reading life starts filling in here.</div>`;
    }
    const max = Math.max(s.thisWeek, s.inProgress, s.total, 1);
    const line = (n, label) => `<div class="rstat">
      <div class="rstat__row"><span class="rstat__n">${n}</span><span class="rstat__l">${label}</span></div>
      <span class="rstat__bar"><i style="width:${Math.max(4, Math.round(100 * n / max))}%"></i></span>
    </div>`;
    return `<div class="rstats">
      ${line(s.thisWeek, s.thisWeek === 1 ? "work this week" : "works this week")}
      ${line(s.inProgress, s.inProgress === 1 ? "work in progress" : "works in progress")}
      ${line(s.total, s.total === 1 ? "work in your history" : "works in your history")}
    </div>`;
  }
  async function loadReadingStats(force) {
    if (!isLive() || !WispDB.signedIn) { LIVE.readingStats = null; return; }
    if (LIVE.readingStats !== null && !force) return;
    try { LIVE.readingStats = await WispDB.readingStats(); }
    catch (e) { LIVE.readingStats = LIVE.readingStats || { total: 0, thisWeek: 0, inProgress: 0 }; }
    renderWidgets();
  }
  // Small handle so the stats renderer can be exercised by tests.
  window.WispStats = { html: readingStatsHTML, inject(s) { LIVE.readingStats = s; } };

  /* ======================================================================= */
  /*  THEME ENGINE  ·  the accessibility engine too                          */
  /* ======================================================================= */
  const PRESETS = [
    { id:"cream",    name:"Warm cream",    chips:["#f4efe4","#ab5a67","#2c2620"] },
    { id:"sepia",    name:"Soft sepia",    chips:["#ecdfc4","#a5545f","#4a3b28"] },
    { id:"blush",    name:"Blush pink",    chips:["#f6ecee","#b0536a","#332428"] },
    { id:"sage",     name:"Sage green",    chips:["#e9eee4","#a05a63","#262c22"] },
    { id:"sky",      name:"Sky blue",      chips:["#e6ecf2","#9a5568","#212832"] },
    { id:"lavender", name:"Soft lavender", chips:["#ece9f3","#8d5586","#2a2433"] },
    { id:"slate",    name:"Cool grey",     chips:["#e8eaee","#9c5566","#23262c"] },
    { id:"midnight", name:"Soft dark",     chips:["#26242d","#d98a99","#ece7f0"] },
    { id:"forest",   name:"Forest night",  chips:["#1f2821","#d38a97","#e7efe6"] },
    { id:"ocean",    name:"Deep ocean",    chips:["#1c2230","#d98a99","#e6eaf2"] },
    { id:"oled",     name:"True black",    chips:["#000000","#e0919f","#f1eef4"] },
    { id:"contrast", name:"High contrast", chips:["#ffffff","#99303f","#131313"] }
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
    const themeColor = { cream:"#f4efe4", sepia:"#ecdfc4", blush:"#f6ecee", sage:"#e9eee4", sky:"#e6ecf2", lavender:"#ece9f3", slate:"#e8eaee", midnight:"#211f26", forest:"#1a221c", ocean:"#181d29", oled:"#000000", contrast:"#ffffff" }[settings.theme];
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = themeColor;
    // reflect prose justify on any open reader
    $$(".prose").forEach(p => { p.dataset.justify = settings.justify ? "on" : "off"; p.dataset.hyphen = settings.justify ? "on" : "off"; });
    applyTypography();
    save();
    syncDrawer();
    syncSafeMode();
  }

  // Safe mode gates explicit (E-rated) works behind an age check. It is ON when
  // the reader has not unlocked adult content (settings.adultOK is false).
  function syncSafeMode() {
    const on = !settings.adultOK;
    const label = $("#safeModeLabel"), flag = $("#safeModeFlag"), opt = $("#optSafe");
    if (label) label.textContent = on ? "Safe mode on" : "Safe mode off";
    if (flag) { flag.setAttribute("aria-pressed", String(on)); flag.classList.toggle("mode-flag--off", !on); }
    if (opt) opt.checked = on;
  }
  function toggleSafeMode() {
    if (settings.adultOK) {                       // currently off: turn it back on, no confirm needed
      settings.adultOK = false; save(); syncSafeMode();
      toast("Safe mode on. Explicit works ask for age confirmation.");
    } else {                                       // currently on: turning off unlocks adult content
      confirmDialog({ title: "Turn safe mode off?", body: "Explicit works will open without an age check. Only do this if you are 18 or older.", confirmText: "I'm 18 or older" },
        () => { settings.adultOK = true; save(); syncSafeMode(); toast("Safe mode off."); });
    }
  }

  // Push the reader's chosen per-role fonts, sizes, and colours onto :root as
  // CSS variables. The reader stylesheet reads them, falling back to the design
  // defaults when a value is unset (empty colour = inherit; body size 0 = slider).
  function applyTypography() {
    const r = document.documentElement;
    const t = settings.typography || typographyDefaults();
    TYPE_ROLES.forEach(role => {
      const v = t[role.id] || {};
      if (role.id === "body") {
        // "auto" follows the reading-face toggle; a chosen font overrides it.
        const chosen = v.font && v.font !== "auto" && TYPE_FONT_MAP[v.font];
        r.style.setProperty("--ty-body-font", chosen ? TYPE_FONT_MAP[v.font] : "var(--font-read)");
        r.style.setProperty("--ty-body-size", (v.size && +v.size > 0) ? (+v.size + "px") : "var(--read-size)");
      } else {
        r.style.setProperty("--ty-" + role.id + "-font", TYPE_FONT_MAP[v.font] || TYPE_FONT_MAP[role.font]);
        r.style.setProperty("--ty-" + role.id + "-size", (+v.size || role.size) + "px");
      }
      r.style.setProperty("--ty-" + role.id + "-color", v.color || "");
    });
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
    set("#optSound", soundOn());
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
    const safeOpt = $("#optSafe");
    safeOpt && safeOpt.addEventListener("change", e => {
      if (e.target.checked) { settings.adultOK = false; save(); syncSafeMode(); toast("Safe mode on."); }
      else { e.target.checked = true; toggleSafeMode(); }   // revert until the age confirm passes
    });
    $("#optDyslexia").addEventListener("change", e => { settings.dyslexia = e.target.checked; applySettings(); });
    $("#optMotion").addEventListener("change", e => { settings.motion = e.target.checked; applySettings(); });
    { const os = $("#optSound"); if (os) os.addEventListener("change", e => { try { localStorage.setItem("wisp.sound", e.target.checked ? "on" : "off"); } catch (_) {} if (e.target.checked) playChime(); }); }
    $("#optJustify").addEventListener("change", e => { settings.justify = e.target.checked; applySettings(); });
    $("#optMargins").addEventListener("change", e => { settings.margins = e.target.checked; applySettings(); });
    $("#resetTheme").addEventListener("click", () => { settings = Object.assign({}, DEFAULTS, { adultOK: settings.adultOK, typography: typographyDefaults() }); applySettings(); buildTypographyPanel(); toast("Reset to defaults."); });
    buildTypographyPanel();
    const rt = $("#resetTypography");
    rt && rt.addEventListener("click", () => { settings.typography = typographyDefaults(); applyTypography(); save(); buildTypographyPanel(); toast("Typography reset to defaults."); });
  }

  function inkHex() {
    const c = (getComputedStyle(document.documentElement).getPropertyValue("--ink") || "").trim();
    return /^#[0-9a-f]{3,8}$/i.test(c) ? c : "#2b2530";
  }
  function buildTypographyPanel() {
    const panel = $("#typographyPanel"); if (!panel) return;
    const t = settings.typography || typographyDefaults();
    const ink = inkHex();
    const fontOpts = (sel) => TYPE_FONTS.map(f => `<option value="${f.id}"${f.id === sel ? " selected" : ""}>${esc(f.name)}</option>`).join("");
    panel.innerHTML = `<div class="ty-grid">
      <div class="ty-head"><span>Style</span><span>Font</span><span>Size</span><span>Colour</span></div>
      ${TYPE_ROLES.map(role => {
        const v = t[role.id] || {};
        const sizeVal = role.id === "body" ? (v.size && +v.size > 0 ? v.size : "") : (+v.size || role.size);
        const hasColor = !!v.color;
        const selFont = v.font || role.font;
        const autoOpt = role.id === "body" ? `<option value="auto"${selFont === "auto" ? " selected" : ""}>Auto (reading face)</option>` : "";
        return `<div class="ty-row">
          <span class="ty-name" data-ty-prev="${role.id}">${esc(role.label)}</span>
          <select class="ty-font" data-ty="${role.id}" aria-label="${esc(role.label)} font">${autoOpt}${fontOpts(selFont)}</select>
          <input class="ty-size" type="number" min="10" max="72" step="1" data-ty-size="${role.id}" value="${esc(String(sizeVal))}"${role.id === "body" ? ' placeholder="Auto"' : ""} aria-label="${esc(role.label)} size">
          <span class="ty-color-wrap">
            <input class="ty-color" type="color" data-ty-color="${role.id}" value="${esc(v.color || ink)}" aria-label="${esc(role.label)} colour">
            <button type="button" class="ty-color-clear" data-ty-color-clear="${role.id}" title="Reset colour" aria-label="Reset ${esc(role.label)} colour"${hasColor ? "" : " hidden"}>&times;</button>
          </span>
        </div>`;
      }).join("")}
    </div>`;
    panel.querySelectorAll("[data-ty]").forEach(sel => sel.addEventListener("change", () => setTy(sel.dataset.ty, "font", sel.value)));
    panel.querySelectorAll("[data-ty-size]").forEach(inp => inp.addEventListener("input", () => setTy(inp.dataset.tySize, "size", inp.value === "" ? 0 : +inp.value)));
    panel.querySelectorAll("[data-ty-color]").forEach(inp => inp.addEventListener("input", () => {
      setTy(inp.dataset.tyColor, "color", inp.value);
      const btn = panel.querySelector('[data-ty-color-clear="' + inp.dataset.tyColor + '"]'); if (btn) btn.hidden = false;
    }));
    panel.querySelectorAll("[data-ty-color-clear]").forEach(btn => btn.addEventListener("click", () => {
      const id = btn.dataset.tyColorClear; setTy(id, "color", "");
      const inp = panel.querySelector('[data-ty-color="' + id + '"]'); if (inp) inp.value = inkHex();
      btn.hidden = true;
    }));
    syncTypographyPreview();
  }
  function setTy(roleId, key, val) {
    if (!settings.typography) settings.typography = typographyDefaults();
    if (!settings.typography[roleId]) settings.typography[roleId] = {};
    settings.typography[roleId][key] = val;
    applyTypography(); save(); syncTypographyPreview();
  }
  function syncTypographyPreview() {
    const panel = $("#typographyPanel"); if (!panel) return;
    const t = settings.typography || typographyDefaults();
    TYPE_ROLES.forEach(role => {
      const v = t[role.id] || {}; const prev = panel.querySelector('[data-ty-prev="' + role.id + '"]'); if (!prev) return;
      const chosen = v.font && v.font !== "auto" && TYPE_FONT_MAP[v.font];
      prev.style.fontFamily = chosen ? TYPE_FONT_MAP[v.font] : (role.id === "body" ? "var(--font-read)" : TYPE_FONT_MAP[role.font]);
      prev.style.color = v.color || "";
    });
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

  // The "Muted and blocked" panel: shows what the reader has muted or blocked,
  // each removable in one tap. Mute and block are stored on the device.
  function syncMuteBlock() {
    const el = $("#muteBlockSection");
    if (!el) return;
    const muted = Array.from(userState.mutedTags);
    const blocked = Array.from(userState.blockedUsers);
    if (!muted.length && !blocked.length) {
      el.innerHTML = `<p class="muted" style="font-size:13px;margin:2px 0 0;line-height:1.6">Nothing muted or blocked. Mute a tag or block an author from the menu on any work, and it shows up here to undo.</p>`;
      return;
    }
    const chips = (items, kind) => items.map(x =>
      `<button class="mb-chip" data-unmb="${kind}:${esc(x)}" aria-label="Remove ${esc(x)}">${esc(x)} <span aria-hidden="true">&times;</span></button>`).join("");
    el.innerHTML =
      (muted.length ? `<div class="mb-group"><div class="mb-label">Muted tags</div><div class="mb-chips">${chips(muted, "mute")}</div></div>` : "") +
      (blocked.length ? `<div class="mb-group"><div class="mb-label">Blocked people</div><div class="mb-chips">${chips(blocked, "block")}</div></div>` : "");
    el.querySelectorAll("[data-unmb]").forEach(b => b.addEventListener("click", () => {
      const raw = b.dataset.unmb; const ci = raw.indexOf(":");
      const kind = raw.slice(0, ci), val = raw.slice(ci + 1);
      if (kind === "mute") { userState.mutedTags.delete(val); toast("Unmuted " + val + "."); }
      else { userState.blockedUsers.delete(val); toast("Unblocked " + val + "."); }
      persistPrefs();
      syncMuteBlock();
      if (currentScreen === "browse") refreshBrowse();
    }));
  }
  function openTheme() { syncDrawer(); syncMuteBlock(); openOverlay($("#themeScrim"), "#themeClose"); }
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
          <p style="font-size:13.5px;color:var(--ink3)">We remember your choice so this stops appearing.</p>
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
    // Leaving the reader stops any read-aloud and auto-scroll in progress.
    if (currentScreen === "reading" && screen !== "reading") {
      if (window.speechSynthesis) { window.speechSynthesis.cancel(); speaking = false; }
      stopAutoScroll();
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
      // The database applies the text search, type, rating, and sort across the
      // whole catalog; tag include/exclude and mute/block refine the page here.
      const list = await WispDB.listWorks({
        q: filterState.q,
        type: filterState.type,
        ratings: Array.from(filterState.ratings),
        sort: filterState.sort,
        limit: 100
      });
      LIVE.works = list;
      list.forEach(w => { LIVE.byId[w.id] = w; });
    } catch (e) { console.error("[wisp] browse load failed:", e); LIVE.works = []; }
    renderBrowse();
  }
  // Live filter changes re-query the backend; demo mode filters in place.
  function refreshBrowse() { isLive() ? loadBrowse() : renderBrowse(); }

  async function loadWork(id) {
    loadingScreen("#screen-work");
    try {
      const w = await WispDB.getWork(id);
      LIVE.byId[id] = w;
      LIVE.chapters[id] = await WispDB.getChapters(id).catch(() => []);
      LIVE.upcoming[id] = await WispDB.getUpcoming(id).catch(() => []);
      if (w.seriesId) { const s = await WispDB.getSeries(w.seriesId).catch(() => null); if (s) w.seriesName = s.name; }
      await seedRelations(id);
      if (WispDB.signedIn && w.authorId) {
        const f = await WispDB.amFollowing(w.authorId).catch(() => false);
        f ? userState.following.add(w.authorId) : userState.following.delete(w.authorId);
      }
      renderWork(id);
    } catch (e) {
      // Connected mode shows real works only, never a bundled demo sample.
      $("#screen-work").innerHTML = `<div class="page"><button class="btn--link" data-back style="margin-bottom:18px">&lsaquo; Back</button><p style="padding:40px 0;color:var(--ink3);line-height:1.6">This work isn't available. It may have been removed by its author, or the link is out of date.</p></div>`;
    }
  }

  function releasedChapters(chapters) {
    const now = Date.now();
    return (chapters || []).filter(c => c.published || (c.scheduled_for && new Date(c.scheduled_for).getTime() <= now))
      .sort((a, b) => a.number - b.number);
  }
  async function loadReading(id, chapterNum) {
    loadingScreen("#screen-reading");
    let w = null;
    try {
      w = await WispDB.getWork(id);
      if (!w) throw new Error("not found");
      LIVE.byId[id] = w;
      const chs = await WispDB.getChapters(id).catch(() => []);
      LIVE.chapters[id] = chs;
      // Comments grouped per chapter, then per paragraph (chapters must not mix).
      chs.forEach(c => { delete LIVE.comments[c.id]; });
      (await WispDB.getComments(id).catch(() => [])).forEach(r => {
        const cid = r.chapter_id || "_"; const k = r.paragraph_index == null ? -1 : r.paragraph_index;
        const byCh = (LIVE.comments[cid] = LIVE.comments[cid] || {});
        (byCh[k] = byCh[k] || []).push(r);
      });
      mergeLocalComments(id);   // restore any device-kept comments the server didn't return
      const readable = releasedChapters(chs);
      const target = (chapterNum && readable.find(c => c.number === +chapterNum)) || readable[0];
      if (target) LIVE.reactions[target.id] = await WispDB.getReactions(target.id).catch(() => ({}));
    } catch (e) {
      // On the connected site only real works open. A work id that doesn't
      // resolve (deleted, unpublished, a stale link, or a bundled demo sample
      // that isn't real content here) is treated as gone: no demo stand-in.
      delete LIVE.byId[id];
      renderReadingGone(); return;
    }
    if (needsGate(w)) { showGate(w, () => renderReading(id, chapterNum)); return; }
    renderReading(id, chapterNum);
  }
  function renderReadingGone() {
    $("#screen-reading").innerHTML = `<div class="reader"><div class="reader__wrap" style="text-align:center;padding:64px 20px">
      <h1 class="reader__title" style="font-size:26px">This work isn't available</h1>
      <p class="soft" style="font-size:15px;margin-top:10px;color:var(--ink3);line-height:1.6">It may have been removed by its author, or the link is out of date. Deleted works can't be opened, even from an old link.</p>
      <div style="margin-top:22px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn btn--primary" data-nav="browse">${icon("search",16)} Browse works</button><button class="btn btn--quiet" data-nav="home">Home</button></div>
    </div></div>`;
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
  function liveMsRow(b, n) {
    const st = WSTATUS[b.status] || WSTATUS.draft;
    const isPublic = b.status === "ongoing" || b.status === "complete";
    const stats = isPublic
      ? `<span class="ms-stats"><span class="stat stat--heart">${icon("heart",13)}${b.hearts}</span><span class="stat">${icon("comment",13)}${b.comments}</span><span class="stat">${icon("eye",13)}${b.reads}</span></span>`
      : `<span class="ms-stats muted">${b.status === "scheduled" ? "Scheduled, not visible to readers yet" : "Draft, only you can see it"}</span>`;
    return `<div class="ms-row" data-edit="${b.id}">
      <span class="ms-cover">${cover(b.cover, b.title)}</span>
      <span class="ms-main">
        <span class="ms-title">${esc(b.title)}${ratePill(b.rating)}${n ? `<span class="ms-book">Book ${n}</span>` : ""}</span>
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
              <span class="pill ${s.status === "complete" ? "pill--sage" : ""}">${s.status === "complete" ? "Complete" : "Ongoing"}</span>
            </div>
            <button class="btn--link" data-live-series="${s.id}">Manage series</button>
          </div>
          ${s.description ? `<p class="muted" style="font-size:13px;margin:2px 0 12px">${esc(s.description)}</p>` : ""}
          <div class="ms-list">
            ${inSeries.length ? inSeries.map((b, i) => liveMsRow(b, i + 1)).join("") : `<p class="muted" style="font-size:13px;padding:8px 4px">No books in this series yet.</p>`}
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
          ${standalone.length ? standalone.map(b => liveMsRow(b)).join("") : `<p class="muted" style="font-size:13px;padding:8px 4px">No standalone works yet.</p>`}
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

  async function loadWriteEditor(id, chapterNum) {
    if (!WispDB.signedIn) { renderWriteSignedOut(); return; }
    loadingScreen("#screen-write");
    try {
      const [work, chapters, series] = await Promise.all([
        WispDB.getWork(id),
        WispDB.getChapters(id).catch(() => []),
        WispDB.mySeries().catch(() => [])
      ]);
      LIVE.series = series;
      const ordered = chapters.slice().sort((a, b) => a.number - b.number);
      const chapter = (chapterNum && ordered.find(c => c.number === +chapterNum)) || ordered[0] || null;
      const s = work.seriesId ? series.find(x => x.id === work.seriesId) : null;
      liveEditor = { work, chapter, allChapters: ordered, seriesName: s ? s.name : "" };
      renderWriteEditor(work);
    } catch (e) { liveEditor = null; toast("Could not open that work."); loadWriteDashboard(); }
  }
  async function addNewChapter() {
    if (!liveEditor || !liveEditor.work) return;
    const id = liveEditor.work.id;
    const nums = (liveEditor.allChapters || []).map(c => c.number);
    const next = (nums.length ? Math.max.apply(null, nums) : 0) + 1;
    try {
      await WispDB.saveChapter(id, { number: next, title: "", body: "", published: false });
      toast("New chapter added.");
      navigate("write/" + id + "/" + next);
    } catch (e) { toast((e && e.message) || "Could not add a chapter."); }
  }
  function liveWorkMenu(id) {
    const b = (LIVE.desk || []).find(x => x.id === id) || LIVE.byId[id] || {};
    const title = b.title || "this work";
    const status = b.status || b._dbStatus;
    const isPublic = status === "ongoing" || status === "complete";
    const items = [
      { icon: "edit", label: "Edit", run: () => navigate("write/" + id) },
      { icon: "book", label: "View as reader", run: () => navigate("work/" + id) },
      { icon: "share", label: "Copy link", run: () => copyLink(id) }
    ];
    // Unpublish keeps the work and its chapters but hides it from readers; the
    // author can publish it again any time. A quieter step than deleting.
    if (isPublic) {
      items.push({ icon: "lock", label: "Unpublish", run: () => confirmDialog({
          title: "Unpublish this work?",
          body: `${esc(title)} will be hidden from readers and moved back to your drafts. Its chapters and stats are kept, and you can publish it again any time.`,
          confirmText: "Unpublish"
        }, async () => {
          try { await WispDB.setWorkStatus(id, "draft"); toast("Unpublished. It's back in your drafts."); loadWriteDashboard(); }
          catch (e) { toast((e && e.message) || "Could not unpublish."); }
        }) });
    } else if (status === "draft" || status === "scheduled") {
      items.push({ icon: "unlock", label: "Publish now", run: async () => {
          try { await WispDB.setWorkStatus(id, "ongoing"); toast("Published. It's live for readers."); loadWriteDashboard(); }
          catch (e) { toast((e && e.message) || "Could not publish."); }
        } });
    }
    items.push({ icon: "trash", label: "Delete work", danger: true, run: () => confirmDialog({
        title: "Delete this work?",
        body: `${esc(title)} and its chapters will be deleted. You can't undo this. If you only want to take it down for now, use Unpublish instead.`,
        confirmText: "Delete work", danger: true
      }, async () => {
        try { await WispDB.deleteWork(id); toast("Work deleted."); loadWriteDashboard(); }
        catch (e) { toast((e && e.message) || "Could not delete."); }
      }) });
    menuDialog(title, items);
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
    let seriesStatus = s.status === "complete" ? "complete" : "ongoing";
    const statusBtns = () => [["ongoing", "In progress"], ["complete", "Completed"]]
      .map(([v, t]) => `<button type="button" class="seg-btn ${seriesStatus === v ? "is-on" : ""}" data-ms-status="${v}" aria-pressed="${seriesStatus === v}">${t}</button>`).join("");
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h2 style="font-size:20px">Manage series</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Series name</label><input type="text" id="ms-name" value="${esc(s.name)}"></div>
      <div class="field"><label>Description</label><textarea id="ms-note" rows="2">${esc(s.description || "")}</textarea></div>
      <div class="field"><label>Status</label>
        <div class="seg" id="ms-status-seg">${statusBtns()}</div>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Readers see a Completed badge on the series when every book is finished.</p>
      </div>
      ${books.length ? `<div class="field"><label>Order of books</label>
        <div class="reorder">
          ${books.map((b, i) => `
            <div class="reorder-row">
              <span>${esc(b.title)}</span>
              <span class="reorder-ctrls">
                <button data-lmove="up|${b.id}" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(b.title)} up">${arrow(-90)}</button>
                <button data-lmove="down|${b.id}" ${i === books.length - 1 ? "disabled" : ""} aria-label="Move ${esc(b.title)} down">${arrow(90)}</button>
                <button class="reorder-del" data-ldelete-book="${b.id}" aria-label="Delete ${esc(b.title)}">${icon("trash", 13)}</button>
              </span>
            </div>`).join("")}
        </div>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Deleting a book removes that work and its chapters for good. The rest of the series stays.</p>
      </div>` : ""}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
        <button class="btn--link" data-ldelete-series style="color:#a2444f">Delete series</button>
        <div style="display:flex;gap:10px">
          <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
          <button class="btn btn--primary" data-lsave-series>Save</button>
        </div>
      </div>`, "Manage series");
    $$("#modalCard [data-ms-status]").forEach(btn => btn.addEventListener("click", () => {
      seriesStatus = btn.dataset.msStatus;
      $$("#modalCard [data-ms-status]").forEach(b => { const on = b === btn; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
    }));
    $$("#modalCard [data-lmove]").forEach(btn => btn.addEventListener("click", () => {
      const [dir, bid] = btn.dataset.lmove.split("|");
      reorderLiveBook(id, bid, dir);
    }));
    $$("#modalCard [data-ldelete-book]").forEach(btn => btn.addEventListener("click", () => {
      const bid = btn.dataset.ldeleteBook;
      const book = books.find(b => b.id === bid); if (!book) return;
      confirmDialog({
        title: "Delete this book?",
        body: `${esc(book.title || "This work")} and all of its chapters will be removed for good. This can't be undone. The rest of the series stays.`,
        confirmText: "Delete book", danger: true
      }, async () => {
        try {
          await WispDB.deleteWork(bid);
          toast("Book deleted.");
          if (typeof loadWriteDashboard === "function") await loadWriteDashboard();
          liveManageSeries(id);
        } catch (e) { toast((e && e.message) || "Could not delete the book."); }
      });
    }));
    $("#modalCard [data-lsave-series]").addEventListener("click", async () => {
      const name = $("#ms-name").value.trim();
      try {
        await WispDB.updateSeries(id, { name: name || s.name, description: $("#ms-note").value.trim(), status: seriesStatus });
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
    flushAutosave();   // leaving the editor: write any pending draft before its DOM is torn down
    finalizeReadSession();   // leaving a chapter: fold the elapsed read into the reading-pace average
    const hash = location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/");
    const seg = parts[0], arg = parts[1], arg2 = parts[2];
    let screen = SCREENS.includes(seg) ? seg : "home";
    if (seg === "read") screen = "reading";
    if (seg === "user") screen = "profile";
    if (seg === "hub") screen = "community";   // hub pages live in the community surface
    if (seg === "event") screen = "community"; // event spaces live in the community surface
    if (seg === "series") screen = "browse";   // series pages live in the browse surface
    if (seg === "tag") screen = "browse";       // tag collection pages live in the browse surface

    setActive(screen);
    closeSheet();
    closeModal();

    const live = isLive();
    if (screen === "reading") {
      if (live) { loadReading(arg || "", arg2); return; }
      const id = arg || "amber"; const w = W.byId[id];
      if (needsGate(w)) { showGate(w, () => renderReading(id)); return; }
      renderReading(id);
    }
    else if (screen === "work") { live ? loadWork(arg || "") : renderWork(arg); }
    else if (screen === "browse") {
      if (seg === "series") { live ? loadSeriesPage(arg) : renderSeriesUnavailable(); }
      else if (seg === "tag") { loadTagPage(arg || ""); }
      else { live ? loadBrowse() : renderBrowse(); }
    }
    else if (screen === "home") { live ? loadHome() : renderHome(); }
    else if (screen === "write") {
      if (!live) renderWrite(arg);
      else if (!arg) loadWriteDashboard();
      else if (arg === "new") { liveEditor = null; editorCover = null; renderWriteEditor(null); }
      else loadWriteEditor(arg, arg2);
    }
    else if (screen === "library") { LIVE.viewingList = null; renderLibrary(); }
    else if (screen === "community") {
      if (seg === "hub") { live ? loadHubPage(arg) : renderHubUnavailable(); }
      else if (seg === "event") { live ? loadEventSpace(arg) : renderHubUnavailable(); }
      else { live ? loadCommunity() : renderCommunity(); }
    }
    else if (screen === "profile") { (seg === "user" && live) ? loadUserProfile(arg) : renderProfile(); }
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
    else { body.innerHTML = `<h2 class="rail__title" style="margin-bottom:16px">Widgets</h2>${widgetHTML()}`; wireMiniWidgets(body); }
    openOverlay($("#railSheet"));
    if (kind === "activity" && isLive() && WispDB.signedIn) markNotificationsSeen();
  }

  // Keep the caret in the editor when a formatting button is pressed: without
  // this, mousedown on the toolbar button blurs the contenteditable and
  // execCommand has no selection to act on.
  document.addEventListener("mousedown", (e) => {
    if (e.target.closest("#screen-write [data-fmt]")) e.preventDefault();
  });

  // Badge hover/focus detail cards (delegated so they work anywhere a badge is).
  document.addEventListener("mouseover", (e) => { const b = e.target.closest && e.target.closest(".wisp-badge[data-badge]"); if (b) showBadgePop(b); });
  document.addEventListener("mouseout", (e) => { const b = e.target.closest && e.target.closest(".wisp-badge[data-badge]"); if (b) hideBadgePop(); });
  document.addEventListener("focusin", (e) => { const b = e.target.closest && e.target.closest(".wisp-badge[data-badge]"); if (b) showBadgePop(b); });
  document.addEventListener("focusout", (e) => { const b = e.target.closest && e.target.closest(".wisp-badge[data-badge]"); if (b) hideBadgePop(); });

  // Event delegation for the whole app.
  document.addEventListener("click", (e) => {
    const badgeCaseBtn = e.target.closest("[data-badge-case]");
    if (badgeCaseBtn) { openBadgeCase(lastBadgeCase.ids, lastBadgeCase.name); return; }
    const badgeChipEl = e.target.closest(".wisp-badge[data-badge]");
    if (badgeChipEl) { showBadgePop(badgeChipEl); return; }   // tap-to-reveal on touch
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      if (nav.dataset.nav === "profile" && window.WispDB && WispDB.enabled && !WispDB.signedIn) { openAuth("in"); return; }
      navigate(nav.dataset.nav); return;
    }

    const wt = e.target.closest("#screen-write [data-wtype]");
    if (wt) { $$("#screen-write [data-wtype]").forEach(b => { const on = b === wt; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }); return; }
    const ws = e.target.closest("#screen-write [data-wstatus]");
    if (ws) { $$("#screen-write [data-wstatus]").forEach(b => { const on = b === ws; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }); return; }
    const wf = e.target.closest("#screen-write [data-wformat]");
    if (wf) {
      const next = wf.dataset.wformat;
      if (next !== editorFormat) {
        if (editorFormat === "prose") { const ed = $("#we-body"); if (ed) editorProseHTML = ed.innerHTML; }
        editorFormat = next;
        $$("#screen-write [data-wformat]").forEach(b => { const on = b === wf; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); });
        refreshBodyZone();
      }
      return;
    }
    const wr = e.target.closest("#screen-write [data-wrate]");
    if (wr) { $$("#screen-write [data-wrate]").forEach(b => { const on = b === wr; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }); const m = $("#wrate-meaning"); if (m) m.textContent = rateTip(wr.dataset.wrate); return; }
    const pub = e.target.closest("[data-publish]");
    if (pub) { handlePublish(pub.dataset.publish); return; }
    const sched = e.target.closest("[data-schedule]");
    if (sched) { openScheduleDialog(); return; }
    const editCh = e.target.closest("[data-edit-chapter]");
    if (editCh) { if (liveEditor && liveEditor.work) navigate("write/" + liveEditor.work.id + "/" + editCh.dataset.editChapter); return; }
    const newCh = e.target.closest("[data-new-chapter]");
    if (newCh) { addNewChapter(); return; }

    const fmt = e.target.closest("#screen-write [data-fmt]");
    if (fmt) { applyFormat(fmt.dataset.fmt); return; }
    const pv = e.target.closest("#screen-write [data-preview]");
    if (pv) { openPreview(); return; }

    const read = e.target.closest("[data-read]");
    if (read) { navigate("read/" + read.dataset.read); return; }

    const tagMore = e.target.closest("[data-tag-more]");
    if (tagMore) {
      // Reveal the hidden tags in place, then drop the +N button.
      let rest = []; try { rest = JSON.parse(tagMore.getAttribute("data-tag-more") || "[]"); } catch (err) { rest = []; }
      const row = tagMore.parentElement;
      rest.forEach(t => { const b = document.createElement("button"); b.className = "tag"; b.setAttribute("data-tag", t); b.textContent = t; row.insertBefore(b, tagMore); });
      tagMore.remove();
      return;
    }

    const tagEl = e.target.closest("[data-tag]:not([data-tag-more])");
    if (tagEl) { navigate("tag/" + encodeURIComponent(tagEl.dataset.tag)); return; }
    const btype = e.target.closest("[data-browse-type]");
    if (btype) { const onBrowse = location.hash.replace(/^#\/?/, "").split("/")[0] === "browse"; filterState.type = btype.dataset.browseType; navigate("browse"); if (onBrowse) refreshBrowse(); return; }

    const lm = e.target.closest("[data-live-menu]");
    if (lm) { liveWorkMenu(lm.dataset.liveMenu); return; }
    const lsr = e.target.closest("[data-live-series]");
    if (lsr) { liveManageSeries(lsr.dataset.liveSeries); return; }
    const asb = e.target.closest("[data-add-series-book]");
    if (asb) { pendingSeries = asb.dataset.addSeriesBook; navigate("write/new"); return; }
    const nsr = e.target.closest("[data-new-series]");
    if (nsr) { newLiveSeries(); return; }
    const ep = e.target.closest("[data-edit-profile]");
    if (ep) { openEditProfile(); return; }

    const fol = e.target.closest("[data-follow]");
    if (fol) {
      if (isLive() && !WispDB.signedIn) { openAuth("in"); return; }
      const aid = fol.dataset.follow;
      const on = !userState.following.has(aid);
      on ? userState.following.add(aid) : userState.following.delete(aid);
      fol.textContent = on ? "Following" : "Follow";
      fol.setAttribute("aria-pressed", String(on));
      fol.classList.toggle("is-on-quiet", on);
      toast(on ? "Following. New works show in your Following feed." : "Unfollowed.");
      if (isLive()) WispDB.toggleFollow(aid, on).catch(err => toast((err && err.message) || "Could not update."));
      return;
    }
    const exOpen = e.target.closest("[data-exchange-open]");
    if (exOpen) { openExchange(exOpen.dataset.exchangeOpen); return; }

    const hopen = e.target.closest("[data-hub-open]");
    if (hopen && !e.target.closest("[data-hub-follow]")) { navigate("hub/" + hopen.dataset.hubOpen); return; }
    const hbf = e.target.closest("[data-hub-follow]");
    if (hbf) {
      if (!WispDB.signedIn) { openAuth("in"); return; }
      const id = hbf.dataset.hubFollow;
      const onHubPage = LIVE.hubPage && LIVE.hubPage.detail && LIVE.hubPage.detail.hub.id === id && /^#\/hub\//.test(location.hash);
      const wasFollowing = onHubPage ? LIVE.hubPage.detail.following : LIVE.myHubs.has(id);
      const on = !wasFollowing;
      const apply = (follow) => {
        if (onHubPage) {
          LIVE.hubPage.detail.following = follow;
          LIVE.hubPage.detail.count = Math.max(0, LIVE.hubPage.detail.count + (follow ? 1 : -1));
          renderHubPage();
        } else {
          follow ? LIVE.myHubs.add(id) : LIVE.myHubs.delete(id);
          LIVE.hubCounts[id] = Math.max(0, (LIVE.hubCounts[id] || 0) + (follow ? 1 : -1));
          renderCommunity();
        }
      };
      apply(on);   // optimistic
      toast(on ? "Following. New works from this hub come to you." : "Unfollowed.");
      WispDB.toggleHubMembership(id, on).catch(err => {
        apply(!on);   // roll back
        toast((err && err.message) || "Could not update that.");
      });
      return;
    }
    const esort = e.target.closest("[data-event-sort]");
    if (esort) {
      const mode = esort.dataset.eventSort;
      if (mode !== eventSort) { eventSort = mode; try { localStorage.setItem("wisp.eventSort", mode); } catch (er) {} renderCommunity(); }
      return;
    }
    const xsort = e.target.closest("[data-exchange-sort]");
    if (xsort) {
      const mode = xsort.dataset.exchangeSort;
      if (mode !== exchangeSort) { exchangeSort = mode; try { localStorage.setItem("wisp.exchangeSort", mode); } catch (er) {} renderCommunity(); }
      return;
    }
    const evj = e.target.closest("[data-event-join]");
    if (evj) {
      if (!WispDB.signedIn) { openAuth("in"); return; }
      const id = evj.dataset.eventJoin;
      const evt = (LIVE.events || []).find(x => x.id === id);
      if (evt && eventEnded(evt, Date.now()) && !LIVE.myEvents.has(id)) { toast("This event has ended."); return; }
      const on = !LIVE.myEvents.has(id);
      on ? LIVE.myEvents.add(id) : LIVE.myEvents.delete(id);   // optimistic + persistent
      renderCommunity();
      if (on) celebrate("You're in!", "It'll show on your home.", "🎉"); else toast("Left the event.");
      WispDB.toggleEventJoin(id, on).catch(err => {
        on ? LIVE.myEvents.delete(id) : LIVE.myEvents.add(id); renderCommunity();
        toast((err && err.message) || "Could not update that.");
      });
      return;
    }
    const ev = e.target.closest("[data-event]");
    if (ev) {
      const i = +ev.dataset.event; const evt = W.EVENTS[i]; if (!evt) return;
      evt.joined = !evt.joined;
      if (evt.joined) celebrate("You're in!", "It'll show on your home.", "🎉"); else toast("Left the event.");
      renderCommunity(); return;
    }
    const au = e.target.closest("[data-auth]");
    if (au) { openAuth(au.dataset.auth || "in"); return; }
    const guest = e.target.closest("[data-guest]");
    if (guest) { guestBrowsing = true; hideAuthGate(); navigate("home"); return; }

    const navUser = e.target.closest("[data-nav-user]");
    if (navUser) { closeOverlay($("#railSheet")); navigate("user/" + navUser.dataset.navUser); return; }
    const openEv = e.target.closest("[data-open-event]");
    if (openEv) { closeNotifPop(); navigate("event/" + openEv.dataset.openEvent); return; }
    const work = e.target.closest("[data-work]");
    if (work && !e.target.closest("[data-read]") && !e.target.closest("[data-tag]") && !e.target.closest("[data-browse-type]")) { navigate("work/" + work.dataset.work); return; }

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
    const dl = e.target.closest("[data-download]");
    if (dl) { openDownload(dl.dataset.download); return; }
    const lg = e.target.closest("[data-legal]");
    if (lg) { openLegal(lg.dataset.legal); return; }

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
        if (on) { tog.classList.remove("heart-pop"); void tog.offsetWidth; tog.classList.add("heart-pop"); bigHeart(); heartBurst(tog); }
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
    const lht = e.target.closest("[data-lhometab]");
    if (lht) { liveHomeTab = lht.dataset.lhometab; renderHomeLive(); return; }

    const view = e.target.closest("[data-view]");
    if (view) { settings.view = view.dataset.view; save(); route(); return; }

    const lt = e.target.closest("[data-libtab]");
    if (lt) { libTab = lt.dataset.libtab; LIVE.viewingList = null; renderLibrary(); return; }

    const nl = e.target.closest("[data-new-list]");
    if (nl) { openNewListDialog(); return; }
    const ol = e.target.closest("[data-open-list]");
    if (ol) { const id = ol.dataset.openList; LIVE.viewingList = (LIVE.lib.lists || []).find(l => l.id === id) || { id, name: "List", is_public: false }; renderLibraryListView(); return; }
    const lb = e.target.closest("[data-lib-back]");
    if (lb) { LIVE.viewingList = null; loadLibrary(); return; }
    const lr = e.target.closest("[data-list-remove]");
    if (lr) { const wid = lr.dataset.listRemove; WispDB.removeFromList(LIVE.viewingList.id, wid).then(() => { toast("Removed from the list."); renderLibraryListView(); }).catch(err => toast((err && err.message) || "Could not remove.")); return; }
    const ld = e.target.closest("[data-list-delete]");
    if (ld) { const id = ld.dataset.listDelete; confirmDialog({ title: "Delete this list?", body: "The list is removed. The works stay in your library.", confirmText: "Delete list", danger: true }, async () => { try { await WispDB.deleteList(id); LIVE.viewingList = null; LIVE.lib.lists = null; toast("List deleted."); loadLibrary(); } catch (e) { toast((e && e.message) || "Could not delete."); } }); return; }
    const ch = e.target.closest("[data-clear-history]");
    if (ch) { confirmDialog({ title: "Clear your history?", body: "Your recently-read list is emptied. This can't be undone.", confirmText: "Clear history", danger: true }, async () => { try { await WispDB.clearHistory(); LIVE.lib.history = []; toast("History cleared."); renderLibraryLive(); } catch (e) { toast((e && e.message) || "Could not clear."); } }); return; }
    const dh = e.target.closest("[data-del-highlight]");
    if (dh) { const id = dh.dataset.delHighlight; WispDB.deleteHighlight(id).then(() => { LIVE.lib.things = (LIVE.lib.things || []).filter(t => t.id !== id); toast("Highlight deleted."); renderLibraryLive(); }).catch(err => toast((err && err.message) || "Could not delete.")); return; }
  });


  // Browse controls (delegated separately because they use inputs/selects).
  document.addEventListener("change", (e) => {
    const r = e.target.closest("[data-rating]");
    if (r) { r.checked ? filterState.ratings.add(r.dataset.rating) : filterState.ratings.delete(r.dataset.rating); refreshBrowse(); return; }
    const sel = e.target.closest("#sortSel");
    if (sel) { filterState.sort = sel.value; refreshBrowse(); return; }
  });
  // Live-filter the tag include/exclude search boxes as the reader types.
  document.addEventListener("input", (e) => {
    const ts = e.target.closest("[data-tagsearch]");
    if (ts) { browseTagQ[ts.dataset.tagsearch] = ts.value; renderTagResults(ts.dataset.tagsearch); }
  });

  document.addEventListener("click", (e) => {
    const type = e.target.closest("[data-type]");
    if (type) { filterState.type = type.dataset.type; refreshBrowse(); return; }
    const statusBtn = e.target.closest("[data-status]");
    if (statusBtn) { filterState.status = statusBtn.dataset.status; refreshBrowse(); return; }
    const tadd = e.target.closest("[data-tagadd]");
    if (tadd) {
      const parts = tadd.dataset.tagadd.split(":"); const kind = parts.shift(); const t = parts.join(":");
      if (kind === "inc") { filterState.tagsInc.add(t); filterState.tagsExc.delete(t); }
      else { filterState.tagsExc.add(t); filterState.tagsInc.delete(t); }
      browseTagFocus = kind;                 // keep the reader in this search box
      refreshBrowse(); return;
    }
    const clr = e.target.closest("[data-clear]");
    if (clr) {
      const [k, v] = clr.dataset.clear.split(":");
      if (k === "type") filterState.type = "all";
      else if (k === "status") filterState.status = "all";
      else if (k === "rating") filterState.ratings.delete(v);
      else if (k === "inc") filterState.tagsInc.delete(v);
      else if (k === "exc") filterState.tagsExc.delete(v);
      else if (k === "q") { filterState.q = ""; const si = $("#searchInput"); if (si) si.value = ""; }
      refreshBrowse(); return;
    }
    if (e.target.closest("#saveSearch")) { saveCurrentSearch(); return; }
    const applyS = e.target.closest("[data-apply-search]");
    if (applyS) { applySavedSearch(+applyS.dataset.applySearch); return; }
    const delS = e.target.closest("[data-del-search]");
    if (delS) { removeSavedSearch(+delS.dataset.delSearch); return; }
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
      loadNotifications();                                     // fetch the activity feed once signed in
      loadReadingStats();                                      // and the reading stats widget
    } else {
      if (link) link.textContent = "Sign in";
      if (avatar) { avatar.textContent = "?"; avatar.title = "Sign in"; }
      LIVE.notifications = null; updateNotifBadge();           // drop any feed from a previous session
      LIVE.readingStats = null;
    }
    // The backend connects after the first paint, so a screen shown at boot can
    // be a demo render (the sample "Rowan" profile and works) even for a
    // signed-in reader. When the real identity arrives, or the profile row
    // finishes loading for it, re-render the current screen so it shows the
    // reader's own data. This is careful not to re-route on a plain token
    // refresh: refreshUser briefly nulls the profile on every auth event, so we
    // only re-render once per identity when its profile first becomes available,
    // never again, and never interrupt someone mid-read.
    const uid = WispDB.signedIn ? ((WispDB.user && WispDB.user.id) || "") : null;
    const hasProfile = !!WispDB.profile;
    if (uid !== lastAuthUid) {
      const wasIn = lastAuthUid != null;                        // was a real account signed in before
      lastAuthUid = uid;
      profileShownFor = hasProfile ? uid : null;
      if (uid || wasIn) route();                                // skip the guest / never-signed-in case
    } else if (uid && hasProfile && profileShownFor !== uid) {
      profileShownFor = uid;                                    // profile row arrived for the same id
      route();
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
        ${isUp ? "" : `<button class="btn--link" data-af="forgot" type="button" style="display:block;margin:12px auto 0;font-size:13px">Forgot your password?</button>`}
      </form>
      ${isUp ? `<p class="muted" style="font-size:12px;text-align:center;margin-top:12px;line-height:1.5">By creating an account, you agree to the <button class="btn--link" type="button" data-legal="terms" style="font-size:12px">Terms</button> and <button class="btn--link" type="button" data-legal="privacy" style="font-size:12px">Privacy</button>.</p>` : ""}
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
    const fg = q('[data-af="forgot"]'); if (fg) fg.addEventListener("click", openForgot);
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

  // "Forgot your password?": email a reset link. The message never reveals
  // whether an address has an account.
  function openForgot() {
    if (!isLive()) { toast("Password reset works once the site is connected to its backend."); return; }
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:22px">Reset your password</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:16px">Enter your email and we'll send a link to set a new password.</p>
      <form data-forgot novalidate>
        <div class="field"><label>Email</label><input type="email" data-fg-email autocomplete="email" required></div>
        <div data-fg-error style="display:none;color:#a2444f;font-size:13px;margin:4px 0 10px"></div>
        <button class="btn btn--primary btn--full" type="submit" data-fg-send>Send reset link</button>
      </form>
      <p class="muted" style="font-size:13px;text-align:center;margin-top:14px">
        Remembered it? <button class="btn--link" type="button" data-fg-back>Back to sign in</button>
      </p>`, "Reset password");
    const card = $("#modalCard");
    card.querySelector("[data-fg-back]").addEventListener("click", () => openAuth("in"));
    card.querySelector("[data-forgot]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (card.querySelector("[data-fg-email]").value || "").trim();
      const err = card.querySelector("[data-fg-error]");
      if (!email) { err.textContent = "Enter your email."; err.style.display = "block"; return; }
      const btn = card.querySelector("[data-fg-send]"); btn.disabled = true; btn.textContent = "Sending...";
      err.style.display = "none";
      try {
        await WispDB.resetPassword(email);
        closeModal();
        toast("If that email has an account, a reset link is on its way.");
      } catch (ex) {
        err.textContent = (ex && ex.message) || "Could not send the link."; err.style.display = "block";
        btn.disabled = false; btn.textContent = "Send reset link";
      }
    });
  }

  // Shown after the reader follows a reset link (PASSWORD_RECOVERY): pick a new
  // password to finish. The recovery session is already active at this point.
  function openSetNewPassword() {
    if (window.WispDB && WispDB.clearRecovery) WispDB.clearRecovery();
    openModal(`
      <div style="margin-bottom:6px"><h2 style="font-size:22px">Set a new password</h2></div>
      <p class="muted" style="font-size:13px;margin-bottom:16px">You followed a reset link. Choose a new password to finish.</p>
      <form data-setpw novalidate>
        <div class="field"><label>New password</label><input type="password" data-sp-pw autocomplete="new-password" minlength="6" required></div>
        <div class="field"><label>Confirm new password</label><input type="password" data-sp-pw2 autocomplete="new-password" minlength="6" required></div>
        <div data-sp-error style="display:none;color:#a2444f;font-size:13px;margin:4px 0 10px"></div>
        <button class="btn btn--primary btn--full" type="submit" data-sp-save>Save new password</button>
      </form>`, "Set a new password");
    const card = $("#modalCard");
    card.querySelector("[data-setpw]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = card.querySelector("[data-sp-pw]").value || "";
      const pw2 = card.querySelector("[data-sp-pw2]").value || "";
      const err = card.querySelector("[data-sp-error]");
      if (pw.length < 6) { err.textContent = "Use at least 6 characters."; err.style.display = "block"; return; }
      if (pw !== pw2) { err.textContent = "The two passwords don't match."; err.style.display = "block"; return; }
      const btn = card.querySelector("[data-sp-save]"); btn.disabled = true; btn.textContent = "Saving...";
      err.style.display = "none";
      try {
        await WispDB.updatePassword(pw);
        closeModal();
        toast("Password updated. You're signed in.");
        syncAuthHeader();
        // If this reset was for the admin, let them set a fresh panel password too.
        if (WispDB.isAdmin) promptNewAdminPassword();
      } catch (ex) {
        err.textContent = (ex && ex.message) || "Could not update the password."; err.style.display = "block";
        btn.disabled = false; btn.textContent = "Save new password";
      }
    });
  }

  /* ======================================================================= */
  /*  ADMIN PANEL  ·  owner-only controls, opened with Shift + S + D          */
  /*  The panel password is a soft second lock; the real authority for every  */
  /*  action is the is_admin gate the database enforces (RLS).                */
  /* ======================================================================= */
  let adminUnlocked = false;
  async function sha256Hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(str)));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  function newSalt() { return "wisp-admin-" + Math.random().toString(36).slice(2, 10); }

  async function openAdminPanel() {
    if (!isLive()) { toast("The admin panel needs the connected site."); return; }
    if (!WispDB.signedIn) { toast("Sign in with your admin account first."); openAuth("in"); return; }
    if (!WispDB.isAdmin) { toast("This account is not marked as an admin yet. Set is_admin = true on your profile in Supabase, then refresh."); return; }
    if (adminUnlocked) { renderAdminPanel(); return; }
    renderAdminLock();
  }

  function renderAdminLock() {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Admin access</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:14px">Enter the admin password to open the control panel.</p>
      <div class="field"><label>Admin password</label><input type="password" id="admin-pw" autocomplete="off"></div>
      <div class="modal-actions" style="justify-content:space-between">
        <button class="btn--link" id="admin-reset-lock" style="font-size:13px">Reset admin password</button>
        <button class="btn btn--primary" id="admin-unlock">Unlock</button>
      </div>`, "Admin access");
    const submit = async () => {
      const pw = $("#admin-pw").value || "";
      const s = await WispDB.getAdminSettings();
      if (!s) { toast("Admin settings are missing. Run migration 010 in Supabase."); return; }
      const hash = await sha256Hex((s.panel_pw_salt || "") + pw);
      if (hash === s.panel_pw_hash) { adminUnlocked = true; closeModal(); renderAdminPanel(); }
      else toast("That password is not right.");
    };
    $("#admin-unlock").addEventListener("click", submit);
    $("#admin-pw").addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    $("#admin-reset-lock").addEventListener("click", adminEmailReset);
    $("#admin-pw").focus();
  }

  async function adminEmailReset() {
    const email = WispDB.user && WispDB.user.email;
    if (!email) { toast("No email is set on this account."); return; }
    try {
      await WispDB.resetPassword(email);
      toast("A reset link is on its way to " + email + ". Open it to set a new admin password.");
    } catch (e) { toast((e && e.message) || "Could not send the reset email."); }
  }

  // Offered at the end of the reset-link flow, so a verified admin can set a new
  // panel password even when they were locked out of the old one.
  function promptNewAdminPassword() {
    openModal(`
      <div style="margin-bottom:6px"><h2 style="font-size:20px">Set a new admin password</h2></div>
      <p class="muted" style="font-size:13px;margin-bottom:14px">You are verified. Choose the new password for the admin panel.</p>
      <div class="field"><label>New admin password</label><input type="password" id="ra-pw" autocomplete="new-password"></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Skip</button>
        <button class="btn btn--primary" id="ra-save">Save admin password</button>
      </div>`, "New admin password");
    $("#ra-save").addEventListener("click", async () => {
      const pw = $("#ra-pw").value || "";
      if (pw.length < 6) { toast("Use at least 6 characters."); return; }
      const salt = newSalt();
      try { await WispDB.setAdminPassword(await sha256Hex(salt + pw), salt); closeModal(); toast("Admin panel password updated."); }
      catch (e) { toast((e && e.message) || "Could not set the admin password."); }
    });
  }

  /* ---- calendar date picker (used for event start times) ------------------ */
  const datePickers = {};   // per-field calendar state, keyed by a prefix
  const DP_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DP_DOW = ["S","M","T","W","T","F","S"];
  function datePickerHTML(pfx) {
    return `<div class="dpick" id="${pfx}-dpick">
      <div class="dpick__bar">
        <button type="button" class="dpick__nav" data-dp-prev="${pfx}" aria-label="Previous month">&lsaquo;</button>
        <span class="dpick__title" id="${pfx}-cal-title"></span>
        <button type="button" class="dpick__nav" data-dp-next="${pfx}" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="dpick__grid" id="${pfx}-grid"></div>
      <div class="dpick__time">
        <span class="dpick__time-lbl">Time (ET)</span>
        <input type="time" id="${pfx}-time" step="60">
        <button type="button" class="btn--link dpick__clear" data-dp-clear="${pfx}">Clear</button>
      </div>
    </div>`;
  }
  function initDatePicker(pfx, initialWall, onChange) {
    let y, mo, d = null, hh = "18", mm = "00";
    if (initialWall && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(initialWall)) {
      const parts = initialWall.split("T"), dp = parts[0].split("-"), tp = parts[1].split(":");
      y = +dp[0]; mo = +dp[1] - 1; d = +dp[2]; hh = tp[0]; mm = tp[1];
    } else {
      const p = easternParts(new Date()); y = +p.year; mo = +p.month - 1;   // default to the current Eastern month
    }
    datePickers[pfx] = { view: { y: y, mo: mo }, sel: d ? { y: y, mo: mo, d: d } : null, hh: hh, mm: mm, onChange: onChange || null };
    const t = $("#" + pfx + "-time"); if (t) t.value = hh + ":" + mm;
    renderCal(pfx);
    wireDatePicker(pfx);
  }
  function renderCal(pfx) {
    const st = datePickers[pfx]; if (!st) return;
    const y = st.view.y, mo = st.view.mo;
    const title = $("#" + pfx + "-cal-title"); if (title) title.textContent = DP_MONTHS[mo] + " " + y;
    const firstDow = new Date(Date.UTC(y, mo, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    // Today, in Eastern Time, so past days can't be picked (a countdown to the past is meaningless).
    const nowET = easternParts(new Date()), ty = +nowET.year, tmo = +nowET.month - 1, td = +nowET.day;
    let cells = DP_DOW.map(function (x) { return '<span class="dpick__dow">' + x + '</span>'; }).join("");
    for (let i = 0; i < firstDow; i++) cells += '<span class="dpick__cell dpick__cell--pad"></span>';
    for (let day = 1; day <= days; day++) {
      const sel = st.sel && st.sel.y === y && st.sel.mo === mo && st.sel.d === day;
      const past = (y < ty) || (y === ty && mo < tmo) || (y === ty && mo === tmo && day < td);
      if (past) { cells += '<span class="dpick__cell dpick__cell--past">' + day + '</span>'; continue; }
      cells += '<button type="button" class="dpick__cell' + (sel ? ' is-sel' : '') + '" data-dp-day="' + pfx + ':' + day + '">' + day + '</button>';
    }
    const grid = $("#" + pfx + "-grid"); if (grid) grid.innerHTML = cells;
  }
  function wireDatePicker(pfx) {
    const card = $("#modalCard"); if (!card) return;
    const st = datePickers[pfx];
    const changed = function () { if (st.onChange) st.onChange(); };
    const prev = card.querySelector('[data-dp-prev="' + pfx + '"]');
    const next = card.querySelector('[data-dp-next="' + pfx + '"]');
    const clear = card.querySelector('[data-dp-clear="' + pfx + '"]');
    const grid = card.querySelector('#' + pfx + '-grid');
    const time = card.querySelector('#' + pfx + '-time');
    if (prev) prev.addEventListener("click", function () { st.view.mo--; if (st.view.mo < 0) { st.view.mo = 11; st.view.y--; } renderCal(pfx); });
    if (next) next.addEventListener("click", function () { st.view.mo++; if (st.view.mo > 11) { st.view.mo = 0; st.view.y++; } renderCal(pfx); });
    if (clear) clear.addEventListener("click", function () { st.sel = null; renderCal(pfx); changed(); });
    if (grid) grid.addEventListener("click", function (e) { const b = e.target.closest("[data-dp-day]"); if (!b) return; st.sel = { y: st.view.y, mo: st.view.mo, d: +b.getAttribute("data-dp-day").split(":")[1] }; renderCal(pfx); changed(); });
    if (time) time.addEventListener("input", function () { const v = (time.value || "18:00").split(":"); st.hh = v[0]; st.mm = v[1]; changed(); });
  }
  function readDatePicker(pfx) {
    const st = datePickers[pfx]; if (!st || !st.sel) return "";
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return st.sel.y + "-" + pad(st.sel.mo + 1) + "-" + pad(st.sel.d) + "T" + st.hh + ":" + st.mm;
  }

  // A <select> of category names for a kind field. Includes the current value
  // even if it isn't in the list any more, so editing an old record is safe.
  function kindSelectHTML(id, cats, current) {
    const names = (cats || []).map(c => c.name);
    const cur = current || "";
    if (cur && names.indexOf(cur) < 0) names.unshift(cur);
    const opts = names.map(n => `<option value="${esc(n)}"${n === cur ? " selected" : ""}>${esc(n)}</option>`).join("");
    return `<select id="${id}" class="admin-select">${opts || `<option value="">No kinds yet</option>`}</select>`;
  }
  async function renderAdminPanel() {
    openModal(`<div class="admin-panel"><p class="muted admin-empty">Loading the control panel...</p></div>`, "Admin control panel");
    let events = [], hubs = [], works = [], exchanges = [], exCounts = {}, eventCats = [], hubCats = [], fandomCats = [];
    try {
      [events, hubs, works, exchanges, exCounts, eventCats, hubCats, fandomCats] = await Promise.all([
        WispDB.listEvents().catch(() => []),
        WispDB.listHubs().catch(() => []),
        WispDB.listWorks({ limit: 200 }).catch(() => []),
        WispDB.listExchanges().catch(() => []),
        WispDB.signupCounts().catch(() => ({})),
        WispDB.listCategories("event").catch(() => []),
        WispDB.listCategories("hub").catch(() => []),
        WispDB.listCategories("fandom").catch(() => [])
      ]);
    } catch (e) {}
    // Remember the kind lists so the edit dialogs can build their dropdowns.
    LIVE.cats = { event: eventCats, hub: hubCats, fandom: fandomCats };
    const catRows = (scope, list) => list.length
      ? list.map(c => `<span class="cat-chip">${esc(c.name)}<button class="cat-chip__x" data-admin-cat-del="${esc(c.id)}" data-label="${esc(c.name)}" aria-label="Delete ${esc(c.name)}">&times;</button></span>`).join("")
      : `<span class="muted" style="font-size:12.5px">No ${scope} kinds yet.</span>`;
    const exRows = exchanges.length ? exchanges.map(x => {
      const st = EX_STATUS[x.status] || EX_STATUS.signups;
      const n = exCounts[x.id] || 0;
      const acts = [];
      if (x.status === "signups") acts.push(`<button class="btn btn--primary btn--sm" data-admin-ex-match="${esc(x.id)}">Run matching</button>`);
      if (x.status === "matched") acts.push(`<button class="btn btn--primary btn--sm" data-admin-ex-status="${esc(x.id)}:revealed">Reveal</button>`);
      if (x.status === "matched" || x.status === "revealed" || x.status === "closed") acts.push(`<button class="btn btn--quiet btn--sm" data-admin-ex-status="${esc(x.id)}:signups">Reopen sign-ups</button>`);
      if (x.status !== "closed") acts.push(`<button class="btn btn--quiet btn--sm" data-admin-ex-status="${esc(x.id)}:closed">Close</button>`);
      acts.push(`<button class="btn btn--quiet btn--sm" data-admin-ex-edit="${esc(x.id)}">Edit</button>`);
      acts.push(`<button class="btn btn--danger btn--sm" data-admin-ex-del="${esc(x.id)}" data-label="${esc(x.title)}">Delete</button>`);
      const closeLbl = x.match_at ? " &middot; closes " + esc(fmtEasternStamp(x.match_at)) : "";
      return `<div class="admin-row admin-row--wrap">
        <div class="admin-row__main"><b>${esc(x.title)}</b><span class="muted">${st.label} &middot; ${n} ${n === 1 ? "sign-up" : "sign-ups"}${closeLbl}</span></div>
        <div class="admin-row__acts admin-row__acts--wrap">${acts.join("")}</div>
      </div>`;
    }).join("") : `<p class="muted admin-empty">No gift exchanges yet.</p>`;

    const evRows = events.length ? events.map(e => {
      const when = e.starts_at ? fmtEasternStamp(e.starts_at) : (e.month ? (e.month + " " + (e.day || "")).trim() : "");
      return `
      <div class="admin-row">
        <div class="admin-row__main"><b>${esc(e.title)}</b><span class="muted">${esc(e.kind || "")}${when ? " &middot; " + esc(when) : ""}</span></div>
        <div class="admin-row__acts">
          <button class="btn btn--quiet btn--sm" data-admin-edit-event="${esc(e.id)}">Edit</button>
          <button class="btn btn--danger btn--sm" data-admin-del-event="${esc(e.id)}" data-label="${esc(e.title)}">Delete</button>
        </div>
      </div>`; }).join("") : `<p class="muted admin-empty">No events yet.</p>`;
    const hubRows = hubs.length ? hubs.map(h => `
      <div class="admin-row">
        <div class="admin-row__main"><b>${esc(h.name)}</b><span class="muted">${esc(h.kind || "")}</span></div>
        <div class="admin-row__acts">
          <button class="btn btn--quiet btn--sm" data-admin-hub-widgets="${esc(h.id)}">Widgets</button>
          <button class="btn btn--quiet btn--sm" data-admin-edit-hub="${esc(h.id)}">Edit</button>
          <button class="btn btn--danger btn--sm" data-admin-del-hub="${esc(h.id)}" data-label="${esc(h.name)}">Delete</button>
        </div>
      </div>`).join("") : `<p class="muted admin-empty">No hubs yet.</p>`;
    openModal(`
      <div class="admin-panel">
        <div class="admin-panel__head">
          <h2>Admin control panel</h2>
          <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
        </div>
        <p class="muted admin-panel__note">Signed in as ${esc((WispDB.user && WispDB.user.email) || "admin")}. Changes here are live for everyone.</p>
        <div class="admin-stats">
          <span><b>${works.length}${works.length >= 200 ? "+" : ""}</b> works</span>
          <span><b>${events.length}</b> events</span>
          <span><b>${hubs.length}</b> hubs</span>
        </div>

        <section class="admin-sec">
          <h3>Events</h3>
          <div class="admin-list">${evRows}</div>
          <div class="admin-add">
            <input type="text" id="ae-title" placeholder="Event title">
            <label class="admin-add__lbl" style="margin:0">Kind</label>
            ${kindSelectHTML("ae-kind", eventCats, "")}
            <input type="text" id="ae-note" placeholder="Short note (optional)">
            <label class="admin-add__lbl">Start date and time (Eastern Time), optional. Readers see a live countdown to it.</label>
            ${datePickerHTML("ae")}
            ${durationHTML("ae", 1, 0, 0)}
            <div class="admin-add__row">
              <button class="btn btn--primary btn--sm" data-admin-add-event>Add event</button>
              <span class="muted admin-echo" id="ae-echo" style="font-size:12px"></span>
            </div>
          </div>
        </section>

        <section class="admin-sec">
          <h3>Hubs</h3>
          <div class="admin-list">${hubRows}</div>
          <div class="admin-add">
            <input type="text" id="ah-name" placeholder="Hub name">
            <label class="admin-add__lbl" style="margin:0">Kind</label>
            ${kindSelectHTML("ah-kind", hubCats, "")}
            <input type="text" id="ah-note" placeholder="Short note (optional)">
            <div class="admin-add__row">
              <input type="text" id="ah-icon" placeholder="Icon (tag or book)" style="width:170px">
              <button class="btn btn--primary btn--sm" data-admin-add-hub>Add hub</button>
            </div>
          </div>
        </section>

        <section class="admin-sec">
          <h3>Gift exchanges</h3>
          <div class="admin-list">${exRows}</div>
          <div class="admin-add">
            <input type="text" id="ax-title" placeholder="Exchange title (e.g. Winter Gift Exchange)">
            <input type="text" id="ax-note" placeholder="Short note (optional)">
            <label class="admin-add__lbl">Sign-ups close and matching runs at (Eastern Time), optional. Readers see a live countdown.</label>
            ${datePickerHTML("axm")}
            <div class="admin-add__row">
              <button class="btn btn--primary btn--sm" data-admin-ex-add>Create exchange</button>
              <span class="muted admin-echo" id="axm-echo" style="font-size:12px"></span>
            </div>
          </div>
        </section>

        <section class="admin-sec">
          <h3>Categories</h3>
          <p class="muted admin-panel__note" style="margin-top:0">The kinds you can pick from for events and hubs. Add or remove them here.</p>
          <div class="cat-group">
            <span class="cat-group__label">Event kinds</span>
            <div class="cat-list">${catRows("event", eventCats)}</div>
            <div class="admin-add__row">
              <input type="text" id="cat-event-new" placeholder="New event kind" class="admin-filter" style="margin:0;max-width:220px">
              <button class="btn btn--quiet btn--sm" data-admin-cat-add="event">Add</button>
            </div>
          </div>
          <div class="cat-group" style="margin-top:14px">
            <span class="cat-group__label">Hub kinds</span>
            <div class="cat-list">${catRows("hub", hubCats)}</div>
            <div class="admin-add__row">
              <input type="text" id="cat-hub-new" placeholder="New hub kind" class="admin-filter" style="margin:0;max-width:220px">
              <button class="btn btn--quiet btn--sm" data-admin-cat-add="hub">Add</button>
            </div>
          </div>
          <div class="cat-group" style="margin-top:14px">
            <span class="cat-group__label">Fandoms</span>
            <p class="muted" style="font-size:12.5px;margin:0 0 8px">Writers already get a large built-in fandom list and can type any of their own. Add extras here to push them into the suggestions.</p>
            <div class="cat-list">${catRows("fandom", fandomCats)}</div>
            <div class="admin-add__row">
              <input type="text" id="cat-fandom-new" placeholder="New fandom" class="admin-filter" style="margin:0;max-width:220px">
              <button class="btn btn--quiet btn--sm" data-admin-cat-add="fandom">Add</button>
            </div>
          </div>
        </section>

        <section class="admin-sec">
          <h3>Works and books</h3>
          <p class="muted admin-panel__note" style="margin-top:0">With a large catalogue the full list stays hidden. Search by title or author to find a work.</p>
          <input type="text" id="admin-work-filter" placeholder="Search by title or author" class="admin-filter">
          <div class="admin-list" id="admin-work-list"><p class="muted admin-empty">Search by title or author to find a work.</p></div>
        </section>

        <section class="admin-sec">
          <h3>Award badges</h3>
          <p class="muted admin-panel__note" style="margin-top:0">Give a member a badge for a contest win, kindness, or just for fun. Enter their handle, load, pick badges, and save. Needs migration 024.</p>
          <div class="admin-add">
            <div class="admin-add__row">
              <input type="text" id="admin-badge-handle" placeholder="@handle" class="admin-filter" style="margin:0">
              <button class="btn btn--quiet btn--sm" data-admin-badge-load>Load</button>
            </div>
            <div class="badge-award" id="admin-badge-grid" hidden></div>
            <div class="admin-add__row" id="admin-badge-save-row" hidden>
              <button class="btn btn--primary btn--sm" data-admin-badge-save>Save badges</button>
              <span class="muted" id="admin-badge-target" style="font-size:12.5px"></span>
            </div>
          </div>
        </section>

        <section class="admin-sec">
          <h3>Admin password</h3>
          <div class="admin-add">
            <input type="password" id="admin-new-pw" placeholder="New admin password" autocomplete="new-password">
            <div class="admin-add__row">
              <button class="btn btn--primary btn--sm" data-admin-set-pw>Change password</button>
              <button class="btn btn--quiet btn--sm" data-admin-reset>Reset by email</button>
            </div>
            <p class="muted" style="font-size:12px;margin:2px 0 0">The password is a second lock. Adding and deleting only work while you are signed into your admin account.</p>
          </div>
        </section>
      </div>`, "Admin control panel");

    wireAdminPanel(events, hubs, exchanges);
  }

  // Build the Eastern start time, derived badge, and end time (from a duration
  // given as days + hours + minutes) for the event forms.
  function eventTimeFields(raw, dd, hh, mm) {
    const fields = {};
    if (raw) {
      const inst = easternWallToInstant(raw);
      if (!isNaN(inst.getTime())) {
        fields.starts_at = inst.toISOString();
        const dm = easternDayMonth(fields.starts_at); fields.day = dm.day; fields.month = dm.month;
        const ms = (Math.max(0, +dd || 0) * 86400 + Math.max(0, +hh || 0) * 3600 + Math.max(0, +mm || 0) * 60) * 1000;
        fields.ends_at = ms > 0 ? new Date(inst.getTime() + ms).toISOString() : null;
      }
    }
    return fields;
  }
  // Read the three duration inputs for a form prefix, as [days, hours, minutes].
  function durValues(pfx) {
    return [($("#" + pfx + "-dd") || {}).value, ($("#" + pfx + "-hh") || {}).value, ($("#" + pfx + "-mm") || {}).value];
  }
  // Decompose a stored start/end back into days + hours + minutes for the edit form.
  function durationOf(startsAt, endsAt) {
    let ms = (startsAt && endsAt) ? (new Date(endsAt).getTime() - new Date(startsAt).getTime()) : 86400000;
    if (!(ms > 0)) ms = 86400000;
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const h = Math.floor(ms / 3600000); ms -= h * 3600000;
    const m = Math.round(ms / 60000);
    return { d: d, h: h, m: m };
  }
  function durationHTML(pfx, d, h, m) {
    return `<div class="admin-add__row admin-dur">
      <span class="admin-add__lbl" style="margin:0">Lasts</span>
      <label class="admin-dur__f"><input type="number" id="${pfx}-dd" min="0" max="365" value="${esc(String(d))}">days</label>
      <label class="admin-dur__f"><input type="number" id="${pfx}-hh" min="0" max="23" value="${esc(String(h))}">hrs</label>
      <label class="admin-dur__f"><input type="number" id="${pfx}-mm" min="0" max="59" value="${esc(String(m))}">min</label>
    </div>`;
  }

  function wireAdminPanel(events, hubs, exchanges) {
    const card = $("#modalCard");
    const withConfirm = (sel, prop, delFn, noun) => card.querySelectorAll(sel).forEach(b => b.addEventListener("click", () => {
      const rid = b.dataset[prop], label = b.dataset.label || ("this " + noun);
      confirmDialog({ title: `Delete this ${noun}?`, body: `&ldquo;${esc(label)}&rdquo; will be removed for everyone.${noun === "work" ? " Its chapters go too. This cannot be undone." : ""}`, confirmText: `Delete ${noun}`, danger: true },
        async () => { try { await delFn(rid); toast(noun[0].toUpperCase() + noun.slice(1) + " deleted."); } catch (e) { toast((e && e.message) || "Could not delete."); } renderAdminPanel(); });
    }));
    withConfirm("[data-admin-del-event]", "adminDelEvent", (id) => WispDB.deleteEvent(id), "event");
    withConfirm("[data-admin-del-hub]", "adminDelHub", (id) => WispDB.deleteHub(id), "hub");
    withConfirm("[data-admin-del-work]", "adminDelWork", (id) => WispDB.adminDeleteWork(id), "work");

    card.querySelectorAll("[data-admin-edit-event]").forEach(b => b.addEventListener("click", () => {
      const ev = (events || []).find(x => String(x.id) === b.dataset.adminEditEvent); if (ev) openEditEvent(ev);
    }));
    card.querySelectorAll("[data-admin-edit-hub]").forEach(b => b.addEventListener("click", () => {
      const h = (hubs || []).find(x => String(x.id) === b.dataset.adminEditHub); if (h) openEditHub(h);
    }));
    card.querySelectorAll("[data-admin-hub-widgets]").forEach(b => b.addEventListener("click", () => {
      const h = (hubs || []).find(x => String(x.id) === b.dataset.adminHubWidgets); if (h) openHubWidgets(h);
    }));

    const aeEcho = function () {
      const el = $("#ae-echo"); if (!el) return; const raw = readDatePicker("ae");
      if (!raw) { el.textContent = "No date set; no countdown."; return; }
      const f = eventTimeFields(raw, ...durValues("ae"));
      el.textContent = "Starts " + fmtEasternStamp(f.starts_at) + (f.ends_at ? ", ends " + fmtEasternStamp(f.ends_at) : "");
    };
    initDatePicker("ae", "", aeEcho);
    ["ae-dd", "ae-hh", "ae-mm"].forEach(id => { const el = card.querySelector("#" + id); el && el.addEventListener("input", aeEcho); });
    aeEcho();

    const addEvent = card.querySelector("[data-admin-add-event]");
    addEvent && addEvent.addEventListener("click", async () => {
      const title = $("#ae-title").value.trim();
      if (!title) { toast("Give the event a title."); return; }
      const fields = Object.assign({ title, kind: $("#ae-kind").value.trim(), note: $("#ae-note").value.trim(), sort: 100 },
        eventTimeFields(readDatePicker("ae"), ...durValues("ae")));
      try { await WispDB.createEvent(fields); toast("Event added."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not add the event."); }
    });
    const addHub = card.querySelector("[data-admin-add-hub]");
    addHub && addHub.addEventListener("click", async () => {
      const name = $("#ah-name").value.trim();
      if (!name) { toast("Give the hub a name."); return; }
      try { await WispDB.createHub({ name, kind: $("#ah-kind").value.trim(), note: $("#ah-note").value.trim(), icon: ($("#ah-icon").value.trim() || "tag"), sort: 100 }); toast("Hub added."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not add the hub."); }
    });

    // Works and books: the catalogue can be large, so nothing shows until the
    // admin searches. Each keystroke (debounced) queries matches by title or
    // author from the database, so it finds works far past any preloaded page.
    const workList = card.querySelector("#admin-work-list");
    const workFilter = card.querySelector("#admin-work-filter");
    // Staff picks: which works are currently featured (loaded once for the panel).
    let featuredSet = new Set();
    WispDB.listFeatured().then(list => { featuredSet = new Set((list || []).map(w => w.id)); }).catch(() => {});
    const workRowHTML = (w) => { const on = featuredSet.has(w.id); return `<div class="admin-row">
        <div class="admin-row__main"><b>${esc(w.title || "Untitled")}</b><span class="muted">by ${esc(w.author || "Unknown")}</span></div>
        <button class="btn btn--sm ${on ? "btn--primary" : "btn--quiet"}" data-admin-feature="${esc(w.id)}" aria-pressed="${on}">${on ? "Featured" : "Feature"}</button>
        <button class="btn btn--danger btn--sm" data-admin-del-work="${esc(w.id)}" data-label="${esc(w.title || "Untitled")}">Delete</button>
      </div>`; };
    const bindWorkDeletes = () => {
      workList && workList.querySelectorAll("[data-admin-del-work]").forEach(b => b.addEventListener("click", () => {
        const id = b.dataset.adminDelWork, label = b.dataset.label || "this work";
        confirmDialog({ title: "Delete this work?", body: `&ldquo;${esc(label)}&rdquo; will be removed for everyone. Its chapters go too. This cannot be undone.`, confirmText: "Delete work", danger: true },
          async () => { try { await WispDB.adminDeleteWork(id); toast("Work deleted."); } catch (e) { toast((e && e.message) || "Could not delete."); } renderAdminPanel(); });
      }));
      // Feature / unfeature a work for the home "Staff picks" section.
      workList && workList.querySelectorAll("[data-admin-feature]").forEach(b => b.addEventListener("click", async () => {
        const id = b.dataset.adminFeature; const on = featuredSet.has(id);
        b.disabled = true;
        try {
          if (on) { await WispDB.unsetFeatured(id); featuredSet.delete(id); toast("Removed from Staff picks."); }
          else { const ok = await WispDB.setFeatured(id, ""); if (ok === false) { toast("Staff picks needs migration 023."); b.disabled = false; return; } featuredSet.add(id); toast("Added to Staff picks."); }
          const nowOn = featuredSet.has(id);
          b.classList.toggle("btn--primary", nowOn); b.classList.toggle("btn--quiet", !nowOn);
          b.setAttribute("aria-pressed", String(nowOn)); b.textContent = nowOn ? "Featured" : "Feature";
        } catch (e) { toast((e && e.message) || "Could not update Staff picks."); }
        b.disabled = false;
      }));
    };
    const showWorkResults = (rows, q) => {
      if (!workList) return;
      if (!q) { workList.innerHTML = `<p class="muted admin-empty">Search by title or author to find a work.</p>`; return; }
      workList.innerHTML = rows.length
        ? rows.map(workRowHTML).join("")
        : `<p class="muted admin-empty">No works match &ldquo;${esc(q)}&rdquo;.</p>`;
      bindWorkDeletes();
    };
    let workTimer = null, workSeq = 0;
    if (workFilter) workFilter.addEventListener("input", () => {
      const q = workFilter.value.trim();
      if (workTimer) clearTimeout(workTimer);
      if (!q) { showWorkResults([], ""); return; }
      const seq = ++workSeq;
      if (workList) workList.innerHTML = `<p class="muted admin-empty">Searching...</p>`;
      workTimer = setTimeout(async () => {
        try {
          const rows = await WispDB.listWorks({ q, limit: 50, sort: "recent" });
          if (seq === workSeq) showWorkResults(rows || [], q);
        } catch (e) { if (seq === workSeq) showWorkResults([], q); }
      }, 220);
    });

    // Award badges: load a member by handle, toggle badges, save.
    let badgeTarget = null, badgeSel = new Set();
    const bGrid = card.querySelector("#admin-badge-grid");
    const bSaveRow = card.querySelector("#admin-badge-save-row");
    const bTargetLbl = card.querySelector("#admin-badge-target");
    const paintBadgeGrid = () => {
      if (!bGrid || !window.WispBadges) return;
      bGrid.innerHTML = WispBadges.CATALOG.map(b => `<button type="button" class="badge-award__cell ${badgeSel.has(b.id) ? "is-on" : ""}" data-badge-toggle="${esc(b.id)}" title="${esc(b.name)}">${WispBadges.svg(b.id, 38)}<span>${esc(b.name)}</span></button>`).join("");
    };
    const bLoad = card.querySelector("[data-admin-badge-load]");
    bLoad && bLoad.addEventListener("click", async () => {
      const h = ((card.querySelector("#admin-badge-handle") || {}).value || "").trim().replace(/^@/, "");
      if (!h) { toast("Enter a handle first."); return; }
      try {
        const prof = await WispDB.getProfile(h);
        if (!prof) { toast("No member with that handle."); return; }
        badgeTarget = prof; badgeSel = new Set(Array.isArray(prof.badges) ? prof.badges : []);
        paintBadgeGrid();
        if (bGrid) bGrid.hidden = false; if (bSaveRow) bSaveRow.hidden = false;
        if (bTargetLbl) bTargetLbl.textContent = "Editing " + (prof.display_name || ("@" + prof.handle));
      } catch (e) { toast((e && e.message) || "Could not load that member."); }
    });
    bGrid && bGrid.addEventListener("click", (e) => {
      const t = e.target.closest("[data-badge-toggle]"); if (!t) return;
      const id = t.dataset.badgeToggle;
      badgeSel.has(id) ? badgeSel.delete(id) : badgeSel.add(id);
      t.classList.toggle("is-on", badgeSel.has(id));
    });
    const bSave = card.querySelector("[data-admin-badge-save]");
    bSave && bSave.addEventListener("click", async () => {
      if (!badgeTarget) return;
      bSave.disabled = true;
      try {
        const res = await WispDB.grantBadges(badgeTarget.id, Array.from(badgeSel));
        if (res === false) toast("Badges need migration 024 and an admin row.");
        else toast("Badges updated for " + (badgeTarget.display_name || ("@" + badgeTarget.handle)) + ".");
      } catch (e) { toast((e && e.message) || "Could not save badges."); }
      bSave.disabled = false;
    });

    // Categories: add and delete event/hub kinds.
    card.querySelectorAll("[data-admin-cat-add]").forEach(b => b.addEventListener("click", async () => {
      const scope = b.dataset.adminCatAdd;
      const input = card.querySelector("#cat-" + scope + "-new");
      const name = (input && input.value.trim()) || "";
      if (!name) { toast("Type a name first."); return; }
      try { await WispDB.createCategory(scope, name); toast("Category added."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not add the category."); }
    }));
    card.querySelectorAll("[data-admin-cat-del]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.adminCatDel, label = b.dataset.label || "this category";
      confirmDialog({ title: "Remove this kind?", body: `&ldquo;${esc(label)}&rdquo; is removed from the dropdowns. Events and hubs already using it keep their label.`, confirmText: "Remove", danger: true },
        async () => { try { await WispDB.deleteCategory(id); toast("Category removed."); } catch (e) { toast((e && e.message) || "Could not remove."); } renderAdminPanel(); });
    }));

    const setPw = card.querySelector("[data-admin-set-pw]");
    setPw && setPw.addEventListener("click", async () => {
      const pw = $("#admin-new-pw").value || "";
      if (pw.length < 6) { toast("Use at least 6 characters."); return; }
      const salt = newSalt();
      try { await WispDB.setAdminPassword(await sha256Hex(salt + pw), salt); toast("Admin password changed."); $("#admin-new-pw").value = ""; }
      catch (e) { toast((e && e.message) || "Could not change the password."); }
    });
    const resetBtn = card.querySelector("[data-admin-reset]");
    resetBtn && resetBtn.addEventListener("click", adminEmailReset);

    // Gift exchanges.
    const axmEcho = function () {
      const el = $("#axm-echo"); if (!el) return; const raw = readDatePicker("axm");
      el.textContent = raw ? "Closes and matches " + fmtEasternStamp(easternWallToInstant(raw).toISOString()) : "No close time; you run matching by hand.";
    };
    initDatePicker("axm", "", axmEcho); axmEcho();
    const addEx = card.querySelector("[data-admin-ex-add]");
    addEx && addEx.addEventListener("click", async () => {
      const title = $("#ax-title").value.trim();
      if (!title) { toast("Give the exchange a title."); return; }
      const raw = readDatePicker("axm");
      const match_at = raw ? easternWallToInstant(raw).toISOString() : null;
      try { await WispDB.createExchange({ title, note: $("#ax-note").value.trim(), match_at }); toast("Exchange created. Readers can sign up now."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not create the exchange."); }
    });
    card.querySelectorAll("[data-admin-ex-status]").forEach(b => b.addEventListener("click", async () => {
      const parts = b.dataset.adminExStatus.split(":"), id = parts[0], status = parts[1];
      try { await WispDB.updateExchange(id, { status }); toast("Exchange updated."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not update."); }
    }));
    card.querySelectorAll("[data-admin-ex-match]").forEach(b => b.addEventListener("click", () => {
      confirmDialog({ title: "Run matching now?", body: "Everyone signed up will be paired to write for one another. You can re-run this while sign-ups are open.", confirmText: "Run matching" },
        async () => { try { const n = await WispDB.runMatching(b.dataset.adminExMatch); toast(n + " writers matched."); } catch (e) { toast((e && e.message) || "Could not match."); } renderAdminPanel(); });
    }));
    card.querySelectorAll("[data-admin-ex-edit]").forEach(b => b.addEventListener("click", async () => {
      const ex = (exchanges || []).find(x => String(x.id) === b.dataset.adminExEdit); if (ex) openEditExchange(ex);
    }));
    card.querySelectorAll("[data-admin-ex-del]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.adminExDel, label = b.dataset.label || "this exchange";
      confirmDialog({ title: "Delete this exchange?", body: `&ldquo;${esc(label)}&rdquo;, its sign-ups, and its matches are all removed. This cannot be undone.`, confirmText: "Delete exchange", danger: true },
        async () => { try { await WispDB.deleteExchange(id); toast("Exchange deleted."); } catch (e) { toast((e && e.message) || "Could not delete."); } renderAdminPanel(); });
    }));
  }

  function openEditExchange(ex) {
    const whenVal = ex.match_at ? toEasternInputValue(new Date(ex.match_at)) : "";
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Edit exchange</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Title</label><input type="text" id="ax-e-title" value="${esc(ex.title || "")}"></div>
      <div class="field"><label>Note</label><textarea id="ax-e-note" rows="2">${esc(ex.note || "")}</textarea></div>
      <div class="field"><label>Sign-ups close and matching runs at (Eastern Time)</label>${datePickerHTML("axem")}<p class="muted" id="axem-echo" style="font-size:12px;margin:6px 0 0"></p></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" id="ax-e-save">Save exchange</button>
      </div>`, "Edit exchange");
    const echo = () => { const el = $("#axem-echo"); if (!el) return; const raw = readDatePicker("axem");
      el.textContent = raw ? "Closes and matches " + fmtEasternStamp(easternWallToInstant(raw).toISOString()) : "No close time; you run matching by hand."; };
    initDatePicker("axem", whenVal, echo); echo();
    $("#ax-e-save").addEventListener("click", async () => {
      const title = $("#ax-e-title").value.trim(); if (!title) { toast("Give the exchange a title."); return; }
      const raw = readDatePicker("axem");
      const match_at = raw ? easternWallToInstant(raw).toISOString() : null;
      try { await WispDB.updateExchange(ex.id, { title, note: $("#ax-e-note").value.trim(), match_at }); toast("Exchange updated."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not update the exchange."); }
    });
  }

  function openEditEvent(ev) {
    const whenVal = ev.starts_at ? toEasternInputValue(new Date(ev.starts_at)) : "";
    const eeDur = durationOf(ev.starts_at, ev.ends_at);
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Edit event</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Title</label><input type="text" id="ee-title" value="${esc(ev.title || "")}"></div>
      <div class="field"><label>Kind</label>${kindSelectHTML("ee-kind", (LIVE.cats && LIVE.cats.event) || [], ev.kind || "")}</div>
      <div class="field"><label>Note</label><textarea id="ee-note" rows="2">${esc(ev.note || "")}</textarea></div>
      <div class="field"><label>Start date and time (Eastern Time)</label>${datePickerHTML("ee")}${durationHTML("ee", eeDur.d, eeDur.h, eeDur.m)}<p class="muted" id="ee-echo" style="font-size:12px;margin:6px 0 0"></p></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" id="ee-save">Save event</button>
      </div>`, "Edit event");
    const echo = () => {
      const el = $("#ee-echo"); if (!el) return; const raw = readDatePicker("ee");
      if (!raw) { el.textContent = "No start time; no countdown."; return; }
      const f = eventTimeFields(raw, ...durValues("ee"));
      el.textContent = "Starts " + fmtEasternStamp(f.starts_at) + (f.ends_at ? ", ends " + fmtEasternStamp(f.ends_at) : "");
    };
    initDatePicker("ee", whenVal, echo);
    ["ee-dd", "ee-hh", "ee-mm"].forEach(id => { const el = $("#" + id); el && el.addEventListener("input", echo); });
    echo();
    $("#ee-save").addEventListener("click", async () => {
      const title = $("#ee-title").value.trim(); if (!title) { toast("Give the event a title."); return; }
      const fields = Object.assign({ title, kind: $("#ee-kind").value.trim(), note: $("#ee-note").value.trim(), starts_at: null, ends_at: null, day: "", month: "" },
        eventTimeFields(readDatePicker("ee"), ...durValues("ee")));
      try { await WispDB.updateEvent(ev.id, fields); toast("Event updated."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not update the event."); }
    });
  }

  function openEditHub(h) {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Edit hub</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="field"><label>Name</label><input type="text" id="eh-name" value="${esc(h.name || "")}"></div>
      <div class="field"><label>Kind</label>${kindSelectHTML("eh-kind", (LIVE.cats && LIVE.cats.hub) || [], h.kind || "")}</div>
      <div class="field"><label>Note</label><textarea id="eh-note" rows="2">${esc(h.note || "")}</textarea></div>
      <div class="field"><label>Icon (tag or book)</label><input type="text" id="eh-icon" value="${esc(h.icon || "tag")}"></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" id="eh-save">Save hub</button>
      </div>`, "Edit hub");
    $("#eh-save").addEventListener("click", async () => {
      const name = $("#eh-name").value.trim(); if (!name) { toast("Give the hub a name."); return; }
      try { await WispDB.updateHub(h.id, { name, kind: $("#eh-kind").value.trim(), note: $("#eh-note").value.trim(), icon: ($("#eh-icon").value.trim() || "tag") }); toast("Hub updated."); renderAdminPanel(); }
      catch (e) { toast((e && e.message) || "Could not update the hub."); }
    });
  }

  /* ---- admin: manage a hub's widgets ------------------------------------- */
  function linksToText(items) { return (Array.isArray(items) ? items : []).map(it => (it.label && it.label !== it.url ? it.label + " | " : "") + (it.url || "")).join("\n"); }
  function parseLinks(text) {
    return (text || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const i = l.indexOf("|"); let label, url;
      if (i >= 0) { label = l.slice(0, i).trim(); url = l.slice(i + 1).trim(); } else { url = l; label = l; }
      url = safeUrl(url); return url ? { label: label || url, url: url } : null;
    }).filter(Boolean);
  }
  // The config fields for one widget kind, prefilled from an existing widget.
  function widgetKindForm(pfx, kind, w) {
    const cfg = (w && w.config) || {};
    const titleField = `<div class="field"><label>Title (optional)</label><input type="text" id="${pfx}-title" value="${esc((w && w.title) || "")}" placeholder="A heading for the block"></div>`;
    if (kind === "note") return titleField + `<div class="field"><label>Note</label><textarea id="${pfx}-body" rows="4" placeholder="Write an announcement. Markdown works.">${esc(cfg.body || "")}</textarea></div>`;
    if (kind === "countdown") return titleField + `<div class="field"><label>Counts down to (Eastern Time)</label>${datePickerHTML(pfx)}</div><div class="field"><label>When it arrives, show</label><input type="text" id="${pfx}-done" value="${esc(cfg.done || "")}" placeholder="It's here."></div>`;
    if (kind === "links") return titleField + `<div class="field"><label>Links, one per line as: Label | https://...</label><textarea id="${pfx}-links" rows="4" placeholder="Discord | https://discord.gg/...">${esc(linksToText(cfg.items))}</textarea></div>`;
    if (kind === "poll") return titleField + `<div class="field"><label>Question</label><input type="text" id="${pfx}-q" value="${esc(cfg.question || "")}" placeholder="What should we read next?"></div><div class="field"><label>Options, one per line</label><textarea id="${pfx}-opts" rows="4" placeholder="Option one&#10;Option two">${esc((cfg.options || []).join("\n"))}</textarea></div>`;
    if (kind === "image") return titleField + `<div class="field"><label>Image</label>
        <div class="admin-add__row" style="margin-bottom:6px">
          <input type="text" id="${pfx}-url" value="${esc(cfg.url || "")}" placeholder="Paste an https:// URL, or upload" style="flex:1;min-width:150px">
          <input type="file" id="${pfx}-img-file" accept="image/*" hidden>
          <button type="button" class="btn btn--quiet btn--sm" id="${pfx}-img-upload">${icon("upload",13)} Upload</button>
        </div>
      </div><div class="field"><label>Caption (optional)</label><input type="text" id="${pfx}-caption" value="${esc(cfg.caption || "")}"></div><div class="field"><label>Links to (optional)</label><input type="text" id="${pfx}-link" value="${esc(cfg.link || "")}" placeholder="https://..."></div>`;
    if (kind === "quote") return titleField + `<div class="field"><label>Quote</label><textarea id="${pfx}-text" rows="3" placeholder="A line worth pinning up.">${esc(cfg.text || "")}</textarea></div><div class="field"><label>Attribution (optional)</label><input type="text" id="${pfx}-cite" value="${esc(cfg.cite || "")}" placeholder="Who said it"></div>`;
    if (kind === "list") return titleField + `<div class="field"><label>Items, one per line</label><textarea id="${pfx}-items" rows="5" placeholder="Read the pinned intro&#10;Tag your warnings&#10;Be kind">${esc((cfg.items || []).join("\n"))}</textarea></div>`;
    if (kind === "progress") return titleField + `<div class="field"><label>Track</label>
        <select id="${pfx}-source" class="admin-select">${Object.keys(PROGRESS_SOURCES).map(s => `<option value="${s}"${(cfg.source || "manual") === s ? " selected" : ""}>${s === "manual" ? "Manual number" : "Hub " + PROGRESS_SOURCES[s]}</option>`).join("")}</select>
        <p class="muted" style="font-size:11.5px;margin:4px 0 0">Auto options fill the current value from this hub's live totals; Manual lets you type it.</p></div>
      <div class="field"><label>Current (manual only)</label><input type="number" id="${pfx}-current" value="${esc(String(cfg.current || 0))}" min="0"></div>
      <div class="field"><label>Target (goal)</label><input type="number" id="${pfx}-target" value="${esc(String(cfg.target || 0))}" min="0"></div>
      <div class="field"><label>Unit label (manual only)</label><input type="text" id="${pfx}-unit" value="${esc(cfg.unit || "")}" placeholder="sign-ups, words, ..."></div>`;
    if (kind === "button") return titleField + `<div class="field"><label>Button label</label><input type="text" id="${pfx}-label" value="${esc(cfg.label || "")}" placeholder="Sign up"></div><div class="field"><label>Links to (https://...)</label><input type="text" id="${pfx}-url" value="${esc(cfg.url || "")}" placeholder="https://..."></div>`;
    if (kind === "video") return titleField + `<div class="field"><label>Video URL (YouTube, Vimeo, ...)</label><input type="text" id="${pfx}-url" value="${esc(cfg.url || "")}" placeholder="https://..."></div>`;
    if (kind === "faq") return titleField + `<div class="field"><label>Questions and answers, one per line as: Question :: Answer</label><textarea id="${pfx}-faq" rows="5" placeholder="When do sign-ups close? :: Friday at midnight ET.">${esc((cfg.items || []).map(it => (it.q || "") + " :: " + (it.a || "")).join("\n"))}</textarea></div>`;
    return "";
  }
  // Read a widget-kind form back into { title, config }, or throw a message.
  function readWidgetKind(pfx, kind) {
    const title = (($("#" + pfx + "-title") || {}).value || "").trim();
    let config = {};
    if (kind === "note") {
      const body = (($("#" + pfx + "-body") || {}).value || "").trim();
      if (!body) throw new Error("Write the note first.");
      config = { body: body };
    } else if (kind === "countdown") {
      const raw = readDatePicker(pfx); let target = null;
      if (raw) { const inst = easternWallToInstant(raw); if (!isNaN(inst.getTime())) target = inst.toISOString(); }
      if (!target) throw new Error("Pick a date to count down to.");
      config = { target: target, done: (($("#" + pfx + "-done") || {}).value || "").trim() };
    } else if (kind === "links") {
      const items = parseLinks((($("#" + pfx + "-links") || {}).value || ""));
      if (!items.length) throw new Error("Add at least one valid link.");
      config = { items: items };
    } else if (kind === "poll") {
      const question = (($("#" + pfx + "-q") || {}).value || "").trim();
      const options = (($("#" + pfx + "-opts") || {}).value || "").split("\n").map(s => s.trim()).filter(Boolean);
      if (!question) throw new Error("Give the poll a question.");
      if (options.length < 2) throw new Error("A poll needs at least two options.");
      config = { question: question, options: options };
    } else if (kind === "image") {
      const url = safeUrl((($("#" + pfx + "-url") || {}).value || "").trim());
      if (!url) throw new Error("Add a valid image URL (https://...).");
      config = { url: url, caption: (($("#" + pfx + "-caption") || {}).value || "").trim(), link: safeUrl((($("#" + pfx + "-link") || {}).value || "").trim()) };
    } else if (kind === "quote") {
      const text = (($("#" + pfx + "-text") || {}).value || "").trim();
      if (!text) throw new Error("Write the quote first.");
      config = { text: text, cite: (($("#" + pfx + "-cite") || {}).value || "").trim() };
    } else if (kind === "list") {
      const items = (($("#" + pfx + "-items") || {}).value || "").split("\n").map(s => s.trim()).filter(Boolean);
      if (!items.length) throw new Error("Add at least one item.");
      config = { items: items };
    } else if (kind === "progress") {
      const target = Math.max(0, +(($("#" + pfx + "-target") || {}).value || 0));
      if (!(target > 0)) throw new Error("Set a target greater than zero.");
      const source = (($("#" + pfx + "-source") || {}).value || "manual");
      config = { source: source, current: Math.max(0, +(($("#" + pfx + "-current") || {}).value || 0)), target: target, unit: (($("#" + pfx + "-unit") || {}).value || "").trim() };
    } else if (kind === "button") {
      const url = safeUrl((($("#" + pfx + "-url") || {}).value || "").trim());
      const label = (($("#" + pfx + "-label") || {}).value || "").trim();
      if (!url) throw new Error("Add a valid link (https://...).");
      if (!label) throw new Error("Give the button a label.");
      config = { label: label, url: url };
    } else if (kind === "video") {
      const url = safeUrl((($("#" + pfx + "-url") || {}).value || "").trim());
      if (!url || !embedInfo(url)) throw new Error("Add a video URL from a supported site (YouTube, Vimeo, ...).");
      config = { url: url };
    } else if (kind === "faq") {
      const items = (($("#" + pfx + "-faq") || {}).value || "").split("\n").map(l => l.trim()).filter(Boolean).map(l => {
        const i = l.indexOf("::"); if (i < 0) return { q: l, a: "" };
        return { q: l.slice(0, i).trim(), a: l.slice(i + 2).trim() };
      }).filter(it => it.q);
      if (!items.length) throw new Error("Add at least one question.");
      config = { items: items };
    }
    return { title: title, config: config };
  }
  // Wire the image widget's Upload button: send the file to storage and drop the
  // resulting URL into the widget's URL field, so admins can upload or paste.
  function wireWidgetImageUpload(pfx) {
    const btn = $("#" + pfx + "-img-upload"), file = $("#" + pfx + "-img-file"), url = $("#" + pfx + "-url");
    if (!btn || !file) return;
    btn.addEventListener("click", () => { if (!isLive()) { toast("Connect the site to upload images."); return; } file.click(); });
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0]; if (!f) return;
      btn.disabled = true; btn.textContent = "Uploading...";
      try { const u = await WispDB.uploadCover(f); if (url) url.value = u; toast("Image uploaded."); }
      catch (e) { toast((e && e.message) || "Could not upload the image."); }
      btn.disabled = false; btn.innerHTML = icon("upload", 13) + " Upload"; file.value = "";
    });
  }
  async function openHubWidgets(hub) {
    if (!isLive()) { toast("Widgets need the connected site."); return; }
    openModal(`<div class="admin-panel"><p class="muted admin-empty">Loading widgets...</p></div>`, "Hub widgets");
    let widgets = [];
    try { widgets = await WispDB.listHubWidgets(hub.id); } catch (e) {}
    const rows = widgets.length ? widgets.map((w, i) => {
      const label = w.title || WIDGET_KINDS[w.kind] || w.kind;
      return `<div class="admin-row admin-row--wrap">
        <div class="admin-row__main"><b>${esc(label)}</b><span class="muted">${esc(WIDGET_KINDS[w.kind] || w.kind)}</span></div>
        <div class="admin-row__acts admin-row__acts--wrap">
          <button class="btn btn--quiet btn--sm" data-w-up="${esc(w.id)}" ${i === 0 ? "disabled" : ""} aria-label="Move up">${icon("chev", 13)}</button>
          <button class="btn btn--quiet btn--sm" data-w-down="${esc(w.id)}" ${i === widgets.length - 1 ? "disabled" : ""} aria-label="Move down" style="transform:none"><span style="display:inline-block;transform:rotate(180deg)">${icon("chev", 13)}</span></button>
          <button class="btn btn--quiet btn--sm" data-w-edit="${esc(w.id)}">Edit</button>
          <button class="btn btn--danger btn--sm" data-w-del="${esc(w.id)}" data-label="${esc(label)}">Delete</button>
        </div>
      </div>`;
    }).join("") : `<p class="muted admin-empty">No widgets yet. Add one below.</p>`;

    const kindOpts = Object.keys(WIDGET_KINDS).map(k => `<option value="${k}">${WIDGET_KINDS[k]}</option>`).join("");
    openModal(`
      <div class="admin-panel">
        <div class="admin-panel__head">
          <h2>Widgets: ${esc(hub.name)}</h2>
          <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
        </div>
        <button class="btn--link" data-w-back style="margin:-4px 0 10px">&lsaquo; Back to panel</button>
        <p class="muted admin-panel__note">Blocks that show on this hub's page: a note, a live countdown, a list of links, or a poll readers vote in.</p>
        <section class="admin-sec">
          <h3>On this hub</h3>
          <div class="admin-list">${rows}</div>
        </section>
        <section class="admin-sec">
          <h3>Add a widget</h3>
          <div class="admin-add">
            <label class="admin-add__lbl" style="margin:0">Kind</label>
            <select id="wadd-kind" class="admin-filter" style="margin:0">${kindOpts}</select>
            <div id="wadd-form">${widgetKindForm("wadd", "note", null)}</div>
            <div class="admin-add__row">
              <button class="btn btn--primary btn--sm" data-w-add>Add widget</button>
            </div>
          </div>
        </section>
      </div>`, "Hub widgets");

    const card = $("#modalCard");
    const back = card.querySelector("[data-w-back]");
    back && back.addEventListener("click", () => renderAdminPanel());
    const kindSel = card.querySelector("#wadd-kind");
    const rebuild = () => {
      $("#wadd-form").innerHTML = widgetKindForm("wadd", kindSel.value, null);
      if (kindSel.value === "countdown") initDatePicker("wadd", "", function () {});
      if (kindSel.value === "image") wireWidgetImageUpload("wadd");
    };
    kindSel && kindSel.addEventListener("change", rebuild);

    card.querySelector("[data-w-add]").addEventListener("click", async () => {
      let payload; try { payload = readWidgetKind("wadd", kindSel.value); } catch (e) { toast(e.message); return; }
      try { await WispDB.createWidget({ hub_id: hub.id, kind: kindSel.value, title: payload.title, config: payload.config, position: widgets.length }); toast("Widget added."); openHubWidgets(hub); }
      catch (e) { toast((e && e.message) || "Could not add the widget."); }
    });
    card.querySelectorAll("[data-w-edit]").forEach(b => b.addEventListener("click", () => {
      const w = widgets.find(x => String(x.id) === b.dataset.wEdit); if (w) openEditWidget(hub, w);
    }));
    card.querySelectorAll("[data-w-del]").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.wDel, label = b.dataset.label || "this widget";
      confirmDialog({ title: "Delete this widget?", body: `&ldquo;${esc(label)}&rdquo; is removed from the hub page.`, confirmText: "Delete widget", danger: true },
        async () => { try { await WispDB.deleteWidget(id); toast("Widget deleted."); } catch (e) { toast((e && e.message) || "Could not delete."); } openHubWidgets(hub); });
    }));
    const reorder = async (id, dir) => {
      const i = widgets.findIndex(x => String(x.id) === id); if (i < 0) return;
      const j = i + dir; if (j < 0 || j >= widgets.length) return;
      const order = widgets.slice(); const t = order[i]; order[i] = order[j]; order[j] = t;
      try { await Promise.all(order.map((w, k) => WispDB.updateWidget(w.id, { position: k }))); openHubWidgets(hub); }
      catch (e) { toast((e && e.message) || "Could not reorder."); }
    };
    card.querySelectorAll("[data-w-up]").forEach(b => b.addEventListener("click", () => reorder(b.dataset.wUp, -1)));
    card.querySelectorAll("[data-w-down]").forEach(b => b.addEventListener("click", () => reorder(b.dataset.wDown, 1)));
  }
  function openEditWidget(hub, w) {
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Edit ${esc(WIDGET_KINDS[w.kind] || w.kind)} widget</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div id="wedit-form">${widgetKindForm("wedit", w.kind, w)}</div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" id="wedit-save">Save widget</button>
      </div>`, "Edit widget");
    if (w.kind === "countdown") {
      const cur = (w.config && w.config.target) ? toEasternInputValue(new Date(w.config.target)) : "";
      initDatePicker("wedit", cur, function () {});
    }
    if (w.kind === "image") wireWidgetImageUpload("wedit");
    $("#wedit-save").addEventListener("click", async () => {
      let payload; try { payload = readWidgetKind("wedit", w.kind); } catch (e) { toast(e.message); return; }
      try { await WispDB.updateWidget(w.id, { title: payload.title, config: payload.config }); toast("Widget updated."); openHubWidgets(hub); }
      catch (e) { toast((e && e.message) || "Could not update the widget."); }
    });
  }

  /* ---- gift exchange: the reader-facing view ----------------------------- */
  const EX_STATUS = {
    signups:  { label: "Sign-ups open" },
    matched:  { label: "Matched" },
    revealed: { label: "Revealed" },
    closed:   { label: "Closed" }
  };
  async function openExchange(id) {
    if (!isLive()) { toast("Gift exchanges need the connected site."); return; }
    openModal(`<div class="admin-panel"><p class="muted admin-empty">Loading the exchange...</p></div>`, "Gift exchange");
    let ex = null, signup = null, assignment = null, gift = null, giftWork = null, giverName = "";
    try {
      ex = await WispDB.getExchange(id);
      if (ex && WispDB.signedIn) {
        [signup, assignment, gift] = await Promise.all([
          WispDB.mySignup(id).catch(() => null),
          WispDB.myAssignment(id).catch(() => null),
          WispDB.myGift(id).catch(() => null)
        ]);
        if (gift && gift.work_id) { giftWork = await WispDB.getWork(gift.work_id).catch(() => null); }
        if (gift && gift.giver_id) { const gp = await WispDB.getProfile(gift.giver_id).catch(() => null); giverName = gp ? (gp.display_name || "a writer") : "a writer"; }
      }
    } catch (e) {}
    if (!ex) { openModal(`<div class="admin-panel"><div class="admin-panel__head"><h2>Gift exchange</h2><button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button></div><p class="muted">This exchange could not be found.</p></div>`, "Gift exchange"); return; }

    const st = EX_STATUS[ex.status] || EX_STATUS.signups;
    let bodyHTML = "";
    if (!WispDB.signedIn) {
      bodyHTML = `<p class="soft" style="font-size:14px">Sign in to take part in this exchange.</p><button class="btn btn--primary" data-auth="in">Sign in</button>`;
    } else if (ex.status === "signups") {
      bodyHTML = `
        <p class="soft" style="font-size:14px;margin:0 0 12px">Tell us what you'd love to receive, and what you're happy to write. When sign-ups close, you'll be matched to write for someone.</p>
        <div class="field"><label>Your request (what you want to receive)</label><textarea id="ex-request" rows="3" placeholder="A slow-burn reunion, found family, a happy ending...">${esc(signup ? signup.request : "")}</textarea></div>
        <div class="field"><label>Your offer (what you can write)</label><textarea id="ex-offer" rows="3" placeholder="Fluff, casefic, anything in this fandom...">${esc(signup ? signup.offer : "")}</textarea></div>
        <div class="modal-actions" style="justify-content:space-between">
          ${signup ? `<button class="btn--link" id="ex-withdraw" style="color:#a2444f">Withdraw</button>` : "<span></span>"}
          <button class="btn btn--primary" id="ex-join">${signup ? "Save changes" : "Join the exchange"}</button>
        </div>`;
    } else if (ex.status === "matched") {
      if (assignment) {
        bodyHTML = `
          <p class="soft" style="font-size:14px;margin:0 0 4px">You're writing a gift for this request (the recipient stays anonymous until the reveal):</p>
          <blockquote class="ex-request">${esc(assignment.request || "No request was written.")}</blockquote>
          <div class="field" style="margin-top:14px"><label>Attach your gift work</label>
            <select id="ex-work"><option value="">Choose one of your works...</option></select>
          </div>
          <div class="modal-actions"><button class="btn btn--primary" id="ex-attach">Attach as my gift</button></div>
          <p class="muted" id="ex-attached" style="font-size:13px;margin:4px 0 0">${assignment.work_id ? "A gift is attached. You can change it any time before the reveal." : ""}</p>`;
      } else {
        bodyHTML = `<p class="soft" style="font-size:14px">Matching is done and you're not in this round. Keep an eye out for the next one.</p>`;
      }
    } else if (ex.status === "revealed") {
      const rec = gift && giftWork
        ? `<p class="soft" style="font-size:14px">Your gift is here: <a href="#/work/${giftWork.id}" data-modal-cancel style="text-decoration:underline">${esc(giftWork.title)}</a>, written for you by ${esc(giverName)}.</p>`
        : `<p class="soft" style="font-size:14px">Your gift hasn't been posted yet. Check back soon.</p>`;
      const gave = assignment ? `<p class="soft" style="font-size:14px;margin-top:10px">You wrote for a request${assignment.work_id ? " and attached your gift" : ""}. Thank you for taking part.</p>` : "";
      bodyHTML = rec + gave;
    } else {
      bodyHTML = `<p class="soft" style="font-size:14px">This exchange has closed.</p>`;
    }

    openModal(`
      <div class="admin-panel">
        <div class="admin-panel__head">
          <h2>${esc(ex.title)}</h2>
          <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
        </div>
        <p class="admin-panel__note"><span class="pill">${st.label}</span>${ex.note ? " " + esc(ex.note) : ""}</p>
        ${bodyHTML}
      </div>`, "Gift exchange");

    const card = $("#modalCard");
    const join = card.querySelector("#ex-join");
    join && join.addEventListener("click", async () => {
      try { await WispDB.joinExchange(id, { request: $("#ex-request").value.trim(), offer: $("#ex-offer").value.trim() }); if (signup) toast("Sign-up updated."); else celebrate("You're signed up!", "You'll be matched when sign-ups close.", "🎁"); closeModal(); loadCommunity(); }
      catch (e) { toast((e && e.message) || "Could not sign up."); }
    });
    const withdraw = card.querySelector("#ex-withdraw");
    withdraw && withdraw.addEventListener("click", () => {
      confirmDialog({ title: "Withdraw from this exchange?", body: "Your sign-up is removed. You can join again while sign-ups are open.", confirmText: "Withdraw", danger: true },
        async () => { try { await WispDB.withdrawSignup(id); toast("Withdrawn."); closeModal(); loadCommunity(); } catch (e) { toast((e && e.message) || "Could not withdraw."); } });
    });
    // Populate the giver's own works for the gift picker.
    const sel = card.querySelector("#ex-work");
    if (sel) {
      WispDB.myWorks().then(works => {
        (works || []).forEach(w => { const o = document.createElement("option"); o.value = w.id; o.textContent = w.title; if (assignment && assignment.work_id === w.id) o.selected = true; sel.appendChild(o); });
      }).catch(() => {});
    }
    const attach = card.querySelector("#ex-attach");
    attach && attach.addEventListener("click", async () => {
      const wid = sel ? sel.value : "";
      if (!wid) { toast("Pick one of your works first."); return; }
      try { await WispDB.attachGift(assignment.id, wid); toast("Gift attached. Thank you."); $("#ex-attached").textContent = "A gift is attached. You can change it any time before the reveal."; }
      catch (e) { toast((e && e.message) || "Could not attach the gift."); }
    });
  }

  // Show the placeholder only while the editor is truly empty. A lone <p><br></p>
  // (what contenteditable leaves behind) still counts as empty; any typed text,
  // image, or embed clears it.
  function updateEditorEmpty() {
    const ed = $("#we-body"); if (!ed) return;
    const hasMedia = !!ed.querySelector("img, figure, iframe, hr, li");
    const hasText = (ed.textContent || "").replace(/ /g, " ").trim().length > 0;
    ed.classList.toggle("is-empty", !hasMedia && !hasText);
  }

  // ---- Grammar & spelling check ---------------------------------------------
  // A local, rule-based pass (no network, nothing leaves the browser). It flags
  // common, high-confidence mistakes and offers a one-tap fix, shown as a green
  // underline like a word processor. Rules stay conservative to avoid nagging.
  function gcWord(bad, good) { return { re: new RegExp("\\b" + bad + "\\b", "gi"), fix: good, caps: true }; }
  function gcPhrase(bad, good) { return { re: new RegExp("\\b" + bad.replace(/ /g, "\\s+") + "\\b", "gi"), fix: good, caps: true }; }
  const GRAMMAR_RULES = [
    // Everyday misspellings.
    gcWord("teh", "the"), gcWord("adn", "and"), gcWord("recieve", "receive"), gcWord("recieved", "received"),
    gcWord("seperate", "separate"), gcWord("definately", "definitely"), gcWord("occured", "occurred"),
    gcWord("untill", "until"), gcWord("wich", "which"), gcWord("thier", "their"), gcWord("beleive", "believe"),
    gcWord("belive", "believe"), gcWord("wierd", "weird"), gcWord("freind", "friend"), gcWord("becuase", "because"),
    gcWord("becasue", "because"), gcWord("tommorow", "tomorrow"), gcWord("tomorow", "tomorrow"),
    gcWord("gaurd", "guard"), gcWord("neccessary", "necessary"), gcWord("neccesary", "necessary"),
    gcWord("embarass", "embarrass"), gcWord("enviroment", "environment"), gcWord("goverment", "government"),
    gcWord("existance", "existence"), gcWord("occassion", "occasion"), gcWord("privilage", "privilege"),
    gcWord("rythm", "rhythm"), gcWord("suprise", "surprise"), gcWord("truely", "truly"), gcWord("accross", "across"),
    gcWord("alot", "a lot"), gcWord("aswell", "as well"), gcWord("infront", "in front"),
    gcWord("noone", "no one"), gcWord("everytime", "every time"), gcWord("payed", "paid"), gcWord("dont", "don't"),
    // (Deliberately no "gonna/wanna/kinda/thru" etc. — those are voice, not typos.)
    // Missing apostrophes in common contractions.
    gcWord("cant", "can't"), gcWord("wont", "won't"), gcWord("didnt", "didn't"), gcWord("doesnt", "doesn't"),
    gcWord("isnt", "isn't"), gcWord("wasnt", "wasn't"), gcWord("werent", "weren't"), gcWord("arent", "aren't"),
    gcWord("couldnt", "couldn't"), gcWord("shouldnt", "shouldn't"), gcWord("wouldnt", "wouldn't"),
    gcWord("havent", "haven't"), gcWord("hasnt", "hasn't"), gcWord("hadnt", "hadn't"), gcWord("wouldve", "would've"),
    gcWord("couldve", "could've"), gcWord("shouldve", "should've"), gcWord("im", "I'm"), gcWord("ive", "I've"),
    gcWord("youre", "you're"), gcWord("youve", "you've"), gcWord("theyre", "they're"), gcWord("theyve", "they've"),
    gcWord("thats", "that's"), gcWord("whats", "what's"), gcWord("hes", "he's"),
    gcWord("shes", "she's"), gcWord("weve", "we've"),
    // ("lets", "wont", "cant" as bare words also read as valid English — kept out of
    //  the word list, or handled only inside the phrase rules below, to avoid nagging.)
    // Standalone lowercase "i" as a pronoun. Skip "i." so "i.e." and list markers pass.
    { re: /\bi\b(?!\.)/g, fix: "I", caps: false },
    // Subject-verb agreement and swapped phrases (high-confidence).
    gcPhrase("i is", "I am"), gcPhrase("i are", "I am"), gcPhrase("i has", "I have"), gcPhrase("i were", "I was"),
    gcPhrase("he don't", "he doesn't"), gcPhrase("she don't", "she doesn't"), gcPhrase("it don't", "it doesn't"),
    gcPhrase("he dont", "he doesn't"), gcPhrase("she dont", "she doesn't"),
    gcPhrase("they was", "they were"), gcPhrase("we was", "we were"), gcPhrase("you was", "you were"),
    gcPhrase("he have", "he has"), gcPhrase("she have", "she has"),
    gcPhrase("could of", "could have"), gcPhrase("would of", "would have"), gcPhrase("should of", "should have"),
    gcPhrase("must of", "must have"), gcPhrase("your welcome", "you're welcome"), gcPhrase("each and every", "every")
  ];
  // A doubled word ("the the") collapses to one — but plenty of repeats are
  // deliberate in prose and dialogue, so those are left alone.
  const GC_DOUBLE = /\b(\w+)\s+\1\b/gi;
  const GC_DOUBLE_OK = new Set(["had", "that", "no", "ha", "so", "bye", "night", "yeah", "yes",
    "um", "uh", "oh", "ho", "blah", "hear", "knock", "tick", "choo", "bang", "beep", "tap",
    "run", "go", "chop", "very", "really", "hush", "now", "there", "who"]);

  function stripGrammarMarks(ed) {
    const scope = ed || document;
    scope.querySelectorAll(".gc-mark").forEach(m => { m.parentNode.replaceChild(document.createTextNode(m.textContent), m); });
    if (scope.normalize) scope.normalize();
    closeGrammarPop();
  }
  // Preserve the original capitalization for a respelling fix (Teh -> The).
  function gcApplyCase(original, fix) {
    if (original && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase())
      return fix.charAt(0).toUpperCase() + fix.slice(1);
    return fix;
  }

  function runGrammarCheck() {
    const ed = $("#we-body"); if (!ed) return;
    stripGrammarMarks(ed);
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest("figure, a, code, .gc-mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const texts = []; let tn; while ((tn = walker.nextNode())) texts.push(tn);
    let count = 0;
    texts.forEach(node => {
      const text = node.nodeValue;
      // Gather every candidate match, then keep non-overlapping ones with the
      // LONGEST winning, so "i is" -> "I am" beats the bare "i" -> "I" and
      // "he dont" -> "he doesn't" beats "dont" -> "don't".
      const raw = [];
      GRAMMAR_RULES.forEach(rule => {
        rule.re.lastIndex = 0; let m;
        while ((m = rule.re.exec(text))) {
          const s = m.index, e = s + m[0].length;
          const fix = rule.caps ? gcApplyCase(m[0], rule.fix) : rule.fix;
          if (fix !== m[0]) raw.push({ s, e, orig: m[0], fix });
          if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
        }
      });
      GC_DOUBLE.lastIndex = 0; let d;
      while ((d = GC_DOUBLE.exec(text))) {
        const s = d.index, e = s + d[0].length;
        if (!GC_DOUBLE_OK.has(d[1].toLowerCase())) raw.push({ s, e, orig: d[0], fix: d[1] });
        if (d.index === GC_DOUBLE.lastIndex) GC_DOUBLE.lastIndex++;
      }
      raw.sort((a, b) => (b.e - b.s) - (a.e - a.s) || a.s - b.s);   // longest match first
      const hits = [];
      raw.forEach(h => { if (hits.every(x => h.e <= x.s || h.s >= x.e)) hits.push(h); });
      if (!hits.length) return;
      hits.sort((a, b) => a.s - b.s);
      const frag = document.createDocumentFragment(); let pos = 0;
      hits.forEach(h => {
        if (h.s > pos) frag.appendChild(document.createTextNode(text.slice(pos, h.s)));
        const span = document.createElement("span");
        span.className = "gc-mark"; span.setAttribute("data-fix", h.fix); span.setAttribute("data-orig", h.orig); span.textContent = h.orig;
        frag.appendChild(span); pos = h.e; count++;
      });
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
    if (count) toast(count + (count === 1 ? " suggestion. Tap the green word to fix it." : " suggestions. Tap a green word to fix it."));
    else toast("No grammar issues found. Looks clean.");
  }

  // A small popover offering the fix for one flagged word.
  let gcPop = null;
  function closeGrammarPop() { if (gcPop) { gcPop.remove(); gcPop = null; } }
  function openGrammarPop(mark) {
    closeGrammarPop();
    // If the writer has since edited this word, the stored fix is stale — quietly
    // drop the mark instead of offering a wrong suggestion.
    if ((mark.textContent || "") !== (mark.getAttribute("data-orig") || "")) {
      mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
      const ed = $("#we-body"); if (ed) ed.normalize();
      return;
    }
    const fix = mark.getAttribute("data-fix") || "";
    gcPop = document.createElement("div"); gcPop.className = "gc-pop";
    gcPop.innerHTML = `<span class="gc-pop__lead">Change to</span>` +
      `<button class="gc-pop__fix" data-gc-apply>${esc(fix)}</button>` +
      `<button class="gc-pop__ignore" data-gc-ignore>Ignore</button>`;
    document.body.appendChild(gcPop);
    const r = mark.getBoundingClientRect(); const pw = gcPop.offsetWidth, ph = gcPop.offsetHeight;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
    let top = r.top - ph - 8; if (top < 8) top = r.bottom + 8;
    top = Math.max(8, Math.min(top, window.innerHeight - ph - 8));   // keep it fully on screen
    gcPop.style.left = left + "px"; gcPop.style.top = top + "px";
    gcPop.querySelector("[data-gc-apply]").addEventListener("click", () => {
      mark.parentNode.replaceChild(document.createTextNode(fix), mark);
      const ed = $("#we-body"); if (ed) { ed.normalize(); updateEditorEmpty(); markEditorDirty(); }
      closeGrammarPop();
    });
    gcPop.querySelector("[data-gc-ignore]").addEventListener("click", () => {
      mark.parentNode.replaceChild(document.createTextNode(mark.textContent), mark);
      const ed = $("#we-body"); if (ed) ed.normalize();
      closeGrammarPop();
    });
  }

  // Toolbar: apply formatting to the current selection in the editor. Uses the
  // browser's built-in rich-text editing; the DOM it produces is serialized
  // back to Markdown on save (editorHtmlToMd).
  function applyFormat(kind) {
    const ed = $("#we-body");
    if (!ed) return;
    ed.focus();
    const exec = (cmd, val) => { try { document.execCommand(cmd, false, val); } catch (e) {} };
    if (kind === "bold") exec("bold");
    else if (kind === "italic") exec("italic");
    else if (kind === "underline") exec("underline");
    else if (kind === "highlight") applyHighlight();
    else if (kind === "fs-inc" || kind === "fs-dec") {
      nudgeFontSize(kind === "fs-inc" ? 1 : -1);
    }
    else if (kind === "align-left") exec("justifyLeft");
    else if (kind === "align-center") exec("justifyCenter");
    else if (kind === "align-right") exec("justifyRight");
    else if (kind === "dictate") toggleDictation();
    else if (kind === "grammar") runGrammarCheck();
    else if (kind === "h2") toggleBlock("h2");
    else if (kind === "quote") toggleBlock("blockquote");
    else if (kind === "ul") exec("insertUnorderedList");
    else if (kind === "ol") exec("insertOrderedList");
    else if (kind === "hr") exec("insertHorizontalRule");
    else if (kind === "link") {
      const url = (window.prompt("Link address", "https://") || "").trim();
      if (!url || url === "https://") return;
      if (/^(https?:|mailto:)/i.test(url)) exec("createLink", url);
      else toast("Links need to start with https:// or mailto:");
    }
    else if (kind === "image") {
      // Image uploads a picture from the device (phone, laptop) the same way a
      // cover does. Embed, below, is the one that takes a link.
      if (!isLive()) { toast("Connect the site to upload images from your device."); return; }
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.addEventListener("change", async () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        toast("Uploading image...");
        try { const url = await WispDB.uploadCover(f); insertImage(url); toast("Image added to the chapter."); }
        catch (e) { toast((e && e.message) || "Could not upload the image."); }
      });
      inp.click();
    }
    else if (kind === "embed") {
      const url = (window.prompt("Embed address: a YouTube or Vimeo link, a Google Maps or OpenStreetMap embed URL, or a Spotify link.", "https://") || "").trim();
      if (!url || url === "https://") return;
      if (!/^https:\/\//i.test(url)) { toast("Embeds need to start with https://"); return; }
      if (!embedInfo(url)) toast("That address will show as a link. Interactive embeds support YouTube, Vimeo, Google Maps, OpenStreetMap, and Spotify.");
      const label = (window.prompt("Label (optional)", "") || "").trim();
      insertEmbedBlock("@[" + label + "](" + url + ")");
      if (embedInfo(url)) toast("Embed added. It shows as a player in Preview and for readers.");
    }
  }
  // Wrap the current selection in a highlight (or clear it if already highlighted).
  // Which block element a node sits in, so an inline format stays within one.
  function editorBlockOf(node, ed) {
    while (node && node !== ed) {
      if (node.nodeType === 1 && /^(P|DIV|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(node.nodeName)) return node;
      node = node.parentNode;
    }
    return ed;
  }
  // Wrap the current selection in an inline tag+class (highlight, font size).
  // Toggles off if the selection already carries it, stays inside one paragraph,
  // and never leaves an empty wrapper behind (those were the stray colored bars).
  function wrapSelectionInline(tag, cls, sameBlockMsg) {
    const ed = $("#we-body"); if (!ed) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { toast("Select some text first."); return; }
    const range = sel.getRangeAt(0);
    if (editorBlockOf(range.startContainer, ed) !== editorBlockOf(range.endContainer, ed)) { toast(sameBlockMsg || "Format one paragraph at a time."); return; }
    let anc = range.commonAncestorContainer; if (anc && anc.nodeType === 3) anc = anc.parentNode;
    const sel1 = tag + (cls ? "." + cls : "");
    const existing = anc && anc.closest ? anc.closest(sel1) : null;
    try {
      if (existing) {
        const parent = existing.parentNode;
        while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
        parent.removeChild(existing);
      } else {
        const el = document.createElement(tag); if (cls) el.className = cls;
        el.appendChild(range.extractContents()); range.insertNode(el);
      }
    } catch (e) { toast(sameBlockMsg || "Try selecting within one paragraph."); }
    // Sweep any empty inline wrappers so no thin colored slivers are left behind.
    ed.querySelectorAll("mark.hl, span.fs-lg, span.fs-sm, u").forEach(m => {
      if (!(m.textContent || "").trim()) { const p = m.parentNode; if (!p) return; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); }
    });
    if (ed.normalize) ed.normalize();
    sel.removeAllRanges();
    updateEditorEmpty();
  }
  function applyHighlight() { wrapSelectionInline("mark", "hl", "Highlight one paragraph at a time."); }

  // The editor's live selection is easy to lose the moment a toolbar button
  // takes focus (especially on a phone, where tapping a button blurs the field).
  // Remember the last real selection inside the editor so size nudges can act on
  // it even after the caret has technically left.
  let lastEditorRange = null;
  function rememberEditorSelection() {
    const ed = $("#we-body"); if (!ed) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount && sel.anchorNode && ed.contains(sel.anchorNode)) {
      try { lastEditorRange = sel.getRangeAt(0).cloneRange(); } catch (e) {}
    }
  }
  function restoreEditorSelection() {
    const ed = $("#we-body"); if (!ed) return false;
    const sel = window.getSelection();
    if (sel && sel.anchorNode && ed.contains(sel.anchorNode)) return true;   // still live
    if (lastEditorRange && ed.contains(lastEditorRange.startContainer)) {
      try { sel.removeAllRanges(); sel.addRange(lastEditorRange); return true; } catch (e) {}
    }
    return false;
  }
  // A bare caret should resize the whole word it sits in, the way clicking into a
  // word and nudging the size does in a word processor — no manual selecting.
  function expandSelectionToWord(sel, ed) {
    if (!sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    let node = r.startContainer, off = r.startOffset;
    if (node.nodeType !== 3) {
      const t = node.childNodes[off] || node.childNodes[off - 1];
      if (t && t.nodeType === 3) { node = t; off = node.nodeValue.length; } else return;
    }
    const text = node.nodeValue || "";
    let start = Math.min(off, text.length), end = start;
    const isWord = (ch) => !!ch && !/\s/.test(ch);
    while (start > 0 && isWord(text[start - 1])) start--;
    while (end < text.length && isWord(text[end])) end++;
    if (end > start) {
      const nr = document.createRange(); nr.setStart(node, start); nr.setEnd(node, end);
      sel.removeAllRanges(); sel.addRange(nr);
    }
  }
  // The size the next nudge should start from: the selected text's real size (or
  // the word under the caret), falling back to the size box.
  function currentEditorFontSize() {
    const ed = $("#we-body"), inp = $("#we-fontsize");
    const fallback = inp ? (Math.round(+inp.value) || 18) : 18;
    restoreEditorSelection();
    const sel = window.getSelection();
    if (!ed || !sel || !sel.anchorNode || !ed.contains(sel.anchorNode)) return fallback;
    let n = sel.anchorNode; if (n.nodeType === 3) n = n.parentNode;
    if (!n || !ed.contains(n)) return fallback;
    const fs = parseFloat(getComputedStyle(n).fontSize);
    return fs ? Math.round(fs) : fallback;
  }
  // Google-Docs style: set an exact point size on the selected text (or the word
  // under the caret), and keep that text selected so the writer can keep nudging
  // −/+ without reselecting each time.
  function applyFontSize(px) {
    const ed = $("#we-body"); if (!ed) return;
    px = Math.max(8, Math.min(96, Math.round(+px || 18)));
    restoreEditorSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) { toast("Place your cursor in a word, or select text, to resize."); return; }
    if (sel.isCollapsed) expandSelectionToWord(sel, ed);
    if (sel.isCollapsed || !sel.toString().trim()) { toast("Place your cursor in a word, or select text, to resize."); return; }
    const range = sel.getRangeAt(0);
    if (editorBlockOf(range.startContainer, ed) !== editorBlockOf(range.endContainer, ed)) { toast("Resize within one paragraph at a time."); return; }
    let anc = range.commonAncestorContainer; if (anc && anc.nodeType === 3) anc = anc.parentNode;
    const existing = anc && anc.closest ? anc.closest("span[style*='font-size']") : null;
    let target = null;
    try {
      if (existing && (existing.textContent || "") === sel.toString()) {
        existing.style.fontSize = px + "px"; target = existing;
      } else {
        const span = document.createElement("span"); span.style.fontSize = px + "px";
        span.appendChild(range.extractContents()); range.insertNode(span); target = span;
      }
    } catch (e) { toast("Try selecting within one paragraph."); return; }
    ed.querySelectorAll("span[style*='font-size']").forEach(s => { if (!(s.textContent || "").trim()) { const p = s.parentNode; if (!p) return; while (s.firstChild) p.insertBefore(s.firstChild, s); p.removeChild(s); } });
    if (ed.normalize) ed.normalize();
    // Reselect the resized text so the next nudge lands on the same words.
    if (target && target.parentNode) {
      try { const r2 = document.createRange(); r2.selectNodeContents(target); sel.removeAllRanges(); sel.addRange(r2); rememberEditorSelection(); } catch (e) {}
    }
    const inp = $("#we-fontsize"); if (inp) inp.value = px;
    updateEditorEmpty();
  }
  // Nudge the current selection (or word) up/down a point, keeping it selected.
  function nudgeFontSize(delta) {
    const v = Math.max(8, Math.min(96, currentEditorFontSize() + (delta > 0 ? 1 : -1)));
    applyFontSize(v);
  }
  // Reflect the size of whatever is selected back into the size box, like Docs.
  function syncFontSizeBox() {
    const inp = $("#we-fontsize"); const ed = $("#we-body"); if (!inp || !ed) return;
    rememberEditorSelection();
    const sel = window.getSelection(); if (!sel || !sel.anchorNode) return;
    let n = sel.anchorNode; if (n.nodeType === 3) n = n.parentNode;
    if (!n || !ed.contains(n)) return;
    const fs = parseFloat(getComputedStyle(n).fontSize);
    if (fs && !inp.matches(":focus")) inp.value = Math.round(fs);
  }
  // Dictation: speak and it types. Uses the browser's speech recognition; the
  // mic button toggles it on and off.
  function isIOS() {
    return /iP(hone|ad|od)/i.test(navigator.userAgent) ||
      (/Mac/.test(navigator.platform || "") && (navigator.maxTouchPoints || 0) > 1);
  }
  // Drop the caret at the end of the editor so bringing the keyboard up starts
  // typing where the writer left off.
  function placeCaretAtEditorEnd(ed) {
    try {
      ed.focus();
      const sel = window.getSelection(); if (!sel) return;
      if (sel.anchorNode && ed.contains(sel.anchorNode)) return;   // already inside
      const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
    } catch (e) {}
  }
  function toggleDictation() {
    const ed = $("#we-body"); if (!ed) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // iOS (all its browsers are WebKit) has no Web Speech API — but the on-screen
      // keyboard has a mic key that dictates into any field. Bring the keyboard up
      // and point the writer at it, rather than a dead "unsupported" message.
      placeCaretAtEditorEnd(ed);
      toast(isIOS()
        ? "Tap the microphone key on your keyboard to dictate straight into your chapter."
        : "This browser has no built-in dictation. Try Chrome on a computer, or your keyboard's mic key.");
      return;
    }
    const btn = $("#we-dictate");
    if (dictation) { try { dictation.stop(); } catch (e) {} return; }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false; rec.continuous = true;
    dictation = rec;
    if (btn) btn.classList.add("is-on");
    toast("Listening. Speak and it types. Tap the mic again to stop.");
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) {
        ed.focus();
        const lead = ed.textContent && ed.textContent.trim() ? " " : "";
        try { document.execCommand("insertText", false, lead + text.trim()); } catch (er) {}
        updateEditorEmpty();
      }
    };
    rec.onerror = (e) => { toast(e && e.error === "not-allowed" ? "Microphone access was blocked." : "Dictation stopped."); };
    rec.onend = () => { dictation = null; if (btn) btn.classList.remove("is-on"); };
    try { rec.start(); } catch (e) { dictation = null; if (btn) btn.classList.remove("is-on"); toast("Could not start dictation."); }
  }
  // Insert a Markdown embed line as its own paragraph, so it round-trips to a
  // standalone block and renders as an embed in the preview and the reader.
  function insertEmbedBlock(text) {
    const ed = $("#we-body"); if (!ed) return;
    ed.focus();
    try { document.execCommand("insertHTML", false, "<p>" + esc(text) + "</p>"); }
    catch (e) { const p = document.createElement("p"); p.textContent = text; ed.appendChild(p); }
    updateEditorEmpty();
  }
  // Drop an uploaded image straight into the chapter as a real picture the way
  // Wattpad does: the writer sees the image, not a line of ![](...) text. It is
  // an atomic, non-editable block; on save it serializes back to ![alt](url).
  function insertImage(url, alt) {
    const ed = $("#we-body"); if (!ed) return;
    ed.focus();
    const html = `<figure class="embed embed--img is-full" data-size="full" contenteditable="false"><img src="${esc(url)}" alt="${esc(alt || "")}" loading="lazy" decoding="async"></figure><p><br></p>`;
    try { document.execCommand("insertHTML", false, html); }
    catch (e) {
      const fig = document.createElement("figure"); fig.className = "embed embed--img is-full"; fig.setAttribute("data-size", "full"); fig.setAttribute("contenteditable", "false");
      const im = document.createElement("img"); im.src = url; im.alt = alt || ""; fig.appendChild(im);
      ed.appendChild(fig); ed.appendChild(document.createElement("p"));
    }
    decorateEditorImages();
    updateEditorEmpty();
  }
  // Give every image in the editor its hover controls (scale small/medium/full,
  // and remove). Runs after insert and after a saved chapter loads, so images
  // that came back from Markdown get the same controls a freshly added one has.
  function decorateEditorImages() {
    const ed = $("#we-body"); if (!ed) return;
    ed.querySelectorAll("figure.embed--img").forEach(fig => {
      fig.setAttribute("contenteditable", "false");
      if (!fig.getAttribute("data-size")) fig.setAttribute("data-size", fig.classList.contains("is-small") ? "small" : fig.classList.contains("is-medium") ? "medium" : "full");
      if (!/\bis-(small|medium|full)\b/.test(fig.className)) fig.classList.add("is-" + (fig.getAttribute("data-size") || "full"));
      if (!fig.querySelector(".img-tools")) {
        const tools = document.createElement("div");
        tools.className = "img-tools"; tools.setAttribute("contenteditable", "false");
        tools.innerHTML =
          `<button type="button" class="img-tool" data-img-size="small" title="Small">S</button>` +
          `<button type="button" class="img-tool" data-img-size="medium" title="Medium">M</button>` +
          `<button type="button" class="img-tool" data-img-size="full" title="Full width">L</button>` +
          `<button type="button" class="img-tool img-tool--del" data-img-del title="Remove image">${icon("trash", 13)}</button>`;
        fig.appendChild(tools);
      }
    });
  }

  // Rich embeds (video, map, audio players) and link cards are atomic blocks the
  // same way inserted images are: the writer must not be able to click into the
  // player and type text that then vanishes on save. Mark them non-editable and
  // guarantee an editable paragraph after every embed so the caret always has a
  // place to land below it. Runs on editor load and after each insert.
  function decorateEditorEmbeds() {
    const ed = $("#we-body"); if (!ed) return;
    const BLK = /^(p|div|h[1-6]|ul|ol|blockquote|pre)$/;
    ed.querySelectorAll("figure.embed--rich, a.embed--link").forEach(el => {
      el.setAttribute("contenteditable", "false");
    });
    ed.querySelectorAll("figure.embed, a.embed--link").forEach(el => {
      const nx = el.nextElementSibling;
      if (!nx || !BLK.test(nx.nodeName.toLowerCase())) {
        const p = document.createElement("p"); p.appendChild(document.createElement("br"));
        el.parentNode.insertBefore(p, el.nextSibling);
      }
    });
  }

  // formatBlock toggles a block between the given tag and a plain paragraph.
  function toggleBlock(tag) {
    let cur = "";
    try { cur = (document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, ""); } catch (e) {}
    try { document.execCommand("formatBlock", false, cur === tag ? "p" : tag); } catch (e) {}
  }

  // Preview: render the editor's current content exactly as the reader will see it.
  function openPreview() {
    const ed = $("#we-body");
    const titleEl = $("#we-title");
    const title = (titleEl && titleEl.value.trim()) || "Untitled";
    const blocks = ed ? mdToHtmlBlocks(editorHtmlToMd(ed)) : [];
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h2 style="font-size:20px">Preview</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="prose prose--preview">
        <h1 class="reader__title" style="margin:0 0 18px">${esc(title)}</h1>
        ${blocks.length ? blocks.join("") : `<p class="muted">Nothing to preview yet. Write something first.</p>`}
      </div>
      <div class="modal-actions" style="margin-top:16px">
        <button class="btn btn--primary" data-modal-cancel>Back to writing</button>
      </div>`, "Preview");
  }

  // The header save indicator. It reflects real state now: dirty while there are
  // unsaved edits, saving during a write, saved once the draft is on the server.
  function setSaveFlag(state) {
    const el = document.getElementById("we-saveflag"); if (!el) return;
    const spin = '<span class="sf-spin" aria-hidden="true"></span>';
    const dot = '<span class="sf-dot" aria-hidden="true"></span>';
    const warn = '<span class="sf-warn" aria-hidden="true">!</span>';
    const map = {
      idle:   [icon("check", 14), "Not saved yet", "is-idle"],
      dirty:  [dot, "Unsaved changes…", "is-dirty"],
      saving: [spin, "Saving…", "is-saving"],
      saved:  [icon("check", 14), "Saved", "is-saved"],
      error:  [warn, "Couldn't save — will retry", "is-error"],
      local:  [icon("check", 14), "Kept on this device", "is-idle"]
    };
    const row = map[state] || map.idle;
    el.className = "save-flag " + row[2];
    el.innerHTML = row[0] + " " + row[1];
  }

  // Debounced autosave so a writer never loses a chapter by navigating away. The
  // static "Saved" flag used to lie; now edits schedule a real draft write.
  let autosaveTimer = null, autosaveBusy = false;
  function scheduleAutosave(delay) {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => { autosaveTimer = null; autosaveNow(); }, delay == null ? 1400 : delay);
  }
  function markEditorDirty() {
    if (!$("#we-body") && editorFormat !== "comic") return;   // not on the editor
    setSaveFlag("dirty");
    scheduleAutosave();
  }
  async function autosaveNow() {
    if (autosaveBusy) { scheduleAutosave(400); return; }        // a write is in flight; retry soon
    if (!$("#screen-write .writer")) return;                    // left the editor
    if (!window.WispDB || !WispDB.enabled || !WispDB.signedIn) { setSaveFlag("local"); return; }
    autosaveBusy = true;
    try { await persistEditor("draft", null, { silent: true }); }
    finally { autosaveBusy = false; }
  }
  // Flush a pending autosave immediately (leaving the editor, hiding the tab).
  function flushAutosave() {
    if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; autosaveNow(); }
  }

  function handlePublish(kind, scheduleTime) { return persistEditor(kind, scheduleTime, { silent: false }); }

  // The one place a work is written. Manual saves (Publish / Save draft / Schedule)
  // toast and return to the dashboard; a silent autosave writes a draft quietly,
  // keeps the writer in the editor, and adopts a freshly created work so the next
  // autosave updates it instead of spawning duplicates.
  async function persistEditor(kind, scheduleTime, opts) {
    opts = opts || {};
    const silent = !!opts.silent;
    if (!window.WispDB || !WispDB.enabled) {
      if (silent) { setSaveFlag("local"); return; }
      toast(kind === "schedule" ? "Scheduling needs the backend. Connect Supabase to schedule releases."
        : kind === "draft" ? "Saved as a draft. Connect Supabase to save it for real."
        : "Chapter published. Connect Supabase to save it for real.");
      return;
    }
    if (!WispDB.signedIn) { if (silent) { setSaveFlag("local"); return; } openAuth("in"); return; }
    const val = (id) => { const e = $(id); return e ? e.value.trim() : ""; };
    const rawTitle = val("#we-title");
    const title = rawTitle || "Untitled";
    const format = editorFormat === "comic" ? "comic" : "prose";
    let body;
    if (format === "comic") {
      if (!silent && kind === "publish" && !editorPages.length) { toast("Add at least one page before you publish."); return; }
      body = editorPages.join("\n");
    } else {
      const bodyEl = $("#we-body"); body = bodyEl ? editorHtmlToMd(bodyEl) : "";
      if (!silent && kind === "publish" && !body.trim()) { toast("Write something before you publish this chapter."); return; }
    }
    // Nothing worth an autosave yet: a brand-new, still-empty work. Don't spawn a
    // phantom "Untitled" with no words.
    if (silent && !(liveEditor && liveEditor.work) && !rawTitle && !body.trim()) { setSaveFlag("idle"); return; }
    if (silent) setSaveFlag("saving");
    const typeBtn = $("#screen-write [data-wtype].is-on"); const type = typeBtn ? typeBtn.dataset.wtype : "original";
    const rateBtn = $("#screen-write [data-wrate].is-on"); const rating = rateBtn ? rateBtn.dataset.wrate : "G";
    const tags = val("#we-tags").split(",").map(s => s.trim()).filter(Boolean);
    const warnings = $$("#screen-write [data-warn]:checked").map(el => el.dataset.warn);
    const chk = (id) => { const e = $(id); return e ? !!e.checked : undefined; };
    const controls = { comments_enabled: chk("#we-comments"), logged_in_only: chk("#we-loggedin"), hide_stats: chk("#we-hidestats") };
    const source = val("#we-source");
    const schedule = composeScheduleMulti($$("#we-sched-list [data-sr]").map(row => ({
      day: (row.querySelector(".sr-day") || {}).value || "",
      time: (row.querySelector(".sr-time") || {}).value || ""
    })));
    const seriesName = val("#we-series");
    const scheduled_for = kind === "schedule" ? scheduleTime : null;
    // "Save draft" (and autosave) on an already-published work saves changes without
    // pulling it back to draft; only new works and existing drafts become drafts.
    const wasPublished = liveEditor && liveEditor.work &&
      (liveEditor.work._dbStatus === "ongoing" || liveEditor.work._dbStatus === "complete");
    let status = kind === "schedule" ? "scheduled"
      : kind === "draft" ? (wasPublished ? liveEditor.work._dbStatus : "draft")
      : "ongoing";
    const wStatusBtn = $("#screen-write [data-wstatus].is-on");
    const wStatusSel = wStatusBtn ? wStatusBtn.dataset.wstatus : "ongoing";
    if (status === "ongoing" || status === "complete") status = wStatusSel === "complete" ? "complete" : "ongoing";
    // A silent autosave never changes whether the chapter is published; a manual
    // publish does. Preserve the loaded chapter's published state during autosave.
    const chapterPublished = silent
      ? !!(liveEditor && liveEditor.chapter && liveEditor.chapter.published)
      : (kind === "publish");
    try {
      let series_id = null;
      if (seriesName) {
        const s = await WispDB.findOrCreateSeries(seriesName, { type, source });
        series_id = s ? s.id : null;
      }

      if (liveEditor && liveEditor.work) {
        const id = liveEditor.work.id;
        const fields = { title, type, source, rating, status, series_id, warnings, format, schedule,
          comments_enabled: controls.comments_enabled, logged_in_only: controls.logged_in_only, hide_stats: controls.hide_stats };
        if (editorCover) fields.cover_image_url = editorCover;
        else if (coverCleared) fields.cover_image_url = null;   // revert to the letter cover
        await WispDB.updateWork(id, fields);
        await WispDB.saveChapter(id, {
          id: liveEditor.chapter ? liveEditor.chapter.id : null,
          number: liveEditor.chapter ? liveEditor.chapter.number : 1,
          title: liveEditor.chapter ? liveEditor.chapter.title : "",
          body, published: chapterPublished, scheduled_for
        });
        await WispDB.setTags(id, tags);
        if (liveEditor.chapter) liveEditor.chapter.published = chapterPublished;
        if (!silent) toast(kind === "schedule" ? "Scheduled. It releases " + fmtEasternStamp(scheduled_for) + "."
          : kind === "draft" ? (wasPublished ? "Changes saved." : "Draft saved.") : "Changes published.");
      } else {
        let book_number;
        if (series_id) book_number = (await WispDB.countInSeries(series_id).catch(() => 0)) + 1;
        const created = await WispDB.createWork({ title, type, source, rating, tags, warnings, chapterBody: body, status, format, schedule,
          cover_image_url: editorCover, series_id, book_number, scheduled_for,
          comments_enabled: controls.comments_enabled, logged_in_only: controls.logged_in_only, hide_stats: controls.hide_stats });
        if (silent && created && created.id) {
          // Adopt the new work so every later autosave updates this same draft.
          const ch = await WispDB.firstChapter(created.id).catch(() => null);
          created._dbStatus = created.status;
          liveEditor = { work: created, chapter: ch, allChapters: ch ? [ch] : [], seriesName: seriesName || "" };
          try { history.replaceState(null, "", "#/write/" + created.id + "/1"); } catch (e) {}
        } else if (!silent) {
          toast(kind === "schedule" ? "Scheduled. It releases " + fmtEasternStamp(scheduled_for) + "."
            : kind === "draft" ? "Draft saved to your account." : "Published. It is now in your works.");
        }
      }
      if (silent) { setSaveFlag("saved"); }
      else { liveEditor = null; editorCover = null; navigate("write"); }
    } catch (e) {
      console.error("[wisp] save failed:", e);
      if (silent) setSaveFlag("error");
      else toast((e && e.message) || "Could not save. Please try again.");
    }
  }

  // Ask for a release time, then schedule the chapter for it.
  function openScheduleDialog() {
    if (isLive() && !WispDB.signedIn) { openAuth("in"); return; }
    // Default suggestion: tomorrow, same Eastern clock time, formatted for the input.
    const easternVal = toEasternInputValue(new Date(Date.now() + 86400000));
    openModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h2 style="font-size:20px">Schedule this chapter</h2>
        <button class="drawer__close" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <p class="muted" style="font-size:13px;margin-bottom:14px">Readers see the chapter as locked with a live countdown until this time; then it releases on its own. Times are Eastern (ET), so the release lands at the same clock time for every reader.</p>
      <div class="field"><label>Release date and time (Eastern Time)</label><input type="datetime-local" id="sched-when" value="${easternVal}"><p class="muted" id="sched-echo" style="font-size:12px;margin:6px 0 0"></p></div>
      <div class="modal-actions">
        <button class="btn btn--quiet" data-modal-cancel>Cancel</button>
        <button class="btn btn--primary" data-sched-go>Schedule release</button>
      </div>`, "Schedule this chapter");
    // Echo the picked time back as an explicit ET stamp so there is no ambiguity.
    const echo = () => { const el = $("#sched-echo"); const raw = $("#sched-when").value;
      el.textContent = raw ? "Releases " + fmtEasternStamp(easternWallToInstant(raw).toISOString()) : ""; };
    $("#sched-when").addEventListener("input", echo); echo();
    $("#modalCard [data-sched-go]").addEventListener("click", () => {
      const raw = $("#sched-when").value;
      if (!raw) { toast("Pick a date and time."); return; }
      const when = easternWallToInstant(raw);
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
    const TRIGGER = 72, WHEEL_TRIGGER = 110, MAX = 110;
    let startY = 0, pulling = false, dist = 0, refreshing = false, wheelIdle = null;
    // Mouse wheels report deltas in lines (deltaMode 1) or pages (2), not pixels,
    // so normalize to pixels or the threshold is never reached on a mouse.
    const wheelPx = (e) => e.deltaMode === 1 ? e.deltaY * 16
      : e.deltaMode === 2 ? e.deltaY * (main.clientHeight || 800) : e.deltaY;

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
      const dy = wheelPx(e);
      if (dy < 0) {                                    // scrolling up while already at the top
        setPull(dist + (-dy) * 0.6);
        clearTimeout(wheelIdle);
        if (dist >= WHEEL_TRIGGER) { refresh(); return; }
        wheelIdle = setTimeout(reset, 600);            // let a burst of scrolls accumulate
      }
    }, { passive: true });
  }

  // Collapsible rails: a reader can hide the Activity or Widgets panel to give the
  // page the full width, the way many apps let you tuck a sidebar away. The choice
  // is remembered on this device.
  function railHidden(side) { try { return localStorage.getItem("wisp.rail." + side) === "hidden"; } catch (e) { return false; } }
  function setRailHidden(side, hidden) {
    try { localStorage.setItem("wisp.rail." + side, hidden ? "hidden" : "shown"); } catch (e) {}
    document.body.classList.toggle("hide-rail-" + side, hidden);
  }
  function applyRailPrefs() {
    document.body.classList.toggle("hide-rail-left", railHidden("left"));
    document.body.classList.toggle("hide-rail-right", railHidden("right"));
  }
  function wireRailToggles() {
    applyRailPrefs();
    $$("[data-rail-hide]").forEach(b => b.addEventListener("click", () => {
      const s = b.dataset.railHide; setRailHidden(s, true);
      toast((s === "left" ? "Activity" : "Widgets") + " hidden. Use the tab on the edge to bring it back.");
    }));
    $$("[data-rail-show]").forEach(b => b.addEventListener("click", () => setRailHidden(b.dataset.railShow, false)));
  }

  function boot() {
    (settings.muted || []).forEach(t => userState.mutedTags.add(t));       // restore prefs
    (settings.blocked || []).forEach(a => userState.blockedUsers.add(a));
    buildDrawer();
    applySettings();
    renderActivity();
    renderWidgets();
    restoreMiniEffects();       // bring back ambient widgets (petals, focus) the reader left on

    // Header and chrome.
    $("#themeBtn").addEventListener("click", openTheme);
    $("#safeModeFlag") && $("#safeModeFlag").addEventListener("click", toggleSafeMode);
    $("#themeClose").addEventListener("click", closeTheme);
    $("#themeScrim").addEventListener("click", (e) => { if (e.target.id === "themeScrim") closeTheme(); });
    $("#signOutBtn").addEventListener("click", () => {
      if (!window.WispDB || !WispDB.enabled) { toast("Sign out isn't wired up in demo mode. Connect Supabase to enable accounts."); return; }
      if (WispDB.signedIn) WispDB.signOut().then(() => { guestBrowsing = false; toast("Signed out."); updateAuthGate(); });
      else openAuth("in");
    });
    $("#notifBtn").addEventListener("click", (e) => { e.stopPropagation(); toggleNotifPop(); });
    $("#railSheet").addEventListener("click", (e) => { if (e.target.id === "railSheet" || e.target.closest("[data-railclose]")) closeOverlay($("#railSheet")); });
    $("#menuBtn").addEventListener("click", openSheet);
    $("#navSheet").addEventListener("click", (e) => { if (e.target.id === "navSheet") closeSheet(); });

    // Search: type and press Enter to browse.
    const runSearch = (val) => {
      filterState.q = (val || "").trim();
      closeSheet();
      navigate("browse");
      if (location.hash.includes("browse")) refreshBrowse();
    };
    const si = $("#searchInput");
    si.addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(si.value); });
    // Mobile menu search: wire the same way, plus the on-screen keyboard's search
    // key ("search" event) so tapping Go actually runs the search.
    const sim = $("#searchInputMobile");
    if (sim) {
      sim.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(sim.value); } });
      sim.addEventListener("search", () => runSearch(sim.value));
    }

    // Esc closes overlays.
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeModal(); closeTheme(); closeSheet(); }
    });

    // Owner-only admin panel: hold Shift and press S and D together.
    const adminChord = new Set();
    document.addEventListener("keydown", (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.code === "KeyS" || e.code === "KeyD") adminChord.add(e.code);
      if (e.shiftKey && adminChord.has("KeyS") && adminChord.has("KeyD")) { adminChord.clear(); openAdminPanel(); }
    });
    document.addEventListener("keyup", (e) => { adminChord.delete(e.code); });
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

    window.addEventListener("hashchange", route);
    // Best-effort: flush a pending draft autosave if the tab is hidden or closed.
    window.addEventListener("pagehide", flushAutosave);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushAutosave(); });
    wirePullToRefresh();
    wireRailToggles();
    // Dismiss the grammar suggestion popover on an outside tap or a scroll.
    document.addEventListener("click", (e) => { if (gcPop && !e.target.closest(".gc-pop") && !e.target.closest(".gc-mark")) closeGrammarPop(); }, true);
    window.addEventListener("scroll", () => closeGrammarPop(), true);
    initTips();
    if (!location.hash) location.replace("#/home");
    route();

    // Connect the backend if config.js has credentials; otherwise stay in demo.
    if (window.WispDB) {
      // Cover the app with a quiet branded splash the moment a backend is
      // configured, before the async connection resolves, so it never flashes
      // underneath and an already-signed-in reader never sees the sign-in form.
      if (WispDB.configured) renderAuthGate(true);
      WispDB.onChange(syncAuthHeader);
      WispDB.onChange(mwSyncFromAccount);   // pull the account's widget station (and companion) across devices
      document.addEventListener("wisp-companion-changed", () => mwPersistRemote());   // sync Lucky's look across devices
      // A password-reset link lands the reader back here with a recovery
      // session: show the "set a new password" screen when that happens.
      WispDB.onRecovery(openSetNewPassword);
      WispDB.init().then(() => {
        syncAuthHeader();
        // If the connection failed (demo fallback), don't leave the splash up.
        if (!WispDB.enabled) hideAuthGate();
        // Catch a recovery event that fired during init, before the subscription.
        if (WispDB.enabled && WispDB.pendingRecovery) openSetNewPassword();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
