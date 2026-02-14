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

const CART_SIZE = 150;
const INTERSECTION_VISUAL_SIZE = 60;

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
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
  turnUp: false
};

let cart = {
  x: 200,
  y: WORLD_HEIGHT / 2,
  speed: 4,
  vx: 4,
  vy: 0,
  rotation: 0,
  animTime: 0
};

/* ================= HELPERS ================= */

function getScale() {
  return Math.min(
    canvas.width / WORLD_WIDTH,
    canvas.height / WORLD_HEIGHT
  );
}

/* ================= DRAW ================= */

function drawMap() {
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

function drawIntersectionArrow() {
  ctx.save();
  ctx.translate(intersection.x, intersection.y);

  const rotation = intersection.turnUp ? -Math.PI / 2 : 0;
  ctx.rotate(rotation);

  ctx.drawImage(
    arrowImg,
    -INTERSECTION_VISUAL_SIZE / 2,
    -INTERSECTION_VISUAL_SIZE / 2,
    INTERSECTION_VISUAL_SIZE,
    INTERSECTION_VISUAL_SIZE
  );

  ctx.restore();
}

function drawCart() {
  ctx.save();

  const bob = Math.sin(cart.animTime) * 3;

  ctx.translate(cart.x, cart.y + bob);
  ctx.rotate(cart.rotation);

  ctx.drawImage(
    cartImg,
    -CART_SIZE / 2,
    -CART_SIZE / 2,
    CART_SIZE,
    CART_SIZE
  );

  ctx.restore();
}

/* ================= UPDATE ================= */

function update() {
  if (gameState !== "playing") return;

  const prevX = cart.x;
  const prevY = cart.y;

  const nextX = cart.x + cart.vx;
  const nextY = cart.y + cart.vy;

  /* ----- INTERSECTION CENTER TURN ----- */
  if (
    cart.vx > 0 &&
    prevX < intersection.x &&
    nextX >= intersection.x &&
    Math.abs(cart.y - intersection.y) < 1
  ) {
    if (intersection.turnUp) {
      cart.x = intersection.x;
      cart.vx = 0;
      cart.vy = -cart.speed;
    }
  }

// ----- LOSE (right side) -----
if (cart.x >= 900) {
  endGame("lose");
  return;
}

// ----- WIN (top side) -----
if (cart.y <= 200) {
  endGame("win");
  return;
}


  /* ----- COMMIT MOVEMENT ----- */
  cart.x = nextX;
  cart.y = nextY;

  /* ----- ANIMATION ----- */
  if (cart.vx !== 0 || cart.vy !== 0) {
    cart.animTime += 0.25;
  }

  /* ----- ROTATION ----- */
  const targetRotation = cart.vx !== 0 ? 0 : -Math.PI / 2;
  cart.rotation += (targetRotation - cart.rotation) * 0.15;
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
  cart.animTime = 0;

  intersection.turnUp = false;
  gameState = "playing";

  document.getElementById("ui").style.display = "none";
}

/* ================= INPUT ================= */

canvas.addEventListener("click", (e) => {
  if (gameState !== "playing") return;

  const scale = getScale();
  const rect = canvas.getBoundingClientRect();

  const offsetX = (canvas.width - WORLD_WIDTH * scale) / 2;
  const offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2;

  const mouseX = (e.clientX - rect.left - offsetX) / scale;
  const mouseY = (e.clientY - rect.top - offsetY) / scale;

  const dx = mouseX - intersection.x;
  const dy = mouseY - intersection.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < INTERSECTION_VISUAL_SIZE / 2) {
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
/* ================= TEST OVERRIDE (FIXED) ================= */

(function () {

  // Keep gameState as playing so click system works
  gameState = "playing";

  // Hide UI
  const ui = document.getElementById("ui");
  if (ui) ui.style.display = "none";

  // Force map02
  mapImg.src = "map02.png";

  // Disable gameplay logic only
  update = function () {};
  drawCart = function () {};
  drawIntersectionArrow = function () {};
  endGame = function () {};
  restartGame = function () {};

  // Ensure map redraws
  mapImg.onload = function () {
    const scale = getScale();

    ctx.setTransform(
      scale, 0, 0, scale,
      (canvas.width - WORLD_WIDTH * scale) / 2,
      (canvas.height - WORLD_HEIGHT * scale) / 2
    );

    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  };

  // Capture clicks at highest priority (before old handler)
  canvas.addEventListener("click", function (e) {

    const scale = getScale();
    const rect = canvas.getBoundingClientRect();

    const offsetX = (canvas.width - WORLD_WIDTH * scale) / 2;
    const offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2;

    const mouseX = (e.clientX - rect.left - offsetX) / scale;
    const mouseY = (e.clientY - rect.top - offsetY) / scale;

    console.clear();
    console.log("X:", Math.round(mouseX), "Y:", Math.round(mouseY));

  }, true); // capture phase

})();
