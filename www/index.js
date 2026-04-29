
        /* ════════════════════════════════════════════════
           1. ALL VARIABLE DECLARATIONS
        ════════════════════════════════════════════════ */
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        let W = 800, H = 600, laneH = 200;
        let scale = 1, speedScale = 1;

        const LANES = 3;
        const MAX_LEVELS = 10;
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
        const hudObj = document.getElementById('chkpt-hud-obj');
        const bossAlrt = document.getElementById('boss-alert');
        const chaosAlrt = document.getElementById('chaos-alert');
        const flashEl = document.getElementById('flash');
        const scrStart = document.getElementById('scr-start');
        const scrOver = document.getElementById('scr-over');
        const scrVictory = document.getElementById('scr-victory');
        const scrPause = document.getElementById('scr-pause');
        const scrLevels = document.getElementById('scr-levels');
        const scrConfirm = document.getElementById('scr-confirm');
        const btnConfirmYes = document.getElementById('btn-confirm-yes');
        const btnConfirmNo = document.getElementById('btn-confirm-no');
        const puEls = { shield: document.getElementById('pu-shield'), slow: document.getElementById('pu-slow'), magnet: document.getElementById('pu-magnet') };
        const ptEls = { shield: document.getElementById('pt-shield'), slow: document.getElementById('pt-slow'), magnet: document.getElementById('pt-magnet') };
        const ldots = [document.getElementById('ld0'), document.getElementById('ld1'), document.getElementById('ld2')];
        const btnPause = document.getElementById('btn-pause');

        // Game state & Settings
        let gameState = 'LOGIN'; // Initial state check
        let gameMode = 'endless'; // 'endless' or 'levels'
        let levelSegment = 0; // 0,1,2 = checkpoints, 3 = boss
        let lastPlayedMode = 'endless'; // Track for Retry button
        let lastPlayedLevel = 1;        // Track for Retry button
        let score = 0;
        let endlessBest = +(localStorage.getItem('vs_endless_best') || 0);
        let levelSaves = JSON.parse(localStorage.getItem('vs_level_save') || '{"level":1,"unlocked":1,"checkpoint":0}');
        let level = levelSaves.current || levelSaves.level || 1;
        let unlockedLevel = levelSaves.unlocked || levelSaves.level || 1;
        let bestScore = Math.floor(+(localStorage.getItem('vs_best_100') || 0));
        let totalGems = +(localStorage.getItem('vs_total_gems') || 0);
        let unlockedSkins = JSON.parse(localStorage.getItem('vs_unlocked_skins') || '["default-jet"]');
        let selectedSkin = localStorage.getItem('vs_selected_skin') || 'default-jet';
        let playerName = localStorage.getItem('vs_player_name') || '';

        const SKINS_DATA = {
            'default-jet': { name: 'DEFAULT JET', cost: 0, drawMode: 'default-jet' },
            'ship': { name: 'RAPTOR SHIP', cost: 500, drawMode: 'ship' },
            'scooter': { name: 'HOVER SCOOTER', cost: 1000, drawMode: 'scooter' },
            'super-jet': { name: 'SUPER JET', cost: 2000, drawMode: 'super-jet' }
        };

        // Native Score Sync
        if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
            window.Capacitor.Plugins.NativeBridge.getHighScore().then(function(res) {
                if (res && res.highScore > bestScore) {
                    bestScore = Math.floor(res.highScore);
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
        let baseSpeed = 5;
        let timeScaling = 0;
        const maxSpeed = 15;
        let elapsed = 0;
        let timeLimitForBoss = 15000; // time required to survive current level before boss spawns
        let bossActive = false;
        let bossTimer = 0;
        let bossProjTimer = 0;
        let combo = 0;
        let maxCombo = 0;
        let gemsGot = 0;
        let dodges = 0;

        let puTime = window.puTime = { shield: 0, slow: 0, magnet: 0 };
        let chaos = false;
        let chaosFlash = 0;
        let obsTimer = 1000;
        let gemTimer = 800;
        let bgHue = 220;
        let gridOff = 0;
        let shakeMag = 0;
        let shakeX = 0;
        let shakeY = 0;
        let lastBossSec = -1;
        let lastMilestoneSec = -1;

        // Entity arrays (Fixed Pools)
        let player = null;
        const obstacles = []; for(let i=0;i<40;i++) { let o = new Obstacle(); o.active = false; obstacles.push(o); }
        const gemList = []; for(let i=0;i<20;i++) { let g = new Gem(); g.active = false; gemList.push(g); }
        const bossProjs = []; for(let i=0;i<10;i++) { let b = new BossProj(); b.active = false; bossProjs.push(b); }
        const bossLasers = []; for(let i=0;i<4;i++) { let l = new BossLaser(0,0); l.active = false; bossLasers.push(l); }
        const poolBossLasers = [];
        const particles = []; for(let i=0;i<60;i++) { particles.push({active: false, x:0, y:0, vx:0, vy:0, col:'#000', size:0, grav:0, life:-1}); }
        const popups = []; for(let i=0;i<15;i++) { popups.push({active: false, x:0, y:0, col:'#000', life:-1, txt:'', vy:0}); }
        const bgLines = [];
        let finalBoss = null;
        
        // Level Tracking Variables
        let chkptStartTime = 0; let levelDodges = 0; let levelSwaps = 0; 
        let noGemTime = 0; let blindTime = 0; let powerupsUsed = 0;
        let levelGemsGot = 0; let levelMaxCombo = 0;
        function resetChkptStats() {
            chkptStartTime = elapsed; levelDodges = 0; levelSwaps = 0; noGemTime = 0; blindTime = 0; powerupsUsed = 0;
            levelGemsGot = 0; levelMaxCombo = 0;
        }

        function showNativeToast(msg) {
            let t = document.createElement('div');
            t.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:#ffcc00;color:#000;font-family:"Share Tech Mono", monospace;padding:8px 16px;z-index:9999;border-radius:2px;font-weight:900;letter-spacing:2px;box-shadow:0 0 20px #ffcc00;transition:opacity 0.5s;';
            t.innerText = msg;
            document.body.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 2000);
        }

        const LEVEL_DATA = [
            null,
            // L1: Void Entry — shorter survival, teach lane-swapping early
            { multi: 1.0, title: "Void Entry",
              desc: ["SURVIVE 15S", "COLLECT 10 GEMS", "SWAP LANES 5X"],
              checks: [ ()=>elapsed-chkptStartTime>=15000, ()=>levelGemsGot>=10, ()=>levelSwaps>=5 ] },
            // L2: Static Field — gentler gem ramp, replace anti-fun gem-avoid with time survival
            { multi: 1.2, title: "Static Field",
              desc: ["DODGE 15 BLOCKS", "COLLECT 12 GEMS", "SURVIVE 25S"],
              checks: [ ()=>levelDodges>=15, ()=>levelGemsGot>=12, ()=>elapsed-chkptStartTime>=25000 ] },
            // L3: Surge Wall — lower combo spike (4x), replace "survive burst" with active dodge goal
            { multi: 1.35, title: "Surge Wall",
              desc: ["HIT 4X COMBO", "COLLECT 20 GEMS", "DODGE 10 BLOCKS"],
              checks: [ ()=>levelMaxCombo>=4, ()=>levelGemsGot>=20, ()=>levelDodges>=10 ] },
            // L4: Neon Cascade — more meaningful dodge count (5→8), keep speed run
            { multi: 1.5, title: "Neon Cascade",
              desc: ["DODGE 8 BLOCKS", "COLLECT 25 GEMS", "SPEED RUN 15S"],
              checks: [ ()=>levelDodges>=8, ()=>levelGemsGot>=25, ()=>elapsed-chkptStartTime>=15000 ] },
            // L5: Dual Stream — reduce no-powerup window from 20s to 15s (less punishing)
            { multi: 1.65, title: "Dual Stream",
              desc: ["LANE SWAP 10X", "COLLECT 30 GEMS", "NO POWERUPS 15S"],
              checks: [ ()=>levelSwaps>=10, ()=>levelGemsGot>=30, ()=>powerupsUsed===0 && elapsed-chkptStartTime>=15000 ] },
            // L6: Void Fracture — reduce chaos survive to 15s, logarithmic combo (6x)
            { multi: 1.8, title: "Void Fracture",
              desc: ["SURVIVE CHAOS 15S", "COLLECT 35 GEMS", "HIT 6X COMBO"],
              checks: [ ()=>elapsed-chkptStartTime>=15000, ()=>levelGemsGot>=35, ()=>levelMaxCombo>=6 ] },
            // L7: Pulse Grid — replace 45s gem-avoid (worst offender) with lane swap challenge
            { multi: 2.0, title: "Pulse Grid",
              desc: ["DODGE 10 BLOCKS", "COLLECT 38 GEMS", "LANE SWAP 15X"],
              checks: [ ()=>levelDodges>=10, ()=>levelGemsGot>=38, ()=>levelSwaps>=15 ] },
            // L8: Dark Matter — reduce blind time from 10s to 7s (less RNG-dependent), ease gem count
            { multi: 2.2, title: "Dark Matter",
              desc: ["BLIND DODGE 7S", "COLLECT 42 GEMS", "SURVIVE FLICKER"],
              checks: [ ()=>blindTime>=7000, ()=>levelGemsGot>=42, ()=>elapsed-chkptStartTime>=15000 ] },
            // L9: Zero Barrier — active dodge instead of passive timer, logarithmic combo cap (8x)
            { multi: 2.4, title: "Zero Barrier",
              desc: ["DODGE 12 BLOCKS", "COLLECT 48 GEMS", "HIT 8X COMBO"],
              checks: [ ()=>levelDodges>=12, ()=>levelGemsGot>=48, ()=>levelMaxCombo>=8 ] },
            // L10: Void Core — handled manually via VoidCoreBoss HP phases
            { multi: 2.6, title: "Void Core",
              desc: ["PHASE 1", "PHASE 2", "PHASE 3"],
              checks: [ ()=>false, ()=>false, ()=>false ] } // Handled via VoidCoreBoss HP manually
        ];
        
        function getObstacle(cfg) {
            for(let i=0; i<40; i++) {
                if(!obstacles[i].active) {
                    Obstacle.call(obstacles[i], cfg);
                    obstacles[i].active = true;
                    return obstacles[i];
                }
            }
            return null;
        }
        function getGem() {
            for(let i=0; i<20; i++) {
                if(!gemList[i].active) {
                    Gem.call(gemList[i]);
                    gemList[i].active = true;
                    return gemList[i];
                }
            }
            return null;
        }
        function getBossProj() {
            for(let i=0; i<10; i++) {
                if(!bossProjs[i].active) {
                    BossProj.call(bossProjs[i]);
                    bossProjs[i].active = true;
                    return bossProjs[i];
                }
            }
            return null;
        }
        function getParticle() {
            for(let i=0; i<60; i++) if(!particles[i].active) return particles[i];
            return particles[0]; // fallback overwrite
        }
        function getPopup() {
            for(let i=0; i<15; i++) if(!popups[i].active) return popups[i];
            return popups[0];
        }

        // Opt: Parallax bg layers (3 depths)
        for (let i = 0; i < 30; i++) {
            let depth = (i % 3) + 1; // 1 (far), 2 (mid), 3 (near)
            let spdMultiplier = depth === 1 ? 0.2 : depth === 2 ? 0.5 : 1.0;
            bgLines.push({
                x: Math.random() * 2000,
                y: Math.random() * 1000,
                len: (30 * depth) + Math.random() * 40,
                spd: spdMultiplier,
                a: 0.02 + (depth * 0.02),
                w: 0.5 + (depth * 0.4)
            });
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

        function updateLevelDifficulty() {
            timeScaling = 0; // Reset gradual speed on level change
            if(gameMode === 'levels') {
                let lvlDef = LEVEL_DATA[level > 10 ? 10 : level];
                baseSpeed = 5 * lvlDef.multi;
                chaos = (level === 6 || level === 8);
                bgHue = (level * 36) % 360;
            } else {
                baseSpeed = 5;
                chaos = false;
            }
        }

        /* ════════════════════════════════════════════════
           2. AUDIO (Web Audio)
        ════════════════════════════════════════════════ */
        let audioCtx = null;
        let compressor = null;
        function getAudio() {
            if (!audioCtx) { 
                try { 
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
                    compressor = audioCtx.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
                    compressor.knee.setValueAtTime(30, audioCtx.currentTime);
                    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
                    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
                    compressor.release.setValueAtTime(0.25, audioCtx.currentTime);
                    compressor.connect(audioCtx.destination);
                } catch (e) { } 
            }
            return audioCtx;
        }
        function tone(freq, type, dur, vol, detune) {
            if (isMuted) return;
            var ac = getAudio(); if (!ac) return;
            try {
                var o = ac.createOscillator(), g = ac.createGain();
                o.connect(g); g.connect(compressor);
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
            for (var i = 0; i < n; i++) {
                var angle = Math.random() * Math.PI * 2;
                var spd = Math.random() * spread;
                
                let p = getParticle();
                p.x = x; p.y = y; p.col = col;
                p.vx = Math.cos(angle) * spd;
                p.vy = Math.sin(angle) * spd - (opts.upBias || 0);
                p.life = 1; p.size = opts.size || (Math.random() * 4 + 1); p.grav = opts.grav != null ? opts.grav : 0.13;
                p.active = true;
            }
        }
        function addPopup(x, y, txt, col) { 
            let p = getPopup();
            p.x = x; p.y = y; p.txt = txt; p.col = col; p.life = 1; p.vy = -2.8;
            p.active = true;
        }
        function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

        const _glowCache = {};
        function getGlow(col) {
            if (_glowCache[col]) return _glowCache[col];
            var c = document.createElement('canvas'); c.width = 64; c.height = 64;
            var cx = c.getContext('2d');
            cx.shadowBlur = 20; 
            cx.shadowColor = col;
            cx.shadowOffsetX = 100;
            cx.fillStyle = col;
            cx.beginPath(); 
            cx.arc(32 - 100, 32, 8, 0, Math.PI * 2); 
            cx.fill();
            _glowCache[col] = c; return c;
        }
        function drawGlowFast(x, y, col, sz, a, targetCtx) {
            var g = getGlow(col);
            var context = targetCtx || ctx;
            context.save(); context.globalAlpha = a != null ? a : 1; 
            context.globalCompositeOperation = 'screen';
            context.drawImage(g, x - sz, y - sz, sz * 2, sz * 2);
            context.restore();
        }

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
            levelSwaps++;
            SFX.lane(); spawnParts(this.x, this.y, 8, LC[nl], { spread: 5, grav: 0.04 });
        };
        Player.prototype.flip = function () {
            var dest = this.lane === 0 ? 2 : this.lane === 2 ? 0 : (Math.random() < 0.5 ? 0 : 2);
            this.lane = dest;
            this.targetY = laneY[dest];
            levelSwaps++;
            SFX.lane(); spawnParts(this.x, this.y, 10, LC[dest], { spread: 6, upBias: 1, grav: 0.06 });
        };
        Player.prototype.update = function (dtMs, dtRatio) {
            this.t += dtMs;
            this.hue = (this.hue + 0.7 * dtRatio) % 360;

            // TOUCH/KEYBOARD MODE: smooth lane interpolation
            this.y += (this.targetY - this.y) * (1 - Math.pow(0.01, dtMs / 120));

            if (this.inv > 0) this.inv -= dtMs;
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 10) this.trail.shift();
        };

        function drawSkinShape(ctx, skinId, w, h, hue, t, isPreview) {
            ctx.save();
            const phue  = `hsl(${Math.floor(hue)},100%,60%)`;
            const phue2 = `hsl(${Math.floor(hue + 40)},100%,75%)`;
            const glow  = `hsl(${Math.floor(hue)},100%,80%)`;

            ctx.lineJoin = 'round';
            ctx.lineCap  = 'round';
            ctx.lineWidth = isPreview ? 1.5 : Math.max(2, 2.5 * scale);

            // ── THRUSTER EXHAUST (behind craft, non-preview only) ──────
            if (!isPreview) {
                const fl  = w * (1.1 + Math.sin(t * 0.09) * 0.4 + Math.random() * 0.3);
                const fy  = w * (0.10 + Math.sin(t * 0.13) * 0.04);
                ctx.save();
                ctx.globalCompositeOperation = 'screen';

                // Outer cone — wide warm glow
                const g1 = ctx.createLinearGradient(-w * 0.75, 0, -w * 0.75 - fl, 0);
                g1.addColorStop(0,   `hsla(${hue},100%,70%,0.9)`);
                g1.addColorStop(0.3, `hsla(${hue + 20},100%,65%,0.6)`);
                g1.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = g1;
                ctx.beginPath();
                ctx.moveTo(-w * 0.75,  fy);
                ctx.quadraticCurveTo(-w * 0.75 - fl * 0.5,  fy * 2.2, -w * 0.75 - fl,  0);
                ctx.quadraticCurveTo(-w * 0.75 - fl * 0.5, -fy * 2.2, -w * 0.75, -fy);
                ctx.closePath();
                ctx.fill();

                // Inner bright core
                const g2 = ctx.createLinearGradient(-w * 0.75, 0, -w * 0.75 - fl * 0.7, 0);
                g2.addColorStop(0,   '#ffffff');
                g2.addColorStop(0.2, `hsla(${hue},100%,90%,0.9)`);
                g2.addColorStop(1,   'rgba(0,0,0,0)');
                ctx.fillStyle = g2;
                ctx.beginPath();
                ctx.moveTo(-w * 0.75,  fy * 0.4);
                ctx.quadraticCurveTo(-w * 0.75 - fl * 0.6, fy * 0.5, -w * 0.75 - fl * 0.7, 0);
                ctx.quadraticCurveTo(-w * 0.75 - fl * 0.6, -fy * 0.5, -w * 0.75, -fy * 0.4);
                ctx.closePath();
                ctx.fill();

                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }

            if (skinId === 'ship') {
                const sw = w * 0.95, sh = w * 0.75;
                const hg = ctx.createLinearGradient(-sw, 0, sw, 0);
                hg.addColorStop(0,   `hsla(${hue},50%,10%,0.95)`);
                hg.addColorStop(0.6, `hsla(${hue},60%,20%,0.95)`);
                hg.addColorStop(1,   `hsla(${hue},80%,28%,0.9)`);
                ctx.fillStyle = hg;

                ctx.beginPath();
                ctx.moveTo(sw, 0);
                ctx.lineTo(sw * 0.5,  -sh * 0.22);
                ctx.lineTo(-sw * 0.1, -sh * 0.55);
                ctx.lineTo(-sw * 0.55,-sh * 0.55);
                ctx.lineTo(-sw * 0.75,-sh * 0.3);
                ctx.lineTo(-sw * 0.85, 0);
                ctx.lineTo(-sw * 0.75, sh * 0.3);
                ctx.lineTo(-sw * 0.55, sh * 0.55);
                ctx.lineTo(-sw * 0.1,  sh * 0.55);
                ctx.lineTo(sw * 0.5,   sh * 0.22);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = phue;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 7 : 18;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw * 0.3,  -sh * 0.22);
                ctx.lineTo(-sw * 0.1, -sh * 1.05);
                ctx.lineTo(-sw * 0.7, -sh * 0.55);
                ctx.closePath();
                const ug = ctx.createLinearGradient(0, -sh, 0, 0);
                ug.addColorStop(0, `hsla(${hue},100%,50%,0.12)`);
                ug.addColorStop(1, `hsla(${hue},100%,60%,0.5)`);
                ctx.fillStyle = ug;
                ctx.fill();
                ctx.strokeStyle = `hsla(${hue},100%,68%,0.85)`;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 12;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw * 0.3,   sh * 0.22);
                ctx.lineTo(-sw * 0.1,  sh * 1.05);
                ctx.lineTo(-sw * 0.7,  sh * 0.55);
                ctx.closePath();
                ctx.fillStyle = ug;
                ctx.fill();
                ctx.strokeStyle = `hsla(${hue},100%,68%,0.85)`;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 12;
                ctx.stroke();
                ctx.shadowBlur = 0;

                [[-sh * 0.25], [sh * 0.25]].forEach(([yo]) => {
                    ctx.beginPath();
                    ctx.moveTo(sw * 0.7, yo);
                    ctx.lineTo(sw * 1.1, yo);
                    ctx.strokeStyle = `hsla(${hue},100%,75%,0.9)`;
                    ctx.lineWidth = isPreview ? 3 : 5 * scale;
                    ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 14;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;
                    ctx.beginPath();
                    ctx.arc(sw * 1.1, yo, isPreview ? 2 : 3.5 * scale, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = glow; ctx.shadowBlur = 10;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });

                ctx.beginPath();
                ctx.ellipse(sw * 0.15, 0, sw * 0.18, sh * 0.18, 0, 0, Math.PI * 2);
                const cg2 = ctx.createRadialGradient(sw * 0.18, -sh * 0.05, 0, sw * 0.15, 0, sw * 0.18);
                cg2.addColorStop(0, 'rgba(255,255,255,0.95)');
                cg2.addColorStop(0.5, 'rgba(180,200,255,0.5)');
                cg2.addColorStop(1, 'rgba(0,100,180,0.1)');
                ctx.fillStyle = cg2;
                ctx.fill();

                ctx.strokeStyle = `hsla(${hue},50%,55%,0.35)`;
                ctx.lineWidth = isPreview ? 0.6 : 1 * scale;
                ctx.beginPath();
                ctx.moveTo(sw * 0.5, -sh * 0.2); ctx.lineTo(-sw * 0.5, -sh * 0.4);
                ctx.moveTo(sw * 0.5, sh * 0.2); ctx.lineTo(-sw * 0.5, sh * 0.4);
                ctx.moveTo(-sw * 0.1, -sh * 0.4); ctx.lineTo(-sw * 0.1, sh * 0.4);
                ctx.moveTo(-sw * 0.55, -sh * 0.45); ctx.lineTo(-sw * 0.55, sh * 0.45);
                ctx.stroke();
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;
            } else if (skinId === 'scooter') {
                const sw = w * 0.75, sh = w * 0.5;
                const cg3 = ctx.createLinearGradient(-sw, 0, sw, 0);
                cg3.addColorStop(0,  `hsla(${hue},55%,10%,0.95)`);
                cg3.addColorStop(0.7,`hsla(${hue},70%,20%,0.95)`);
                cg3.addColorStop(1,  `hsla(${hue},85%,30%,0.9)`);
                ctx.fillStyle = cg3;

                ctx.beginPath();
                ctx.moveTo(sw, sh * 0.25);
                ctx.bezierCurveTo(sw * 0.7, -sh * 0.6, sw * 0.1, -sh * 0.75, -sw * 0.15, -sh * 0.6);
                ctx.lineTo(-sw * 0.55, -sh * 0.5);
                ctx.lineTo(-sw * 0.7, -sh * 0.2);
                ctx.lineTo(-sw * 0.7,  sh * 0.2);
                ctx.lineTo(-sw * 0.55, sh * 0.5);
                ctx.lineTo(-sw * 0.15, sh * 0.6);
                ctx.bezierCurveTo(sw * 0.1, sh * 0.75, sw * 0.7, sh * 0.6, sw, sh * 0.25);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = phue;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 6 : 16;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw * 0.6, -sh * 0.55);
                ctx.lineTo(sw * 0.75, -sh * 1.1);
                ctx.lineTo(sw * 0.55, -sh * 1.1);
                ctx.lineTo(sw * 0.4, -sh * 0.5);
                ctx.closePath();
                const fg = ctx.createLinearGradient(0, -sh, 0, -sh * 0.5);
                fg.addColorStop(0, `hsla(${hue},100%,50%,0.15)`);
                fg.addColorStop(1, `hsla(${hue},100%,60%,0.55)`);
                ctx.fillStyle = fg;
                ctx.fill();
                ctx.strokeStyle = `hsla(${hue},100%,70%,0.9)`;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 12;
                ctx.stroke();
                ctx.shadowBlur = 0;

                [[-sh * 0.9], [sh * 0.9]].forEach(([yo]) => {
                    const px = sw * 0.1, pw = sw * 0.55, ph = sh * 0.28;
                    ctx.beginPath();
                    ctx.ellipse(px, yo, pw, ph, 0, 0, Math.PI * 2);
                    const pg = ctx.createRadialGradient(px, yo, 0, px, yo, pw);
                    pg.addColorStop(0, `hsla(${hue},100%,55%,0.5)`);
                    pg.addColorStop(0.5,`hsla(${hue},80%,30%,0.4)`);
                    pg.addColorStop(1, `hsla(${hue},60%,10%,0.6)`);
                    ctx.fillStyle = pg;
                    ctx.fill();
                    ctx.strokeStyle = `hsla(${hue},100%,70%,0.9)`;
                    ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 8 : 20;
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    if (!isPreview) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const hg2 = ctx.createRadialGradient(px, yo + ph, 0, px, yo + ph, pw * 1.2);
                        hg2.addColorStop(0, `hsla(${hue},100%,70%,0.5)`);
                        hg2.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = hg2;
                        ctx.beginPath();
                        ctx.ellipse(px, yo + ph * 0.6, pw * 1.2, ph * 0.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                });

                ctx.beginPath();
                ctx.arc(sw * 0.35, -sh * 0.2, sh * 0.28, 0, Math.PI * 2);
                const hel = ctx.createRadialGradient(sw * 0.38, -sh * 0.3, 0, sw * 0.35, -sh * 0.2, sh * 0.28);
                hel.addColorStop(0, 'rgba(255,255,255,0.9)');
                hel.addColorStop(0.4,'rgba(160,230,255,0.5)');
                hel.addColorStop(1, 'rgba(0,80,160,0.1)');
                ctx.fillStyle = hel;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;

                ctx.strokeStyle = `hsla(${hue},60%,60%,0.35)`;
                ctx.lineWidth = isPreview ? 0.6 : 1 * scale;
                ctx.beginPath();
                ctx.moveTo(sw * 0.2, sh * 0.3); ctx.lineTo(-sw * 0.5, sh * 0.3);
                ctx.moveTo(sw * 0.2, -sh * 0.3);ctx.lineTo(-sw * 0.5, -sh * 0.3);
                ctx.moveTo(-sw * 0.2, -sh * 0.45);ctx.lineTo(-sw * 0.2, sh * 0.45);
                ctx.stroke();
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;
            } else if (skinId === 'super-jet') {
                const sw = w * 0.95, sh = w * 0.95;
                const sfg = ctx.createLinearGradient(-sw, 0, sw, 0);
                sfg.addColorStop(0,   `hsla(${hue},55%,10%,0.95)`);
                sfg.addColorStop(0.55,`hsla(${hue},65%,22%,0.95)`);
                sfg.addColorStop(1,   `hsla(${hue},80%,32%,0.9)`);
                ctx.fillStyle = sfg;

                ctx.beginPath();
                ctx.moveTo(sw, 0);
                ctx.bezierCurveTo(sw * 0.7, -sh * 0.18, sw * 0.2, -sh * 0.28, -sw * 0.3, -sh * 0.22);
                ctx.lineTo(-sw * 0.6, -sh * 0.12);
                ctx.lineTo(-sw * 0.75, 0);
                ctx.lineTo(-sw * 0.6,  sh * 0.12);
                ctx.lineTo(-sw * 0.3,  sh * 0.22);
                ctx.bezierCurveTo(sw * 0.2,sh * 0.28, sw * 0.7,sh * 0.18, sw, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = phue;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 8 : 22;
                ctx.stroke();
                ctx.shadowBlur = 0;

                [[-sh * 0.62],[sh * 0.62]].forEach(([byo]) => {
                    ctx.beginPath();
                    ctx.moveTo(sw * 0.5, byo * 0.8);
                    ctx.bezierCurveTo(sw * 0.2, byo, -sw * 0.1, byo * 1.05, -sw * 0.55, byo * 0.9);
                    ctx.lineTo(-sw * 0.7, byo * 0.7);
                    ctx.lineTo(-sw * 0.7, byo * 0.5);
                    ctx.lineTo(-sw * 0.55,byo * 0.3);
                    ctx.lineTo(sw * 0.35, byo * 0.3);
                    ctx.closePath();
                    const bg2 = ctx.createLinearGradient(0, byo, 0, 0);
                    bg2.addColorStop(0, `hsla(${hue},70%,18%,0.9)`);
                    bg2.addColorStop(1, `hsla(${hue},80%,28%,0.7)`);
                    ctx.fillStyle = bg2;
                    ctx.fill();
                    ctx.strokeStyle = phue2;
                    ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 14;
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    ctx.beginPath();
                    ctx.arc(-sw * 0.7, byo * 0.6, isPreview ? 4 : 6 * scale, 0, Math.PI * 2);
                    const ng = ctx.createRadialGradient(-sw * 0.7, byo * 0.6, 0, -sw * 0.7, byo * 0.6, isPreview ? 4 : 6 * scale);
                    ng.addColorStop(0, '#fff');
                    ng.addColorStop(0.5, `hsla(${hue},100%,70%,0.9)`);
                    ng.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = ng;
                    ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 8 : 20;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });

                ctx.beginPath();
                ctx.moveTo(sw * 0.55, -sh * 0.28);
                ctx.lineTo(-sw * 0.2, -sh * 1.05);
                ctx.lineTo(-sw * 0.65, -sh * 0.65);
                ctx.lineTo(-sw * 0.55, -sh * 0.62 * 0.4);
                ctx.closePath();
                const dwg = ctx.createLinearGradient(0, -sh, 0, 0);
                dwg.addColorStop(0, `hsla(${hue},100%,50%,0.1)`);
                dwg.addColorStop(1, `hsla(${hue},100%,60%,0.5)`);
                ctx.fillStyle = dwg;
                ctx.fill();
                ctx.strokeStyle = phue2;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 14;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw * 0.55,  sh * 0.28);
                ctx.lineTo(-sw * 0.2,  sh * 1.05);
                ctx.lineTo(-sw * 0.65, sh * 0.65);
                ctx.lineTo(-sw * 0.55, sh * 0.62 * 0.4);
                ctx.closePath();
                ctx.fillStyle = dwg;
                ctx.fill();
                ctx.strokeStyle = phue2;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 14;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw, -sh * 0.04);
                ctx.lineTo(sw * 1.2, -sh * 0.04);
                ctx.moveTo(sw,  sh * 0.04);
                ctx.lineTo(sw * 1.2, sh * 0.04);
                ctx.strokeStyle = `hsla(${hue},100%,80%,0.95)`;
                ctx.lineWidth = isPreview ? 3 : 5 * scale;
                ctx.shadowColor = '#fff'; ctx.shadowBlur = isPreview ? 6 : 16;
                ctx.stroke();
                ctx.shadowBlur = 0;
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;
                [[-sh * 0.04],[sh * 0.04]].forEach(([my]) => {
                    ctx.beginPath();
                    ctx.arc(sw * 1.2, my, isPreview ? 2 : 3 * scale, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.shadowColor = `hsla(${hue},100%,80%,1)`; ctx.shadowBlur = 12;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                });

                ctx.beginPath();
                ctx.ellipse(sw * 0.28, 0, sw * 0.2, sh * 0.14, 0, 0, Math.PI * 2);
                const sc2 = ctx.createRadialGradient(sw * 0.32, -sh * 0.05, 0, sw * 0.28, 0, sw * 0.2);
                sc2.addColorStop(0, 'rgba(255,255,255,0.95)');
                sc2.addColorStop(0.4, 'rgba(180,220,255,0.5)');
                sc2.addColorStop(1, 'rgba(0,60,120,0.1)');
                ctx.fillStyle = sc2;
                ctx.fill();

                ctx.strokeStyle = `hsla(${hue},60%,60%,0.35)`;
                ctx.lineWidth = isPreview ? 0.6 : 1 * scale;
                ctx.beginPath();
                ctx.moveTo(sw * 0.6, -sh * 0.12); ctx.lineTo(-sw * 0.5, -sh * 0.18);
                ctx.moveTo(sw * 0.6, sh * 0.12); ctx.lineTo(-sw * 0.5, sh * 0.18);
                ctx.moveTo(0, -sh * 0.20); ctx.lineTo(0, sh * 0.20);
                ctx.moveTo(-sw * 0.3, -sh * 0.20); ctx.lineTo(-sw * 0.3, sh * 0.20);
                ctx.stroke();
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;
            } else { // default-jet
                const sw = w * 0.9, sh = w * 0.38;
                const bg = ctx.createLinearGradient(-sw, 0, sw, 0);
                bg.addColorStop(0,   `hsla(${hue},60%,12%,0.9)`);
                bg.addColorStop(0.5, `hsla(${hue},70%,22%,0.95)`);
                bg.addColorStop(1,   `hsla(${hue},80%,30%,0.9)`);
                ctx.fillStyle = bg;

                ctx.beginPath();
                ctx.moveTo(sw, 0);
                ctx.bezierCurveTo(sw * 0.6, -sh * 0.3, sw * 0.1, -sh * 0.95, -sw * 0.5, -sh * 0.95);
                ctx.lineTo(-sw * 0.75, -sh * 0.6);
                ctx.lineTo(-sw * 0.95, -sh * 0.15);
                ctx.lineTo(-sw * 0.75,  0);
                ctx.lineTo(-sw * 0.95,  sh * 0.15);
                ctx.lineTo(-sw * 0.75,  sh * 0.6);
                ctx.lineTo(-sw * 0.5,   sh * 0.95);
                ctx.bezierCurveTo(sw * 0.1, sh * 0.95, sw * 0.6, sh * 0.3, sw, 0);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = phue;
                ctx.shadowColor  = glow;
                ctx.shadowBlur   = isPreview ? 6 : 14;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw * 0.1, -sh * 0.9);
                ctx.lineTo(-sw * 0.4, -sh * 2.0);
                ctx.lineTo(-sw * 0.85, -sh * 0.7);
                ctx.closePath();
                const wg1 = ctx.createLinearGradient(0, -sh * 2, 0, 0);
                wg1.addColorStop(0, `hsla(${hue},100%,50%,0.15)`);
                wg1.addColorStop(1, `hsla(${hue},100%,50%,0.55)`);
                ctx.fillStyle = wg1;
                ctx.fill();
                ctx.strokeStyle = `hsla(${hue},100%,65%,0.8)`;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 4 : 10;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.moveTo(sw * 0.1,  sh * 0.9);
                ctx.lineTo(-sw * 0.4,  sh * 2.0);
                ctx.lineTo(-sw * 0.85, sh * 0.7);
                ctx.closePath();
                ctx.fillStyle = wg1;
                ctx.fill();
                ctx.strokeStyle = `hsla(${hue},100%,65%,0.8)`;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 4 : 10;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.ellipse(sw * 0.35, 0, sw * 0.22, sh * 0.28, 0, 0, Math.PI * 2);
                const cg = ctx.createRadialGradient(sw * 0.4, -sh * 0.1, 0, sw * 0.35, 0, sw * 0.22);
                cg.addColorStop(0, 'rgba(255,255,255,0.9)');
                cg.addColorStop(0.4, 'rgba(180,240,255,0.5)');
                cg.addColorStop(1, 'rgba(0,100,180,0.1)');
                ctx.fillStyle = cg;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;

                ctx.beginPath();
                ctx.moveTo(-sw * 0.5, -sh * 0.5);
                ctx.lineTo(-sw * 0.5,  sh * 0.5);
                ctx.strokeStyle = `hsla(${hue},100%,70%,0.7)`;
                ctx.shadowColor = glow; ctx.shadowBlur = isPreview ? 5 : 12;
                ctx.stroke();
                ctx.shadowBlur = 0;

                ctx.strokeStyle = `hsla(${hue},60%,60%,0.4)`;
                ctx.lineWidth = isPreview ? 0.7 : 1 * scale;
                ctx.beginPath();
                ctx.moveTo(sw * 0.5,  sh * 0.12); ctx.lineTo(-sw * 0.3, sh * 0.55);
                ctx.moveTo(sw * 0.5, -sh * 0.12); ctx.lineTo(-sw * 0.3,-sh * 0.55);
                ctx.stroke();
                ctx.lineWidth = isPreview ? 1.5 : 2.5 * scale;
            }

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        function drawSkinPreview(c, id, sc, hue, t) {
            const centerX = 40;
            const centerY = 40;
            console.log("Drawing icon at", centerX, centerY);
            c.setTransform(1, 0, 0, 1, 0, 0); // RESET TRANSFORM
            c.translate(centerX, centerY); // ENSURE CENTERED DRAWING
            
            c.save();
            c.scale(sc, sc);
            drawGlowFast(0, 0, 'hsl(185,100%,60%)', 24, 0.45, c);
            drawSkinShape(c, id, 22, 22, hue, t, true);
            c.restore();
        }
        Player.prototype.draw = function () {
            // Engine exhaust sparks from trail
            for (var i = 0; i < this.trail.length; i++) {
                var p = this.trail[i];
                var tRatio = i / this.trail.length;
                ctx.save();
                ctx.globalAlpha = tRatio * (0.3 + Math.random() * 0.5);
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = 'hsl(' + this.hue + ',100%,' + (60 + Math.random() * 30) + '%)';
                // Move trail backwards and add random jitter for spark effect
                let jitterY = (Math.random() - 0.5) * this.w * 0.5 * (1 - tRatio);
                ctx.beginPath(); ctx.arc(p.x - this.w * 1.2, p.y + jitterY, Math.max(0.5, (this.w * 0.25) * tRatio), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            if (this.inv > 0 && Math.floor(this.inv / 70) % 2 === 0) return;
            ctx.save(); ctx.translate(this.x, this.y);
            if (puTime.shield > 0) {
                ctx.beginPath(); ctx.arc(0, 0, this.w * 0.88, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0,242,255,' + (0.55 + 0.3 * Math.sin(this.t / 190)) + ')';
                ctx.lineWidth = 3; drawGlowFast(0, 0, '#00f2ff', this.w * 1.5, 0.6);
                ctx.stroke();
            }
            var phue = 'hsl(' + Math.floor(this.hue) + ',100%,60%)';
            drawGlowFast(0, 0, phue, this.w * 1.5, 0.5);
            
            drawSkinShape(ctx, selectedSkin, this.w, this.h, this.hue, this.t, false);
            
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
        Obstacle.prototype.update = function (dtRatio) {
            this.x -= this.currentSpd() * dtRatio;
            this.phase += 0.07 * dtRatio;
            if (this.moving) {
                var tY = this.destLane * laneH + (laneH - this.h) / 2;
                this.y += (tY - this.y) * 0.045 * dtRatio;
                if (Math.abs(tY - this.y) < 5) { this.destLane = Math.floor(Math.random() * LANES); this.lane = this.destLane; this.col = LC[this.lane]; }
            }
        };
        Obstacle.prototype.draw = function () {
            var pulse = 0.8 + 0.2 * Math.sin(this.phase);
            ctx.save();
            drawGlowFast(this.x + this.w/2, this.y + this.h/2, this.col, Math.max(this.w, this.h) * 1.2, 0.5);
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
            this.col = this.type === 'super' ? '#ffcc00' : 
                       (this.type === 'power' ? (this.puKind === 'shield' ? '#00f2ff' : this.puKind === 'slow' ? '#ffcc00' : '#ff00ff') : '#00f2ff');
            this.r = (this.type === 'power' ? 28 : this.type === 'super' ? 12 : 9) * scale;
        }
        Gem.prototype.update = function (dtRatio) {
            this.x -= (puTime.slow > 0 ? gameSpeed * 0.44 : gameSpeed) * speedScale * dtRatio;
            this.phase += 0.09 * dtRatio;
            this.y = laneY[this.lane] + Math.sin(this.phase) * 8;
            if (puTime.magnet > 0 && player) {
                var dx = player.x - this.x, dy = player.y - this.y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 230 && d > 1) { this.x += (dx / d) * 9 * dtRatio; this.y += (dy / d) * 9 * dtRatio; }
            }
        };
        Gem.prototype.draw = function () {
            var drawCol = this.col;
            ctx.save();
            drawGlowFast(this.x, this.y, drawCol, this.r * 2.5, 0.6);
            ctx.translate(this.x, this.y); ctx.scale(1 + 0.12 * Math.sin(this.phase * 1.6), 1 + 0.12 * Math.sin(this.phase * 1.6));
            if (this.type === 'power') {
                ctx.fillStyle = drawCol; ctx.beginPath();
                for (var i = 0; i < 6; i++) { var a = (i / 6) * Math.PI * 2 - Math.PI / 6; if (i === 0) ctx.moveTo(Math.cos(a) * this.r, Math.sin(a) * this.r); else ctx.lineTo(Math.cos(a) * this.r, Math.sin(a) * this.r); }
                ctx.closePath(); ctx.fill();
                ctx.font = this.r + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
                ctx.fillText(this.puKind === 'shield' ? '🛡' : this.puKind === 'slow' ? '⏳' : '🧲', 0, 1);
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
            this.r = 11 * scale;
        }
        BossProj.prototype.update = function (dtRatio) {
            this.x -= (puTime.slow > 0 ? this.baseSpd * 0.44 : this.baseSpd) * dtRatio;
            this.phase += 0.13 * dtRatio; this.hue = (this.hue + 2 * dtRatio) % 360;
            this.y = laneY[this.lane] + Math.sin(this.phase) * 26;
        };
        BossProj.prototype.draw = function () {
            ctx.save(); 
            var h = Math.floor(this.hue);
            var phue = 'hsl(' + h + ',100%,60%)';
            
            ctx.translate(this.x, this.y);
            var wobble = Math.sin(this.phase * 1.5) * 0.2;
            ctx.rotate(wobble);

            drawGlowFast(0, 0, phue, this.r * 2.5, 0.75);
            
            var bg = ctx.createRadialGradient(-this.r * 0.2, -this.r * 0.2, 1, 0, 0, this.r);
            bg.addColorStop(0, '#ffffff');
            bg.addColorStop(0.3, 'hsl(' + h + ',100%,80%)');
            bg.addColorStop(0.7, 'hsl(' + h + ',100%,50%)');
            bg.addColorStop(1, 'hsl(' + h + ',100%,25%)');

            var jaw = 0.6 * Math.abs(Math.sin(this.phase * 3.5));
            var startA = Math.PI + jaw;
            var endA = Math.PI - jaw;

            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(0, 0, this.r, startA, endA);
            ctx.lineTo(0, 0);
            ctx.fill();

            ctx.strokeStyle = 'hsl(' + h + ',100%,70%)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.r, startA, endA);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.r * 0.15, -this.r * 0.45, this.r * 0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(-this.r * 0.2, -this.r * 0.35, this.r * 0.25, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        function BossLaser(lane, timer) {
            this.lane = lane;
            this.timer = timer; 
            this.duration = 2000; 
            this.state = 'charge';
            this.w = W;
            this.h = laneH * 0.76;
            this.x = 0;
            this.y = this.lane * laneH + (laneH - this.h) / 2;
        }
        BossLaser.prototype.update = function(dtMs, dtRatio) {
            if (this.state === 'charge') {
                this.timer -= dtMs;
                if (this.timer <= 0) {
                    this.state = 'fire';
                    SFX.combo();
                    doShake(10);
                }
            } else {
                this.duration -= dtMs;
            }
        };
        BossLaser.prototype.draw = function() {
            if (this.state === 'charge') {
                ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.02); ctx.fillStyle = '#ff1133';
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.restore();
            } else {
                ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff1133';
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
                ctx.strokeRect(this.x, this.y, this.w, this.h);
                ctx.restore();
            }
        };
        BossLaser.prototype.hitbox = function() {
            return { x: this.x, y: this.y + 5 * scale, w: this.w, h: this.h - 10 * scale };
        };

        function VoidCoreBoss() {
            this.x = W - 100 * scale;
            this.y = H / 2;
            this.r = 60 * scale;
            this.phase = 1;
            this.t = 0;
            this.maxHp = 30000;
            this.hp = this.maxHp; 
        }
        VoidCoreBoss.prototype.update = function(dtMs, dtRatio) {
            this.t += dtMs;
            this.hp -= dtMs;
            let ratio = this.hp / this.maxHp;
            
            if (ratio > 0.66) this.phase = 1;
            else if (ratio > 0.33) this.phase = 2;
            else this.phase = 3;
            
            this.y = H / 2 + Math.sin(this.t * 0.002) * (H * 0.3);
            
            if (this.phase === 1 || this.phase === 3) {
                if (Math.random() < (this.phase === 3 ? 0.08 : 0.05) * dtRatio) {
                    let p = getBossProj();
                    if (p) {
                        p.x = this.x - this.r; p.y = this.y;
                        p.lane = Math.floor(Math.random() * LANES);
                        p.baseSpd = 12 + Math.random() * 8;
                    }
                }
            }
            if (this.phase === 2 || this.phase === 3) {
                let anyLaserActive = false;
                for (let li = 0; li < 4; li++) if (bossLasers[li].active) anyLaserActive = true;
                if (!anyLaserActive && Math.random() < 0.02 * dtRatio) {
                    BossLaser.call(bossLasers[0], Math.floor(Math.random() * LANES), 800);
                    bossLasers[0].active = true;
                    if (this.phase === 3) {
                        let lane2 = Math.floor(Math.random() * LANES);
                        if (lane2 !== bossLasers[0].lane) {
                            BossLaser.call(bossLasers[1], lane2, 800);
                            bossLasers[1].active = true;
                        }
                    }
                }
            }
        };
        VoidCoreBoss.prototype.draw = function() {
            ctx.save();
            drawGlowFast(this.x, this.y, '#ff1133', this.r * 2.5 + Math.sin(this.t * 0.01) * 20, 0.6);
            ctx.fillStyle = '#9900ff';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = '#ff1133'; ctx.stroke();
            
            ctx.fillStyle = '#110022';
            let pr = this.r * 0.4;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, pr, pr + Math.sin(this.t * 0.005) * pr * 0.5, 0, Math.PI * 2); 
            ctx.fill();
            ctx.restore();
        };

        /* ════════════════════════════════════════════════
           8. RENDERING LOOP
        ════════════════════════════════════════════════ */
        const PU_COLORS = { shield: 'rgba(0, 242, 255, 0.65)', slow: 'rgba(255, 204, 0, 0.65)', magnet: 'rgba(255, 0, 255, 0.65)' };
        const PU_BG_DIM = { shield: 'rgba(0, 242, 255, 0.08)', slow: 'rgba(255, 204, 0, 0.08)', magnet: 'rgba(255, 0, 255, 0.08)' };

        function updatePUBar() {
            ['shield', 'slow', 'magnet'].forEach(k => {
                var on = puTime[k] > 0;
                puEls[k].classList.toggle('on', on);
                ptEls[k].style.opacity = on ? '1' : '0';
                
                if (on) {
                    let pct = Math.max(0, puTime[k] / PU_DUR[k]) * 100;
                    puEls[k].style.background = `conic-gradient(${PU_COLORS[k]} ${pct}%, ${PU_BG_DIM[k]} ${pct}%)`;
                    ptEls[k].textContent = Math.ceil(puTime[k] / 1000) + 's';
                } else {
                    puEls[k].style.background = PU_BG_DIM[k];
                    ptEls[k].textContent = '';
                }
            });
        }


        function startBoss() {
            bossActive = true;
            if (level >= MAX_LEVELS) {
                finalBoss = new VoidCoreBoss();
                bossTimer = finalBoss.maxHp;
            } else {
                bossTimer = 6000 + (level * 200); // Boss duration scales with level
                bossProjTimer = 500;
            }
            SFX.boss(); doShake(10);
            showAlert(bossAlrt, 2200); flashScreen('#ff330055', 600);
        }

        function finishLevel() {
            bossActive = false; 
            for(let i=0; i<10; i++) bossProjs[i].active = false;
            for(let i=0; i<4; i++) bossLasers[i].active = false;
            finalBoss = null;
            
            SFX.powerup(); flashScreen('#00ff8844', 400); doShake(4);

            if (gameMode === 'endless') {
                score += 50; scoreEl.textContent = Math.floor(score);
                addPopup(W / 2, H / 2 - 40, 'BOSS WAVE CLEARED!', '#00ff88');
                spawnParts(W / 2, H / 2, 35, '#00ff88', { spread: 12, size: 5, grav: 0.06 });
            } else {
                score += 100 + (level * 10); scoreEl.textContent = Math.floor(score);
                addPopup(W / 2, H / 2 - 40, 'LEVEL ' + level + ' CLEARED!', '#00ff88');
                spawnParts(W / 2, H / 2, 35, '#00ff88', { spread: 12, size: 5, grav: 0.06 });

                level++;
                levelSegment = 0;
                
                unlockedLevel = Math.max(unlockedLevel, level);
                let chk = { unlocked: unlockedLevel, current: level, checkpoint: levelSegment };
                localStorage.setItem('vs_level_save', JSON.stringify(chk));
                addPopup(W / 2, H / 2 + 30, 'CHECKPOINT SAVED', '#ff00ff');

                if (level > MAX_LEVELS) {
                    winGame();
                    return;
                }

                let nextTitle = LEVEL_DATA[level] ? LEVEL_DATA[level].title : '';
                waveLbl.textContent = 'L' + level + ' · ' + nextTitle.toUpperCase();
                elapsed = 0;
                updateLevelDifficulty();
                resetChkptStats();
                showAlert(chaosAlrt, 2500);
            }
        }

        function loop(ts) {
            animId = requestAnimationFrame(loop);
            if (prevTS === null) { prevTS = ts; return; }
            var dtMs = Math.min(ts - prevTS, 50); prevTS = ts;
            var dtSec = dtMs / 1000;
            dtSec = Math.min(dtSec, 0.033);
            var dtRatio = dtSec * 60;

            if (shakeMag > 0) { shakeX = (Math.random() - 0.5) * shakeMag * 2; shakeY = (Math.random() - 0.5) * shakeMag * 2; shakeMag *= 0.82; }
            ctx.save(); ctx.translate(shakeX, shakeY);

            // Bg
            var grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, 'hsl(' + (bgHue % 360) + ',20%,3%)'); grad.addColorStop(1, 'hsl(' + ((bgHue + 40) % 360) + ',20%,5%)');
            ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

            gridOff = (gridOff + ((puTime.slow > 0 ? gameSpeed * 0.44 : gameSpeed) * speedScale) * 0.5 * dtRatio) % 80;
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
                var bl = bgLines[bi];
                let plxSpd = (5 + gameSpeed * 1.5 * bl.spd) * (puTime.slow > 0 ? 0.4 : 1) * speedScale * dtRatio;
                bl.x -= plxSpd;
                if (bl.x + bl.len < 0) { bl.x = W + bl.len; bl.y = Math.random() * H; }
                ctx.save(); ctx.globalAlpha = bl.a; ctx.strokeStyle = '#fff'; ctx.lineWidth = bl.w;
                ctx.beginPath(); ctx.moveTo(bl.x + bl.len, bl.y); ctx.lineTo(bl.x, bl.y); ctx.stroke(); ctx.restore();
            }

            if (gameState !== 'PLAY' && gameState !== 'CHECKPOINT_PAUSE') {
                drawParts(dtRatio); drawPopups(dtRatio); ctx.restore(); return;
            }

            if (gameState === 'CHECKPOINT_PAUSE') {
                for (var di = 0; di < 20; di++) if(gemList[di].active) gemList[di].draw();
                for (var di2 = 0; di2 < 40; di2++) if(obstacles[di2].active) obstacles[di2].draw();
                for (var di3 = 0; di3 < 10; di3++) if(bossProjs[di3].active) bossProjs[di3].draw();
                for (var di4 = 0; di4 < 4; di4++) if(bossLasers[di4].active) bossLasers[di4].draw();
                if (finalBoss) finalBoss.draw();
                player.draw(); drawParts(dtRatio); drawPopups(dtRatio);
                
                if (puTime.slow > 0) { ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
                ctx.restore(); 
                return;
            }

            elapsed += dtMs;
            bgHue = (bgHue + 0.038 * dtRatio) % 360;

            if (chaos) {
                chaosFlash += dtMs;
                if (chaosFlash > 650) { chaosFlash = 0; flashScreen('hsl(' + Math.round(Math.random() * 360) + ',100%,60%,0.04)', 250); }
            }

            for (let k in puTime) if (puTime[k] > 0 && !window.infPowerups) puTime[k] = Math.max(0, puTime[k] - dtMs);
            updatePUBar();
            for (var i = 0; i < LANES; i++) {
                ldots[i].style.background = player.lane === i ? LC[i] : 'rgba(255,255,255,0.12)';
                ldots[i].style.boxShadow = player.lane === i ? '0 0 9px ' + LC[i] : 'none';
            }

            // Universal continuous scaling
            if (gameState === 'PLAY') {
                timeScaling += dtMs * 0.00005;
                gameSpeed = Math.min(baseSpeed + timeScaling, maxSpeed);
            }
            
            // Gradually reduce gem drop rate as speed naturally increases
            let gemRateMulti = Math.max(0.3, 1.0 - (timeScaling * 0.1)); 

            if (gameMode === 'endless') {
                let tSec = Math.floor(elapsed / 1000);
                
                if (!bossActive && tSec > 0 && tSec % 90 === 0 && tSec !== lastBossSec) { lastBossSec = tSec; startBoss(); }
                if (!bossActive && gameState === 'PLAY') {
                    score += (0.5 + (combo >= 10 ? 0.5 : 0)) * dtRatio; scoreEl.textContent = Math.floor(score);
                    if (tSec > 0 && tSec % 30 === 0 && tSec !== lastMilestoneSec) {
                        lastMilestoneSec = tSec;
                        addPopup(W / 2, H / 2 - 40, tSec + 'S SURVIVED!', '#00f2ff');
                        score += 10; scoreEl.textContent = Math.floor(score);
                    }
                }
            } else {
                if (!bossActive && level <= 10 && LEVEL_DATA[level]) {
                    noGemTime += dtMs;
                    if (level === 8 && levelSegment === 0) blindTime += dtMs;
                    if (levelSegment < 3 && LEVEL_DATA[level]) {
                        let desc = LEVEL_DATA[level].desc[levelSegment];
                        let prog = '';
                        if (desc.includes('COLLECT')) prog = ' (' + levelGemsGot + ')';
                        else if (desc.includes('DODGE')) prog = ' (' + levelDodges + ')';
                        else if (desc.includes('COMBO')) prog = ' (' + levelMaxCombo + 'x)';
                        else if (desc.includes('SWAP')) prog = ' (' + levelSwaps + ')';
                        else { let s = Math.floor((elapsed - chkptStartTime) / 1000); prog = ' (' + s + 's)'; }
                        hudObj.textContent = desc + prog;
                    }
                    if (levelSegment < 3) {
                        if (LEVEL_DATA[level].checks[levelSegment]()) {
                            levelSegment++;
                            if (levelSegment >= 3) startBoss();
                            else {
                                let cScr = document.getElementById('scr-checkpoint');
                                document.getElementById('chkpt-obj').textContent = LEVEL_DATA[level].desc[levelSegment];
                                hudObj.textContent = LEVEL_DATA[level].desc[levelSegment];
                                cScr.classList.add('on');
                                gameState = 'CHECKPOINT_PAUSE';
                                setTimeout(() => {
                                    cScr.classList.remove('on');
                                    gameState = 'PLAY';
                                    prevTS = null;
                                }, 2500);
                                resetChkptStats();
                                unlockedLevel = Math.max(unlockedLevel, level);
                                localStorage.setItem('vs_level_save', JSON.stringify({unlocked: unlockedLevel, current: level, checkpoint: levelSegment}));
                            }
                        }
                    }
                }
            }

            if (bossActive) {
                if (finalBoss) {
                    finalBoss.update(dtMs, dtRatio);
                    bossTimer -= dtMs;
                    if (bossTimer <= 0) {
                        spawnParts(finalBoss.x, finalBoss.y, 100, '#ff1133', {spread: 25, size: 8});
                        finishLevel();
                    }
                } else {
                    bossTimer -= dtMs;
                    bossProjTimer -= dtMs;
                    if (bossProjTimer <= 0) {
                        let bp = getBossProj();
                        if(bp) { bp.x = W + 20; bp.lane = Math.floor(Math.random()*LANES); bp.y = laneY[bp.lane]; }
                        bossProjTimer = Math.max(150, 400 - level * 4) + Math.random() * 200;
                    }
                    if (bossTimer <= 0) finishLevel();
                }

                for (let bi = 0; bi < 10; bi++) {
                    if (!bossProjs[bi].active) continue;
                    bossProjs[bi].update(dtRatio);
                    if (bossProjs[bi].x < -30) bossProjs[bi].active = false;
                }
                for (let li = 0; li < 4; li++) {
                    if (!bossLasers[li].active) continue;
                    bossLasers[li].update(dtMs, dtRatio);
                    if (bossLasers[li].duration <= 0) bossLasers[li].active = false;
                }
            }

            obsTimer -= dtMs; if (obsTimer <= 0 && !bossActive) {
                let ob = getObstacle({ moving: chaos && Math.random() < 0.4 });
                obsTimer = obsInterval();
            }
            gemTimer -= dtMs; if (gemTimer <= 0 && !bossActive) { 
                let g = getGem(); 
                gemTimer = gemInterval() * gemRateMulti; 
            }

            player.update(dtMs, dtRatio);

            var phb = player.hitbox();
            for (var oi = 0; oi < 40; oi++) {
                if (!obstacles[oi].active) continue;
                var o = obstacles[oi]; o.update(dtRatio);
                if (!o.passed && o.x + o.w < player.x - player.w / 2) {
                    o.passed = true; score += (gameMode === 'levels' ? 2 : 0); dodges++; levelDodges++; scoreEl.textContent = Math.floor(score);
                }
                if (o.x + o.w < -20) { o.active = false; continue; }
                if (rectsOverlap(phb, o.hitbox())) {
                    if (puTime.shield > 0) {
                        puTime.shield = 0; updatePUBar(); SFX.shield(); doShake(6); flashScreen('#00f2ff66', 350);
                        spawnParts(player.x, player.y, 22, '#00f2ff', { spread: 7 }); player.inv = 700;
                        o.active = false;
                    } else if (player.inv <= 0) { endGame(); ctx.restore(); return; }
                }
            }

            for (var bpi = 0; bpi < 10; bpi++) {
                if (!bossProjs[bpi].active) continue;
                var bp = bossProjs[bpi];
                if (Math.hypot(bp.x - player.x, bp.y - player.y) < bp.r + player.w / 2 - 5) {
                    if (puTime.shield > 0) {
                        puTime.shield = 0; updatePUBar(); SFX.shield(); doShake(5);
                        bp.active = false; player.inv = 600;
                    } else if (player.inv <= 0) { endGame(); ctx.restore(); return; }
                }
            }
            for (var bl_i = 0; bl_i < 4; bl_i++) {
                if (!bossLasers[bl_i].active) continue;
                var bl = bossLasers[bl_i];
                if (bl.state === 'fire' && rectsOverlap(phb, bl.hitbox())) {
                    if (puTime.shield > 0) {
                        puTime.shield = 0; updatePUBar(); SFX.shield(); doShake(8);
                        player.inv = 1000;
                    } else if (player.inv <= 0) { endGame(); ctx.restore(); return; }
                }
            }

            for (var gi = 0; gi < 20; gi++) {
                if (!gemList[gi].active) continue;
                var g = gemList[gi]; g.update(dtRatio);
                if (Math.hypot(g.x - player.x, g.y - player.y) < g.r + player.w / 2 + 2) {
                    g.active = false; gemsGot++; levelGemsGot++; combo++; noGemTime = 0;
                    totalGems++;
                    localStorage.setItem('vs_total_gems', totalGems);
                    document.getElementById('total-gems-val').textContent = totalGems;
                    if (combo > maxCombo) maxCombo = combo;
                    if (combo > levelMaxCombo) levelMaxCombo = combo;
                    if (combo >= 2) {
                        comboEl.textContent = combo >= 8 ? '🔥 x' + combo + ' INSANE 🔥' : combo >= 5 ? '⚡ x' + combo + ' ULTRA ⚡' : '✦ x' + combo + ' COMBO ✦';
                        comboEl.style.color = combo >= 8 ? '#ff3300' : combo >= 5 ? '#ffcc00' : combo >= 3 ? '#ff00ff' : '#00f2ff';
                        comboEl.classList.add('show'); clearTimeout(comboTO); comboTO = setTimeout(function () { comboEl.classList.remove('show'); }, 1400); SFX.combo();
                    }
                    spawnParts(g.x, g.y, 12, g.col, { spread: 5, grav: 0.04 });
                    if (g.type === 'power') { 
                        puTime[g.puKind] = PU_DUR[g.puKind]; powerupsUsed++; updatePUBar(); SFX.powerup(); 
                        flashScreen('rgba(255,0,255,.2)', 140); 
                        addPopup(g.x, g.y - 22, g.puKind.toUpperCase() + '!', g.puKind === 'shield' ? '#00f2ff' : g.puKind === 'slow' ? '#ffcc00' : '#ff00ff'); 
                    }
                    else { var mult = Math.max(1, Math.floor(combo / 3)); var pts = (g.type === 'super' ? 10 : 3) * mult; score += pts; scoreEl.textContent = Math.floor(score); if (g.type === 'super') SFX.super(); else SFX.gem(); flashScreen('rgba(0,242,255,.15)', 100); addPopup(g.x, g.y - 18, '+' + pts, g.col); }
                    continue;
                }
                if (g.x + g.r < player.x - player.w / 2 - 10) { let isAvoid = gameMode === 'levels' && LEVEL_DATA[level] && levelSegment < 3 && LEVEL_DATA[level].desc[levelSegment].includes('AVOID'); if (combo > 0 && !isAvoid) { addPopup(player.x, player.y - 28, 'COMBO BREAK', 'rgba(255,80,80,.85)'); combo = 0; } g.active = false; }
            }

            for (var di = 0; di < 20; di++) if(gemList[di].active) gemList[di].draw();
            for (var di2 = 0; di2 < 40; di2++) if(obstacles[di2].active) obstacles[di2].draw();
            for (var di3 = 0; di3 < 10; di3++) if(bossProjs[di3].active) bossProjs[di3].draw();
            for (var di4 = 0; di4 < 4; di4++) if(bossLasers[di4].active) bossLasers[di4].draw();
            if (finalBoss) finalBoss.draw();
            player.draw(); drawParts(dtRatio); drawPopups(dtRatio);

            if (bossActive) {
                var pct = finalBoss ? Math.max(0, finalBoss.hp / finalBoss.maxHp) : Math.max(0, bossTimer / (6000 + (level * 200)));
                var barCol = finalBoss ? '#9900ff' : '#ff3300';
                var boxCol = finalBoss ? '#ff1133' : 'rgba(255,80,0,.4)';
                var barY = H - 30, barH = 12;
                ctx.save();
                ctx.font = "bold 10px 'Share Tech Mono', monospace"; ctx.fillStyle = barCol; ctx.textAlign = 'center';
                ctx.fillText(finalBoss ? '◆ VOID CORE ◆' : '◆ BOSS ◆', W / 2, barY - 6);
                drawGlowFast(W * 0.15 + (W * 0.7 * pct)/2, barY + barH/2, barCol, W * 0.35, 0.4);
                ctx.fillRect(W * 0.15, barY, W * 0.7 * pct, barH);
                ctx.strokeStyle = boxCol; ctx.lineWidth = 1.5; ctx.strokeRect(W * 0.15, barY, W * 0.7, barH);
                ctx.restore();
            }

            if (puTime.slow > 0) { ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
            if (chaos) { ctx.save(); ctx.globalAlpha = 0.022; for (var sy = 0; sy < H; sy += 5) { ctx.fillStyle = 'hsl(' + (((sy * 0.4) + Date.now() * 0.04) % 360) + ',100%,60%)'; ctx.fillRect(0, sy, W, 4); } ctx.restore(); }
            
            if (gameMode === 'levels' && level === 8 && levelSegment === 0) {
                if (elapsed % 1000 > 200) {
                    ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore();
                }
            }
            
            ctx.restore();
        }

        function drawParts(dtRatio) {
            dtRatio = dtRatio || 1;
            for (var i = 0; i < 60; i++) {
                if (!particles[i].active) continue;
                var p = particles[i]; p.x += p.vx * dtRatio; p.y += p.vy * dtRatio; p.vy += p.grav * dtRatio; p.vx *= Math.pow(0.97, dtRatio); p.life -= 0.024 * dtRatio;
                if (p.life <= 0) { p.active = false; continue; }
                drawGlowFast(p.x, p.y, p.col, p.size * 3, p.life * 0.6);
                ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
        }
        function drawPopups(dtRatio) {
            dtRatio = dtRatio || 1;
            for (var i = 0; i < 15; i++) {
                if (!popups[i].active) continue;
                var p = popups[i]; p.y += p.vy * dtRatio; p.vy *= Math.pow(0.93, dtRatio); p.life -= 0.026 * dtRatio;
                if (p.life <= 0) { p.active = false; continue; }
                drawGlowFast(p.x, p.y - 5, p.col, 25, p.life * 0.5);
                ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col;
                ctx.font = "bold 17px 'Orbitron', monospace"; ctx.textAlign = 'center'; ctx.fillText(p.txt, p.x, p.y); ctx.restore();
            }
        }

        /* ════════════════════════════════════════════════
           9. GAME FLOW
        ════════════════════════════════════════════════ */
        function startGame(modeArg = 'endless', resume = false, targetLevel = null) {
            stopBGMusicFade();
            gameState = 'PLAY';
            gameMode = modeArg;
            let startLevel = targetLevel || 1, startSegment = 0;

            if (resume && gameMode === 'levels') {
                let chk = JSON.parse(localStorage.getItem('vs_level_save') || '{}');
                if (chk.level) {
                   startLevel = chk.level;
                   startSegment = chk.checkpoint || 0;
                }
            }

            score = 0; level = startLevel; levelSegment = startSegment;
            document.getElementById('total-gems-val').textContent = totalGems;
            updateLevelDifficulty();
            elapsed = 0; bossActive = false; bossTimer = 0; bossProjTimer = 0;
            combo = 0; maxCombo = 0; gemsGot = 0; dodges = 0;
            puTime = { shield: 0, slow: 0, magnet: 0 };
            chaosFlash = 0; obsTimer = 900; gemTimer = 600; gridOff = 0; shakeMag = 0;
            lastBossSec = -1; lastMilestoneSec = -1;
            resetChkptStats();
            
            for(let i=0; i<40; i++) obstacles[i].active = false;
            for(let i=0; i<20; i++) gemList[i].active = false;
            for(let i=0; i<10; i++) bossProjs[i].active = false;
            for(let i=0; i<60; i++) particles[i].active = false;
            for(let i=0; i<4; i++) bossLasers[i].active = false;
            for(let i=0; i<15; i++) popups[i].active = false;
            finalBoss = null;

            scoreEl.textContent = Math.floor(score);
            let lvlTitle = (gameMode === 'levels' && LEVEL_DATA[level]) ? LEVEL_DATA[level].title : '';
            waveLbl.textContent = gameMode === 'endless' ? 'ENDLESS SURVIVAL' : ('L' + level + ' · ' + lvlTitle.toUpperCase());
            if (gameMode === 'levels' && LEVEL_DATA[level] && levelSegment < 3) {
                hudObj.style.display = 'block';
                hudObj.textContent = LEVEL_DATA[level].desc[levelSegment];
            } else {
                hudObj.style.display = 'none';
            }
            comboEl.classList.remove('show');
            updatePUBar();

            scrStart.classList.remove('on'); scrOver.classList.remove('on'); scrPause.classList.remove('on'); scrVictory.classList.remove('on'); scrLevels.classList.remove('on');
            btnPause.style.display = 'block';
            player = new Player(); getAudio();

            // Pre-load a rewarded ad so it's ready by game over
            if (typeof AdManager !== 'undefined') AdManager.prepareRewarded();
        }

        // Track gems earned this run for the 2× reward
        let _lastRunGems = 0;

        function endGame() {
            lastPlayedMode = gameMode;   // Remember for Retry
            lastPlayedLevel = level;     // Remember for Retry
            gameState = 'OVER'; btnPause.style.display = 'none'; SFX.die(); doShake(16); flashScreen('#ff000066', 500);
            spawnParts(player.x, player.y, 45, '#ff3366', { spread: 10, size: 4, grav: 0.18 });
            finalScEl.textContent = Math.floor(score);
            _lastRunGems = gemsGot;
            
            if(gameMode === 'endless') {
                let currentBest = parseInt(localStorage.getItem('vs_endless_best') || 0);
                if(score > currentBest) localStorage.setItem('vs_endless_best', Math.floor(score));
                finalSubEl.innerHTML = 'SURVIVED ' + Math.floor(elapsed/1000) + 'S &nbsp;·&nbsp; MAX COMBO ×' + maxCombo + '<br>DODGED ' + dodges + ' BLOCKS &nbsp;·&nbsp; GEMS ' + gemsGot + '<br>PERSONAL BEST ' + Math.max(currentBest, Math.floor(score));
            } else {
                let lvlName = LEVEL_DATA[level] ? LEVEL_DATA[level].title : '';
                finalSubEl.innerHTML = lvlName.toUpperCase() + ' — LEVEL ' + level + '<br>PHASE ' + (levelSegment+1) + '/3 &nbsp;·&nbsp; GEMS ' + gemsGot + ' &nbsp;·&nbsp; COMBO ×' + maxCombo;
            }
            
            let chk = JSON.parse(localStorage.getItem('vs_level_save') || '{}');
            const btnResumeOver = document.getElementById('btn-resume-chkpt-over');
            const btnRestart = document.getElementById('btn-restart');
            if (gameMode === 'levels' && chk.level && chk.level <= MAX_LEVELS) {
                btnResumeOver.style.display = 'inline-block';
                btnResumeOver.textContent = 'RETRY L' + chk.level;
                btnRestart.classList.add('sec');
                btnRestart.textContent = 'MENU';
            } else {
                btnResumeOver.style.display = 'none';
                btnRestart.classList.remove('sec');
                btnRestart.textContent = 'MENU';
            }

            if (score > bestScore) {
                bestScore = Math.floor(score); localStorage.setItem('vs_best_100', bestScore);
                bestEl.textContent = bestScore; finalSubEl.innerHTML += '<br><span class="new-hs">★ NEW BEST SCORE ★</span>';
                if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
                    window.Capacitor.Plugins.NativeBridge.saveHighScore({score: bestScore}).then(function(res) {
                        if (res && res.isNewHighScore) showNativeToast('NATIVE HIGH SCORE SYNCED!');
                    });
                }
            }

            // Reset ad reward buttons for this death
            var btnDoubleGems = document.getElementById('btn-ad-double-gems');
            var btnAdRetry = document.getElementById('btn-ad-retry-level');
            btnDoubleGems.disabled = false;
            btnDoubleGems.classList.remove('claimed');
            btnDoubleGems.textContent = '▶ WATCH AD — 2× GEMS';
            // Show retry-level ad button only in levels mode with a valid checkpoint
            if (gameMode === 'levels' && chk.level && chk.level <= MAX_LEVELS) {
                btnAdRetry.style.display = 'inline-block';
                btnAdRetry.disabled = false;
                btnAdRetry.classList.remove('claimed');
                btnAdRetry.textContent = '▶ WATCH AD — RETRY L' + chk.level;
            } else {
                btnAdRetry.style.display = 'none';
            }
            // Hide gems button if 0 gems earned (nothing to double)
            if (gemsGot <= 0) btnDoubleGems.style.display = 'none';
            else btnDoubleGems.style.display = 'inline-block';

            // Show interstitial ad (every 3rd death), then reveal game over screen
            if (typeof AdManager !== 'undefined') {
                AdManager.showInterstitialIfDue(function() {
                    scrOver.classList.add('on');
                });
            } else {
                scrOver.classList.add('on');
            }
        }

        function winGame() {
            gameState = 'VICTORY'; btnPause.style.display = 'none'; SFX.powerup(); doShake(16); flashScreen('#ffcc0066', 1000);
            spawnParts(player.x, player.y, 100, '#ffcc00', { spread: 15, size: 5, grav: 0.1 });
            finalScWEl.textContent = Math.floor(score);
            finalSubWEl.innerHTML = 'THE VOID HAS BEEN PURIFIED.<br>MAX COMBO ×' + maxCombo + ' &nbsp;·&nbsp; GEMS ' + gemsGot;
            if (score > bestScore) {
                bestScore = Math.floor(score); localStorage.setItem('vs_best_100', bestScore);
                bestEl.textContent = bestScore; finalSubWEl.innerHTML += '<br><span class="new-hs">★ LEGENDARY NEW BEST ★</span>';
                if (window.Capacitor && window.Capacitor.Plugins.NativeBridge) {
                    window.Capacitor.Plugins.NativeBridge.saveHighScore({score: bestScore}).then(function(res) {
                        if (res && res.isNewHighScore) showNativeToast('NATIVE HIGH SCORE SYNCED!');
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
            console.log('[INPUT] keydown detected:', e.key);
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); console.log('[INPUT] move UP triggered'); player.move(-1); }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); console.log('[INPUT] move DOWN triggered'); player.move(1); }
            if (e.code === 'Space') { e.preventDefault(); console.log('[INPUT] flip triggered'); player.flip(); }
        });

        var tSY = null, tSX = null, tST = null;
        canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
            console.log('[INPUT] touch detected');
            tSY = e.touches[0].clientY; tSX = e.touches[0].clientX; tST = Date.now();
            getAudio();
        }, { passive: false });
        canvas.addEventListener('touchend', function (e) {
            e.preventDefault(); if (tSY === null) return;
            if (gameState === 'PLAY') {
                var dy = e.changedTouches[0].clientY - tSY, dx = e.changedTouches[0].clientX - tSX;
                // Only trigger vertical swipe if distance is significant enough and more vertical than horizontal
                if (Math.abs(dy) > 25 && Math.abs(dy) > Math.abs(dx)) { 
                    console.log('[INPUT] swipe → move triggered, dy=' + dy); 
                    player.move(dy < 0 ? -1 : 1); 
                }
            }
            tSY = null; tSX = null; tST = null;
        }, { passive: false });

        document.getElementById('btn-endless').addEventListener('click', function() { startGame('endless', false); });
        document.getElementById('btn-levels').addEventListener('click', function() { showLevelSelect(); });
        document.getElementById('btn-close-levels').addEventListener('click', function() { showStartScreen(); });
        document.getElementById('btn-restart').addEventListener('click', function() { showStartScreen(); });
        document.getElementById('btn-restart-win').addEventListener('click', function() { startGame(gameMode, false); });
        document.getElementById('btn-resume-chkpt-start').addEventListener('click', function() { startGame('levels', true); });
        document.getElementById('btn-resume-chkpt-over').addEventListener('click', function() { startGame('levels', true); });
        document.getElementById('btn-retry').addEventListener('click', function() {
            // Instantly restart the same mode and level from scratch (no checkpoint)
            startGame(lastPlayedMode, false, lastPlayedMode === 'levels' ? lastPlayedLevel : null);
        });
        document.getElementById('btn-resume').addEventListener('click', startResumeCountdown);
        document.getElementById('btn-quit').addEventListener('click', function () { playBGMusic(); gameState = 'MENU'; scrPause.classList.remove('on'); scrStart.classList.add('on'); btnPause.style.display = 'none'; });
        btnPause.addEventListener('click', function () { if (gameState === 'PLAY') { gameState = 'PAUSE'; scrPause.classList.add('on'); btnPause.style.display = 'none'; } });

        // Login & Settings Logic
        function showStartScreen() {
            playBGMusic();
            gameState = 'MENU';
            welcomeMsg.textContent = 'WELCOME, ' + playerName.toUpperCase();
            let chk = JSON.parse(localStorage.getItem('vs_level_save') || '{}');
            const btnResumeStart = document.getElementById('btn-resume-chkpt-start');
            if (chk.level && chk.level <= MAX_LEVELS) {
                btnResumeStart.style.display = 'inline-block';
                btnResumeStart.textContent = 'RESUME L' + chk.level;
            } else {
                btnResumeStart.style.display = 'none';
            }

            scrLogin.classList.remove('on');
            scrSettings.classList.remove('on');
            scrLevels.classList.remove('on');
            if(document.getElementById('scr-skins')) document.getElementById('scr-skins').classList.remove('on');
            scrOver.classList.remove('on');
            scrVictory.classList.remove('on');
            scrPause.classList.remove('on');
            scrConfirm.classList.remove('on');
            scrStart.classList.add('on');
        }
        function showLevelSelect() {
            gameState = 'LEVEL_SELECT';
            let grid = document.getElementById('level-grid');
            grid.innerHTML = '';
            for (let i = 1; i <= MAX_LEVELS; i++) {
                let btn = document.createElement('div');
                btn.className = 'level-btn' + (i > unlockedLevel ? ' locked' : '');
                btn.textContent = i;
                if (i <= unlockedLevel) {
                    btn.addEventListener('click', function() {
                        startGame('levels', false, i); 
                    });
                }
                grid.appendChild(btn);
            }
            scrStart.classList.remove('on');
            scrLevels.classList.add('on');
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

        const scrSkins = document.getElementById('scr-skins');
        const skinsGrid = document.getElementById('skins-grid');
        const skinsTotalGemsVal = document.getElementById('skins-total-gems-val');

        function renderSkinsMenu() {
            if(!skinsTotalGemsVal) return;
            skinsTotalGemsVal.textContent = totalGems;
            skinsGrid.innerHTML = '';
            Object.keys(SKINS_DATA).forEach(id => {
                let s = SKINS_DATA[id];
                let isUnlocked = unlockedSkins.includes(id);
                let isEquipped = selectedSkin === id;
                
                let card = document.createElement('div');
                card.className = 'skin-card' + (isUnlocked ? '' : ' locked') + (isEquipped ? ' equipped' : '');
                
                let html = '<div class="skin-img-wrap">';
                html += '<canvas class="skin-cnv" width="80" height="80"></canvas>';
                if (!isUnlocked) {
                    html += '<div class="skin-lock-overlay">🔒</div>';
                }
                html += '</div>';
                
                html += '<div class="skin-name">' + s.name + '</div>';
                
                if (!isUnlocked) {
                    html += '<div class="skin-cost">' + s.cost + ' 💎</div>';
                    html += '<div class="skin-status" style="color:#ff3366;">LOCKED</div>';
                } else if (isEquipped) {
                    html += '<div class="skin-cost" style="color:#ff00ff; text-shadow:0 0 10px #ff00ff;">EQUIPPED</div>';
                    html += '<div class="skin-status" style="color:#ff00ff;">SELECTED</div>';
                } else {
                    html += '<div class="skin-cost" style="color:#00f2ff;">UNLOCKED</div>';
                    html += '<div class="skin-status" style="color:#00f2ff;">READY</div>';
                }
                
                card.innerHTML = html;
                
                // Draw Preview
                let cvs = card.querySelector('canvas');
                let c = cvs.getContext('2d');
                drawSkinPreview(c, id, 1.2, 185, 0); 
                
                card.addEventListener('click', function() {
                    if (isUnlocked) {
                        if (!isEquipped) {
                            selectedSkin = id;
                            localStorage.setItem('vs_selected_skin', selectedSkin);
                            SFX.powerup();
                            renderSkinsMenu();
                        }
                    } else {
                        if (totalGems >= s.cost) {
                            totalGems -= s.cost;
                            localStorage.setItem('vs_total_gems', totalGems);
                            document.getElementById('total-gems-val').textContent = totalGems;
                            unlockedSkins.push(id);
                            localStorage.setItem('vs_unlocked_skins', JSON.stringify(unlockedSkins));
                            selectedSkin = id;
                            localStorage.setItem('vs_selected_skin', selectedSkin);
                            SFX.super();
                            renderSkinsMenu();
                        } else {
                            card.style.borderColor = '#ff3366';
                            setTimeout(() => { card.style.borderColor = ''; }, 300);
                            SFX.die(); // using die as error bump
                        }
                    }
                });
                skinsGrid.appendChild(card);
            });
        }
        
        function showSkinsScreen() {
            gameState = 'SKINS';
            renderSkinsMenu();
            scrStart.classList.remove('on');
            scrSkins.classList.add('on');
        }

        if(document.getElementById('btn-skins')) document.getElementById('btn-skins').addEventListener('click', showSkinsScreen);
        if(document.getElementById('btn-close-skins')) document.getElementById('btn-close-skins').addEventListener('click', showStartScreen);

        document.getElementById('btn-login-submit').addEventListener('click', processLogin);
        inputName.addEventListener('keydown', function (e) { if (e.key === 'Enter') processLogin(); });

        document.getElementById('btn-settings').addEventListener('click', function () {
            gameState = 'SETTINGS';
            setNameDisp.textContent = playerName.toUpperCase();
            document.getElementById('set-highscore-display').textContent = bestScore;
            document.getElementById('set-totalgems-display').textContent = totalGems;
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
                localStorage.removeItem('vs_level_save');
                localStorage.removeItem('vs_endless_best');
                localStorage.removeItem('vs_muted');
                localStorage.removeItem('vs_total_gems');
                localStorage.removeItem('vs_unlocked_skins');
                localStorage.removeItem('vs_selected_skin');
                unlockedSkins = ['default-jet'];
                selectedSkin = 'default-jet';
                bestScore = 0; bestEl.textContent = '0';
                totalGems = 0; document.getElementById('total-gems-val').textContent = '0';
                unlockedLevel = 1; level = 1;
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

        // --- Ad Reward Button Handlers ---
        document.getElementById('btn-ad-double-gems').addEventListener('click', function() {
            var btn = this;
            if (btn.disabled || typeof AdManager === 'undefined') return;
            btn.disabled = true;
            btn.textContent = 'LOADING AD...';

            AdManager.showRewarded(function(success) {
                if (!success) {
                    btn.disabled = false;
                    btn.textContent = '▶ WATCH AD — 2× GEMS';
                    return;
                }
                
                // Award bonus gems (double what was earned this run)
                var bonus = _lastRunGems;
                totalGems += bonus;
                localStorage.setItem('vs_total_gems', totalGems);
                document.getElementById('total-gems-val').textContent = totalGems;
                // Update the final sub text to show the bonus
                finalSubEl.innerHTML += '<br><span style="color:#ffcc00;text-shadow:0 0 10px #ffcc00;">+' + bonus + ' BONUS GEMS ★</span>';
                btn.classList.add('claimed');
                btn.textContent = '✓ GEMS DOUBLED!';
                if (typeof SFX !== 'undefined' && SFX.powerup) SFX.powerup();
            });
        });

        document.getElementById('btn-ad-retry-level').addEventListener('click', function() {
            var btn = this;
            if (btn.disabled || typeof AdManager === 'undefined') return;
            btn.disabled = true;
            btn.textContent = 'LOADING AD...';

            AdManager.showRewarded(function(success) {
                if (!success) {
                    let chk = JSON.parse(localStorage.getItem('vs_level_save') || '{}');
                    btn.disabled = false;
                    btn.textContent = '▶ WATCH AD — RETRY L' + (chk.level || '');
                    return;
                }
                
                // Start the level from the checkpoint
                startGame('levels', true);
            });
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
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                if (!bgMusic.paused) { bgMusic.pause(); bgMusic._wasPlaying = true; }
                if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
            } else {
                if (bgMusic._wasPlaying) { bgMusic.play().catch(function(){}); bgMusic._wasPlaying = false; }
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
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
