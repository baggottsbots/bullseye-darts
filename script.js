(function() {
  'use strict';
  const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const SECTOR_ANGLE = 18;
  const CENTER = 250;
  const R_DOUBLE = 200;
  const R_DOUBLE_IN = 185;
  const R_TRIPLE = 125;
  const R_TRIPLE_IN = 110;
  const R_BULL_OUTER = 22;
  const R_BULL = 10;

  const COLOR_BG_A = '#0e0e0e';
  const COLOR_BG_B = '#f4f1de';
  const COLOR_ACC_A = '#E63946';
  const COLOR_ACC_B = '#1e6b3e';

  const sectorsG = document.getElementById('sectors');
  const spiderG = document.getElementById('spider');
  const numberRing = document.getElementById('numberRing');

  function polar(r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
  }
  function arcPath(r1, r2, startDeg, endDeg) {
    const p1 = polar(r2, startDeg);
    const p2 = polar(r2, endDeg);
    const p3 = polar(r1, endDeg);
    const p4 = polar(r1, startDeg);
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
    return 'M ' + p1.x + ' ' + p1.y + ' A ' + r2 + ' ' + r2 + ' 0 ' + largeArc + ' 1 ' + p2.x + ' ' + p2.y + ' L ' + p3.x + ' ' + p3.y + ' A ' + r1 + ' ' + r1 + ' 0 ' + largeArc + ' 0 ' + p4.x + ' ' + p4.y + ' Z';
  }

  for (let i = 0; i < 20; i++) {
    const startDeg = i * SECTOR_ANGLE - 9;
    const endDeg = startDeg + SECTOR_ANGLE;
    const isAlt = i % 2 === 0;
    const baseColor = isAlt ? COLOR_BG_A : COLOR_BG_B;
    const accentColor = isAlt ? COLOR_ACC_A : COLOR_ACC_B;
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_TRIPLE, R_DOUBLE_IN, startDeg, endDeg) + '" fill="' + baseColor + '"/>');
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_DOUBLE_IN, R_DOUBLE, startDeg, endDeg) + '" fill="' + accentColor + '"/>');
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_BULL_OUTER, R_TRIPLE_IN, startDeg, endDeg) + '" fill="' + baseColor + '"/>');
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_TRIPLE_IN, R_TRIPLE, startDeg, endDeg) + '" fill="' + accentColor + '"/>');
    const outer = polar(R_DOUBLE, startDeg);
    const inner = polar(R_BULL_OUTER, startDeg);
    spiderG.insertAdjacentHTML('beforeend', '<line x1="' + inner.x + '" y1="' + inner.y + '" x2="' + outer.x + '" y2="' + outer.y + '"/>');
    const numPos = polar(220, startDeg + SECTOR_ANGLE / 2);
    numberRing.insertAdjacentHTML('beforeend', '<text x="' + numPos.x + '" y="' + (numPos.y + 6) + '">' + NUMBERS[i] + '</text>');
  }

  function scoreAt(xPct, yPct) {
    const x = xPct * 500 - CENTER;
    const y = yPct * 500 - CENTER;
    const r = Math.sqrt(x * x + y * y);
    if (r > R_DOUBLE) return { points: 0, label: 'MISS', type: 'miss' };
    if (r <= R_BULL) return { points: 50, label: 'BULLSEYE', type: 'bullseye' };
    if (r <= R_BULL_OUTER) return { points: 25, label: '25 BULL', type: 'bull' };
    let angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    const shifted = (angle + 9) % 360;
    const idx = Math.floor(shifted / SECTOR_ANGLE) % 20;
    const number = NUMBERS[idx];
    if (r >= R_DOUBLE_IN && r <= R_DOUBLE) return { points: number * 2, label: 'DOUBLE ' + number, type: 'double' };
    if (r >= R_TRIPLE_IN && r <= R_TRIPLE) return { points: number * 3, label: 'TRIPLE ' + number, type: 'triple' };
    return { points: number, label: '' + number, type: 'single' };
  }

  const state = { score: 0, dartsLeft: 5, totalDarts: 5, playing: false, combo: 0, bestScore: 0 };
  try { state.bestScore = parseInt(localStorage.getItem('bullseye_best') || '0', 10); } catch(e){}

  const scoreEl = document.getElementById('score');
  const dartsLeftEl = document.getElementById('dartsLeft');
  const boardWrap = document.getElementById('boardWrap');
  const board = document.getElementById('board');
  const comboFlash = document.getElementById('comboFlash');
  const instruction = document.getElementById('instruction');

  function updateHUD() {
    scoreEl.textContent = state.score;
    const pips = dartsLeftEl.querySelectorAll('.dart-pip');
    pips.forEach((pip, i) => { pip.classList.toggle('used', i >= state.dartsLeft); });
  }

  const track = document.getElementById('throwTrack');
  const handle = document.getElementById('dartHandle');

  let throwState = { active: false, startX: 0, startY: 0, startTime: 0, currentX: 0, currentY: 0, aimOffset: 0 };

  function setAim(offset) {
    throwState.aimOffset = Math.max(-1, Math.min(1, offset));
    const trackW = track.offsetWidth;
    const maxShift = trackW / 2 - 30;
    handle.style.left = 'calc(50% + ' + (throwState.aimOffset * maxShift) + 'px)';
  }
  function resetHandle() {
    throwState.aimOffset = 0;
    handle.style.left = '50%';
    handle.style.top = '50%';
    track.classList.remove('charging');
  }

  function onStart(e) {
    if (!state.playing || state.dartsLeft <= 0) return;
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    throwState.active = true;
    throwState.startX = t.clientX;
    throwState.startY = t.clientY;
    throwState.currentX = t.clientX;
    throwState.currentY = t.clientY;
    throwState.startTime = performance.now();
    track.classList.add('charging');
    instruction.classList.add('active');
    instruction.textContent = 'AIM & RELEASE';
  }

  function onMove(e) {
    if (!throwState.active) return;
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    throwState.currentX = t.clientX;
    throwState.currentY = t.clientY;
    const dx = t.clientX - throwState.startX;
    const trackW = track.offsetWidth;
    setAim(dx / (trackW * 0.45));
    const dy = Math.max(-20, Math.min(0, t.clientY - throwState.startY));
    handle.style.top = 'calc(50% + ' + (-dy * 0.4) + 'px)';
  }

  function onEnd(e) {
    if (!throwState.active) return;
    e.preventDefault();
    throwState.active = false;
    const dx = throwState.currentX - throwState.startX;
    const dy = throwState.currentY - throwState.startY;
    const dt = Math.max(60, performance.now() - throwState.startTime);
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt * 1000;
    if (dy > -30 || velocity < 200) {
      instruction.classList.remove('active');
      instruction.textContent = 'SWIPE UP FASTER';
      resetHandle();
      return;
    }
    throwDart(dx, dy, velocity);
    resetHandle();
  }

  function throwDart(dx, dy, velocity) {
    state.dartsLeft--;
    updateHUD();
    const targetAngle = Math.atan2(dy, dx);
    const idealAngle = -Math.PI / 2;
    const angleErr = Math.abs(targetAngle - idealAngle);
    const velSweet = 750;
    const velScore = Math.max(0, 1 - Math.abs(velocity - velSweet) / velSweet);
    const angleScore = Math.max(0, 1 - angleErr / 0.6);
    const accuracy = velScore * 0.5 + angleScore * 0.5;
    const aimX = throwState.aimOffset;
    const spread = (1 - accuracy) * 0.5 + 0.04;
    const randX = (Math.random() - 0.5) * spread * 2;
    const randY = (Math.random() - 0.5) * spread * 2;
    const targetX = 0.5 + aimX * 0.25;
    const targetY = 0.5;
    let bx = targetX + randX;
    let by = targetY + randY;
    bx = Math.max(-0.05, Math.min(1.05, bx));
    by = Math.max(-0.05, Math.min(1.05, by));
    const result = scoreAt(bx, by);

    const rect = board.getBoundingClientRect();
    const wrapRect = boardWrap.getBoundingClientRect();
    const hitX = rect.left - wrapRect.left + bx * rect.width;
    const hitY = rect.top - wrapRect.top + by * rect.height;

    const dartEl = document.createElement('div');
    dartEl.className = 'dart-hit';
    dartEl.style.left = hitX + 'px';
    dartEl.style.top = hitY + 'px';
    const gid = 'dg' + Date.now() + Math.random().toString(36).slice(2, 6);
    dartEl.innerHTML = '<svg viewBox="0 0 28 28"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F4F1DE"/><stop offset="100%" stop-color="#999"/></linearGradient></defs><path d="M 20 4 L 26 2 L 24 8 L 28 6 L 22 12 Z" fill="#36D6B5" stroke="#0a0a0a" stroke-width="0.5"/><line x1="22" y1="6" x2="8" y2="20" stroke="url(#' + gid + ')" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="14" x2="10" y2="18" stroke="#2a2a2a" stroke-width="4" stroke-linecap="round"/><circle cx="7" cy="21" r="1.5" fill="#E63946"/></svg>';
    boardWrap.appendChild(dartEl);

    const popup = document.createElement('div');
    popup.className = 'popup ' + result.type;
    popup.style.left = hitX + 'px';
    popup.style.top = hitY + 'px';
    popup.textContent = result.points > 0 ? '+' + result.points : 'MISS';
    boardWrap.appendChild(popup);
    setTimeout(() => popup.remove(), 1100);

    state.score += result.points;

    if (result.type === 'bullseye') {
      state.combo++;
      showCombo('BULLSEYE!');
      shakeScreen();
      vibrate([30, 30, 60]);
    } else if (result.type === 'triple' || result.type === 'double') {
      state.combo++;
      if (state.combo >= 2) showCombo(state.combo + 'x COMBO');
      vibrate(40);
    } else if (result.type === 'miss') {
      state.combo = 0;
      vibrate(10);
    } else {
      vibrate(20);
    }

    instruction.classList.remove('active');
    instruction.textContent = result.label;
    updateHUD();

    if (state.dartsLeft <= 0) {
      setTimeout(endGame, 1200);
    } else {
      setTimeout(() => { instruction.textContent = 'SWIPE UP TO THROW'; }, 1400);
    }
  }

  function showCombo(text) {
    comboFlash.textContent = text;
    comboFlash.classList.remove('show');
    void comboFlash.offsetWidth;
    comboFlash.classList.add('show');
  }
  function shakeScreen() {
    boardWrap.classList.remove('shake');
    void boardWrap.offsetWidth;
    boardWrap.classList.add('shake');
  }
  function vibrate(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch(e){} }
  }

  track.addEventListener('touchstart', onStart, { passive: false });
  track.addEventListener('touchmove', onMove, { passive: false });
  track.addEventListener('touchend', onEnd, { passive: false });
  track.addEventListener('touchcancel', onEnd, { passive: false });
  track.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  function startGame() {
    state.score = 0;
    state.dartsLeft = state.totalDarts;
    state.combo = 0;
    state.playing = true;
    boardWrap.querySelectorAll('.dart-hit, .popup').forEach(el => el.remove());
    updateHUD();
    document.getElementById('introOverlay').classList.add('hidden');
    document.getElementById('gameOverOverlay').classList.add('hidden');
    instruction.textContent = 'SWIPE UP TO THROW';
  }

  function endGame() {
    state.playing = false;
    const gameOver = document.getElementById('gameOverOverlay');
    document.getElementById('finalScore').textContent = state.score;
    let rating, eyebrow;
    if (state.score >= 200) { rating = 'LEGENDARY'; eyebrow = 'DART GOD'; }
    else if (state.score >= 150) { rating = 'PRO'; eyebrow = 'ELITE'; }
    else if (state.score >= 100) { rating = 'SHARP'; eyebrow = 'SOLID ROUND'; }
    else if (state.score >= 60) { rating = 'DECENT'; eyebrow = 'ROUND COMPLETE'; }
    else if (state.score >= 30) { rating = 'ROOKIE'; eyebrow = 'KEEP PRACTICING'; }
    else { rating = 'OOF'; eyebrow = 'TRY AGAIN'; }
    document.getElementById('rating').textContent = rating;
    document.getElementById('gameOverEyebrow').textContent = eyebrow;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      try { localStorage.setItem('bullseye_best', state.bestScore); } catch(e){}
      document.getElementById('bestScore').textContent = 'NEW PERSONAL BEST!';
      document.getElementById('bestScore').style.color = '#36D6B5';
    } else {
      document.getElementById('bestScore').textContent = 'BEST: ' + state.bestScore;
      document.getElementById('bestScore').style.color = '#FFB800';
    }
    gameOver.classList.remove('hidden');
  }

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('playAgainBtn').addEventListener('click', startGame);
  document.getElementById('shareBtn').addEventListener('click', () => {
    const text = 'I scored ' + state.score + ' in BULLSEYE by Chatbot King. Think you can beat me?';
    if (navigator.share) {
      navigator.share({ title: 'BULLSEYE', text: text, url: window.location.href }).catch(()=>{});
    } else {
      try {
        navigator.clipboard.writeText(text + ' ' + window.location.href);
        document.getElementById('shareBtn').textContent = 'COPIED!';
        setTimeout(() => { document.getElementById('shareBtn').textContent = 'SHARE SCORE'; }, 1500);
      } catch(e){}
    }
  });

  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  updateHUD();
})();