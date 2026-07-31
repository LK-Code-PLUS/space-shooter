(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, DPR;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- UTIL ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- STATE ----------
  let state = 'start'; // start, playing, paused, gameover
  let score = 0;
  let wave = 1;
  let best = parseInt(localStorage.getItem('sv_best') || '0', 10);
  let shakeTime = 0, shakeMag = 0;
  let frame = 0;

  const scoreVal = document.getElementById('scoreVal');
  const waveVal = document.getElementById('waveVal');
  const healthFill = document.getElementById('healthFill');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const pauseBtn = document.getElementById('pauseBtn');
  const finalScoreEl = document.getElementById('finalScore');
  const bestScoreEl = document.getElementById('bestScore');

  // ---------- STARFIELD ----------
  let stars = [];
  function initStars() {
    stars = [];
    for (let layer = 0; layer < 3; layer++) {
      const count = 40 + layer * 25;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: rand(0, W), y: rand(0, H),
          r: rand(0.5, 1.2) + layer * 0.5,
          speed: 20 + layer * 40,
          hue: Math.random() < 0.15 ? rand(180, 260) : 0,
        });
      }
    }
  }

  function updateStars(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      if (s.y > H) { s.y = -2; s.x = rand(0, W); }
    }
  }

  function drawStars() {
    for (const s of stars) {
      ctx.beginPath();
      if (s.hue) {
        ctx.fillStyle = `hsl(${s.hue}, 100%, 75%)`;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
      }
      ctx.arc(s.x, s.y, s.r, 0, 7);
      ctx.fill();
    }
  }

  // ---------- PARTICLES ----------
  let particles = [];
  function spawnExplosion(x, y, color, count = 18, power = 1) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 220) * power;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.8),
        maxLife: rand(0.3, 0.8),
        r: rand(1.5, 4) * power,
        color,
      });
    }
    shakeTime = Math.max(shakeTime, 0.15 * power);
    shakeMag = Math.max(shakeMag, 6 * power);
  }

  function updateParticles(dt) {
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.r * t, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- PLAYER ----------
  const player = {
    x: 0, y: 0, r: 16,
    hp: 100, maxHp: 100,
    fireCooldown: 0,
    fireRate: 0.18,
    spread: 0,
    rapid: 0,
    shield: 0,
    invuln: 0,
    trail: [],
  };

  function resetPlayer() {
    player.x = W / 2;
    player.y = H - 130;
    player.hp = player.maxHp;
    player.fireCooldown = 0;
    player.spread = 0;
    player.rapid = 0;
    player.shield = 0;
    player.invuln = 1.5;
  }

  // touch / mouse drag control
  let pointerActive = false;
  let targetX = null, targetY = null;
  function pointerDown(x, y) { pointerActive = true; targetX = x; targetY = y; }
  function pointerMove(x, y) { if (pointerActive) { targetX = x; targetY = y; } }
  function pointerUp() { pointerActive = false; }

  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0]; pointerDown(t.clientX, t.clientY);
  }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    const t = e.touches[0]; pointerMove(t.clientX, t.clientY);
  }, { passive: true });
  canvas.addEventListener('touchend', pointerUp);
  canvas.addEventListener('mousedown', e => pointerDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => pointerMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', pointerUp);

  function updatePlayer(dt) {
    if (targetX !== null) {
      const dx = targetX - player.x;
      const dy = (targetY - 40) - player.y;
      player.x += dx * clamp(dt * 10, 0, 1);
      player.y += dy * clamp(dt * 10, 0, 1);
    }
    player.x = clamp(player.x, 24, W - 24);
    player.y = clamp(player.y, 60, H - 60);

    player.trail.unshift({ x: player.x, y: player.y + 14 });
    if (player.trail.length > 8) player.trail.pop();

    if (player.invuln > 0) player.invuln -= dt;
    if (player.shield > 0) player.shield -= dt;
    if (player.rapid > 0) player.rapid -= dt;
    if (player.spread > 0) player.spread -= dt;

    player.fireCooldown -= dt;
    const rate = player.rapid > 0 ? player.fireRate * 0.4 : player.fireRate;
    if (player.fireCooldown <= 0) {
      player.fireCooldown = rate;
      fireBullet();
    }
  }

  function drawShip(x, y, hue, size, thrust) {
    ctx.save();
    ctx.translate(x, y);
    // engine flame
    const flameLen = 10 + thrust * 10 + Math.sin(frame * 0.5) * 3;
    const g = ctx.createLinearGradient(0, size * 0.6, 0, size * 0.6 + flameLen);
    g.addColorStop(0, `hsla(${hue + 140}, 100%, 70%, 0.9)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, size * 0.55);
    ctx.lineTo(size * 0.3, size * 0.55);
    ctx.lineTo(0, size * 0.55 + flameLen);
    ctx.fill();

    // body glow
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.shadowBlur = 18;
    const bodyGrad = ctx.createLinearGradient(0, -size, 0, size);
    bodyGrad.addColorStop(0, `hsl(${hue}, 90%, 70%)`);
    bodyGrad.addColorStop(1, `hsl(${hue}, 90%, 40%)`);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.75, size * 0.6);
    ctx.lineTo(0, size * 0.3);
    ctx.lineTo(-size * 0.75, size * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, -size * 0.15, size * 0.18, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    // trail
    for (let i = 0; i < player.trail.length; i++) {
      const t = player.trail[i];
      ctx.globalAlpha = (1 - i / player.trail.length) * 0.25;
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4 - i * 0.3, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (player.invuln > 0 && Math.floor(frame / 4) % 2 === 0) {
      // blink while invulnerable
    } else {
      drawShip(player.x, player.y, 195, player.r, 1);
    }

    if (player.shield > 0) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(120,200,255,${0.4 + Math.sin(frame * 0.2) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.arc(player.x, player.y, player.r + 10, 0, 7);
      ctx.stroke();
    }
  }

  // ---------- BULLETS ----------
  let bullets = []; // player bullets
  let enemyBullets = [];

  function fireBullet() {
    const mk = (ang) => bullets.push({
      x: player.x + Math.sin(ang) * 4,
      y: player.y - 10,
      vx: Math.sin(ang) * 480,
      vy: -Math.cos(ang) * 480,
      r: 4,
    });
    mk(0);
    if (player.spread > 0) {
      mk(0.28);
      mk(-0.28);
    }
  }

  function updateBullets(dt) {
    bullets = bullets.filter(b => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }

    enemyBullets = enemyBullets.filter(b => b.y > -20 && b.y < H + 20);
    for (const b of enemyBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  }

  function drawBullets() {
    for (const b of bullets) {
      ctx.beginPath();
      ctx.fillStyle = '#7cf9ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.ellipse(b.x, b.y, b.r * 0.7, b.r * 1.6, 0, 0, 7);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (const b of enemyBullets) {
      ctx.beginPath();
      ctx.fillStyle = '#ff5577';
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 10;
      ctx.arc(b.x, b.y, b.r, 0, 7);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ---------- ENEMIES ----------
  let enemies = [];
  let powerups = [];
  let waveTimer = 0;
  let waveEnemiesLeft = 0;
  let bossActive = false;

  function spawnEnemy(type) {
    const hp = { grunt: 12, zigzag: 18, shooter: 22, boss: 400 }[type];
    enemies.push({
      type,
      x: rand(40, W - 40),
      y: -40,
      hp, maxHp: hp,
      r: type === 'boss' ? 60 : 18,
      vx: 0,
      t: 0,
      fireCd: rand(1, 2.5),
      hue: { grunt: 340, zigzag: 30, shooter: 280, boss: 0 }[type],
    });
  }

  function startWave() {
    document.getElementById('waveVal').textContent = wave;
    bossActive = wave % 5 === 0;
    if (bossActive) {
      spawnEnemy('boss');
      waveEnemiesLeft = 0;
    } else {
      waveEnemiesLeft = 5 + wave * 2;
    }
    waveTimer = 0;
  }

  function updateEnemies(dt) {
    waveTimer -= dt;
    if (!bossActive && waveEnemiesLeft > 0 && waveTimer <= 0) {
      const types = ['grunt', 'grunt', 'zigzag', 'shooter'];
      spawnEnemy(types[Math.floor(rand(0, types.length))]);
      waveEnemiesLeft--;
      waveTimer = Math.max(0.35, 1.1 - wave * 0.03);
    }

    for (const e of enemies) {
      e.t += dt;
      if (e.type === 'grunt') {
        e.y += 70 * dt;
      } else if (e.type === 'zigzag') {
        e.y += 55 * dt;
        e.x += Math.sin(e.t * 3) * 90 * dt;
      } else if (e.type === 'shooter') {
        if (e.y < 120) e.y += 50 * dt;
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = rand(1.2, 2);
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, r: 5 });
        }
      } else if (e.type === 'boss') {
        if (e.y < 110) e.y += 40 * dt;
        e.x += Math.sin(e.t * 0.8) * 60 * dt;
        e.x = clamp(e.x, 80, W - 80);
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = 0.5;
          for (let i = -2; i <= 2; i++) {
            const ang = Math.PI / 2 + i * 0.18;
            enemyBullets.push({ x: e.x, y: e.y + 40, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, r: 6 });
          }
        }
      }
    }

    enemies = enemies.filter(e => {
      if (e.type !== 'boss' && e.y > H + 60) return false;
      return e.hp > 0 || e._dying;
    });
  }

  function drawEnemies() {
    for (const e of enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.PI);
      drawShip(0, 0, e.hue, e.r, 1);
      ctx.restore();

      // health bar for boss / shooters
      if (e.type === 'boss') {
        const w = 160;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(W / 2 - w / 2, 24, w, 10);
        ctx.fillStyle = '#ff2d75';
        ctx.fillRect(W / 2 - w / 2, 24, w * (e.hp / e.maxHp), 10);
      }
    }
  }

  function spawnPowerup(x, y) {
    if (Math.random() > 0.18) return;
    const types = ['shield', 'rapid', 'spread', 'heal'];
    powerups.push({ x, y, type: types[Math.floor(rand(0, types.length))], vy: 90 });
  }

  function updatePowerups(dt) {
    powerups = powerups.filter(p => p.y < H + 30);
    for (const p of powerups) {
      p.y += p.vy * dt;
      if (dist(p.x, p.y, player.x, player.y) < 30) {
        applyPowerup(p.type);
        p.y = H + 999;
      }
    }
  }

  function applyPowerup(type) {
    if (type === 'shield') player.shield = 6;
    if (type === 'rapid') player.rapid = 6;
    if (type === 'spread') player.spread = 8;
    if (type === 'heal') player.hp = clamp(player.hp + 30, 0, player.maxHp);
  }

  function drawPowerups() {
    const colors = { shield: '#4fd1ff', rapid: '#ffd24f', spread: '#ff7bd5', heal: '#7cff7c' };
    const icons = { shield: '🛡', rapid: '⚡', spread: '✦', heal: '➕' };
    for (const p of powerups) {
      ctx.beginPath();
      ctx.fillStyle = colors[p.type];
      ctx.shadowColor = colors[p.type];
      ctx.shadowBlur = 14;
      ctx.arc(p.x, p.y, 13, 0, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00121a';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icons[p.type], p.x, p.y + 1);
    }
  }

  // ---------- COLLISIONS ----------
  function handleCollisions() {
    for (const b of bullets) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (dist(b.x, b.y, e.x, e.y) < e.r) {
          e.hp -= 10;
          b.y = -999;
          spawnExplosion(b.x, b.y, '#7cf9ff', 4, 0.4);
          if (e.hp <= 0 && !e._dying) {
            e._dying = true;
            const isBoss = e.type === 'boss';
            spawnExplosion(e.x, e.y, `hsl(${e.hue},100%,60%)`, isBoss ? 60 : 22, isBoss ? 2.5 : 1);
            score += isBoss ? 500 : (e.type === 'shooter' ? 40 : e.type === 'zigzag' ? 30 : 20);
            spawnPowerup(e.x, e.y);
            if (isBoss) { bossActive = false; }
          }
        }
      }
    }

    if (player.invuln <= 0) {
      for (const b of enemyBullets) {
        if (dist(b.x, b.y, player.x, player.y) < player.r) {
          b.y = 9999;
          damagePlayer(8);
        }
      }
      for (const e of enemies) {
        if (e.hp > 0 && dist(e.x, e.y, player.x, player.y) < player.r + e.r * 0.6) {
          damagePlayer(e.type === 'boss' ? 40 : 20);
          e.hp = 0;
          spawnExplosion(e.x, e.y, `hsl(${e.hue},100%,60%)`, 20, 1);
        }
      }
    }
  }

  function damagePlayer(amount) {
    if (player.shield > 0) return;
    player.hp -= amount;
    player.invuln = 0.8;
    shakeTime = 0.25; shakeMag = 10;
    if (player.hp <= 0) {
      player.hp = 0;
      endGame();
    }
  }

  // ---------- GAME FLOW ----------
  function checkWaveComplete() {
    if (!bossActive && waveEnemiesLeft <= 0 && enemies.length === 0) {
      wave++;
      startWave();
    }
    if (bossActive && enemies.length === 0) {
      wave++;
      startWave();
    }
  }

  function endGame() {
    state = 'gameover';
    if (score > best) { best = score; localStorage.setItem('sv_best', best); }
    finalScoreEl.textContent = 'امتیاز: ' + score;
    bestScoreEl.textContent = 'بهترین امتیاز: ' + best;
    gameOverScreen.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
  }

  function startGame() {
    score = 0; wave = 1;
    bullets = []; enemyBullets = []; enemies = []; particles = []; powerups = [];
    resetPlayer();
    startWave();
    state = 'playing';
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
  }

  document.getElementById('startBtn').onclick = () => { initStars(); startGame(); };
  document.getElementById('restartBtn').onclick = startGame;
  pauseBtn.onclick = () => {
    if (state === 'playing') { state = 'paused'; pauseScreen.classList.remove('hidden'); }
  };
  document.getElementById('resumeBtn').onclick = () => {
    if (state === 'paused') { state = 'playing'; pauseScreen.classList.add('hidden'); }
  };

  // ---------- MAIN LOOP ----------
  let last = performance.now();
  function loop(now) {
    let dt = (now - last) / 1000;
    dt = Math.min(dt, 0.05);
    last = now;
    frame++;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (shakeTime > 0) {
      shakeTime -= dt;
      const mag = shakeMag * clamp(shakeTime / 0.25, 0, 1);
      ctx.translate(rand(-mag, mag), rand(-mag, mag));
    }

    updateStars(dt);
    drawStars();

    if (state === 'playing') {
      updatePlayer(dt);
      updateBullets(dt);
      updateEnemies(dt);
      updatePowerups(dt);
      handleCollisions();
      updateParticles(dt);
      checkWaveComplete();

      scoreVal.textContent = score;
      healthFill.style.width = clamp(player.hp / player.maxHp, 0, 1) * 100 + '%';
    }

    drawPowerups();
    drawEnemies();
    drawBullets();
    drawParticles();
    if (state === 'playing' || state === 'paused') drawPlayer();

    ctx.restore();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
