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

  // ---------- species registry ----------
  // approved:false animals (or babies) never appear in the game until Alex signs off.
  const SPECIES = {
    lion:         { name: 'Lion',         wants: ['tree', 'bush', 'toy'],  cost: 3000, appeal: 9,  babyScale: 0.5,  galleryScale: 1.0 },
    elephant:     { name: 'Elephant',     wants: ['water', 'tree', 'toy'], cost: 5000, appeal: 10, babyScale: 0.45, galleryScale: 0.85 },
    giraffe:      { name: 'Giraffe',      wants: ['tree', 'water'],        cost: 4000, appeal: 8,  babyScale: 0.5,  galleryScale: 0.68 },
    zebra:        { name: 'Zebra',        wants: ['bush', 'water'],        cost: 1500, appeal: 5,  babyScale: 0.55, galleryScale: 1.0 },
    penguin:      { name: 'Penguin',      wants: ['water', 'toy'],         cost: 1200, appeal: 7,  babyScale: 0.6,  galleryScale: 1.35 },
    bear:         { name: 'Bear',         wants: ['water', 'tree', 'toy'], cost: 3500, appeal: 8,  babyScale: 0.45, galleryScale: 1.0 },
    monkey:       { name: 'Monkey',       wants: ['tree', 'toy', 'bush'],  cost: 2000, appeal: 7,  babyScale: 0.5,  galleryScale: 1.3 },
    flamingo:     { name: 'Flamingo',     wants: ['water', 'bush'],        cost: 1000, appeal: 4,  babyScale: 0.5,  galleryScale: 1.0 },
    snowleopard:  { name: 'Snow leopard', wants: ['tree', 'toy', 'bush'],  cost: 4500, appeal: 9,  babyScale: 0.5,  galleryScale: 1.0 },
  };
  // Approval status lives separately so it is easy to edit.
  // adult / baby: side-view art (all nine approved by Alex on 2026-10-03).
  // adultFrontBack / babyFrontBack: walking toward and away from the camera (all nine approved
  // by Alex on 2026-10-04). Set one to false and the game shows the side view for that animal instead.
  const APPROVED = {};
  ['lion', 'elephant', 'giraffe', 'zebra', 'penguin', 'bear', 'monkey', 'flamingo', 'snowleopard'].forEach(id => {
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
      shape(ctx, INK, () => ell(ctx, -34 - 28 * tl, -54 + 8 * tl + sway * 4, 5 * tl, 7 * tl, 0.3));
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
          ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
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
        ctx.closePath(); ctx.fillStyle = INK; ctx.fill(); };
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
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
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
          shape(ctx, INK, () => ell(ctx, sway * 8, -54 + 30 * tl, 4.5 * tl, 6 * tl));
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
        ctx.closePath(); ctx.fillStyle = INK; ctx.fill(); };
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

  function draw(ctx, id, x, y, opts = {}) {
    const { phase = 0, moving = true, scale = 1, facing = 1, baby = false, view = 'side' } = opts;
    const art = ART[id]; if (!art) return;
    const s = scale * (baby ? SPECIES[id].babyScale : 1);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s * facing, s);
    if (view !== 'side' && FB[id]) FB[id](ctx, phase, moving ? 1 : 0, baby, view);
    else art(ctx, phase, moving ? 1 : 0, baby);
    ctx.restore();
  }

  global.ZooAnimals = { SPECIES, APPROVED, draw, ids: Object.keys(SPECIES) };
})(typeof window !== 'undefined' ? window : globalThis);
