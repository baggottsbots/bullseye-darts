(function() {
  'use strict';
  const Audio = (function() {
    let ctx = null, masterGain = null, muted = false, ready = false;
    try { muted = localStorage.getItem('bullseye_muted') === '1'; } catch(e){}
    function init() {
      if (ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : 0.6;
        masterGain.connect(ctx.destination);
        ready = true;
      } catch(e) { ready = false; }
    }
    function resume() { if (!ctx) init(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{}); }
    function setMuted(m) {
      muted = m;
      try { localStorage.setItem('bullseye_muted', m ? '1' : '0'); } catch(e){}
      if (masterGain) {
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(m ? 0 : 0.6, ctx.currentTime + 0.05);
      }
    }
    function isMuted() { return muted; }
    function noiseBuffer(duration, color) {
      const len = Math.floor(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      if (color === 'white') { for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; }
      else {
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
          b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
          b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
          data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
          b6 = w*0.115926;
        }
      }
      return buf;
    }
    function whoosh(velocity) {
      if (!ready || muted) return;
      const t = ctx.currentTime, dur = 0.22;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(dur, 'white');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = 800 + velocity * 0.8;
      filter.frequency.setValueAtTime(startFreq, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(200, startFreq * 0.25), t + dur);
      filter.Q.value = 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filter); filter.connect(g); g.connect(masterGain);
      src.start(t); src.stop(t + dur);
    }
    function thud(intensity) {
      if (!ready || muted) return;
      const t = ctx.currentTime, dur = 0.12;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const baseFreq = 80 + intensity * 40;
      osc.frequency.setValueAtTime(baseFreq * 2.5, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + dur);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.5 + intensity * 0.3, t + 0.008);
      og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(og); og.connect(masterGain);
      osc.start(t); osc.stop(t + dur);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer(0.05, 'white');
      const nfilt = ctx.createBiquadFilter();
      nfilt.type = 'highpass'; nfilt.frequency.value = 3000;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(nfilt); nfilt.connect(ng); ng.connect(masterGain);
      noise.start(t); noise.stop(t + 0.05);
    }
    function bullseye() {
      if (!ready || muted) return;
      const t = ctx.currentTime;
      thud(1);
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const start = t + 0.05 + i * 0.07, dur = 0.45;
        const osc = ctx.createOscillator();
        osc.type = 'triangle'; osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.22, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine'; osc2.frequency.value = freq * 2;
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0, start);
        g2.gain.linearRampToValueAtTime(0.08, start + 0.02);
        g2.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(g); g.connect(masterGain);
        osc2.connect(g2); g2.connect(masterGain);
        osc.start(start); osc.stop(start + dur);
        osc2.start(start); osc2.stop(start + dur);
      });
    }
    function chime(type) {
      if (!ready || muted) return;
      const t = ctx.currentTime;
      let freqs;
      if (type === 'triple') freqs = [659.25, 987.77];
      else if (type === 'double') freqs = [523.25, 783.99];
      else if (type === 'bull') freqs = [783.99, 1046.50];
      else freqs = [523.25];
      freqs.forEach((freq, i) => {
        const start = t + i * 0.04, dur = 0.25;
        const osc = ctx.createOscillator();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, start);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.18, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(g); g.connect(masterGain);
        osc.start(start); osc.stop(start + dur);
      });
    }
    function combo(level) {
      if (!ready || muted) return;
      const t = ctx.currentTime;
      const base = 440 * Math.pow(1.06, Math.min(level, 8));
      const steps = [0, 4, 7, 12].map(s => base * Math.pow(2, s/12));
      steps.forEach((freq, i) => {
        const start = t + i * 0.06, dur = 0.3;
        const osc = ctx.createOscillator();
        osc.type = 'square'; osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.08, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 2500;
        osc.connect(filter); filter.connect(g); g.connect(masterGain);
        osc.start(start); osc.stop(start + dur);
      });
    }
    function miss() {
      if (!ready || muted) return;
      const t = ctx.currentTime, dur = 0.35;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + dur);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.25, 'pink');
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 1;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.15, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      src.connect(f); f.connect(ng); ng.connect(masterGain);
      src.start(t); src.stop(t + 0.25);
    }
    function tick() {
      if (!ready || muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(g); g.connect(masterGain);
      osc.start(t); osc.stop(t + 0.05);
    }
    let chargeOsc = null, chargeGain = null;
    function chargeStart() {
      if (!ready || muted) return;
      if (chargeOsc) chargeStop();
      const t = ctx.currentTime;
      chargeOsc = ctx.createOscillator();
      chargeOsc.type = 'sawtooth';
      chargeOsc.frequency.setValueAtTime(80, t);
      chargeGain = ctx.createGain();
      chargeGain.gain.setValueAtTime(0, t);
      chargeGain.gain.linearRampToValueAtTime(0.05, t + 0.1);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 400;
      chargeOsc.connect(filter); filter.connect(chargeGain); chargeGain.connect(masterGain);
      chargeOsc.start(t);
    }
    function chargeStop() {
      if (!chargeOsc || !chargeGain) return;
      const t = ctx.currentTime;
      chargeGain.gain.cancelScheduledValues(t);
      chargeGain.gain.setValueAtTime(chargeGain.gain.value, t);
      chargeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      chargeOsc.stop(t + 0.1);
      chargeOsc = null; chargeGain = null;
    }
    function gameOver(score) {
      if (!ready || muted) return;
      const t = ctx.currentTime;
      const isGood = score >= 100;
      const notes = isGood ? [523.25, 659.25, 783.99, 1046.50, 1318.51] : [392.00, 466.16, 523.25];
      notes.forEach((freq, i) => {
        const start = t + i * 0.12, dur = 0.6;
        const osc = ctx.createOscillator();
        osc.type = 'triangle'; osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.2, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(g); g.connect(masterGain);
        osc.start(start); osc.stop(start + dur);
      });
    }
    return { init, resume, setMuted, isMuted, whoosh, thud, bullseye, chime, combo, miss, tick, chargeStart, chargeStop, gameOver };
  })();

  const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const SECTOR_ANGLE = 18, CENTER = 250, R_DOUBLE = 200, R_DOUBLE_IN = 185, R_TRIPLE = 125, R_TRIPLE_IN = 110, R_BULL_OUTER = 22, R_BULL = 10;
  const COLOR_BG_A = '#0e0e0e', COLOR_BG_B = '#f4f1de', COLOR_ACC_A = '#E63946', COLOR_ACC_B = '#1e6b3e';
  const sectorsG = document.getElementById('sectors'), spiderG = document.getElementById('spider'), numberRing = document.getElementById('numberRing');

  function polar(r, deg) { const rad = (deg - 90) * Math.PI / 180; return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) }; }
  function arcPath(r1, r2, startDeg, endDeg) {
    const p1 = polar(r2, startDeg), p2 = polar(r2, endDeg), p3 = polar(r1, endDeg), p4 = polar(r1, startDeg);
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
    return 'M ' + p1.x + ' ' + p1.y + ' A ' + r2 + ' ' + r2 + ' 0 ' + largeArc + ' 1 ' + p2.x + ' ' + p2.y + ' L ' + p3.x + ' ' + p3.y + ' A ' + r1 + ' ' + r1 + ' 0 ' + largeArc + ' 0 ' + p4.x + ' ' + p4.y + ' Z';
  }
  for (let i = 0; i < 20; i++) {
    const startDeg = i * SECTOR_ANGLE - 9, endDeg = startDeg + SECTOR_ANGLE;
    const isAlt = i % 2 === 0;
    const baseColor = isAlt ? COLOR_BG_A : COLOR_BG_B, accentColor = isAlt ? COLOR_ACC_A : COLOR_ACC_B;
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_TRIPLE, R_DOUBLE_IN, startDeg, endDeg) + '" fill="' + baseColor + '"/>');
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_DOUBLE_IN, R_DOUBLE, startDeg, endDeg) + '" fill="' + accentColor + '"/>');
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_BULL_OUTER, R_TRIPLE_IN, startDeg, endDeg) + '" fill="' + baseColor + '"/>');
    sectorsG.insertAdjacentHTML('beforeend', '<path d="' + arcPath(R_TRIPLE_IN, R_TRIPLE, startDeg, endDeg) + '" fill="' + accentColor + '"/>');
    const outer = polar(R_DOUBLE, startDeg), inner = polar(R_BULL_OUTER, startDeg);
    spiderG.insertAdjacentHTML('beforeend', '<line x1="' + inner.x + '" y1="' + inner.y + '" x2="' + outer.x + '" y2="' + outer.y + '"/>');
    const numPos = polar(220, startDeg + SECTOR_ANGLE / 2);
    numberRing.insertAdjacentHTML('beforeend', '<text x="' + numPos.x + '" y="' + (numPos.y + 6) + '">' + NUMBERS[i] + '</text>');
  }

  function scoreAt(xPct, yPct) {
    const x = xPct * 500 - CENTER, y = yPct * 500 - CENTER;
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

  const scoreEl = document.getElementById('score'), dartsLeftEl = document.getElementById('dartsLeft');
  const boardWrap = document.getElementById('boardWrap'), board = document.getElementById('board');
  const comboFlash = document.getElementById('comboFlash'), instruction = document.getElementById('instruction');

  function updateHUD() {
    scoreEl.textContent = state.score;
    const pips = dartsLeftEl.querySelectorAll('.dart-pip');
    pips.forEach((pip, i) => { pip.classList.toggle('used', i >= state.dartsLeft); });
  }

  const soundBtn = document.getElementById('soundBtn');
  const soundIconOn = document.getElementById('soundIconOn'), soundIconOff = document.getElementById('soundIconOff');
  function refreshSoundIcon() {
    const m = Audio.isMuted();
    soundIconOn.style.display = m ? 'none' : 'block';
    soundIconOff.style.display = m ? 'block' : 'none';
    soundBtn.classList.toggle('muted', m);
  }
  refreshSoundIcon();
  soundBtn.addEventListener('click', () => {
    Audio.init(); Audio.resume();
    Audio.setMuted(!Audio.isMuted());
    refreshSoundIcon();
    if (!Audio.isMuted()) Audio.tick();
  });

  const track = document.getElementById('throwTrack'), handle = document.getElementById('dartHandle');
  let throwState = { active: false, startX: 0, startY: 0, startTime: 0, currentX: 0, currentY: 0, aimOffset: 0 };

  function setAim(offset) {
    const prev = throwState.aimOffset;
    throwState.aimOffset = Math.max(-1, Math.min(1, offset));
    const trackW = track.offsetWidth, maxShift = trackW / 2 - 30;
    handle.style.left = 'calc(50% + ' + (throwState.aimOffset * maxShift) + 'px)';
    if (Math.abs(throwState.aimOffset - prev) > 0.18) Audio.tick();
  }
  function resetHandle() {
    throwState.aimOffset = 0;
    handle.style.left = '50%'; handle.style.top = '50%';
    track.classList.remove('charging');
    Audio.chargeStop();
  }

  function onStart(e) {
    if (!state.playing || state.dartsLeft <= 0) return;
    e.preventDefault();
    Audio.resume();
    const t = e.touches ? e.touches[0] : e;
    throwState.active = true;
    throwState.startX = t.clientX; throwState.startY = t.clientY;
    throwState.currentX = t.clientX; throwState.currentY = t.clientY;
    throwState.startTime = performance.now();
    track.classList.add('charging');
    instruction.classList.add('active');
    instruction.textContent = 'AIM & RELEASE';
    Audio.chargeStart();
  }
  function onMove(e) {
    if (!throwState.active) return;
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    throwState.currentX = t.clientX; throwState.currentY = t.clientY;
    const dx = t.clientX - throwState.startX, trackW = track.offsetWidth;
    setAim(dx / (trackW * 0.45));
    const dy = Math.max(-20, Math.min(0, t.clientY - throwState.startY));
    handle.style.top = 'calc(50% + ' + (-dy * 0.4) + 'px)';
  }
  function onEnd(e) {
    if (!throwState.active) return;
    e.preventDefault();
    throwState.active = false;
    const dx = throwState.currentX - throwState.startX, dy = throwState.currentY - throwState.startY;
    const dt = Math.max(60, performance.now() - throwState.startTime);
    const velocity = Math.sqrt(dx * dx + dy * dy) / dt * 1000;
    Audio.chargeStop();
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
    Audio.whoosh(velocity);
    const targetAngle = Math.atan2(dy, dx), idealAngle = -Math.PI / 2;
    const angleErr = Math.abs(targetAngle - idealAngle);
    const velSweet = 750;
    const velScore = Math.max(0, 1 - Math.abs(velocity - velSweet) / velSweet);
    const angleScore = Math.max(0, 1 - angleErr / 0.6);
    const accuracy = velScore * 0.5 + angleScore * 0.5;
    const aimX = throwState.aimOffset;
    const spread = (1 - accuracy) * 0.5 + 0.04;
    const randX = (Math.random() - 0.5) * spread * 2, randY = (Math.random() - 0.5) * spread * 2;
    const targetX = 0.5 + aimX * 0.25, targetY = 0.5;
    let bx = targetX + randX, by = targetY + randY;
    bx = Math.max(-0.05, Math.min(1.05, bx));
    by = Math.max(-0.05, Math.min(1.05, by));
    const result = scoreAt(bx, by);
    const rect = board.getBoundingClientRect(), wrapRect = boardWrap.getBoundingClientRect();
    const hitX = rect.left - wrapRect.left + bx * rect.width, hitY = rect.top - wrapRect.top + by * rect.height;

    const flightDelay = 140;
    setTimeout(() => {
      if (result.type === 'miss') {
        Audio.miss();
        state.combo = 0;
        vibrate(10);
      } else if (result.type === 'bullseye') {
        Audio.bullseye();
        state.combo++;
        showCombo('BULLSEYE!');
        shakeScreen();
        vibrate([30, 30, 60]);
      } else {
        const intensity = result.type === 'triple' ? 1 : result.type === 'double' ? 0.8 : result.type === 'bull' ? 0.9 : 0.5;
        Audio.thud(intensity);
        Audio.chime(result.type);
        if (result.type === 'triple' || result.type === 'double' || result.type === 'bull') {
          state.combo++;
          if (state.combo >= 2) { showCombo(state.combo + 'x COMBO'); Audio.combo(state.combo); }
          vibrate(40);
        } else {
          vibrate(20);
        }
      }

      const dartEl = document.createElement('div');
      dartEl.className = 'dart-hit';
      dartEl.style.left = hitX + 'px'; dartEl.style.top = hitY + 'px';
      const gid = 'dg' + Date.now() + Math.random().toString(36).slice(2, 6);
      dartEl.innerHTML = '<svg viewBox="0 0 28 28"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F4F1DE"/><stop offset="100%" stop-color="#999"/></linearGradient></defs><path d="M 20 4 L 26 2 L 24 8 L 28 6 L 22 12 Z" fill="#36D6B5" stroke="#0a0a0a" stroke-width="0.5"/><line x1="22" y1="6" x2="8" y2="20" stroke="url(#' + gid + ')" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="14" x2="10" y2="18" stroke="#2a2a2a" stroke-width="4" stroke-linecap="round"/><circle cx="7" cy="21" r="1.5" fill="#E63946"/></svg>';
      boardWrap.appendChild(dartEl);

      const popup = document.createElement('div');
      popup.className = 'popup ' + result.type;
      popup.style.left = hitX + 'px'; popup.style.top = hitY + 'px';
      popup.textContent = result.points > 0 ? '+' + result.points : 'MISS';
      boardWrap.appendChild(popup);
      setTimeout(() => popup.remove(), 1100);

      state.score += result.points;
      instruction.classList.remove('active');
      instruction.textContent = result.label;
      updateHUD();

      if (state.dartsLeft <= 0) {
        setTimeout(endGame, 1200);
      } else {
        setTimeout(() => { instruction.textContent = 'SWIPE UP TO THROW'; }, 1400);
      }
    }, flightDelay);
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
  function vibrate(pattern) { if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch(e){} } }

  track.addEventListener('touchstart', onStart, { passive: false });
  track.addEventListener('touchmove', onMove, { passive: false });
  track.addEventListener('touchend', onEnd, { passive: false });
  track.addEventListener('touchcancel', onEnd, { passive: false });
  track.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  function startGame() {
    Audio.init(); Audio.resume(); Audio.tick();
    state.score = 0; state.dartsLeft = state.totalDarts; state.combo = 0; state.playing = true;
    boardWrap.querySelectorAll('.dart-hit, .popup').forEach(el => el.remove());
    updateHUD();
    document.getElementById('introOverlay').classList.add('hidden');
    document.getElementById('gameOverOverlay').classList.add('hidden');
    instruction.textContent = 'SWIPE UP TO THROW';
  }
  function endGame() {
    state.playing = false;
    Audio.gameOver(state.score);
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

  document.getElementById('startBtn').addEventListener('click', () => { Audio.tick(); startGame(); });
  document.getElementById('playAgainBtn').addEventListener('click', () => { Audio.tick(); startGame(); });
  document.getElementById('shareBtn').addEventListener('click', () => {
    Audio.tick();
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