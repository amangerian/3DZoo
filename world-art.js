/* 3D Zoo — world art: scenery, people, and ground details (black & white).
   All functions draw at world-pixel scale with (x, y) = ground point. */
(function (global) {
  const INK = '#111', WHITE = '#fff';

  function ell(c, x, y, rx, ry, r = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); }
  function fillStroke(c, fill, lw = 1.6) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
  function line(c, x1, y1, x2, y2, w, col = INK) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke();
  }
  // Small deterministic random from a seed, so scenery doesn't flicker.
  function rnd(seed) { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  const Art = {
    shadow(c, x, y, rx) { ell(c, x, y, rx, rx * 0.32); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fill(); },

    tree(c, x, y, seed = 0) {
      Art.shadow(c, x, y, 13);
      c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 2, y - 16); c.lineTo(x + 2, y - 16); c.lineTo(x + 3, y); c.closePath();
      fillStroke(c, '#777');
      const blobs = [[-8, -24, 9], [8, -24, 9], [0, -33, 11], [-3, -22, 9], [5, -30, 8]];
      c.lineWidth = 3.2; c.strokeStyle = INK;
      blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.stroke(); });
      c.fillStyle = WHITE; blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.fill(); });
      c.strokeStyle = '#999'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const a = rnd(seed + i) * 6.28, rr = 4 + rnd(seed + i + 9) * 9;
        const px = x + Math.cos(a) * rr, py = y - 27 + Math.sin(a) * rr * 0.8;
        c.beginPath(); c.arc(px, py, 2.4, 0.2, 2.6); c.stroke();
      }
    },

    bush(c, x, y, seed = 0) {
      Art.shadow(c, x, y, 11);
      const blobs = [[-6, -5, 6], [6, -5, 6], [0, -9, 7]];
      c.lineWidth = 3.2; c.strokeStyle = INK;
      blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.stroke(); });
      c.fillStyle = '#e6e6e6'; blobs.forEach(([dx, dy, r]) => { ell(c, x + dx, y + dy, r, r); c.fill(); });
      [[-5, -7], [4, -9], [1, -4]].forEach(([dx, dy]) => { ell(c, x + dx, y + dy, 1.1, 1.1); c.fillStyle = '#555'; c.fill(); });
    },

    // Water is flat on the ground; drawn in the ground pass, sized to its tile.
    water(c, x, y, T, t) {
      const r = T * 0.52;
      c.beginPath();
      for (let k = 0; k <= 16; k++) {
        const a = (k / 16) * Math.PI * 2, rr = r * (0.9 + 0.1 * Math.sin(a * 3 + x));
        c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82);
      }
      c.closePath(); fillStroke(c, '#b4b4b4', 2);
      c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.lineCap = 'round';
      [[-7, -4], [3, -5], [-2, 4], [7, 3]].forEach(([dx, dy], i) => {
        const ox = Math.sin(t * 1.2 + i * 1.7) * 1.5, px = x + dx + ox, py = y + dy;
        c.beginPath(); c.moveTo(px - 4, py); c.quadraticCurveTo(px - 2, py - 2, px, py); c.quadraticCurveTo(px + 2, py + 2, px + 4, py); c.stroke();
      });
    },

    toy(c, x, y, t = 0) {
      Art.shadow(c, x, y, 7);
      const bob = Math.abs(Math.sin(t * 1.5)) * 0;
      ell(c, x, y - 6 - bob, 6, 6); fillStroke(c, WHITE, 1.8);
      c.save(); ell(c, x, y - 6 - bob, 6, 6); c.clip();
      c.fillStyle = INK; c.beginPath(); c.moveTo(x - 7, y - 9); c.quadraticCurveTo(x, y - 4, x + 7, y - 9);
      c.lineTo(x + 7, y - 6); c.quadraticCurveTo(x, y - 1, x - 7, y - 6); c.closePath(); c.fill();
      c.restore();
      ell(c, x - 2, y - 9 - bob, 1.4, 1); c.fillStyle = WHITE; c.fill();
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
        c.beginPath(); c.rect(x + s * w / 2 - 4, y - 34, 8, 34); fillStroke(c, WHITE, 2);
        c.beginPath(); c.rect(x + s * w / 2 - 5.5, y - 38, 11, 5); fillStroke(c, INK, 1);
      });
      c.beginPath(); c.rect(x - w / 2 - 6, y - 50, w + 12, 13); fillStroke(c, INK, 2);
      c.fillStyle = WHITE; c.font = 'bold 9px "Courier New", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('3D ZOO', x, y - 43.2);
    },

    // People are tiny side-view figures with swinging arms and legs.
    person(c, x, y, ph, facing, look, moving = true) {
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
    rnd,
  };

  global.ZooArt = Art;
})(window);
