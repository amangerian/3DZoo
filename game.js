/* 3D Zoo — game engine: map, exhibits, animals, guests, staff, economy, saving. */
(function () {
  'use strict';
  const Z = window.ZooAnimals, A = window.ZooArt;

  // ---------- constants ----------
  const T = 32, MW = 48, MH = 32, DAY = 60;          // tile px, map size, seconds per in-game day
  const ENT = { x: Math.floor(MW / 2), y: MH - 1 };
  const GRASS = 0, PATH = 1, FENCE = 2;
  const COST = { path: 10, fence: 25, tree: 150, bush: 60, water: 200, toy: 120 };
  const STAFF = {
    janitor: { name: 'Janitor', hire: 500, wage: 60, job: 'Sweeps litter off the paths' },
    keeper: { name: 'Keeper', hire: 800, wage: 90, job: 'Feeds animals and cleans exhibits' },
  };
  // Movement speed (px/s) and space each adult needs (tiles) for every species.
  const SPEC = {
    lion: { speed: 14, space: 6 }, elephant: { speed: 10, space: 10 }, giraffe: { speed: 13, space: 8 },
    zebra: { speed: 15, space: 5 }, penguin: { speed: 8, space: 2 }, bear: { speed: 11, space: 6 },
    monkey: { speed: 16, space: 3 }, flamingo: { speed: 10, space: 2 }, snowleopard: { speed: 14, space: 6 },
  };
  const WORLD_SCALE = 0.34;
  const GROW_DAYS = 4;
  const SELL_ADULT = 0.15, SELL_BABY = 0.1;          // selling returns only a small fraction
  const MAX_GUESTS = 160;
  const SAVE_KEY = '3dzoo-save-v1';
  const ITEM_CHAR = { tree: 't', bush: 'b', water: 'w', toy: 'y' };
  const CHAR_ITEM = { t: 'tree', b: 'bush', w: 'water', y: 'toy' };
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
      v: 1, money: 25000, day: 1, time: 0, speed: 1, ticket: 15, rep: 50,
      tiles, items: new Array(MW * MH).fill(null), animals: [], staff: [],
      litter: {}, poop: {}, nextId: 1, log: [], arrivalAcc: 0,
      today: { guests: 0, tickets: 0, wages: 0, sales: 0, births: 0 }, totals: { guests: 0, births: 0 },
    };
  }

  // ---------- log & toasts ----------
  function log(msg) {
    S.log.unshift({ d: S.day, m: msg });
    S.log.length = Math.min(S.log.length, 40);
    renderNews();
  }
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
      if (seen[s] || S.tiles[s] !== GRASS) continue;
      const region = [s]; seen[s] = 1; let open = false;
      for (let k = 0; k < region.length; k++) {
        const i = region[k], x = tx(i), y = ty(i);
        if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) open = true;
        for (const n of neighbors(i)) {
          if (seen[n]) continue;
          if (S.tiles[n] === PATH) { open = true; continue; }
          if (S.tiles[n] !== GRASS) continue;
          seen[n] = 1; region.push(n);
        }
      }
      if (open || region.length > 500) continue;
      const id = EX.length, items = { tree: 0, bush: 0, water: 0, toy: 0 };
      region.forEach(i => { exOf[i] = id; if (S.items[i]) items[S.items[i]]++; });
      EX.push({ id, tiles: region, items });
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
        for (const n of neighbors(i)) {
          if (S.tiles[n] !== FENCE) continue;
          if (neighbors(n).some(m => S.tiles[m] === PATH)) {
            gateOf[n] = gateOf[n] || [];
            if (!gateOf[n].includes(E.id)) gateOf[n].push(E.id);
          }
        }
      });
      E.reachable = E.tiles.some(i => neighbors(i).some(n => gateOf[n]));
    });
    if (fix) fixEntities();
  }

  function fixEntities() {
    // Animals: keep each one inside an exhibit; nudge it if a fence landed on it.
    S.animals = S.animals.filter(a => {
      let i = tileAt(a.x, a.y);
      if (i >= 0 && exOf[i] >= 0) { a.ex = exOf[i]; return true; }
      const near = bfs(i, () => true, j => exOf[j] >= 0, 4);
      if (near && near.length) {
        const j = near[near.length - 1], c = center(j);
        a.x = c.x; a.y = c.y; a.ex = exOf[j]; a.path = []; return true;
      }
      log(`${a.name} the ${Z.SPECIES[a.sp].name.toLowerCase()} had no exhibit left and was sent to another zoo.`);
      return false;
    });
    // Staff walk out to a path and rethink their job.
    S.staff.forEach(s => {
      s.path = []; s.workT = 0;
      const i = tileAt(s.x, s.y);
      if (s.type === 'keeper') { s.state = 'leave'; s.ex = i >= 0 ? exOf[i] : -1; }
      if (i < 0 || (S.tiles[i] !== PATH && (s.type === 'janitor' || exOf[i] < 0) && !gateOf[i])) warpToEntrance(s);
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
      if (Math.abs(dx) > 0.5) e.facing = dx > 0 ? 1 : -1;
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
    // per-exhibit totals used by happiness and breeding
    return EX.map(E => {
      const list = S.animals.filter(a => a.ex === E.id);
      const need = list.reduce((s, a) => s + SPEC[a.sp].space * (a.baby ? 0.5 : 1), 0);
      const poop = E.tiles.reduce((s, i) => s + (S.poop[i] || 0), 0);
      return { list, need, poop, space: need ? Math.min(1, E.tiles.length / need) : 1 };
    });
  }

  function happinessParts(a, st) {
    const E = EX[a.ex], sp = Z.SPECIES[a.sp], x = st[a.ex];
    const have = sp.wants.filter(w => E.items[w] > 0);
    return {
      wants: have.length / sp.wants.length, have, missing: sp.wants.filter(w => !E.items[w]),
      space: x.space,
      food: 1 - clamp((a.hunger - 30) / 70, 0, 1),
      clean: Math.max(0, 1 - x.poop / Math.max(3, E.tiles.length * 0.15)),
    };
  }
  const happyTarget = p => 100 * (0.4 * p.wants + 0.2 * p.space + 0.2 * p.food + 0.2 * p.clean);

  function updateAnimal(a, dt, st) {
    a.hunger = Math.min(100, a.hunger + dt * 100 / (DAY * 1.5));
    a.age += dt / DAY;
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

    if (a.wait > 0) { a.wait -= dt; a.moving = false; return; }
    if (!a.path.length) {
      const E = EX[a.ex];
      const spots = E.tiles.filter(i => S.items[i] !== 'tree' && S.items[i] !== 'water');
      const goalTile = (spots.length ? spots : E.tiles)[Math.floor(Math.random() * (spots.length || E.tiles.length))];
      const route = bfs(tileAt(a.x, a.y), i => exOf[i] === a.ex, i => i === goalTile);
      if (route && route.length) a.path = toPoints(route.slice(-5), 14);
      a.wait = route && route.length ? 0 : 1 + Math.random() * 2;
      if (!a.path.length) return;
    }
    const moved = stepAlong(a, SPEC[a.sp].speed * (a.baby ? 0.85 : 1) * dt);
    a.phase += moved * (a.baby ? 0.75 : 0.5);
    a.moving = moved > 0;
    if (!a.path.length) a.wait = 1 + Math.random() * 4;
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
            log(`The ${Z.SPECIES[sp].name.toLowerCase()}s seem ready for a baby, but baby art is awaiting approval.`);
          return;
        }
        if (avg >= 70 && roomy && Math.random() < 0.3) {
          const mom = adults[Math.floor(Math.random() * adults.length)];
          const b = makeAnimal(sp, mom.x - 10, mom.y + 2, true); b.ex = id; b.happy = 80;
          S.animals.push(b); S.today.births++; S.totals.births++;
          log(`A baby ${Z.SPECIES[sp].name.toLowerCase()} named ${b.name} was born!`);
        }
      });
    });
  }

  // ---------- guests ----------
  function spawnGuest() {
    const c = center(idx(ENT.x, ENT.y));
    guests.push({ x: c.x + (Math.random() - 0.5) * 10, y: c.y, path: [], phase: Math.random() * 6, facing: 1, happy: 55,
      seen: new Set(), visits: new Map(), stay: DAY * (0.5 + Math.random() * 0.6), leaving: false,
      litterT: 20 + Math.random() * 30, look: A.randomGuestLook(), moving: true });
    S.money += S.ticket; S.today.tickets += S.ticket; S.today.guests++; S.totals.guests++;
  }

  function guestSees(g, i) {
    (viewOf[i] || []).forEach(eid => {
      if (g.seen.has(eid)) return;
      g.seen.add(eid);
      const list = S.animals.filter(a => a.ex === eid);
      if (!list.length) return;
      let gain = list.reduce((s, a) => s + Z.SPECIES[a.sp].appeal * (a.happy / 100) * (a.baby ? 1.4 : 1), 0) * 0.9;
      gain = Math.min(22, gain);
      const avg = list.reduce((s, a) => s + a.happy, 0) / list.length;
      if (avg < 40) gain -= 6;
      g.happy = clamp(g.happy + gain, 0, 100);
    });
  }

  function updateGuest(g, dt) {
    g.stay -= dt;
    if (!g.leaving && (g.stay <= 0 || g.happy < 15)) { g.leaving = true; }
    g.litterT -= dt;
    if (g.litterT <= 0) {
      g.litterT = 25 + Math.random() * 30;
      const i = tileAt(g.x, g.y);
      if (i >= 0 && S.tiles[i] === PATH && Math.random() < 0.35) S.litter[i] = Math.min(5, (S.litter[i] || 0) + 1);
    }
    if (!g.path.length) {
      const i = tileAt(g.x, g.y);
      if (g.leaving) {
        if (i === idx(ENT.x, ENT.y)) { g.gone = true; return; }
        const r = bfs(i, j => S.tiles[j] === PATH, j => j === idx(ENT.x, ENT.y));
        if (!r) { g.gone = true; return; }
        g.path = toPoints(r, 10);
      } else {
        guestSees(g, i);
        if (S.litter[i]) g.happy = clamp(g.happy - 0.7 * S.litter[i], 0, 100);
        g.visits.set(i, (g.visits.get(i) || 0) + 1);
        const opts = neighbors(i).filter(n => S.tiles[n] === PATH);
        if (!opts.length) { g.leaving = true; return; }
        let best = Infinity, picks = [];
        opts.forEach(n => {
          const v = (g.visits.get(n) || 0) + Math.random() * 0.8 + (n === g.prev ? 1.5 : 0);
          if (v < best - 0.01) { best = v; picks = [n]; } else if (Math.abs(v - best) < 0.01) picks.push(n);
        });
        g.prev = i;
        g.path = toPoints([picks[0]], 14);
      }
    }
    const moved = stepAlong(g, 22 * dt);
    g.phase += moved * 0.45; g.moving = moved > 0;
  }

  // ---------- staff ----------
  function hire(type) {
    const d = STAFF[type];
    if (S.money < d.hire) { toast(`Not enough money to hire a ${d.name.toLowerCase()}.`); return; }
    S.money -= d.hire;
    const c = center(idx(ENT.x, ENT.y));
    S.staff.push({ id: S.nextId++, type, x: c.x, y: c.y, path: [], phase: 0, facing: 1, workT: 0, state: 'idle', ex: -1,
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
      if (s.workT <= 0 && s.sweeping) { const i = tileAt(s.x, s.y); delete S.litter[i]; s.sweeping = false; }
      return;
    }
    if (!s.path.length) {
      const i = tileAt(s.x, s.y);
      if (S.litter[i]) { s.workT = 1.2; s.sweeping = true; s.task = 'Sweeping'; return; }
      const r = bfs(i, j => S.tiles[j] === PATH, j => !!S.litter[j]);
      if (r) { s.path = toPoints(r); s.task = 'Heading to litter'; }
      else { s.task = 'Patrolling'; wander(s); }
    }
    const moved = stepAlong(s, 26 * dt); s.phase += moved * 0.45; s.moving = moved > 0;
  }

  const keeperPass = E => j => S.tiles[j] === PATH || exOf[j] === E || (gateOf[j] && gateOf[j].includes(E));
  const unreachableUntil = {};

  function updateKeeper(s, dt, st) {
    if (s.workT > 0) {
      s.workT -= dt; s.moving = false;
      if (s.workT <= 0) {
        if (s.doing === 'clean') { delete S.poop[tileAt(s.x, s.y)]; }
        if (s.doing === 'feed') {
          S.animals.forEach(a => { if (a.ex === s.ex) a.hunger = 0; });
          s.state = 'leave';
        }
        s.doing = null;
      }
      return;
    }
    if (!s.path.length) {
      const here = tileAt(s.x, s.y);
      if (s.state === 'idle') {
        const claimed = new Set(S.staff.filter(o => o !== s && o.type === 'keeper' && o.state !== 'idle').map(o => o.ex));
        let bestE = -1, bestScore = 22;
        st.forEach((x, id) => {
          if (!x.list.length || claimed.has(id) || (unreachableUntil[id] || 0) > S.day * DAY + S.time) return;
          const hunger = x.list.reduce((m, a) => Math.max(m, a.hunger), 0);
          const score = hunger + x.poop * 9;
          if (score > bestScore) { bestScore = score; bestE = id; }
        });
        if (bestE >= 0) {
          const r = bfs(here, keeperPass(bestE), j => exOf[j] === bestE);
          if (r) { s.ex = bestE; s.state = 'work'; s.path = toPoints(r); s.task = 'Walking to an exhibit'; }
          else {
            unreachableUntil[bestE] = S.day * DAY + S.time + 20;
            if (!s.warned) { log('A keeper can\'t reach an exhibit. Make sure a path runs right alongside its fence.'); s.warned = true; }
          }
        }
        if (s.state === 'idle') { s.task = 'Waiting for a job'; wander(s); }
      } else if (s.state === 'work') {
        if (!EX[s.ex]) { s.state = 'leave'; return; }
        if (S.poop[here] && exOf[here] === s.ex) { s.workT = 1.5; s.doing = 'clean'; s.task = 'Cleaning the exhibit'; return; }
        const r = bfs(here, j => exOf[j] === s.ex, j => exOf[j] === s.ex && !!S.poop[j]);
        if (r && r.length) { s.path = toPoints(r); s.task = 'Cleaning the exhibit'; }
        else { s.workT = 2; s.doing = 'feed'; s.task = 'Feeding the animals'; }
      } else if (s.state === 'leave') {
        if (S.tiles[here] === PATH) { s.state = 'idle'; s.ex = -1; return; }
        const r = bfs(here, s.ex >= 0 ? keeperPass(s.ex) : () => true, j => S.tiles[j] === PATH);
        if (r) { s.path = toPoints(r); s.task = 'Heading back to the path'; } else { warpToEntrance(s); s.state = 'idle'; }
      }
    }
    const moved = stepAlong(s, 26 * dt); s.phase += moved * 0.45; s.moving = moved > 0;
  }

  // ---------- economy ----------
  function attraction() {
    const species = new Set();
    const a = S.animals.reduce((s, an) => { species.add(an.sp); return s + Z.SPECIES[an.sp].appeal * (an.happy / 100) * (an.baby ? 1.5 : 1); }, 0);
    return a + species.size * 2;
  }
  function guestsPerDay() {
    const priceF = clamp(1.6 - S.ticket / 25, 0, 1.6);
    return (3 + attraction() * 0.9) * (0.5 + S.rep / 100) * priceF;
  }

  function endOfDay(st) {
    const wages = S.staff.reduce((s, x) => s + STAFF[x.type].wage, 0);
    S.money -= wages; S.today.wages = wages;
    const t = S.today;
    log(`Day ${S.day}: ${t.guests} guests, ${money(t.tickets)} in tickets, ${money(-wages)} wages${t.sales ? `, ${money(t.sales)} from sales` : ''}.`);
    if (S.money < 0) log('The zoo is in the red. Raise income or cut staff before buying more.');
    dailyBreeding(st);
    S.day++; S.time -= DAY;
    S.today = { guests: 0, tickets: 0, wages: 0, sales: 0, births: 0 };
    save(true);
  }

  // ---------- simulation tick ----------
  function tick(dt) {
    if (!S.speed) return;
    dt *= S.speed;
    const st = exStats(); lastExStats = st;
    S.animals.forEach(a => updateAnimal(a, dt, st));
    S.arrivalAcc += guestsPerDay() / DAY * dt;
    while (S.arrivalAcc >= 1) { S.arrivalAcc -= 1; if (guests.length < MAX_GUESTS) spawnGuest(); }
    guests.forEach(g => updateGuest(g, dt));
    guests = guests.filter(g => {
      if (g.gone) { S.rep = S.rep * 0.95 + g.happy * 0.05; if (selected && selected.ref === g) selected = null; }
      return !g.gone;
    });
    S.staff.forEach(s => (s.type === 'janitor' ? updateJanitor(s, dt) : updateKeeper(s, dt, st)));
    S.time += dt;
    if (S.time >= DAY) endOfDay(st);
  }

  // ---------- building ----------
  function canAfford(n) { if (S.money < n) { toast('Not enough money.'); return false; } return true; }
  const animalOnTile = i => S.animals.some(a => tileAt(a.x, a.y) === i);

  function applyTool(i, first) {
    if (i < 0) return;
    const t = S.tiles[i], item = S.items[i], isEnt = i === idx(ENT.x, ENT.y);
    if (tool === 'path') {
      if (t === PATH) return;
      if (t === FENCE) return first && toast('Remove the fence first.');
      if (item) return first && toast('Something is already here.');
      if (exOf[i] >= 0) return first && toast('Paths can\'t go inside an exhibit.');
      if (!canAfford(COST.path)) return;
      S.money -= COST.path; S.tiles[i] = PATH; recompute();
    } else if (tool === 'fence') {
      if (t === FENCE) return;
      if (t === PATH) return first && toast('Remove the path first.');
      if (item) return first && toast('Something is already here.');
      if (!canAfford(COST.fence)) return;
      S.money -= COST.fence; S.tiles[i] = FENCE; delete S.poop[i]; recompute();
    } else if (['tree', 'bush', 'water', 'toy'].includes(tool)) {
      if (t !== GRASS) return first && toast('Place this on grass or inside an exhibit.');
      if (item) return first && toast('Something is already here.');
      if (!canAfford(COST[tool])) return;
      S.money -= COST[tool]; S.items[i] = tool; recompute();
    } else if (tool === 'remove') {
      if (isEnt) return first && toast('The entrance stays.');
      if (item) { S.money += Math.round(COST[item] * 0.5); S.items[i] = null; recompute(); return; }
      if (t === PATH) { S.tiles[i] = GRASS; delete S.litter[i]; recompute(); return; }
      if (t === FENCE) {
        S.tiles[i] = GRASS; recompute(false);   // test the change before committing to it
        const escaping = S.animals.some(a => { const j = tileAt(a.x, a.y); return j < 0 || exOf[j] < 0; });
        if (escaping) { S.tiles[i] = FENCE; if (first) toast('That would let animals escape! Sell them first.'); }
        recompute();
      }
    } else if (tool === 'animal' && toolSpecies) {
      if (!first) return;
      const sp = toolSpecies, d = Z.SPECIES[sp];
      if (!approved(sp, false)) return toast(`${d.name} is awaiting approval.`);
      if (exOf[i] < 0) return toast('Animals go inside a fully fenced exhibit.');
      if (!canAfford(d.cost)) return;
      S.money -= d.cost;
      const c = center(i), a = makeAnimal(sp, c.x, c.y, false); a.ex = exOf[i];
      S.animals.push(a);
      log(`Welcome ${a.name} the ${d.name.toLowerCase()}!`);
    }
  }

  function sellAnimal(a) {
    const d = Z.SPECIES[a.sp], value = Math.round(d.cost * (a.baby ? SELL_BABY : SELL_ADULT));
    S.money += value; S.today.sales += value;
    S.animals = S.animals.filter(x => x !== a);
    log(`${a.name} the ${d.name.toLowerCase()} moved to another zoo for ${money(value)}.`);
    selected = null; renderPanel();
  }
  function fire(s) {
    S.staff = S.staff.filter(x => x !== s);
    log(`A ${STAFF[s.type].name.toLowerCase()} was let go.`);
    selected = null; renderPanel();
  }

  // ---------- saving ----------
  function serialize() {
    return {
      v: 1, money: S.money, day: S.day, time: S.time, speed: S.speed, ticket: S.ticket, rep: S.rep,
      tiles: S.tiles.join(''), items: S.items.map(x => (x ? ITEM_CHAR[x] : '.')).join(''),
      animals: S.animals.map(a => ({ id: a.id, sp: a.sp, baby: a.baby, age: +a.age.toFixed(3), x: Math.round(a.x), y: Math.round(a.y),
        hunger: Math.round(a.hunger), happy: Math.round(a.happy), name: a.name })),
      staff: S.staff.map(s => ({ id: s.id, type: s.type, name: s.name })),
      litter: S.litter, poop: S.poop, nextId: S.nextId, log: S.log.slice(0, 20), totals: S.totals, today: S.today,
    };
  }
  function deserialize(o) {
    if (!o || o.v !== 1 || typeof o.tiles !== 'string' || o.tiles.length !== MW * MH) throw new Error('bad save');
    const s = newState();
    Object.assign(s, { money: o.money, day: o.day, time: o.time || 0, speed: o.speed ?? 1, ticket: o.ticket ?? 15, rep: o.rep ?? 50,
      litter: o.litter || {}, poop: o.poop || {}, nextId: o.nextId || 1, log: o.log || [], totals: o.totals || s.totals, today: o.today || s.today });
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
    S = state; guests = []; selected = null; recompute(); centerView(); renderAll();
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
      ctx.fillStyle = '#dcdcdc'; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      ctx.fillStyle = '#b5b5b5';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + A.rnd(i + k) * 22, y + 4 + A.rnd(i + k + 7) * 22, 2, 2);
      ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 1.5; ctx.beginPath();
      const px = tx(i), py = ty(i);
      const edge = (nx, ny, x1, y1, x2, y2) => { if (!inMap(nx, ny) || S.tiles[idx(nx, ny)] !== PATH) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); } };
      edge(px, py - 1, x, y + 0.75, x + T, y + 0.75); edge(px, py + 1, x, y + T - 0.75, x + T, y + T - 0.75);
      edge(px - 1, py, x + 0.75, y, x + 0.75, y + T); edge(px + 1, py, x + T - 0.75, y, x + T - 0.75, y + T);
      ctx.stroke();
      return;
    }
    if (inside) { ctx.fillStyle = '#f1f1f1'; ctx.fillRect(x, y, T + 0.5, T + 0.5); }
    if (t === FENCE) {
      // shade the half of a fence tile that faces into an exhibit
      const px = tx(i), py = ty(i), inEx = (dx, dy) => inMap(px + dx, py + dy) && exOf[idx(px + dx, py + dy)] >= 0;
      const isF = (dx, dy) => inMap(px + dx, py + dy) && S.tiles[idx(px + dx, py + dy)] === FENCE;
      ctx.fillStyle = '#f1f1f1';
      for (const qx of [-1, 1]) for (const qy of [-1, 1]) {
        if (inEx(qx, 0) || inEx(0, qy) || (inEx(qx, qy) && isF(qx, 0) && isF(0, qy)))
          ctx.fillRect(x + (qx > 0 ? T / 2 : 0), y + (qy > 0 ? T / 2 : 0), T / 2, T / 2);
      }
      return;
    }
    if (inside) { ctx.fillStyle = '#c8c8c8'; for (let k = 0; k < 4; k++) ctx.fillRect(x + A.rnd(i * 3 + k) * 30, y + A.rnd(i * 5 + k) * 30, 1.5, 1.5); }
    else if (h < 0.35) {
      ctx.strokeStyle = '#c4c4c4'; ctx.lineWidth = 1; ctx.beginPath();
      const gx = x + 6 + A.rnd(i + 2) * 18, gy = y + 8 + A.rnd(i + 4) * 18;
      ctx.moveTo(gx - 3, gy); ctx.lineTo(gx - 1, gy - 4); ctx.moveTo(gx, gy); ctx.lineTo(gx + 1, gy - 5); ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 3, gy - 3); ctx.stroke();
    }
  }

  function drawFence(i) {
    const cx = tx(i) * T + T / 2, cy = ty(i) * T + T / 2;
    const conn = N4.filter(([dx, dy]) => inMap(tx(i) + dx, ty(i) + dy) && S.tiles[idx(tx(i) + dx, ty(i) + dy)] === FENCE);
    ctx.lineCap = 'butt';
    conn.forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * T / 2, cy + dy * T / 2);
      ctx.lineWidth = 6; ctx.strokeStyle = '#111'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    });
    ctx.fillStyle = '#111'; ctx.fillRect(cx - 4, cy - 4, 8, 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#e9e9e9'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, -view.x * view.zoom * dpr, -view.y * view.zoom * dpr);
    const x0 = clamp(Math.floor(view.x / T), 0, MW - 1), y0 = clamp(Math.floor(view.y / T), 0, MH - 1);
    const x1 = clamp(Math.ceil((view.x + W / view.zoom) / T), 0, MW - 1), y1 = clamp(Math.ceil((view.y + H / view.zoom) / T), 0, MH - 1);
    // ground (one white sheet first, so tiles don't show seams)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, MW * T, MH * T);
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
      if (S.tiles[i] === FENCE) drawFence(i);
      if (S.items[i] === 'water') A.water(ctx, c.x, c.y, T, clock + i);
      if (S.litter[i]) A.litter(ctx, c.x, c.y, S.litter[i], i);
      if (S.poop[i]) A.poop(ctx, c.x, c.y, S.poop[i], i);
    }
    // standing things, sorted by their ground line
    const sprites = [];
    const vis = (x, y) => x > view.x - 80 && x < view.x + W / view.zoom + 80 && y > view.y - 40 && y < view.y + H / view.zoom + 120;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y), it = S.items[i];
      if (it && it !== 'water') { const c = center(i); sprites.push({ y: c.y + 8, f: () => A[it](ctx, c.x, c.y + 8, i) }); }
    }
    const ent = center(idx(ENT.x, ENT.y));
    sprites.push({ y: ent.y + T / 2, f: () => A.entrance(ctx, ent.x, ent.y + T / 2, T) });
    S.animals.forEach(a => vis(a.x, a.y) && sprites.push({ y: a.y, f: () => {
      if (selected && selected.ref === a) ring(a.x, a.y, 20);
      Z.draw(ctx, a.sp, a.x, a.y, { phase: a.phase, moving: a.moving, scale: WORLD_SCALE, facing: a.facing, baby: a.baby });
    } }));
    guests.forEach(g => vis(g.x, g.y) && sprites.push({ y: g.y, f: () => {
      if (selected && selected.ref === g) ring(g.x, g.y, 8);
      A.person(ctx, g.x, g.y, g.phase, g.facing, g.look, g.moving);
    } }));
    S.staff.forEach(s => vis(s.x, s.y) && sprites.push({ y: s.y, f: () => {
      if (selected && selected.ref === s) ring(s.x, s.y, 8);
      if (!s.look) s.look = A.staffLook(s.type);
      const ph = s.workT > 0 ? clock * 9 : s.phase;
      A.person(ctx, s.x, s.y, ph, s.facing, s.look, s.moving || s.workT > 0);
    } }));
    sprites.sort((a, b) => a.y - b.y).forEach(s => s.f());
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
  function ring(x, y, r) {
    ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function previewOk(i) {
    const t = S.tiles[i], it = S.items[i];
    if (tool === 'path') return t === GRASS && !it && exOf[i] < 0;
    if (tool === 'fence') return t === GRASS && !it;
    if (['tree', 'bush', 'water', 'toy'].includes(tool)) return t === GRASS && !it;
    if (tool === 'remove') return (t !== GRASS || !!it) && i !== idx(ENT.x, ENT.y);
    if (tool === 'animal') return exOf[i] >= 0 && approved(toolSpecies, false);
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
    guests.forEach(g => test(g, 'guest', 10, 10));
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
    } else if (drag.mode === 'paint' && hover !== drag.last && ['path', 'fence', 'remove'].includes(tool)) {
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
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });

  function zoomAt(sx, sy, f) {
    const before = toWorld(sx, sy);
    view.zoom = clamp(view.zoom * f, 0.45, 2.5);
    view.x = before.x - sx / view.zoom; view.y = before.y - sy / view.zoom; clampView();
  }

  const keys = new Set();
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    keys.add(e.key.toLowerCase());
    if (e.key === 'Escape') setTool('look');
    if (e.key === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); }
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  function updateCursorTip(e) {
    const tip = document.getElementById('tip');
    let text = '';
    if (tool === 'path' || tool === 'fence') text = `${tool === 'path' ? 'Path' : 'Fence'} ${money(COST[tool])} per tile, drag to draw`;
    else if (COST[tool]) text = `${tool[0].toUpperCase() + tool.slice(1)} ${money(COST[tool])}`;
    else if (tool === 'remove') text = 'Remove (items refund half)';
    else if (tool === 'animal' && toolSpecies) text = `${Z.SPECIES[toolSpecies].name} ${money(Z.SPECIES[toolSpecies].cost)}, click inside an exhibit`;
    if (!text || hover < 0) { tip.style.display = 'none'; return; }
    tip.textContent = text; tip.style.display = 'block';
    tip.style.left = (e.offsetX + 14) + 'px'; tip.style.top = (e.offsetY + 14) + 'px';
  }

  // ---------- HUD & panels ----------
  const $ = id => document.getElementById(id);
  let panelMode = null;

  function setTool(t, sp) {
    tool = t; toolSpecies = sp || null;
    document.querySelectorAll('#tools button[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    if (t === 'animal') openPanel('shop');
    else if (panelMode === 'shop') openPanel(null);
    if (t !== 'look') selected = null;
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
    $('guests').textContent = guests.length;
    $('rating').textContent = Math.round(S.rep);
    $('ticket').textContent = money(S.ticket);
  }

  function renderNews() {
    const el = $('news'); if (!el) return;
    el.innerHTML = S.log.slice(0, 3).map(l => `<div>${escapeHtml(l.m)}</div>`).join('');
  }
  const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function openPanel(mode) {
    panelMode = mode;
    $('panel').classList.toggle('open', !!mode);
    renderPanel();
  }
  const bar = v => `<div class="bar"><span style="width:${clamp(v, 0, 100)}%"></span></div>`;

  function renderPanel() {
    const el = $('panel-body'); if (!panelMode) { el.innerHTML = ''; return; }
    if (panelMode === 'shop') {
      $('panel-title').textContent = 'Animals';
      el.innerHTML = `<p class="muted">Pick an animal, then click inside a fenced exhibit.</p>` + Z.ids.map(id => {
        const d = Z.SPECIES[id], ok = approved(id, false), bok = approved(id, true);
        return `<button class="shop ${toolSpecies === id ? 'on' : ''}" data-sp="${id}" ${ok ? '' : 'disabled'}>
          <canvas width="120" height="84" data-prev="${id}"></canvas>
          <span><b>${d.name}</b> ${money(d.cost)}<br><small>Wants: ${d.wants.join(', ')}<br>
          ${ok ? (bok ? 'Can have babies' : 'Baby art awaiting approval') : 'Awaiting approval'}</small></span></button>`;
      }).join('');
      el.querySelectorAll('button.shop').forEach(b => b.onclick = () => { setTool('animal', b.dataset.sp); renderPanel(); });
      return;
    }
    if (panelMode === 'staff') {
      $('panel-title').textContent = 'Staff';
      const count = t => S.staff.filter(s => s.type === t).length;
      el.innerHTML = Object.entries(STAFF).map(([t, d]) => `<div class="card">
        <b>${d.name}s: ${count(t)}</b><br><small>${d.job}. Hire ${money(d.hire)}, wage ${money(d.wage)}/day.</small><br>
        <button data-hire="${t}">Hire ${d.name.toLowerCase()}</button></div>`).join('') +
        `<p class="muted">Wages are paid at the end of each day. Click a staff member in the park to see what they're doing or let them go.</p>`;
      el.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => hire(b.dataset.hire));
      return;
    }
    if (panelMode === 'menu') {
      $('panel-title').textContent = 'Game';
      el.innerHTML = `<div class="card"><b>Ticket price</b><br><small>Higher prices bring in fewer guests.</small><br>
        <button data-tk="-5">−5</button> <button data-tk="-1">−1</button> <b id="tkv">${money(S.ticket)}</b>
        <button data-tk="1">+1</button> <button data-tk="5">+5</button><br><small>About ${Math.round(guestsPerDay())} guests per day at this price.</small></div>
        <div class="card"><b>Saving</b><br><small>The game saves on this device at the end of every day.</small><br>
        <button id="b-save">Save now</button> <button id="b-export">Export save file</button>
        <label class="filebtn">Import save file<input id="b-import" type="file" accept=".json,application/json"></label></div>
        <div class="card"><button id="b-new">Start a new zoo</button></div>
        <div class="card"><b>News</b>${S.log.slice(0, 12).map(l => `<div class="logline"><small>Day ${l.d}</small> ${escapeHtml(l.m)}</div>`).join('') || '<br><small>Nothing yet.</small>'}</div>`;
      el.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { S.ticket = clamp(S.ticket + +b.dataset.tk, 0, 60); renderHud(); renderPanel(); });
      $('b-save').onclick = () => save(false);
      $('b-export').onclick = exportSave;
      $('b-import').onchange = e => e.target.files[0] && importSave(e.target.files[0]);
      $('b-new').onclick = () => { if (confirm('Start over? Your current zoo will be replaced.')) { startWith(newState()); save(true); } };
      return;
    }
    if (panelMode === 'help') {
      $('panel-title').textContent = 'How to play';
      el.innerHTML = `<ol class="help">
        <li>Draw <b>paths</b> from the entrance so guests can walk around.</li>
        <li>Surround a patch of grass with <b>fences</b> to make an exhibit. It must be fully closed and right beside a path so keepers can get in.</li>
        <li>Add what the animal wants: a <b>tree</b>, <b>bush</b>, <b>water</b>, or <b>toy</b>.</li>
        <li>Buy <b>animals</b> and click them into the exhibit. Give each one enough room.</li>
        <li>Hire <b>keepers</b> to feed animals and clean exhibits, and <b>janitors</b> to sweep litter.</li>
        <li>Guests pay a ticket at the gate. Happy animals and clean paths bring more guests and a better rating.</li>
        <li>Two happy adults of the same species with spare room may have a <b>baby</b>. Babies grow up in ${GROW_DAYS} days.</li>
        <li>Too crowded? Sell an animal to another zoo. You only get back a little of what it cost.</li></ol>
        <p class="muted">Drag to move around, scroll or pinch to zoom. Space pauses. Esc goes back to the look tool.</p>`;
      return;
    }
    if (panelMode === 'info') {
      if (!selected) { openPanel(null); return; }
      if (selected.kind === 'animal') {
        const a = selected.ref; if (!S.animals.includes(a)) { openPanel(null); return; }
        const d = Z.SPECIES[a.sp], p = happinessParts(a, lastExStats.length ? lastExStats : exStats());
        $('panel-title').textContent = `${a.name} the ${d.name.toLowerCase()}`;
        el.innerHTML = `<div class="card"><b>${a.baby ? `Baby, grows up in ${Math.max(1, Math.ceil(GROW_DAYS - a.age))} day(s)` : 'Adult'}</b>
          <div class="row">Happiness ${bar(a.happy)} ${Math.round(a.happy)}</div>
          <div class="row">Wants ${bar(p.wants * 100)}</div>
          <small>${p.have.length ? 'Has ' + p.have.join(', ') + '. ' : ''}${p.missing.length ? 'Missing ' + p.missing.join(', ') + '.' : 'Everything it wants!'}</small>
          <div class="row">Space ${bar(p.space * 100)}</div>
          <div class="row">Fed ${bar(p.food * 100)}</div>
          <div class="row">Clean ${bar(p.clean * 100)}</div></div>
          <div class="card"><button id="b-sell">Sell to another zoo for ${money(d.cost * (a.baby ? SELL_BABY : SELL_ADULT))}</button></div>`;
        $('b-sell').onclick = () => sellAnimal(a);
      } else if (selected.kind === 'staff') {
        const s = selected.ref; if (!S.staff.includes(s)) { openPanel(null); return; }
        const d = STAFF[s.type];
        $('panel-title').textContent = `${s.name} the ${d.name.toLowerCase()}`;
        el.innerHTML = `<div class="card">${escapeHtml(s.task || 'Getting started')}<br><small>Wage ${money(d.wage)}/day</small></div>
          <div class="card"><button id="b-fire">Let ${escapeHtml(s.name)} go</button></div>`;
        $('b-fire').onclick = () => fire(s);
      } else if (selected.kind === 'guest') {
        const g = selected.ref;
        $('panel-title').textContent = 'Guest';
        const mood = g.happy > 70 ? 'Having a great time' : g.happy > 45 ? 'Enjoying the zoo' : g.happy > 25 ? 'A bit bored' : 'Unhappy';
        el.innerHTML = `<div class="card"><div class="row">Happiness ${bar(g.happy)}</div><small>${mood}. Seen ${g.seen.size} exhibit(s).${g.leaving ? ' Heading home.' : ''}</small></div>`;
      } else {
        const E = EX[exOf[selected.tile]]; if (!E) { openPanel(null); return; }
        const st = (lastExStats.length ? lastExStats : exStats())[E.id];
        const counts = {}; st.list.forEach(a => { const k = Z.SPECIES[a.sp].name + (a.baby ? ' (baby)' : ''); counts[k] = (counts[k] || 0) + 1; });
        $('panel-title').textContent = 'Exhibit';
        el.innerHTML = `<div class="card"><b>${E.tiles.length} tiles</b>, room for about ${Math.round(E.tiles.length - st.need)} more tiles of animals<br>
          <small>Animals: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'none yet'}<br>
          Items: ${Object.entries(E.items).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'}<br>
          Droppings: ${st.poop}<br>${E.reachable ? 'Keepers can get in.' : '<b>Keepers can\'t get in:</b> run a path right beside the fence.'}</small></div>`;
      }
      return;
    }
  }

  function renderAll() { renderHud(); renderNews(); renderPanel(); setSpeed(S.speed); }

  // toolbar wiring
  document.querySelectorAll('#tools button[data-tool]').forEach(b => b.onclick = () => {
    const t = b.dataset.tool;
    if (t === 'animal') { setTool('animal', toolSpecies); return; }
    setTool(t);
  });
  $('b-staff').onclick = () => openPanel(panelMode === 'staff' ? null : 'staff');
  $('b-menu').onclick = () => openPanel(panelMode === 'menu' ? null : 'menu');
  $('b-help').onclick = () => openPanel(panelMode === 'help' ? null : 'help');
  $('panel-close').onclick = () => { if (tool === 'animal') setTool('look'); openPanel(null); selected = null; };
  document.querySelectorAll('#speed button').forEach(b => b.onclick = () => setSpeed(+b.dataset.speed));
  $('zoom-in').onclick = () => zoomAt(W / 2, H / 2, 1.25);
  $('zoom-out').onclick = () => zoomAt(W / 2, H / 2, 0.8);

  // ---------- main loop ----------
  let last = performance.now(), hudT = 0, saveT = 0;
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000); last = now; clock += dt;
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
    if (hudT > 0.25) { hudT = 0; renderHud(); if (panelMode === 'info' || panelMode === 'staff') renderPanelLive(); }
    if (panelMode === 'shop') drawShopPreviews();
    if (saveT > 30) { saveT = 0; save(true); }
    requestAnimationFrame(frame);
  }
  // refresh info bars without rebuilding buttons mid-click
  let liveT = 0;
  function renderPanelLive() { liveT++; if (liveT % 4 === 0 && !document.querySelector('#panel button:active')) renderPanel(); }
  function drawShopPreviews() {
    document.querySelectorAll('canvas[data-prev]').forEach(cv => {
      const c = cv.getContext('2d'), id = cv.dataset.prev, ok = approved(id, false);
      c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = '#111'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 74); c.lineTo(120, 74); c.stroke();
      c.globalAlpha = ok ? 1 : 0.35;
      Z.draw(c, id, 62, 74, { phase: clock * 5, moving: true, scale: 0.42 * Z.SPECIES[id].galleryScale });
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
  setTool('look');
  requestAnimationFrame(frame);

  // small hook for automated testing
  window.__zoo = { get S() { return S; }, get EX() { return EX; }, get guests() { return guests; }, tick, applyTool: (t, x, y, sp) => { setTool(t, sp); applyTool(idx(x, y), true); }, hire, recompute, save, loadSaved, serialize, deserialize, startWith, newState, setSpeed, view, sellAnimal };
})();
