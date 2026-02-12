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

const TILE = 128;
const ROAD_WIDTH = 140;
const INTERSECTION_SIZE = 140;

/* ================= LOAD IMAGES ================= */

const grassImg = new Image();
grassImg.src = "./grass.png";

const dirtImg = new Image();
dirtImg.src = "./dirt.png";

const cartImg = new Image();
cartImg.src = "./cart.png";

const barnImg = new Image();
barnImg.src = "./barn.png";

const fenceImg = new Image();
fenceImg.src = "./fence.png";

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
  if (!grassImg.complete) return;
  for (let x = 0; x < WORLD_WIDTH; x += TILE) {
    for (let y = 0; y < WORLD_HEIGHT; y += TILE) {
      ctx.drawImage(grassImg, x, y, TILE, TILE);
    }
  }
}

function drawRoad(layout) {
  if (!dirtImg.complete) return;

  for (let x = 0; x < WORLD_WIDTH; x += TILE) {
    ctx.drawImage(dirtImg, x, layout.horizontalY, TILE, TILE);
  }

  for (let y = 0; y < layout.horizontalY + ROAD_WIDTH; y += TILE) {
    ctx.drawImage(dirtImg, layout.verticalX, y, TILE, TILE);
  }
}

function drawBarn(layout) {
  if (!barnImg.complete) return;

  ctx.drawImage(
    barnImg,
    layout.verticalX,
    60,
    TILE * 2,
    TILE * 2
  );
}

function drawFence(layout) {
  if (!fenceImg.complete) return;

  ctx.drawImage(
    fenceImg,
    WORLD_WIDTH - TILE * 2,
    layout.horizontalY,
    TILE * 2,
    TILE
  );
}

function drawCart() {
  if (!cartImg.complete) return;

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

  if (cart.x > WORLD_WIDTH - TILE * 2) endGame("lose");
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
  const layout = getLayout();
  const scale = getScale();

  ctx.setTransform(
    scale, 0, 0, scale,
    (canvas.width - WORLD_WIDTH * scale) / 2,
    (canvas.height - WORLD_HEIGHT * scale) / 2
  );

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawGrass();
  drawRoad(layout);
  drawBarn(layout);
  drawFence(layout);
  drawCart();
  updateCart(layout);

  requestAnimationFrame(gameLoop);
}

gameLoop();