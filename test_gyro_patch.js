// Read content and apply structural fixes
const fs = require('fs');
let code = fs.readFileSync('www/index.js', 'utf8');

// 1. Upgrade onOrientation to handle Android landscape orientation properly
const gyroFuncNew = `            function onOrientation(e) {
                // Robust pitch axis extraction honoring landscape rotation while preserving fallbacks
                let winOri = (screen && screen.orientation && screen.orientation.angle) || window.orientation || 0;
                let pitch = e.beta || 0;
                if (Math.abs(winOri) === 90) {
                    pitch = e.gamma || 0;
                    if (winOri === -90) pitch = -pitch;
                } else if (winOri === 180) {
                    pitch = -(e.beta || 0);
                }
                
                rawBeta = pitch;
                
                if (!gyroActive) {
                    gyroActive = true;
                    if (noSensorTimer) { clearTimeout(noSensorTimer); noSensorTimer = null; }
                    const chip = document.getElementById('gyroStatusChip');
                    const txt  = document.getElementById('gyroStatusText');
                    if (chip) chip.className = 'gyro-status-chip on';
                    if (txt)  txt.textContent = 'Active';
                }
            }`;

const gyroFuncOld = `            function onOrientation(e) {
                // e.beta = front/back tilt (-180..180)
                rawBeta = e.beta || 0;
                if (!gyroActive) {
                    gyroActive = true;
                    if (noSensorTimer) { clearTimeout(noSensorTimer); noSensorTimer = null; }
                    // Update status chip immediately on first data
                    const chip = document.getElementById('gyroStatusChip');
                    const txt  = document.getElementById('gyroStatusText');
                    if (chip) chip.className = 'gyro-status-chip on';
                    if (txt)  txt.textContent = 'Active';
                }
            }`;

code = code.replace(gyroFuncOld, gyroFuncNew);

// 2. Adjust smoothing responsiveness in Player.prototype.update
const playerUpdateOld = `                const magnetBoost = (puTime && puTime.magnet > 0) ? 1.5 : 1.0;
                gyroSmoothedY = gyroSmoothedY * 0.7 + yDelta * 0.3;
                this.y += gyroSmoothedY * gameSpeed * 4 * magnetBoost;
                this.y = Math.max(laneY[0], Math.min(laneY[LANES - 1], this.y));`;

const playerUpdateNew = `                const magnetBoost = (puTime && puTime.magnet > 0) ? 1.5 : 1.0;
                // Faster response: 50/50 weighting instead of 70/30
                gyroSmoothedY = gyroSmoothedY * 0.5 + yDelta * 0.5;
                this.y += gyroSmoothedY * gameSpeed * 5 * magnetBoost; // increased multiplier for decisive movement
                this.y = Math.max(laneY[0], Math.min(laneY[LANES - 1], this.y));`;

code = code.replace(playerUpdateOld, playerUpdateNew);

// 3. Improve visual debug log on screen
const oldDebug = `// Temporarily log for debugging
                if (Math.random() < 0.05) console.log("GYRO DELTA: ", yDelta, "RAW BETA: ", GyroSettings.getRawBeta());`;
const newDebug = `// On-screen debug for instant verification
                const debugOut = document.getElementById('score-board');
                if (debugOut && Math.random() < 0.1) {
                   debugOut.innerHTML = \`<div style="font-size:12px; color:yellow;">R: \${GyroSettings.getRawBeta().toFixed(1)} <br>D: \${yDelta.toFixed(2)}</div>\`;
                }`;

code = code.replace(oldDebug, newDebug);

fs.writeFileSync('www/index.js', code);
console.log("Patched index.js");
