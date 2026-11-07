(function() {
    const container = document.getElementById("game-container");
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.touchAction = "none"; // stops the page scrolling while swiping
    canvas.style.background = "linear-gradient(#1b2a49, #0d1424)";
    canvas.style.borderRadius = "12px";
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let W = 800;
    let H = 500;
    let S = 1; // size scale for fruit, hitboxes and text

    function fitCanvas() {
        const cs = getComputedStyle(container);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const avail = Math.floor(container.clientWidth - padX);
        W = Math.max(280, Math.min(800, avail));
        H = W < 600 ?
            Math.round(Math.max(400, Math.min(W * 1.5, window.innerHeight * 0.7))) :
            Math.round(W * 0.625);
        S = Math.max(0.75, Math.min(1, W / 700));
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
    }
    fitCanvas();

    // refit on rotate or window resize (ignore the phone address bar changing height)
    let lastWidth = window.innerWidth;
    window.addEventListener("resize", function() {
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            fitCanvas();
        }
    });
    const GRAVITY = 0.22;
    const FRUITS = ["🍎", "🍊", "🍉", "🍌", "🍓", "🍍", "🍇"];

    let state = "ready"; // ready | playing | over
    let fruits = [];
    let pieces = [];
    let trail = [];
    let score = 0;
    let lives = 20;
    let best = Number(localStorage.getItem("fruitSlicerBest") || 0);
    let spawnTimer = 0;
    let slicing = false;
    let lastPoint = null;

    function reset() {
        fruits = [];
        pieces = [];
        trail = [];
        score = 0;
        lives = 20;
        spawnTimer = 0;
        state = "playing";
    }

    function spawn() {
        const isBomb = Math.random() < 0.15;
        const m = 50 * S;
        const x = m + Math.random() * (W - 2 * m);
        fruits.push({
            x: x,
            y: H + 30,
            vx: (W / 2 - x) / 140 + (Math.random() - 0.5) * 1.5,
            vy: -(9 + Math.random() * 3.5),
            r: 30 * S,
            bomb: isBomb,
            emoji: isBomb ? "💣" : FRUITS[Math.floor(Math.random() * FRUITS.length)],
            angle: 0,
            spin: (Math.random() - 0.5) * 0.15,
        });
    }

    function pointFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) * W) / rect.width,
            y: ((e.clientY - rect.top) * H) / rect.height,
        };
    }

    // distance from point (px,py) to the line segment a-b
    function distToSegment(px, py, a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
    }

    function sliceCheck(a, b) {
        for (const f of fruits) {
            if (f.sliced) continue;
            if (distToSegment(f.x, f.y, a, b) <= f.r) {
                f.sliced = true;
                if (f.bomb) {
                    endGame();
                    return;
                }
                score += 1;
                // two halves flying apart
                pieces.push({ x: f.x, y: f.y, vx: f.vx - 2, vy: f.vy * 0.3, emoji: f.emoji, life: 40 });
                pieces.push({ x: f.x, y: f.y, vx: f.vx + 2, vy: f.vy * 0.3, emoji: f.emoji, life: 40 });
            }
        }
    }

    function endGame() {
        state = "over";
        if (score > best) {
            best = score;
            try { localStorage.setItem("fruitSlicerBest", String(best)); } catch (e) {}
        }
    }

    canvas.addEventListener("pointerdown", function(e) {
        const p = pointFromEvent(e);
        if (state === "ready" || state === "over") {
            reset();
            return;
        }
        slicing = true;
        lastPoint = p;
        trail = [p];
        canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", function(e) {
        if (!slicing || state !== "playing") return;
        const p = pointFromEvent(e);
        trail.push(p);
        if (trail.length > 12) trail.shift();
        sliceCheck(lastPoint, p);
        lastPoint = p;
    });

    function stopSlicing() {
        slicing = false;
        lastPoint = null;
        trail = [];
    }
    canvas.addEventListener("pointerup", stopSlicing);
    canvas.addEventListener("pointercancel", stopSlicing);

    function update() {
        if (state !== "playing") return;

        // spawn faster as score rises
        spawnTimer -= 1;
        if (spawnTimer <= 0) {
            spawn();
            spawnTimer = Math.max(25, 70 - score * 1.2);
        }

        for (const f of fruits) {
            f.x += f.vx;
            f.y += f.vy;
            f.vy += GRAVITY;
            f.angle += f.spin;
        }

        // missed fruit costs a life (bombs are fine to miss)
        for (const f of fruits) {
            if (f.y > H + 50 && f.vy > 0 && !f.sliced && !f.bomb && !f.counted) {
                f.counted = true;
                lives -= 1;
                if (lives <= 0) {
                    endGame();
                }
            }
        }
        fruits = fruits.filter(function(f) { return !f.sliced && f.y < H + 80; });

        for (const p of pieces) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += GRAVITY;
            p.life -= 1;
        }
        pieces = pieces.filter(function(p) { return p.life > 0; });
    }

    function drawEmoji(emoji, x, y, size, angle, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.font = size + "px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
    }

    function centerText(text, y, size, color) {
        ctx.fillStyle = color || "#fff";
        ctx.font = "bold " + Math.round(size * S) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, W / 2, y);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        for (const f of fruits) drawEmoji(f.emoji, f.x, f.y, 60 * S, f.angle);
        for (const p of pieces) drawEmoji(p.emoji, p.x, p.y, 40 * S, 0, p.life / 40);

        // blade trail
        if (trail.length > 1) {
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
        }

        // HUD
        ctx.fillStyle = "#fff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Score: " + score, 16, 14);
        ctx.textAlign = "right";
        ctx.fillText("Best: " + best, W - 16, 14);
        ctx.fillText("❤️ × " + Math.max(lives, 0), W - 16, 44);

        if (state === "ready") {
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(0, 0, W, H);
            centerText("Fruit Slicer", H / 2 - 40, 44);
            centerText("Swipe to slice fruit. Avoid the bombs!", H / 2 + 10, 20, "#ddd");
            centerText("Click or tap to start", H / 2 + 50, 20, "#ffd54f");
        } else if (state === "over") {
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.fillRect(0, 0, W, H);
            centerText("Game Over", H / 2 - 40, 44);
            centerText("Score: " + score + "   Best: " + best, H / 2 + 10, 22, "#ddd");
            centerText("Click or tap to play again", H / 2 + 50, 20, "#ffd54f");
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }
    loop();
})();