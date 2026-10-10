/* 3D Zoo — animal art (black & white, side view, animated walk cycles)
   ZooAnimals.draw(ctx, id, x, y, {phase, moving, scale, facing, baby, view})
   view: 'side' (default), 'front' (walking toward the camera) or 'back' (walking away).
   (x, y) is the ground point under the animal. facing: 1 = right, -1 = left.
   Babies are drawn with shorter legs, bigger heads, and no adult features. */
(function (global) {
  const INK = '#111';
  const WHITE = '#fff';
  const FAR = '#cfcfcf';      // far-side legs, for depth
  const OUT = 2.5;            // outline width
  const MANE = '#131314', SPOT = '#141415';   // look black, but let the color palettes find a lion's mane and a giraffe's patches

  // ---------- species registry ----------
  // approved:false animals (or babies) never appear in the game until Alex signs off.
  const SPECIES = {
    lion:         { name: 'Lion',         wants: ['tree', 'bush', 'toy'],  cost: 3000, appeal: 9,  babyScale: 0.5,  galleryScale: 1.0 },
    elephant:     { name: 'Elephant',     wants: ['water', 'tree', 'toy'], cost: 5000, appeal: 10, babyScale: 0.45, galleryScale: 0.85 },
    giraffe:      { name: 'Giraffe',      wants: ['tree', 'water'],        cost: 4000, appeal: 8,  babyScale: 0.5,  galleryScale: 0.68 },
    zebra:        { name: 'Zebra',        wants: ['bush', 'water'],        cost: 1500, appeal: 5,  babyScale: 0.55, galleryScale: 1.0 },
    penguin:      { name: 'Penguin',      wants: ['water', 'toy', 'snow'],         cost: 1200, appeal: 7,  babyScale: 0.6,  galleryScale: 1.35 },
    bear:         { name: 'Bear',         wants: ['water', 'tree', 'toy'], cost: 3500, appeal: 8,  babyScale: 0.45, galleryScale: 1.0 },
    monkey:       { name: 'Monkey',       wants: ['tree', 'toy', 'bush'],  cost: 2000, appeal: 7,  babyScale: 0.5,  galleryScale: 1.3 },
    flamingo:     { name: 'Flamingo',     wants: ['water', 'bush'],        cost: 1000, appeal: 4,  babyScale: 0.5,  galleryScale: 1.0 },
    snowleopard:  { name: 'Snow leopard', wants: ['snow', 'tree', 'toy'],  cost: 4500, appeal: 9,  babyScale: 0.5,  galleryScale: 1.0 },
    // added 2026-10-08, pending approval. 'snow' = a snowy floor; 'tank' = an aquarium tank exhibit.
    ostrich:      { name: 'Ostrich',      wants: ['bush', 'tree'],         cost: 2200,  appeal: 6,  babyScale: 0.55, galleryScale: 0.62 },
    seahawk:      { name: 'Sea hawk',     wants: ['tree', 'water'],        cost: 1800,  appeal: 6,  babyScale: 0.6,  galleryScale: 1.35 },
    hippo:        { name: 'Hippo',        wants: ['water', 'bush'],        cost: 6000,  appeal: 9,  babyScale: 0.5,  galleryScale: 0.9 },
    anaconda:     { name: 'Anaconda',     wants: ['water', 'tree'],        cost: 3800,  appeal: 7,  babyScale: 0.55, galleryScale: 0.95 },
    rhino:        { name: 'Rhino',        wants: ['bush', 'water', 'tree'], cost: 7000, appeal: 9,  babyScale: 0.5,  galleryScale: 0.9 },
    polarbear:    { name: 'Polar bear',   wants: ['snow', 'water', 'toy'], cost: 6500,  appeal: 10, babyScale: 0.45, galleryScale: 1.0 },
    shark:        { name: 'Shark',        wants: ['tank'],                 cost: 12000, appeal: 13, babyScale: 0.5,  galleryScale: 1.05 },
    orca:         { name: 'Orca',         wants: ['tank', 'toy'],          cost: 25000, appeal: 16, babyScale: 0.5,  galleryScale: 0.85 },
    // aviary birds: they fly, so they can only live in an exhibit closed in with aviary mesh
    parrot:       { name: 'Parrot',       wants: ['tree', 'toy'],          cost: 1500,  appeal: 7,  babyScale: 0.6,  galleryScale: 1.35 },
    toucan:       { name: 'Toucan',       wants: ['tree', 'bush'],         cost: 2200,  appeal: 7,  babyScale: 0.6,  galleryScale: 1.35 },
    owl:          { name: 'Great horned owl', wants: ['tree'],             cost: 2600,  appeal: 7,  babyScale: 0.6,  galleryScale: 1.3 },
    eagle:        { name: 'Bald eagle',   wants: ['tree', 'water'],        cost: 4500,  appeal: 9,  babyScale: 0.55, galleryScale: 1.15 },
    // secret animals: hidden from the shop until their unlock is found
    triceratops:  { name: 'Triceratops',  wants: ['tree', 'bush', 'water'], cost: 15000, appeal: 15, babyScale: 0.45, galleryScale: 0.72, secret: true },
    basilisk:     { name: 'Basilisk',     wants: ['water', 'bush'],        cost: 18000, appeal: 14, babyScale: 0.5,  galleryScale: 0.7,  secret: true },
    unicorn:      { name: 'Unicorn',      wants: ['tree', 'bush', 'water', 'toy'], cost: 20000, appeal: 15, babyScale: 0.55, galleryScale: 0.95, secret: true },
    // 2026-10-09: dolphins join the aquarium at five stars; the dinosaurs (seven stars) and the dragon (eight) stay hidden until earned.
    dolphin:      { name: 'Dolphin',      wants: ['tank', 'hoop'],         cost: 15000, appeal: 14, babyScale: 0.5,  galleryScale: 0.95 },
    trex:         { name: 'T. rex',       wants: ['tree', 'bush', 'water'], cost: 45000, appeal: 20, babyScale: 0.38, galleryScale: 0.42, lower: 'T. rex', plural: 'T. rexes' },
    raptor:       { name: 'Velociraptor', wants: ['bush', 'tree', 'toy'],  cost: 14000, appeal: 15, babyScale: 0.55, galleryScale: 1.0 },
    titanosaur:   { name: 'Titanosaur',   wants: ['tree', 'water'],        cost: 70000, appeal: 22, babyScale: 0.3,  galleryScale: 0.2 },
    dragon:       { name: 'Dragon',       wants: ['tree', 'water', 'bush'], cost: 120000, appeal: 26, babyScale: 0.42, galleryScale: 0.45 },
  };
  // Approval status lives separately so it is easy to edit.
  // adult / baby: side-view art (all nine approved by Alex on 2026-10-03).
  // adultFrontBack / babyFrontBack: walking toward and away from the camera (all nine approved
  // by Alex on 2026-10-04). Set one to false and the game shows the side view for that animal instead.
  const APPROVED = {};
  ['lion', 'elephant', 'giraffe', 'zebra', 'penguin', 'bear', 'monkey', 'flamingo', 'snowleopard'].forEach(id => {
    APPROVED[id] = { adult: true, baby: true, adultFrontBack: true, babyFrontBack: true };
  });
  // New animals added 2026-10-08 (side, front, and back views, adult and baby): all approved by Alex on 2026-10-08.
  ['ostrich', 'seahawk', 'hippo', 'anaconda', 'rhino', 'polarbear', 'shark', 'orca', 'triceratops', 'basilisk', 'unicorn', 'parrot', 'toucan', 'owl', 'eagle',
   'dolphin', 'trex', 'raptor', 'titanosaur', 'dragon'].forEach(id => {
    APPROVED[id] = { adult: true, baby: true, adultFrontBack: true, babyFrontBack: true };
  });

  // ---------- drawing helpers ----------
  function ell(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  }
  function shape(ctx, fill, build, lw = OUT) {
    build(); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
  }
  // Several shapes merged into one outlined silhouette (no inner seams).
  function blob(ctx, fill, builds) {
    ctx.lineWidth = OUT * 2; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    builds.forEach(b => { b(); ctx.stroke(); });
    ctx.fillStyle = fill;
    builds.forEach(b => { b(); ctx.fill(); });
  }
  function dot(ctx, x, y, r, c = INK) { ell(ctx, x, y, r, r); ctx.fillStyle = c; ctx.fill(); }
  function strokeLine(ctx, pts, w, color, outline = true) {
    const path = () => {
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      if (pts.length === 4) ctx.lineTo(pts[2], pts[3]);
      else if (pts.length === 6) ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]);
      else ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (outline) { path(); ctx.lineWidth = w + OUT * 2; ctx.strokeStyle = INK; ctx.stroke(); }
    path(); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke();
  }
  // Fuzzy (scalloped) ellipse, for chicks and fluffy babies.
  function fuzz(ctx, x, y, rx, ry, n = 22) {
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 1 : 0.9;
      ctx.lineTo(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r);
    }
    ctx.closePath();
  }

  // Scale everything drawn by fn around a pivot (used to give babies bigger heads).
  function grow(ctx, k, px, py, fn) {
    if (k === 1) return fn();
    ctx.save(); ctx.translate(px, py); ctx.scale(k, k); ctx.translate(-px, -py); fn(); ctx.restore();
  }
  // Same transform applied to a single point / radius (for shapes inside a merged blob).
  const gp = (k, px, py) => (x, y, r = 0) => [px + (x - px) * k, py + (y - py) * k, r * k];

  // Two-segment limb. Angles measured from straight down; positive = forward.
  function limb(ctx, x, y, a1, l1, a2, l2, w, fill, foot) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    const fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); };
    path(); ctx.lineWidth = w + OUT * 2; ctx.strokeStyle = INK; ctx.stroke();
    path(); ctx.lineWidth = w; ctx.strokeStyle = fill; ctx.stroke();
    if (foot === 'hoof') {
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(-a2);
      ctx.fillStyle = INK; ctx.fillRect(-w * 0.62, -w * 0.5, w * 1.24, w * 0.75); ctx.restore();
    } else if (foot === 'paw') {
      shape(ctx, fill, () => ell(ctx, fx + w * 0.35, fy - w * 0.15, w * 0.75, w * 0.5));
    } else if (foot === 'bird') {
      strokeLine(ctx, [fx - 3, fy, fx + 7, fy], 1.5, INK, false);
    }
  }

  // Walk cycle: swing forward with the knee lifting, then plant and push back.
  function gait(ph, off, A, B) {
    const s = Math.sin(ph + off), c = Math.cos(ph + off);
    const a1 = A * s;
    return [a1, a1 - B * Math.max(0, c)];
  }

  // Four legs: far pair (grey) then near pair, all drawn behind the body.
  // lf shortens the legs (babies); returns how far the body must drop to stay on them.
  function quadLegs(ctx, o) {
    const { ph, A, B, hindX, foreX, hl, fl, w, near, far, foot, lf = 1 } = o;
    const order = [
      [hindX - 3, hl, Math.PI, far], [foreX - 3, fl, Math.PI * 1.5, far],
      [hindX, hl, 0, near], [foreX, fl, Math.PI * 0.5, near],
    ];
    order.forEach(([x, l, off, fill]) => {
      const [a1, a2] = gait(ph, off, A, B);
      limb(ctx, x, -2 * l * lf, a1, l * lf, a2, l * lf, w, fill, foot);
    });
    return (hl + fl) * (1 - lf);
  }

  function clipTo(ctx, clipBuild, draw) {
    ctx.save(); clipBuild(); ctx.clip(); draw(); ctx.restore();
  }
  function rosette(ctx, x, y, r) {
    ctx.lineWidth = 1.8; ctx.strokeStyle = '#333'; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3) + x * 0.37;
      ctx.beginPath(); ctx.arc(x, y, r, a, a + 1.5); ctx.stroke();
    }
  }

  // ---------- species ----------
  // Each art(ctx, phase, m, baby): m = 1 walking / 0 standing.
  const ART = {
    lion(ctx, ph, m, baby) {
      const bob = Math.sin(ph * 2) * 1.5 * m, sway = Math.sin(ph * 0.5);
      const d = quadLegs(ctx, { ph, A: 0.42 * m, B: 0.55 * m, hindX: -24, foreX: 24, hl: 20, fl: 20,
        w: baby ? 11 : 9, near: WHITE, far: FAR, foot: 'paw', lf: baby ? 0.7 : 1 });
      ctx.save(); ctx.translate(0, d);
      const tl = baby ? 0.7 : 1;
      strokeLine(ctx, [-34, -54 + bob, -34 - 22 * tl, -54 - 18 * tl + sway * 6, -34 - 28 * tl, -54 + 8 * tl + sway * 4], 3, WHITE);
      shape(ctx, MANE, () => ell(ctx, -34 - 28 * tl, -54 + 8 * tl + sway * 4, 5 * tl, 7 * tl, 0.3));
      ctx.save(); ctx.translate(0, bob);
      const body = () => ell(ctx, 0, -51, 38, 17);
      shape(ctx, WHITE, body);
      if (baby) clipTo(ctx, body, () => [[-20, -56], [-6, -60], [8, -56], [-14, -46], [2, -46], [18, -50]].forEach(([x, y]) => dot(ctx, x, y, 2.4, '#999')));
      grow(ctx, baby ? 1.45 : 1, 38, -56, () => {
        if (!baby) {
          ctx.beginPath();
          for (let i = 0; i <= 20; i++) {
            const a = (i / 20) * Math.PI * 2, r = i % 2 ? 17 : 23;
            ctx.lineTo(40 + Math.cos(a) * r, -63 + Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fillStyle = MANE; ctx.fill();
        } else {
          shape(ctx, WHITE, () => ell(ctx, 39, -71, 3.4, 3.4));
          shape(ctx, WHITE, () => ell(ctx, 49, -72.5, 3.4, 3.4));
        }
        shape(ctx, WHITE, () => ell(ctx, 45, -61, 12, 12));
        shape(ctx, WHITE, () => ell(ctx, 53, -56, 7, 5.5));
        ctx.beginPath(); ctx.moveTo(56, -60); ctx.lineTo(61, -60); ctx.lineTo(58.5, -56.5); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill();
        dot(ctx, 47, -65, baby ? 2.2 : 1.8);
        strokeLine(ctx, [58.5, -56.5, 58, -52.5], 1.2, INK, false);
      });
      ctx.restore(); ctx.restore();
    },

    elephant(ctx, ph, m, baby) {
      const G = '#dcdcdc', GF = '#b0b0b0';
      const bob = Math.sin(ph * 2) * 1.2 * m, sw = Math.sin(ph) * m;
      const d = quadLegs(ctx, { ph, A: 0.28 * m, B: 0.5 * m, hindX: -28, foreX: 26, hl: 24, fl: 24,
        w: 17, near: G, far: GF, foot: null, lf: baby ? 0.72 : 1 });
      ctx.save(); ctx.translate(0, d);
      strokeLine(ctx, [-44, -70 + bob, -50, -60, -50 + sw * 3, -46], 2, G);
      shape(ctx, INK, () => ell(ctx, -50 + sw * 3, -45, 2.5, 4));
      ctx.save(); ctx.translate(0, bob);
      const k = baby ? 1.4 : 1, P = gp(k, 40, -70);
      const tip = sw * 5;
      grow(ctx, k, 40, -70, () => strokeLine(ctx, baby ? [58, -72, 70, -60, 64 + tip, -48, 68 + tip, -42] : [58, -72, 72, -58, 66 + tip, -38, 70 + tip, -28], 8, G));
      const [hx, hy, hr] = P(44, -78, 19);
      blob(ctx, G, [() => ell(ctx, 0, -66, 46, 29), () => ell(ctx, hx, hy, hr, hr)]);
      grow(ctx, k, 40, -70, () => {
        if (!baby) strokeLine(ctx, [56, -64, 63, -60, 67, -63], 3, WHITE);
        shape(ctx, G, () => ell(ctx, 34, -74, 13 + Math.sin(ph) * 2 * m, 20, -0.1));
        strokeLine(ctx, [30, -82, 38, -74, 32, -64], 1, '#888', false);
        dot(ctx, 52, -84, 2);
      });
      ctx.restore(); ctx.restore();
    },

    giraffe(ctx, ph, m, baby) {
      const bob = Math.sin(ph * 2) * 1.5 * m, nod = Math.sin(ph) * 2.5 * m;
      const d = quadLegs(ctx, { ph, A: 0.33 * m, B: 0.5 * m, hindX: -22, foreX: 22, hl: 35, fl: 37,
        w: 7, near: WHITE, far: FAR, foot: 'hoof', lf: baby ? 0.85 : 1 });
      ctx.save(); ctx.translate(0, d);
      strokeLine(ctx, [-28, -86 + bob, -34, -72, -36, -58], 1.6, WHITE);
      shape(ctx, INK, () => ell(ctx, -36, -56, 2.5, 5));
      ctx.save(); ctx.translate(0, bob);
      const nk = baby ? 0.7 : 1;                 // calves have shorter necks
      const nx = (x) => 20 + (x - 20) * nk, ny = (y) => -90 + (y + 90) * nk;
      const body = () => ell(ctx, 0, -82, 30, 15, -0.12);
      const neck = () => {
        ctx.beginPath(); ctx.moveTo(12, -92); ctx.lineTo(28, -88);
        ctx.lineTo(nx(50), ny(-146) + nod); ctx.lineTo(nx(40), ny(-150) + nod); ctx.closePath();
      };
      blob(ctx, WHITE, [body, neck]);
      const patch = (x, y, r) => { ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + x; const rr = r * (0.8 + 0.25 * ((i * 7 + x) % 3) / 2);
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85); }
        ctx.closePath(); ctx.fillStyle = SPOT; ctx.fill(); };
      clipTo(ctx, body, () => {
        [[-18, -86, 5], [-6, -90, 5.5], [8, -92, 5], [-22, -76, 4.5], [-8, -78, 5.5], [6, -80, 5], [18, -84, 5], [-14, -69, 3.5], [3, -70, 4], [20, -74, 3.5]]
          .forEach(p => patch(...p));
      });
      clipTo(ctx, neck, () => {
        [[24, -100, 4], [30, -112, 4], [37, -124, 3.8], [42, -136, 3.4], [18, -94, 3]]
          .forEach(([x, y, r]) => patch(nx(x), ny(y) + nod, r));
      });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke(); neck(); ctx.stroke();
      strokeLine(ctx, [13, -96, nx(39), ny(-150) + nod], 2.5, INK, false);
      const hx = nx(48), hy = ny(-152) + nod;
      grow(ctx, baby ? 1.35 : 1, hx - 4, hy + 2, () => {
        ctx.save(); ctx.translate(hx, hy);
        const oh = baby ? 0.5 : 1;                // calves have little ossicone nubs
        strokeLine(ctx, [-6, -5, -8, -5 - 9 * oh], 2, INK, false); dot(ctx, -8, -6 - 9 * oh, 2.2);
        strokeLine(ctx, [-2, -5, -2, -5 - 9 * oh], 2, INK, false); dot(ctx, -2, -6 - 9 * oh, 2.2);
        shape(ctx, WHITE, () => ell(ctx, -9, -3, 5, 2.5, -0.5));
        shape(ctx, WHITE, () => ell(ctx, 4, 2, 13, 6.5, 0.35));
        dot(ctx, 1, -1, 1.7); dot(ctx, 14, 6, 1.1);
        ctx.restore();
      });
      ctx.restore(); ctx.restore();
    },

    zebra(ctx, ph, m, baby) {
      const bob = Math.sin(ph * 2) * 1.5 * m, nod = Math.sin(ph) * 2 * m, sway = Math.sin(ph * 0.7);
      const d = quadLegs(ctx, { ph, A: 0.42 * m, B: 0.6 * m, hindX: -24, foreX: 24, hl: 22, fl: 22,
        w: 8, near: WHITE, far: FAR, foot: 'hoof', lf: baby ? 0.85 : 1 });
      ctx.save(); ctx.translate(0, d);
      strokeLine(ctx, [-33, -56 + bob, -42, -50 + sway * 3, -42, -36 - (baby ? -6 : 0)], 2, WHITE);
      shape(ctx, INK, () => ell(ctx, -42, -35 + (baby ? -6 : 0), 3, 5));
      ctx.save(); ctx.translate(0, bob);
      const k = baby ? 1.35 : 1, P = gp(k, 42, -82 + nod);
      const body = () => ell(ctx, 0, -52, 34, 15);
      const neck = () => { ctx.beginPath(); ctx.moveTo(18, -62); ctx.lineTo(32, -56);
        ctx.lineTo(48, -82 + nod); ctx.lineTo(36, -90 + nod); ctx.closePath(); };
      const [hx, hy] = P(48, -80 + nod);
      const head = () => ell(ctx, hx, hy, 15 * k, 7 * k, 0.65);
      blob(ctx, WHITE, [body, neck, head]);
      clipTo(ctx, body, () => {
        ctx.fillStyle = baby ? '#555' : INK;      // foals have softer, brownish-grey stripes
        for (let x = -36; x <= 34; x += 8) {
          const dd = x > 10 ? 3 : -3;
          ctx.beginPath(); ctx.moveTo(x, -70); ctx.lineTo(x + 4, -70); ctx.lineTo(x + 1 + dd, -36);
          ctx.lineTo(x - 3 + dd, -36); ctx.closePath(); ctx.fill();
        }
      });
      clipTo(ctx, neck, () => {
        ctx.strokeStyle = baby ? '#555' : INK; ctx.lineWidth = 3.2;
        for (let i = 0; i < 4; i++) { const t = i / 4;
          ctx.beginPath(); ctx.moveTo(18 + 18 * t, -70 - 22 * t + nod * t); ctx.lineTo(34 + 16 * t, -56 - 26 * t + nod * t); ctx.stroke(); }
      });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      // mane (fluffier on foals)
      ctx.beginPath(); for (let i = 0; i <= 6; i++) { const t = i / 6, f = baby ? 5 : 3;
        ctx.lineTo(18 + 18 * t + (i % 2 ? -f : 0), -64 - 26 * t + nod * t + (i % 2 ? -f : 0)); }
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      grow(ctx, k, 42, -82 + nod, () => {
        shape(ctx, INK, () => ell(ctx, 56, -70 + nod, 5.5, 4.5, 0.65));
        shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(38, -88 + nod); ctx.lineTo(37, -98 + nod); ctx.lineTo(43, -89 + nod); ctx.closePath(); });
        dot(ctx, 47, -83 + nod, baby ? 2 : 1.7);
      });
      ctx.restore(); ctx.restore();
    },

    penguin(ctx, ph, m, baby) {
      const wad = Math.sin(ph) * (baby ? 0.18 : 0.13) * m;
      [0, Math.PI].forEach((o, i) => {
        const lift = Math.max(0, Math.sin(ph + o)) * 3 * m;
        shape(ctx, i ? FAR : '#666', () => ell(ctx, (i ? -4 : 3) + 4, -1.5 - lift, 6, 2.2), 1.5);
      });
      ctx.save(); ctx.translate(0, -2); ctx.rotate(wad);
      if (baby) {
        // fluffy grey chick with a black cap and white face
        shape(ctx, '#bdbdbd', () => fuzz(ctx, 0, -24, 17, 22));
        shape(ctx, INK, () => ell(ctx, 1, -48, 13, 12));
        ctx.fillStyle = WHITE; ell(ctx, 6, -46, 7, 6.5); ctx.fill(); dot(ctx, 7, -47, 1.8);
        shape(ctx, '#888', () => { ctx.beginPath(); ctx.moveTo(13, -47); ctx.lineTo(19, -45); ctx.lineTo(13, -43); ctx.closePath(); }, 1.2);
        ctx.save(); ctx.translate(-6, -32); ctx.rotate(0.3 - Math.sin(ph) * 0.4 * m);
        shape(ctx, '#9a9a9a', () => ell(ctx, 0, 7, 3.5, 8), 1.5);
        ctx.restore();
      } else {
        shape(ctx, INK, () => ell(ctx, 0, -30, 16, 28));
        ctx.fillStyle = WHITE; ell(ctx, 5, -25, 10.5, 21); ctx.fill();
        ctx.fillStyle = WHITE; ell(ctx, 7, -48, 4, 3.2); ctx.fill(); dot(ctx, 8, -48, 1.5);
        shape(ctx, '#888', () => { ctx.beginPath(); ctx.moveTo(13, -50); ctx.lineTo(23, -46.5); ctx.lineTo(13, -44); ctx.closePath(); }, 1.5);
        ctx.save(); ctx.translate(-4, -38); ctx.rotate(0.25 - Math.sin(ph) * 0.3 * m);
        shape(ctx, INK, () => ell(ctx, 0, 11, 4, 13));
        ctx.restore();
      }
      ctx.restore();
    },

    bear(ctx, ph, m, baby) {
      const B1 = '#555', B2 = '#383838', MZ = '#a8a8a8';
      const bob = Math.sin(ph * 2) * 1.5 * m, nod = Math.sin(ph) * 1.5 * m;
      const d = quadLegs(ctx, { ph, A: 0.33 * m, B: 0.5 * m, hindX: -24, foreX: 26, hl: 18, fl: 18,
        w: 13, near: B1, far: B2, foot: 'paw', lf: baby ? 0.72 : 1 });
      ctx.save(); ctx.translate(0, d); ctx.translate(0, bob);
      const k = baby ? 1.45 : 1, P = gp(k, 34, -52 + nod);
      const H = (x, y, r) => { const [a, b, rr] = P(x, y, r); return () => ell(ctx, a, b, rr, rr); };
      blob(ctx, B1, [() => ell(ctx, 0, -46, 36, 21), () => ell(ctx, 16, -56, baby ? 12 : 15, baby ? 10 : 13),
        () => ell(ctx, -36, -52, 5, 4), H(42, -52 + nod, 14), H(35, -65 + nod, 4.5), H(44, -66 + nod, 4.5)]);
      grow(ctx, k, 34, -52 + nod, () => {
        shape(ctx, MZ, () => ell(ctx, 54, -48 + nod, 8, 6), 1.5);
        dot(ctx, 60, -50 + nod, 2.6); dot(ctx, 46, -57 + nod, 2.2); dot(ctx, 46.6, -57.6 + nod, 0.7, WHITE);
      });
      ctx.restore();
    },

    monkey(ctx, ph, m, baby) {
      const M = '#8c8c8c', MF = '#6a6a6a';
      const bob = Math.sin(ph * 2) * 1.2 * m, sway = Math.sin(ph * 0.8) * m;
      const d = quadLegs(ctx, { ph, A: 0.45 * m, B: 0.6 * m, hindX: -15, foreX: 17, hl: 14, fl: 19,
        w: 6, near: M, far: MF, foot: 'paw', lf: baby ? 0.75 : 1 });
      ctx.save(); ctx.translate(0, d);
      strokeLine(ctx, [-20, -36 + bob, -40, -36, -48 + sway * 3, -62, -34 + sway * 4, -68], 3.5, M);
      strokeLine(ctx, [-34 + sway * 4, -68, -26 + sway * 4, -71, -28 + sway * 3, -62], 3.5, M);
      ctx.save(); ctx.translate(0, bob);
      const k = baby ? 1.45 : 1, P = gp(k, 20, -46);
      const H = (x, y, r) => { const [a, b, rr] = P(x, y, r); return () => ell(ctx, a, b, rr, rr); };
      blob(ctx, M, [() => ell(ctx, 0, -38, 22, 11, -0.22), H(26, -54, 11), H(18, -55, 4.5)]);
      grow(ctx, k, 20, -46, () => {
        shape(ctx, WHITE, () => ell(ctx, 30, -53, 6.5, 7.5), 1.5);
        shape(ctx, WHITE, () => ell(ctx, 18, -55, 2.4, 2.4), 1);
        dot(ctx, 31, -56, 1.5); dot(ctx, 35, -55.5, 1.5);
        strokeLine(ctx, [31, -49, 33.5, -47.5, 36, -49.5], 1, INK, false);
      });
      ctx.restore(); ctx.restore();
    },

    flamingo(ctx, ph, m, baby) {
      const F = baby ? '#bdbdbd' : '#e4e4e4';
      const bob = Math.sin(ph * 2) * 1.5 * m, sway = Math.sin(ph) * 2 * m;
      const lf = baby ? 0.6 : 1, d = 56 * (1 - lf);
      [[Math.PI, '#9a9a9a'], [0, '#6f6f6f']].forEach(([off, col]) => {
        const s = Math.sin(ph + off), c = Math.cos(ph + off);
        const a1 = 0.4 * m * s, a2 = a1 - 0.75 * m * Math.max(0, c);
        limb(ctx, 2, -56 * lf + bob, a1, 28 * lf, a2, 28 * lf, baby ? 3.4 : 2.6, col, 'bird');
      });
      ctx.save(); ctx.translate(0, d + bob);
      if (baby) {
        // fluffy grey chick: short neck, straight beak
        strokeLine(ctx, [10, -70, 14, -78, 14 + sway, -84], 7, F);
        shape(ctx, F, () => fuzz(ctx, 0, -64, 18, 13));
        ctx.save(); ctx.translate(14 + sway, -87);
        shape(ctx, F, () => fuzz(ctx, 0, 0, 8, 8, 14), 2);
        shape(ctx, '#666', () => { ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(14, 1); ctx.lineTo(6, 3); ctx.closePath(); }, 1.2);
        dot(ctx, 2, -2, 1.7);
        ctx.restore();
      } else {
        strokeLine(ctx, [14, -66, 34, -80, -4 + sway, -96, 10 + sway, -112], 4.5, F);
        shape(ctx, F, () => ell(ctx, 0, -64, 19, 11, 0.12));
        shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-14, -68); ctx.lineTo(-24, -72); ctx.lineTo(-17, -60); ctx.closePath(); }, 1);
        strokeLine(ctx, [-8, -66, 2, -60, 12, -64], 1.2, '#999', false);
        ctx.save(); ctx.translate(10 + sway, -113);
        shape(ctx, F, () => ell(ctx, 0, 0, 5.5, 5.5), 2);
        shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(12, 1); ctx.lineTo(9, 7); ctx.lineTo(4, 3); ctx.closePath(); }, 1.5);
        shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(10, 3); ctx.lineTo(12, 1); ctx.lineTo(9, 7); ctx.closePath(); }, 1);
        dot(ctx, 1.5, -1.5, 1.3);
        ctx.restore();
      }
      ctx.restore();
    },

    snowleopard(ctx, ph, m, baby) {
      const S = '#f2f2f2', SF = '#c8c8c8';
      const bob = Math.sin(ph * 2) * 1.2 * m, sway = Math.sin(ph * 0.6) * m;
      const d = quadLegs(ctx, { ph, A: 0.42 * m, B: 0.55 * m, hindX: -24, foreX: 24, hl: 17, fl: 17,
        w: baby ? 11 : 9, near: S, far: SF, foot: 'paw', lf: baby ? 0.72 : 1 });
      ctx.save(); ctx.translate(0, d);
      // very long, thick tail, carried low with an upturned tip
      const tl = baby ? 0.75 : 1;
      const tail = [-34, -46 + bob, -34 - 26 * tl, -40, -34 - 44 * tl, -12 + sway * 4, -34 - 56 * tl, -26 + sway * 6];
      strokeLine(ctx, tail, baby ? 9 : 8, S);
      [0.35, 0.6, 0.85].forEach(t => {
        const u = 1 - t, x = u * u * u * tail[0] + 3 * u * u * t * tail[2] + 3 * u * t * t * tail[4] + t * t * t * tail[6];
        const y = u * u * u * tail[1] + 3 * u * u * t * tail[3] + 3 * u * t * t * tail[5] + t * t * t * tail[7];
        dot(ctx, x, y, 2.2, '#444');
      });
      ctx.save(); ctx.translate(0, bob);
      const body = () => ell(ctx, 0, -44, 37, 15);
      shape(ctx, S, body);
      clipTo(ctx, body, () => {
        [[-24, -48, 4], [-12, -52, 4.5], [2, -50, 4], [16, -52, 4], [-18, -38, 3.5], [-4, -40, 4], [10, -38, 3.5], [26, -44, 3.5]]
          .forEach(([x, y, r]) => (baby ? dot(ctx, x, y, r * 0.6, '#555') : rosette(ctx, x, y, r)));
      });
      grow(ctx, baby ? 1.45 : 1, 32, -48, () => {
        shape(ctx, S, () => ell(ctx, 35, -60, 3, 2.6));
        shape(ctx, S, () => ell(ctx, 42.5, -61, 3, 2.6));
        shape(ctx, S, () => ell(ctx, 40, -53, 10.5, 9));
        shape(ctx, S, () => ell(ctx, 48, -49, 6, 4.5), 1.8);
        ctx.beginPath(); ctx.moveTo(51, -52); ctx.lineTo(55, -52); ctx.lineTo(53, -49.5); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill();
        dot(ctx, 43, -56, 1.8);
        [[34, -50], [37, -46], [36, -58]].forEach(([x, y]) => dot(ctx, x, y, 1, '#555'));
      });
      ctx.restore(); ctx.restore();
    },
  };

  // ---------- front and back views ----------
  // Used when an animal walks toward the camera (front) or away from it (back).
  // Near legs reach the ground line; far legs stand a little higher up the screen, for depth.
  function legFB(ctx, x, yTop, yFoot, lift, w, fill, foot) {
    const fy = yFoot - lift, kx = x + Math.sign(x || 1) * lift * 0.4, my = (yTop + fy) / 2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(kx, my); ctx.lineTo(x, fy); };
    path(); ctx.lineWidth = w + OUT * 2; ctx.strokeStyle = INK; ctx.stroke();
    path(); ctx.lineWidth = w; ctx.strokeStyle = fill; ctx.stroke();
    if (foot === 'hoof') { ctx.fillStyle = INK; ctx.fillRect(x - w * 0.62, fy - w * 0.5, w * 1.24, w * 0.75); }
    else if (foot === 'paw') shape(ctx, fill, () => ell(ctx, x, fy - w * 0.1, w * 0.72, w * 0.45));
    else if (foot === 'bird') strokeLine(ctx, [x - 3.5, fy, x + 3.5, fy], 1.5, INK, false);
  }
  // which: 'far' or 'near'. Returns how far the body drops when legs are shortened (babies).
  function legsFB(ctx, o, which) {
    const { ph, m, spread, farSpread, nLen, fLen, depth, w, near, far, foot, lf = 1 } = o;
    const isNear = which === 'near', len = (isNear ? nLen : fLen) * lf, base = isNear ? 0 : -depth;
    const sx = isNear ? spread : farSpread, col = isNear ? near : far;
    // diagonal pairs move together, like a real walk
    [[-sx, isNear ? 0 : Math.PI], [sx, isNear ? Math.PI : 0]].forEach(([x, off]) => {
      const lift = len * 0.2 * m * Math.max(0, Math.sin(ph + off));
      legFB(ctx, x, base - len, base, lift, w, col, foot);
    });
    return nLen * (1 - lf);
  }
  const bobOf = (ph, m) => Math.sin(ph * 2) * 1.5 * m;
  const swayOf = (ph, m) => Math.sin(ph) * 1.2 * m;
  function spikyMane(ctx, x, y, r1, r2) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2, r = i % 2 ? r2 : r1; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = MANE; ctx.fill();
  }
  // Runs draw() shifted by the body's drop, bob and sway.
  function bodyLayer(ctx, dx, dy, draw) { ctx.save(); ctx.translate(dx, dy); draw(); ctx.restore(); }

  const FB = {
    lion(ctx, ph, m, baby, view) {
      const F = view === 'front', bob = bobOf(ph, m), sx = swayOf(ph, m), k = baby ? 1.45 : 1, sway = Math.sin(ph * 0.5);
      const L = { ph, m, spread: 14, farSpread: 11, nLen: 38, fLen: 38, depth: 7, w: baby ? 11 : 10, near: WHITE, far: FAR, foot: 'paw', lf: baby ? 0.7 : 1 };
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => {
        if (!F) grow(ctx, k, 0, -58, () => {
          if (!baby) spikyMane(ctx, 0, -66, 23, 17);
          else { shape(ctx, WHITE, () => ell(ctx, -7, -73, 3.4, 3.4)); shape(ctx, WHITE, () => ell(ctx, 7, -73, 3.4, 3.4)); shape(ctx, WHITE, () => ell(ctx, 0, -64, 12, 12)); }
        });
        const body = () => ell(ctx, 0, -50, 26, 18);
        shape(ctx, WHITE, body);
        if (baby) clipTo(ctx, body, () => [[-12, -54], [10, -56], [-4, -44], [14, -44], [-16, -42]].forEach(([x, y]) => dot(ctx, x, y, 2.4, '#999')));
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) grow(ctx, k, 0, -50, () => {
          if (!baby) spikyMane(ctx, 0, -64, 23, 17);
          else { shape(ctx, WHITE, () => ell(ctx, -8, -72, 3.4, 3.4)); shape(ctx, WHITE, () => ell(ctx, 8, -72, 3.4, 3.4)); }
          shape(ctx, WHITE, () => ell(ctx, 0, -62, 12, 12));
          shape(ctx, WHITE, () => ell(ctx, 0, -56, 7, 5.5));
          ctx.beginPath(); ctx.moveTo(-2.6, -59.5); ctx.lineTo(2.6, -59.5); ctx.lineTo(0, -56.5); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
          strokeLine(ctx, [0, -56.5, 0, -54], 1.2, INK, false);
          strokeLine(ctx, [-3, -53, 0, -54, 3, -53], 1.2, INK, false);
          dot(ctx, -4.5, -65, baby ? 2.2 : 1.8); dot(ctx, 4.5, -65, baby ? 2.2 : 1.8);
        });
        else {
          const tl = baby ? 0.7 : 1;
          strokeLine(ctx, [0, -54, 4 * tl, -40 * tl - 14, sway * 8, -54 + 28 * tl], 3, WHITE);
          shape(ctx, MANE, () => ell(ctx, sway * 8, -54 + 30 * tl, 4.5 * tl, 6 * tl));
        }
      });
    },

    elephant(ctx, ph, m, baby, view) {
      const G = '#dcdcdc', GF = '#b0b0b0', F = view === 'front', bob = bobOf(ph, m) * 0.8, sx = swayOf(ph, m), sw = Math.sin(ph) * m, k = baby ? 1.35 : 1;
      const L = { ph, m, spread: 19, farSpread: 15, nLen: 46, fLen: 46, depth: 8, w: 18, near: G, far: GF, foot: null, lf: baby ? 0.72 : 1 };
      const flap = Math.sin(ph) * 2 * m;
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => {
        if (!F) grow(ctx, k, 0, -66, () => {
          shape(ctx, G, () => ell(ctx, -24, -76, 11 + flap, 17, 0.15));
          shape(ctx, G, () => ell(ctx, 24, -76, 11 + flap, 17, -0.15));
          shape(ctx, G, () => ell(ctx, 0, -80, 16, 15));
        });
        shape(ctx, G, () => ell(ctx, 0, F ? -64 : -62, 35, F ? 27 : 30));
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) grow(ctx, k, 0, -64, () => {
          [-1, 1].forEach(s => {
            shape(ctx, G, () => ell(ctx, s * 23, -76, 13 + flap, 19, s * -0.12));
            strokeLine(ctx, [s * 16, -86, s * 25, -78, s * 18, -66], 1, '#888', false);
          });
          shape(ctx, G, () => ell(ctx, 0, -78, 17, 17));
          dot(ctx, -7, -82, 2); dot(ctx, 7, -82, 2);
          if (!baby) [-1, 1].forEach(s => strokeLine(ctx, [s * 6, -68, s * 11, -62, s * 9, -56], 3, WHITE));
          const tip = sw * 5;
          strokeLine(ctx, baby ? [0, -70, 1, -62, tip * 0.6, -56, tip + 1, -52] : [0, -70, 1, -58, tip, -46, tip + 3, -38], 8, G);
          strokeLine(ctx, baby ? [tip - 1, -53, tip + 3, -53] : [tip, -39, tip + 6, -39], 1, '#888', false);
        });
        else {
          strokeLine(ctx, [0, -58, sw * 2, -50, sw * 3, -42], 2, G);
          shape(ctx, INK, () => ell(ctx, sw * 3, -41, 2.5, 4));
          strokeLine(ctx, [0, -84, 0, -66], 1, '#999', false);
        }
      });
    },

    giraffe(ctx, ph, m, baby, view) {
      const F = view === 'front', bob = bobOf(ph, m), sx = swayOf(ph, m), nod = Math.sin(ph) * 2.5 * m;
      const L = { ph, m, spread: 8, farSpread: 6, nLen: F ? 74 : 70, fLen: F ? 70 : 74, depth: 8, w: 7, near: WHITE, far: FAR, foot: 'hoof', lf: baby ? 0.85 : 1 };
      const nk = baby ? 0.7 : 1, top = -88 - 54 * nk + nod, k = baby ? 1.35 : 1, oh = baby ? 0.5 : 1;
      const patch = (x, y, r) => { ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + x, rr = r * (0.8 + 0.12 * ((i * 7 + Math.abs(x)) % 3)); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85); }
        ctx.closePath(); ctx.fillStyle = SPOT; ctx.fill(); };
      const neck = () => { ctx.beginPath(); ctx.moveTo(-6, -86); ctx.lineTo(6, -86); ctx.lineTo(3.8, top + 4); ctx.lineTo(-3.8, top + 4); ctx.closePath(); };
      const drawNeck = () => {
        shape(ctx, WHITE, neck);
        clipTo(ctx, neck, () => { for (let y = -94, i = 0; y > top + 6; y -= 11, i++) patch((i % 2 ? 2.5 : -2.5), y, 3.6); });
        ctx.lineWidth = OUT; ctx.strokeStyle = INK; neck(); ctx.stroke();
        if (!F) strokeLine(ctx, [0, -88, 0, top + 6], 2.2, INK, false);
      };
      const head = () => grow(ctx, k, 0, top + 6, () => {
        [-1, 1].forEach(s => { strokeLine(ctx, [s * 3, top - 4, s * 3.5, top - 4 - 9 * oh], 2, INK, false); dot(ctx, s * 3.5, top - 5 - 9 * oh, 2.2); });
        [-1, 1].forEach(s => shape(ctx, WHITE, () => ell(ctx, s * 9, top - 2, 4.5, 2.2, s * 0.4), 2));
        if (F) {
          shape(ctx, WHITE, () => ell(ctx, 0, top, 7, 9.5));
          shape(ctx, WHITE, () => ell(ctx, 0, top + 7, 5.5, 4.5), 2);
          dot(ctx, -2, top + 8, 1); dot(ctx, 2, top + 8, 1);
          dot(ctx, -5, top - 2, 1.7); dot(ctx, 5, top - 2, 1.7);
          patch(0, top - 5, 2.2);
        } else {
          shape(ctx, WHITE, () => ell(ctx, 0, top, 6.5, 8));
          patch(0, top + 1, 2.6);
        }
      });
      const body = () => ell(ctx, 0, -80, 17, 13);
      const drawBody = () => {
        shape(ctx, WHITE, body);
        clipTo(ctx, body, () => [[-10, -84, 4.5], [2, -88, 4.5], [12, -82, 4.2], [-6, -74, 4.5], [8, -72, 4], [-15, -72, 3.5]].forEach(p => patch(...p)));
        ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      };
      const d = legsFB(ctx, L, 'far');
      if (F) {
        bodyLayer(ctx, sx, d + bob, drawBody);
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => { drawNeck(); head(); });
      } else {
        bodyLayer(ctx, sx, d + bob, () => { drawNeck(); head(); drawBody(); });
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => {
          strokeLine(ctx, [0, -82, sx * 1.5, -70, sx * 2, -60], 1.6, WHITE);
          shape(ctx, INK, () => ell(ctx, sx * 2, -58, 2.5, 5));
        });
      }
    },

    zebra(ctx, ph, m, baby, view) {
      const F = view === 'front', bob = bobOf(ph, m), sx = swayOf(ph, m), nod = Math.sin(ph) * 2 * m, k = baby ? 1.35 : 1, sway = Math.sin(ph * 0.7);
      const SC = baby ? '#555' : INK;
      const L = { ph, m, spread: 11, farSpread: 9, nLen: 44, fLen: 44, depth: 7, w: 9, near: WHITE, far: FAR, foot: 'hoof', lf: baby ? 0.85 : 1 };
      const body = () => ell(ctx, 0, -52, 21, 16);
      const drawBody = () => {
        shape(ctx, WHITE, body);
        clipTo(ctx, body, () => { ctx.fillStyle = SC; for (let x = -20; x <= 20; x += 7) { ctx.beginPath(); ctx.moveTo(x - 1.6, -70); ctx.lineTo(x + 1.6, -70); ctx.lineTo(x + 1.6 + x * 0.12, -36); ctx.lineTo(x - 1.6 + x * 0.12, -36); ctx.closePath(); ctx.fill(); } });
        ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      };
      const neck = () => { ctx.beginPath(); ctx.moveTo(-8, -58); ctx.lineTo(8, -58); ctx.lineTo(5.5, -78 + nod); ctx.lineTo(-5.5, -78 + nod); ctx.closePath(); };
      const drawNeck = () => {
        shape(ctx, WHITE, neck);
        clipTo(ctx, neck, () => { ctx.strokeStyle = SC; ctx.lineWidth = 3; for (let y = -62; y > -80; y -= 6) { ctx.beginPath(); ctx.moveTo(-9, y + nod * 0.5); ctx.lineTo(9, y + nod * 0.5); ctx.stroke(); } });
        ctx.lineWidth = OUT; ctx.strokeStyle = INK; neck(); ctx.stroke();
      };
      const head = () => grow(ctx, k, 0, -76 + nod, () => {
        const hy = -86 + nod;
        [-1, 1].forEach(s => shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(s * 2.5, hy - 9); ctx.lineTo(s * 7.5, hy - 19); ctx.lineTo(s * 7, hy - 8); ctx.closePath(); }));
        // mane tuft between the ears
        ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(-3 + i, hy - 11 - (i % 2 ? (baby ? 5 : 3) : 0)); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
        if (F) {
          const face = () => ell(ctx, 0, hy, 7.5, 13);
          shape(ctx, WHITE, face);
          clipTo(ctx, face, () => { ctx.strokeStyle = SC; ctx.lineWidth = 2.4; for (let y = hy - 10; y < hy + 4; y += 4.5) { ctx.beginPath(); ctx.arc(0, y - 6, 9, 0.6, Math.PI - 0.6); ctx.stroke(); } });
          ctx.lineWidth = OUT; ctx.strokeStyle = INK; face(); ctx.stroke();
          shape(ctx, INK, () => ell(ctx, 0, hy + 10, 6.5, 5));
          dot(ctx, -2.2, hy + 11, 1, WHITE); dot(ctx, 2.2, hy + 11, 1, WHITE);
          [-1, 1].forEach(s => { shape(ctx, WHITE, () => ell(ctx, s * 6.5, hy - 3, 2.6, 2.2), 1.2); dot(ctx, s * 6.6, hy - 3, baby ? 1.6 : 1.3); });
        } else {
          shape(ctx, WHITE, () => ell(ctx, 0, hy - 2, 6.5, 8));
          strokeLine(ctx, [0, hy - 8, 0, -60], 3, INK, false);
        }
      });
      const d = legsFB(ctx, L, 'far');
      if (F) {
        bodyLayer(ctx, sx, d + bob, drawBody);
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => { drawNeck(); head(); });
      } else {
        bodyLayer(ctx, sx, d + bob, () => { drawNeck(); head(); drawBody(); });
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => {
          strokeLine(ctx, [0, -56, sway * 3, -46, sway * 4, -38], 2, WHITE);
          shape(ctx, INK, () => ell(ctx, sway * 4, -36, 3, 5));
        });
      }
    },

    penguin(ctx, ph, m, baby, view) {
      const F = view === 'front', wad = Math.sin(ph) * (baby ? 0.18 : 0.13) * m;
      [-1, 1].forEach((s, i) => {
        const lift = Math.max(0, Math.sin(ph + i * Math.PI)) * 3 * m;
        shape(ctx, '#666', () => ell(ctx, s * 6, -1.5 - lift - (F ? 0 : 3), 5, 2.2), 1.5);
      });
      ctx.save(); ctx.translate(0, -2); ctx.rotate(wad);
      const flip = (fill, ry) => [-1, 1].forEach(s => {
        ctx.save(); ctx.translate(s * (baby ? 13 : 14), baby ? -32 : -38); ctx.rotate(s * (0.35 + Math.sin(ph + (s > 0 ? Math.PI : 0)) * 0.25 * m));
        shape(ctx, fill, () => ell(ctx, 0, ry * 0.85, baby ? 3.5 : 4, ry), baby ? 1.5 : OUT); ctx.restore();
      });
      if (baby) {
        flip('#9a9a9a', 8);
        shape(ctx, '#bdbdbd', () => fuzz(ctx, 0, -24, 17, 22));
        shape(ctx, INK, () => ell(ctx, 0, -48, 13, 12));
        if (F) {
          ctx.fillStyle = WHITE; ell(ctx, 0, -46, 8.5, 7); ctx.fill();
          dot(ctx, -3.5, -47, 1.8); dot(ctx, 3.5, -47, 1.8);
          shape(ctx, '#888', () => { ctx.beginPath(); ctx.moveTo(-2, -44); ctx.lineTo(2, -44); ctx.lineTo(0, -40.5); ctx.closePath(); }, 1.1);
        }
      } else {
        flip(INK, 13);
        shape(ctx, INK, () => ell(ctx, 0, -30, 16, 28));
        if (F) {
          ctx.fillStyle = WHITE; ell(ctx, 0, -26, 11.5, 21.5); ctx.fill();
          [-1, 1].forEach(s => { ctx.fillStyle = WHITE; ell(ctx, s * 5, -47, 3, 2.6); ctx.fill(); dot(ctx, s * 5, -47, 1.4); });
          shape(ctx, '#888', () => { ctx.beginPath(); ctx.moveTo(-2.6, -44); ctx.lineTo(2.6, -44); ctx.lineTo(0, -37.5); ctx.closePath(); }, 1.4);
        } else {
          strokeLine(ctx, [0, -50, 0, -10], 1, '#444', false);
        }
      }
      ctx.restore();
    },

    bear(ctx, ph, m, baby, view) {
      const B1 = '#555', B2 = '#383838', MZ = '#a8a8a8', F = view === 'front', bob = bobOf(ph, m), sx = swayOf(ph, m), k = baby ? 1.45 : 1;
      const L = { ph, m, spread: 13, farSpread: 11, nLen: 36, fLen: 36, depth: 8, w: 13, near: B1, far: B2, foot: 'paw', lf: baby ? 0.72 : 1 };
      const d = legsFB(ctx, L, 'far');
      const H = (x, y, r) => { const [a, b, rr] = gp(k, 0, -52)(x, y, r); return () => ell(ctx, a, b, rr, rr); };
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) shape(ctx, B1, () => ell(ctx, 0, -48, 26, 22));
        else blob(ctx, B1, [H(0, -64, 13), H(-9, -75, 4.5), H(9, -75, 4.5), () => ell(ctx, 0, -48, 27, 24)]);
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) {
          blob(ctx, B1, [H(0, -58, 14), H(-10, -70, 4.5), H(10, -70, 4.5)]);
          grow(ctx, k, 0, -52, () => {
            shape(ctx, MZ, () => ell(ctx, 0, -52, 7.5, 5.5), 1.5);
            dot(ctx, 0, -54.5, 2.6);
            strokeLine(ctx, [0, -52, 0, -49.5], 1, INK, false);
            [-1, 1].forEach(s => { dot(ctx, s * 5.5, -61, 2.1); dot(ctx, s * 5.5 + 0.6, -61.6, 0.7, WHITE); });
          });
        } else shape(ctx, B1, () => ell(ctx, 0, -60, 4, 3.5), 2);
      });
    },

    monkey(ctx, ph, m, baby, view) {
      const M = '#8c8c8c', MF = '#6a6a6a', F = view === 'front', bob = bobOf(ph, m) * 0.8, sx = swayOf(ph, m), sway = Math.sin(ph * 0.8) * m, k = baby ? 1.45 : 1;
      const L = { ph, m, spread: 9, farSpread: 8, nLen: F ? 38 : 28, fLen: F ? 28 : 38, depth: 6, w: 6, near: M, far: MF, foot: 'paw', lf: baby ? 0.75 : 1 };
      const H = (x, y, r) => { const [a, b, rr] = gp(k, 0, -48)(x, y, r); return () => ell(ctx, a, b, rr, rr); };
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) {
          strokeLine(ctx, [8, -38, 20, -40, 24 + sway * 3, -58, 16, -64], 3.5, M);
          strokeLine(ctx, [16, -64, 11, -66, 12, -59], 3.5, M);
          shape(ctx, M, () => ell(ctx, 0, -42, 14, 14));
        } else {
          blob(ctx, M, [H(0, -58, 11), H(-11, -58, 4.5), H(11, -58, 4.5), () => ell(ctx, 0, -42, 14, 14)]);
        }
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) {
          blob(ctx, M, [H(0, -56, 11), H(-11, -56, 4.5), H(11, -56, 4.5)]);
          grow(ctx, k, 0, -48, () => {
            shape(ctx, WHITE, () => ell(ctx, -11, -56, 2.4, 2.4), 1); shape(ctx, WHITE, () => ell(ctx, 11, -56, 2.4, 2.4), 1);
            shape(ctx, WHITE, () => ell(ctx, 0, -54, 7.5, 8), 1.5);
            dot(ctx, -3, -57, 1.5); dot(ctx, 3, -57, 1.5);
            strokeLine(ctx, [-2.5, -50.5, 0, -49, 2.5, -50.5], 1, INK, false);
          });
        } else {
          strokeLine(ctx, [0, -34, -2 + sway * 2, -50, 12 + sway * 3, -62, 4 + sway * 3, -70], 3.5, M);
          strokeLine(ctx, [4 + sway * 3, -70, -2 + sway * 3, -70, 0 + sway * 3, -64], 3.5, M);
        }
      });
    },

    flamingo(ctx, ph, m, baby, view) {
      const F = view === 'front', Fc = baby ? '#bdbdbd' : '#e4e4e4', bob = bobOf(ph, m), sw = Math.sin(ph) * 2 * m;
      const lf = baby ? 0.6 : 1, d = 56 * (1 - lf);
      [-1, 1].forEach((s, i) => {
        const lift = 56 * lf * 0.16 * m * Math.max(0, Math.sin(ph + i * Math.PI));
        legFB(ctx, s * 3.5, -56 * lf + bob, 0, lift, baby ? 3.4 : 2.6, i ? '#6f6f6f' : '#9a9a9a', 'bird');
      });
      ctx.save(); ctx.translate(0, d + bob);
      const neck = () => { if (baby) strokeLine(ctx, [0, -70, 3, -78, sw * 0.5, -84], 7, Fc); else strokeLine(ctx, [0, -73, 8, -86, -7 + sw, -98, sw, -108], 4.5, Fc); };
      const head = () => {
        if (baby) {
          ctx.save(); ctx.translate(sw * 0.5, -88);
          shape(ctx, Fc, () => fuzz(ctx, 0, 0, 8, 8, 14), 2);
          if (F) { dot(ctx, -3, -1, 1.6); dot(ctx, 3, -1, 1.6); shape(ctx, '#666', () => { ctx.beginPath(); ctx.moveTo(-2.2, 1); ctx.lineTo(2.2, 1); ctx.lineTo(0, 6.5); ctx.closePath(); }, 1.1); }
          ctx.restore();
        } else {
          ctx.save(); ctx.translate(sw, -111);
          shape(ctx, Fc, () => ell(ctx, 0, 0, 5.5, 5.5), 2);
          if (F) {
            shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(-2.6, 3); ctx.lineTo(2.6, 3); ctx.lineTo(1.6, 10); ctx.lineTo(-1.6, 10); ctx.closePath(); }, 1.4);
            shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-1.6, 10); ctx.lineTo(1.6, 10); ctx.lineTo(0, 13); ctx.closePath(); }, 1);
            dot(ctx, -2.6, -1, 1.2); dot(ctx, 2.6, -1, 1.2);
          }
          ctx.restore();
        }
      };
      const body = () => {
        if (baby) shape(ctx, Fc, () => fuzz(ctx, 0, -64, 14, 12));
        else {
          shape(ctx, Fc, () => ell(ctx, 0, -64, 13, 11));
          if (!F) shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-6, -60); ctx.lineTo(6, -60); ctx.lineTo(0, -52); ctx.closePath(); }, 1);
          else [-1, 1].forEach(s => strokeLine(ctx, [s * 5, -70, s * 10, -63, s * 6, -57], 1.2, '#999', false));
        }
      };
      if (F) { body(); neck(); head(); } else { neck(); head(); body(); }
      ctx.restore();
    },

    snowleopard(ctx, ph, m, baby, view) {
      const S = '#f2f2f2', SF = '#c8c8c8', F = view === 'front', bob = bobOf(ph, m) * 0.8, sx = swayOf(ph, m), sway = Math.sin(ph * 0.6) * m, k = baby ? 1.45 : 1;
      const L = { ph, m, spread: 14, farSpread: 11, nLen: 32, fLen: 32, depth: 7, w: baby ? 11 : 10, near: S, far: SF, foot: 'paw', lf: baby ? 0.72 : 1 };
      const tl = baby ? 0.75 : 1;
      const spots = pts => pts.forEach(([x, y, r]) => (baby ? dot(ctx, x, y, r * 0.6, '#555') : rosette(ctx, x, y, r)));
      const tailDots = t => [0.35, 0.6, 0.85].forEach(u => {
        const v = 1 - u, x = v * v * v * t[0] + 3 * v * v * u * t[2] + 3 * v * u * u * t[4] + u * u * u * t[6];
        const y = v * v * v * t[1] + 3 * v * v * u * t[3] + 3 * v * u * u * t[5] + u * u * u * t[7];
        dot(ctx, x, y, 2.2, '#444');
      });
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) {
          const t = [10, -44, 10 + 20 * tl, -40, 10 + 26 * tl, -22 + sway * 3, 10 + 16 * tl, -14];
          strokeLine(ctx, t, baby ? 9 : 8, S); tailDots(t);
        } else grow(ctx, k, 0, -46, () => {
          shape(ctx, S, () => ell(ctx, -7, -63, 3, 2.6)); shape(ctx, S, () => ell(ctx, 7, -63, 3, 2.6));
          shape(ctx, S, () => ell(ctx, 0, -56, 10, 9));
          [[-3, -59], [3, -60], [0, -54]].forEach(([x, y]) => dot(ctx, x, y, 1, '#555'));
        });
        const body = () => ell(ctx, 0, -46, 24, 16);
        shape(ctx, S, body);
        clipTo(ctx, body, () => spots([[-12, -50, 3.5], [0, -54, 3.8], [12, -50, 3.5], [-6, -40, 3.4], [8, -40, 3.4]]));
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) grow(ctx, k, 0, -46, () => {
          shape(ctx, S, () => ell(ctx, -7, -62, 3, 2.6)); shape(ctx, S, () => ell(ctx, 7, -62, 3, 2.6));
          shape(ctx, S, () => ell(ctx, 0, -54, 10.5, 9.5));
          shape(ctx, S, () => ell(ctx, 0, -49, 6, 4.5), 1.8);
          ctx.beginPath(); ctx.moveTo(-2, -52); ctx.lineTo(2, -52); ctx.lineTo(0, -49.5); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
          strokeLine(ctx, [0, -49.5, 0, -47.5], 1, INK, false);
          dot(ctx, -4, -56, 1.8); dot(ctx, 4, -56, 1.8);
          [[-7, -52], [7, -52], [-3, -61], [3, -61]].forEach(([x, y]) => dot(ctx, x, y, 1, '#555'));
        });
        else {
          const t = [0, -42, 2, -30, -8 + sway * 5, -12, 4 + sway * 8, -6 - 6 * (1 - tl)];
          strokeLine(ctx, t, baby ? 9 : 8, S); tailDots(t);
        }
      });
    },
  };

  // ---------- new animals (added 2026-10-08; all pending Alex's approval) ----------
  // A long body drawn as overlapping circles so it gets one clean outline (snakes).
  function tube(ctx, pts, fill) {
    ctx.fillStyle = INK; pts.forEach(([x, y, r]) => { ell(ctx, x, y, r + OUT, r + OUT); ctx.fill(); });
    ctx.fillStyle = fill; pts.forEach(([x, y, r]) => { ell(ctx, x, y, r, r); ctx.fill(); });
  }
  // Snake spine: head at x = +len/2, tail at -len/2. lift raises the front (basilisk).
  function snakePts(ph, m, len, th, amp, lift = 0, n = 40) {
    const pts = [];
    for (let i = n; i >= 0; i--) {
      const t = i / n;                                   // 0 = head, 1 = tail
      const x = len / 2 - len * t;
      let y = -th - Math.sin(t * 9 - ph * 1.6) * amp * (0.35 + t * 0.65);
      if (lift) y -= lift * Math.pow(Math.max(0, 1 - t / 0.35), 1.6);
      const r = th * (t < 0.08 ? 0.85 + t * 1.9 : t > 0.6 ? 1 - (t - 0.6) * 2.1 : 1);
      pts.push([x, y, Math.max(1.5, r)]);
    }
    return pts;                                          // tail first, head last
  }
  function hornPath(ctx, bx1, by1, bx2, by2, tx, ty, bend = 0) {
    ctx.beginPath(); ctx.moveTo(bx1, by1);
    ctx.quadraticCurveTo((bx1 + tx) / 2 - bend, (by1 + ty) / 2, tx, ty);
    ctx.quadraticCurveTo((bx2 + tx) / 2 + bend, (by2 + ty) / 2, bx2, by2); ctx.closePath();
  }

  Object.assign(ART, {
    hippo(ctx, ph, m, baby) {
      const H = '#a9a9a9', HF = '#7f7f7f';
      const bob = Math.sin(ph * 2) * 1.2 * m, sw = Math.sin(ph) * m;
      const d = quadLegs(ctx, { ph, A: 0.3 * m, B: 0.45 * m, hindX: -26, foreX: 24, hl: 12, fl: 12,
        w: 15, near: H, far: HF, foot: null, lf: baby ? 0.8 : 1 });
      ctx.save(); ctx.translate(0, d);
      strokeLine(ctx, [-45, -44 + bob, -51, -40, -51 + sw * 2, -33], 2.4, H);
      ctx.save(); ctx.translate(0, bob);
      const k = baby ? 1.4 : 1, P = gp(k, 38, -44);
      const C = (x, y, rx, ry) => () => { const [a, b] = P(x, y); ell(ctx, a, b, rx * k, ry * k); };
      blob(ctx, H, [() => ell(ctx, 0, -43, 46, 24), C(44, -46, 19, 17), C(64, -38, 15, 13), C(40, -62, 4, 3.5), C(49, -59, 6.5, 5.5)]);
      grow(ctx, k, 38, -44, () => {
        dot(ctx, 50, -60, 1.9); dot(ctx, 50.6, -60.6, 0.6, WHITE);
        shape(ctx, H, () => ell(ctx, 70, -48, 4, 3), 1.6); dot(ctx, 71, -48.5, 1.3);
        strokeLine(ctx, [50, -31, 62, -27, 77, -35], 1.4, INK, false);
        strokeLine(ctx, [56, -46, 58, -40, 56, -34], 1, '#777', false);
      });
      strokeLine(ctx, [18, -62, 23, -46, 19, -27], 1, '#777', false);
      ctx.restore(); ctx.restore();
    },

    rhino(ctx, ph, m, baby) {
      const R = '#b8b8b8', RF = '#8c8c8c';
      const bob = Math.sin(ph * 2) * 1.3 * m, nod = Math.sin(ph) * 1.5 * m, sw = Math.sin(ph * 0.8) * m;
      const d = quadLegs(ctx, { ph, A: 0.32 * m, B: 0.5 * m, hindX: -26, foreX: 24, hl: 17, fl: 17,
        w: 13, near: R, far: RF, foot: null, lf: baby ? 0.78 : 1 });
      ctx.save(); ctx.translate(0, d);
      strokeLine(ctx, [-42, -58 + bob, -48, -50, -47 + sw * 2, -42], 2, R);
      shape(ctx, INK, () => ell(ctx, -47 + sw * 2, -41, 2, 3.5));
      ctx.save(); ctx.translate(0, bob);
      const k = baby ? 1.35 : 1, P = gp(k, 34, -54 + nod);
      const head = () => {
        ctx.beginPath();
        [[28, -66], [44, -64], [60, -52], [72, -40], [68, -31], [52, -33], [32, -42]].forEach(([x, y], i) => {
          const [a, b] = P(x, y + nod); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); });
        ctx.closePath();
      };
      blob(ctx, R, [() => ell(ctx, 0, -53, 44, 22), () => ell(ctx, 20, -61, 17, 15), head]);
      grow(ctx, k, 34, -54 + nod, () => {
        const y = nod, big = baby ? 0.22 : 1, small = baby ? 0.12 : 1;
        shape(ctx, '#e8e8e8', () => hornPath(ctx, 59, -51 + y, 70, -40 + y, 66 + 4 * big, -50 - 22 * big + y, -2), 1.8);
        shape(ctx, '#e8e8e8', () => hornPath(ctx, 50, -57 + y, 57, -52 + y, 54, -57 - 11 * small + y), 1.6);
        shape(ctx, R, () => { ctx.beginPath(); ctx.moveTo(27, -63 + y); ctx.lineTo(29, -76 + y); ctx.lineTo(35, -65 + y); ctx.closePath(); }, 1.8);
        dot(ctx, 47, -53 + y, 1.7); dot(ctx, 68.5, -36 + y, 1.1);
        strokeLine(ctx, [34, -60 + y, 38, -50 + y, 36, -42 + y], 1, '#777', false);
      });
      [[-22, -70, -18, -38], [12, -72, 16, -36]].forEach(([a, b, c2, e]) => strokeLine(ctx, [a, b, a + 5, (b + e) / 2, c2, e], 1, '#7a7a7a', false));
      ctx.restore(); ctx.restore();
    },

    ostrich(ctx, ph, m, baby) {
      const bob = Math.sin(ph * 2) * 2 * m, sway = Math.sin(ph) * 2 * m;
      const lf = baby ? 0.55 : 1, L = 34 * lf;
      [[Math.PI, '#b9b9b9'], [0, '#dedede']].forEach(([off, col]) => {
        const s = Math.sin(ph + off), c = Math.cos(ph + off);
        const a1 = 0.45 * m * s, a2 = a1 - 0.8 * m * Math.max(0, c);
        limb(ctx, 0, -2 * L, a1, L, a2, L, baby ? 4 : 4.5, col, 'bird');
      });
      ctx.save(); ctx.translate(0, 68 * (1 - lf) + bob);
      if (baby) {
        strokeLine(ctx, [8, -82, 14, -92, 15 + sway, -101], 5.5, '#c4c4c4');
        const body = () => fuzz(ctx, 0, -80, 18, 14);
        shape(ctx, '#bdbdbd', body);
        clipTo(ctx, body, () => [-11, -3, 5].forEach(x => strokeLine(ctx, [x, -96, x + 5, -64], 2.2, '#6a6a6a', false)));
        ctx.save(); ctx.translate(15 + sway, -104);
        shape(ctx, '#c4c4c4', () => fuzz(ctx, 0, 0, 7.5, 7, 12), 2);
        shape(ctx, '#999', () => { ctx.beginPath(); ctx.moveTo(5, -1); ctx.lineTo(13, 1); ctx.lineTo(5, 3); ctx.closePath(); }, 1.2);
        dot(ctx, 2, -2, 1.8);
        ctx.restore();
      } else {
        strokeLine(ctx, [12, -86, 26, -112, 22 + sway, -142], 5, '#d8d8d8');
        shape(ctx, INK, () => fuzz(ctx, 0, -80, 29, 17, 26));
        shape(ctx, WHITE, () => fuzz(ctx, -27, -88, 10, 8, 12), 1.6);
        shape(ctx, WHITE, () => ell(ctx, -6, -79, 15, 6.5, 0.18), 1.6);
        ctx.save(); ctx.translate(22 + sway, -144);
        shape(ctx, '#d8d8d8', () => ell(ctx, 0, 0, 6.5, 5.5), 1.8);
        shape(ctx, '#b0b0b0', () => { ctx.beginPath(); ctx.moveTo(4, -1.5); ctx.lineTo(14, 1); ctx.lineTo(4, 3.5); ctx.closePath(); }, 1.2);
        dot(ctx, 1.5, -1.8, 2); dot(ctx, 2, -2.3, 0.6, WHITE);
        ctx.restore();
      }
      ctx.restore();
    },

    // Osprey ("sea hawk"). Adults fly low when they move, and perch when they stop.
    seahawk(ctx, ph, m, baby) {
      const D = '#4a4a4a', DF = '#2e2e2e';
      if (baby) {
        const hop = Math.abs(Math.sin(ph * 1.5)) * 4 * m;
        [-3, 3].forEach(x => strokeLine(ctx, [x, -9 - hop, x + 1, -1 - hop], 2.4, '#888'));
        ctx.save(); ctx.translate(0, -hop);
        shape(ctx, '#bdbdbd', () => fuzz(ctx, 0, -20, 12, 13, 16));
        shape(ctx, '#d6d6d6', () => fuzz(ctx, 4, -38, 9, 8.5, 14), 2);
        strokeLine(ctx, [6, -39, -2, -36], 2, INK, false);
        dot(ctx, 7, -40, 1.8);
        shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(11, -41); ctx.quadraticCurveTo(17, -40, 15, -35); ctx.lineTo(11, -37); ctx.closePath(); }, 1);
        ctx.restore();
        return;
      }
      if (m) {
        const lift = 18 + Math.sin(ph * 0.5) * 2, f = Math.sin(ph * 1.6);
        ell(ctx, 0, 0, 14, 3); ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fill();
        ctx.save(); ctx.translate(0, -lift);
        // a broad feathered wing, raised (k > 0) or lowered (k < 0) at the shoulder
        const wing = (fill, k) => {
          const pts = [[8, -25], [1, -25 - 13 * k], [-14, -25 - 31 * k], [-19, -25 - 27 * k], [-17, -25 - 21 * k], [-20, -25 - 17 * k],
            [-14, -25 - 12 * k], [-15, -25 - 7 * k], [-8, -24 - 3 * k], [-6, -23]];
          shape(ctx, fill, () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }, 1.8);
          strokeLine(ctx, [2, -25 - 10 * k, -10, -25 - 20 * k], 1, '#888', false);
        };
        wing('#777777', f * 0.6 - 0.15);                               // far wing
        shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(-12, -25); ctx.lineTo(-29, -28); ctx.lineTo(-30, -19); ctx.lineTo(-12, -20); ctx.closePath(); }, 1.8);
        [-18, -23].forEach(x => strokeLine(ctx, [x, -26.5, x, -19.5], 1, '#ddd', false));
        const body = () => ell(ctx, 0, -22, 16, 6.5);
        shape(ctx, D, body);
        clipTo(ctx, body, () => { ctx.fillStyle = WHITE; ell(ctx, 3, -16.5, 17, 5); ctx.fill(); });
        ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
        strokeLine(ctx, [2, -16, 4, -10, 7, -9], 1.6, '#999');
        shape(ctx, WHITE, () => ell(ctx, 18, -25, 6.5, 5.5));
        strokeLine(ctx, [18, -26, 12, -24.5], 2.2, INK, false); dot(ctx, 20, -26.5, 1.4);
        shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(23.5, -27); ctx.quadraticCurveTo(29, -26, 27.5, -21.5); ctx.lineTo(23.5, -23.5); ctx.closePath(); }, 1);
        wing(D, f);                                                     // near wing
        ctx.restore();
        return;
      }
      // perched
      [-3, 4].forEach(x => { strokeLine(ctx, [x, -14, x, -2], 2.6, '#9a9a9a'); strokeLine(ctx, [x - 2, -1, x + 4, -1], 1.6, INK, false); });
      strokeLine(ctx, [-7, -18, -14, -4], 6, D);
      [-9, -12].forEach(y => strokeLine(ctx, [-8 + (y + 9) * 0.5, y - 4, -11 + (y + 9) * 0.5, y + 2], 1, '#ddd', false));
      const body = () => ell(ctx, 0, -27, 11, 17, -0.3);
      shape(ctx, D, body);
      clipTo(ctx, body, () => { ctx.fillStyle = WHITE; ell(ctx, 7, -24, 7.5, 15, -0.3); ctx.fill(); });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      shape(ctx, WHITE, () => ell(ctx, 5, -46, 8, 7));
      strokeLine(ctx, [6, -47, -2.5, -44.5], 2.4, INK, false);
      dot(ctx, 8, -48, 1.5);
      shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(11, -48); ctx.quadraticCurveTo(18, -47, 16, -41); ctx.lineTo(11, -44); ctx.closePath(); }, 1);
    },

    polarbear(ctx, ph, m, baby) {
      const B1 = '#f7f7f7', B2 = '#d2d2d2';
      const bob = Math.sin(ph * 2) * 1.5 * m, nod = Math.sin(ph) * 1.6 * m;
      const d = quadLegs(ctx, { ph, A: 0.33 * m, B: 0.5 * m, hindX: -26, foreX: 24, hl: 20, fl: 20,
        w: 13, near: B1, far: B2, foot: null, lf: baby ? 0.72 : 1 });
      ctx.save(); ctx.translate(0, d + bob);
      const k = baby ? 1.45 : 1, P = gp(k, 36, -56 + nod);
      const C = (x, y, rx, ry, rot = 0) => () => { const [a, b] = P(x, y + nod); ell(ctx, a, b, rx * k, ry * k, rot); };
      blob(ctx, B1, [() => ell(ctx, -2, -50, 38, 20), () => ell(ctx, -26, -54, 14, 17), () => ell(ctx, 26, -56, 15, 11, -0.45),
        C(44, -62, 11, 10), C(56, -58, 9, 6.5, 0.15), C(39, -71, 3.6, 3.4)]);
      grow(ctx, k, 36, -56 + nod, () => {
        dot(ctx, 64, -59 + nod, 2.6); dot(ctx, 47, -65 + nod, 1.8);
        strokeLine(ctx, [58, -54 + nod, 62, -53 + nod], 1.1, INK, false);
      });
      [[-30, -40, -24, -34], [-10, -36, -4, -32], [6, -38, 12, -33]].forEach(([a, b, c2, e]) => strokeLine(ctx, [a, b, c2, e], 1, '#cfcfcf', false));
      ctx.restore();
    },

    anaconda(ctx, ph, m, baby) {
      const len = 150, th = baby ? 6 : 6.5, amp = m ? 10 : 7;
      const pts = snakePts(ph * (m ? 1 : 0.1) + 0.6, m, len, th, amp, 6);
      tube(ctx, pts, '#7a7a7a');
      pts.forEach(([x, y, r], i) => { if (i % 3 === 1 && i < pts.length - 4) { ell(ctx, x, y - r * 0.2, r * 0.6, r * 0.45); ctx.fillStyle = INK; ctx.fill(); } });
      pts.forEach(([x, y, r], i) => { if (i % 3 === 2 && i < pts.length - 4) { ell(ctx, x, y + r * 0.5, r * 0.45, r * 0.25); ctx.fillStyle = '#b8b8b8'; ctx.fill(); } });
      const [hx, hy] = pts[pts.length - 1];
      // broad, flat head
      shape(ctx, '#7a7a7a', () => { ctx.beginPath(); ctx.moveTo(hx - 3, hy - 6); ctx.quadraticCurveTo(hx + 8, hy - 9, hx + 15, hy - 3);
        ctx.quadraticCurveTo(hx + 16, hy + 2, hx + 10, hy + 4); ctx.lineTo(hx - 3, hy + 5); ctx.closePath(); });
      dot(ctx, hx + 8, hy - 4.5, 1.5); dot(ctx, hx + 8.4, hy - 4.9, 0.5, WHITE);
      strokeLine(ctx, [hx + 2, hy - 6, hx + 9, hy - 7], 1, INK, false);
      strokeLine(ctx, [hx + 3, hy + 1.5, hx + 14, hy], 1, '#444', false);
      if (m && Math.sin(ph * 3) > 0.6) strokeLine(ctx, [hx + 16, hy, hx + 22, hy, hx + 24, hy - 2], 1.1, INK, false);
    },

    shark(ctx, ph, m, baby) {
      const G = '#9a9a9a', sw = Math.sin(ph * 1.2) * (m ? 1 : 0.4);
      ell(ctx, 0, 0, 34, 4); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.save(); ctx.translate(0, -26 + Math.sin(ph * 0.5) * 1.5);
      // tail (upper lobe longer)
      shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(-40, -3); ctx.lineTo(-62, -22 + sw * 4); ctx.lineTo(-54, 0); ctx.lineTo(-58, 12 + sw * 3); ctx.lineTo(-40, 3); ctx.closePath(); });
      shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(-26, 6); ctx.lineTo(-32, 13); ctx.lineTo(-20, 8); ctx.closePath(); }, 1.8);
      const body = () => { ctx.beginPath(); ctx.moveTo(52, 2); ctx.quadraticCurveTo(34, -16, -6, -12); ctx.quadraticCurveTo(-30, -9, -44, -2);
        ctx.lineTo(-44, 2); ctx.quadraticCurveTo(-28, 9, 0, 10); ctx.quadraticCurveTo(38, 11, 52, 2); ctx.closePath(); };
      shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(-8, -36); ctx.lineTo(-18, -10); ctx.closePath(); });
      shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(-28, -8); ctx.lineTo(-33, -16); ctx.lineTo(-36, -6); ctx.closePath(); }, 1.8);
      shape(ctx, G, body);
      clipTo(ctx, body, () => { ctx.fillStyle = WHITE; ell(ctx, 12, 11, 46, 7); ctx.fill(); });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      [22, 25.5, 29].forEach(x => strokeLine(ctx, [x, -6, x - 1, 3], 1.1, '#555', false));
      shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(14, 5); ctx.lineTo(0, 22 + sw * 2); ctx.lineTo(-2, 7); ctx.closePath(); });
      dot(ctx, 40, -3, 1.8);
      strokeLine(ctx, [35, 5, 46, 6], 1.2, INK, false);
      ctx.restore();
    },

    orca(ctx, ph, m, baby) {
      const sw = Math.sin(ph * 1.1) * (m ? 1 : 0.4);
      ell(ctx, 0, 0, 44, 5); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.save(); ctx.translate(0, -30 + Math.sin(ph * 0.5) * 1.5);
      // flukes beat up and down
      ctx.save(); ctx.translate(-50, 0); ctx.rotate(sw * 0.25);
      shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(4, -4); ctx.lineTo(-18, -10); ctx.quadraticCurveTo(-24, -4, -16, 0); ctx.quadraticCurveTo(-24, 6, -18, 9); ctx.lineTo(4, 4); ctx.closePath(); });
      ctx.restore();
      const fin = baby ? 0.5 : 1;
      shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(4, -15); ctx.lineTo(-2, -15 - 34 * fin); ctx.quadraticCurveTo(-8, -16 - 20 * fin, -14, -14); ctx.closePath(); });
      const body = () => { ctx.beginPath(); ctx.moveTo(58, 2); ctx.quadraticCurveTo(52, -16, 20, -17); ctx.quadraticCurveTo(-24, -16, -52, -3);
        ctx.lineTo(-52, 3); ctx.quadraticCurveTo(-20, 16, 10, 16); ctx.quadraticCurveTo(48, 16, 58, 2); ctx.closePath(); };
      shape(ctx, INK, body);
      const patch = baby ? '#dedede' : WHITE;
      clipTo(ctx, body, () => {
        ctx.fillStyle = patch; ell(ctx, 22, 16, 34, 7); ctx.fill();
        ell(ctx, -18, 12, 16, 5, -0.25); ctx.fill();
        ell(ctx, 38, -7, 8, 3.2, -0.1); ctx.fill();
        ctx.fillStyle = '#9a9a9a'; ell(ctx, -16, -15, 10, 4); ctx.fill();
      });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(28, 8); ctx.quadraticCurveTo(22, 24 + sw * 2, 12, 22 + sw * 2); ctx.quadraticCurveTo(16, 14, 18, 8); ctx.closePath(); }, 1.6);
      dot(ctx, 44, -4, 1.4, '#555');
      ctx.restore();
    },

    triceratops(ctx, ph, m, baby) {
      const T = '#c2c2c2', TF = '#959595', FR = '#9d9d9d';
      const bob = Math.sin(ph * 2) * 1.2 * m, nod = Math.sin(ph) * 1.5 * m, sw = Math.sin(ph * 0.8) * m;
      const d = quadLegs(ctx, { ph, A: 0.3 * m, B: 0.45 * m, hindX: -26, foreX: 26, hl: 20, fl: 16,
        w: 15, near: T, far: TF, foot: null, lf: baby ? 0.75 : 1 });
      ctx.save(); ctx.translate(0, d + bob);
      const tail = () => { ctx.beginPath(); ctx.moveTo(-34, -70); ctx.quadraticCurveTo(-64, -62, -86, -38 + sw * 4); ctx.quadraticCurveTo(-62, -46, -34, -40); ctx.closePath(); };
      const k = baby ? 1.4 : 1, P = gp(k, 42, -60 + nod);
      const C = (x, y, rx, ry, rot = 0) => () => { const [a, b] = P(x, y + nod); ell(ctx, a, b, rx * k, ry * k, rot); };
      blob(ctx, T, [() => ell(ctx, 0, -54, 44, 24), tail]);
      grow(ctx, k, 42, -60 + nod, () => {
        // bony frill, tilted back behind the head
        const fs = baby ? 0.6 : 1, fx = 46, fy = -66 + nod;
        const frill = () => ell(ctx, fx, fy, 12 * fs, 21 * fs, -0.55);
        shape(ctx, FR, frill);
        for (let i = 0; i < 9; i++) { const a = -2.9 + i * 0.36;
          const px = fx + Math.cos(a) * 12 * fs, py = fy + Math.sin(a) * 21 * fs;
          const rx = px * Math.cos(-0.55) - 0, ry = 0;
          dot(ctx, fx + (px - fx) * Math.cos(-0.55) - (py - fy) * Math.sin(-0.55), fy + (px - fx) * Math.sin(-0.55) + (py - fy) * Math.cos(-0.55), 1.6, '#555'); }
      });
      blob(ctx, T, [C(56, -56, 16, 11, 0.3), C(68, -48, 9, 7, 0.5)]);
      grow(ctx, k, 42, -60 + nod, () => {
        const h = baby ? 0.25 : 1, y = nod;
        shape(ctx, '#ededed', () => hornPath(ctx, 52, -64 + y, 58, -62 + y, 52 + 28 * h, -64 - 14 * h + y, 2), 1.6);
        shape(ctx, '#ededed', () => hornPath(ctx, 68, -54 + y, 73, -52 + y, 72 + 2 * h, -54 - 9 * h + y), 1.4);
        shape(ctx, '#777', () => { ctx.beginPath(); ctx.moveTo(72, -48 + y); ctx.quadraticCurveTo(82, -46 + y, 78, -38 + y); ctx.lineTo(70, -42 + y); ctx.closePath(); }, 1.4);
        dot(ctx, 58, -57 + y, 1.9); dot(ctx, 58.5, -57.5 + y, 0.6, WHITE);
      });
      [[-24, -68], [-8, -72], [8, -72], [22, -68]].forEach(([x, y]) => strokeLine(ctx, [x, y, x + 3, y + 8], 1, '#8a8a8a', false));
      ctx.restore();
    },

    unicorn(ctx, ph, m, baby) {
      const U = '#ffffff', UF = '#d6d6d6';
      const bob = Math.sin(ph * 2) * 1.5 * m, nod = Math.sin(ph) * 2 * m, sway = Math.sin(ph * 0.7);
      const d = quadLegs(ctx, { ph, A: 0.42 * m, B: 0.6 * m, hindX: -24, foreX: 24, hl: 24, fl: 24,
        w: 8, near: U, far: UF, foot: 'hoof', lf: baby ? 0.85 : 1 });
      ctx.save(); ctx.translate(0, d);
      // flowing tail
      const tl = baby ? 0.6 : 1;
      [0, 3, 6].forEach((o, i) => strokeLine(ctx, [-33, -60 + bob, -46, -60 + o, -48 + sway * 4, (-34 + o) * tl - (baby ? 18 : 0), -40 + sway * 6 - i * 2, (-22 + o) * tl - (baby ? 22 : 0)], 2.6, i === 1 ? '#e6e6e6' : U));
      ctx.save(); ctx.translate(0, bob);
      const k = baby ? 1.35 : 1, P = gp(k, 42, -86 + nod);
      const body = () => ell(ctx, 0, -56, 34, 15);
      const neck = () => { ctx.beginPath(); ctx.moveTo(18, -66); ctx.lineTo(32, -60); ctx.lineTo(48, -86 + nod); ctx.lineTo(36, -94 + nod); ctx.closePath(); };
      const [hx, hy] = P(48, -84 + nod);
      blob(ctx, U, [body, neck, () => ell(ctx, hx, hy, 15 * k, 7 * k, 0.65)]);
      // mane: hangs over the near side of the neck, with a wavy outer edge along the crest
      const mw = baby ? 6 : 10, edge = t => [38 - 22 * t, -96 + 30 * t + nod * (1 - t)];
      shape(ctx, '#ececec', () => {
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const t = i / 8, [x, y] = edge(t), w = i % 2 ? 4 : 1; i ? ctx.lineTo(x - w, y - w * 0.5) : ctx.moveTo(x - w, y); }
        for (let i = 8; i >= 0; i--) { const t = i / 8, [x, y] = edge(t), wav = Math.sin(i * 1.3 + sway * 2) * 2;
          ctx.lineTo(x + mw + wav, y + mw * 0.55 + 2); }
        ctx.closePath(); }, 1.8);
      for (let i = 1; i < 8; i += 2) { const t = i / 8, [x, y] = edge(t); strokeLine(ctx, [x + 1, y + 1, x + mw * 0.8, y + mw * 0.5 + 1], 0.9, '#aaa', false); }
      grow(ctx, k, 42, -86 + nod, () => {
        const h = baby ? 0.3 : 1;
        shape(ctx, '#f4f4f4', () => hornPath(ctx, 39, -95 + nod, 44, -93 + nod, 46 + 8 * h, -94 - 24 * h + nod), 1.5);
        if (!baby) for (let i = 1; i <= 4; i++) { const t = i / 5; strokeLine(ctx, [39 + 8 * t, -95 - 22 * t + nod, 44 + 6 * t, -93 - 22 * t + nod], 0.9, '#999', false); }
        shape(ctx, U, () => { ctx.beginPath(); ctx.moveTo(36, -91 + nod); ctx.lineTo(34, -101 + nod); ctx.lineTo(40, -92 + nod); ctx.closePath(); }, 1.8);
        dot(ctx, 47, -87 + nod, baby ? 2.1 : 1.8); strokeLine(ctx, [44, -89 + nod, 46, -90 + nod], 0.9, INK, false);
        dot(ctx, 57, -74 + nod, 1.1, '#888');
      });
      ctx.restore(); ctx.restore();
    },

    // An original take on the "king of serpents" from old legends: a huge serpent with a crown-like crest.
    basilisk(ctx, ph, m, baby) {
      const len = 190, th = baby ? 7.5 : 9.5, amp = m ? 10 : 6;
      const pts = snakePts(ph * (m ? 1 : 0.1) + 0.6, m, len, th, amp, baby ? 26 : 62);
      tube(ctx, pts, '#3a3a3a');
      pts.forEach(([x, y, r], i) => { if (i % 2 === 0 && i < pts.length - 2) strokeLine(ctx, [x - r * 0.4, y - r * 0.5, x, y - r * 0.1, x + r * 0.4, y - r * 0.5], 1, '#6e6e6e', false); });
      pts.forEach(([x, y, r], i) => { if (i % 3 === 0 && i < pts.length - 2) { ell(ctx, x, y + r * 0.5, r * 0.5, r * 0.25); ctx.fillStyle = '#8a8a8a'; ctx.fill(); } });
      const [hx, hy, hr] = pts[pts.length - 1];
      const c = baby ? 0.45 : 1;
      // crown crest: three spikes
      [[-6, -14, -2], [0, -18, 3], [6, -13, 7]].forEach(([bx, ty, tx]) =>
        shape(ctx, '#bdbdbd', () => { ctx.beginPath(); ctx.moveTo(hx + bx - 3, hy - hr * 0.7); ctx.lineTo(hx + tx * c, hy - hr * 0.7 + ty * c); ctx.lineTo(hx + bx + 4, hy - hr * 0.6); ctx.closePath(); }, 1.5));
      shape(ctx, '#3a3a3a', () => ell(ctx, hx + 9, hy, hr * 1.45, hr * 0.95, 0.12));
      ell(ctx, hx + 10, hy - 4, 3.4, 2.4); ctx.fillStyle = WHITE; ctx.fill();
      strokeLine(ctx, [hx + 10, hy - 6, hx + 10, hy - 2], 1, INK, false);
      strokeLine(ctx, [hx + 4, hy + 3, hx + 24, hy + 1], 1.2, '#999', false);
      if (!baby) [hx + 18, hx + 21].forEach(x => strokeLine(ctx, [x, hy + 1.5, x - 0.5, hy + 6], 1.4, WHITE, false));
    },
  });

  // ---------- front and back views for the new animals (2026-10-08, pending approval) ----------
  // A snake seen coming toward you (front) or going away (back): a wiggling body that narrows into the distance.
  function snakeFB(ctx, ph, m, front, len, th, fill, lift) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;                                     // 0 = nearest the camera, 1 = farthest away
      const persp = 1 - t * 0.55, y = -th - t * len * 0.45, x = Math.sin(t * 8 - ph * 1.6) * 11 * (0.3 + t) * (m ? 1 : 0.6);
      const r = th * persp * (front ? (t < 0.08 ? 0.9 : t > 0.6 ? 1 - (t - 0.6) * 1.6 : 1) : (t < 0.4 ? 0.45 + t * 1.4 : 1));
      pts.push([x, y - (front && lift ? lift * Math.max(0, 1 - t / 0.3) : 0), Math.max(1.5, r)]);
    }
    const draw = pts.slice().reverse();                     // far end first, so the near end sits on top
    tube(ctx, draw, fill);
    return pts[0];
  }

  Object.assign(FB, {
    hippo(ctx, ph, m, baby, view) {
      const H = '#a9a9a9', HF = '#7f7f7f', F = view === 'front', bob = bobOf(ph, m) * 0.8, sx = swayOf(ph, m), k = baby ? 1.4 : 1;
      const L = { ph, m, spread: 17, farSpread: 14, nLen: 24, fLen: 24, depth: 7, w: 15, near: H, far: HF, foot: null, lf: baby ? 0.8 : 1 };
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => shape(ctx, H, () => ell(ctx, 0, -42, 33, 24)));
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) grow(ctx, k, 0, -36, () => {
          blob(ctx, H, [() => ell(ctx, 0, -44, 18, 15), () => ell(ctx, 0, -30, 22, 12), () => ell(ctx, -12, -56, 4, 3.5), () => ell(ctx, 12, -56, 4, 3.5),
            () => ell(ctx, -8, -51, 5.5, 5), () => ell(ctx, 8, -51, 5.5, 5)]);
          [-1, 1].forEach(s => { dot(ctx, s * 8, -52, 1.8); dot(ctx, s * 7.4, -52.6, 0.6, WHITE); shape(ctx, H, () => ell(ctx, s * 7, -35, 3.5, 2.6), 1.5); dot(ctx, s * 7, -35.5, 1.2); });
          strokeLine(ctx, [-16, -25, 0, -22, 16, -25], 1.4, INK, false);
        });
        else strokeLine(ctx, [0, -40, 0, -32, 2 * Math.sin(ph) * m, -26], 2.4, H);
      });
    },

    rhino(ctx, ph, m, baby, view) {
      const R = '#b8b8b8', RF = '#8c8c8c', F = view === 'front', bob = bobOf(ph, m), sx = swayOf(ph, m), k = baby ? 1.35 : 1, sw = Math.sin(ph * 0.8) * m;
      const L = { ph, m, spread: 15, farSpread: 12, nLen: 34, fLen: 34, depth: 7, w: 13, near: R, far: RF, foot: null, lf: baby ? 0.78 : 1 };
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => { if (!F) grow(ctx, k, 0, -60, () => shape(ctx, R, () => ell(ctx, 0, -68, 12, 10))); shape(ctx, R, () => ell(ctx, 0, -50, 27, 23)); });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) grow(ctx, k, 0, -50, () => {
          const big = baby ? 0.25 : 1, small = baby ? 0.15 : 1;
          [-1, 1].forEach(s => shape(ctx, R, () => { ctx.beginPath(); ctx.moveTo(s * 8, -62); ctx.lineTo(s * 14, -74); ctx.lineTo(s * 13, -60); ctx.closePath(); }, 1.8));
          shape(ctx, R, () => { ctx.beginPath(); ctx.moveTo(-11, -64); ctx.lineTo(11, -64); ctx.lineTo(8, -34); ctx.quadraticCurveTo(0, -30, -8, -34); ctx.closePath(); });
          shape(ctx, '#e8e8e8', () => hornPath(ctx, -3, -54, 3, -54, 0, -54 - 10 * small), 1.4);
          shape(ctx, '#e8e8e8', () => hornPath(ctx, -5, -40, 5, -40, 0, -40 - 26 * big), 1.6);
          [-1, 1].forEach(s => { dot(ctx, s * 9, -55, 1.6); dot(ctx, s * 3.5, -34, 1.1); });
        });
        else {
          strokeLine(ctx, [0, -56, sw * 2, -46, sw * 3, -40], 2, R);
          shape(ctx, INK, () => ell(ctx, sw * 3, -39, 2, 3.5));
          strokeLine(ctx, [0, -72, 0, -56], 1, '#888', false);
        }
      });
    },

    ostrich(ctx, ph, m, baby, view) {
      const F = view === 'front', bob = bobOf(ph, m) * 1.2, sw = Math.sin(ph) * 2 * m, lf = baby ? 0.55 : 1, L = 68 * lf;
      [-1, 1].forEach((s, i) => {
        const lift = Math.max(0, Math.sin(ph + i * Math.PI)) * 7 * m * lf;
        legFB(ctx, s * 6, -L, -lift - (F ? 0 : 2), 0, baby ? 4 : 4.5, i ? '#b9b9b9' : '#dedede', 'bird');
      });
      ctx.save(); ctx.translate(0, 68 * (1 - lf) + bob);
      if (baby) {
        const body = () => fuzz(ctx, 0, -80, 15, 14);
        if (!F) strokeLine(ctx, [0, -86, sw, -100], 5.5, '#c4c4c4');
        shape(ctx, '#bdbdbd', body);
        clipTo(ctx, body, () => [-6, 0, 6].forEach(x => strokeLine(ctx, [x, -96, x, -64], 2.2, '#6a6a6a', false)));
        if (F) {
          strokeLine(ctx, [0, -86, sw, -98], 5.5, '#c4c4c4');
          shape(ctx, '#c4c4c4', () => fuzz(ctx, sw, -104, 7.5, 7, 12), 2);
          [-1, 1].forEach(s => dot(ctx, sw + s * 3, -105, 1.7));
          shape(ctx, '#999', () => ell(ctx, sw, -100, 3, 2), 1.1);
        } else shape(ctx, '#c4c4c4', () => fuzz(ctx, sw, -104, 7.5, 7, 12), 2);
      } else {
        if (!F) { strokeLine(ctx, [0, -90, sw, -140], 5, '#d8d8d8'); shape(ctx, '#d8d8d8', () => ell(ctx, sw, -143, 6, 5.5), 1.8); }
        shape(ctx, INK, () => fuzz(ctx, 0, -80, 24, 17, 26));
        [-1, 1].forEach(s => shape(ctx, WHITE, () => ell(ctx, s * 19, -78, 6, 9, s * 0.3), 1.6));
        if (!F) shape(ctx, WHITE, () => fuzz(ctx, 0, -84, 11, 8, 12), 1.6);
        if (F) {
          strokeLine(ctx, [0, -90, sw, -140], 5, '#d8d8d8');
          shape(ctx, '#d8d8d8', () => ell(ctx, sw, -143, 6.5, 6), 1.8);
          [-1, 1].forEach(s => { dot(ctx, sw + s * 3.4, -144.5, 1.9); dot(ctx, sw + s * 3.4 - 0.4, -145, 0.6, WHITE); });
          shape(ctx, '#b0b0b0', () => ell(ctx, sw, -139, 4, 2.4), 1.1);
        }
      }
      ctx.restore();
    },

    seahawk(ctx, ph, m, baby, view) {
      const F = view === 'front', D = '#4a4a4a';
      if (baby) {
        const hop = Math.abs(Math.sin(ph * 1.5)) * 4 * m;
        [-3, 3].forEach(x => strokeLine(ctx, [x, -9 - hop, x, -1 - hop], 2.4, '#888'));
        ctx.save(); ctx.translate(0, -hop);
        shape(ctx, '#bdbdbd', () => fuzz(ctx, 0, -20, 12, 13, 16));
        shape(ctx, '#d6d6d6', () => fuzz(ctx, 0, -38, 9, 8.5, 14), 2);
        if (F) { [-1, 1].forEach(s => { strokeLine(ctx, [s * 2, -40, s * 8, -38], 1.8, INK, false); dot(ctx, s * 3.5, -40, 1.6); });
          shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-2, -37); ctx.lineTo(2, -37); ctx.lineTo(0, -32); ctx.closePath(); }, 1); }
        ctx.restore();
        return;
      }
      if (m) {
        // flying toward / away from you: wings stretched out to the sides, flapping
        const lift = 18 + Math.sin(ph * 0.5) * 2, f = Math.sin(ph * 1.6);
        ell(ctx, 0, 0, 16, 3); ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fill();
        ctx.save(); ctx.translate(0, -lift);
        [-1, 1].forEach(s => shape(ctx, F ? D : '#5a5a5a', () => { ctx.beginPath(); ctx.moveTo(s * 4, -26); ctx.lineTo(s * 16, -30 - 9 * f); ctx.lineTo(s * 32, -24 - 16 * f);
          ctx.lineTo(s * 30, -20 - 14 * f); ctx.lineTo(s * 26, -21 - 12 * f); ctx.lineTo(s * 15, -22 - 6 * f); ctx.lineTo(s * 4, -20); ctx.closePath(); }, 1.8));
        if (F) { [-1, 1].forEach(s => shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(s * 5, -23); ctx.lineTo(s * 15, -24 - 6 * f); ctx.lineTo(s * 14, -21 - 5 * f); ctx.lineTo(s * 5, -20.5); ctx.closePath(); }, 1)); }
        shape(ctx, F ? WHITE : D, () => ell(ctx, 0, -23, 6, 8));
        if (!F) shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(-4, -17); ctx.lineTo(4, -17); ctx.lineTo(5, -9); ctx.lineTo(-5, -9); ctx.closePath(); }, 1.6);
        shape(ctx, WHITE, () => ell(ctx, 0, -33, 5.5, 5));
        if (F) { [-1, 1].forEach(s => { strokeLine(ctx, [s * 1.5, -34, s * 5.5, -32], 1.8, INK, false); dot(ctx, s * 2.5, -34, 1.2); });
          shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-1.6, -31.5); ctx.lineTo(1.6, -31.5); ctx.lineTo(0, -27.5); ctx.closePath(); }, 1); }
        else strokeLine(ctx, [-3, -34, 3, -34], 2, INK, false);
        ctx.restore();
        return;
      }
      [-3, 3].forEach(x => { strokeLine(ctx, [x, -14, x, -2], 2.6, '#9a9a9a'); strokeLine(ctx, [x - 2.5, -1, x + 2.5, -1], 1.6, INK, false); });
      if (!F) shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(5, -14); ctx.lineTo(6, -2); ctx.lineTo(-6, -2); ctx.closePath(); }, 1.8);
      shape(ctx, D, () => ell(ctx, 0, -27, 11.5, 16));
      if (F) { ctx.fillStyle = WHITE; ell(ctx, 0, -25, 6.5, 13); ctx.fill(); }
      shape(ctx, WHITE, () => ell(ctx, 0, -45, 7.5, 7));
      if (F) { [-1, 1].forEach(s => { strokeLine(ctx, [s * 2, -46, s * 7, -43], 2, INK, false); dot(ctx, s * 3, -46.5, 1.4); });
        shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-2, -43); ctx.lineTo(2, -43); ctx.lineTo(0, -37.5); ctx.closePath(); }, 1); }
      else strokeLine(ctx, [-5, -45, 5, -45], 2.4, INK, false);
    },

    polarbear(ctx, ph, m, baby, view) {
      const B1 = '#f7f7f7', B2 = '#d2d2d2', F = view === 'front', bob = bobOf(ph, m), sx = swayOf(ph, m), k = baby ? 1.45 : 1;
      const L = { ph, m, spread: 13, farSpread: 11, nLen: 40, fLen: 40, depth: 8, w: 13, near: B1, far: B2, foot: null, lf: baby ? 0.72 : 1 };
      const d = legsFB(ctx, L, 'far');
      const H = (x, y, rx, ry = rx) => { const [a, b, rr] = gp(k, 0, -56)(x, y, rx); return () => ell(ctx, a, b, rr, ry * k); };
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) shape(ctx, B1, () => ell(ctx, 0, -52, 24, 22));
        else blob(ctx, B1, [H(0, -66, 9), H(-7, -74, 3.4), H(7, -74, 3.4), () => ell(ctx, 0, -52, 26, 25)]);
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) {
          blob(ctx, B1, [() => ell(ctx, 0, -62, 11, 9), H(0, -60, 10, 9), H(0, -52, 7, 6), H(-8, -70, 3.4), H(8, -70, 3.4)]);
          grow(ctx, k, 0, -56, () => {
            dot(ctx, 0, -53, 2.6); strokeLine(ctx, [0, -51, 0, -48.5], 1, INK, false);
            [-1, 1].forEach(s => dot(ctx, s * 4.5, -62, 1.8));
          });
        } else shape(ctx, B1, () => ell(ctx, 0, -62, 3.5, 3), 1.8);
      });
    },

    anaconda(ctx, ph, m, baby, view) {
      const F = view === 'front', th = baby ? 6 : 6.5;
      const [hx, hy] = snakeFB(ctx, ph * (m ? 1 : 0.1) + 0.6, m, F, 150, th, '#7a7a7a', 0);
      if (F) {
        shape(ctx, '#7a7a7a', () => ell(ctx, hx, hy - 2, 8, 6));
        [-1, 1].forEach(s => { dot(ctx, hx + s * 4, hy - 4, 1.5); dot(ctx, hx + s * 4 - 0.4, hy - 4.4, 0.5, WHITE); });
        if (m && Math.sin(ph * 3) > 0.6) strokeLine(ctx, [hx, hy + 2, hx, hy + 7, hx - 2, hy + 9], 1.1, INK, false);
      }
    },

    basilisk(ctx, ph, m, baby, view) {
      const F = view === 'front', th = baby ? 7.5 : 9.5, c = baby ? 0.45 : 1;
      const [hx, hy] = snakeFB(ctx, ph * (m ? 1 : 0.1) + 0.6, m, F, 190, th, '#3a3a3a', F ? (baby ? 26 : 58) : 0);
      if (F) {
        [[-8, -16], [0, -21], [8, -16]].forEach(([dx, ty]) =>
          shape(ctx, '#bdbdbd', () => { ctx.beginPath(); ctx.moveTo(hx + dx - 3.5, hy - 6); ctx.lineTo(hx + dx * 1.2 * c, hy - 6 + ty * c); ctx.lineTo(hx + dx + 3.5, hy - 6); ctx.closePath(); }, 1.5));
        shape(ctx, '#3a3a3a', () => ell(ctx, hx, hy, 12, 9));
        [-1, 1].forEach(s => { ell(ctx, hx + s * 5, hy - 2, 3.2, 2.2); ctx.fillStyle = WHITE; ctx.fill(); strokeLine(ctx, [hx + s * 5, hy - 4, hx + s * 5, hy], 1, INK, false); });
        if (!baby) [-1, 1].forEach(s => strokeLine(ctx, [hx + s * 3, hy + 5, hx + s * 2.6, hy + 10], 1.4, WHITE, false));
      } else {
        // going away: the crest shows at the far end
        const [fx, fy] = [Math.sin(1 * 8 - ph * 1.6) * 11 * 1.3 * (m ? 1 : 0.6), -th - 190 * 0.45];
        shape(ctx, '#bdbdbd', () => { ctx.beginPath(); ctx.moveTo(fx - 4, fy - 2); ctx.lineTo(fx, fy - 10 * c); ctx.lineTo(fx + 4, fy - 2); ctx.closePath(); }, 1.3);
      }
    },

    shark(ctx, ph, m, baby, view) {
      const F = view === 'front', G = '#9a9a9a', sw = Math.sin(ph * 1.2) * (m ? 1 : 0.4);
      ell(ctx, 0, 0, 16, 3.5); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.save(); ctx.translate(0, -26 + Math.sin(ph * 0.5) * 1.5);
      if (!F) shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(-2 + sw * 3, -2); ctx.lineTo(sw * 6, -24); ctx.lineTo(2 + sw * 3, -2); ctx.lineTo(sw * 5, 12); ctx.closePath(); });
      shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(0, -32); ctx.lineTo(3, -11); ctx.closePath(); });
      [-1, 1].forEach(s => shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(s * 10, 2); ctx.lineTo(s * 28, 12 + sw * s * 2); ctx.lineTo(s * 10, 7); ctx.closePath(); }));
      const body = () => ell(ctx, 0, 0, 13, 12);
      shape(ctx, G, body);
      clipTo(ctx, body, () => { ctx.fillStyle = WHITE; ell(ctx, 0, 9, 12, 7); ctx.fill(); });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      if (F) { [-1, 1].forEach(s => dot(ctx, s * 8, -2, 1.7)); strokeLine(ctx, [-6, 5, 0, 7, 6, 5], 1.3, INK, false); }
      ctx.restore();
    },

    orca(ctx, ph, m, baby, view) {
      const F = view === 'front', sw = Math.sin(ph * 1.1) * (m ? 1 : 0.4), fin = baby ? 0.5 : 1, patch = baby ? '#dedede' : WHITE;
      ell(ctx, 0, 0, 20, 4); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.save(); ctx.translate(0, -30 + Math.sin(ph * 0.5) * 1.5);
      if (!F) shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-4, 2 + sw * 3); ctx.lineTo(-24, -2 + sw * 6); ctx.quadraticCurveTo(-18, 6 + sw * 5, -2, 7 + sw * 3);
        ctx.lineTo(2, 7 + sw * 3); ctx.quadraticCurveTo(18, 6 + sw * 5, 24, -2 + sw * 6); ctx.lineTo(4, 2 + sw * 3); ctx.closePath(); });
      shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(-3.5, -14); ctx.lineTo(0, -14 - 32 * fin); ctx.lineTo(3.5, -14); ctx.closePath(); });
      [-1, 1].forEach(s => shape(ctx, INK, () => ell(ctx, s * 19, 10 + sw * s * 2, 9, 4, s * 0.5), 1.6));
      const body = () => ell(ctx, 0, 0, 17, 16);
      shape(ctx, INK, body);
      clipTo(ctx, body, () => {
        ctx.fillStyle = patch; ell(ctx, 0, 12, 10, 7); ctx.fill();
        if (F) [-1, 1].forEach(s => { ell(ctx, s * 9, -5, 4.5, 2.6, s * -0.3); ctx.fill(); });
        else { ctx.fillStyle = '#9a9a9a'; ell(ctx, 0, -12, 9, 4); ctx.fill(); }
      });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      ctx.restore();
    },

    triceratops(ctx, ph, m, baby, view) {
      const T = '#c2c2c2', TF = '#959595', FR = '#9d9d9d', F = view === 'front', bob = bobOf(ph, m) * 0.8, sx = swayOf(ph, m), k = baby ? 1.4 : 1, sw = Math.sin(ph * 0.8) * m;
      const L = { ph, m, spread: 18, farSpread: 15, nLen: 36, fLen: 34, depth: 8, w: 15, near: T, far: TF, foot: null, lf: baby ? 0.75 : 1 };
      const d = legsFB(ctx, L, 'far');
      bodyLayer(ctx, sx, d + bob, () => {
        if (!F) grow(ctx, k, 0, -60, () => shape(ctx, FR, () => ell(ctx, 0, -76, 24 * (baby ? 0.6 : 1), 16 * (baby ? 0.6 : 1))));
        shape(ctx, T, () => ell(ctx, 0, -52, 30, 25));
      });
      legsFB(ctx, L, 'near');
      bodyLayer(ctx, sx, d + bob, () => {
        if (F) grow(ctx, k, 0, -52, () => {
          const fs = baby ? 0.6 : 1, h = baby ? 0.25 : 1;
          shape(ctx, FR, () => ell(ctx, 0, -66, 28 * fs, 20 * fs));
          for (let i = 0; i < 11; i++) { const a = Math.PI + i * Math.PI / 10; dot(ctx, Math.cos(a) * 25 * fs, -66 + Math.sin(a) * 17 * fs, 1.6, '#555'); }
          shape(ctx, T, () => ell(ctx, 0, -52, 13, 15));
          [-1, 1].forEach(s => shape(ctx, '#ededed', () => hornPath(ctx, s * 5, -60, s * 9, -58, s * (8 + 6 * h), -60 - 22 * h), 1.6));
          shape(ctx, '#ededed', () => hornPath(ctx, -2.5, -46, 2.5, -46, 0, -46 - 8 * h), 1.3);
          shape(ctx, '#777', () => { ctx.beginPath(); ctx.moveTo(-5, -42); ctx.lineTo(5, -42); ctx.lineTo(0, -34); ctx.closePath(); }, 1.3);
          [-1, 1].forEach(s => { dot(ctx, s * 7, -55, 1.8); dot(ctx, s * 7 - 0.5, -55.5, 0.6, WHITE); });
        });
        else blob(ctx, T, [() => { ctx.beginPath(); ctx.moveTo(-12, -54); ctx.quadraticCurveTo(sw * 6, -34, sw * 10, -20); ctx.quadraticCurveTo(sw * 4, -30, 12, -54); ctx.closePath(); }]);
      });
    },

    unicorn(ctx, ph, m, baby, view) {
      const F = view === 'front', U = WHITE, UF = '#d6d6d6', bob = bobOf(ph, m), sx = swayOf(ph, m), nod = Math.sin(ph) * 2 * m, k = baby ? 1.35 : 1, sway = Math.sin(ph * 0.7);
      const L = { ph, m, spread: 11, farSpread: 9, nLen: 48, fLen: 48, depth: 7, w: 9, near: U, far: UF, foot: 'hoof', lf: baby ? 0.85 : 1 };
      const body = () => ell(ctx, 0, -56, 21, 16);
      const neck = () => { ctx.beginPath(); ctx.moveTo(-8, -62); ctx.lineTo(8, -62); ctx.lineTo(5.5, -82 + nod); ctx.lineTo(-5.5, -82 + nod); ctx.closePath(); };
      const mane = () => { const w = baby ? 4 : 7;
        shape(ctx, '#ececec', () => { ctx.beginPath(); ctx.moveTo(-5, -92 + nod); for (let i = 0; i <= 6; i++) ctx.lineTo(-6 - w - (i % 2) * 3 + sway, -90 + i * 5 + nod * (1 - i / 6)); ctx.lineTo(-5, -62); ctx.closePath(); }, 1.6); };
      const head = () => grow(ctx, k, 0, -80 + nod, () => {
        const hy = -90 + nod, h = baby ? 0.3 : 1;
        [-1, 1].forEach(s => shape(ctx, U, () => { ctx.beginPath(); ctx.moveTo(s * 2.5, hy - 9); ctx.lineTo(s * 7.5, hy - 18); ctx.lineTo(s * 7, hy - 8); ctx.closePath(); }));
        if (F) {
          shape(ctx, U, () => ell(ctx, 0, hy, 7.5, 13));
          shape(ctx, '#f4f4f4', () => hornPath(ctx, -2.5, hy - 11, 2.5, hy - 11, 0, hy - 11 - 22 * h), 1.4);
          if (!baby) for (let i = 1; i <= 4; i++) strokeLine(ctx, [-1.8 + i * 0.3, hy - 11 - i * 4.2, 1.8 - i * 0.3, hy - 12 - i * 4.2], 0.8, '#999', false);
          shape(ctx, '#ececec', () => ell(ctx, 0, hy - 9, 5, 3), 1.2);
          [-1, 1].forEach(s => { dot(ctx, s * 4, hy - 2, baby ? 1.7 : 1.4); dot(ctx, s * 2.4, hy + 10, 1, '#888'); });
        } else {
          shape(ctx, U, () => ell(ctx, 0, hy - 2, 6.5, 8));
          shape(ctx, '#f4f4f4', () => hornPath(ctx, -2, hy - 9, 2, hy - 9, 0, hy - 9 - 16 * h), 1.3);
        }
      });
      const d = legsFB(ctx, L, 'far');
      if (F) {
        bodyLayer(ctx, sx, d + bob, () => shape(ctx, U, body));
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => { shape(ctx, U, neck); mane(); head(); });
      } else {
        bodyLayer(ctx, sx, d + bob, () => { shape(ctx, U, neck); mane(); head(); shape(ctx, U, body); });
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => [0, 3, -3].forEach((o, i) => strokeLine(ctx, [o * 0.3, -60, o + sway * 3, -48, o * 1.5 + sway * 5, -30 + (baby ? 10 : 0)], 2.6, i === 0 ? U : '#e6e6e6')));
      }
    },
  });

  // ---------- aviary birds (2026-10-08, pending approval) ----------
  // One drawing routine for every aviary bird; each species gets its own colors, beak, tail, and extras.
  const BIRD = {
    parrot:  { k: 1.0,  body: '#9a9a9a', wing: '#4f4f4f', head: '#9a9a9a', tail: '#6f6f6f', tailLen: 30, beak: 'hook', beakFill: '#ececec',
               face: true, chick: '#c4c4c4' },
    toucan:  { k: 0.95, body: '#262626', wing: '#1a1a1a', head: '#262626', tail: '#1a1a1a', tailLen: 13, beak: 'toucan', beakFill: '#e6e6e6',
               throat: true, chick: '#555555' },
    owl:     { k: 1.1,  body: '#8f8f8f', wing: '#6a6a6a', head: '#8f8f8f', tail: '#6a6a6a', tailLen: 7, beak: 'small', beakFill: '#333333',
               owl: true, chick: '#e2e2e2' },
    eagle:   { k: 1.25, body: '#3a3a3a', wing: '#2a2a2a', head: '#ffffff', tail: '#ffffff', tailLen: 14, beak: 'hook', beakFill: '#dcdcdc',
               chick: '#a8a8a8' },
  };
  function birdBeak(ctx, c, x, y, s = 1) {
    if (c.beak === 'toucan') {
      shape(ctx, c.beakFill, () => { ctx.beginPath(); ctx.moveTo(x - 1, y - 4 * s); ctx.quadraticCurveTo(x + 18 * s, y - 7 * s, x + 23 * s, y + 3 * s);
        ctx.quadraticCurveTo(x + 13 * s, y + 3 * s, x - 1, y + 4 * s); ctx.closePath(); }, 1.6);
      shape(ctx, INK, () => { ctx.beginPath(); ctx.moveTo(x + 17 * s, y - 2 * s); ctx.quadraticCurveTo(x + 21 * s, y - 1 * s, x + 23 * s, y + 3 * s); ctx.lineTo(x + 17 * s, y + 3 * s); ctx.closePath(); }, 1);
      strokeLine(ctx, [x, y, x + 20 * s, y + 1 * s], 0.9, '#777', false);
    } else if (c.beak === 'small') {
      shape(ctx, c.beakFill, () => { ctx.beginPath(); ctx.moveTo(x - 1, y - 2); ctx.quadraticCurveTo(x + 4, y - 1, x + 2.5, y + 3.5); ctx.lineTo(x - 1, y + 1); ctx.closePath(); }, 1);
    } else {
      shape(ctx, c.beakFill, () => { ctx.beginPath(); ctx.moveTo(x - 1, y - 3 * s); ctx.quadraticCurveTo(x + 7 * s, y - 3 * s, x + 6 * s, y + 4.5 * s); ctx.lineTo(x + 1, y + 1.5 * s); ctx.closePath(); }, 1.2);
    }
  }
  // Big round owl eyes on a pale facial disc, or a plain eye for everyone else.
  function birdEye(ctx, c, x, y) {
    if (c.owl) { shape(ctx, WHITE, () => ell(ctx, x, y, 3, 3), 1.2); dot(ctx, x + 0.4, y, 1.7); dot(ctx, x, y - 0.6, 0.5, WHITE); }
    else if (c.face) { shape(ctx, WHITE, () => ell(ctx, x - 1, y + 1, 4.5, 4), 1); dot(ctx, x, y, 1.4); }
    else { dot(ctx, x, y, 1.5); dot(ctx, x - 0.4, y - 0.4, 0.5, WHITE); }
  }
  function birdSide(ctx, ph, m, baby, id) {
    const c = BIRD[id];
    ctx.save(); ctx.scale(c.k, c.k);
    if (baby) {
      const hop = Math.abs(Math.sin(ph * 1.5)) * 4 * m;
      [-3, 3].forEach(x => strokeLine(ctx, [x, -9 - hop, x + 1, -1 - hop], 2.4, '#888'));
      ctx.save(); ctx.translate(0, -hop);
      shape(ctx, c.chick, () => fuzz(ctx, 0, -20, 12, 13, 16));
      shape(ctx, c.chick, () => fuzz(ctx, 4, -37, c.owl ? 10 : 8.5, c.owl ? 9 : 8, 14), 2);
      if (c.owl) [-1, 1].forEach(s => shape(ctx, c.chick, () => { ctx.beginPath(); ctx.moveTo(4 + s * 4, -44); ctx.lineTo(4 + s * 6, -49); ctx.lineTo(4 + s * 7, -43); ctx.closePath(); }, 1.2));
      birdEye(ctx, c, 7, -39);
      if (c.beak === 'toucan') birdBeak(ctx, { ...c, beak: 'hook' }, 11, -37, 0.8); else birdBeak(ctx, c, 11, -37, 0.7);
      ctx.restore(); ctx.restore();
      return;
    }
    if (m) {
      // flying low, wings beating
      const lift = 18 + Math.sin(ph * 0.5) * 2, f = Math.sin(ph * 1.6);
      ell(ctx, 0, 0, 14, 3); ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fill();
      ctx.save(); ctx.translate(0, -lift);
      const wing = (fill, k) => {
        const pts = [[8, -25], [1, -25 - 13 * k], [-14, -25 - 31 * k], [-19, -25 - 27 * k], [-17, -25 - 21 * k], [-20, -25 - 17 * k],
          [-14, -25 - 12 * k], [-15, -25 - 7 * k], [-8, -24 - 3 * k], [-6, -23]];
        shape(ctx, fill, () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }, 1.8);
      };
      wing('#777777', f * 0.6 - 0.15);
      const tl = c.tailLen;
      shape(ctx, c.tail, () => { ctx.beginPath(); ctx.moveTo(-12, -25); ctx.lineTo(-14 - tl, -25 - tl * 0.08); ctx.lineTo(-14 - tl, -21); ctx.lineTo(-12, -20); ctx.closePath(); }, 1.6);
      shape(ctx, c.body, () => ell(ctx, 0, -22, 16, 6.5));
      if (c.throat) { ctx.fillStyle = WHITE; ell(ctx, 13, -21, 4, 3.5); ctx.fill(); }
      strokeLine(ctx, [2, -16, 4, -10, 7, -9], 1.6, '#999');
      shape(ctx, c.head, () => ell(ctx, 17, -25, c.owl ? 7.5 : 6.5, c.owl ? 7 : 5.5));
      if (c.owl) [-1, 1].forEach(s => shape(ctx, c.head, () => { ctx.beginPath(); ctx.moveTo(15 + s * 2, -30); ctx.lineTo(14 + s * 3, -36); ctx.lineTo(18 + s * 2, -31); ctx.closePath(); }, 1.2));
      birdEye(ctx, c, 19.5, -26.5);
      birdBeak(ctx, c, 23, -25, 0.9);
      wing(c.wing, f);
      ctx.restore(); ctx.restore();
      return;
    }
    // perched
    [-3, 4].forEach(x => { strokeLine(ctx, [x, -14, x, -2], 2.6, '#9a9a9a'); strokeLine(ctx, [x - 2, -1, x + 4, -1], 1.6, INK, false); });
    const tl = c.tailLen;
    shape(ctx, c.tail, () => { ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-8 - tl * 0.6, -18 + tl * 0.55); ctx.lineTo(-4 - tl * 0.6, -16 + tl * 0.6); ctx.lineTo(1, -16); ctx.closePath(); }, 1.6);
    const body = () => ell(ctx, 0, -28, c.owl ? 12 : 11, 17, c.owl ? -0.1 : -0.3);
    shape(ctx, c.body, body);
    clipTo(ctx, body, () => {
      if (c.throat) { ctx.fillStyle = WHITE; ell(ctx, 9, -38, 6, 7); ctx.fill(); }
      if (c.owl) { ctx.strokeStyle = '#555'; ctx.lineWidth = 1; for (let y = -38; y < -14; y += 4) { ctx.beginPath(); ctx.moveTo(2, y); ctx.lineTo(12, y + 1); ctx.stroke(); } }
      ctx.fillStyle = c.wing; ell(ctx, -3, -27, 8, 14, c.owl ? -0.1 : -0.35); ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1; [-22, -18, -14].forEach(y => { ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(0, y + 3); ctx.stroke(); });
    });
    ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
    if (c.owl) {
      shape(ctx, c.head, () => ell(ctx, 3, -46, 10, 9));
      [-1, 1].forEach(s => shape(ctx, c.head, () => { ctx.beginPath(); ctx.moveTo(3 + s * 4, -53); ctx.lineTo(3 + s * 7, -61); ctx.lineTo(3 + s * 8.5, -51); ctx.closePath(); }, 1.4));
      shape(ctx, '#cfcfcf', () => ell(ctx, 7, -46, 6, 6.5), 1.2);
      birdEye(ctx, c, 8, -47.5);
      birdBeak(ctx, c, 11.5, -44.5);
    } else {
      shape(ctx, c.head, () => ell(ctx, 5, -46, 8, 7));
      birdEye(ctx, c, 7.5, -47.5);
      birdBeak(ctx, c, 12, -46, c.beak === 'toucan' ? 0.9 : 1);
    }
    ctx.restore();
  }
  function birdFB(ctx, ph, m, baby, view, id) {
    const c = BIRD[id], F = view === 'front';
    ctx.save(); ctx.scale(c.k, c.k);
    if (baby) {
      const hop = Math.abs(Math.sin(ph * 1.5)) * 4 * m;
      [-3, 3].forEach(x => strokeLine(ctx, [x, -9 - hop, x, -1 - hop], 2.4, '#888'));
      ctx.save(); ctx.translate(0, -hop);
      shape(ctx, c.chick, () => fuzz(ctx, 0, -20, 12, 13, 16));
      shape(ctx, c.chick, () => fuzz(ctx, 0, -37, c.owl ? 10 : 9, c.owl ? 9 : 8.5, 14), 2);
      if (F) {
        [-1, 1].forEach(s => birdEye(ctx, c, s * 3.5, -39));
        shape(ctx, c.beak === 'small' ? '#333' : c.beakFill, () => { ctx.beginPath(); ctx.moveTo(-2, -36); ctx.lineTo(2, -36); ctx.lineTo(0, -31.5); ctx.closePath(); }, 1);
      }
      ctx.restore(); ctx.restore();
      return;
    }
    if (m) {
      const lift = 18 + Math.sin(ph * 0.5) * 2, f = Math.sin(ph * 1.6);
      ell(ctx, 0, 0, 16, 3); ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fill();
      ctx.save(); ctx.translate(0, -lift);
      [-1, 1].forEach(s => shape(ctx, c.wing, () => { ctx.beginPath(); ctx.moveTo(s * 4, -26); ctx.lineTo(s * 16, -30 - 9 * f); ctx.lineTo(s * 32, -24 - 16 * f);
        ctx.lineTo(s * 30, -20 - 14 * f); ctx.lineTo(s * 26, -21 - 12 * f); ctx.lineTo(s * 15, -22 - 6 * f); ctx.lineTo(s * 4, -20); ctx.closePath(); }, 1.8));
      if (!F) shape(ctx, c.tail, () => { ctx.beginPath(); ctx.moveTo(-4, -17); ctx.lineTo(4, -17); ctx.lineTo(4 + c.tailLen * 0.1, -16 + c.tailLen * 0.4); ctx.lineTo(-4 - c.tailLen * 0.1, -16 + c.tailLen * 0.4); ctx.closePath(); }, 1.6);
      shape(ctx, c.body, () => ell(ctx, 0, -23, 6, 8));
      shape(ctx, c.head, () => ell(ctx, 0, -33, c.owl ? 7 : 5.5, c.owl ? 6.5 : 5));
      if (F) {
        [-1, 1].forEach(s => birdEye(ctx, c, s * (c.owl ? 3 : 2.5), -34));
        if (c.beak === 'toucan') shape(ctx, c.beakFill, () => ell(ctx, 0, -27, 3, 6), 1.3);
        else shape(ctx, c.beakFill, () => { ctx.beginPath(); ctx.moveTo(-1.6, -31.5); ctx.lineTo(1.6, -31.5); ctx.lineTo(0, -27.5); ctx.closePath(); }, 1);
      }
      ctx.restore(); ctx.restore();
      return;
    }
    [-3, 3].forEach(x => { strokeLine(ctx, [x, -14, x, -2], 2.6, '#9a9a9a'); strokeLine(ctx, [x - 2.5, -1, x + 2.5, -1], 1.6, INK, false); });
    if (!F) shape(ctx, c.tail, () => { ctx.beginPath(); ctx.moveTo(-5, -16); ctx.lineTo(5, -16); ctx.lineTo(4 + c.tailLen * 0.08, -16 + c.tailLen * 0.55); ctx.lineTo(-4 - c.tailLen * 0.08, -16 + c.tailLen * 0.55); ctx.closePath(); }, 1.8);
    [-1, 1].forEach(s => shape(ctx, c.wing, () => ell(ctx, s * 9.5, -26, 4.5, 13, s * 0.12)));
    const body = () => ell(ctx, 0, -28, c.owl ? 12.5 : 11, 17);
    shape(ctx, F ? c.body : c.wing, body);
    if (F) clipTo(ctx, body, () => {
      if (c.throat) { ctx.fillStyle = WHITE; ell(ctx, 0, -38, 8, 7); ctx.fill(); }
      if (c.owl) { ctx.strokeStyle = '#555'; ctx.lineWidth = 1; for (let y = -38; y < -14; y += 4) { ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(8, y); ctx.stroke(); } }
    });
    ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
    const hr = c.owl ? 10 : 7.5;
    if (c.owl) [-1, 1].forEach(s => shape(ctx, c.head, () => { ctx.beginPath(); ctx.moveTo(s * 4, -53); ctx.lineTo(s * 8, -61); ctx.lineTo(s * 9, -50); ctx.closePath(); }, 1.4));
    shape(ctx, c.head, () => ell(ctx, 0, -46, hr, hr * 0.92));
    if (F) {
      if (c.owl) [-1, 1].forEach(s => shape(ctx, '#cfcfcf', () => ell(ctx, s * 4.5, -46, 4.5, 5), 1));
      [-1, 1].forEach(s => birdEye(ctx, c, s * (c.owl ? 4.5 : 3), -47));
      if (c.beak === 'toucan') { shape(ctx, c.beakFill, () => ell(ctx, 0, -38, 4, 8), 1.4); shape(ctx, INK, () => ell(ctx, 0, -32, 2.6, 2.4), 1); }
      else shape(ctx, c.beakFill, () => { ctx.beginPath(); ctx.moveTo(-2.2, -44); ctx.lineTo(2.2, -44); ctx.lineTo(0, -38.5); ctx.closePath(); }, 1.1);
    }
    ctx.restore();
  }
  Object.keys(BIRD).forEach(id => {
    ART[id] = (ctx, ph, m, baby) => birdSide(ctx, ph, m, baby, id);
    FB[id] = (ctx, ph, m, baby, view) => birdFB(ctx, ph, m, baby, view, id);
  });

  // ---------- dolphin, dinosaurs, and the dragon (2026-10-09) ----------
  // Each gets its own grays so the color palettes can tell the parts apart.
  // Theropod leg: hip -> knee (bends forward) -> ankle (raised, behind the foot) -> toes on the ground.
  function theroLeg(ctx, hx, hy, ph, m, o) {
    const { stride, lift, l1, l2, met, w, fill, sickle } = o;
    const s = Math.sin(ph), c = Math.cos(ph);
    const fx = hx + 6 + stride * s * m, fy = -lift * Math.max(0, c) * m;
    const ax = fx - met * 0.3, ay = fy - met;
    const dx = ax - hx, dy = ay - hy, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5);
    const a = Math.atan2(dy, dx), b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const kx = hx + Math.cos(a - b) * l1, ky = hy + Math.sin(a - b) * l1;
    const seg = [[hx, hy, kx, ky, w], [kx, ky, ax, ay, w * 0.62], [ax, ay, fx, fy, w * 0.42]];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    seg.forEach(([x1, y1, x2, y2, ww]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = ww + OUT * 2; ctx.strokeStyle = INK; ctx.stroke(); });
    // a big drumstick thigh muscle over the top of the leg
    shape(ctx, fill, () => ell(ctx, (hx + kx) / 2 - 2, (hy + ky) / 2 - 3, l1 * 0.62, w * 1.05, Math.atan2(ky - hy, kx - hx)));
    seg.slice(1).forEach(([x1, y1, x2, y2, ww]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = ww; ctx.strokeStyle = fill; ctx.stroke(); });
    // toes and claws
    const tw = Math.max(2, w * 0.28);
    [[11, 0], [8, -1.5]].forEach(([len, dy2]) => strokeLine(ctx, [fx, fy + dy2, fx + len, fy + dy2 + 0.5], tw, fill));
    strokeLine(ctx, [fx + 11, fy - 0.5, fx + 14, fy + 0.5], 1.4, INK, false);
    if (sickle) { ctx.beginPath(); ctx.moveTo(fx + 2, fy - 2); ctx.quadraticCurveTo(fx + 4, fy - 9, fx + 9, fy - 7); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  // A tapering tail as a closed shape from root (x1, y1) with half-thickness r1 to a point.
  function tailPath(ctx, x1, y1, r1, cx, cy, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1 - r1); ctx.quadraticCurveTo(cx, cy - r1 * 0.5, x2, y2); ctx.quadraticCurveTo(cx, cy + r1 * 0.6, x1, y1 + r1); ctx.closePath();
  }
  // Dragon wing in side view, like a bat's: arm bone to the wrist, three long finger bones, and the skin between them.
  // spread 0 = folded along the back, 1 = open; flap (-1..1) sweeps an open wing from down-and-back up to overhead.
  function dragonWing(ctx, sx, sy, spread, flap, fill, bone, k = 1) {
    const lerp = (a, b, t) => a + (b - a) * t, P = (x, y) => [sx + x * k, sy + y * k];
    // folded pose
    const fE = P(-4, -16), fW = P(-26, -30), fT = [P(-58, -6), P(-50, 4), P(-36, 8)], fB = P(-40, 8);
    // open pose: the whole wing swings around the shoulder with the beat
    const a = lerp(-1.75, -3.45, (1 - flap) / 2), L1 = 44, L2 = 58;
    const dir = (ang, len) => [sx + Math.cos(ang) * len * k, sy + Math.sin(ang) * len * k];
    const oE = dir(a + 0.35, L1 * 0.5), oW = dir(a, L1);
    // finger bones fan out from the wrist, turning back toward the tail
    const oT = [0.45, 0.95, 1.45].map((d, i) => [oW[0] + Math.cos(a - d) * L2 * (1 - i * 0.2) * k, oW[1] + Math.sin(a - d) * L2 * (1 - i * 0.2) * k]);
    const oB = P(-40, 6);
    const mix = (p1, p2) => [lerp(p1[0], p2[0], spread), lerp(p1[1], p2[1], spread)];
    const E = mix(fE, oE), W = mix(fW, oW), Tp = fT.map((t, i) => mix(t, oT[i])), B = mix(fB, oB);
    const edge = [W, ...Tp, B];
    shape(ctx, fill, () => {
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(E[0], E[1]); ctx.lineTo(W[0], W[1]); ctx.lineTo(Tp[0][0], Tp[0][1]);
      // scalloped trailing edge between the finger tips
      for (let i = 1; i < edge.length - 1; i++) { const [x1, y1] = edge[i], [x2, y2] = edge[i + 1], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const nx = (mx - W[0]) * 0.18, ny = (my - W[1]) * 0.18; ctx.quadraticCurveTo(mx - nx, my - ny, x2, y2); }
      ctx.closePath(); }, 1.8);
    Tp.forEach(([x2, y2]) => strokeLine(ctx, [W[0], W[1], x2, y2], 1.4, bone, false));
    strokeLine(ctx, [sx, sy, E[0], E[1], W[0], W[1]], 3.2, bone);
    shape(ctx, bone, () => { ctx.beginPath(); ctx.moveTo(W[0] - 1, W[1] + 1); ctx.lineTo(W[0] + 3 * k, W[1] - 7 * k); ctx.lineTo(W[0] + 3 * k, W[1] + 1); ctx.closePath(); }, 1.1);
  }
  // Ridge of spikes along a list of points (each [x, y, size]).
  function spikes(ctx, pts, fill) {
    pts.forEach(([x, y, s]) => shape(ctx, fill, () => { ctx.beginPath(); ctx.moveTo(x - s * 0.6, y + 1); ctx.lineTo(x - s * 0.15, y - s); ctx.lineTo(x + s * 0.6, y + 1); ctx.closePath(); }, 1.4));
  }

  Object.assign(ART, {
    dolphin(ctx, ph, m, baby) {
      const D = '#8e8e8f', DB = '#ececed', sw = Math.sin(ph * 1.2) * (m ? 1 : 0.4), fin = baby ? 0.6 : 1;
      ell(ctx, 0, 0, 36, 4.5); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.save(); ctx.translate(0, -26 + Math.sin(ph * 0.5) * 1.5);
      ctx.save(); ctx.translate(-44, 0); ctx.rotate(sw * 0.28);
      shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(4, -3); ctx.quadraticCurveTo(-6, -5, -17, -13); ctx.quadraticCurveTo(-13, -4, -15, 0); ctx.quadraticCurveTo(-13, 5, -17, 11); ctx.quadraticCurveTo(-6, 5, 4, 3); ctx.closePath(); });
      ctx.restore();
      shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(10, -14); ctx.quadraticCurveTo(4, -26 * fin, -8, -38 * fin); ctx.quadraticCurveTo(-6, -24 * fin, -16, -12); ctx.closePath(); });
      const body = () => { ctx.beginPath(); ctx.moveTo(68, 1); ctx.quadraticCurveTo(62, -3, 52, -5); ctx.quadraticCurveTo(48, -16, 30, -16);
        ctx.quadraticCurveTo(-8, -16, -44, -3); ctx.lineTo(-44, 3); ctx.quadraticCurveTo(-12, 13, 24, 11); ctx.quadraticCurveTo(46, 9, 54, 4); ctx.quadraticCurveTo(62, 4, 68, 1); ctx.closePath(); };
      shape(ctx, D, body);
      clipTo(ctx, body, () => { ctx.fillStyle = DB; ell(ctx, 16, 11, 44, 7.5); ctx.fill(); ell(ctx, 60, 3, 10, 3); ctx.fill(); });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(32, 7); ctx.quadraticCurveTo(26, 20 + sw * 2, 16, 21 + sw * 2); ctx.quadraticCurveTo(20, 13, 22, 8); ctx.closePath(); }, 1.6);
      dot(ctx, 44, -6, baby ? 2 : 1.7); dot(ctx, 44.5, -6.6, 0.6, WHITE);
      strokeLine(ctx, [52, 1.5, 59, 3.2, 67, 1.2], 1.1, INK, false);
      strokeLine(ctx, [36, -14, 40, -13], 1, '#5f5f60', false);
      ctx.restore();
    },

    trex(ctx, ph, m, baby, o = {}) {
      const R = '#a3a3a4', RF = '#7c7c7d', RB = '#dadadb', RS = '#6e6e6f';
      const gape = Math.max(o.roar || 0, 0), bob = Math.sin(ph * 2) * 2 * m, sway = Math.sin(ph * 0.6), nod = Math.sin(ph) * 2 * m;
      const lf = baby ? 0.85 : 1, hipY = -92 * lf;
      const leg = (off, fill) => theroLeg(ctx, -10, hipY + bob * 0.5, ph + off, m, { stride: 26, lift: 10, l1: 46 * lf, l2: 44 * lf, met: 24 * lf, w: 15, fill });
      leg(Math.PI, RF);
      ctx.save(); ctx.translate(0, bob + (baby ? 14 : 0));
      // tail, body and neck as one silhouette
      const tail = () => tailPath(ctx, -40, -100, 18, -100, -104 + sway * 4, -158, -86 + sway * 10);
      const body = () => ell(ctx, 0, -100, 50, 27, -0.08);
      const neck = () => { ctx.beginPath(); ctx.moveTo(26, -118); ctx.quadraticCurveTo(52, -132, 66, -126 + nod); ctx.lineTo(72, -108 + nod); ctx.quadraticCurveTo(52, -98, 36, -86); ctx.closePath(); };
      blob(ctx, R, [tail, body, neck]);
      clipTo(ctx, () => { ctx.beginPath(); body(); }, () => { ctx.fillStyle = RB; ell(ctx, 6, -78, 44, 10, -0.08); ctx.fill(); });
      [[-50, -112], [-30, -122], [-8, -126], [14, -124], [-76, -106], [-100, -100]].forEach(([x, y]) => strokeLine(ctx, [x, y, x + 5, y + 10], 2, RS, false));
      // tiny arms
      strokeLine(ctx, [40, -92, 50, -82, 58, -86], 4.5, R);
      [[58, -86], [57, -84]].forEach(([x, y], i) => strokeLine(ctx, [x, y, x + 4, y + 3 + i * 2], 1.3, INK, false));
      // head
      const k = baby ? 1.45 : 1;
      grow(ctx, k, 66, -122 + nod, () => {
        const y = nod;
        ctx.save(); ctx.translate(66, -110 + y); ctx.rotate(gape * 0.5);
        shape(ctx, R, () => { ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(36, 2); ctx.quadraticCurveTo(40, 5, 36, 8); ctx.lineTo(0, 9); ctx.closePath(); });
        for (let t = 0; t < 5; t++) shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(8 + t * 6, 2); ctx.lineTo(10 + t * 6, -2.5); ctx.lineTo(12 + t * 6, 2.5); ctx.closePath(); }, 0.8);
        ctx.restore();
        const skull = () => { ctx.beginPath(); ctx.moveTo(56, -126 + y); ctx.quadraticCurveTo(70, -142 + y, 94, -136 + y); ctx.quadraticCurveTo(108, -132 + y, 110, -120 + y);
          ctx.lineTo(106, -112 + y); ctx.lineTo(64, -110 + y); ctx.quadraticCurveTo(56, -114 + y, 56, -126 + y); ctx.closePath(); };
        shape(ctx, R, skull);
        if (!baby || gape) for (let t = 0; t < 6; t++) shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(72 + t * 6, -112 + y); ctx.lineTo(74 + t * 6, -106.5 + y); ctx.lineTo(76 + t * 6, -112 + y); ctx.closePath(); }, 0.8);
        strokeLine(ctx, [74, -134 + y, 90, -133 + y], 2, RS, false);
        shape(ctx, WHITE, () => ell(ctx, 80, -127 + y, 3.4, 2.8), 1.2); dot(ctx, 80.8, -127 + y, 1.7);
        dot(ctx, 104, -127 + y, 1.2);
        strokeLine(ctx, [66, -116 + y, 102, -115 + y], 1, '#555', false);
      });
      ctx.restore();
      leg(0, R);
    },

    raptor(ctx, ph, m, baby, o = {}) {
      const V = '#b0b0b1', VF = '#858586', VS = '#69696a', VW = '#8f8f90', VB = '#e3e3e4';
      const bob = Math.sin(ph * 2) * 1.6 * m, sway = Math.sin(ph * 0.8), nod = Math.sin(ph) * 2.2 * m, lf = baby ? 0.85 : 1;
      const leg = (off, fill) => theroLeg(ctx, -6, -48 * lf + bob * 0.5, ph + off, m, { stride: 16, lift: 7, l1: 24 * lf, l2: 22 * lf, met: 14 * lf, w: 8, fill, sickle: !baby });
      leg(Math.PI, VF);
      ctx.save(); ctx.translate(0, bob + (baby ? 6 : 0));
      // stiff tail ending in a fan of feathers
      const tl = baby ? 0.6 : 1;
      [-6, 0, 6].forEach((a, i) => shape(ctx, VW, () => { ctx.beginPath(); ctx.moveTo(-60 * tl - 14, -56 + sway * 2); ctx.lineTo(-60 * tl - 34, -56 + a * 1.4 + sway * 3); ctx.lineTo(-60 * tl - 30, -52 + a * 1.4 + sway * 3); ctx.closePath(); }, 1.3));
      const tail = () => tailPath(ctx, -18, -54, 8, -48 * tl, -58 + sway * 1.5, -60 * tl - 16, -56 + sway * 2);
      const body = () => ell(ctx, 0, -52, 24, 13, -0.1);
      const neck = () => { ctx.beginPath(); ctx.moveTo(14, -60); ctx.quadraticCurveTo(26, -64, 30, -76 + nod); ctx.lineTo(38, -72 + nod); ctx.quadraticCurveTo(34, -58, 20, -46); ctx.closePath(); };
      blob(ctx, V, [tail, body, neck]);
      clipTo(ctx, () => { ctx.beginPath(); body(); }, () => { ctx.fillStyle = VB; ell(ctx, 4, -41, 20, 6); ctx.fill(); });
      [[-12, -62], [-4, -64], [4, -63], [-32, -58]].forEach(([x, y]) => strokeLine(ctx, [x, y, x + 3, y + 7], 1.6, VS, false));
      // feathered arm folded like a wing
      shape(ctx, VW, () => { ctx.beginPath(); ctx.moveTo(14, -56); ctx.quadraticCurveTo(10, -44, -2, -38); ctx.lineTo(-12, -40); ctx.lineTo(-6, -36); ctx.lineTo(-14, -34); ctx.quadraticCurveTo(2, -36, 18, -50); ctx.closePath(); }, 1.6);
      strokeLine(ctx, [18, -50, 22, -44, 25, -46], 2, INK, false);
      // head: long low snout, a few teeth, a little feather crest
      const k = baby ? 1.45 : 1;
      grow(ctx, k, 32, -74 + nod, () => {
        const y = nod, gape = o.roar || 0;
        ctx.save(); ctx.translate(36, -70 + y); ctx.rotate(gape * 0.4);
        shape(ctx, V, () => { ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(20, 1); ctx.lineTo(18, 4); ctx.lineTo(0, 4); ctx.closePath(); }, 1.6);
        ctx.restore();
        shape(ctx, V, () => { ctx.beginPath(); ctx.moveTo(28, -78 + y); ctx.quadraticCurveTo(40, -84 + y, 58, -74 + y); ctx.lineTo(58, -70 + y); ctx.lineTo(34, -69 + y); ctx.quadraticCurveTo(26, -72 + y, 28, -78 + y); ctx.closePath(); }, 2);
        if (!baby) for (let t = 0; t < 4; t++) shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(42 + t * 4, -70 + y); ctx.lineTo(43 + t * 4, -66.5 + y); ctx.lineTo(44.5 + t * 4, -70 + y); ctx.closePath(); }, 0.6);
        [[30, -80], [27, -78], [25, -75]].forEach(([x, y2], i) => strokeLine(ctx, [x, y2 + y, x - 7, y2 - 4 + y + i], 1.6, VW, false));
        shape(ctx, WHITE, () => ell(ctx, 40, -77 + y, 2.6, 2.2), 1); dot(ctx, 40.6, -77 + y, 1.4);
        dot(ctx, 55, -74 + y, 0.9);
      });
      ctx.restore();
      leg(0, V);
    },

    titanosaur(ctx, ph, m, baby) {
      const G = '#bdbdbe', GF = '#959596', GS = '#8a8a8b', GB = '#e2e2e3';
      const bob = Math.sin(ph * 2) * 1.6 * m, sway = Math.sin(ph * 0.5), nod = Math.sin(ph) * 3 * m;
      const d = quadLegs(ctx, { ph, A: 0.22 * m, B: 0.3 * m, hindX: -58, foreX: 58, hl: 56, fl: 60, w: 26, near: G, far: GF, foot: null, lf: baby ? 0.75 : 1 });
      ctx.save(); ctx.translate(0, d + bob);
      const nb = baby ? 0.55 : 1;           // babies have a much shorter neck
      const tail = () => tailPath(ctx, -80, -112, 30, -170, -112 + sway * 6, -250, -66 + sway * 14);
      const body = () => ell(ctx, 0, -116, 98, 54);
      const neck = () => { ctx.beginPath(); ctx.moveTo(52, -158); ctx.quadraticCurveTo(110 * nb + 40, -190 * nb - 40, 150 * nb + 30, -270 * nb - 6 + nod);
        ctx.lineTo(166 * nb + 30, -262 * nb - 6 + nod); ctx.quadraticCurveTo(140 * nb + 40, -160 * nb - 30, 96, -100); ctx.closePath(); };
      blob(ctx, G, [tail, body, neck]);
      clipTo(ctx, body, () => { ctx.fillStyle = GB; ell(ctx, 6, -64, 92, 16); ctx.fill(); });
      // armor plates (osteoderms) along the back, and skin creases
      [[-60, -150, 7], [-36, -162, 8], [-10, -168, 8], [16, -166, 8], [40, -158, 7], [-84, -138, 6]].forEach(([x, y, r]) => shape(ctx, GS, () => ell(ctx, x, y, r, r * 0.6), 1.4));
      [[-40, -120], [-20, -112], [0, -122], [24, -114], [-60, -108]].forEach(([x, y]) => strokeLine(ctx, [x, y, x + 6, y + 14], 1.2, GS, false));
      // head: small, with a rounded snout and a nostril bump
      const k = baby ? 1.6 : 1, hx = 160 * nb + 30, hy = -268 * nb - 6 + nod;
      grow(ctx, k, hx, hy, () => {
        shape(ctx, G, () => { ctx.beginPath(); ctx.moveTo(hx - 12, hy - 4); ctx.quadraticCurveTo(hx - 6, hy - 16, hx + 8, hy - 13); ctx.quadraticCurveTo(hx + 24, hy - 10, hx + 25, hy - 2);
          ctx.quadraticCurveTo(hx + 24, hy + 6, hx + 10, hy + 6); ctx.lineTo(hx - 8, hy + 7); ctx.closePath(); });
        shape(ctx, G, () => ell(ctx, hx + 6, hy - 13, 6, 3.5), 1.4);
        dot(ctx, hx + 2, hy - 6, 1.9); dot(ctx, hx + 2.5, hy - 6.6, 0.6, WHITE);
        strokeLine(ctx, [hx + 6, hy + 2, hx + 24, hy + 0.5], 1.1, INK, false);
      });
      // toenails on the near feet
      ctx.restore();
    },

    dragon(ctx, ph, m, baby, o = {}) {
      const DR = '#8c8c8d', DF = '#6a6a6b', DB = '#d3d3d4', DW = '#b6b6b7', DS = '#4e4e4f', DH = '#f0f0f1';
      const fly = o.fly || 0, fire = o.fire || 0, k = baby ? 1.45 : 1;
      const flap = fly > 0.05 ? Math.sin(ph * 1.4) : 0, bob = Math.sin(ph * 2) * 1.5 * m * (1 - fly), sway = Math.sin(ph * 0.6), nod = Math.sin(ph) * 2 * m * (1 - fly);
      if (fly < 0.2) { ell(ctx, 0, 0, 44, 5); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill(); }
      const ws = baby ? 0.55 : 1;
      // far wing first, behind everything
      dragonWing(ctx, 4, -76 + bob, fly, flap * 0.9, '#9d9d9e', DF, ws * 0.9);
      // legs: walking, or tucked up in flight
      let d = 0;
      if (fly < 0.5) d = quadLegs(ctx, { ph, A: 0.42 * m, B: 0.6 * m, hindX: -26, foreX: 26, hl: 20, fl: 20, w: 10, near: DR, far: DF, foot: 'paw', lf: baby ? 0.75 : 1 });
      else [[-26, DF, 0.9], [26, DF, 0.7], [-22, DR, 1.1], [30, DR, 0.8]].forEach(([x, f, a]) => limb(ctx, x, -48, a, 16, a + 0.9, 14, 9, f, 'paw'));
      ctx.save(); ctx.translate(0, d + bob);
      const tail = () => tailPath(ctx, -32, -62, 12, -86, -58 + sway * 6, -128, -36 + sway * 12);
      const body = () => ell(ctx, 0, -62, 42, 19);
      const neck = () => { ctx.beginPath(); ctx.moveTo(26, -72); ctx.quadraticCurveTo(40, -86, 54, -100 + nod); ctx.lineTo(62, -94 + nod); ctx.quadraticCurveTo(50, -72, 36, -54); ctx.closePath(); };
      // spade at the tip of the tail
      const tx = -128, ty = -36 + sway * 12;
      shape(ctx, DS, () => { ctx.beginPath(); ctx.moveTo(tx + 6, ty - 2); ctx.lineTo(tx - 6, ty - 10); ctx.lineTo(tx - 12, ty + 2); ctx.lineTo(tx - 4, ty + 8); ctx.closePath(); }, 1.6);
      if (!baby) spikes(ctx, [[-108, -42 + sway * 10, 7], [-92, -48 + sway * 8, 8], [-74, -54 + sway * 6, 9], [-54, -62 + sway * 3, 10], [-34, -73, 11], [-14, -78, 12], [6, -78, 12], [24, -74, 10], [36, -82, 9], [46, -92 + nod, 8]], DS);
      blob(ctx, DR, [tail, body, neck]);
      clipTo(ctx, body, () => { ctx.fillStyle = DB; ell(ctx, 4, -44, 38, 8); ctx.fill(); ctx.strokeStyle = '#a5a5a6'; ctx.lineWidth = 1; for (let x = -26; x <= 30; x += 7) { ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + 2, -40); ctx.stroke(); } });
      [[-14, -66], [0, -70], [14, -66]].forEach(([x, y]) => strokeLine(ctx, [x - 3, y, x, y + 3, x + 3, y], 1.2, '#6f6f70', false));
      // head, with horns; the jaw drops open to breathe fire
      grow(ctx, k, 58, -98 + nod, () => {
        const y = nod;
        [[54, -106, 40, -122], [60, -108, 50, -128]].forEach(([x1, y1, x2, y2], i) => shape(ctx, DH, () => hornPath(ctx, x1 - 3, y1 + y, x1 + 3, y1 + 1 + y, x2, y2 + y, i ? -3 : -2), 1.4));
        ctx.save(); ctx.translate(58, -92 + y); ctx.rotate(0.15 + fire * 0.45);
        shape(ctx, DR, () => { ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(24, 1); ctx.quadraticCurveTo(26, 4, 22, 5); ctx.lineTo(0, 6); ctx.closePath(); }, 1.8);
        if (fire > 0.1) for (let t = 0; t < 3; t++) shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(6 + t * 6, 1); ctx.lineTo(7.5 + t * 6, -2); ctx.lineTo(9 + t * 6, 1); ctx.closePath(); }, 0.6);
        ctx.restore();
        shape(ctx, DR, () => { ctx.beginPath(); ctx.moveTo(48, -98 + y); ctx.quadraticCurveTo(56, -110 + y, 70, -104 + y); ctx.quadraticCurveTo(84, -100 + y, 86, -94 + y); ctx.lineTo(84, -90 + y); ctx.lineTo(58, -90 + y); ctx.quadraticCurveTo(48, -92 + y, 48, -98 + y); ctx.closePath(); });
        strokeLine(ctx, [62, -104 + y, 72, -102 + y], 2, DS, false);
        shape(ctx, DH, () => ell(ctx, 66, -99 + y, 3.6, 2.6), 1.1);
        ctx.fillStyle = INK; ctx.fillRect(65.5, -101 + y, 1.2, 4);
        dot(ctx, 82, -97 + y, 1.1);
        if (!fire) strokeLine(ctx, [62, -92 + y, 82, -92 + y], 1, '#555', false);
      });
      // near wing on top
      dragonWing(ctx, 14, -72, fly, flap, DW, DF, ws);
      ctx.restore();
    },
  });

  Object.assign(FB, {
    dolphin(ctx, ph, m, baby, view) {
      const F = view === 'front', D = '#8e8e8f', DB = '#ececed', sw = Math.sin(ph * 1.2) * (m ? 1 : 0.4), fin = baby ? 0.6 : 1;
      ell(ctx, 0, 0, 18, 4); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill();
      ctx.save(); ctx.translate(0, -26 + Math.sin(ph * 0.5) * 1.5);
      if (!F) shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(-3, 2 + sw * 3); ctx.quadraticCurveTo(-14, -4 + sw * 5, -24, -1 + sw * 6); ctx.quadraticCurveTo(-16, 6 + sw * 5, -1, 7 + sw * 3);
        ctx.lineTo(1, 7 + sw * 3); ctx.quadraticCurveTo(16, 6 + sw * 5, 24, -1 + sw * 6); ctx.quadraticCurveTo(14, -4 + sw * 5, 3, 2 + sw * 3); ctx.closePath(); });
      shape(ctx, D, () => { ctx.beginPath(); ctx.moveTo(-3.5, -12); ctx.quadraticCurveTo(-1, -26 * fin, 1.5, -32 * fin); ctx.lineTo(3.5, -12); ctx.closePath(); });
      [-1, 1].forEach(s => shape(ctx, D, () => ell(ctx, s * 16, 9 + sw * s * 2, 8, 3.2, s * 0.55), 1.6));
      const body = () => ell(ctx, 0, 0, 14, 13);
      shape(ctx, D, body);
      clipTo(ctx, body, () => { ctx.fillStyle = DB; ell(ctx, 0, 10, 10, 7); ctx.fill(); });
      ctx.lineWidth = OUT; ctx.strokeStyle = INK; body(); ctx.stroke();
      if (F) {
        shape(ctx, DB, () => ell(ctx, 0, 5, 5, 3.6), 1.6);
        [-1, 1].forEach(s => { dot(ctx, s * 8.5, -3, 1.6); dot(ctx, s * 8.5 - 0.4, -3.5, 0.5, WHITE); });
        strokeLine(ctx, [-4, 7, 0, 8.6, 4, 7], 1.1, INK, false);
        dot(ctx, 0, -9, 1, '#555');
      }
      ctx.restore();
    },

    trex(ctx, ph, m, baby, view) {
      const F = view === 'front', R = '#a3a3a4', RF = '#7c7c7d', RB = '#dadadb', RS = '#6e6e6f';
      const bob = bobOf(ph, m) * 1.2, sx = swayOf(ph, m), k = baby ? 1.4 : 1, sw = Math.sin(ph * 0.6) * m, dy = baby ? 14 : 0;
      // legs: a thick thigh on each side, then a slimmer shin down to three-toed feet
      const legs = () => [[-1, 0], [1, Math.PI]].forEach(([s, off]) => {
        const lift = 10 * m * Math.max(0, Math.sin(ph + off));
        legFB(ctx, s * 24, -60 + dy, 0, lift, 11, R, null);
        [-4, 0, 4].forEach(t => strokeLine(ctx, [s * 24 + t, -lift - 3, s * 24 + t * 1.6, -lift + 1], 2.4, R));
        bodyLayer(ctx, sx, bob + dy, () => shape(ctx, R, () => ell(ctx, s * 25, -74, 13, 22, s * 0.12)));
      });
      if (F) {
        bodyLayer(ctx, sx, bob + dy, () => { shape(ctx, R, () => ell(ctx, 0, -100, 32, 30)); clipTo(ctx, () => ell(ctx, 0, -100, 32, 30), () => { ctx.fillStyle = RB; ell(ctx, 0, -78, 22, 14); ctx.fill(); }); });
        legs();
        bodyLayer(ctx, sx, bob + dy, () => {
          [-1, 1].forEach(s => { strokeLine(ctx, [s * 14, -90, s * 18, -80, s * 14, -76], 4, R); strokeLine(ctx, [s * 14, -76, s * 13, -73], 1.2, INK, false); });
          grow(ctx, k, 0, -112, () => {
            // lower jaw, then the broad skull with forward-facing eyes
            shape(ctx, R, () => { ctx.beginPath(); ctx.moveTo(-18, -106); ctx.lineTo(18, -106); ctx.quadraticCurveTo(16, -92, 0, -90); ctx.quadraticCurveTo(-16, -92, -18, -106); ctx.closePath(); });
            shape(ctx, R, () => { ctx.beginPath(); ctx.moveTo(-24, -112); ctx.quadraticCurveTo(-24, -134, 0, -136); ctx.quadraticCurveTo(24, -134, 24, -112); ctx.quadraticCurveTo(20, -104, 0, -103); ctx.quadraticCurveTo(-20, -104, -24, -112); ctx.closePath(); });
            for (let t = -3; t <= 3; t++) shape(ctx, WHITE, () => { ctx.beginPath(); ctx.moveTo(t * 4.6 - 1.8, -104); ctx.lineTo(t * 4.6, -99.5); ctx.lineTo(t * 4.6 + 1.8, -104); ctx.closePath(); }, 0.7);
            [-1, 1].forEach(s => { shape(ctx, WHITE, () => ell(ctx, s * 13, -122, 3.6, 3), 1.1); dot(ctx, s * 12.6, -122, 1.8); strokeLine(ctx, [s * 7, -127.5, s * 19, -126.5], 2.2, RS, false); dot(ctx, s * 4, -111, 1.2); });
          });
        });
      } else {
        bodyLayer(ctx, sx, bob + dy, () => { grow(ctx, k, 0, -126, () => shape(ctx, R, () => ell(ctx, 0, -126, 20, 12))); shape(ctx, R, () => ell(ctx, 0, -100, 32, 30));
          [[-14, -122], [0, -127], [14, -122]].forEach(([x, y]) => strokeLine(ctx, [x, y, x, y + 10], 2, RS, false)); });
        legs();
        bodyLayer(ctx, sx, bob + dy, () => blob(ctx, R, [() => { ctx.beginPath(); ctx.moveTo(-18, -96); ctx.quadraticCurveTo(-10 + sw * 6, -50, sw * 12, -10); ctx.quadraticCurveTo(10 + sw * 6, -50, 18, -96); ctx.closePath(); }]));
      }
    },

    raptor(ctx, ph, m, baby, view) {
      const F = view === 'front', V = '#b0b0b1', VF = '#858586', VW = '#8f8f90', VB = '#e3e3e4', VS = '#69696a';
      const bob = bobOf(ph, m), sx = swayOf(ph, m), k = baby ? 1.4 : 1, sw = Math.sin(ph * 0.8) * m, lf = baby ? 0.85 : 1;
      [[-9, 0], [9, Math.PI]].forEach(([x, off]) => legFB(ctx, x, -48 * lf, 0, 7 * m * Math.max(0, Math.sin(ph + off)), 7, V, 'bird'));
      bodyLayer(ctx, sx, bob + (baby ? 6 : 0), () => {
        if (!F) blob(ctx, V, [() => { ctx.beginPath(); ctx.moveTo(-8, -54); ctx.quadraticCurveTo(sw * 6, -36, sw * 10, -14); ctx.quadraticCurveTo(sw * 4, -36, 8, -54); ctx.closePath(); }]);
        [-1, 1].forEach(s => shape(ctx, VW, () => { ctx.beginPath(); ctx.moveTo(s * 10, -60); ctx.lineTo(s * 20, -44); ctx.lineTo(s * 17, -40); ctx.lineTo(s * 19, -36); ctx.lineTo(s * 12, -44); ctx.closePath(); }, 1.4));
        shape(ctx, V, () => ell(ctx, 0, -54, 15, 15));
        if (F) clipTo(ctx, () => ell(ctx, 0, -54, 15, 15), () => { ctx.fillStyle = VB; ell(ctx, 0, -46, 9, 9); ctx.fill(); });
        grow(ctx, k, 0, -72, () => {
          shape(ctx, V, () => { ctx.beginPath(); ctx.moveTo(-5, -60); ctx.lineTo(5, -60); ctx.lineTo(4, -72); ctx.lineTo(-4, -72); ctx.closePath(); });
          [[-6, -80], [0, -82], [6, -80]].forEach(([x, y]) => strokeLine(ctx, [x * 0.5, y + 4, x, y - 4], 1.6, VW, false));
          shape(ctx, V, () => ell(ctx, 0, -76, 8, 7));
          if (F) {
            shape(ctx, V, () => ell(ctx, 0, -70, 4.5, 6), 1.6);
            [-1, 1].forEach(s => { shape(ctx, WHITE, () => ell(ctx, s * 6, -78, 2.4, 2.2), 1); dot(ctx, s * 6, -78, 1.3); });
            dot(ctx, -1.5, -66, 0.7); dot(ctx, 1.5, -66, 0.7);
          } else strokeLine(ctx, [-4, -80, 4, -80], 1.4, VS, false);
        });
      });
    },

    titanosaur(ctx, ph, m, baby, view) {
      const F = view === 'front', G = '#bdbdbe', GF = '#959596', GS = '#8a8a8b', GB = '#e2e2e3';
      const bob = bobOf(ph, m), sx = swayOf(ph, m), k = baby ? 1.5 : 1, sw = Math.sin(ph * 0.5) * m, nb = baby ? 0.55 : 1;
      const L = { ph, m: m * 0.7, spread: 44, farSpread: 36, nLen: 112, fLen: 104, depth: 12, w: 26, near: G, far: GF, foot: null, lf: baby ? 0.75 : 1 };
      const d = legsFB(ctx, L, 'far');
      const neck = () => { ctx.beginPath(); ctx.moveTo(-16, -150); ctx.quadraticCurveTo(-8, -210 * nb, -6, -250 * nb - 10); ctx.lineTo(6, -250 * nb - 10); ctx.quadraticCurveTo(8, -210 * nb, 16, -150); ctx.closePath(); };
      const head = () => grow(ctx, k, 0, -258 * nb - 10, () => {
        const hy = -258 * nb - 10;
        shape(ctx, G, () => ell(ctx, 0, hy, 11, 10));
        if (F) { shape(ctx, G, () => ell(ctx, 0, hy + 7, 8, 5), 1.6); [-1, 1].forEach(s => { dot(ctx, s * 7, hy - 3, 1.7); dot(ctx, s * 2.5, hy + 6, 0.9); }); strokeLine(ctx, [-6, hy + 10, 6, hy + 10], 1, INK, false); }
        else shape(ctx, GS, () => ell(ctx, 0, hy - 6, 5, 3), 1.2);
      });
      if (F) {
        bodyLayer(ctx, sx, d + bob, () => { shape(ctx, G, () => ell(ctx, 0, -118, 64, 54)); clipTo(ctx, () => ell(ctx, 0, -118, 64, 54), () => { ctx.fillStyle = GB; ell(ctx, 0, -76, 46, 18); ctx.fill(); }); });
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => { shape(ctx, G, neck); head(); });
      } else {
        bodyLayer(ctx, sx, d + bob, () => { shape(ctx, G, neck); head(); shape(ctx, G, () => ell(ctx, 0, -118, 64, 54));
          [[-30, -160], [0, -170], [30, -160]].forEach(([x, y]) => shape(ctx, GS, () => ell(ctx, x, y, 7, 4.5), 1.3)); });
        legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => blob(ctx, G, [() => { ctx.beginPath(); ctx.moveTo(-30, -112); ctx.quadraticCurveTo(sw * 12, -50, sw * 24, -4); ctx.quadraticCurveTo(sw * 8, -50, 30, -112); ctx.closePath(); }]));
      }
    },

    dragon(ctx, ph, m, baby, view, o = {}) {
      const F = view === 'front', DR = '#8c8c8d', DF = '#6a6a6b', DB = '#d3d3d4', DW = '#b6b6b7', DS = '#4e4e4f', DH = '#f0f0f1';
      const fly = o.fly || 0, fire = o.fire || 0, k = baby ? 1.4 : 1, ws = baby ? 0.55 : 1;
      const bob = bobOf(ph, m) * (1 - fly), sx = swayOf(ph, m) * (1 - fly), sw = Math.sin(ph * 0.6), flap = fly > 0.05 ? Math.sin(ph * 1.4) : 0;
      if (fly < 0.2) { ell(ctx, 0, 0, 24, 4.5); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fill(); }
      const L = { ph, m, spread: 15, farSpread: 12, nLen: 40, fLen: 38, depth: 7, w: 10, near: DR, far: DF, foot: 'paw', lf: baby ? 0.75 : 1 };
      // wings: folded and raised beside the body on the ground, spread wide and beating in the air
      const wings = () => [-1, 1].forEach(s => {
        const span = (24 + fly * 46) * ws, up = (fly ? -10 - flap * 22 : -26) * ws;
        shape(ctx, DW, () => { ctx.beginPath(); ctx.moveTo(s * 10, -70); ctx.lineTo(s * (10 + span * 0.55), -78 + up); ctx.lineTo(s * (10 + span), -66 + up * 0.6);
          ctx.quadraticCurveTo(s * (6 + span * 0.8), -56 + up * 0.2, s * (8 + span * 0.62), -50); ctx.quadraticCurveTo(s * (6 + span * 0.4), -58, s * (4 + span * 0.3), -48); ctx.quadraticCurveTo(s * 8, -56, s * 8, -56); ctx.closePath(); }, 1.8);
        strokeLine(ctx, [s * 10, -70, s * (10 + span * 0.55), -78 + up, s * (10 + span), -66 + up * 0.6], 2.6, DF);
      });
      const d = fly < 0.5 ? legsFB(ctx, L, 'far') : 0;
      const head = () => grow(ctx, k, 0, -98, () => {
        [-1, 1].forEach(s => shape(ctx, DH, () => hornPath(ctx, s * 5, -108, s * 9, -106, s * 16, -124, -s * 2), 1.4));
        shape(ctx, DR, () => ell(ctx, 0, -100, 12, 11));
        if (F) {
          shape(ctx, DR, () => { ctx.beginPath(); ctx.moveTo(-8, -98); ctx.lineTo(8, -98); ctx.lineTo(6, -84 + fire * 4); ctx.lineTo(-6, -84 + fire * 4); ctx.closePath(); }, 1.8);
          if (fire > 0.1) shape(ctx, '#333334', () => ell(ctx, 0, -86 + fire * 2, 4, 2 + fire * 2), 1.2);
          [-1, 1].forEach(s => { shape(ctx, DH, () => ell(ctx, s * 6, -103, 3, 2.4), 1); ctx.fillStyle = INK; ctx.fillRect(s * 6 - 0.6, -105, 1.2, 4); dot(ctx, s * 2.5, -90, 1); });
        }
      });
      const neck = () => shape(ctx, DR, () => { ctx.beginPath(); ctx.moveTo(-9, -74); ctx.lineTo(9, -74); ctx.lineTo(7, -96); ctx.lineTo(-7, -96); ctx.closePath(); });
      const lift = fly * 0;
      if (F) {
        bodyLayer(ctx, sx, d + bob, () => { wings(); shape(ctx, DR, () => ell(ctx, 0, -60, 22, 20)); clipTo(ctx, () => ell(ctx, 0, -60, 22, 20), () => { ctx.fillStyle = DB; ell(ctx, 0, -50, 12, 14); ctx.fill(); }); });
        if (fly < 0.5) legsFB(ctx, L, 'near'); else [-1, 1].forEach(s => limb(ctx, s * 12, -46, 0.4 * s, 12, 0.9 * s, 10, 8, DR, 'paw'));
        bodyLayer(ctx, sx, d + bob, () => { neck(); head(); });
      } else {
        bodyLayer(ctx, sx, d + bob, () => { neck(); head(); shape(ctx, DR, () => ell(ctx, 0, -60, 22, 20)); if (!baby) spikes(ctx, [[0, -78, 8], [0, -66, 7]], DS); wings(); });
        if (fly < 0.5) legsFB(ctx, L, 'near');
        bodyLayer(ctx, sx, d + bob, () => { blob(ctx, DR, [() => { ctx.beginPath(); ctx.moveTo(-12, -56); ctx.quadraticCurveTo(sw * 10, -30, sw * 18, -6); ctx.quadraticCurveTo(sw * 6, -30, 12, -56); ctx.closePath(); }]);
          shape(ctx, DS, () => { const x = sw * 18; ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x - 7, -2); ctx.lineTo(x, 6); ctx.lineTo(x + 7, -2); ctx.closePath(); }, 1.4); });
      }
    },
  });

  // ---------- color ----------
  // At six stars the animals take on their real colors. Each palette swaps the grays an animal is drawn with
  // for colors (the outline black and anything not listed stay as they are).
  const COLORS = {
    lion: { '#fff': '#e8bb6c', '#cfcfcf': '#c39650', '#999': '#c99a58', '#131314': '#7c4416' },
    elephant: { '#dcdcdc': '#a9a4a0', '#b0b0b0': '#88837f', '#999': '#8d8884', '#888': '#77726e' },
    giraffe: { '#fff': '#f4d49a', '#cfcfcf': '#d3ae70', '#141415': '#a5571f' },
    penguin: { '#888': '#f0892a', '#666': '#3d3d3d', '#9a9a9a': '#4a4a4a' },
    bear: { '#555': '#7d5030', '#383838': '#5b381d', '#a8a8a8': '#c89d6c' },
    monkey: { '#8c8c8c': '#8f603a', '#6a6a6a': '#6c4628', '#fff': '#f0cfa6' },
    flamingo: { '#e4e4e4': '#f792ab', '#9a9a9a': '#d76c88', '#6f6f6f': '#ec839d', '#fff': '#f9dae2', '#999': '#e3708e' },
    snowleopard: { '#f2f2f2': '#ece4d4', '#c8c8c8': '#cdc1aa' },
    ostrich: { '#dedede': '#e7b4a8', '#b9b9b9': '#c89286', '#d8d8d8': '#e5b9ad', '#b0b0b0': '#d9a27a', '#c4c4c4': '#c9a679', '#bdbdbd': '#b9966a' },
    seahawk: { '#4a4a4a': '#5e3e24', '#2e2e2e': '#3e2917', '#777777': '#6d4b2f', '#888': '#9aa7b2', '#bdbdbd': '#c7a77f', '#d6d6d6': '#e2cba9' },
    hippo: { '#a9a9a9': '#937c8b', '#7f7f7f': '#705c6a', '#777': '#5c4b57' },
    rhino: { '#b8b8b8': '#9e988f', '#8c8c8c': '#7d776e', '#e8e8e8': '#dbcfb3', '#888': '#6f6a62', '#7a7a7a': '#6a655d', '#777': '#67625a' },
    polarbear: { '#f7f7f7': '#fcf4dc', '#d2d2d2': '#e4d8b6', '#cfcfcf': '#e0d3b0' },
    anaconda: { '#7a7a7a': '#6f7c34', '#444': '#2c2b14', '#b8b8b8': '#d8c45c' },
    shark: { '#9a9a9a': '#7b8fa1' },
    parrot: { '#9a9a9a': '#d9342b', '#4f4f4f': '#2c63ca', '#6f6f6f': '#2f60ba', '#777777': '#f2c230', '#c4c4c4': '#c9b8a8' },
    toucan: { '#e6e6e6': '#ff9a22', '#fff': '#ffe36b', '#777777': '#2e2e2e' },
    owl: { '#8f8f8f': '#8c6b47', '#6a6a6a': '#5f452c', '#cfcfcf': '#ddc59b', '#777777': '#6b4f33' },
    eagle: { '#3a3a3a': '#4c301d', '#2a2a2a': '#3b2515', '#dcdcdc': '#f4c22e', '#9a9a9a': '#f2c037', '#a8a8a8': '#8f8a80', '#777777': '#4c301d' },
    triceratops: { '#c2c2c2': '#8f9b5c', '#959595': '#707b43', '#9d9d9d': '#c6713d', '#ededed': '#efe3c4', '#777': '#5b5141', '#8a8a8a': '#606c36', '#555': '#7b3b1c' },
    basilisk: { '#3a3a3a': '#2f5c34', '#6e6e6e': '#4f8149', '#8a8a8a': '#b9c35b', '#bdbdbd': '#e1b33d', '#999': '#cad26b' },
    unicorn: { '#ececec': '#f3b9df', '#e6e6e6': '#cdb7f3', '#f4f4f4': '#f5d56b', '#999': '#caa43b', '#d6d6d6': '#e4def0' },
    dolphin: { '#8e8e8f': '#7896ab', '#ececed': '#eef3f6', '#5f5f60': '#5d7486' },
    trex: { '#a3a3a4': '#7f8c4f', '#7c7c7d': '#606b39', '#dadadb': '#dbd09b', '#6e6e6f': '#4f5a2b' },
    raptor: { '#b0b0b1': '#b88c53', '#858586': '#8b6539', '#8f8f90': '#6f4b2b', '#e3e3e4': '#eddcb8', '#69696a': '#5a3a1b' },
    titanosaur: { '#bdbdbe': '#9ca18a', '#959596': '#7a806a', '#8a8a8b': '#6f6551', '#e2e2e3': '#dad7c4' },
    dragon: { '#8c8c8d': '#b3271f', '#6a6a6b': '#7d1813', '#d3d3d4': '#e9c35b', '#b6b6b7': '#d9614b', '#9d9d9e': '#b14b39', '#4e4e4f': '#3b1311',
      '#f0f0f1': '#f3e7c5', '#a5a5a6': '#c9a041', '#6f6f70': '#8a1b15', '#333334': '#3a0e0b' },
  };
  let colorK = 0, PAL = null;
  const hooked = new WeakSet();
  // Route a canvas's fill and stroke colors through the current palette (only while an animal is being drawn).
  function hook(ctx) {
    if (hooked.has(ctx)) return; hooked.add(ctx);
    const proto = Object.getPrototypeOf(ctx);
    ['fillStyle', 'strokeStyle'].forEach(k => {
      const d = Object.getOwnPropertyDescriptor(proto, k); if (!d) return;
      Object.defineProperty(ctx, k, { configurable: true, get() { return d.get.call(this); },
        set(v) { d.set.call(this, PAL && typeof v === 'string' ? (PAL[v.toLowerCase()] || v) : v); } });
    });
  }
  function setColor(k) { colorK = k; }

  function draw(ctx, id, x, y, opts = {}) {
    const { phase = 0, moving = true, scale = 1, facing = 1, baby = false, view = 'side' } = opts;
    const art = ART[id]; if (!art) return;
    const s = scale * (baby ? SPECIES[id].babyScale : 1);
    const pal = colorK >= 0.5 ? COLORS[id] : null;
    if (pal) { hook(ctx); PAL = pal; }
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * facing, s);
    if (view !== 'side' && FB[id]) FB[id](ctx, phase, moving ? 1 : 0, baby, view, opts);
    else art(ctx, phase, moving ? 1 : 0, baby, opts);
    ctx.restore();
    PAL = null;
  }

  // Where each adult's mouth (or beak, trunk tip, horn) is in its side view, in art units: effects start here.
  const MOUTH = {
    lion: [58, -56], elephant: [66, -24], giraffe: [52, -160], zebra: [60, -70], penguin: [22, -48], bear: [62, -50], monkey: [40, -60],
    flamingo: [25, -112], snowleopard: [56, -56], ostrich: [22, -150], seahawk: [14, -48], hippo: [62, -48], rhino: [70, -60],
    anaconda: [88, -8], polarbear: [62, -55], shark: [50, -24], orca: [58, -28], parrot: [12, -46], toucan: [30, -45], owl: [12, -44],
    eagle: [15, -58], triceratops: [80, -46], basilisk: [104, -62], unicorn: [54, -118], dolphin: [66, -25], trex: [104, -112],
    raptor: [56, -72], titanosaur: [214, -274], dragon: [84, -92],
  };
  global.ZooAnimals = { SPECIES, APPROVED, draw, setColor, COLORS, MOUTH, ids: Object.keys(SPECIES) };
})(typeof window !== 'undefined' ? window : globalThis);
