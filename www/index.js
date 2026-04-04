
        /* ════════════════════════════════════════════════
           1. ALL VARIABLE DECLARATIONS
        ════════════════════════════════════════════════ */
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        let W = 800, H = 600, laneH = 200;
        let scale = 1, speedScale = 1;

        const LANES = 3;
        const MAX_LEVELS = 100;
        const LC = ['#00f2ff', '#ff00ff', '#ffcc00'];
        const PU_DUR = { shield: 6000, slow: 5500, magnet: 6500 };
        const laneY = [200, 400, 600];

        // DOM refs
        const scoreEl = document.getElementById('score-val');
        const bestEl = document.getElementById('best-val');
        const finalScEl = document.getElementById('final-score');
        const finalSubEl = document.getElementById('final-sub');
        const finalScWEl = document.getElementById('final-score-win');
        const finalSubWEl = document.getElementById('final-sub-win');
        const comboEl = document.getElementById('combo');
        const waveLbl = document.getElementById('wave-lbl');
        const bossAlrt = document.getElementById('boss-alert');
        const chaosAlrt = document.getElementById('chaos-alert');
        const flashEl = document.getElementById('flash');
        const scrStart = document.getElementById('scr-start');
        const scrOver = document.getElementById('scr-over');
        const scrVictory = document.getElementById('scr-victory');
        const scrPause = document.getElementById('scr-pause');
        const scrConfirm = document.getElementById('scr-confirm');
        const btnConfirmYes = document.getElementById('btn-confirm-yes');
        const btnConfirmNo = document.getElementById('btn-confirm-no');
        const puEls = { shield: document.getElementById('pu-shield'), slow: document.getElementById('pu-slow'), magnet: document.getElementById('pu-magnet') };
        const ptEls = { shield: document.getElementById('pt-shield'), slow: document.getElementById('pt-slow'), magnet: document.getElementById('pt-magnet') };
        const ldots = [document.getElementById('ld0'), document.getElementById('ld1'), document.getElementById('ld2')];
        const btnPause = document.getElementById('btn-pause');

        // Game state & Settings
        let gameState = 'LOGIN'; // Initial state check
        let score = 0;
        let level = 1;
        let bestScore = +(localStorage.getItem('vs_best_100') || 0);
        let playerName = localStorage.getItem('vs_player_name') || '';

        // Native Score Sync
        if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
            window.Capacitor.Plugins.NativeBridge.getHighScore().then(function(res) {
                if (res && res.highScore > bestScore) {
                    bestScore = res.highScore;
                    localStorage.setItem('vs_best_100', bestScore);
                    document.getElementById('best-val').textContent = bestScore;
                }
            });
        }

        // DOM refs for Login/Settings
        const scrLogin = document.getElementById('scr-login');
        const scrSettings = document.getElementById('scr-settings');
        const inputName = document.getElementById('input-name');
        const welcomeMsg = document.getElementById('welcome-msg');
        const setNameDisp = document.getElementById('set-name-display');

        // Per-run vars
        let gameSpeed = 5;
        let elapsed = 0;
        let timeLimitForBoss = 15000; // time required to survive current level before boss spawns
        let bossActive = false;
        let bossTimer = 0;
        let bossProjTimer = 0;
        let combo = 0;
        let maxCombo = 0;
        let gemsGot = 0;
        let dodges = 0;

        let puTime = { shield: 0, slow: 0, magnet: 0 };
        let chaos = false;
        let chaosFlash = 0;
        let obsTimer = 1000;
        let gemTimer = 800;
        let bgHue = 220;
        let gridOff = 0;
        let shakeMag = 0;
        let shakeX = 0;
        let shakeY = 0;

        // Entity arrays
        let player = null;
        const obstacles = [];
        const gemList = [];
        const bossProjs = [];
        const particles = [];
        const popups = [];
        const bgLines = [];
        // Opt: Reduced BG lines to 20 for better performance
        for (let i = 0; i < 20; i++) {
            bgLines.push({ x: Math.random() * 2000, y: Math.random() * 1000, len: 40 + Math.random() * 130, spd: 2 + Math.random() * 6, a: 0.03 + Math.random() * 0.06, w: 0.4 + Math.random() * 1.6 });
        }

        let prevTS = null, animId = null, comboTO = null, flashTO = null;
        let isMuted = localStorage.getItem('vs_muted') === 'true';

        const bgMusic = new Audio('Void Surge (1).mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.5;
        bgMusic.muted = isMuted;
        let fadeAudio = null;

        function playBGMusic() {
            if (fadeAudio) { clearInterval(fadeAudio); fadeAudio = null; }
            bgMusic.volume = 0.5;
            if (bgMusic.paused) {
                bgMusic.play().catch(e => { console.log('Autoplay blocked until user interaction'); });
            }
        }
        function stopBGMusicFade() {
            if (fadeAudio) clearInterval(fadeAudio);
            fadeAudio = setInterval(function () {
                if (bgMusic.volume > 0.05) {
                    bgMusic.volume -= 0.05;
                } else {
                    bgMusic.pause();
                    bgMusic.currentTime = 0;
                    clearInterval(fadeAudio);
                    fadeAudio = null;
                }
            }, 100);
        }

        // Progress scaling factors based on 100 levels
        function updateLevelDifficulty() {
            gameSpeed = 10 + (level * 0.3); // Increased speed
            timeLimitForBoss = 15000 + (level * 500);
            chaos = (level > 20 && Math.random() < 0.3) || (level > 50 && Math.random() < 0.6) || level > 80;
        }

        /* ════════════════════════════════════════════════
           2. AUDIO (Web Audio)
        ════════════════════════════════════════════════ */
        let audioCtx = null;
        function getAudio() {
            if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
            return audioCtx;
        }
        function tone(freq, type, dur, vol, detune) {
            if (isMuted) return;
            var ac = getAudio(); if (!ac) return;
            try {
                var o = ac.createOscillator(), g = ac.createGain();
                o.connect(g); g.connect(ac.destination);
                o.type = type || 'sine';
                o.frequency.value = freq;
                if (detune) o.detune.value = detune;
                g.gain.setValueAtTime(vol || 0.15, ac.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
                o.start(ac.currentTime); o.stop(ac.currentTime + dur);
            } catch (e) { }
        }
        var SFX = {
            lane: function () { tone(400, 'square', 0.06, 0.08); },
            gem: function () { tone(880, 'sine', 0.1, 0.12); },
            super: function () { tone(1320, 'sine', 0.15, 0.16); tone(1760, 'sine', 0.15, 0.1, 1200); },
            powerup: function () { tone(660, 'sine', 0.07, 0.12); tone(990, 'sine', 0.12, 0.12); tone(1320, 'sine', 0.2, 0.12); },
            shield: function () { tone(220, 'sawtooth', 0.1, 0.1); },
            die: function () { tone(110, 'sawtooth', 0.4, 0.18); tone(80, 'square', 0.55, 0.14); },
            boss: function () { tone(55, 'square', 0.5, 0.16); tone(75, 'sawtooth', 0.5, 0.1); },
            combo: function () { tone(1100, 'sine', 0.12, 0.1); }
        };

        /* ════════════════════════════════════════════════
           3. RESIZE
        ════════════════════════════════════════════════ */
        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
            laneH = H / LANES;
            scale = Math.max(0.4, Math.min(W / 800, H / 600));
            speedScale = W / 800;
            for (var i = 0; i < LANES; i++) laneY[i] = i * laneH + laneH * 0.5;
            if (player) {
                player.targetY = laneY[player.lane];
                player.x = Math.min(W * 0.18, 170 * scale);
                player.y = player.targetY;
                player.w = 34 * scale;
                player.h = 34 * scale;
            }
        }
        window.addEventListener('resize', resize);
        resize();

        /* ════════════════════════════════════════════════
           4. HELPERS
        ════════════════════════════════════════════════ */
        bestEl.textContent = bestScore;

        function flashScreen(col, dur) {
            flashEl.style.background = col;
            flashEl.style.opacity = '0.28';
            clearTimeout(flashTO);
            flashTO = setTimeout(function () { flashEl.style.opacity = '0'; }, dur || 200);
        }
        function showAlert(el, dur) {
            el.style.opacity = '1';
            clearTimeout(el._t);
            el._t = setTimeout(function () { el.style.opacity = '0'; }, dur || 2200);
        }
        function doShake(mag) { shakeMag = Math.max(shakeMag, mag); }
        function spawnParts(x, y, n, col, opts) {
            opts = opts || {};
            var spread = opts.spread || 8;
            // Opt: Limit particles
            if (particles.length > 60) n = Math.floor(n / 2);
            for (var i = 0; i < n; i++) {
                var angle = Math.random() * Math.PI * 2;
                var spd = Math.random() * spread;
                particles.push({
                    x: x, y: y, col: col,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - (opts.upBias || 0),
                    life: 1, size: opts.size || (Math.random() * 4 + 1), grav: opts.grav != null ? opts.grav : 0.13
                });
            }
        }
        function addPopup(x, y, txt, col) { popups.push({ x: x, y: y, txt: txt, col: col, life: 1, vy: -2.8 }); }
        function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

        function obsInterval() { return Math.max(400, 1300 - gameSpeed * 40 - level * 5) + Math.random() * 400; }
        function gemInterval() { return 900 + Math.random() * 700; }

        /* ════════════════════════════════════════════════
           5. PLAYER
        ════════════════════════════════════════════════ */
        function Player() {
            this.lane = 1;
            this.x = Math.min(W * 0.18, 170 * scale);
            this.y = laneY[1];
            this.targetY = laneY[1];
            this.w = 34 * scale; this.h = 34 * scale;
            this.trail = [];
            this.hue = 185;
            this.inv = 0;
            this.t = 0;
        }
        Player.prototype.move = function (dir) {
            var nl = this.lane + dir;
            if (nl < 0 || nl >= LANES) return;
            this.lane = nl;
            this.targetY = laneY[nl];
            SFX.lane(); spawnParts(this.x, this.y, 8, LC[nl], { spread: 5, grav: 0.04 });
        };
        Player.prototype.flip = function () {
            var dest = this.lane === 0 ? 2 : this.lane === 2 ? 0 : (Math.random() < 0.5 ? 0 : 2);
            this.lane = dest;
            this.targetY = laneY[dest];
            SFX.lane(); spawnParts(this.x, this.y, 10, LC[dest], { spread: 6, upBias: 1, grav: 0.06 });
        };
        Player.prototype.update = function (dt) {
            this.t += dt;
            this.hue = (this.hue + 0.7) % 360;
            this.y += (this.targetY - this.y) * (1 - Math.pow(0.01, dt / 120));
            if (this.inv > 0) this.inv -= dt;
            this.trail.push({ x: this.x, y: this.y });
            // Opt: reduced player trail length from 18 to 10
            if (this.trail.length > 10) this.trail.shift();
        };
        Player.prototype.draw = function () {
            for (var i = 0; i < this.trail.length; i++) {
                var p = this.trail[i];
                ctx.save();
                ctx.globalAlpha = (i / this.trail.length) * 0.38;
                ctx.fillStyle = 'hsl(' + this.hue + ',100%,60%)';
                ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, (this.w / 2) * (i / this.trail.length) * 0.65), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            if (this.inv > 0 && Math.floor(this.inv / 70) % 2 === 0) return;
            ctx.save(); ctx.translate(this.x, this.y);
            if (puTime.shield > 0) {
                ctx.beginPath(); ctx.arc(0, 0, this.w * 0.88, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0,242,255,' + (0.55 + 0.3 * Math.sin(this.t / 190)) + ')';
                ctx.lineWidth = 3; ctx.shadowBlur = 18; ctx.shadowColor = '#00f2ff';
                ctx.stroke();
            }
            ctx.translate(Math.sin(this.t * 0.006) * 1.6, 0);
            ctx.shadowBlur = 24; ctx.shadowColor = 'hsl(' + this.hue + ',100%,60%)';
            ctx.fillStyle = 'hsl(' + this.hue + ',100%,66%)';
            ctx.beginPath(); var s = this.w / 2;
            ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-s * 0.22, -s * 0.22, s * 0.22, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };
        Player.prototype.hitbox = function () { var pad = 7 * scale; return { x: this.x - this.w / 2 + pad, y: this.y - this.h / 2 + pad, w: this.w - pad * 2, h: this.h - pad * 2 }; };

        /* ════════════════════════════════════════════════
           6. OBSTACLE
        ════════════════════════════════════════════════ */
        function Obstacle(cfg) {
            cfg = cfg || {};
            this.lane = cfg.lane != null ? cfg.lane : Math.floor(Math.random() * LANES);
            this.w = (13 + Math.random() * 24) * scale; // reduced breadth by 50%, mapped to scale
            this.h = laneH * 0.37; // reduced height by 50%
            this.x = W + this.w + 20;
            this.y = this.lane * laneH + (laneH - this.h) / 2;
            var r = Math.random();
            this.type = cfg.type || (r < 0.26 ? 'spike' : r < 0.48 ? 'laser' : 'block');
            this.col = LC[this.lane];
            this.phase = Math.random() * Math.PI * 2;
            this.passed = false;
            this.moving = cfg.moving || false;
            this.destLane = this.lane;
        }
        Obstacle.prototype.currentSpd = function () { return (puTime.slow > 0 ? gameSpeed * 0.44 : gameSpeed) * speedScale; };
        Obstacle.prototype.update = function () {
            this.x -= this.currentSpd();
            this.phase += 0.07;
            if (this.moving) {
                var tY = this.destLane * laneH + (laneH - this.h) / 2;
                this.y += (tY - this.y) * 0.045;
                if (Math.abs(tY - this.y) < 5) { this.destLane = Math.floor(Math.random() * LANES); this.lane = this.destLane; this.col = LC[this.lane]; }
            }
        };
        Obstacle.prototype.draw = function () {
            var pulse = 0.8 + 0.2 * Math.sin(this.phase);
            ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = this.col;
            if (this.type === 'laser') {
                var cy = this.y + this.h / 2, lw = 4 + 2.5 * Math.abs(Math.sin(this.phase * 2));
                ctx.globalAlpha = 0.78 * pulse; ctx.strokeStyle = this.col; ctx.lineWidth = lw;
                ctx.beginPath(); ctx.moveTo(this.x, cy); ctx.lineTo(this.x + this.w, cy); ctx.stroke();
                ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(this.x, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(this.x + this.w, cy, 7, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 0.1 * pulse; ctx.fillRect(this.x, cy - laneH * 0.38, this.w, laneH * 0.76);
            } else if (this.type === 'spike') {
                ctx.globalAlpha = 0.92 * pulse; ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.moveTo(this.x + this.w / 2, this.y); ctx.lineTo(this.x + this.w, this.y + this.h); ctx.lineTo(this.x, this.y + this.h); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = this.col; ctx.lineWidth = 2.5; ctx.stroke();
            } else {
                ctx.globalAlpha = 0.85 * pulse; ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeStyle = this.col; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.y, this.w, this.h);
                var cs = 8; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
                var corners = [[this.x, this.y, 1, 1], [this.x + this.w, this.y, -1, 1], [this.x, this.y + this.h, 1, -1], [this.x + this.w, this.y + this.h, -1, -1]];
                for (var ci = 0; ci < corners.length; ci++) {
                    var co = corners[ci];
                    ctx.beginPath(); ctx.moveTo(co[0], co[1] + cs * co[3]); ctx.lineTo(co[0], co[1]); ctx.lineTo(co[0] + cs * co[2], co[1]); ctx.stroke();
                }
            }
            ctx.restore();
        };
        Obstacle.prototype.hitbox = function () {
            if (this.type === 'laser') { var cy = this.y + this.h / 2; return { x: this.x + 4 * scale, y: cy - 9 * scale, w: this.w - 8 * scale, h: 18 * scale }; }
            return { x: this.x + 5 * scale, y: this.y + 5 * scale, w: this.w - 10 * scale, h: this.h - 10 * scale };
        };

        /* ════════════════════════════════════════════════
           7. GEM & PROJECTILES
        ════════════════════════════════════════════════ */
        function Gem() {
            this.lane = Math.floor(Math.random() * LANES);
            this.x = W + 24;
            this.phase = Math.random() * Math.PI * 2;
            this.y = laneY[this.lane];
            var roll = Math.random();
            this.type = roll < 0.11 ? 'power' : roll < 0.26 ? 'super' : 'normal';
            this.puKind = ['shield', 'slow', 'magnet'][Math.floor(Math.random() * 3)];
            this.col = this.type === 'super' ? '#ffcc00' : this.type === 'power' ? '#ff00ff' : '#00f2ff';
            this.r = (this.type === 'power' ? 28 : this.type === 'super' ? 12 : 9) * scale;
        }
        Gem.prototype.update = function () {
            this.x -= (puTime.slow > 0 ? gameSpeed * 0.44 : gameSpeed) * speedScale;
            this.phase += 0.09;
            this.y = laneY[this.lane] + Math.sin(this.phase) * 8;
            if (puTime.magnet > 0 && player) {
                var dx = player.x - this.x, dy = player.y - this.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 230 && d > 1) { this.x += (dx / d) * 9; this.y += (dy / d) * 9; }
            }
        };
        Gem.prototype.draw = function () {
            var drawCol = bossActive ? '#ff3300' : this.col;
            ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = drawCol;
            ctx.translate(this.x, this.y); ctx.scale(1 + 0.12 * Math.sin(this.phase * 1.6), 1 + 0.12 * Math.sin(this.phase * 1.6));
            if (this.type === 'power') {
                ctx.fillStyle = drawCol; ctx.beginPath();
                for (var i = 0; i < 6; i++) { var a = (i / 6) * Math.PI * 2 - Math.PI / 6; if (i === 0) ctx.moveTo(Math.cos(a) * this.r, Math.sin(a) * this.r); else ctx.lineTo(Math.cos(a) * this.r, Math.sin(a) * this.r); }
                ctx.closePath(); ctx.fill();
                ctx.font = this.r + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
                ctx.fillText(this.puKind === 'shield' ? '🛡' : this.puKind === 'slow' ? '⏳' : '💎', 0, 1);
            } else {
                var r = this.r; ctx.fillStyle = drawCol;
                ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.72, 0); ctx.closePath(); ctx.fill();
                ctx.globalAlpha = 0.45; ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(r * 0.28, 0); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.28, 0); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        };

        function BossProj() {
            this.lane = Math.floor(Math.random() * LANES);
            this.x = W + 22; this.y = laneY[this.lane];
            this.baseSpd = Math.min(22, gameSpeed * 1.5 + (level * 0.1)) * speedScale;
            this.hue = Math.random() * 360; this.phase = Math.random() * Math.PI * 2;
            this.r = (11 + (level > 50 ? 3 : 0)) * scale;
        }
        BossProj.prototype.update = function () {
            this.x -= puTime.slow > 0 ? this.baseSpd * 0.44 : this.baseSpd;
            this.phase += 0.13; this.hue = (this.hue + 2) % 360;
            this.y = laneY[this.lane] + Math.sin(this.phase) * 26;
        };
        BossProj.prototype.draw = function () {
            ctx.save(); ctx.shadowBlur = 22; ctx.shadowColor = 'hsl(' + this.hue + ',100%,60%)';
            ctx.fillStyle = 'hsl(' + this.hue + ',100%,60%)';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };

        /* ════════════════════════════════════════════════
           8. RENDERING LOOP
        ════════════════════════════════════════════════ */
        function updatePUBar() {
            ['shield', 'slow', 'magnet'].forEach(k => {
                var on = puTime[k] > 0;
                puEls[k].classList.toggle('on', on);
                ptEls[k].textContent = on ? Math.ceil(puTime[k] / 1000) + 's' : '';
                ptEls[k].style.opacity = on ? '1' : '0';
            });
        }

        function startBoss() {
            bossActive = true;
            bossTimer = 6000 + (level * 200); // Boss duration scales with level
            bossProjTimer = 500;
            SFX.boss(); doShake(10);
            showAlert(bossAlrt, 2200); flashScreen('#ff330055', 600);
        }

        function finishLevel() {
            bossActive = false; bossProjs.length = 0;
            score += 100 + (level * 10); scoreEl.textContent = score;
            SFX.powerup(); flashScreen('#00ff8844', 400); doShake(4);
            addPopup(W / 2, H / 2 - 40, 'LEVEL ' + level + ' CLEARED!', '#00ff88');
            spawnParts(W / 2, H / 2, 35, '#00ff88', { spread: 12, size: 5, grav: 0.06 });

            level++;
            if (level > MAX_LEVELS) {
                winGame();
                return;
            }

            waveLbl.textContent = 'LEVEL ' + level + ' / ' + MAX_LEVELS;
            elapsed = 0;
            updateLevelDifficulty();

            showAlert(chaosAlrt, 2500);
        }

        function loop(ts) {
            animId = requestAnimationFrame(loop);
            if (prevTS === null) { prevTS = ts; return; }
            var dt = Math.min(ts - prevTS, 50); prevTS = ts;

            if (shakeMag > 0) { shakeX = (Math.random() - 0.5) * shakeMag * 2; shakeY = (Math.random() - 0.5) * shakeMag * 2; shakeMag *= 0.82; }
            ctx.save(); ctx.translate(shakeX, shakeY);

            // Bg
            var grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, 'hsl(' + (bgHue % 360) + ',20%,3%)'); grad.addColorStop(1, 'hsl(' + ((bgHue + 40) % 360) + ',20%,5%)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

            gridOff = (gridOff + ((puTime.slow > 0 ? gameSpeed * 0.44 : gameSpeed) * speedScale) * 0.5) % 80;
            ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.032)'; ctx.lineWidth = 1;
            for (var gx = (gridOff % 80) - 80; gx < W + 80; gx += 80) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (var gy = 0; gy < H; gy += 80) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
            ctx.restore();

            for (var li = 1; li < LANES; li++) {
                ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([6, 18]);
                ctx.lineDashOffset = -((Date.now() / 13) % 24);
                ctx.beginPath(); ctx.moveTo(0, li * laneH); ctx.lineTo(W, li * laneH); ctx.stroke(); ctx.restore();
            }

            for (var bi = 0; bi < bgLines.length; bi++) {
                var bl = bgLines[bi]; bl.x -= bl.spd * (puTime.slow > 0 ? 0.4 : 1) * speedScale;
                if (bl.x + bl.len < 0) { bl.x = W + bl.len; bl.y = Math.random() * H; }
                ctx.save(); ctx.globalAlpha = bl.a; ctx.strokeStyle = '#fff'; ctx.lineWidth = bl.w;
                ctx.beginPath(); ctx.moveTo(bl.x + bl.len, bl.y); ctx.lineTo(bl.x, bl.y); ctx.stroke(); ctx.restore();
            }

            if (gameState !== 'PLAY') {
                drawParts(); drawPopups(); ctx.restore(); return;
            }

            elapsed += dt;
            bgHue = (bgHue + 0.038) % 360;

            if (chaos) {
                chaosFlash += dt;
                if (chaosFlash > 650) { chaosFlash = 0; flashScreen('hsl(' + Math.round(Math.random() * 360) + ',100%,60%,0.04)', 250); }
            }

            for (let k in puTime) if (puTime[k] > 0) puTime[k] = Math.max(0, puTime[k] - dt);
            updatePUBar();
            for (var i = 0; i < LANES; i++) {
                ldots[i].style.background = player.lane === i ? LC[i] : 'rgba(255,255,255,0.12)';
                ldots[i].style.boxShadow = player.lane === i ? '0 0 9px ' + LC[i] : 'none';
            }

            if (elapsed >= timeLimitForBoss && !bossActive) startBoss();

            if (bossActive) {
                bossTimer -= dt;
                bossProjTimer -= dt;
                if (bossProjTimer <= 0) {
                    bossProjs.push(new BossProj());
                    bossProjTimer = Math.max(150, 400 - level * 4) + Math.random() * 200;
                }
                for (var bi = bossProjs.length - 1; bi >= 0; bi--) {
                    bossProjs[bi].update();
                    if (bossProjs[bi].x < -30) bossProjs.splice(bi, 1);
                }
                if (bossTimer <= 0) finishLevel();
            }

            obsTimer -= dt; if (obsTimer <= 0 && !bossActive) {
                obstacles.push(new Obstacle({ moving: chaos && Math.random() < 0.4 }));
                obsTimer = obsInterval();
            }
            gemTimer -= dt; if (gemTimer <= 0) { gemList.push(new Gem()); gemTimer = gemInterval(); }

            player.update(dt);

            var phb = player.hitbox();
            for (var oi = obstacles.length - 1; oi >= 0; oi--) {
                var o = obstacles[oi]; o.update();
                if (!o.passed && o.x + o.w < player.x - player.w / 2) {
                    o.passed = true; score += 2; dodges++; scoreEl.textContent = score;
                }
                if (o.x + o.w < -20) { obstacles.splice(oi, 1); continue; }
                if (rectsOverlap(phb, o.hitbox())) {
                    if (puTime.shield > 0) {
                        puTime.shield = 0; updatePUBar(); SFX.shield(); doShake(6); flashScreen('#00f2ff66', 350);
                        spawnParts(player.x, player.y, 22, '#00f2ff', { spread: 7 }); player.inv = 700; combo = 0;
                        obstacles.splice(oi, 1);
                    } else if (player.inv <= 0) { endGame(); ctx.restore(); return; }
                }
            }

            for (var bpi = bossProjs.length - 1; bpi >= 0; bpi--) {
                var bp = bossProjs[bpi];
                if (Math.hypot(bp.x - player.x, bp.y - player.y) < bp.r + player.w / 2 - 5) {
                    if (puTime.shield > 0) {
                        puTime.shield = 0; updatePUBar(); SFX.shield(); doShake(5);
                        bossProjs.splice(bpi, 1); player.inv = 600; combo = 0;
                    } else if (player.inv <= 0) { endGame(); ctx.restore(); return; }
                }
            }

            for (var gi = gemList.length - 1; gi >= 0; gi--) {
                var g = gemList[gi]; g.update();
                if (Math.hypot(g.x - player.x, g.y - player.y) < g.r + player.w / 2 + 2) {
                    gemList.splice(gi, 1); gemsGot++; combo++;
                    if (combo > maxCombo) maxCombo = combo;
                    if (combo >= 2) {
                        comboEl.textContent = combo >= 8 ? '🔥 x' + combo + ' INSANE 🔥' : combo >= 5 ? '⚡ x' + combo + ' ULTRA ⚡' : '✦ x' + combo + ' COMBO ✦';
                        comboEl.style.color = combo >= 8 ? '#ff3300' : combo >= 5 ? '#ffcc00' : combo >= 3 ? '#ff00ff' : '#00f2ff';
                        comboEl.classList.add('show'); clearTimeout(comboTO); comboTO = setTimeout(function () { comboEl.classList.remove('show'); }, 1400); SFX.combo();
                    }
                    spawnParts(g.x, g.y, 12, g.col, { spread: 5, grav: 0.04 });
                    if (g.type === 'power') { puTime[g.puKind] = PU_DUR[g.puKind]; updatePUBar(); SFX.powerup(); flashScreen('rgba(255,0,255,.2)', 140); addPopup(g.x, g.y - 22, g.puKind.toUpperCase() + '!', '#ff00ff'); }
                    else { var mult = Math.max(1, Math.floor(combo / 3)); var pts = (g.type === 'super' ? 10 : 3) * mult; score += pts; scoreEl.textContent = score; if (g.type === 'super') SFX.super(); else SFX.gem(); flashScreen('rgba(0,242,255,.15)', 100); addPopup(g.x, g.y - 18, '+' + pts, g.col); }
                    continue;
                }
                if (g.x + g.r < player.x - player.w / 2 - 10) { if (combo > 0) { addPopup(player.x, player.y - 28, 'COMBO BREAK', 'rgba(255,80,80,.85)'); combo = 0; } gemList.splice(gi, 1); }
            }

            for (var di = 0; di < gemList.length; di++) gemList[di].draw();
            for (var di2 = 0; di2 < obstacles.length; di2++) obstacles[di2].draw();
            for (var di3 = 0; di3 < bossProjs.length; di3++) bossProjs[di3].draw();
            player.draw(); drawParts(); drawPopups();

            if (bossActive) {
                var pct = Math.max(0, bossTimer / (6000 + (level * 200)));
                ctx.save(); ctx.fillStyle = '#ff3300'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff3300';
                ctx.fillRect(W * 0.15, H - 14, W * 0.7 * pct, 6);
                ctx.strokeStyle = 'rgba(255,80,0,.4)'; ctx.strokeRect(W * 0.15, H - 14, W * 0.7, 6); ctx.restore();
            }

            if (puTime.slow > 0) { ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
            if (chaos) { ctx.save(); ctx.globalAlpha = 0.022; for (var sy = 0; sy < H; sy += 5) { ctx.fillStyle = 'hsl(' + (((sy * 0.4) + Date.now() * 0.04) % 360) + ',100%,60%)'; ctx.fillRect(0, sy, W, 4); } ctx.restore(); }
            ctx.restore();
        }

        function drawParts() {
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.97; p.life -= 0.024;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.shadowBlur = 5; ctx.shadowColor = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
        }
        function drawPopups() {
            for (var i = popups.length - 1; i >= 0; i--) {
                var p = popups[i]; p.y += p.vy; p.vy *= 0.93; p.life -= 0.026;
                if (p.life <= 0) { popups.splice(i, 1); continue; }
                ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.shadowBlur = 10; ctx.shadowColor = p.col;
                ctx.font = "bold 17px 'Orbitron', monospace"; ctx.textAlign = 'center'; ctx.fillText(p.txt, p.x, p.y); ctx.restore();
            }
        }

        /* ════════════════════════════════════════════════
           9. GAME FLOW
        ════════════════════════════════════════════════ */
        function startGame() {
            stopBGMusicFade();
            gameState = 'PLAY';
            score = 0; level = 1; updateLevelDifficulty(); // DEV: Start at Level 100
            elapsed = 0; bossActive = false; bossTimer = 0; bossProjTimer = 0;
            combo = 0; maxCombo = 0; gemsGot = 0; dodges = 0;
            puTime = { shield: 0, slow: 0, magnet: 0 };
            chaosFlash = 0; obsTimer = 900; gemTimer = 600; gridOff = 0; shakeMag = 0;
            obstacles.length = 0; gemList.length = 0; bossProjs.length = 0; particles.length = 0; popups.length = 0;

            scoreEl.textContent = '0';
            waveLbl.textContent = 'LEVEL 1 / ' + MAX_LEVELS;
            comboEl.classList.remove('show');
            updatePUBar();

            scrStart.classList.remove('on'); scrOver.classList.remove('on'); scrPause.classList.remove('on'); scrVictory.classList.remove('on');
            btnPause.style.display = 'block';
            player = new Player(); getAudio();
        }

        function endGame() {
            gameState = 'OVER'; btnPause.style.display = 'none'; SFX.die(); doShake(16); flashScreen('#ff000066', 500);
            spawnParts(player.x, player.y, 45, '#ff3366', { spread: 10, size: 4, grav: 0.18 });
            finalScEl.textContent = score;
            finalSubEl.innerHTML = 'DIED ON LEVEL ' + level + '<br>MAX COMBO ×' + maxCombo + ' &nbsp;·&nbsp; GEMS ' + gemsGot;
            if (score > bestScore) {
                bestScore = score; localStorage.setItem('vs_best_100', bestScore);
                bestEl.textContent = bestScore; finalSubEl.innerHTML += '<br><span class="new-hs">★ NEW BEST SCORE ★</span>';
                if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
                    window.Capacitor.Plugins.NativeBridge.saveHighScore({score: bestScore}).then(function(res) {
                        if (res && res.isNewHighScore) {
                            let t = document.createElement('div');
                            t.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:#ffcc00;color:#000;font-family:"Share Tech Mono", monospace;padding:8px 16px;z-index:9999;border-radius:2px;font-weight:900;letter-spacing:2px;box-shadow:0 0 20px #ffcc00;transition:opacity 0.5s;';
                            t.innerText = "NATIVE HIGH SCORE SYNCED!";
                            document.body.appendChild(t);
                            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
                        }
                    });
                }
            }
            scrOver.classList.add('on');
        }

        function winGame() {
            gameState = 'VICTORY'; btnPause.style.display = 'none'; SFX.powerup(); doShake(16); flashScreen('#ffcc0066', 1000);
            spawnParts(player.x, player.y, 100, '#ffcc00', { spread: 15, size: 5, grav: 0.1 });
            finalScWEl.textContent = score;
            finalSubWEl.innerHTML = 'THE VOID HAS BEEN PURIFIED.<br>MAX COMBO ×' + maxCombo + ' &nbsp;·&nbsp; GEMS ' + gemsGot;
            if (score > bestScore) {
                bestScore = score; localStorage.setItem('vs_best_100', bestScore);
                bestEl.textContent = bestScore; finalSubWEl.innerHTML += '<br><span class="new-hs">★ LEGENDARY NEW BEST ★</span>';
                if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
                    window.Capacitor.Plugins.NativeBridge.saveHighScore({score: bestScore}).then(function(res) {
                        if (res && res.isNewHighScore) {
                            let t = document.createElement('div');
                            t.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:#ffcc00;color:#000;font-family:"Share Tech Mono", monospace;padding:8px 16px;z-index:9999;border-radius:2px;font-weight:900;letter-spacing:2px;box-shadow:0 0 20px #ffcc00;transition:opacity 0.5s;';
                            t.innerText = "NATIVE HIGH SCORE SYNCED!";
                            document.body.appendChild(t);
                            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
                        }
                    });
                }
            }
            scrVictory.classList.add('on');
        }

        /* ════════════════════════════════════════════════
           10. INPUT & RESUME FLOW
        ════════════════════════════════════════════════ */
        function startResumeCountdown() {
            if (gameState === 'RESUMING') return;
            gameState = 'RESUMING';
            scrPause.classList.remove('on');
            var overlay = document.getElementById('countdown-overlay');
            var cdElem = document.getElementById('countdown-text');
            overlay.style.opacity = '1';
            
            var steps = [3, 2, 1, 'GO!'];
            var stepIdx = 0;
            
            function nextStep() {
                if (stepIdx >= steps.length) {
                    overlay.style.opacity = '0';
                    gameState = 'PLAY';
                    prevTS = null;
                    btnPause.style.display = 'block';
                    return;
                }
                
                var val = steps[stepIdx];
                cdElem.textContent = val;
                
                cdElem.className = 'pop';
                setTimeout(function() {
                    if (val === 'GO!') {
                        cdElem.className = 'go-anim';
                        setTimeout(nextStep, 600);
                    } else {
                        cdElem.className = '';
                        setTimeout(nextStep, 200);
                    }
                }, val === 'GO!' ? 50 : 800);
                
                if (val !== 'GO!') SFX.lane();
                else SFX.powerup();
                
                stepIdx++;
            }
            nextStep();
        }

        window.addEventListener('keydown', function (e) {
            if (e.repeat) return;
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (gameState === 'PLAY') { gameState = 'PAUSE'; scrPause.classList.add('on'); btnPause.style.display = 'none'; return; }
                if (gameState === 'PAUSE') { startResumeCountdown(); return; }
            }
            if (gameState !== 'PLAY') return;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); player.move(-1); }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); player.move(1); }
            if (e.code === 'Space') { e.preventDefault(); player.flip(); }
        });

        var tSY = null, tSX = null, tST = null;
        canvas.addEventListener('touchstart', function (e) { e.preventDefault(); tSY = e.touches[0].clientY; tSX = e.touches[0].clientX; tST = Date.now(); getAudio(); }, { passive: false });
        canvas.addEventListener('touchend', function (e) {
            e.preventDefault(); if (tSY === null) return;
            if (gameState === 'PLAY') {
                var dy = e.changedTouches[0].clientY - tSY, dx = e.changedTouches[0].clientX - tSX, dt2 = Date.now() - tST;
                if (Math.abs(dy) < 28 && dt2 < 240) player.flip();
                else if (Math.abs(dy) > Math.abs(dx)) player.move(dy < 0 ? -1 : 1);
            }
            tSY = null; tSX = null; tST = null;
        }, { passive: false });

        document.getElementById('btn-start').addEventListener('click', startGame);
        document.getElementById('btn-restart').addEventListener('click', startGame);
        document.getElementById('btn-restart-win').addEventListener('click', startGame);
        document.getElementById('btn-resume').addEventListener('click', startResumeCountdown);
        document.getElementById('btn-quit').addEventListener('click', function () { playBGMusic(); gameState = 'MENU'; scrPause.classList.remove('on'); scrStart.classList.add('on'); btnPause.style.display = 'none'; });
        btnPause.addEventListener('click', function () { if (gameState === 'PLAY') { gameState = 'PAUSE'; scrPause.classList.add('on'); btnPause.style.display = 'none'; } });

        // Login & Settings Logic
        function showStartScreen() {
            playBGMusic();
            gameState = 'MENU';
            welcomeMsg.textContent = 'WELCOME, ' + playerName.toUpperCase();
            scrLogin.classList.remove('on');
            scrSettings.classList.remove('on');
            scrStart.classList.add('on');
        }

        function processLogin() {
            var val = inputName.value.trim();
            if (val.length > 0) {
                playerName = val;
                localStorage.setItem('vs_player_name', playerName);
                showStartScreen();
            } else {
                inputName.style.borderColor = '#ff3366';
                setTimeout(function () { inputName.style.borderColor = 'rgba(0,242,255,.3)'; }, 500);
            }
        }

        document.getElementById('btn-login-submit').addEventListener('click', processLogin);
        inputName.addEventListener('keydown', function (e) { if (e.key === 'Enter') processLogin(); });

        document.getElementById('btn-settings').addEventListener('click', function () {
            gameState = 'SETTINGS';
            setNameDisp.textContent = playerName.toUpperCase();
            document.getElementById('set-highscore-display').textContent = bestScore;
            scrStart.classList.remove('on');
            scrSettings.classList.add('on');
        });

        document.getElementById('btn-close-settings').addEventListener('click', showStartScreen);

        document.getElementById('btn-about-us').addEventListener('click', function () {
            if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
                window.Capacitor.Plugins.NativeBridge.openAboutUs();
            }
        });

        document.getElementById('btn-privacy-policy').addEventListener('click', function () {
            if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
                window.Capacitor.Plugins.NativeBridge.openPrivacyPolicy();
            }
        });

        document.getElementById('btn-change-name').addEventListener('click', function () {
            scrSettings.classList.remove('on');
            scrLogin.classList.add('on');
            inputName.value = playerName;
            inputName.focus();
        });

        document.getElementById('btn-clear-data').addEventListener('click', function () {
            if (confirm('Clear all your saved progress (Score: ' + bestScore + ') and identity?')) {
                localStorage.removeItem('vs_best_100');
                localStorage.removeItem('vs_player_name');
                bestScore = 0; bestEl.textContent = '0';
                playerName = ''; inputName.value = '';
                scrSettings.classList.remove('on');
                scrLogin.classList.add('on');
            }
        });

        const btnToggleMute = document.getElementById('btn-toggle-mute');
        btnToggleMute.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
        btnToggleMute.addEventListener('click', function () {
            isMuted = !isMuted;
            localStorage.setItem('vs_muted', isMuted);
            bgMusic.muted = isMuted;
            this.textContent = isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO';
        });

        // Initial boot logic
        playBGMusic(); // Attempt to autoplay immediately
        if (playerName) showStartScreen();
        else { gameState = 'LOGIN'; scrLogin.classList.add('on'); }

        document.body.addEventListener('click', function() {
            if (gameState === 'LOGIN' || gameState === 'MENU' || gameState === 'SETTINGS') {
                playBGMusic();
            }
        });

        // Handle app background/foreground
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (!bgMusic.paused) {
                    bgMusic.pause();
                    bgMusic._wasPlaying = true;
                }
                if (audioCtx && audioCtx.state === 'running') {
                    audioCtx.suspend();
                }
            } else {
                if (bgMusic._wasPlaying) {
                    bgMusic.play().catch(e => console.log('Resume blocked'));
                    bgMusic._wasPlaying = false;
                }
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
            }
        });

        // Back Button & Confirm Dialog Logic
        function handleBackButton() {
            if (gameState === 'PLAY') {
                gameState = 'CONFIRM';
                scrConfirm.classList.add('on');
                btnPause.style.display = 'none';
            } else if (gameState === 'CONFIRM') {
                btnConfirmNo.click();
            } else if (gameState === 'PAUSE' || gameState === 'MENU' || gameState === 'OVER' || gameState === 'VICTORY' || gameState === 'SETTINGS') {
                if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeBridge) {
                    window.Capacitor.Plugins.NativeBridge.exitApp();
                } else if (navigator.app && navigator.app.exitApp) {
                    navigator.app.exitApp();
                }
            }
        }

        // NativeBridgePlugin now fires "backbutton" document event
        document.addEventListener('backbutton', handleBackButton, false);

        if(btnConfirmYes) btnConfirmYes.addEventListener('click', function() {
            scrConfirm.classList.remove('on');
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeBridge) {
                window.Capacitor.Plugins.NativeBridge.exitApp();
            } else if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
            } else {
                playBGMusic(); gameState = 'MENU'; scrStart.classList.add('on');
            }
        });

        if(btnConfirmNo) btnConfirmNo.addEventListener('click', function() {
            scrConfirm.classList.remove('on');
            startResumeCountdown();
        });

        requestAnimationFrame(loop);
