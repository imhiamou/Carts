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

const TILE = 256; // road tile size
const ROAD_WIDTH = TILE;
const INTERSECTION_SIZE = TILE;

/* ================= LOAD IMAGES ================= */

const mapImg = new Image();
mapImg.src = "./map01.png";

const cartImg = new Image();
cartImg.src = "./cart.png";

/* ================= GAME STATE ================= */

let intersection = { turnUp: false };

let cart = {
  x: 200,
  y: WORLD_HEIGHT / 2,
  speed: 4,
  vx: 4,
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

function drawBackground() {
  if (!mapImg.complete) return;

  ctx.drawImage(
    mapImg,
    0,
    0,
    WORLD_WIDTH,
    WORLD_HEIGHT
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

  if (cart.x > WORLD_WIDTH - TILE) endGame("lose");
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

  drawBackground();
  drawCart();
  updateCart(layout);

  requestAnimationFrame(gameLoop);
}

gameLoop();
