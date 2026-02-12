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

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 700;

const ROAD_WIDTH = 140;
const INTERSECTION_SIZE = 140;

/* ================= SPRITE ================= */

const sprite = new Image();
sprite.src = "sprites.png"; // must match filename exactly

let spriteLoaded = false;

sprite.onload = () => {
  spriteLoaded = true;
};

sprite.onerror = () => {
  console.error("Sprite failed to load");
};

/* ================= GAME STATE ================= */

let intersection = { turnUp: false };

let cart = {
  x: 150,
  y: WORLD_HEIGHT / 2,
  speed: 3,
  vx: 3,
  vy: 0,
  rotation: 0
};

let gameState = "playing";

/* ================= HELPERS ================= */

function getScale() {
  return Math.min(
    canvas.width / WORLD_WIDTH,
    canvas.height / WORLD_HEIGHT
  );
}

function getLayout() {
  return {
    horizontalY: WORLD_HEIGHT / 2 - ROAD_WIDTH / 2,
    verticalX: WORLD_WIDTH / 2 - ROAD_WIDTH / 2
  };
}

/* ================= DRAWING ================= */

function drawGrass() {
  // draw grass tile from sprite (top-left 128x128)
  for (let x = 0; x < WORLD_WIDTH; x += 128) {
    for (let y = 0; y < WORLD_HEIGHT; y += 128) {
      ctx.drawImage(sprite, 0, 0, 128, 128, x, y, 128, 128);
    }
  }
}

/* ---------- REAL DIRT ROAD (NO STONE) ---------- */

function drawDirtRoad(layout) {
  ctx.fillStyle = "#8b5a2b"; // base dirt color

  // horizontal
  ctx.fillRect(
    0,
    layout.horizontalY,
    WORLD_WIDTH,
    ROAD_WIDTH
  );

  // vertical
  ctx.fillRect(
    layout.verticalX,
    0,
    ROAD_WIDTH,
    layout.horizontalY + ROAD_WIDTH
  );

  // simple texture noise
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(
      Math.random() * WORLD_WIDTH,
      layout.horizontalY + Math.random() * ROAD_WIDTH,
      4,
      4
    );
  }
}

/* ---------- BARN ---------- */

function drawBarn(layout) {
  ctx.drawImage(
    sprite,
    384, 0, 128, 128,   // barn in sprite
    layout.verticalX,
    60,
    256,
    256
  );
}

/* ---------- CART ---------- */

function drawCart() {
  ctx.save();
  ctx.translate(cart.x, cart.y);
  ctx.rotate(cart.rotation);

  ctx.drawImage(
    sprite,
    256, 0, 128, 128,   // cart in sprite
    -64,
    -64,
    128,
    128
  );

  ctx.restore();
}

/* ================= MOVEMENT ================= */

function updateCart(layout) {
  if (gameState !== "playing") return;

  const ix = layout.verticalX;
  const iy = layout.horizontalY;

  const inside =
    cart.x > ix &&
    cart.x < ix + INTERSECTION_SIZE &&
    cart.y > iy &&
    cart.y < iy + INTERSECTION_SIZE;

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

  if (cart.x > WORLD_WIDTH - 100) endGame("lose");
  if (cart.y < 120) endGame("win");
}

/* ================= GAME STATE ================= */

function endGame(result) {
  gameState = result;
  document.getElementById("ui").style.display = "block";
  document.getElementById("result").innerText =
    result === "win" ? "🏆 YOU WIN" : "💀 YOU LOSE";
}

function restartGame() {
  cart.x = 150;
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
  intersection.turnUp = !intersection.turnUp;
});

/* ================= LOOP ================= */

function gameLoop() {
  if (!spriteLoaded) {
    requestAnimationFrame(gameLoop);
    return;
  }

  const layout = getLayout();
  const scale = getScale();

  ctx.setTransform(
    scale, 0, 0, scale,
    (canvas.width - WORLD_WIDTH * scale) / 2,
    (canvas.height - WORLD_HEIGHT * scale) / 2
  );

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawGrass();
  drawDirtRoad(layout);
  drawBarn(layout);
  drawCart();
  updateCart(layout);

  requestAnimationFrame(gameLoop);
}

gameLoop();