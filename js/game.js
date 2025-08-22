const urlParams = new URLSearchParams(window.location.search);
let level = urlParams.get("level") || "easy";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const statusDiv = document.getElementById("status");
const timerSpan = document.getElementById("timeLeft");
const levelTitle = document.getElementById("levelTitle");
const clearBtn = document.getElementById("clearBtn");

let dots = [];
let currentIndex = 0;
let timeLeft = 30;
let timer = null;
let isDragging = false;
let connectedLines = [];
let dragPos = null; // ✅ track current drag position

// Load level data
fetch(`data/${level}.json`)
  .then((res) => res.json())
  .then((data) => {
    dots = data.dots || [];
    setupGame();
  })
  .catch((err) => {
    console.error("Failed to load dots:", err);
    statusDiv.innerHTML = `<p class="lose">❌ Could not load level data.</p>`;
  });

function setupGame() {
  levelTitle.textContent = `Level: ${level.toUpperCase()}`;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  currentIndex = 0;
  connectedLines = [];
  statusDiv.innerHTML = "";

  drawDots();

  // Timer (30s each round)
  timeLeft = 30;
  timerSpan.textContent = timeLeft;
  if (timer) clearInterval(timer);
  timer = setInterval(updateTimer, 1000);
}

// Draw dots + lines
function drawDots() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw connected lines
  connectedLines.forEach(line => {
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y);
    ctx.lineTo(line.to.x, line.to.y);
    ctx.strokeStyle = line.correct ? "#e53935" : "#9e9e9e";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // ✅ Draw active drag line
  if (isDragging && dragPos && currentIndex > 0) {
    const prev = dots[currentIndex - 1];
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(dragPos.x, dragPos.y);
    ctx.strokeStyle = "#555";
    ctx.setLineDash([5, 5]); // dashed preview
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); // reset dash
  }

  // Draw dots
  ctx.fillStyle = "#1565c0";
  ctx.font = "14px Arial";
  dots.forEach((dot, i) => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(i + 1, dot.x + 10, dot.y + 5);
  });
}

function updateTimer() {
  timeLeft--;
  timerSpan.textContent = timeLeft;
  if (timeLeft <= 0) {
    clearInterval(timer);
    showLose();
  }
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;
  if (e.touches && e.touches[0]) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function nearDot(pos, dot, radius = 14) {
  const dx = pos.x - dot.x;
  const dy = pos.y - dot.y;
  return Math.hypot(dx, dy) <= radius;
}

// Start drag
function onStart(e) {
  e.preventDefault();
  if (timeLeft <= 0) return;
  isDragging = true;
  dragPos = getPos(e); // ✅ track drag start
  drawDots();
}

// While dragging
function onMove(e) {
  if (!isDragging || timeLeft <= 0) return;

  dragPos = getPos(e); // ✅ update drag position
  drawDots();

  // Check if user reached a dot
  dots.forEach((dot, i) => {
    if (nearDot(dragPos, dot)) {
      if (i === currentIndex) {
        // Correct connection
        if (currentIndex > 0) {
          const prev = dots[currentIndex - 1];
          connectedLines.push({ from: prev, to: dot, correct: true });
        }
        currentIndex++;
        dragPos = null;
        drawDots();

        if (currentIndex === dots.length) {
          clearInterval(timer);
          isDragging = false;

          // ✅ Add final closing line to complete the shape
          connectedLines.push({ from: dots[dots.length - 1], to: dots[0], correct: true });
          drawDots();

          showFilledShape();
          setTimeout(nextLevel, 1500);
        }
      } else {
        // Wrong connection
        if (currentIndex > 0) {
          const prev = dots[currentIndex - 1];
          connectedLines.push({ from: prev, to: dot, correct: false });
          drawDots();
        }
      }
    }
  });
}

function onEnd() {
  isDragging = false;
  dragPos = null;
  drawDots();
}

function clearConnections() {
  connectedLines = [];
  currentIndex = 0;
  drawDots();
}

function showLose() {
  statusDiv.innerHTML = `
    <h3 class="lose">😢 You Lose!</h3>
    <p>Time ran out. Try again from the first round.</p>
    <button class="btn" onclick="restartGame()">🔄 Restart (Easy)</button>
  `;
}

function showFilledShape() {
  if (!dots.length) return;
  ctx.beginPath();
  ctx.moveTo(dots[0].x, dots[0].y);
  for (let i = 1; i < dots.length; i++) {
    ctx.lineTo(dots[i].x, dots[i].y);
  }
  ctx.closePath(); // ✅ ensures the shape is fully closed
  ctx.fillStyle = "rgba(76, 175, 80, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "#2e7d32";
  ctx.lineWidth = 2;
  ctx.stroke();

  const next = nextLevelName(level);
  if (next) {
    statusDiv.innerHTML = `
      <h3 class="next">✅ ${level.toUpperCase()} complete!</h3>
      <p>Moving to <strong>${next.toUpperCase()}</strong>…</p>
    `;
  } else {
    statusDiv.innerHTML = `
      <h3 class="win">🏆 You are the Winner!</h3>
      <button class="btn" onclick="restartGame()">🔄 Restart </button>
      <button class="btn" onclick="goHome()">🏠 Home</button>
    `;
  }
}

function nextLevelName(curr) {
  if (curr === "easy") return "medium";
  if (curr === "medium") return "hard";
  return null;
}

function nextLevel() {
  const next = nextLevelName(level);
  if (!next) return;
  window.location = `game.html?level=${next}`;
}

function restartGame() {
  window.location = "game.html?level=easy";
}

function goHome() {
  window.location = "index.html";
}

// Events
canvas.addEventListener("mousedown", onStart);
canvas.addEventListener("mousemove", onMove);
canvas.addEventListener("mouseup", onEnd);

canvas.addEventListener("touchstart", onStart, { passive: false });
canvas.addEventListener("touchmove", onMove, { passive: false });
canvas.addEventListener("touchend", onEnd);

clearBtn.addEventListener("click", clearConnections);
