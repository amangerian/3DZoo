/* 3D Zoo — world art: scenery, people, and ground details (black & white).
   All functions draw at world-pixel scale with (x, y) = ground point. */
(function (global) {
  const INK = '#111', WHITE = '#fff';

  function ell(c, x, y, rx, ry, r = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); }
  function fillStroke(c, fill, lw = 1.6) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
  function line(c, x1, y1, x2, y2, w, col = INK) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke();
  }
  // Color fades in as the zoo earns stars. Each layer runs from 0 (black and white) to 1 (full color).
  const tint = { plants: 0, water: 0, built: 0 };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  function mix(gray, color, k) {
    if (k <= 0) return gray; if (k >= 1) return color;
    const a = rgb(gray), b = rgb(color);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
  }
  const P = (g, col) => mix(g, col, tint.plants), Wt = (g, col) => mix(g, col, tint.water), B = (g, col) => mix(g, col, tint.built);
  // Small deterministic random from a seed, so scenery doesn't flicker.
  function rnd(seed) { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  const Art = {
    shadow(c, x, y, rx) { ell(c, x, y, rx, rx * 0.32); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fill(); },

    tree(c, x, y, seed = 0) {
      Art.shadow(c, x, y, 13);
      c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 2, y - 16); c.lineTo(x + 2, y - 16); c.lineTo(x + 3, y); c.closePath();
      fillStroke(c, P('#777777', '#8a5a32'));
      const blobs = [[-8, -24, 9], [8, -24, 9], [0, -33, 11], [-3, -22, 9], [5, -30, 8]];
      c.lineWidth = 3.2; c.strokeStyle = INK;
      blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.stroke(); });
      c.fillStyle = P('#ffffff', '#72bf52'); blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.fill(); });
      c.strokeStyle = P('#999999', '#3d8a34'); c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const a = rnd(seed + i) * 6.28, rr = 4 + rnd(seed + i + 9) * 9;
        const px = x + Math.cos(a) * rr, py = y - 27 + Math.sin(a) * rr * 0.8;
        c.beginPath(); c.arc(px, py, 2.4, 0.2, 2.6); c.stroke();
      }
    },

    // Flat-topped savanna tree.
    acacia(c, x, y, seed = 0) {
      Art.shadow(c, x, y, 15);
      const trunk = P('#777777', '#8a5a32');
      line(c, x, y, x - 1, y - 16, 4.6, INK); line(c, x, y, x - 1, y - 16, 2.4, trunk);
      [[-1, -16, -9, -28], [-1, -16, 8, -29], [-1, -14, 1, -30]].forEach(([a, b, d, e]) => { line(c, x + a, y + b, x + d, y + e, 3.6, INK); line(c, x + a, y + b, x + d, y + e, 1.6, trunk); });
      const top = () => { c.beginPath();
        for (let k = 0; k <= 12; k++) { const t = k / 12, px = x - 19 + 38 * t, bump = k % 2 ? 2.5 : 0; c.lineTo(px, y - 33 - Math.sin(t * Math.PI) * 4 - bump); }
        c.quadraticCurveTo(x + 21, y - 27, x + 12, y - 26); c.lineTo(x - 12, y - 26); c.quadraticCurveTo(x - 21, y - 27, x - 19, y - 33); c.closePath(); };
      top(); fillStroke(c, P('#ffffff', '#8cbf4f'), 2.6);
      c.strokeStyle = P('#999999', '#5c8f34'); c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const px = x - 12 + rnd(seed + i) * 24; c.beginPath(); c.arc(px, y - 30, 2, 0.2, 2.6); c.stroke(); }
    },

    palm(c, x, y, seed = 0) {
      Art.shadow(c, x + 3, y, 10);
      const trunk = P('#cccccc', '#b08a5a');
      c.beginPath(); c.moveTo(x - 3, y); c.quadraticCurveTo(x + 1, y - 18, x + 6, y - 34); c.lineTo(x + 9, y - 33); c.quadraticCurveTo(x + 5, y - 17, x + 3, y); c.closePath();
      fillStroke(c, trunk, 1.8);
      c.strokeStyle = INK; c.lineWidth = 1;
      for (let k = 1; k < 6; k++) { const t = k / 6, px = x + 0 + 6.5 * t * t, py = y - 34 * t; c.beginPath(); c.moveTo(px - 2.5, py); c.lineTo(px + 3, py - 1); c.stroke(); }
      const leaf = P('#ffffff', '#5aa548');
      [[-20, -26], [-14, -40], [2, -44], [18, -40], [24, -27]].forEach(([dx, dy], k) => {
        const sx = x + 7, sy = y - 35;
        c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx + dx * 0.5, sy + dy * 0.12 - 9, x + 7 + dx, y + dy);
        c.quadraticCurveTo(sx + dx * 0.45, sy + dy * 0.12 - 2, sx, sy + 2); c.closePath(); fillStroke(c, leaf, 1.6);
      });
      [[4, -33], [9, -32]].forEach(([dx, dy]) => { ell(c, x + dx, y + dy, 2.2, 2.2); fillStroke(c, P('#777777', '#7a5230'), 1); });
    },

    pine(c, x, y, seed = 0) {
      Art.shadow(c, x, y, 11);
      line(c, x, y, x, y - 8, 5, INK); line(c, x, y, x, y - 8, 2.6, P('#777777', '#7a4a2a'));
      const g = P('#ffffff', '#3f8048');
      [[-13, -7, -22], [-11, -17, -32], [-8, -27, -42]].forEach(([w, b, t]) => {
        c.beginPath(); c.moveTo(x + w, y + b); c.lineTo(x, y + t); c.lineTo(x - w, y + b);
        c.quadraticCurveTo(x, y + b + 3, x + w, y + b); c.closePath(); fillStroke(c, g, 2.2);
      });
      c.strokeStyle = P('#aaaaaa', '#2c5f35'); c.lineWidth = 1;
      [[-4, -12], [3, -21], [-2, -31]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(x + dx - 2, y + dy); c.lineTo(x + dx, y + dy - 2); c.lineTo(x + dx + 2, y + dy); c.stroke(); });
    },

    // Exercise wheel on a stand. spin turns the spokes while an animal runs in it.
    wheel(c, x, y, spin = 0) {
      Art.shadow(c, x, y, 12);
      const wood = B('#999999', '#8a5a32'), rim = B('#ffffff', '#e8a93a');
      line(c, x - 8, y, x, y - 13, 3, INK); line(c, x + 8, y, x, y - 13, 3, INK);
      c.beginPath(); c.arc(x, y - 13, 11.5, 0, Math.PI * 2); c.lineWidth = 5.5; c.strokeStyle = INK; c.stroke();
      c.lineWidth = 2.8; c.strokeStyle = rim; c.stroke();
      c.lineWidth = 1.2; c.strokeStyle = wood;
      for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * 9.5, y - 13 + Math.sin(a) * 9.5); c.lineTo(x - Math.cos(a) * 9.5, y - 13 - Math.sin(a) * 9.5); c.stroke(); }
      ell(c, x, y - 13, 2, 2); c.fillStyle = INK; c.fill();
    },

    // Rope-wrapped scratching post. wobble shakes it while an animal scratches.
    post(c, x, y, wobble = 0) {
      Art.shadow(c, x, y, 9);
      c.save(); c.translate(x, y); c.rotate(wobble * 0.08);
      c.beginPath(); c.rect(-8, -4, 16, 4); fillStroke(c, B('#cccccc', '#8a5a32'), 1.6);
      c.beginPath(); c.rect(-3.5, -26, 7, 22); fillStroke(c, B('#e6e6e6', '#d8bf8a'), 1.8);
      c.strokeStyle = B('#888888', '#9a7a48'); c.lineWidth = 1;
      for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(-3.5, -6 - k * 3); c.lineTo(3.5, -8 - k * 3); c.stroke(); }
      c.beginPath(); c.rect(-7, -29, 14, 3.5); fillStroke(c, B('#cccccc', '#8a5a32'), 1.6);
      c.restore();
    },

    bush(c, x, y, seed = 0) {
      Art.shadow(c, x, y, 11);
      const blobs = [[-6, -5, 6], [6, -5, 6], [0, -9, 7]];
      c.lineWidth = 3.2; c.strokeStyle = INK;
      blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.stroke(); });
      c.fillStyle = P('#e6e6e6', '#5aa548'); blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.fill(); });
      [[-5, -7], [4, -9], [1, -4]].forEach(([dx, dy]) => { ell(c, x + dx, y + dy, 1.1, 1.1); c.fillStyle = P('#555555', '#d8433a'); c.fill(); });
    },

    // Water is flat on the ground; drawn in the ground pass, sized to its tile.
    water(c, x, y, T, t) {
      const r = T * 0.52;
      c.beginPath();
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 2, rr = r * (0.9 + 0.1 * Math.sin(a * 3 + x));
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82);
      }
      c.closePath(); fillStroke(c, Wt('#b4b4b4', '#4fa3e3'), 2);
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.lineCap = 'round';
      [[-7, -4], [3, -5], [-2, 4], [7, 3]].forEach(([dx, dy], i) => {
        const ox = Math.sin(t * 1.2 + i * 1.7) * 1.5, px = x + dx + ox, py = y + dy;
        c.beginPath(); c.moveTo(px - 4, py); c.quadraticCurveTo(px - 2, py - 2, px, py); c.quadraticCurveTo(px + 2, py + 2, px + 4, py); c.stroke();
      });
    },

    toy(c, x, y, seed = 0, lift = 0) {
      Art.shadow(c, x, y, 7 - lift * 0.4);
      const by = y - 6 - lift, spin = lift * 0.6;
      ell(c, x, by, 6, 6); fillStroke(c, WHITE, 1.8);
      c.save(); ell(c, x, by, 6, 6); c.clip(); c.translate(x, by); c.rotate(spin);
      c.fillStyle = B('#111111', '#d8433a'); c.beginPath(); c.moveTo(-7, -3); c.quadraticCurveTo(0, 2, 7, -3);
      c.lineTo(7, 0); c.quadraticCurveTo(0, 5, -7, 0); c.closePath(); c.fill();
      c.restore();
      ell(c, x - 2, by - 3, 1.4, 1); c.fillStyle = WHITE; c.fill();
    },

    // A small pile of animal food on the ground. kind: meat, hay, leaves, fish, fruit, shrimp.
    food(c, x, y, kind, n, seed = 0) {
      const count = Math.min(n, 3);
      for (let k = 0; k < count; k++) {
        const px = x + (k - (count - 1) / 2) * 5, py = y + (k % 2) * 2;
        c.save(); c.translate(px, py); c.rotate((rnd(seed + k) - 0.5) * 0.8);
        if (kind === 'meat') {
          line(c, -1, 0, 4, -2, 2, '#fff'); line(c, -1, 0, 4, -2, 0.8, INK);
          ell(c, -3, 0.5, 3.6, 2.6); fillStroke(c, '#888', 1);
        } else if (kind === 'hay') {
          c.strokeStyle = '#777'; c.lineWidth = 1;
          for (let j = -3; j <= 3; j++) { c.beginPath(); c.moveTo(j * 1.2 - 3, 1.5); c.lineTo(j * 1.6 + 3, -2.5); c.stroke(); }
        } else if (kind === 'leaves') {
          line(c, -5, 1, 5, -1, 1, '#555');
          [-3, 0, 3].forEach((dx, j) => { ell(c, dx, -1.5 + (j % 2) * 3, 2.4, 1.3, 0.5); fillStroke(c, '#bbb', 0.8); });
        } else if (kind === 'fish') {
          ell(c, 0, 0, 4.2, 2); fillStroke(c, '#ddd', 1);
          c.beginPath(); c.moveTo(-4, 0); c.lineTo(-7, -2.2); c.lineTo(-7, 2.2); c.closePath(); fillStroke(c, '#ddd', 1);
          ell(c, 2.4, -0.4, 0.5, 0.5); c.fillStyle = INK; c.fill();
        } else if (kind === 'fruit') {
          ell(c, -1.5, 0, 2.4, 2.4); fillStroke(c, '#ccc', 1);
          c.beginPath(); c.arc(2.5, -1, 3.2, 0.3, 2.2); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
          c.beginPath(); c.arc(2.5, -1, 3.2, 0.35, 2.15); c.lineWidth = 1; c.strokeStyle = '#eee'; c.stroke();
        } else {
          [[-2, 0], [1, -1], [3, 1], [0, 1.5]].forEach(([dx, dy]) => { ell(c, dx, dy, 1.2, 1.2); c.fillStyle = '#666'; c.fill(); });
        }
        c.restore();
      }
    },

    // A small shop with a striped awning and a sign. (x, y) is the front edge of its tile.
    giftShop(c, x, y, T) {
      const w = T * 0.84, h = 22;
      Art.shadow(c, x, y, w * 0.55);
      c.beginPath(); c.rect(x - w / 2, y - h, w, h); fillStroke(c, B('#ffffff', '#fff1d6'), 2);
      // striped awning
      c.beginPath(); c.moveTo(x - w / 2 - 3, y - h); c.lineTo(x + w / 2 + 3, y - h); c.lineTo(x + w / 2 + 1, y - h + 7); c.lineTo(x - w / 2 - 1, y - h + 7); c.closePath();
      fillStroke(c, WHITE, 1.6);
      c.save(); c.clip(); c.fillStyle = B('#111111', '#d8433a');
      for (let k = -w / 2 - 3; k < w / 2 + 3; k += 6) c.fillRect(x + k, y - h, 3, 7);
      c.restore();
      c.beginPath(); c.rect(x - w / 2 - 3, y - h, w + 6, 7); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
      // door and window with a tiny bear in it
      c.beginPath(); c.rect(x - 3.5, y - 10, 7, 10); fillStroke(c, B('#999999', '#8a5a32'), 1.4);
      c.beginPath(); c.rect(x + 6, y - 12, 6, 6); fillStroke(c, B('#eeeeee', '#cfe8f7'), 1.2);
      ell(c, x + 9, y - 8.5, 1.8, 1.8); c.fillStyle = INK; c.fill(); ell(c, x + 9, y - 10.6, 1.3, 1.3); c.fill();
      c.beginPath(); c.rect(x - 12, y - 12, 6, 6); fillStroke(c, B('#eeeeee', '#cfe8f7'), 1.2);
      // sign
      c.beginPath(); c.rect(x - 13, y - h - 10, 26, 9); fillStroke(c, B('#111111', '#b8322b'), 1);
      c.fillStyle = WHITE; c.font = 'bold 7px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('GIFTS', x, y - h - 5.3);
    },

    // A schoolhouse-style building with a peaked roof and a book on the sign.
    eduCenter(c, x, y, T) {
      const w = T * 0.86, h = 18;
      Art.shadow(c, x, y, w * 0.55);
      c.beginPath(); c.rect(x - w / 2, y - h, w, h); fillStroke(c, B('#ffffff', '#f7f0e0'), 2);
      // columns
      [-9, -3, 3, 9].forEach(dx => line(c, x + dx, y - h + 3, x + dx, y - 2, 1.6, B('#777777', '#b9a07a')));
      c.beginPath(); c.moveTo(x - w / 2 - 3, y - h); c.lineTo(x, y - h - 12); c.lineTo(x + w / 2 + 3, y - h); c.closePath();
      fillStroke(c, B('#cccccc', '#4a7cc0'), 1.8);
      // open book in the gable
      c.beginPath(); c.moveTo(x, y - h - 2); c.lineTo(x - 5, y - h - 4); c.lineTo(x - 5, y - h - 8); c.lineTo(x, y - h - 6); c.closePath(); fillStroke(c, WHITE, 1);
      c.beginPath(); c.moveTo(x, y - h - 2); c.lineTo(x + 5, y - h - 4); c.lineTo(x + 5, y - h - 8); c.lineTo(x, y - h - 6); c.closePath(); fillStroke(c, WHITE, 1);
      c.beginPath(); c.rect(x - 4, y - 9, 8, 9); fillStroke(c, B('#999999', '#8a5a32'), 1.4);
      c.beginPath(); c.rect(x - 15, y - h - 24, 30, 9); fillStroke(c, B('#111111', '#3b7a3a'), 1);
      c.fillStyle = WHITE; c.font = 'bold 7px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('LEARN', x, y - h - 19.3);
      line(c, x, y - h - 15, x, y - h - 12, 1.2, INK);
    },

    litter(c, x, y, n, seed) {
      for (let i = 0; i < Math.min(n, 4); i++) {
        const px = x + (rnd(seed + i) - 0.5) * 18, py = y + (rnd(seed + i + 5) - 0.5) * 14;
        c.beginPath(); c.moveTo(px - 2.5, py); c.lineTo(px, py - 2.5); c.lineTo(px + 3, py - 0.5); c.lineTo(px + 1, py + 2); c.closePath();
        c.fillStyle = i % 2 ? INK : WHITE; c.fill(); c.lineWidth = 0.9; c.strokeStyle = INK; c.stroke();
      }
    },

    poop(c, x, y, n, seed) {
      for (let i = 0; i < Math.min(n, 4); i++) {
        const px = x + (rnd(seed + i * 3) - 0.5) * 18, py = y + (rnd(seed + i * 3 + 1) - 0.5) * 14;
        c.fillStyle = '#4a4a4a';
        ell(c, px, py, 3.2, 1.8); c.fill(); ell(c, px + 0.5, py - 1.8, 2.2, 1.4); c.fill(); ell(c, px + 0.8, py - 3.2, 1.2, 1); c.fill();
      }
    },

    entrance(c, x, y, T) {
      const w = T * 1.6;
      [-1, 1].forEach(s => {
        c.beginPath(); c.rect(x + s * w / 2 - 4, y - 34, 8, 34); fillStroke(c, B('#ffffff', '#eedfc2'), 2);
        c.beginPath(); c.rect(x + s * w / 2 - 5.5, y - 38, 11, 5); fillStroke(c, B('#111111', '#7a4a2a'), 1);
      });
      c.beginPath(); c.rect(x - w / 2 - 6, y - 50, w + 12, 13); fillStroke(c, B('#111111', '#2f7a3a'), 2);
      c.fillStyle = WHITE; c.font = 'bold 9px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('3D ZOO', x, y - 43.2);
    },

    // People are tiny figures with swinging arms and legs. view: 'side', 'front' or 'back'.
    person(c, x, y, ph, facing, look, moving = true, view = 'side') {
      if (view !== 'side') return Art.personFB(c, x, y, ph, look, moving, view === 'front');
      const k = look.kid ? 0.72 : 1;
      c.save(); c.translate(x, y); c.scale(k * facing, k);
      const sw = moving ? Math.sin(ph) * 0.55 : 0;
      Art.shadow(c, 0, 0, 5);
      const leg = (a, col) => { line(c, 0, -9, Math.sin(a) * 9, -9 + Math.cos(a) * 9, 2.6, INK); };
      leg(-sw); leg(sw);
      // arm behind
      line(c, 0, -16, -Math.sin(sw) * 6, -16 + Math.cos(sw) * 6, 2.2, INK);
      // body
      c.beginPath();
      if (look.dress) { c.moveTo(-3, -17); c.lineTo(3, -17); c.lineTo(5, -8); c.lineTo(-5, -8); c.closePath(); }
      else { c.rect(-3.5, -17.5, 7, 9.5); }
      fillStroke(c, look.shirt, 1.4);
      if (look.role === 'keeper') { c.beginPath(); c.moveTo(-3.5, -14); c.lineTo(3.5, -14); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); }
      // arm in front, maybe holding a tool
      const ax = Math.sin(sw) * 6, ay = -16 + Math.cos(sw) * 6;
      line(c, 0, -16, ax, ay, 2.2, INK);
      if (look.role === 'janitor') {
        line(c, ax - 1, ay - 7, ax + 5, ay + 9, 1.6, '#555');
        c.beginPath(); c.moveTo(ax + 2, ay + 8); c.lineTo(ax + 9, ay + 7); c.lineTo(ax + 7, ay + 12); c.closePath(); fillStroke(c, '#bbb', 1);
      } else if (look.role === 'keeper') {
        c.beginPath(); c.moveTo(ax - 2.5, ay); c.lineTo(ax + 2.5, ay); c.lineTo(ax + 2, ay + 5); c.lineTo(ax - 2, ay + 5); c.closePath(); fillStroke(c, '#999', 1);
      }
      // head + hair/hat
      ell(c, 0.5, -21.5, 3.6, 3.6); fillStroke(c, WHITE, 1.4);
      ell(c, 2, -22, 0.6, 0.6); c.fillStyle = INK; c.fill();
      if (look.hat === 'cap') { c.beginPath(); c.arc(0.5, -22.5, 3.8, Math.PI, 0); c.lineTo(6, -22.5); c.closePath(); c.fillStyle = INK; c.fill(); }
      else if (look.hat === 'safari') { c.beginPath(); c.arc(0.5, -23, 3.6, Math.PI, 0); c.closePath(); fillStroke(c, '#ddd', 1.2); line(c, -5, -23, 6, -23, 1.6, INK); }
      else if (look.hat === 'hair') { c.beginPath(); c.arc(0.3, -22.5, 3.9, Math.PI * 0.9, Math.PI * 1.9); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); }
      else if (look.hat === 'bun') { ell(c, -3, -24.5, 2, 2); c.fillStyle = INK; c.fill(); c.beginPath(); c.arc(0.3, -22.5, 3.9, Math.PI * 0.9, Math.PI * 1.9); c.lineWidth = 2; c.stroke(); }
      c.restore();
    },

    // A person seen from the front (walking toward the camera) or from behind.
    personFB(c, x, y, ph, look, moving, front) {
      const k = look.kid ? 0.72 : 1;
      c.save(); c.translate(x, y); c.scale(k, k);
      Art.shadow(c, 0, 0, 5);
      const step = s => (moving ? Math.max(0, Math.sin(ph + (s > 0 ? Math.PI : 0))) * 2.5 : 0);
      [-1, 1].forEach(s => line(c, s * 1.8, -9, s * 1.8, -step(s), 2.6, INK));
      // body
      c.beginPath();
      if (look.dress) { c.moveTo(-3.5, -17); c.lineTo(3.5, -17); c.lineTo(5.5, -8); c.lineTo(-5.5, -8); c.closePath(); }
      else c.rect(-4.5, -17.5, 9, 9.5);
      fillStroke(c, look.shirt, 1.4);
      if (look.role === 'keeper') line(c, -4.5, -14, 4.5, -14, 1, INK);
      // arms swing forward and back, which from here looks like a small up-and-down
      [-1, 1].forEach(s => {
        const sw = moving ? Math.sin(ph + (s > 0 ? 0 : Math.PI)) * 1.5 : 0;
        line(c, s * 4.8, -16.5, s * 5.6, -10.5 - sw, 2.2, INK);
      });
      if (look.role === 'janitor') {
        line(c, 6, -18, 6.5, -2, 1.6, '#555');
        c.beginPath(); c.moveTo(3.5, -2); c.lineTo(9.5, -2); c.lineTo(8, 1); c.lineTo(5, 1); c.closePath(); fillStroke(c, '#bbb', 1);
      } else if (look.role === 'keeper') {
        c.beginPath(); c.moveTo(-8, -10); c.lineTo(-3.5, -10); c.lineTo(-4, -5.5); c.lineTo(-7.5, -5.5); c.closePath(); fillStroke(c, '#999', 1);
      }
      // head + hair/hat
      ell(c, 0, -21.5, 3.6, 3.6); fillStroke(c, WHITE, 1.4);
      const dark = (a0, a1) => { c.beginPath(); c.arc(0, -21.5, 3.8, a0, a1); c.closePath(); c.fillStyle = INK; c.fill(); };
      if (front) { [-1.3, 1.3].forEach(ex => { ell(c, ex, -21.5, 0.6, 0.6); c.fillStyle = INK; c.fill(); }); }
      if (look.hat === 'cap') { dark(Math.PI, 0); if (front) line(c, -4, -21.6, 4, -21.6, 1.6, INK); }
      else if (look.hat === 'safari') { c.beginPath(); c.arc(0, -23, 3.6, Math.PI, 0); c.closePath(); fillStroke(c, '#ddd', 1.2); line(c, -5.5, -23, 5.5, -23, 1.6, INK); }
      else if (look.hat === 'hair' || look.hat === 'bun') {
        if (front) { c.beginPath(); c.arc(0, -21.8, 3.9, Math.PI * 1.05, Math.PI * 1.95); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke(); }
        else dark(Math.PI * 0.9, Math.PI * 2.1);
        if (look.hat === 'bun') { ell(c, 0, -26, 2, 2); c.fillStyle = INK; c.fill(); }
      }
      c.restore();
    },

    randomGuestLook() {
      const r = Math.random;
      return {
        kid: r() < 0.25,
        shirt: ['#fff', '#ddd', '#aaa', '#777', '#444'][Math.floor(r() * 5)],
        dress: r() < 0.25,
        hat: ['none', 'cap', 'hair', 'bun', 'hair'][Math.floor(r() * 5)],
      };
    },
    staffLook(role) {
      return role === 'janitor'
        ? { shirt: '#555', hat: 'cap', role: 'janitor' }
        : { shirt: '#eee', hat: 'safari', role: 'keeper' };
    },
    rnd, tint, mix,
  };

  global.ZooArt = Art;
})(window);
