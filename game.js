const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CANVAS ================= */

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

const TILE = 256;
const INTERSECTION_SIZE = TILE;

/* ================= LOAD IMAGES ================= */

const mapImg = new Image();
mapImg.src = "map01.png";

const cartImg = new Image();
cartImg.src = "cart.png";

const arrowImg = new Image();
arrowImg.src = "arrow.png";

/* ================= GAME STATE ================= */

let gameState = "playing";

let intersection = {
  turnUp: false
};

let cart = {
  x: 200,
  y: WORLD_HEIGHT / 2,
  speed: 4,
  vx: 4,
  vy: 0,
  rotation: 0
};

/* ================= HELPERS ================= */

function getScale() {
  return Math.min(
    canvas.width / WORLD_WIDTH,
    canvas.height / WORLD_HEIGHT
  );
}

function getIntersectionBox() {
  return {
    x: WORLD_WIDTH / 2 - TILE / 2,
    y: WORLD_HEIGHT / 2 - TILE / 2,
    size: INTERSECTION_SIZE
  };
}

/* ================= DRAW ================= */

function drawMap() {
  ctx.drawImage(
    mapImg,
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT
  );
}

function drawIntersectionArrow() {
  const box = getIntersectionBox();

  const centerX = box.x + box.size / 2;
  const centerY = box.y + box.size / 2;

  ctx.save();
  ctx.translate(centerX, centerY);

  // Rotate based on intersection direction
  const rotation = intersection.turnUp ? -Math.PI / 2 : 0;
  ctx.rotate(rotation);

  // Adjust size if needed
  const size = 180;

  ctx.drawImage(
    arrowImg,
    -size / 2,
    -size / 2,
    size,
    size
  );

  ctx.restore();
}

function drawCart() {
  ctx.save();
  ctx.translate(cart.x, cart.y);
  ctx.rotate(cart.rotation);

  ctx.drawImage(
    cartImg,
    -TILE / 2,
    -TILE / 2,
    TILE,
    TILE
  );

  ctx.restore();
}

/* ================= UPDATE ================= */

function update() {
  if (gameState !== "playing") return;

  const box = getIntersectionBox();

  const inside =
    cart.x > box.x &&
    cart.x < box.x + box.size &&
    cart.y > box.y &&
    cart.y < box.y + box.size;

  if (inside) {
    if (intersection.turnUp) {
      cart.vx = 0;
      cart.vy = -cart.speed;
    } else {
      cart.vx = cart.speed;
      cart.vy = 0;
    }
  }

  cart.x += cart.vx;
  cart.y += cart.vy;

  let targetRotation = cart.vx !== 0 ? 0 : -Math.PI / 2;
  cart.rotation += (targetRotation - cart.rotation) * 0.15;

  if (cart.x > WORLD_WIDTH - TILE) {
    endGame("lose");
  }

  if (cart.y < 120) {
    endGame("win");
  }
}

/* ================= GAME STATE ================= */

function endGame(result) {
  gameState = result;

  const ui = document.getElementById("ui");
  const resultText = document.getElementById("result");

  ui.style.display = "block";
  resultText.innerText =
    result === "win" ? "🏆 YOU WIN" : "💀 YOU LOSE";
}

function restartGame() {
  cart.x = 200;
  cart.y = WORLD_HEIGHT / 2;
  cart.vx = cart.speed;
  cart.vy = 0;
  cart.rotation = 0;

  intersection.turnUp = false;
  gameState = "playing";

  document.getElementById("ui").style.display = "none";
}

/* ================= INPUT ================= */

canvas.addEventListener("click", () => {
  if (gameState === "playing") {
    intersection.turnUp = !intersection.turnUp;
  }
});

/* ================= LOOP ================= */

function gameLoop() {
  const scale = getScale();

  ctx.setTransform(
    scale, 0, 0, scale,
    (canvas.width - WORLD_WIDTH * scale) / 2,
    (canvas.height - WORLD_HEIGHT * scale) / 2
  );

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawMap();
  drawIntersectionArrow();
  drawCart();
  update();

  requestAnimationFrame(gameLoop);
}

/* ================= START ================= */

mapImg.onload = () => {
  gameLoop();
};
