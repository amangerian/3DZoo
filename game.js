/* 3D Zoo — game engine: map, exhibits, animals, guests, staff, economy, saving. */
(function () {
  'use strict';
  const Z = window.ZooAnimals, A = window.ZooArt;

  // ---------- constants ----------
  const VERSION = '1.6';    // bump with every release (also in index.html: the header and the ?v= on each script)
  const T = 32, MW = 48, MH = 32, DAY = 60;          // tile px, map size, seconds per in-game day
  const ENT = { x: Math.floor(MW / 2), y: MH - 1 };
  const GRASS = 0, PATH = 1, FENCE = 2, SNOW = 3, TANK = 4, MESH = 5;   // SNOW and TANK are exhibit floors; MESH is aviary fencing
  const isGround = t => t === GRASS || t === SNOW || t === TANK;
  const isFence = t => t === FENCE || t === MESH;
  const COST = { path: 10, fence: 25, mesh: 40, snow: 40, tank: 150, tree: 150, acacia: 170, palm: 180, pine: 160, bush: 60, water: 200,
    toy: 120, wheel: 300, post: 90, gift: 2500, edu: 4000 };
  // Every kind of tree counts as a "tree" and every toy as a "toy" for what animals want.
  // ('tree' is the oak and 'toy' is the ball, so older saves keep working.)
  const KIND = { tree: 'tree', acacia: 'tree', palm: 'tree', pine: 'tree', toy: 'toy', wheel: 'toy', post: 'toy' };
  const ITEM_NAME = { tree: 'oak tree', acacia: 'acacia tree', palm: 'palm tree', pine: 'pine tree', bush: 'bush', water: 'pond',
    toy: 'ball', wheel: 'exercise wheel', post: 'scratching post', snow: 'snow', tank: 'aquarium tank', mesh: 'aviary mesh' };
  const ITEMS = ['tree', 'acacia', 'palm', 'pine', 'bush', 'water', 'toy', 'wheel', 'post'];
  // Favorite kinds of tree and toy. Having one in the exhibit makes an animal a little happier.
  const FAVORITE = {
    lion: ['acacia', 'post'], elephant: ['acacia', 'toy'], giraffe: ['acacia'], zebra: ['acacia'], penguin: ['toy'],
    bear: ['pine', 'post'], monkey: ['palm', 'wheel'], flamingo: ['palm'], snowleopard: ['pine', 'wheel'],
    ostrich: ['acacia'], seahawk: ['pine'], hippo: ['toy'], anaconda: ['palm'], rhino: ['acacia', 'post'],
    polarbear: ['pine', 'toy'], shark: [], orca: ['toy'], triceratops: ['palm'], basilisk: [], unicorn: ['tree', 'wheel'],
    parrot: ['palm', 'toy'], toucan: ['palm'], owl: ['pine', 'tree'], eagle: ['pine'],
  };
  const FLYERS = new Set(['seahawk', 'parrot', 'toucan', 'owl', 'eagle']);   // can only live in an aviary
  const AQUATIC = new Set(['shark', 'orca']);                         // live only in aquarium tank water
  const SPECIALIST = new Set(['shark', 'orca', 'triceratops', 'basilisk', 'unicorn']);   // need a keeper with skill 3+
  const SPECIALIST_SKILL = 3;
  // Species that share the African savanna in the wild can share an exhibit. Everyone else lives with their own kind.
  const SAVANNA = ['zebra', 'giraffe', 'ostrich', 'rhino', 'elephant', 'hippo'];
  const RAINFOREST_BIRDS = ['parrot', 'toucan'];
  const canShare = (a, b) => a === b || (SAVANNA.includes(a) && SAVANNA.includes(b)) || (RAINFOREST_BIRDS.includes(a) && RAINFOREST_BIRDS.includes(b));
  const HUNGER_RATE = { anaconda: 0.4, basilisk: 0.5, orca: 1.3 };
  const BUILDINGS = {
    gift: { name: 'Gift shop', upkeep: 30, job: 'Sells stuffed animals of the animals guests liked best' },
    edu: { name: 'Education center', upkeep: 40, job: 'Teaches guests about the animals, so they enjoy the exhibits more' },
  };
  const PLUSH_PRICE = 15, PLUSH_COST = 6;            // stuffed animal sale price and what it costs the zoo
  // What each species eats, and what one portion costs (babies eat half portions).
  const DIET = {
    lion: { kind: 'meat', food: 'meat', cost: 25 }, elephant: { kind: 'hay', food: 'hay and fruit', cost: 30 },
    giraffe: { kind: 'leaves', food: 'leafy branches', cost: 15 }, zebra: { kind: 'hay', food: 'hay', cost: 8 },
    penguin: { kind: 'fish', food: 'fish', cost: 6 }, bear: { kind: 'fish', food: 'fish and berries', cost: 18 },
    monkey: { kind: 'fruit', food: 'fruit', cost: 6 }, flamingo: { kind: 'shrimp', food: 'shrimp pellets', cost: 5 },
    snowleopard: { kind: 'meat', food: 'meat', cost: 22 },
    ostrich: { kind: 'hay', food: 'greens and pellets', cost: 7 }, seahawk: { kind: 'fish', food: 'fish', cost: 8 },
    hippo: { kind: 'hay', food: 'grass and hay', cost: 20 }, anaconda: { kind: 'meat', food: 'whole prey', cost: 15 },
    rhino: { kind: 'hay', food: 'hay and browse', cost: 22 }, polarbear: { kind: 'fish', food: 'fish and meat', cost: 28 },
    shark: { kind: 'fish', food: 'fish', cost: 60 }, orca: { kind: 'fish', food: 'fish', cost: 120 },
    triceratops: { kind: 'leaves', food: 'ferns and leafy branches', cost: 35 }, basilisk: { kind: 'meat', food: 'whole prey', cost: 40 },
    unicorn: { kind: 'fruit', food: 'apples and wildflowers', cost: 25 },
    parrot: { kind: 'fruit', food: 'fruit and nuts', cost: 5 }, toucan: { kind: 'fruit', food: 'fruit', cost: 6 },
    owl: { kind: 'meat', food: 'mice', cost: 8 }, eagle: { kind: 'fish', food: 'fish', cost: 12 },
  };
  // One fact per species for the education center (kept to well-established facts).
  const FACTS = {
    lion: 'Lions are the only big cats that live in family groups, called prides.',
    elephant: 'Elephants drink by sucking water up their trunks and squirting it into their mouths.',
    giraffe: 'A giraffe has seven neck bones, the same number as a person.',
    zebra: 'No two zebras have exactly the same stripe pattern.',
    penguin: 'Penguins can\'t fly through the air, but their flippers let them "fly" underwater.',
    bear: 'Most bears are omnivores and eat plants, berries, insects, and fish.',
    monkey: 'Some monkeys from the Americas can grab branches with their tails.',
    flamingo: 'Flamingos get their pink color from pigments in the food they eat.',
    snowleopard: 'Snow leopards use their long, thick tails for balance and wrap them around themselves for warmth.',
    ostrich: 'Ostriches are the largest birds alive and lay the biggest eggs of any living bird.',
    seahawk: 'Ospreys, also called sea hawks, dive feet-first into the water to catch fish, which make up almost all of what they eat.',
    hippo: 'Hippos can\'t really swim. They walk or bounce along the bottom of rivers and lakes.',
    anaconda: 'Green anacondas are the heaviest snakes in the world.',
    rhino: 'A rhino\'s horn is made of keratin, the same material as your fingernails.',
    polarbear: 'Under its white fur, a polar bear\'s skin is black.',
    shark: 'Sharks have no bones. Their skeletons are made of cartilage.',
    orca: 'Orcas are the largest members of the dolphin family.',
    triceratops: 'Triceratops lived about 68 to 66 million years ago, near the very end of the age of dinosaurs.',
    basilisk: 'In old legends the basilisk was the "king of serpents." Its name comes from the Greek for "little king."',
    unicorn: 'The unicorn is Scotland\'s national animal.',
    parrot: 'Many large parrots, like macaws, can live for more than 50 years.',
    toucan: 'A toucan\'s huge bill is surprisingly light. Inside, it is a honeycomb of bone and air.',
    owl: 'Owls can\'t move their eyes, so they turn their heads instead, as far as about 270 degrees.',
    eagle: 'Bald eagles build some of the largest nests of any bird in North America.',
  };
  const MAX_SKILL = 5;
  const wageOf = s => Math.round(STAFF[s.type].wage * (1 + 0.3 * ((s.skill || 1) - 1)));     // better-trained staff earn more
  const trainCost = s => 150 * Math.pow((s.skill || 1) + 1, 2);                              // $600, $1,350, $2,400, $3,750
  const RANK = {
    keeper: ['Trainee keeper', 'Keeper', 'Senior keeper', 'Expert keeper', 'Head keeper'],
    janitor: ['Trainee janitor', 'Janitor', 'Senior janitor', 'Lead janitor', 'Head custodian'],
  };
  const rankOf = s => RANK[s.type][(s.skill || 1) - 1];
  const SKILL_PERKS = {
    keeper: { 2: 'Faster', 3: 'Can care for sharks, orcas, and rare animals', 4: 'Plays with the animals after feeding them', 5: 'Fastest' },
    janitor: { 2: 'Faster', 3: 'Faster', 4: 'Faster', 5: 'Sweeps the tiles around them too' },
  };
  const STAFF = {
    janitor: { name: 'Janitor', hire: 500, wage: 60, job: 'Sweeps litter off the paths' },
    keeper: { name: 'Keeper', hire: 800, wage: 90, job: 'Feeds animals and cleans exhibits' },
  };
  // Movement speed (px/s) and space each adult needs (tiles) for every species.
  const SPEC = {
    lion: { speed: 14, space: 6 }, elephant: { speed: 10, space: 10 }, giraffe: { speed: 13, space: 8 },
    zebra: { speed: 15, space: 5 }, penguin: { speed: 8, space: 2 }, bear: { speed: 11, space: 6 },
    monkey: { speed: 16, space: 3 }, flamingo: { speed: 10, space: 2 }, snowleopard: { speed: 14, space: 6 },
    ostrich: { speed: 20, space: 5 }, seahawk: { speed: 18, space: 3 }, hippo: { speed: 9, space: 9 }, anaconda: { speed: 7, space: 4 },
    rhino: { speed: 11, space: 9 }, polarbear: { speed: 11, space: 8 }, shark: { speed: 16, space: 25 }, orca: { speed: 18, space: 45 },
    triceratops: { speed: 9, space: 12 }, basilisk: { speed: 8, space: 10 }, unicorn: { speed: 16, space: 7 },
    parrot: { speed: 18, space: 2 }, toucan: { speed: 18, space: 2 }, owl: { speed: 16, space: 3 }, eagle: { speed: 18, space: 5 },
  };
  const WORLD_SCALE = 0.34;
  const GROW_DAYS = 4;
  const SELL_ADULT = 0.15, SELL_BABY = 0.1;          // selling returns only a small fraction
  const GROUP = 2;              // each walking figure is a pair of visitors, so busy days don't jam the paths
  const MAX_GUESTS = 1000;      // visitors (so up to 500 figures)
  // Zoo stars. Each level needs every goal met at once (guests = best single day). Earned stars are never lost.
  const STARS = [null,
    { need: [], animals: ['zebra', 'penguin', 'flamingo', 'monkey'],
      tools: ['path', 'fence', 'snow', 'tree', 'acacia', 'palm', 'pine', 'bush', 'water', 'toy', 'wheel', 'post', 'remove'] },
    { need: [['rating', 65], ['guests', 45], ['crowd', 30]], animals: ['giraffe', 'bear', 'ostrich', 'seahawk', 'parrot'], tools: ['gift', 'mesh'], color: 'Grass, trees, and bushes turn green' },
    { need: [['rating', 70], ['species', 4], ['births', 1], ['guests', 80], ['crowd', 55]], animals: ['lion', 'snowleopard', 'hippo', 'anaconda', 'toucan', 'owl'], tools: ['edu'], color: 'Water turns blue' },
    { need: [['rating', 75], ['species', 5], ['guests', 120], ['crowd', 85]], animals: ['elephant', 'rhino', 'polarbear', 'eagle'], tools: [], color: 'Paths, fences, and buildings get their colors' },
    { need: [['rating', 80], ['species', 8], ['guests', 170], ['crowd', 120]], animals: ['shark', 'orca'], tools: ['tank'], color: 'Animals in color (art still to come)' },
    { need: [['rating', 85], ['species', 14], ['guests', 260], ['crowd', 180], ['births', 30]], animals: [], tools: [], mystery: true },
  ];
  // Secret animals never show in the shop or the star list until their unlock is found.
  const SECRETS = {
    triceratops: { msg: 'Paleontologists visiting the education center were so taken with your rhinos that they arranged something extraordinary. A triceratops is now in the Animals tab!',
      test: () => S.stars >= 6 && hasBuilding('edu') && S.animals.filter(a => a.sp === 'rhino').length >= 4
        && exStats().some(x => [...x.species].filter(sp => SAVANNA.includes(sp)).length >= 4) },
    basilisk: { msg: 'One of the anaconda eggs looked... different. Something ancient is now in the Animals tab.',
      test: () => S.stars >= 6 && (S.bornBy.anaconda || 0) >= 4 },
    unicorn: { msg: 'A perfect day at the zoo! Something magical has appeared in the Animals tab.',
      test: () => S.stars >= 6 && S.animals.length >= 30 && S.animals.every(a => a.happy >= 88 && !a.loose) && S.rep >= 86 && Object.values(S.litter).reduce((t, n) => t + n, 0) <= 5 },
  };
  const MAX_STARS = STARS.length - 1;
  // Bump this whenever the star goals change: saved zoos are then re-checked against the new goals when they load.
  const STAR_RULES = 2;
  const GOAL = {
    rating: { label: n => `Rating ${n}`, have: () => Math.round(S.rep) },
    guests: { label: n => `${n} guests in one day`, have: () => Math.max(S.today.guests, ...S.history.map(h => h.guests || 0)) },
    species: { label: n => `${n} different species`, have: () => new Set(S.animals.map(a => a.sp)).size },
    births: { label: n => n > 1 ? `${n} babies born` : 'A baby born', have: () => S.totals.births || 0 },
    crowd: { label: n => `${n} guests in the zoo at once`, have: () => Math.max(S.peakGuests || 0, guests.length * GROUP) },
  };
  // Which color layers are on at each star level.
  const COLOR_AT = { plants: 2, water: 3, built: 4 };
  const SAVE_KEY = '3dzoo-save-v1';
  const ITEM_CHAR = { tree: 't', bush: 'b', water: 'w', toy: 'y', gift: 'g', edu: 'e', acacia: 'a', palm: 'p', pine: 'n', wheel: 'h', post: 'r' };
  const CHAR_ITEM = Object.fromEntries(Object.entries(ITEM_CHAR).map(([k, v]) => [v, k]));
  const NAMES = ['Mabel', 'Otis', 'Pip', 'Juniper', 'Hank', 'Clementine', 'Biscuit', 'Rosie', 'Gus', 'Waffles', 'Luna',
    'Moose', 'Pickles', 'Daisy', 'Ziggy', 'Noodle', 'Fern', 'Bruno', 'Olive', 'Tater', 'Winnie', 'Rocco', 'Peanut', 'Hazel',
    'Ivy', 'Bean', 'Maple', 'Duke', 'Poppy', 'Nugget', 'Sage', 'Theo', 'Willow', 'Banjo', 'Cocoa', 'Remy'];

  const idx = (x, y) => y * MW + x;
  const tx = i => i % MW, ty = i => (i / MW) | 0;
  const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
  const center = i => ({ x: tx(i) * T + T / 2, y: ty(i) * T + T / 2 });
  const tileAt = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); return inMap(cx, cy) ? idx(cx, cy) : -1; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function neighbors(i) {
    const x = tx(i), y = ty(i), out = [];
    for (const [dx, dy] of N4) if (inMap(x + dx, y + dy)) out.push(idx(x + dx, y + dy));
    return out;
  }
  const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
  const approved = (sp, baby) => !!(Z.APPROVED[sp] && Z.APPROVED[sp][baby ? 'baby' : 'adult']);
  const plural = sp => Z.SPECIES[sp].name.toLowerCase() + 's';
  const INCOME = { tickets: 'Tickets', gifts: 'Gift shop', sales: 'Animal sales' };
  const COSTS = { staff: 'Staff', food: 'Animal food', build: 'Building and upkeep', animals: 'Buying animals', merch: 'Gift shop stock' };
  const newToday = () => ({ guests: 0, births: 0, eduVisits: 0, plush: 0, tickets: 0, gifts: 0, sales: 0,
    staff: 0, food: 0, build: 0, animals: 0, merch: 0 });
  const sumOf = (t, cats) => Object.keys(cats).reduce((s, k) => s + (t[k] || 0), 0);

  // ---------- state ----------
  let S = null;                 // saved game state
  let EX = [];                  // exhibits (derived from the map)
  let exOf = new Int16Array(MW * MH).fill(-1);
  let viewOf = [];              // path tile -> exhibits a guest can see from there
  let gateOf = [];              // fence tile -> exhibits a keeper can step into from a path
  let guests = [];              // guests are not saved; the park refills on load
  let selected = null;          // inspected entity or tile
  const view = { x: 0, y: 0, zoom: 1.2 };
  let tool = 'look', toolSpecies = null;
  let lastExStats = [];

  function newState() {
    const tiles = new Array(MW * MH).fill(GRASS);
    for (let y = MH - 1; y >= MH - 6; y--) tiles[idx(ENT.x, y)] = PATH;
    return {
      v: 1, starRules: STAR_RULES, money: 15000, stars: 1, secrets: {}, peakGuests: 0, bornBy: {}, day: 1, time: 0, speed: 1, ticket: 15, rep: 50,
      tiles, items: new Array(MW * MH).fill(null), animals: [], staff: [],
      litter: {}, poop: {}, food: {}, nextId: 1, log: [], arrivalAcc: 0,
      today: newToday(), totals: { guests: 0, births: 0 }, history: [], comments: {}, plushSales: {},
    };
  }

  // ---------- log & toasts ----------
  function log(msg) {
    S.log.unshift({ d: S.day, m: msg });
    S.log.length = Math.min(S.log.length, 40);
    if (newsMin) newsUnread++;
    renderNews();
  }
  function spend(cat, n) { S.money -= n; S.today[cat] = (S.today[cat] || 0) + n; }
  function earn(cat, n) { S.money += n; S.today[cat] = (S.today[cat] || 0) + n; }
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- exhibits ----------
  // An exhibit is a patch of land completely enclosed by fences (not touching the map edge or a path).
  function recompute(fix = true) {
    exOf.fill(-1); EX = []; viewOf = new Array(MW * MH); gateOf = new Array(MW * MH);
    const seen = new Uint8Array(MW * MH);
    for (let s = 0; s < MW * MH; s++) {
      if (seen[s] || !isGround(S.tiles[s])) continue;
      const region = [s]; seen[s] = 1; let open = false;
      for (let k = 0; k < region.length; k++) {
        const i = region[k], x = tx(i), y = ty(i);
        if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) open = true;
        for (const n of neighbors(i)) {
          if (seen[n]) continue;
          if (S.tiles[n] === PATH) { open = true; continue; }
          if (!isGround(S.tiles[n])) continue;
          seen[n] = 1; region.push(n);
        }
      }
      if (open || region.length > 500) continue;
      const id = EX.length, items = { tree: 0, bush: 0, water: 0, toy: 0 }, kinds = {};
      region.forEach(i => { exOf[i] = id; const it = S.items[i]; if (it) { kinds[it] = (kinds[it] || 0) + 1; items[KIND[it] || it]++; } });
      const tankTiles = region.filter(i => S.tiles[i] === TANK), landTiles = region.filter(i => S.tiles[i] !== TANK);
      const snow = landTiles.filter(i => S.tiles[i] === SNOW).length;
      items.snow = landTiles.length && snow >= landTiles.length * 0.5 ? 1 : 0;     // snowy if at least half the land is snow
      items.tank = tankTiles.length >= 12 ? 1 : 0;                                  // a proper aquarium tank
      const edge = new Set(); region.forEach(i => neighbors(i).forEach(n => { if (isFence(S.tiles[n])) edge.add(n); }));
      const aviary = edge.size > 0 && [...edge].every(n => S.tiles[n] === MESH);
      EX.push({ id, tiles: region, items, kinds, tankTiles, landTiles, snow, aviary });
    }
    // what guests can see from each path tile (within 2 tiles), and keeper gates
    EX.forEach(E => {
      const vs = new Set();
      E.tiles.forEach(i => {
        const x = tx(i), y = ty(i);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (!inMap(x + dx, y + dy)) continue;
          const j = idx(x + dx, y + dy);
          if (S.tiles[j] === PATH && !vs.has(j)) { vs.add(j); (viewOf[j] = viewOf[j] || []).push(E.id); }
        }
      });
      E.view = [...vs];
      const wall = new Map();                     // fence tile -> steps from the exhibit
      let ring = []; E.tiles.forEach(i => neighbors(i).forEach(n => { if (isFence(S.tiles[n]) && !wall.has(n)) { wall.set(n, 1); ring.push(n); } }));
      for (let d = 2; d <= 3 && ring.length; d++) {
        const next = [];
        ring.forEach(f => neighbors(f).forEach(n => { if (isFence(S.tiles[n]) && !wall.has(n)) { wall.set(n, d); next.push(n); } }));
        ring = next;
      }
      const outside = m => S.tiles[m] === PATH || (isGround(S.tiles[m]) && S.tiles[m] !== TANK && exOf[m] < 0);
      E.entries = [];
      wall.forEach((d, f) => {
        (gateOf[f] = gateOf[f] || []).includes(E.id) || gateOf[f].push(E.id);
        if (neighbors(f).some(outside)) E.entries.push(f);
      });
      E.reachable = E.entries.length > 0;
      // keepers put food just inside the way in nearest a path, on a clear tile if there is one
      const near = (i, list) => list.reduce((m, f) => Math.min(m, Math.abs(tx(i) - tx(f)) + Math.abs(ty(i) - ty(f))), 99);
      const pathEntries = E.entries.filter(f => neighbors(f).some(m => S.tiles[m] === PATH));
      const doors = pathEntries.length ? pathEntries : E.entries;
      const byGate = E.tiles.filter(i => neighbors(i).some(n => wall.get(n) === 1)).sort((a, b) => near(a, doors) - near(b, doors));
      const clear = t => !S.items[t] || KIND[S.items[t]] === 'toy';
      const pick = list => byGate.filter(i => list.includes(i)).find(clear) ?? list.find(clear) ?? list[0];
      E.feedTile = E.landTiles.length ? pick(E.landTiles) : pick(E.tankTiles);       // land animals' food
      E.feedTileTank = E.tankTiles.length ? pick(E.tankTiles) : E.feedTile;          // fish for the tank
    });
    if (fix) fixEntities();
  }

  function fixEntities() {
    // Animals: keep each one inside an exhibit; nudge it if a fence landed on it.
    S.animals = S.animals.filter(a => {
      const i = tileAt(a.x, a.y);
      a.ledBy = null; a.transit = false;
      if (i >= 0 && exOf[i] >= 0) { a.ex = exOf[i]; a.loose = false; return true; }
      // a fence went up right on top of it: step onto the exhibit side
      const n = i >= 0 && isFence(S.tiles[i]) ? neighbors(i).find(j => exOf[j] >= 0 && ((S.tiles[j] === TANK) === AQUATIC.has(a.sp))) : undefined;
      if (n !== undefined) { const c = center(n); a.x = c.x; a.y = c.y; a.ex = exOf[n]; a.path = []; a.loose = false; return true; }
      if (AQUATIC.has(a.sp)) { log(`${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} had no tank left and was sent to another zoo.`); return false; }
      if (!a.loose) {
        a.loose = true; a.ex = -1; a.path = []; a.act = null; a.wait = 0.5;
        log(`${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} got out! A keeper will lead it back to an exhibit.`);
      }
      return true;
    });
    // Staff walk out to a path and rethink their job.
    S.staff.forEach(s => {
      s.path = []; s.workT = 0;
      const i = tileAt(s.x, s.y);
      if (s.type === 'keeper') { s.state = 'leave'; s.ex = i >= 0 ? exOf[i] : -1; s.catching = null; }
      if (i < 0 || (s.type === 'janitor' ? S.tiles[i] !== PATH : S.tiles[i] === TANK && exOf[i] < 0)) warpToEntrance(s);
    });
    // Guests standing where a path was removed just head home.
    guests = guests.filter(g => { const i = tileAt(g.x, g.y); return i >= 0 && S.tiles[i] === PATH; });
  }

  function warpToEntrance(e) { const c = center(idx(ENT.x, ENT.y)); e.x = c.x; e.y = c.y; e.path = []; }

  // ---------- pathfinding ----------
  // Breadth-first search over tiles. Returns tile indices from the step after start to the goal.
  function bfs(start, pass, goal, maxDepth = 9999) {
    if (start < 0) return null;
    if (goal(start)) return [];
    const prev = new Int32Array(MW * MH).fill(-2), depth = new Int16Array(MW * MH);
    prev[start] = -1; const q = [start];
    for (let k = 0; k < q.length; k++) {
      const i = q[k];
      if (depth[i] >= maxDepth) continue;
      for (const n of neighbors(i)) {
        if (prev[n] !== -2 || !pass(n)) continue;
        prev[n] = i; depth[n] = depth[i] + 1;
        if (goal(n)) { const out = []; for (let j = n; j !== start; j = prev[j]) out.unshift(j); return out; }
        q.push(n);
      }
    }
    return null;
  }
  const toPoints = (tiles, jitter = 0) => tiles.map((i, k) => {
    const c = center(i);
    if (jitter && k === tiles.length - 1) { c.x += (Math.random() - 0.5) * jitter; c.y += (Math.random() - 0.5) * jitter; }
    return c;
  });

  // Move an entity along its path; returns distance moved (drives the walk animation).
  function stepAlong(e, dist) {
    let moved = 0;
    while (dist > 0 && e.path.length) {
      const p = e.path[0], dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);
      // mostly up or down the screen: face away from or toward the camera; otherwise side-on
      if (Math.abs(dy) > Math.abs(dx) * 1.2 && d > 0.5) e.view = dy > 0 ? 'front' : 'back';
      else if (Math.abs(dx) > 0.5) { e.view = 'side'; e.facing = dx > 0 ? 1 : -1; }
      if (d <= dist) { e.x = p.x; e.y = p.y; e.path.shift(); dist -= d; moved += d; }
      else { e.x += dx / d * dist; e.y += dy / d * dist; moved += dist; dist = 0; }
    }
    return moved;
  }

  // ---------- animals ----------
  function makeAnimal(sp, x, y, baby) {
    const used = new Set(S.animals.map(a => a.name));
    const free = NAMES.filter(n => !used.has(n));
    const name = (free.length ? free : NAMES)[Math.floor(Math.random() * (free.length || NAMES.length))];
    return { id: S.nextId++, sp, baby: !!baby, age: 0, x, y, path: [], wait: Math.random() * 2, phase: Math.random() * 6,
      facing: Math.random() < 0.5 ? 1 : -1, hunger: 10, happy: 60, name, ex: -1, moving: false };
  }

  function exStats() {
    // per-exhibit totals used by happiness, feeding and breeding
    return EX.map(E => {
      const list = S.animals.filter(a => a.ex === E.id && !a.loose);
      const sp = a => SPEC[a.sp].space * (a.baby ? 0.5 : 1);
      const needLand = list.filter(a => !AQUATIC.has(a.sp)).reduce((s, a) => s + sp(a), 0);
      const needTank = list.filter(a => AQUATIC.has(a.sp)).reduce((s, a) => s + sp(a), 0);
      const need = needLand + needTank;
      const poop = E.tiles.reduce((s, i) => s + (S.poop[i] || 0), 0);
      const food = {};
      E.tiles.forEach(i => { if (S.food[i]) Object.entries(S.food[i]).forEach(([sp, n]) => { food[sp] = (food[sp] || 0) + n; }); });
      const species = new Set(list.map(a => a.sp));
      return { list, need, needLand, needTank, poop, food, species,
        space: needLand ? Math.min(1, E.landTiles.length / needLand) : 1,
        spaceTank: needTank ? Math.min(1, E.tankTiles.length / needTank) : 1,
        mixed: [...species].filter(x => SAVANNA.includes(x)).length >= 2 || [...species].filter(x => RAINFOREST_BIRDS.includes(x)).length >= 2 };
    });
  }

  const skilledKeeper = () => S.staff.some(s => s.type === 'keeper' && (s.skill || 1) >= SPECIALIST_SKILL);
  const wantName = w => ({ tree: 'a tree', bush: 'a bush', water: 'a pond', toy: 'a toy', snow: 'a snowy floor', tank: 'an aquarium tank' }[w] || w);
  function happinessParts(a, st) {
    const sp = Z.SPECIES[a.sp];
    if (a.loose || !EX[a.ex]) return { wants: 0, have: [], missing: sp.wants, space: 1, food: 1 - clamp((a.hunger - 30) / 70, 0, 1), clean: 1, fun: 0, loose: true, notes: [] };
    const E = EX[a.ex], x = st[a.ex], aq = AQUATIC.has(a.sp);
    const have = sp.wants.filter(w => E.items[w] > 0);
    const fav = (FAVORITE[a.sp] || []).filter(k => E.kinds[k]);
    const notes = [];
    if (fav.length) notes.push(`Loves its ${fav.map(k => ITEM_NAME[k]).join(' and ')}`);
    if (x.mixed && SAVANNA.includes(a.sp)) notes.push('Enjoys sharing with other savanna animals');
    if (FLYERS.has(a.sp) && !E.aviary) notes.push('Needs an aviary (aviary mesh all the way around)');
    if (x.mixed && RAINFOREST_BIRDS.includes(a.sp) && x.species.size > 1) notes.push('Enjoys sharing with other rainforest birds');
    if (SPECIALIST.has(a.sp) && !skilledKeeper()) notes.push(`Needs a keeper trained to skill ${SPECIALIST_SKILL} or more`);
    const orcas = a.sp === 'orca' ? x.list.filter(o => o.sp === 'orca').length : 2;
    if (orcas < 2) notes.push('Lonely. Orcas need at least one other orca');
    return {
      wants: have.length / sp.wants.length, have, missing: sp.wants.filter(w => !E.items[w]),
      space: aq ? x.spaceTank * x.spaceTank : x.space,          // tank animals suffer much more from crowding
      food: 1 - clamp((a.hunger - 30) / 70, 0, 1),
      clean: Math.max(0, 1 - x.poop / Math.max(3, E.tiles.length * 0.15)),
      fun: a.fun || 0, aq, notes, lonely: orcas < 2,
      bonus: (fav.length ? 5 : 0) + (x.mixed && (SAVANNA.includes(a.sp) || RAINFOREST_BIRDS.includes(a.sp)) ? 5 : 0),
      grounded: FLYERS.has(a.sp) && !E.aviary,
    };
  }
  // Recent play and favorite things add a small bonus on top of the four needs.
  const happyTarget = p => {
    if (p.loose) return 35 + 25 * p.food;
    const base = p.aq ? 0.25 * p.wants + 0.35 * p.space + 0.25 * p.food + 0.15 * p.clean
      : 0.4 * p.wants + 0.2 * p.space + 0.2 * p.food + 0.2 * p.clean;
    const v = Math.min(100, 100 * base + 6 * p.fun + (p.bonus || 0));
    return p.grounded ? Math.min(40, v) : p.lonely ? Math.min(55, v) : v;
  };

  const foodTileFor = a => {
    const aq = AQUATIC.has(a.sp), mine = i => exOf[i] === a.ex && ((S.tiles[i] === TANK) === aq), here = tileAt(a.x, a.y);
    const piles = EX[a.ex].tiles.filter(i => S.food[i] && S.food[i][a.sp] > 0 && mine(i));
    return piles.find(p => p === here || bfs(here, mine, j => j === p));
  };
  const toyPlay = {};           // toy tile -> clock time its ball stops rolling (not saved)

  function updateAnimal(a, dt, st) {
    a.hunger = Math.min(100, a.hunger + dt * 100 / (DAY * 2) * (HUNGER_RATE[a.sp] || 1));
    a.age += dt / DAY;
    a.fun = Math.max(0, (a.fun || 0) - dt / DAY);
    if (a.baby && a.age >= GROW_DAYS) {
      a.baby = false;
      log(`${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} is all grown up.`);
    }
    if (Math.random() < dt * (a.baby ? 0.5 : 1.1) / DAY) {
      const i = tileAt(a.x, a.y);
      if (i >= 0 && exOf[i] >= 0) S.poop[i] = Math.min(6, (S.poop[i] || 0) + 1);
    }
    const target = happyTarget(happinessParts(a, st));
    a.happy += (target - a.happy) * Math.min(1, dt * 0.25);
    if (a.transit && (a.ledBy == null || !S.staff.some(s => s.id === a.ledBy))) a.transit = false;   // its keeper was let go
    if (a.loose || a.transit || !EX[a.ex]) { updateLoose(a, dt); return; }

    // eating or playing
    if (a.act) {
      a.actT -= dt;
      if (a.act === 'eat') {
        a.moving = false; a.hop = 0;
        if (a.actT <= 0) {
          const i = a.actTile, pile = S.food[i];
          if (pile && pile[a.sp] > 0) {
            pile[a.sp]--; if (!pile[a.sp]) delete pile[a.sp]; if (!Object.keys(pile).length) delete S.food[i];
            a.hunger = Math.max(0, a.hunger - 85);
          }
          a.act = null; a.wait = 1 + Math.random() * 2;
        }
      } else {
        if (a.toy === 'wheel') { a.moving = true; a.phase += dt * 9; a.hop = 2; a.view = 'side'; }            // running in the wheel
        else if (a.toy === 'post') { a.moving = false; a.hop = Math.abs(Math.sin(a.actT * 12)) * 1.5; a.view = 'side'; }   // a good scratch
        else { a.moving = true; a.phase += dt * 7; a.facing = Math.sin(a.actT * 4) > 0 ? 1 : -1; a.hop = Math.abs(Math.sin(a.actT * 7)) * 3; }
        if (a.actT <= 0) { a.act = null; a.hop = 0; a.fun = 1; a.wait = 1 + Math.random() * 2; }
      }
      return;
    }
    if (a.wait > 0) { a.wait -= dt; a.moving = false; return; }
    if (!a.path.length) {
      const E = EX[a.ex], here = tileAt(a.x, a.y);
      // land animals stay on land, tank animals stay in the water
      const aq = AQUATIC.has(a.sp), mine = i => exOf[i] === a.ex && ((S.tiles[i] === TANK) === aq);
      const pickOf = list => list[Math.floor(Math.random() * list.length)];
      let goalTile = -1; a.goal = null;
      const ft = a.hunger > 35 ? foodTileFor(a) : undefined;
      const toys = E.items.toy && a.hunger < 70 && Math.random() < 0.3 ? E.tiles.filter(i => KIND[S.items[i]] === 'toy' && mine(i)) : [];
      if (ft !== undefined && mine(ft)) { goalTile = ft; a.goal = 'food'; }
      else if (toys.length) { goalTile = pickOf(toys); a.goal = 'toy'; }
      else {
        const all = E.tiles.filter(mine), spots = all.filter(i => KIND[S.items[i]] !== 'tree' && S.items[i] !== 'water');
        goalTile = spots.length ? pickOf(spots) : all.length ? pickOf(all) : here;
      }
      a.goalTile = goalTile;
      if (goalTile === here && a.goal) { startAct(a, here); return; }
      const route = bfs(here, mine(here) ? mine : (i => exOf[i] === a.ex), i => i === goalTile);
      // wandering walks just the first few steps of the route, one tile at a time, so it never cuts across a fence
      if (route && route.length) a.path = toPoints(a.goal ? route : route.slice(0, 5), a.goal ? 10 : 14);
      a.wait = route && route.length ? 0 : 1 + Math.random() * 2;
      if (!a.path.length) return;
    }
    const moved = stepAlong(a, SPEC[a.sp].speed * (a.baby ? 0.85 : 1) * dt);
    a.phase += moved * (a.baby ? 0.75 : 0.5);
    a.moving = moved > 0;
    if (!a.path.length) {
      if (a.goal && tileAt(a.x, a.y) === a.goalTile) startAct(a, a.goalTile);
      else a.wait = 1 + Math.random() * 4;
    }
  }
  // An animal that got out of its exhibit wanders nearby until a keeper leads it back.
  function updateLoose(a, dt) {
    a.act = null; a.hop = 0; a.goal = null;
    const k = a.ledBy != null ? S.staff.find(s => s.id === a.ledBy) : null;
    if (k) {
      const tx = k.x - 11 * (k.facing || 1), ty = k.y + 2, dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (d > 2) {
        const step = Math.min(d, 60 * dt); a.x += dx / d * step; a.y += dy / d * step;
        if (Math.abs(dx) > 0.5) a.facing = dx > 0 ? 1 : -1;
        a.view = Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy > 0 ? 'front' : 'back') : 'side';
        a.moving = true; a.phase += step * 0.5;
      } else a.moving = false;
      return;
    }
    a.ledBy = null;
    if (a.wait > 0) { a.wait -= dt; a.moving = false; return; }
    if (!a.path.length) {
      const here = tileAt(a.x, a.y), opts = neighbors(here).filter(j => !isFence(S.tiles[j]) && exOf[j] < 0);
      if (!opts.length) { a.wait = 2; return; }
      a.path = toPoints([opts[Math.floor(Math.random() * opts.length)]], 12);
    }
    const moved = stepAlong(a, SPEC[a.sp].speed * 0.6 * dt);
    a.phase += moved * 0.5; a.moving = moved > 0;
    if (!a.path.length) a.wait = 1 + Math.random() * 3;
  }

  // Where should an escaped animal go? A reachable exhibit it can share, preferably with its own kind and room to spare.
  function homeFor(a) {
    const st = exStats(); let best = -1, bestScore = -Infinity;
    EX.forEach((E, id) => {
      if (!E.reachable || !E.landTiles.length || AQUATIC.has(a.sp) || (FLYERS.has(a.sp) && !E.aviary)) return;
      const x = st[id];
      if ([...x.species].some(o => !canShare(o, a.sp))) return;
      const room = E.landTiles.length - x.needLand - SPEC[a.sp].space * (a.baby ? 0.5 : 1);
      const score = (x.species.has(a.sp) ? 50 : 0) + (room >= 0 ? 100 : room) + Z.SPECIES[a.sp].wants.filter(w => E.items[w]).length * 5;
      if (score > bestScore) { bestScore = score; best = id; }
    });
    return best;
  }

  function startAct(a, i) {
    if (a.goal === 'food' && S.food[i] && S.food[i][a.sp] > 0) { a.act = 'eat'; a.actT = 3; a.actTile = i; }
    else if (a.goal === 'toy' && KIND[S.items[i]] === 'toy') {
      a.toy = S.items[i]; a.act = 'play'; a.actT = a.toy === 'wheel' ? 5 : a.toy === 'post' ? 3.5 : 4; toyPlay[i] = clock + a.actT;
      const c = center(i);
      if (a.toy === 'wheel') { a.x = c.x; a.y = c.y + 9; }                       // hop on
      if (a.toy === 'post') { a.facing = c.x >= a.x ? 1 : -1; }
    }
    a.goal = null;
  }

  function dailyBreeding(st) {
    EX.forEach((E, id) => {
      const x = st[id]; if (!x) return;
      const bySp = {};
      x.list.forEach(a => { (bySp[a.sp] = bySp[a.sp] || []).push(a); });
      Object.entries(bySp).forEach(([sp, list]) => {
        const adults = list.filter(a => !a.baby), babies = list.length - adults.length;
        if (adults.length < 2 || babies >= Math.max(1, Math.floor(adults.length / 2))) return;
        const avg = list.reduce((s, a) => s + a.happy, 0) / list.length;
        const roomy = E.tiles.length >= x.need + SPEC[sp].space * 0.5;
        if (!approved(sp, true)) {
          if (avg >= 70 && roomy && Math.random() < 0.3)
            log(`The ${plural(sp)} seem ready for a baby, but baby art is awaiting approval.`);
          return;
        }
        if (avg >= 70 && roomy && Math.random() < 0.3) {
          const mom = adults[Math.floor(Math.random() * adults.length)];
          const b = makeAnimal(sp, mom.x - 10, mom.y + 2, true); b.ex = id; b.happy = 80;
          S.animals.push(b); S.today.births++; S.totals.births++; S.bornBy[sp] = (S.bornBy[sp] || 0) + 1;
          log(`A baby ${Z.SPECIES[sp].name.toLowerCase()} named ${b.name} was born!`);
        }
      });
    });
  }

  // ---------- guests ----------
  // How long a guest stays: a short base visit plus a few seconds for each exhibit worth seeing.
  const exhibitsToSee = () => EX.filter(E => S.animals.some(a => a.ex === E.id && !a.loose)).length;
  const visitLength = () => DAY * 1.5;      // a safety net: guests normally leave when they've finished their plan
  // Guests on each path tile right now, refreshed every tick (used to spread the crowd out).
  let occ = new Uint16Array(MW * MH), watchers = new Uint16Array(MW * MH);
  function countGuests() {
    occ.fill(0); watchers.fill(0);
    guests.forEach(g => { if (g.inside) return; const i = tileAt(g.x, g.y); if (i < 0) return; occ[i]++; if (g.watch) watchers[i]++; });
  }
  // A guest's mood: what they've enjoyed (with a ceiling, so great animals can't hide a messy zoo)
  // minus what spoiled it: litter underfoot, dirty exhibits, and unhappy animals.
  function mood(g) {
    g.happy = clamp(g.base + Math.min(40, g.sights) + g.extra - g.litterPen - g.dirtyPen - g.sadPen, 0, 100);
  }
  function spawnGuest() {
    const c = center(idx(ENT.x, ENT.y));
    guests.push({ x: c.x + (Math.random() - 0.5) * 16, y: c.y, path: [], phase: Math.random() * 6, facing: 1,
      happy: 50, base: 50 - Math.max(0, S.ticket - 20) * 0.8,       // steep tickets put guests in a worse mood
      sights: 0, extra: 0, litterPen: 0, dirtyPen: 0, sadPen: 0,
      seen: new Set(), visits: new Map(), stay: visitLength(), leaving: false, lx: (Math.random() - 0.5) * 18, ly: (Math.random() - 0.5) * 18,
      litterT: 10 + Math.random() * 30, look: A.randomGuestLook(), moving: true,
      best: 0, fav: null, litterSeen: 0, rolled: new Set(), boost: 1 });
    earn('tickets', S.ticket * GROUP); S.today.guests += GROUP; S.totals.guests += GROUP;
  }

  function guestSees(g, i) {
    (viewOf[i] || []).forEach(eid => {
      if (g.seen.has(eid)) return;
      const list = S.animals.filter(a => a.ex === eid && !a.loose);
      if (!list.length) return;
      g.seen.add(eid);
      g.sawAnimals = true;
      const bySp = {};
      list.forEach(a => { bySp[a.sp] = (bySp[a.sp] || 0) + Z.SPECIES[a.sp].appeal * (a.happy / 100) * (a.baby ? 1.4 : 1); });
      Object.entries(bySp).forEach(([sp, v]) => { if (v > g.best) { g.best = v; g.fav = sp; } });
      g.sights += Math.min(14, Object.values(bySp).reduce((s, v) => s + v, 0) * 0.6) * g.boost;
      const avg = list.reduce((s, a) => s + a.happy, 0) / list.length;
      if (avg < 40) { g.sadPen += 8; g.sawSad = list[0].sp; }
      // droppings piling up in an exhibit put guests off
      const E = EX[eid], poop = E.tiles.reduce((t, j) => t + (S.poop[j] || 0), 0), dirt = poop / Math.max(3, E.tiles.length * 0.15);
      if (dirt > 0.8) { g.dirtyPen += Math.min(10, 8 * (dirt - 0.6)); g.sawDirty = true; }
      mood(g);
    });
  }

  // Guests next to a gift shop or education center may pop inside for a few seconds.
  // Each guest decides once per building; for the gift shop, only after they've found a favorite animal.
  function maybeVisit(g, i) {
    for (const n of neighbors(i)) {
      const it = S.items[n];
      if (!BUILDINGS[it] || g.rolled.has(n)) continue;
      if (it === 'gift' && (!g.fav || g.plush)) continue;
      if (it === 'edu' && (g.learned || g.leaving)) continue;
      g.rolled.add(n);
      if (it === 'gift' && Math.random() < 0.55) { g.inside = { i: n, type: it, t: 3 + Math.random() * 2 }; return true; }
      if (it === 'edu' && Math.random() < 0.45) { g.inside = { i: n, type: it, t: 4 + Math.random() * 2 }; return true; }
    }
    return false;
  }
  function leaveBuilding(g) {
    const b = g.inside; g.inside = null;
    if (b.type === 'gift') {
      earn('gifts', PLUSH_PRICE * GROUP); spend('merch', PLUSH_COST * GROUP);
      g.plush = g.fav; S.plushSales[g.fav] = (S.plushSales[g.fav] || 0) + GROUP; S.today.plush += GROUP;
      g.extra += 4; mood(g);
    } else {
      const here = [...new Set(S.animals.map(a => a.sp))];
      const pool = here.length ? here : Object.keys(FACTS);
      g.learned = pool[Math.floor(Math.random() * pool.length)];
      g.boost = 1.3; S.today.eduVisits += GROUP;
      g.extra += 6; mood(g);
    }
  }

  // Watching an exhibit from path tile i. A planned stop is a proper look; a glance on the way is quick.
  // Longer for their favorite or the animal they came to see, for babies, and for happy animals; short if the animals look unhappy.
  function watchAt(g, i, eid, planned) {
    g.watched = g.watched || new Set();
    const list = S.animals.filter(a => a.ex === eid && !a.loose);
    if (!list.length) return false;
    const again = g.watched.has(eid);
    g.watched.add(eid);
    let tgt = null, bd = Infinity;
    list.forEach(a => { const d = Math.hypot(a.x - g.x, a.y - g.y); if (d < bd) { bd = d; tgt = a; } });
    if (bd > T * 4) EX[eid].tiles.forEach(j => { const c = center(j), d = Math.hypot(c.x - g.x, c.y - g.y); if (d < bd) { bd = d; tgt = c; } });
    const dx = tgt.x - g.x, dy = tgt.y - g.y;
    if (Math.abs(dy) > Math.abs(dx)) g.view = dy < 0 ? 'back' : 'front';
    else { g.view = 'side'; g.facing = dx > 0 ? 1 : -1; }
    // step up to the rail, each in their own spot
    const c = center(i), side = (watchers[i] - 1.5) * 6 + (Math.random() - 0.5) * 3;
    if (g.view === 'side') { g.x = c.x + g.facing * 9; g.y = c.y + side; }
    else { g.y = c.y + (g.view === 'back' ? -9 : 9); g.x = c.x + side; }
    watchers[i]++;
    const sp = list.reduce((b, a) => Z.SPECIES[a.sp].appeal > Z.SPECIES[b.sp].appeal ? a : b).sp;
    const avg = list.reduce((s2, a) => s2 + a.happy, 0) / list.length;
    let t = planned ? 2 + Math.random() * 1.2 : 1 + Math.random() * 0.6;
    if (sp === g.fav || list.some(a => a.sp === g.wish)) t += 1.5;
    if (list.some(a => a.baby)) t += 1;
    if (avg < 40) t = 1 + Math.random();
    if (again) t *= 0.5;
    if (g.wish && !g.gotWish && list.some(a => a.sp === g.wish)) { g.gotWish = true; g.extra += 5; mood(g); }
    g.watch = { t: Math.min(7, t), ex: eid, sp, again };
    g.path = []; g.moving = false;
    return true;
  }

  function guestComments(g) {
    const out = [];
    if (g.fav) out.push(`Loved the ${plural(g.fav)}!`);
    if (g.wish && g.gotWish && g.wish !== g.fav) out.push(`Came to see the ${plural(g.wish)}, and did!`);
    if (g.wish && !g.gotWish && S.animals.some(a => a.sp === g.wish)) out.push(`Didn't get to see the ${plural(g.wish)}`);
    if (!g.sawAnimals) out.push('Not much to see yet');
    if (g.sawSad) out.push(`The ${plural(g.sawSad)} looked unhappy`);
    if (g.sawDirty) out.push('The exhibits were dirty');
    if (g.litterSeen >= 8) out.push('Too much litter on the paths');
    if (S.ticket > 25) out.push('Tickets are pricey');
    if (g.learned) out.push('Learned something new at the education center');
    if (g.plush) out.push(`Bought a stuffed ${Z.SPECIES[g.plush].name.toLowerCase()}!`);
    out.forEach(c => { S.comments[c] = (S.comments[c] || 0) + 1; });
  }

  // ---------- guest visits ----------
  // Every guest arrives hoping to see one animal in particular (popular animals are wished for more often), plus a few
  // other exhibits; the bigger the zoo, the more they plan to see. They visit them nearest-first, so they fan out into the
  // zoo instead of milling around the gate, and at each exhibit they head for the least crowded spot along its fence.
  // Then maybe the gift shop or education center, and home.
  const weightedIndex = ws => { let r = Math.random() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; } return ws.length - 1; };
  // Guests' routes along the paths: shortest, but a crowded tile counts as longer, so where the zoo has loops
  // people spread across them instead of all squeezing down the same path.
  function guestRoute(start, goal) {
    if (start < 0) return null;
    if (goal(start)) return [];
    const dist = new Float64Array(MW * MH).fill(Infinity), prev = new Int32Array(MW * MH).fill(-1);
    const heap = [[0, start]]; dist[start] = 0;
    const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p2 = (k - 1) >> 1; if (heap[p2][0] <= heap[k][0]) break; [heap[p2], heap[k]] = [heap[k], heap[p2]]; k = p2; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0;
      for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } }
      return top; };
    while (heap.length) {
      const [d, i] = pop();
      if (d > dist[i]) continue;
      if (i !== start && goal(i)) { const out = []; for (let j = i; j !== start; j = prev[j]) out.unshift(j); return out; }
      for (const n of neighbors(i)) {
        if (S.tiles[n] !== PATH) continue;
        const nd = d + 1 + 0.35 * occ[n];
        if (nd < dist[n]) { dist[n] = nd; prev[n] = i; push(nd, n); }
      }
    }
    return null;
  }
  function planVisit(g) {
    g.plan = []; g.planned = true;
    const shown = S.animals.filter(a => !a.loose && EX[a.ex] && EX[a.ex].view && EX[a.ex].view.length);
    if (!shown.length) return;
    const wish = shown[weightedIndex(shown.map(a => Math.pow(Z.SPECIES[a.sp].appeal, 2)))];
    g.wish = wish.sp;
    const ids = [...new Set(shown.map(a => a.ex))];
    const pull = id => shown.filter(a => a.ex === id).reduce((t, a) => t + Z.SPECIES[a.sp].appeal * (0.5 + a.happy / 200), 0);
    const want = Math.min(ids.length, 4, 1 + Math.round(ids.length * (0.1 + Math.random() * 0.2)));
    const chosen = [wish.ex], rest = ids.filter(id => id !== wish.ex);
    while (chosen.length < want && rest.length) chosen.push(rest.splice(weightedIndex(rest.map(pull)), 1)[0]);
    g.plan = chosen;
    g.wantEdu = hasBuilding('edu') && Math.random() < 0.4;
  }
  // The next leg: the nearest spot to view any exhibit still on the plan, preferring spots without a crowd at the rail.
  function nextLeg(g, i) {
    const want = new Set(g.plan.filter(id => EX[id] && EX[id].view));
    if (want.size) {
      const sees = j => (viewOf[j] || []).some(id => want.has(id));
      const r = guestRoute(i, j => sees(j) && watchers[j] < 3 && occ[j] < 6) || guestRoute(i, sees);
      if (r) { const end = r.length ? r[r.length - 1] : i; g.target = (viewOf[end] || []).find(id => want.has(id)); g.route = r; return true; }
      g.plan = [];                                     // can't get to any of them from here
    }
    if (g.fav && !g.plush && !g.shopped && hasBuilding('gift') && Math.random() < 0.55) {
      g.shopped = true;
      const r = guestRoute(i, j => neighbors(j).some(n => S.items[n] === 'gift'));
      if (r) { g.target = 'gift'; g.route = r; return true; }
    }
    if (g.wantEdu && !g.learned) {
      g.wantEdu = false;
      const r = guestRoute(i, j => neighbors(j).some(n => S.items[n] === 'edu'));
      if (r) { g.target = 'edu'; g.route = r; return true; }
    }
    return false;
  }
  function enterBuilding(g, i, type) {
    const n = neighbors(i).find(m => S.items[m] === type); if (n === undefined) return false;
    g.rolled.add(n);
    g.inside = { i: n, type, t: type === 'gift' ? 3 + Math.random() * 2 : 4 + Math.random() * 2 };
    return true;
  }

  function updateGuest(g, dt) {
    if (g.inside) { g.inside.t -= dt; if (g.inside.t <= 0) leaveBuilding(g); return; }
    if (g.watch) {
      g.watch.t -= dt; g.moving = false; g.stay -= dt;
      if (g.watch.t <= 0 || g.leaving) g.watch = null;
      return;
    }
    g.stay -= dt;
    if (!g.leaving && (g.stay <= 0 || g.happy < 15)) g.leaving = true;
    g.litterT -= dt;
    if (g.litterT <= 0) {
      g.litterT = 30 + Math.random() * 35;
      const i = tileAt(g.x, g.y);
      if (i >= 0 && S.tiles[i] === PATH && Math.random() < 0.32) S.litter[i] = Math.min(5, (S.litter[i] || 0) + 1);
    }
    if (!g.path.length) {
      const i = tileAt(g.x, g.y);
      if (!g.planned) planVisit(g);
      if (g.leaving) {
        if (i === idx(ENT.x, ENT.y)) { g.gone = true; return; }
        if (!g.route || !g.route.length || g.target !== 'exit') {
          const r = guestRoute(i, j => j === idx(ENT.x, ENT.y));
          if (!r) { g.gone = true; return; }
          g.route = r; g.target = 'exit';
        }
      } else {
        guestSees(g, i);
        if (S.litter[i]) { g.litterPen += 0.8 * S.litter[i]; g.litterSeen += S.litter[i]; mood(g); }
        // arrived where they were heading?
        if (g.target != null && (!g.route || !g.route.length)) {
          const t = g.target; g.target = null;
          if (t === 'gift' || t === 'edu') { if (enterBuilding(g, i, t)) return; }
          else {
            g.plan = g.plan.filter(id => id !== t);
            if (watchAt(g, i, t, true)) return;
          }
        }
        // on the way: a quick look at an exhibit they hadn't planned on, if there's room at the rail
        if (g.route && g.route.length && Math.random() < 0.08 && watchers[i] < 3) {
          const extra = (viewOf[i] || []).find(id => !g.plan.includes(id) && !(g.watched && g.watched.has(id)));
          if (extra !== undefined && watchAt(g, i, extra, false)) return;
        }
        if (!g.route || !g.route.length) { if (!nextLeg(g, i)) { g.leaving = true; return; } }
      }
      // take the next step along the route (it may have been cut by building work)
      let n = g.route.shift();
      if (n === undefined) return;
      if (S.tiles[n] !== PATH) { g.route = null; return; }
      const c = center(n); g.path = [{ x: c.x + g.lx, y: c.y + g.ly }];
    }
    const moved = stepAlong(g, (g.leaving ? 58 : 44) * dt);
    g.phase += moved * 0.45; g.moving = moved > 0;
  }

  // ---------- staff ----------
  function hire(type) {
    const d = STAFF[type];
    if (S.money < d.hire) { toast(`Not enough money to hire a ${d.name.toLowerCase()}.`); return; }
    spend('staff', d.hire);
    const c = center(idx(ENT.x, ENT.y));
    S.staff.push({ id: S.nextId++, type, x: c.x, y: c.y, path: [], phase: 0, facing: 1, workT: 0, state: 'idle', ex: -1, skill: 1,
      name: NAMES[Math.floor(Math.random() * NAMES.length)] });
    log(`Hired a ${d.name.toLowerCase()}.`);
    renderPanel();
  }

  function wander(s) {
    const i = tileAt(s.x, s.y);
    const opts = neighbors(i).filter(n => S.tiles[n] === PATH);
    if (opts.length) s.path = toPoints([opts[Math.floor(Math.random() * opts.length)]], 10);
    else s.workT = 1;
  }

  function updateJanitor(s, dt) {
    if (s.workT > 0) {
      s.workT -= dt; s.moving = false;
      if (s.workT <= 0 && s.sweeping) {
        const i = tileAt(s.x, s.y); delete S.litter[i]; s.sweeping = false;
        if (skillOf(s) >= 5) neighbors(i).forEach(n => { if (S.tiles[n] === PATH) delete S.litter[n]; });   // a master sweeper gets the tiles around too
      }
      return;
    }
    if (!s.path.length) {
      const i = tileAt(s.x, s.y);
      if (S.litter[i]) { s.workT = workTime(s, 0.8); s.sweeping = true; s.task = 'Sweeping'; return; }
      const r = bfs(i, j => S.tiles[j] === PATH, j => !!S.litter[j]);
      if (r) { s.path = toPoints(r); s.task = 'Heading to litter'; }
      else { s.task = 'Patrolling'; wander(s); }
    }
    const moved = stepAlong(s, staffSpeed(s) * dt); s.phase += moved * 0.45; s.moving = moved > 0;
  }

  const keeperPass = E => j => S.tiles[j] === PATH || openGround(j) || (exOf[j] === E && S.tiles[j] !== TANK) || (gateOf[j] && gateOf[j].includes(E));
  const anyPass = j => S.tiles[j] !== TANK;                  // last resort: keepers have keys to every gate
  // where a keeper stands to work on an exhibit: on its land, or at the gate of an all-water tank
  const workSpot = E => j => EX[E] && (EX[E].landTiles.length ? exOf[j] === E && S.tiles[j] !== TANK : isFence(S.tiles[j]) && neighbors(j).some(n => exOf[n] === E));
  const openGround = j => !isFence(S.tiles[j]) && exOf[j] < 0 && S.tiles[j] !== TANK;
  const skillOf = s => s.skill || 1;
  const staffSpeed = s => 38 * (1 + 0.15 * (skillOf(s) - 1));
  const workTime = (s, t) => t * (1 - 0.12 * (skillOf(s) - 1));
  const unreachableUntil = {};
  const nowT = () => S.day * DAY + S.time;

  // Portions each species in an exhibit still needs: hungry animals minus food already out.
  function foodNeeded(ex) {
    const st = exStats()[ex], need = {};
    if (!st) return need;
    st.list.filter(a => a.hunger > 15).forEach(a => {   // everyone who'll want a meal soon gets a portion
      const n = need[a.sp] || (need[a.sp] = { n: 0, cost: 0 });
      n.n++; n.cost += DIET[a.sp].cost * (a.baby ? 0.5 : 1);
    });
    Object.keys(need).forEach(sp => {
      const have = st.food[sp] || 0;
      if (have >= need[sp].n) { delete need[sp]; return; }
      const frac = (need[sp].n - have) / need[sp].n;
      need[sp].n -= have; need[sp].cost = Math.round(need[sp].cost * frac);
    });
    return need;
  }

  function updateKeeper(s, dt, st) {
    if (s.workT > 0) {
      s.workT -= dt; s.moving = false;
      if (s.workT <= 0) {
        if (s.doing === 'clean') { delete S.poop[tileAt(s.x, s.y)]; }
        if (s.doing === 'cleantank' && EX[s.ex]) EX[s.ex].tankTiles.forEach(i => delete S.poop[i]);
        // well-trained keepers spend a moment playing with the animals before they go
        if (s.doing === 'feed' && skillOf(s) >= 4 && EX[s.ex]) S.animals.forEach(a => { if (a.ex === s.ex) a.fun = Math.max(a.fun || 0, 0.6); });
        if (s.doing === 'feed' && EX[s.ex]) {
          const need = foodNeeded(s.ex), total = Object.values(need).reduce((t, v) => t + v.cost, 0);
          if (total > 0 && S.money < total) {
            if (!S.today.foodWarned) { log('Not enough money to buy animal food! Animals will go hungry.'); S.today.foodWarned = 1; }
            unreachableUntil[s.ex] = nowT() + 15;
          } else if (total > 0) {
            spend('food', total);
            Object.entries(need).forEach(([sp, v]) => {
              const ft = AQUATIC.has(sp) ? EX[s.ex].feedTileTank : (s.feedAt ?? EX[s.ex].feedTile), pile = S.food[ft] || (S.food[ft] = {});
              pile[sp] = (pile[sp] || 0) + v.n;
            });
          }
          s.fed = true;            // food first, then tidy up before leaving
        }
        s.doing = null;
      }
      return;
    }
    if (!s.path.length) {
      const here = tileAt(s.x, s.y);
      if (s.state === 'idle') {
        // rounding up escaped animals comes first
        const taken = new Set(S.staff.filter(o => o !== s && o.catching != null).map(o => o.catching));
        const runaway = S.animals.find(a => a.loose && a.ledBy == null && !taken.has(a.id) && (!SPECIALIST.has(a.sp) || skillOf(s) >= SPECIALIST_SKILL));
        if (runaway) {
          const dest = homeFor(runaway);
          if (dest < 0) {
            if (!runaway.noHome) { runaway.noHome = true; log(`There's no exhibit ${runaway.name} the ${Z.SPECIES[runaway.sp].name.toLowerCase()} can go to. Build one and a keeper will take it there.`); }
          } else {
            const at = tileAt(runaway.x, runaway.y);
            const r = bfs(here, openGround, j => j === at || neighbors(at).includes(j));
            if (r) { runaway.noHome = false; s.catching = runaway.id; s.ex = dest; s.state = 'catch'; s.path = toPoints(r); s.task = `Going to catch ${runaway.name}`; return; }
          }
        }
        // then any animal waiting to be moved to another exhibit
        const transfer = S.animals.find(a => a.moveTo != null && !a.loose && !a.transit && !taken.has(a.id) && (!SPECIALIST.has(a.sp) || skillOf(s) >= SPECIALIST_SKILL));
        if (transfer) {
          const dest = exOf[transfer.moveTo], why = dest >= 0 ? cantLiveAt(transfer, transfer.moveTo) : 'That exhibit is gone.';
          if (why || dest === transfer.ex) { transfer.moveTo = null; if (why) log(`Couldn't move ${transfer.name}: ${why}`); }
          else {
            const src = transfer.ex, at = tileAt(transfer.x, transfer.y);
            const r = bfs(here, j => keeperPass(src)(j) || openGround(j), j => j === at || neighbors(at).includes(j));
            if (r) { s.catching = transfer.id; s.ex = dest; s.from = src; s.state = 'fetch'; s.path = toPoints(r); s.task = `Going to fetch ${transfer.name}`; return; }
            unreachableUntil[src] = nowT() + 20;
          }
        }
        const claimed = new Set(S.staff.filter(o => o !== s && o.type === 'keeper' && o.state === 'work').map(o => o.ex));
        let bestE = -1, bestScore = 22;
        st.forEach((x, id) => {
          if (!x.list.length || claimed.has(id) || (unreachableUntil[id] || 0) > nowT()) return;
          if (skillOf(s) < SPECIALIST_SKILL && [...x.species].some(sp => SPECIALIST.has(sp))) return;   // leave these to trained keepers
          const hungry = x.list.filter(a => a.hunger > 30 && !(x.food[a.sp] > 0));
          const score = hungry.reduce((m, a) => Math.max(m, a.hunger), 0) + x.poop * 9;
          if (score > bestScore) { bestScore = score; bestE = id; }
        });
        if (bestE >= 0) {
          const r = bfs(here, keeperPass(bestE), workSpot(bestE)) || bfs(here, anyPass, workSpot(bestE));
          if (r) { s.ex = bestE; s.state = 'work'; s.fed = false; s.path = toPoints(r); s.task = 'Walking to an exhibit'; }
          else {
            unreachableUntil[bestE] = nowT() + 20;
            if (!s.warned) { log('A keeper can\'t reach an exhibit. Make sure there\'s a path or open grass beside its fence.'); s.warned = true; }
          }
        }
        if (s.state === 'idle') { s.task = 'Waiting for a job'; wander(s); }
      } else if (s.state === 'work') {
        if (!EX[s.ex]) { s.state = 'leave'; return; }
        const E = EX[s.ex], land = j => exOf[j] === s.ex && S.tiles[j] !== TANK;
        const need = !s.fed ? foodNeeded(s.ex) : {};
        if (Object.keys(need).length) {
          const ft = E.feedTile, landFood = Object.keys(need).some(sp => !AQUATIC.has(sp));
          const r2 = !landFood || here === ft || !E.landTiles.length ? [] : bfs(here, land, j => j === ft);
          if (r2 && r2.length) { s.path = toPoints(r2); s.task = 'Bringing food'; }
          else { s.feedAt = r2 === null && land(here) ? here : null; s.workT = workTime(s, 2); s.doing = 'feed'; s.task = landFood ? 'Putting out food' : 'Feeding the tank'; }
          return;
        }
        s.fed = true;
        if (E.tankTiles.some(i => S.poop[i])) { s.workT = workTime(s, 2.5); s.doing = 'cleantank'; s.task = 'Cleaning the tank'; return; }
        if (S.poop[here] && land(here)) { s.workT = workTime(s, 1.5); s.doing = 'clean'; s.task = 'Cleaning the exhibit'; return; }
        const r = bfs(here, land, j => land(j) && !!S.poop[j]);
        if (r && r.length) { s.path = toPoints(r); s.task = 'Cleaning the exhibit'; }
        else s.state = 'leave';
      } else if (s.state === 'catch') {
        const a = S.animals.find(x => x.id === s.catching);
        if (!a || !a.loose || !EX[s.ex]) { s.catching = null; s.state = 'leave'; return; }
        const at = tileAt(a.x, a.y);
        if (Math.hypot(a.x - s.x, a.y - s.y) < T * 1.6) {
          a.ledBy = s.id; a.path = [];
          const dest = s.ex, pass = j => openGround(j) || keeperPass(dest)(j);
          const r = bfs(here, pass, j => exOf[j] === dest && S.tiles[j] !== TANK);
          if (r) { s.state = 'lead'; s.path = toPoints(r); s.task = `Leading ${a.name} home`; }
          else { a.ledBy = null; s.catching = null; s.state = 'leave'; unreachableUntil[dest] = nowT() + 20; }
        } else {
          const r = bfs(here, openGround, j => j === at || neighbors(at).includes(j));
          if (r && r.length) s.path = toPoints(r); else { s.catching = null; s.state = 'leave'; }
        }
      } else if (s.state === 'fetch') {
        const a = S.animals.find(x => x.id === s.catching);
        if (!a || a.moveTo == null || a.loose || !EX[s.ex]) { s.catching = null; s.state = 'leave'; return; }
        const at = tileAt(a.x, a.y);
        if (Math.hypot(a.x - s.x, a.y - s.y) < T * 1.6) {
          const dest = s.ex, pass = j => keeperPass(s.from)(j) || keeperPass(dest)(j) || openGround(j);
          const r = bfs(here, pass, j => exOf[j] === dest && S.tiles[j] !== TANK);
          if (r) { a.ledBy = s.id; a.transit = true; a.act = null; a.path = []; s.state = 'lead'; s.path = toPoints(r); s.task = `Moving ${a.name} to a new exhibit`; }
          else { a.moveTo = null; s.catching = null; s.state = 'leave'; log(`A keeper couldn't find a way to ${a.name}'s new exhibit. Make sure a path runs beside both fences.`); }
        } else {
          const r = bfs(here, j => keeperPass(s.from)(j) || openGround(j), j => j === at || neighbors(at).includes(j));
          if (r && r.length) s.path = toPoints(r); else { s.catching = null; s.state = 'leave'; }
        }
      } else if (s.state === 'lead') {
        const a = S.animals.find(x => x.id === s.catching);
        if (a && a.ledBy === s.id && exOf[here] === s.ex) {
          const moved = a.transit;
          a.loose = false; a.transit = false; a.moveTo = null; a.ledBy = null; a.ex = s.ex; a.x = s.x - 6 * (s.facing || 1); a.y = s.y; a.path = []; a.wait = 1;
          log(moved ? `${s.name} moved ${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} to its new exhibit.`
            : `${s.name} brought ${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} back to an exhibit.`);
        } else if (a) { a.ledBy = null; a.transit = false; }
        s.catching = null; s.state = 'leave';
      } else if (s.state === 'leave') {
        if (S.tiles[here] === PATH) { s.state = 'idle'; s.ex = -1; s.fed = false; return; }
        const r = bfs(here, s.ex >= 0 ? (j => keeperPass(s.ex)(j) || openGround(j)) : (j => !isFence(S.tiles[j]) || !!gateOf[j]), j => S.tiles[j] === PATH);
        const r3 = r || bfs(here, anyPass, j => S.tiles[j] === PATH);
        if (r3) { s.path = toPoints(r3); s.task = 'Heading back to the path'; } else { warpToEntrance(s); s.state = 'idle'; }
      }
    }
    const moved = stepAlong(s, staffSpeed(s) * (s.state === 'lead' ? 0.7 : 1) * dt); s.phase += moved * 0.45; s.moving = moved > 0;
  }

  // ---------- economy ----------
  function attraction() {
    const species = new Set();
    const a = S.animals.reduce((s, an) => { species.add(an.sp); return s + Z.SPECIES[an.sp].appeal * (an.happy / 100) * (an.baby ? 1.5 : 1); }, 0);
    return a + species.size * 2;
  }
  const hasBuilding = t => S.items.includes(t);
  function guestsPerDay() {
    const priceF = clamp(1.6 - S.ticket / 25, 0, 1.6);
    const A = attraction();
    // more animals draw more guests, but the draw tapers off for very large zoos (there's only one gate)
    return (3 + A * 0.85 / (1 + A / 400)) * (0.5 + S.rep / 100) * priceF * (hasBuilding('edu') ? 1.1 : 1);
  }

  function endOfDay(st) {
    const wages = S.staff.reduce((s, x) => s + wageOf(x), 0);
    spend('staff', wages);
    const upkeep = S.items.reduce((s, it) => s + (BUILDINGS[it] ? BUILDINGS[it].upkeep : 0), 0);
    if (upkeep) spend('build', upkeep);
    const t = S.today, inc = sumOf(t, INCOME), cost = sumOf(t, COSTS);
    log(`Day ${S.day}: ${t.guests} guests. Income ${money(inc)}, costs ${money(cost)}, so ${inc - cost >= 0 ? 'a profit' : 'a loss'} of ${money(Math.abs(inc - cost))}.`);
    if (S.money < 0) log('The zoo is in the red. Raise income or cut staff before buying more.');
    const snap = { day: S.day }; Object.keys({ ...INCOME, ...COSTS }).forEach(k => { snap[k] = Math.round(t[k] || 0); });
    snap.guests = t.guests; snap.plush = t.plush; snap.eduVisits = t.eduVisits;
    S.history.push(snap); if (S.history.length > 30) S.history.shift();
    Object.keys(S.comments).forEach(k => { S.comments[k] *= 0.5; if (S.comments[k] < 0.5) delete S.comments[k]; });
    dailyBreeding(st);
    checkSecrets();
    S.day++; S.time -= DAY;
    S.today = newToday();
    save(true);
  }

  // ---------- simulation tick ----------
  function tick(dt) {
    if (!S.speed) return;
    dt *= S.speed;
    const st = exStats(); lastExStats = st;
    S.animals.forEach(a => updateAnimal(a, dt, st));
    S.arrivalAcc += guestsPerDay() / DAY * dt;
    while (S.arrivalAcc >= GROUP) { S.arrivalAcc -= GROUP; if (guests.length * GROUP < MAX_GUESTS) spawnGuest(); }
    countGuests();
    guests.forEach(g => updateGuest(g, dt));
    guests = guests.filter(g => {
      if (g.gone) { S.rep = S.rep * 0.92 + g.happy * 0.08; guestComments(g); if (selected && selected.ref === g) selected = null; }
      return !g.gone;
    });
    S.staff.forEach(s => (s.type === 'janitor' ? updateJanitor(s, dt) : updateKeeper(s, dt, st)));
    if (guests.length * GROUP > (S.peakGuests || 0)) S.peakGuests = guests.length * GROUP;
    checkStars(false);
    S.time += dt;
    if (S.time >= DAY) endOfDay(st);
  }

  // ---------- building ----------
  function canAfford(n) { if (S.money < n) { toast('Not enough money.'); return false; } return true; }
  const animalOnTile = i => S.animals.some(a => tileAt(a.x, a.y) === i);

  function applyTool(i, first) {
    if (i < 0) return;
    if (tool === 'animal' ? !speciesOpen(toolSpecies) : !toolOpen(tool)) return first && toastLocked(tool === 'animal' ? toolSpecies : tool);
    const t = S.tiles[i], item = S.items[i], isEnt = i === idx(ENT.x, ENT.y);
    if (tool === 'path') {
      if (t === PATH) return;
      if (isFence(t)) return first && toast('Remove the fence first.');
      if (item) return first && toast('Something is already here.');
      if (exOf[i] >= 0) return first && toast('Paths can\'t go inside an exhibit.');
      if (!canAfford(COST.path)) return;
      spend('build', COST.path); S.tiles[i] = PATH; recompute();
    } else if (tool === 'fence' || tool === 'mesh') {
      const to = tool === 'mesh' ? MESH : FENCE;
      if (t === to) return;
      if (t === PATH) return first && toast('Remove the path first.');
      if (item) return first && toast('Something is already here.');
      if (isFence(t) && to === FENCE) {
        // swapping mesh for a wooden fence would open the roof on any birds inside
        S.tiles[i] = FENCE; recompute(false);
        const exposed = birdsOutOfAviary(); S.tiles[i] = t; recompute(false);
        if (exposed) return first && toast(`The ${plural(exposed)} would fly away! Move them first.`);
      }
      if (!canAfford(COST[tool])) return;
      spend('build', COST[tool]); S.tiles[i] = to; delete S.poop[i]; delete S.food[i]; recompute();
    } else if (ITEMS.includes(tool)) {
      if (t === TANK && tool !== 'toy') return first && toast('Only a ball can float in the tank.');
      if (!isGround(t)) return first && toast('Place this on grass, snow, or inside an exhibit.');
      if (item) return first && toast('Something is already here.');
      if (!canAfford(COST[tool])) return;
      spend('build', COST[tool]); S.items[i] = tool; recompute();
    } else if (tool === 'snow' || tool === 'tank') {
      const to = tool === 'snow' ? SNOW : TANK;
      if (t === to) return;
      if (!isGround(t)) return first && toast(tool === 'snow' ? 'Snow goes on grass.' : 'Tanks go on grass or snow.');
      if (to === TANK && item && item !== 'toy') return first && toast('Clear this tile first.');
      if (to === TANK && S.animals.some(a => !AQUATIC.has(a.sp) && tileAt(a.x, a.y) === i)) return first && toast('An animal is standing here.');
      if (t === TANK && S.animals.some(a => AQUATIC.has(a.sp) && tileAt(a.x, a.y) === i)) return first && toast('Something is swimming here.');
      if (!canAfford(COST[tool])) return;
      spend('build', COST[tool]); S.tiles[i] = to; recompute();
    } else if (BUILDINGS[tool]) {
      const b = BUILDINGS[tool];
      if (t !== GRASS || item) return first && toast('Buildings go on an empty grass tile.');
      if (exOf[i] >= 0) return first && toast('Buildings can\'t go inside an exhibit.');
      if (!neighbors(i).some(n => S.tiles[n] === PATH)) return first && toast(`The ${b.name.toLowerCase()} needs to be right next to a path.`);
      if (!canAfford(COST[tool])) return;
      spend('build', COST[tool]); S.items[i] = tool; recompute();
      log(`Built a ${b.name.toLowerCase()}.`);
    } else if (tool === 'remove') {
      if (isEnt) return first && toast('The entrance stays.');
      const refund = c => { const r = Math.round(c * 0.5); S.money += r; S.today.build -= r; };
      if (item) { refund(COST[item]); S.items[i] = null; recompute(); return; }
      if (t === PATH) { S.tiles[i] = GRASS; delete S.litter[i]; recompute(); return; }
      if (t === SNOW || t === TANK) {
        if (t === TANK && S.animals.some(a => AQUATIC.has(a.sp) && tileAt(a.x, a.y) === i)) return first && toast('Something is swimming here.');
        refund(COST[t === SNOW ? 'snow' : 'tank']); S.tiles[i] = GRASS; delete S.poop[i]; recompute(); return;
      }
      if (isFence(t)) {
        S.tiles[i] = GRASS; recompute(false);   // test the change before committing to it
        // tank animals can't get out of the water, and animals that don't live together can't be joined up
        const stranded = S.animals.some(a => { const j = tileAt(a.x, a.y); return AQUATIC.has(a.sp) && (j < 0 || exOf[j] < 0); });
        let clash = null;
        EX.forEach(E => { const sp = [...new Set(S.animals.filter(a => !a.loose && exOf[tileAt(a.x, a.y)] === E.id).map(a => a.sp))];
          sp.forEach(x => sp.forEach(y => { if (!canShare(x, y) && !clash) clash = [x, y]; })); });
        const birds = birdsOutOfAviary();
        if (stranded || clash || birds) {
          S.tiles[i] = t;
          if (first) toast(stranded ? 'That would drain the tank! Sell the animals in it first.' : birds ? `The ${plural(birds)} would fly away! Move them first.`
            : `That would put the ${plural(clash[0])} in with the ${plural(clash[1])}.`);
        }
        recompute();   // any land animal now outside an exhibit gets loose, and a keeper will round it up
      }
    } else if (tool === 'move') {
      if (!first) return;
      if (!moving || !S.animals.includes(moving)) { setTool('look'); return; }
      moveTo(moving, i);
    } else if (tool === 'animal' && toolSpecies) {
      if (!first) return;
      const sp = toolSpecies, d = Z.SPECIES[sp];
      if (!approved(sp, false)) return toast(`${d.name} is awaiting approval.`);
      const why = cantLiveAt(null, i, sp); if (why) return toast(why);
      if (!canAfford(d.cost)) return;
      spend('animals', d.cost);
      const c = center(i), a = makeAnimal(sp, c.x, c.y, false); a.ex = exOf[i];
      S.animals.push(a);
      log(`Welcome ${a.name} the ${d.name.toLowerCase()}!`);
    }
  }

  function cantLiveAt(a, i, sp = a.sp) {
    const d = Z.SPECIES[sp], E = EX[exOf[i]];
    if (!E) return 'Animals go inside a fully fenced exhibit.';
    const aq = AQUATIC.has(sp);
    if (aq && !E.items.tank) return `${d.name}s need an aquarium tank: at least 12 tiles of tank water inside a fence.`;
    if (aq && S.tiles[i] !== TANK) return `${d.name}s live in the water. Click on the tank.`;
    if (!aq && S.tiles[i] === TANK) return `${d.name}s can't live in the water. Click on land in the exhibit.`;
    if (FLYERS.has(sp) && !E.aviary) return `${d.name}s fly! They need an aviary: close the exhibit in with aviary mesh instead of fence.`;
    const clash = [...new Set(S.animals.filter(o => o !== a && o.ex === E.id && !o.loose && !o.transit).map(o => o.sp))].find(x => !canShare(x, sp));
    if (clash) return `${d.name}s can't share with ${plural(clash)}. Only animals that live together in the wild can share an exhibit.`;
    return '';
  }
  // Moving an animal: pick it, then click the exhibit it should go to. A keeper walks it over.
  let moving = null;
  function startMove(a) { moving = a; setTool('move'); openPanel(null); toast(`Click the exhibit to move ${a.name} to. Esc cancels.`); }
  function moveTo(a, i) {
    if (exOf[i] === a.ex) return toast(`${a.name} already lives here.`);
    const why = cantLiveAt(a, i); if (why) return toast(why);
    const d = Z.SPECIES[a.sp];
    if (AQUATIC.has(a.sp)) {
      // the aquarium team moves tank animals straight from one tank to the other
      const c = center(i); a.x = c.x; a.y = c.y; a.ex = exOf[i]; a.path = []; a.moveTo = null;
      log(`The aquarium team moved ${a.name} the ${d.name.toLowerCase()} to another tank.`);
    } else {
      if (!S.staff.some(s => s.type === 'keeper')) return toast('Hire a keeper to move animals.');
      if (SPECIALIST.has(a.sp) && !skilledKeeper()) return toast(`Only a keeper trained to skill ${SPECIALIST_SKILL} can move ${plural(a.sp)}.`);
      a.moveTo = i;
      log(`A keeper will move ${a.name} the ${d.name.toLowerCase()} to a new exhibit.`);
    }
    moving = null; setTool('look'); renderPanel();
  }

  // a bird that would no longer be inside an aviary (checked before a fence change is kept)
  function birdsOutOfAviary() {
    const b = S.animals.find(a => FLYERS.has(a.sp) && !a.loose && !(EX[exOf[tileAt(a.x, a.y)]] || {}).aviary);
    return b ? b.sp : null;
  }

  function sellAnimal(a) {
    const d = Z.SPECIES[a.sp], value = Math.round(d.cost * (a.baby ? SELL_BABY : SELL_ADULT));
    earn('sales', value);
    S.animals = S.animals.filter(x => x !== a);
    log(`${a.name} the ${d.name.toLowerCase()} moved to another zoo for ${money(value)}.`);
    selected = null; renderPanel();
  }
  function renameAnimal(a, name) {
    name = name.replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!name || name === a.name) return;
    log(`${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} is now called ${name}.`);
    a.name = name; renderPanel();
  }
  // little portraits in the staff list, so each worker's uniform shows off their rank
  function drawStaffPortraits() {
    document.querySelectorAll('canvas[data-staff]').forEach(cv => {
      const s = S.staff.find(x => x.id === +cv.dataset.staff); if (!s) return;
      const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
      c.setTransform(1.9, 0, 0, 1.9, 0, 0);
      A.person(c, 11.5, 29, 0, 1, A.staffLook(s.type, skillOf(s)), false, 'front');
    });
  }
  function train(s) {
    if ((s.skill || 1) >= MAX_SKILL) return;
    const c = trainCost(s);
    if (S.money < c) { toast('Not enough money for training.'); return; }
    spend('staff', c); s.skill = (s.skill || 1) + 1;
    log(`${s.name} finished training and is now a ${rankOf(s).toLowerCase()} (skill ${s.skill}), with a new uniform to match.`);
    renderPanel();
  }
  function fire(s) {
    S.staff = S.staff.filter(x => x !== s);
    S.animals.forEach(a => { if (a.ledBy === s.id) { a.ledBy = null; a.transit = false; } });
    log(`A ${STAFF[s.type].name.toLowerCase()} was let go.`);
    selected = null; renderPanel();
  }

  // ---------- saving ----------
  function serialize() {
    return {
      v: 1, starRules: STAR_RULES, money: S.money, stars: S.stars, secrets: S.secrets, peakGuests: S.peakGuests, bornBy: S.bornBy, day: S.day, time: S.time, speed: S.speed, ticket: S.ticket, rep: S.rep,
      tiles: S.tiles.join(''), items: S.items.map(x => (x ? ITEM_CHAR[x] : '.')).join(''),
      animals: S.animals.map(a => ({ id: a.id, sp: a.sp, baby: a.baby, age: +a.age.toFixed(3), x: Math.round(a.x), y: Math.round(a.y),
        hunger: Math.round(a.hunger), happy: Math.round(a.happy), name: a.name, fun: +(a.fun || 0).toFixed(2), loose: a.loose || undefined, moveTo: a.moveTo ?? undefined })),
      staff: S.staff.map(s => ({ id: s.id, type: s.type, name: s.name, skill: s.skill || 1 })),
      litter: S.litter, poop: S.poop, food: S.food, nextId: S.nextId, log: S.log.slice(0, 20), totals: S.totals, today: S.today,
      history: S.history, comments: S.comments, plushSales: S.plushSales,
    };
  }
  function deserialize(o) {
    if (!o || o.v !== 1 || typeof o.tiles !== 'string' || o.tiles.length !== MW * MH) throw new Error('bad save');
    const s = newState();
    Object.assign(s, { money: o.money, day: o.day, time: o.time || 0, speed: o.speed ?? 1, ticket: o.ticket ?? 15, rep: o.rep ?? 50,
      litter: o.litter || {}, poop: o.poop || {}, food: o.food || {}, nextId: o.nextId || 1, log: o.log || [], totals: o.totals || s.totals,
      today: Object.assign(newToday(), o.today || {}), history: o.history || [], comments: o.comments || {}, plushSales: o.plushSales || {} });
    s.stars = o.stars || 0;   // older saves work out their level on load
    s.secrets = o.secrets || {}; s.peakGuests = o.peakGuests || 0; s.bornBy = o.bornBy || {};
    if (o.starRules !== STAR_RULES) { s.stars = 0; s.restarred = true; }    // star goals changed: work the level out again
    s.tiles = o.tiles.split('').map(Number);
    s.items = o.items.split('').map(ch => CHAR_ITEM[ch] || null);
    s.animals = (o.animals || []).filter(a => Z.SPECIES[a.sp]).map(a => Object.assign({ path: [], wait: 1, phase: 0, facing: 1, ex: -1, moving: false }, a));
    const c = center(idx(ENT.x, ENT.y));
    s.staff = (o.staff || []).filter(x => STAFF[x.type]).map(x => Object.assign({ x: c.x, y: c.y, path: [], phase: 0, facing: 1, workT: 0, state: 'idle', ex: -1 }, x));
    return s;
  }
  function save(quiet) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); if (!quiet) toast('Game saved on this device.'); }
    catch (e) { if (!quiet) toast('Couldn\'t save. Try Export instead.'); }
  }
  function loadSaved() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; S = deserialize(JSON.parse(raw)); return true; }
    catch (e) { return false; }
  }
  function startWith(state) {
    S = state; guests = []; selected = null; recompute();
    if (!S.stars) { S.stars = 1; checkStars(true); }
    if (S.restarred) { delete S.restarred; log(`The star goals have changed, so your zoo was checked against the new ones. It has ${S.stars} star${S.stars > 1 ? 's' : ''}.`); }
    snapTint(); buildTray(); wireTray(); centerView(); renderAll();
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify(serialize(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `3d-zoo-day-${S.day}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importSave(file) {
    const r = new FileReader();
    r.onload = () => {
      try { startWith(deserialize(JSON.parse(r.result))); save(true); toast('Save file loaded.'); }
      catch (e) { toast('That file isn\'t a 3D Zoo save.'); }
    };
    r.readAsText(file);
  }

  // ---------- rendering ----------
  const canvas = document.getElementById('world'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, hover = -1, clock = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    clampView();
  }
  function clampView() {
    const vw = W / view.zoom, vh = H / view.zoom, pad = T * 3;
    view.x = clamp(view.x, -pad, Math.max(-pad, MW * T + pad - vw));
    view.y = clamp(view.y, -pad, Math.max(-pad, MH * T + pad - vh));
  }
  function centerView() {
    const c = center(idx(ENT.x, ENT.y));
    view.x = c.x - W / view.zoom / 2; view.y = c.y - H / view.zoom * 0.7; clampView();
  }
  const toWorld = (sx, sy) => ({ x: sx / view.zoom + view.x, y: sy / view.zoom + view.y });

  function drawTile(i) {
    const x = tx(i) * T, y = ty(i) * T, t = S.tiles[i], h = A.rnd(i);
    const inside = exOf[i] >= 0 || (t === FENCE && neighbors(i).some(n => exOf[n] >= 0) && false);
    if (t === PATH) {
      ctx.fillStyle = GC.path; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      ctx.fillStyle = GC.pathSpeck;
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + A.rnd(i + k) * 22, y + 4 + A.rnd(i + k + 7) * 22, 2, 2);
      ctx.strokeStyle = GC.pathEdge; ctx.lineWidth = 1.5; ctx.beginPath();
      const px = tx(i), py = ty(i);
      const edge = (nx, ny, x1, y1, x2, y2) => { if (!inMap(nx, ny) || S.tiles[idx(nx, ny)] !== PATH) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); } };
      edge(px, py - 1, x, y + 0.75, x + T, y + 0.75); edge(px, py + 1, x, y + T - 0.75, x + T, y + T - 0.75);
      edge(px - 1, py, x + 0.75, y, x + 0.75, y + T); edge(px + 1, py, x + T - 0.75, y, x + T - 0.75, y + T);
      ctx.stroke();
      return;
    }
    if (t === SNOW) {
      ctx.fillStyle = GC.snow; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      ctx.strokeStyle = GC.snowDrift; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = 0; k < 2; k++) { const gx = x + 4 + A.rnd(i * 7 + k) * 18, gy = y + 8 + A.rnd(i * 3 + k) * 18; ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 5, gy - 4, gx + 10, gy); }
      ctx.stroke();
      ctx.fillStyle = GC.snowDrift; for (let k = 0; k < 3; k++) ctx.fillRect(x + A.rnd(i * 11 + k) * 30, y + A.rnd(i * 13 + k) * 30, 1.5, 1.5);
      return;
    }
    if (t === TANK) {
      ctx.fillStyle = GC.tank; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      ctx.strokeStyle = GC.tankWave; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const gx = x + 5 + A.rnd(i * 5 + k) * 16 + Math.sin(clock * 1.3 + i + k) * 2, gy = y + 9 + k * 13;
        ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 3, gy - 2.5, gx + 6, gy); ctx.quadraticCurveTo(gx + 9, gy + 2.5, gx + 12, gy);
      }
      ctx.stroke();
      const px = tx(i), py = ty(i), notTank = (dx, dy) => !inMap(px + dx, py + dy) || S.tiles[idx(px + dx, py + dy)] !== TANK;
      ctx.strokeStyle = GC.tankEdge; ctx.lineWidth = 2; ctx.beginPath();
      if (notTank(0, -1)) { ctx.moveTo(x, y + 1); ctx.lineTo(x + T, y + 1); }
      if (notTank(0, 1)) { ctx.moveTo(x, y + T - 1); ctx.lineTo(x + T, y + T - 1); }
      if (notTank(-1, 0)) { ctx.moveTo(x + 1, y); ctx.lineTo(x + 1, y + T); }
      if (notTank(1, 0)) { ctx.moveTo(x + T - 1, y); ctx.lineTo(x + T - 1, y + T); }
      ctx.stroke();
      return;
    }
    if (inside) { ctx.fillStyle = GC.exhibit; ctx.fillRect(x, y, T + 0.5, T + 0.5); }
    if (isFence(t)) {
      // shade the half of a fence tile that faces into an exhibit
      const px = tx(i), py = ty(i), inEx = (dx, dy) => inMap(px + dx, py + dy) && exOf[idx(px + dx, py + dy)] >= 0;
      const isF = (dx, dy) => inMap(px + dx, py + dy) && isFence(S.tiles[idx(px + dx, py + dy)]);
      ctx.fillStyle = GC.exhibit;
      for (const qx of [-1, 1]) for (const qy of [-1, 1]) {
        if (inEx(qx, 0) || inEx(0, qy) || (inEx(qx, qy) && isF(qx, 0) && isF(0, qy)))
          ctx.fillRect(x + (qx > 0 ? T / 2 : 0), y + (qy > 0 ? T / 2 : 0), T / 2, T / 2);
      }
      return;
    }
    if (inside) { ctx.fillStyle = GC.exhibitSpeck; for (let k = 0; k < 4; k++) ctx.fillRect(x + A.rnd(i * 3 + k) * 30, y + A.rnd(i * 5 + k) * 30, 1.5, 1.5); }
    else if (h < 0.35) {
      ctx.strokeStyle = GC.tuft; ctx.lineWidth = 1; ctx.beginPath();
      const gx = x + 6 + A.rnd(i + 2) * 18, gy = y + 8 + A.rnd(i + 4) * 18;
      ctx.moveTo(gx - 3, gy); ctx.lineTo(gx - 1, gy - 4); ctx.moveTo(gx, gy); ctx.lineTo(gx + 1, gy - 5); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 3, gy - 3); ctx.stroke();
    }
  }

  function drawFence(i) {
    const cx = tx(i) * T + T / 2, cy = ty(i) * T + T / 2;
    const conn = N4.filter(([dx, dy]) => inMap(tx(i) + dx, ty(i) + dy) && isFence(S.tiles[idx(tx(i) + dx, ty(i) + dy)]));
    ctx.lineCap = 'butt';
    if (S.tiles[i] === MESH) {
      // aviary mesh: thin netting between slim poles
      conn.forEach(([dx, dy]) => {
        const ex = cx + dx * T / 2, ey = cy + dy * T / 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.lineWidth = 5; ctx.strokeStyle = GC.meshDark; ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = GC.meshLight; ctx.stroke();
        ctx.lineWidth = 0.8; ctx.strokeStyle = GC.meshDark; ctx.beginPath();
        for (let k = 1; k < 4; k++) { const fx = cx + dx * T / 2 * k / 4, fy = cy + dy * T / 2 * k / 4;
          ctx.moveTo(fx - dy * 1.5 - dx * 1.5, fy - dx * 1.5 - dy * 1.5); ctx.lineTo(fx + dy * 1.5 + dx * 1.5, fy + dx * 1.5 + dy * 1.5); }
        ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = GC.meshDark; ctx.fill();
      return;
    }
    if (neighbors(i).some(n => S.tiles[n] === TANK)) {
      // a fence beside tank water is a glass wall
      conn.forEach(([dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * T / 2, cy + dy * T / 2);
        ctx.lineWidth = 6; ctx.strokeStyle = '#555'; ctx.stroke();
        ctx.lineWidth = 3.5; ctx.strokeStyle = GC.glass; ctx.stroke();
      });
      ctx.fillStyle = '#555'; ctx.fillRect(cx - 3.5, cy - 3.5, 7, 7);
      ctx.fillStyle = GC.glass; ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      return;
    }
    conn.forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * T / 2, cy + dy * T / 2);
      ctx.lineWidth = 6; ctx.strokeStyle = GC.fenceDark; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = GC.fenceLight; ctx.stroke();
    });
    ctx.fillStyle = GC.fenceDark; ctx.fillRect(cx - 4, cy - 4, 8, 8);
    ctx.fillStyle = GC.fenceLight; ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }

  // ground colors for this frame, blended by how far each color layer has faded in
  const GC = {};
  function groundColors() {
    const p = (g, c) => A.mix(g, c, A.tint.plants), b = (g, c) => A.mix(g, c, A.tint.built);
    GC.grass = () => p('#ffffff', '#cfe9b4'); GC.exhibit = p('#f1f1f1', '#b4dc93');
    GC.exhibitSpeck = p('#c8c8c8', '#86bd63'); GC.tuft = p('#c4c4c4', '#6fae4e');
    GC.path = b('#dcdcdc', '#e6d6b5'); GC.pathSpeck = b('#b5b5b5', '#c7b088'); GC.pathEdge = b('#8a8a8a', '#a88b5e');
    GC.fenceDark = b('#111111', '#4a2e17'); GC.fenceLight = b('#ffffff', '#cf9a5c');
    const w = (g, c) => A.mix(g, c, A.tint.water);
    GC.snow = p('#fbfbfb', '#f3f8fc'); GC.snowDrift = p('#c9c9c9', '#a9c3d8');
    GC.tank = w('#7f7f7f', '#2a76b6'); GC.tankWave = w('#a8a8a8', '#73b3e6'); GC.tankEdge = w('#4f4f4f', '#1c5487');
    GC.glass = w('#e9e9e9', '#cfe9f5');
    GC.meshDark = b('#333333', '#3d4a3d'); GC.meshLight = b('#ffffff', '#c9d6c9');
  }
  // fade color layers toward what the current star level allows
  function fadeTint(dt) {
    Object.entries(COLOR_AT).forEach(([k, lvl]) => {
      const target = S.stars >= lvl ? 1 : 0, cur = A.tint[k];
      if (cur !== target) A.tint[k] = cur < target ? Math.min(target, cur + dt / 3) : Math.max(target, cur - dt / 3);
    });
  }
  function snapTint() { Object.entries(COLOR_AT).forEach(([k, lvl]) => { A.tint[k] = S.stars >= lvl ? 1 : 0; }); }

  function render() {
    groundColors();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#e9e9e9'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, -view.x * view.zoom * dpr, -view.y * view.zoom * dpr);
    const x0 = clamp(Math.floor(view.x / T), 0, MW - 1), y0 = clamp(Math.floor(view.y / T), 0, MH - 1);
    const x1 = clamp(Math.ceil((view.x + W / view.zoom) / T), 0, MW - 1), y1 = clamp(Math.ceil((view.y + H / view.zoom) / T), 0, MH - 1);
    // ground (one white sheet first, so tiles don't show seams)
    ctx.fillStyle = GC.grass(); ctx.fillRect(0, 0, MW * T, MH * T);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) drawTile(idx(x, y));
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, MW * T, MH * T);
    if (tool !== 'look') {
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * T, y0 * T); ctx.lineTo(x * T, (y1 + 1) * T); }
      for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * T, y * T); ctx.lineTo((x1 + 1) * T, y * T); }
      ctx.stroke();
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y), c = center(i);
      if (isFence(S.tiles[i])) drawFence(i);
      if (S.items[i] === 'water') A.water(ctx, c.x, c.y, T, clock + i);
      if (S.litter[i]) A.litter(ctx, c.x, c.y, S.litter[i], i);
      if (S.poop[i]) A.poop(ctx, c.x, c.y, S.poop[i], i);
      if (S.food[i]) Object.entries(S.food[i]).forEach(([sp, n], k) => A.food(ctx, c.x - 6 + k * 9, c.y + 3 - k * 4, DIET[sp].kind, n, i + k));
    }
    // standing things, sorted by their ground line
    const sprites = [];
    const vis = (x, y) => x > view.x - 80 && x < view.x + W / view.zoom + 80 && y > view.y - 40 && y < view.y + H / view.zoom + 120;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y), it = S.items[i];
      if (!it || it === 'water') continue;
      const c = center(i);
      if (it === 'toy') {
        // the ball rolls and bounces while an animal plays with it
        const p = (toyPlay[i] || 0) > clock, dx = p ? Math.sin(clock * 4 + i) * 7 : 0, lift = p ? Math.abs(Math.sin(clock * 9)) * 5 : 0;
        sprites.push({ y: c.y + 8, f: () => A.toy(ctx, c.x + dx, c.y + 8, i, lift) });
      } else if (it === 'wheel' || it === 'post') {
        const p = (toyPlay[i] || 0) > clock;
        sprites.push({ y: c.y + 8, f: () => it === 'wheel' ? A.wheel(ctx, c.x, c.y + 8, p ? clock * 8 : 0) : A.post(ctx, c.x, c.y + 8, p ? Math.sin(clock * 30) : 0) });
      } else if (BUILDINGS[it]) {
        sprites.push({ y: c.y + T / 2 - 1, f: () => { if (selected && selected.tile === i && selected.kind === 'building') ring(c.x, c.y + T / 2 - 2, 18); A[it === 'gift' ? 'giftShop' : 'eduCenter'](ctx, c.x, c.y + T / 2 - 1, T); } });
      } else sprites.push({ y: c.y + 8, f: () => A[it](ctx, c.x, c.y + 8, i) });
    }
    const ent = center(idx(ENT.x, ENT.y));
    sprites.push({ y: ent.y + T / 2, f: () => A.entrance(ctx, ent.x, ent.y + T / 2, T) });
    S.animals.forEach(a => vis(a.x, a.y) && sprites.push({ y: a.y, f: () => {
      if (selected && selected.ref === a) ring(a.x, a.y, 20);
      Z.draw(ctx, a.sp, a.x, a.y - (a.hop || 0), { phase: a.phase, moving: a.moving, scale: WORLD_SCALE, facing: a.facing, baby: a.baby, view: animalView(a) });
    } }));
    guests.forEach(g => !g.inside && vis(g.x, g.y) && sprites.push({ y: g.y, f: () => {
      if (selected && selected.ref === g) ring(g.x, g.y, 8);
      A.person(ctx, g.x, g.y, g.phase, g.facing, g.look, g.moving, g.view || 'side');
      if (g.plush) {
        // a little stuffed animal carried at their side
        const k = g.look.kid ? 0.72 : 1;
        Z.draw(ctx, g.plush, g.x + 5 * g.facing * k, g.y - 7 * k, { moving: false, scale: 0.075, facing: g.facing });
      }
    } }));
    S.staff.forEach(s => vis(s.x, s.y) && sprites.push({ y: s.y, f: () => {
      if (selected && selected.ref === s) ring(s.x, s.y, 8);
      if (!s.look || s.look.skill !== skillOf(s)) s.look = A.staffLook(s.type, skillOf(s));
      const ph = s.workT > 0 ? clock * 9 : s.phase;
      A.person(ctx, s.x, s.y, ph, s.facing, s.look, s.moving || s.workT > 0, s.workT > 0 ? 'side' : (s.view || 'side'));
    } }));
    sprites.sort((a, b) => a.y - b.y).forEach(s => s.f());
    // aviary roofs: a light net over the whole exhibit
    ctx.save(); ctx.strokeStyle = 'rgba(17,17,17,0.13)'; ctx.lineWidth = 1; ctx.beginPath();
    EX.forEach(E => { if (!E.aviary) return; E.tiles.forEach(i => {
      const x = tx(i), y = ty(i); if (x < x0 || x > x1 || y < y0 || y > y1) return;
      const px = x * T, py = y * T; ctx.moveTo(px, py); ctx.lineTo(px + T, py + T); ctx.moveTo(px + T, py); ctx.lineTo(px, py + T); }); });
    ctx.stroke(); ctx.restore();
    // hover preview
    if (hover >= 0 && tool !== 'look') {
      const x = tx(hover) * T, y = ty(hover) * T, ok = previewOk(hover);
      ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.setLineDash(ok ? [] : [4, 3]);
      ctx.fillStyle = ok ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.02)';
      ctx.fillRect(x, y, T, T); ctx.strokeRect(x + 1, y + 1, T - 2, T - 2); ctx.setLineDash([]);
    }
    if (selected && selected.tile >= 0 && !selected.ref) {
      const E = EX[exOf[selected.tile]];
      if (E) { ctx.fillStyle = 'rgba(0,0,0,0.07)'; E.tiles.forEach(i => ctx.fillRect(tx(i) * T, ty(i) * T, T, T)); }
    }
  }
  // Front and back views only show once Alex has approved them for that animal (and age).
  function animalView(a) {
    if (a.act === 'play' || !a.view || a.view === 'side') return 'side';
    const ok = Z.APPROVED[a.sp] && Z.APPROVED[a.sp][a.baby ? 'babyFrontBack' : 'adultFrontBack'];
    return ok ? a.view : 'side';
  }
  function ring(x, y, r) {
    ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function previewOk(i) {
    const t = S.tiles[i], it = S.items[i];
    if (tool === 'path') return t === GRASS && !it && exOf[i] < 0;
    if (tool === 'fence' || tool === 'mesh') return (isGround(t) && !it) || (isFence(t) && t !== (tool === 'mesh' ? MESH : FENCE));
    if (ITEMS.includes(tool)) return !it && (t === GRASS || t === SNOW || (t === TANK && tool === 'toy'));
    if (tool === 'snow') return t === GRASS;
    if (tool === 'tank') return (t === GRASS || t === SNOW) && (!it || it === 'toy');
    if (BUILDINGS[tool]) return t === GRASS && !it && exOf[i] < 0 && neighbors(i).some(n => S.tiles[n] === PATH);
    if (tool === 'remove') return (t !== GRASS || !!it) && i !== idx(ENT.x, ENT.y);
    if (tool === 'move') return !!moving && exOf[i] >= 0 && exOf[i] !== moving.ex && !cantLiveAt(moving, i);
    if (tool === 'animal') return exOf[i] >= 0 && approved(toolSpecies, false) && ((S.tiles[i] === TANK) === AQUATIC.has(toolSpecies));
    return true;
  }

  // ---------- input ----------
  const pointers = new Map();
  let drag = null;

  function hitTest(wx, wy) {
    let best = null, bd = 1e9;
    const test = (e, kind, r, oy) => {
      const d = Math.hypot(e.x - wx, e.y - oy - wy);
      if (d < r && d < bd) { bd = d; best = { kind, ref: e }; }
    };
    S.animals.forEach(a => test(a, 'animal', a.baby ? 14 : 22, a.baby ? 6 : 12));
    S.staff.forEach(s => test(s, 'staff', 12, 10));
    guests.forEach(g => !g.inside && test(g, 'guest', 10, 10));
    if (!best) {
      // buildings stand up off their tile, so a click on the roof counts too
      const i = tileAt(wx, wy), below = tileAt(wx, wy + T * 0.6);
      [i, below].some(j => { if (j >= 0 && BUILDINGS[S.items[j]]) { best = { kind: 'building', tile: j }; return true; } return false; });
    }
    return best;
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      drag = { mode: 'pinch', d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
      return;
    }
    const panBtn = e.button === 1 || e.button === 2;
    if (panBtn || tool === 'look') {
      drag = { mode: 'pan', sx: e.offsetX, sy: e.offsetY, vx: view.x, vy: view.y, moved: false, click: !panBtn };
    } else {
      const w = toWorld(e.offsetX, e.offsetY), i = tileAt(w.x, w.y);
      drag = { mode: 'paint', last: i };
      applyTool(i, true); renderHud();
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    const w = toWorld(e.offsetX, e.offsetY); hover = tileAt(w.x, w.y);
    updateCursorTip(e);
    if (!drag) return;
    if (drag.mode === 'pinch' && pointers.size === 2) {
      const [p, q] = [...pointers.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      view.x -= (mx - drag.mx) / view.zoom; view.y -= (my - drag.my) / view.zoom;
      zoomAt(mx, my, d / drag.d); drag.d = d; drag.mx = mx; drag.my = my;
    } else if (drag.mode === 'pan') {
      const dx = e.offsetX - drag.sx, dy = e.offsetY - drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (drag.moved) { view.x = drag.vx - dx / view.zoom; view.y = drag.vy - dy / view.zoom; clampView(); }
    } else if (drag.mode === 'paint' && hover !== drag.last && ['path', 'fence', 'mesh', 'remove', 'snow', 'tank'].includes(tool)) {
      drag.last = hover; applyTool(hover, false); renderHud();
    }
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (drag && drag.mode === 'pan' && !drag.moved && drag.click) {
      const w = toWorld(e.offsetX, e.offsetY), hit = hitTest(w.x, w.y);
      selected = hit || { tile: tileAt(w.x, w.y) };
      if (!hit && selected.tile >= 0 && exOf[selected.tile] < 0) selected = null;
      openPanel(selected ? 'info' : panelMode === 'info' ? null : panelMode);
    }
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { hover = -1; document.getElementById('tip').style.display = 'none'; });
  // Trackpad: two fingers sliding move the map (like grabbing it); a pinch zooms.
  // Browsers report a pinch as a scroll with Ctrl held, so Ctrl or Cmd + mouse wheel zooms too.
  // Safari sends pinches as its own gesture events instead, handled below.
  let pinching = false, pinchScale = 1;
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;           // lines or pages -> pixels
    if (e.ctrlKey || e.metaKey) {
      if (pinching) return;
      zoomAt(e.offsetX, e.offsetY, clamp(Math.exp(-e.deltaY * unit * 0.01), 0.6, 1.6));
    } else {
      view.x += e.deltaX * unit / view.zoom; view.y += e.deltaY * unit / view.zoom; clampView();
    }
  }, { passive: false });
  const gesturePoint = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('gesturestart', e => { e.preventDefault(); pinching = true; pinchScale = 1; });
  canvas.addEventListener('gesturechange', e => {
    e.preventDefault();
    const [x, y] = gesturePoint(e); zoomAt(x, y, e.scale / pinchScale); pinchScale = e.scale;
  });
  canvas.addEventListener('gestureend', e => { e.preventDefault(); pinching = false; });

  function zoomAt(sx, sy, f) {
    const before = toWorld(sx, sy);
    view.zoom = clamp(view.zoom * f, 0.45, 2.5);
    view.x = before.x - sx / view.zoom; view.y = before.y - sy / view.zoom; clampView();
  }

  const keys = new Set();
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') { moving = null; setTool('look'); }
    if (e.key === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  function updateCursorTip(e) {
    const tip = document.getElementById('tip');
    let text = '';
    if (tool === 'path' || tool === 'fence' || tool === 'mesh') text = `${{ path: 'Path', fence: 'Fence', mesh: 'Aviary mesh' }[tool]} ${money(COST[tool])} per tile, drag to draw`;
    else if (BUILDINGS[tool]) text = `${BUILDINGS[tool].name} ${money(COST[tool])}, place next to a path`;
    else if (tool === 'snow' || tool === 'tank') text = `${tool === 'snow' ? 'Snow' : 'Tank water'} ${money(COST[tool])} per tile, drag to paint`;
    else if (COST[tool]) text = `${ITEM_NAME[tool][0].toUpperCase() + ITEM_NAME[tool].slice(1)} ${money(COST[tool])}`;
    else if (tool === 'remove') text = 'Remove (items refund half)';
    else if (tool === 'move' && moving) text = `Move ${moving.name} here`;
    else if (tool === 'animal' && toolSpecies) text = `${Z.SPECIES[toolSpecies].name} ${money(Z.SPECIES[toolSpecies].cost)}, click inside an exhibit`;
    if (!text || hover < 0) { tip.style.display = 'none'; return; }
    tip.textContent = text; tip.style.display = 'block';
    tip.style.left = (e.offsetX + 14) + 'px'; tip.style.top = (e.offsetY + 14) + 'px';
  }

  // ---------- HUD & panels ----------
  const $ = id => document.getElementById(id);
  const $$ = pane => document.querySelector(`#tray .pane[data-pane="${pane}"]`);
  let panelMode = null;

  function setTool(t, sp) {
    tool = t; toolSpecies = sp || null;
    document.querySelectorAll('#tools button[data-tool]').forEach(b =>
      b.classList.toggle('on', b.dataset.tool === t && (!b.dataset.sp || b.dataset.sp === toolSpecies)));
    if (t !== 'look') selected = null;
  }

  // ---------- zoo stars ----------
  const starOf = (kind, id) => { for (let n = 1; n <= MAX_STARS; n++) if (STARS[n][kind].includes(id)) return n; return 1; };
  const toolOpen = t => !STARS.slice(1).some(L => L.tools.includes(t)) || S.stars >= starOf('tools', t);
  const speciesOpen = sp => !!sp && (Z.SPECIES[sp].secret ? !!S.secrets[sp] : S.stars >= starOf('animals', sp));
  const goalMet = ([k, n]) => GOAL[k].have() >= n;
  const starText = n => '★'.repeat(n) + '☆'.repeat(MAX_STARS - n);
  function unlockName(id) { return Z.SPECIES[id] ? Z.SPECIES[id].name.toLowerCase() : BUILDINGS[id] ? BUILDINGS[id].name.toLowerCase() : ITEM_NAME[id] || id; }
  function toastLocked(id) {
    const n = Z.SPECIES[id] ? starOf('animals', id) : starOf('tools', id), nm = unlockName(id);
    toast(`${nm[0].toUpperCase() + nm.slice(1)} unlocks at ${n} stars. Click the stars at the top to see how.`);
  }
  function checkSecrets() {
    Object.entries(SECRETS).forEach(([sp, x]) => {
      if (S.secrets[sp] || !x.test()) return;
      S.secrets[sp] = true; log(x.msg); toast(x.msg); buildTray(); wireTray(); renderTray();
    });
  }
  function checkStars(quiet) {
    while (S.stars < MAX_STARS && STARS[S.stars + 1].need.every(goalMet)) {
      S.stars++;
      if (quiet) continue;
      const L = STARS[S.stars], news = [...L.animals, ...L.tools].map(unlockName);
      const msg = `The zoo earned ${S.stars} stars!` + (news.length ? ` New: ${news.join(', ')}.` : '') + (L.color ? ` ${L.color}.` : '')
        + (L.mystery ? ' Rumor has it that something rare could turn up at a zoo like this...' : '');
      log(msg); toast(msg);
      renderHud(); renderTray(); if (panelMode === 'stars') renderPanel();
    }
  }

  // ---------- bottom bar tabs: Build / Animals / Staff ----------
  let tab = 'build';
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('#tray .pane').forEach(p => p.classList.toggle('on', p.dataset.pane === t));
    // a tool from another tab shouldn't stay armed
    const armed = document.querySelector(`#tray .pane[data-pane="${t}"] button[data-tool="${tool}"]`);
    if (tool !== 'look' && !armed) setTool('look');
    renderTray();
  }
  function buildTray() {
    const rank = id => Z.SPECIES[id].secret ? 9 : starOf('animals', id);
    const order = Z.ids.filter(id => !Z.SPECIES[id].secret || S.secrets[id]).sort((x, y) => rank(x) - rank(y) || Z.SPECIES[x].cost - Z.SPECIES[y].cost);
    $$('animals').innerHTML = order.map(id => {
      const d = Z.SPECIES[id], ok = approved(id, false);
      return `<button class="critter" data-tool="animal" data-sp="${id}" ${ok ? '' : 'disabled'}
        title="${d.name}: wants ${d.wants.join(', ')}${ok ? '' : ' (awaiting approval)'}">
        <canvas width="76" height="38" data-prev="${id}"></canvas>${d.name}<small>${ok ? money(d.cost) : 'awaiting approval'}</small></button>`;
    }).join('');
    $$('staff').innerHTML = Object.entries(STAFF).map(([t, d]) =>
      `<button class="hire" data-hire="${t}" title="${d.job}">Hire ${d.name.toLowerCase()}<small>${money(d.hire)}, then ${money(d.wage)}/day</small><small data-count="${t}"></small></button>`).join('') +
      `<span class="sep"></span><button id="b-staff">Staff & training<small>see everyone, train skills</small></button>`;
  }
  function renderTray() {
    document.querySelectorAll('#tray button[data-tool]').forEach(b => {
      const id = b.dataset.sp || b.dataset.tool, locked = b.dataset.sp ? !speciesOpen(id) : !toolOpen(id);
      if (b.classList.contains('locked') === locked && b.dataset.ready) return;
      b.dataset.ready = 1; b.classList.toggle('locked', locked);
      let tag = b.querySelector('.lock');
      if (locked && !tag) { tag = document.createElement('small'); tag.className = 'lock'; b.appendChild(tag); }
      if (tag) tag.textContent = locked ? `locked: ${b.dataset.sp ? starOf('animals', id) : starOf('tools', id)}★` : '';
    });
    document.querySelectorAll('[data-count]').forEach(el => {
      const n = S.staff.filter(s => s.type === el.dataset.count).length;
      el.textContent = `${n} on staff`;
    });
  }
  function setSpeed(n) {
    S.speed = n;
    document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('on', +b.dataset.speed === n));
  }

  function renderHud() {
    $('money').textContent = money(S.money);
    $('money').classList.toggle('neg', S.money < 0);
    $('day').textContent = `Day ${S.day}`;
    $('clock').style.width = `${(S.time / DAY) * 100}%`;
    $('guests').textContent = guests.length * GROUP;
    $('rating').textContent = Math.round(S.rep);
    $('stars').textContent = starText(S.stars);
    $('ticket').textContent = money(S.ticket);
  }

  // The news in the corner can be minimized. While it's hidden, the button counts what's new.
  // The choice is remembered on this device; on a phone it starts minimized. The full news is always in the Menu.
  let newsMin = (() => { try { const v = localStorage.getItem('3dzoo-news-min'); return v === null ? innerWidth <= 640 : v === '1'; } catch (e) { return innerWidth <= 640; } })();
  let newsUnread = 0;
  function renderNews() {
    const el = $('news'), box = $('newsbox'), btn = $('news-toggle'); if (!el) return;
    box.classList.toggle('min', newsMin);
    btn.setAttribute('aria-expanded', String(!newsMin));
    btn.textContent = newsMin ? `News ▸${newsUnread ? ` (${newsUnread} new)` : ''}` : 'News ▾';
    el.innerHTML = newsMin ? '' : S.log.slice(0, 3).map(l => `<div>${escapeHtml(l.m)}</div>`).join('');
  }
  $('news-toggle').onclick = () => {
    newsMin = !newsMin; newsUnread = 0;
    try { localStorage.setItem('3dzoo-news-min', newsMin ? '1' : '0'); } catch (e) { /* storage blocked: just don't remember */ }
    renderNews();
  };
  const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function openPanel(mode) {
    panelMode = mode;
    $('panel').classList.toggle('wide', mode === 'staff');
    $('panel').classList.toggle('open', !!mode);
    renderPanel();
  }
  const bar = v => `<div class="bar"><span style="width:${clamp(v, 0, 100)}%"></span></div>`;

  function renderPanel() {
    const el = $('panel-body'); if (!panelMode) { el.innerHTML = ''; return; }
    if (panelMode === 'stars') {
      $('panel-title').textContent = `Zoo stars: ${S.stars} of ${MAX_STARS}`;
      const next = STARS[S.stars + 1];
      const goals = next ? next.need.map(g => {
        const [k, n] = g, have = GOAL[k].have(), ok = have >= n;
        return `<div class="row">${ok ? '✓' : '·'} ${GOAL[k].label(n)}</div><div class="row">${bar(100 * Math.min(have, n) / n)} <small>${Math.min(have, n)}/${n}</small></div>`;
      }).join('') : '';
      const ladder = STARS.slice(1).map((L, k) => {
        const n = k + 1, got = S.stars >= n, items = [...L.animals, ...L.tools].map(unlockName);
        return `<div class="card ${got ? '' : 'dim'}"><b>${starText(n)}</b>${got ? ' <small>earned</small>' : ''}<br>
          ${L.need.length ? `<small>Needs: ${L.need.map(([key, v]) => GOAL[key].label(v).toLowerCase()).join(', ')}</small><br>` : '<small>Where every zoo starts</small><br>'}
          ${items.length ? `<small>Unlocks: ${items.join(', ')}</small><br>` : ''}${L.mystery ? '<small>Unlocks: ???</small><br>' : ''}${L.color ? `<small>Color: ${L.color.toLowerCase()}</small>` : ''}</div>`;
      }).join('');
      el.innerHTML = (next ? `<div class="card"><b>Next star</b><br><small>Meet all of these at the same time.</small>${goals}</div>`
        : `<div class="card"><b>A ${MAX_STARS}-star zoo!</b><br><small>You've earned every star. Keep your eyes open...</small></div>`) + ladder;
      return;
    }
    if (panelMode === 'staff') {
      $('panel-title').textContent = 'Staff & training';
      const total = S.staff.reduce((t, x) => t + wageOf(x), 0);
      const row = x => {
        const k = x.skill || 1, max = k >= MAX_SKILL;
        return `<div class="staffrow"><canvas width="44" height="60" data-staff="${x.id}"></canvas><div class="who"><b>${escapeHtml(x.name)}</b> <span class="skill" title="Skill ${k} of ${MAX_SKILL}">${'★'.repeat(k)}${'☆'.repeat(MAX_SKILL - k)}</span>
          <small>${rankOf(x)}. ${escapeHtml(x.task || 'Getting started')}</small><small>${money(wageOf(x))}/day${max ? '' : `, ${money(Math.round(STAFF[x.type].wage * (1 + 0.3 * k)))}/day after training`}</small></div>
          <button data-train="${x.id}" ${max ? 'disabled' : ''}>${max ? 'Fully trained' : `Train ${money(trainCost(x))}`}</button>
          <button data-fire="${x.id}" title="Let go">X</button></div>`;
      };
      el.innerHTML = `<div class="card"><b>${S.staff.length} staff</b>, wages ${money(total)}/day<br>
        <small>Training raises a worker's skill (up to ${MAX_SKILL}). Skilled staff work faster but earn 30% more per level.</small></div>` +
        Object.entries(STAFF).map(([t, d]) => {
          const list = S.staff.filter(x => x.type === t);
          const perks = Object.entries(SKILL_PERKS[t]).map(([lvl, txt]) => `<small>Skill ${lvl}: ${txt}</small>`).join('<br>');
          return `<div class="card"><b>${d.name}s (${list.length})</b> <button data-hire="${t}">Hire ${money(d.hire)}</button><br>
            <small>${d.job}. Starts at ${money(d.wage)}/day.</small><br>${perks}</div>` + (list.map(row).join('') || '<p class="muted">Nobody hired yet.</p>');
        }).join('');
      el.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { hire(b.dataset.hire); renderTray(); });
      el.querySelectorAll('[data-train]').forEach(b => b.onclick = () => train(S.staff.find(x => x.id === +b.dataset.train)));
      drawStaffPortraits();
      el.querySelectorAll('[data-fire]').forEach(b => b.onclick = () => { fire(S.staff.find(x => x.id === +b.dataset.fire)); openPanel('staff'); renderTray(); });
      return;
    }
    if (panelMode === 'menu') {
      $('panel-title').textContent = 'Game';
      el.innerHTML = `<div class="card"><b>Ticket price</b><br><small>Higher prices bring in fewer guests.</small><br>
        <button data-tk="-5">−5</button> <button data-tk="-1">−1</button> <b id="tkv">${money(S.ticket)}</b>
        <button data-tk="1">+1</button> <button data-tk="5">+5</button></div>
        <div class="card"><b>Saving</b><br><small>The game saves on this device at the end of every day.</small><br>
        <button id="b-save">Save now</button> <button id="b-export">Export save file</button>
        <label class="filebtn">Import save file<input id="b-import" type="file" accept=".json,application/json"></label></div>
        <div class="card"><button id="b-new">Start a new zoo</button></div>
        <p class="muted">3D Zoo version ${VERSION}</p>
        <div class="card"><b>News</b>${S.log.slice(0, 12).map(l => `<div class="logline"><small>Day ${l.d}</small> ${escapeHtml(l.m)}</div>`).join('') || '<br><small>Nothing yet.</small>'}</div>`;
      el.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { S.ticket = clamp(S.ticket + +b.dataset.tk, 0, 60); renderHud(); renderPanel(); });
      $('b-save').onclick = () => save(false);
      $('b-export').onclick = exportSave;
      $('b-import').onchange = e => e.target.files[0] && importSave(e.target.files[0]);
      $('b-new').onclick = () => { if (confirm('Start over? Your current zoo will be replaced.')) { startWith(newState()); save(true); } };
      return;
    }
    if (panelMode === 'money') {
      $('panel-title').textContent = 'Money';
      const t = S.today, y = S.history[S.history.length - 1] || null;
      const row = (k, label) => `<tr><td>${label}</td><td>${money(t[k] || 0)}</td><td>${y ? money(y[k] || 0) : '-'}</td></tr>`;
      const ti = sumOf(t, INCOME), tc = sumOf(t, COSTS), yi = y ? sumOf(y, INCOME) : 0, yc = y ? sumOf(y, COSTS) : 0;
      el.innerHTML = `<div class="card"><b>Income vs costs</b><canvas id="fin" width="580" height="300" style="width:100%;height:auto;display:block;margin-top:6px"></canvas>
        <div class="legend"><span><i class="sw solid"></i>Income</span><span><i class="sw hatch"></i>Costs</span><small>Today is still adding up.</small></div></div>
        <div class="card"><table class="fin"><tr><th></th><th>Today</th><th>${y ? 'Day ' + y.day : 'Yesterday'}</th></tr>
        <tr class="sec"><td colspan="3">Income</td></tr>${Object.entries(INCOME).map(([k, l]) => row(k, l)).join('')}
        <tr class="tot"><td>Total income</td><td>${money(ti)}</td><td>${y ? money(yi) : '-'}</td></tr>
        <tr class="sec"><td colspan="3">Costs</td></tr>${Object.entries(COSTS).map(([k, l]) => row(k, l)).join('')}
        <tr class="tot"><td>Total costs</td><td>${money(tc)}</td><td>${y ? money(yc) : '-'}</td></tr>
        <tr class="tot"><td>Profit</td><td>${money(ti - tc)}</td><td>${y ? money(yi - yc) : '-'}</td></tr></table>
        <small>Staff wages and building upkeep are paid at the end of each day.</small></div>`;
      drawFinance($('fin'));
      return;
    }
    if (panelMode === 'rating') {
      $('panel-title').textContent = 'Rating';
      const r = Math.round(S.rep), word = r >= 80 ? 'Excellent' : r >= 60 ? 'Good' : r >= 40 ? 'Fair' : 'Poor';
      const avg = S.animals.length ? S.animals.reduce((s, a) => s + a.happy, 0) / S.animals.length : null;
      const pathTiles = S.tiles.filter(t => t === PATH).length, litter = Object.values(S.litter).reduce((s, n) => s + n, 0);
      const exTiles = EX.reduce((s, E) => s + E.tiles.length, 0), poop = Object.values(S.poop).reduce((s, n) => s + n, 0);
      const species = new Set(S.animals.map(a => a.sp)).size;
      const factors = [
        ['Animal happiness', avg, avg === null ? 'No animals yet' : `${Math.round(avg)} on average`],
        ['Clean paths', 100 * Math.max(0, 1 - litter / Math.max(4, pathTiles * 0.25)), `${litter} piece(s) of litter`],
        ['Clean exhibits', exTiles ? 100 * Math.max(0, 1 - poop / Math.max(3, exTiles * 0.15)) : null, exTiles ? `${poop} dropping(s)` : 'No exhibits yet'],
        ['Variety', 100 * species / Z.ids.length, `${species} of ${Z.ids.length} species`],
        ['Value for money', clamp((40 - S.ticket) / 25 * 100, 0, 100), `${money(S.ticket)} ticket`],
        ['Education center', hasBuilding('edu') ? 100 : 0, hasBuilding('edu') ? `${S.today.eduVisits} visit(s) today` : 'Not built'],
        ['Gift shop', hasBuilding('gift') ? 100 : 0, hasBuilding('gift') ? `${S.today.plush} stuffed animal(s) sold today` : 'Not built'],
      ];
      const said = Object.entries(S.comments).sort((a, b) => b[1] - a[1]).slice(0, 6);
      el.innerHTML = `<div class="card"><div class="bigrow"><span class="big">${r}</span><span>out of 100<br><b>${word}</b></span></div>
        <small>The rating is how happy guests feel when they leave. A higher rating brings more guests each day.</small></div>
        <div class="card"><b>What affects it</b>${factors.map(([n, v, note]) => `<div class="row">${n} ${v === null ? '<span class="bar empty"></span>' : bar(v)}</div><small>${note}</small>`).join('')}</div>
        <div class="card"><b>What guests are saying</b>${said.length ? said.map(([c, n]) => `<div class="logline">"${escapeHtml(c)}" <small>x${Math.max(1, Math.round(n))}</small></div>`).join('') : '<br><small>No comments yet. Guests share their thoughts on the way out.</small>'}</div>`;
      return;
    }
    if (panelMode === 'help') {
      $('panel-title').textContent = 'How to play';
      el.innerHTML = `<ol class="help">
        <li>Earn <b>stars</b> by running a good zoo. Each star unlocks new animals and buildings, and brings a little more color to the zoo. Click the stars at the top to see your next goal.</li>
        <li>The bar at the bottom has three tabs: <b>Build</b> (paths, fences, exhibit items, buildings), <b>Animals</b>, and <b>Staff</b>.</li>
        <li>Draw <b>paths</b> from the entrance so guests can walk around.</li>
        <li>Surround a patch of grass with <b>fences</b> to make an exhibit. It must be fully closed and right beside a path so keepers can get in.</li>
        <li>Add what the animal wants: a <b>tree</b>, <b>bush</b>, <b>water</b>, or <b>toy</b>.</li>
        <li>Buy <b>animals</b> and click them into the exhibit. Give each one enough room.</li>
        <li>Hire <b>keepers</b> to put out food and clean exhibits, and <b>janitors</b> to sweep litter. Food costs money each time a keeper puts it out.</li>
        <li>Toys (a <b>ball</b>, an <b>exercise wheel</b>, or a <b>scratching post</b>) make animals a little happier. Each animal has favorite kinds of tree and toy.</li>
        <li>Cold animals like penguins, snow leopards, and polar bears want a <b>snowy</b> floor. Paint snow over at least half of the exhibit.</li>
        <li>Sharks and orcas live in <b>tank water</b> (at least 12 tiles, inside a fence). They need lots of room, costly food, and a keeper trained to skill ${SPECIALIST_SKILL}. Orcas need company.</li>
        <li>Animals that share the African savanna in the wild (zebra, giraffe, ostrich, rhino, elephant, hippo) can share an exhibit. Other animals live only with their own kind.</li>
        <li>Birds that fly (sea hawks, parrots, toucans, owls, eagles) need an <b>aviary</b>: an exhibit closed in with <b>aviary mesh</b> all the way around. You can paint mesh right over an existing fence. Parrots and toucans can share an aviary.</li>
        <li>If an animal gets out, a keeper will lead it back to an exhibit it can live in.</li>
        <li>Train your staff from <b>Staff & training</b>. Skilled staff are faster and better at their jobs, but cost more.</li>
        <li>Guests stop at the fence to watch the animals, and linger longer at their favorites, babies, and happy animals.</li>
        <li>Guests pay a ticket at the gate. Happy animals and clean paths bring more guests and a better rating. Click the <b>money</b> or <b>rating</b> at the top for details.</li>
        <li>Build a <b>gift shop</b> next to a path. Guests may buy a stuffed version of their favorite animal.</li>
        <li>Build an <b>education center</b> next to a path. Guests who visit learn a fact and enjoy the exhibits more.</li>
        <li>Click an animal to see how it's doing, give it a new name, or <b>move</b> it to another exhibit. A keeper will walk it over.</li>
        <li>Two happy adults of the same species with spare room may have a <b>baby</b>. Babies grow up in ${GROW_DAYS} days.</li>
        <li>Too crowded? Sell an animal to another zoo. You only get back a little of what it cost.</li></ol>
        <p class="muted">Move around by dragging, or sliding two fingers on a trackpad. Pinch to zoom (with a mouse, hold Ctrl or ⌘ and scroll), or use the + and − buttons. Space pauses. Esc goes back to the look tool.</p>`;
      return;
    }
    if (panelMode === 'info') {
      if (!selected) { openPanel(null); return; }
      if (selected.kind === 'animal') {
        const a = selected.ref; if (!S.animals.includes(a)) { openPanel(null); return; }
        const d = Z.SPECIES[a.sp], p = happinessParts(a, lastExStats.length ? lastExStats : exStats());
        $('panel-title').textContent = `${a.name} the ${d.name.toLowerCase()}`;
        const doing = a.transit ? 'Being moved to a new exhibit' : a.loose ? (a.ledBy != null ? 'Being led home by a keeper' : 'Got out! Waiting for a keeper') : a.act === 'eat' ? 'Eating' : a.act === 'play' ? `Playing with the ${ITEM_NAME[a.toy] || 'ball'}` : a.goal === 'food' ? 'Heading to the food' :
          a.goal === 'toy' ? 'Going to play' : a.hunger > 60 ? 'Hungry, waiting for a keeper' : 'Wandering around';
        const diet = DIET[a.sp];
        el.innerHTML = `<div class="card"><b>${a.baby ? `Baby, grows up in ${Math.max(1, Math.ceil(GROW_DAYS - a.age))} day(s)` : 'Adult'}</b><br>
          <small>${doing}. Eats ${diet.food}, ${money(diet.cost * (a.baby ? 0.5 : 1))} a meal.</small>
          <div class="row">Happiness ${bar(a.happy)} ${Math.round(a.happy)}</div>
          <div class="row">Wants ${bar(p.wants * 100)}</div>
          <small>${p.have.length ? 'Has ' + p.have.map(wantName).join(', ') + '. ' : ''}${p.missing.length ? 'Missing ' + p.missing.map(wantName).join(', ') + '.' : 'Everything it wants!'}</small>
          ${(p.notes || []).map(n => `<br><small>${n}.</small>`).join('')}
          ${(FAVORITE[a.sp] || []).length ? `<br><small>Favorites: ${FAVORITE[a.sp].map(k => ITEM_NAME[k]).join(', ')}.</small>` : ''}
          <div class="row">Space ${bar(p.space * 100)}</div>
          <div class="row">Fed ${bar(p.food * 100)}</div>
          <div class="row">Clean ${bar(p.clean * 100)}</div></div>
          <div class="card"><b>Name</b><br><input id="nm" maxlength="16" value="${escapeHtml(a.name)}" aria-label="Animal name"> <button id="b-name">Rename</button></div>
          <div class="card">${a.moveTo != null ? (a.transit ? '<small>On the way to its new exhibit.</small>' : '<small>Waiting for a keeper to move it.</small><br><button id="b-unmove">Cancel the move</button>')
            : `<button id="b-move" ${a.loose ? 'disabled' : ''}>Move to another exhibit</button>`}</div>
          <div class="card"><button id="b-sell">Sell to another zoo for ${money(d.cost * (a.baby ? SELL_BABY : SELL_ADULT))}</button></div>`;
        if ($('b-move')) $('b-move').onclick = () => startMove(a);
        if ($('b-unmove')) $('b-unmove').onclick = () => { a.moveTo = null; renderPanel(); };
        $('b-sell').onclick = () => sellAnimal(a);
        $('b-name').onclick = () => renameAnimal(a, $('nm').value);
        $('nm').onkeydown = e => { if (e.key === 'Enter') renameAnimal(a, $('nm').value); };
      } else if (selected.kind === 'staff') {
        const s = selected.ref; if (!S.staff.includes(s)) { openPanel(null); return; }
        const d = STAFF[s.type];
        $('panel-title').textContent = `${s.name}, ${rankOf(s).toLowerCase()}`;
        const k = s.skill || 1;
        el.innerHTML = `<div class="card">${escapeHtml(s.task || 'Getting started')}<br><small>Skill ${k} of ${MAX_SKILL}. Wage ${money(wageOf(s))}/day</small><br>
          ${k < MAX_SKILL ? `<button id="b-train">Train to skill ${k + 1} for ${money(trainCost(s))}</button>` : '<small>Fully trained.</small>'}</div>
          <div class="card"><button id="b-fire">Let ${escapeHtml(s.name)} go</button></div>`;
        $('b-fire').onclick = () => fire(s);
        if ($('b-train')) $('b-train').onclick = () => train(s);
      } else if (selected.kind === 'guest') {
        const g = selected.ref;
        $('panel-title').textContent = 'Visitors';
        const mood = g.happy > 70 ? 'Having a great time' : g.happy > 45 ? 'Enjoying the zoo' : g.happy > 25 ? 'A bit bored' : 'Unhappy';
        el.innerHTML = `<div class="card"><div class="row">Happiness ${bar(g.happy)}</div><small>${mood}. Seen ${g.seen.size} exhibit(s).${g.watch ? (g.watch.ex >= 0 ? ` Watching the ${plural(g.watch.sp)}.` : ' Taking a breather.') : ''}${g.leaving ? ' Heading home.' : ''}${g.inside ? ` Inside the ${BUILDINGS[g.inside.type].name.toLowerCase()}.` : ''}<br>
          ${g.wish ? `Came hoping to see the ${plural(g.wish)}${g.gotWish ? ', and did' : ''}. ` : ''}${g.plan && g.plan.length ? `${g.plan.length} more exhibit(s) to visit. ` : ''}
          ${g.fav ? `Favorite animal: ${Z.SPECIES[g.fav].name.toLowerCase()}.` : 'No favorite animal yet.'}${g.plush ? ` Carrying a stuffed ${Z.SPECIES[g.plush].name.toLowerCase()}.` : ''}</small>
          ${g.learned ? `<br><small>Learned: ${FACTS[g.learned]}</small>` : ''}</div>`;
      } else if (selected.kind === 'building') {
        const it = S.items[selected.tile], b = BUILDINGS[it]; if (!b) { openPanel(null); return; }
        $('panel-title').textContent = b.name;
        if (it === 'gift') {
          const sales = Object.entries(S.plushSales).sort((x, y) => y[1] - x[1]);
          el.innerHTML = `<div class="card"><small>${b.job}. Stuffed animals sell for ${money(PLUSH_PRICE)} and cost the zoo ${money(PLUSH_COST)} each. Upkeep ${money(b.upkeep)}/day.</small></div>
            <div class="card"><b>Sold today: ${S.today.plush}</b> (${money(S.today.gifts || 0)})<br><small>All-time favorites:</small>
            ${sales.length ? sales.map(([sp, n]) => `<div class="row">${Z.SPECIES[sp].name} ${bar(100 * n / sales[0][1])} ${n}</div>`).join('') : '<br><small>Nothing sold yet. Guests need to see an animal they like first.</small>'}</div>`;
        } else {
          const here = [...new Set(S.animals.map(a => a.sp))];
          el.innerHTML = `<div class="card"><small>${b.job}. Upkeep ${money(b.upkeep)}/day.</small><br><b>Visitors today: ${S.today.eduVisits}</b></div>
            <div class="card"><b>What guests learn here</b>${(here.length ? here : Z.ids).map(sp => `<div class="logline"><b>${Z.SPECIES[sp].name}:</b> ${FACTS[sp]}</div>`).join('')}
            ${here.length ? '' : '<small>Lessons cover your own animals once you have some.</small>'}</div>`;
        }
      } else {
        const E = EX[exOf[selected.tile]]; if (!E) { openPanel(null); return; }
        const st = (lastExStats.length ? lastExStats : exStats())[E.id];
        const counts = {}; st.list.forEach(a => { const k = Z.SPECIES[a.sp].name + (a.baby ? ' (baby)' : ''); counts[k] = (counts[k] || 0) + 1; });
        $('panel-title').textContent = 'Exhibit';
        el.innerHTML = `<div class="card"><b>${E.tiles.length} tiles</b>, room for about ${Math.round(E.tiles.length - st.need)} more tiles of animals<br>
          <small>Animals: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'none yet'}<br>
          Items: ${Object.entries(E.kinds).map(([k, v]) => `${v} ${ITEM_NAME[k] || k}`).join(', ') || 'none'}<br>
          ${E.tankTiles.length ? `Tank water: ${E.tankTiles.length} tiles${E.items.tank ? '' : ' (needs 12 for an aquarium)'}<br>` : ''}${E.snow ? `Snow: ${E.snow} tiles${E.items.snow ? ', snowy enough for cold animals' : ' (cover half the land for cold animals)'}<br>` : ''}${E.aviary ? 'An aviary: birds can live here.<br>' : ''}${st.mixed ? 'A mixed exhibit.<br>' : ''}
          Droppings: ${st.poop}<br>Food out: ${Object.entries(st.food).map(([sp, n]) => `${n} ${DIET[sp].food} for the ${plural(sp)}`).join(', ') || 'none'}<br>${E.reachable ? 'Keepers can get in.' : '<b>Keepers have to cut through other exhibits to get here.</b> A path or open grass beside the fence makes it easier.'}</small></div>`;
      }
      return;
    }
  }

  function drawFinance(cv) {
    const c = cv.getContext('2d'), w = cv.width / 2, h = cv.height / 2;
    c.setTransform(2, 0, 0, 2, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    const rows = S.history.slice(-9).map(r => ({ label: 'D' + r.day, inc: sumOf(r, INCOME), cost: Math.max(0, sumOf(r, COSTS)) }));
    rows.push({ label: 'Now', inc: sumOf(S.today, INCOME), cost: Math.max(0, sumOf(S.today, COSTS)), partial: true });
    const vals = rows.flatMap(r => [r.inc, r.cost]).sort((a, b) => b - a);
    const clipped = vals[1] > 0 && vals[0] > vals[1] * 3;             // one huge day (like opening construction)
    const max = Math.max(100, clipped ? vals[1] * 1.25 : vals[0]);
    const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(v => v >= raw), top = step * 4;
    const L = 40, B = 18, Tp = 6, R = 4, ph = h - B - Tp, pw = w - L - R;
    const short = v => v >= 1000 ? `$${+(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `$${Math.round(v)}`;
    c.font = '10px "Courier New", monospace'; c.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = top * k / 4, yy = Tp + ph - ph * k / 4;
      c.strokeStyle = k ? '#ddd' : '#111'; c.lineWidth = 1; c.beginPath(); c.moveTo(L, yy); c.lineTo(w - R, yy); c.stroke();
      c.fillStyle = '#555'; c.textAlign = 'right'; c.fillText(short(v), L - 4, yy);
    }
    const gw = pw / rows.length, bw = Math.min(12, (gw - 6) / 2);
    rows.forEach((r, k) => {
      const gx = L + gw * k + gw / 2;
      const hi = ph * Math.min(r.inc, top) / top, hc = ph * Math.min(r.cost, top) / top;
      c.setLineDash(r.partial ? [3, 2] : []);
      c.fillStyle = '#111'; c.fillRect(gx - bw - 1, Tp + ph - hi, bw, hi);
      if (r.partial) { c.strokeStyle = '#111'; c.strokeRect(gx - bw - 1, Tp + ph - hi, bw, hi); }
      c.save(); c.beginPath(); c.rect(gx + 1, Tp + ph - hc, bw, hc); c.clip();
      c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#111'; c.lineWidth = 1; c.setLineDash([]);
      for (let d = -ph; d < ph; d += 4) { c.beginPath(); c.moveTo(gx + 1, Tp + ph - hc + d); c.lineTo(gx + 1 + bw, Tp + ph - hc + d - bw); c.stroke(); }
      c.restore();
      c.setLineDash(r.partial ? [3, 2] : []); c.lineWidth = 1.2; c.strokeStyle = '#111'; c.strokeRect(gx + 1, Tp + ph - hc, bw, hc); c.setLineDash([]);
      [[r.inc, gx - bw - 1], [r.cost, gx + 1]].forEach(([v, bx]) => {
        if (v <= top) return;
        // break mark and the real value for a bar that runs off the top
        c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx - 1, Tp + 16); c.lineTo(bx + bw + 1, Tp + 12); c.lineTo(bx + bw + 1, Tp + 16); c.lineTo(bx - 1, Tp + 20); c.closePath(); c.fill();
        const label = short(v); c.font = 'bold 9px "Courier New", monospace'; c.textAlign = 'left';
        const lx = Math.min(w - R - c.measureText(label).width - 2, bx + bw + 3);
        c.fillStyle = '#fff'; c.fillRect(lx - 1, Tp + 1, c.measureText(label).width + 2, 10);
        c.fillStyle = '#111'; c.fillText(label, lx, Tp + 6); c.font = '10px "Courier New", monospace';
      });
      c.fillStyle = '#111'; c.textAlign = 'center'; c.fillText(r.label, gx, h - B / 2 + 1);
    });
  }

  function renderAll() { renderHud(); renderNews(); renderPanel(); setSpeed(S.speed); }

  // toolbar wiring
  function wireTray() {
  document.querySelectorAll('#tools button[data-tool]').forEach(b => b.onclick = () => {
    const t = b.dataset.tool;
    if (b.classList.contains('locked')) { toastLocked(b.dataset.sp || t); return; }
    if (t === 'animal') {
      moving = null;
      const d = Z.SPECIES[b.dataset.sp];
      setTool('animal', b.dataset.sp);
      toast(`${d.name}s want: ${d.wants.join(', ')}. Click inside a fenced exhibit.`);
      return;
    }
    setTool(t);
  });
  document.querySelectorAll('#tray [data-hire]').forEach(b => b.onclick = () => { hire(b.dataset.hire); renderTray(); });
  $('b-staff').onclick = () => openPanel(panelMode === 'staff' ? null : 'staff');
  }
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('s-money').onclick = () => openPanel(panelMode === 'money' ? null : 'money');
  $('s-rating').onclick = () => openPanel(panelMode === 'rating' ? null : 'rating');
  $('s-stars').onclick = () => openPanel(panelMode === 'stars' ? null : 'stars');
  $('b-menu').onclick = () => openPanel(panelMode === 'menu' ? null : 'menu');
  $('b-help').onclick = () => openPanel(panelMode === 'help' ? null : 'help');
  $('panel-close').onclick = () => { openPanel(null); selected = null; };
  document.querySelectorAll('#speed button').forEach(b => b.onclick = () => setSpeed(+b.dataset.speed));
  $('zoom-in').onclick = () => zoomAt(W / 2, H / 2, 1.25);
  $('zoom-out').onclick = () => zoomAt(W / 2, H / 2, 0.8);

  // ---------- main loop ----------
  let last = performance.now(), hudT = 0, saveT = 0;
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000); last = now; clock += dt;
    fadeTint(dt);
    const pan = 400 * dt / view.zoom;
    if (keys.has('arrowleft') || keys.has('a')) view.x -= pan;
    if (keys.has('arrowright') || keys.has('d')) view.x += pan;
    if (keys.has('arrowup') || keys.has('w')) view.y -= pan;
    if (keys.has('arrowdown') || keys.has('s')) view.y += pan;
    clampView();
    // simulate in small steps so 3x speed stays smooth
    const steps = Math.ceil(dt * S.speed / 0.05) || 1;
    for (let k = 0; k < steps; k++) tick(dt / steps);
    render();
    hudT += dt; saveT += dt;
    if (hudT > 0.25) { hudT = 0; renderHud(); renderTray(); if (['info', 'staff', 'money', 'rating', 'stars'].includes(panelMode)) renderPanelLive(); }
    if (tab === 'animals') drawShopPreviews();
    if (saveT > 30) { saveT = 0; save(true); }
    requestAnimationFrame(frame);
  }
  // refresh info bars without rebuilding buttons mid-click
  let liveT = 0;
  function renderPanelLive() {
    liveT++;
    const typing = document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.closest('#panel');
    if (liveT % 4 === 0 && !typing && !document.querySelector('#panel button:active')) renderPanel();
  }
  function drawShopPreviews() {
    document.querySelectorAll('canvas[data-prev]').forEach(cv => {
      const c = cv.getContext('2d'), id = cv.dataset.prev, ok = approved(id, false);
      const w = cv.width, h = cv.height, k = h / 60, ground = h - 4;
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#111'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, ground); c.lineTo(w, ground); c.stroke();
      c.globalAlpha = ok ? 1 : 0.35;
      // only walk the animal that's currently picked, the rest stand still
      const moving = tool === 'animal' && toolSpecies === id;
      Z.draw(c, id, w / 2, ground, { phase: moving ? clock * 5 : 0, moving, scale: 0.42 * k * Z.SPECIES[id].galleryScale });
      c.globalAlpha = 1;
    });
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.addEventListener('beforeunload', () => save(true));

  // ---------- start ----------
  resize();
  if (!loadSaved()) S = newState();
  startWith(S);
  if (!S.log.length) log('Welcome to 3D Zoo! Open "How to play" to get started.');
  setTab('build');
  setTool('look');
  requestAnimationFrame(frame);

  // small hook for automated testing
  window.__zoo = { get toyPlay() { return toyPlay; }, renameAnimal, openPanel, select: o => { selected = o; openPanel('info'); }, get S() { return S; }, get EX() { return EX; }, get guests() { return guests; }, tick, setTab, checkStars, STARS, applyTool: (t, x, y, sp) => { setTool(t, sp); applyTool(idx(x, y), true); }, hire, recompute, save, loadSaved, serialize, deserialize, startWith, newState, setSpeed, view, sellAnimal, startMove, moveTo };
})();
