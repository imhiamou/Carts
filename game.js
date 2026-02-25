const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const resultText = document.getElementById("result");

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= SIZE ================= */

const CART_SIZE = 170;
const ARROW_SIZE = 80;
const TAP_RADIUS = 80;

/* ================= GAME ================= */

const BASE_SPEED = 2.0;
const SPEED_INCREMENT = 0.15;
const SPAWN_DELAY = 200;

let currentLevel = 1;
let gameState;
let score;
let lives;
let spawnTimer;
let activeCarts;
let intersections;

/* ================= LOAD IMAGES ================= */

function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const arrowUpImg = load("arrow_up.png");
const arrowLeftImg = load("arrow_left.png");
const arrowRightImg = load("arrow_right.png");

/* ================= MAP02 ================= */

const MAP02 = {
  map: "map02.png",
  spawn: { x: 599, y: 846 },

  intersections: {
    intersection1: { x: 604, y: 567 },
    intersection2: { x: 600, y: 330 }
  },

  buildings: {
    sawmill: { x: 598, y: 218 },
    mine: { x: 351, y: 320 },
    barn: { x: 783, y: 320 },
    tavern: { x: 384, y: 571 },
    windmill: { x: 833, y: 564 }
  }
};

/* ================= MAP03 ================= */

const MAP03 = {
  map: "map03.png",
  spawn: { x: 322, y: 879 },

  intersections: {
    intersection1: { x: 322, y: 560 },
    intersection2: { x: 324, y: 345 },
    intersection3: { x: 741, y: 344 },
    intersection4: { x: 1020, y: 622 }
  },

  buildings: {
    sawmill: { x: 531, y: 560 },
    barn: { x: 174, y: 338 },
    mine: { x: 749, y: 224 },
    tavern: { x: 867, y: 627 },
    windmill: { x: 1029, y: 758 }
  }
};

let mapImg = new Image();

/* ================= RESPONSIVE ================= */

let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const widthRatio = canvas.width / WORLD_WIDTH;
  const heightRatio = canvas.height / WORLD_HEIGHT;

  scaleX = Math.min(widthRatio, heightRatio);
  scaleY = scaleX;

  offsetX = (canvas.width - WORLD_WIDTH * scaleX) / 2;
  offsetY = (canvas.height - WORLD_HEIGHT * scaleY) / 2;
}

window.addEventListener("resize", resize);
resize();

/* ================= RESET ================= */

function resetGame() {

  gameState = "playing";
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];

  intersections = {};

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let key in map.intersections) {
    intersections[key] = "up";
  }

  ui.style.display = "none";
}

/* ================= LEVEL LOAD ================= */

function loadLevel(level) {

  currentLevel = level;

  mapImg.src = level === 1 ? MAP02.map : MAP03.map;

  mapImg.onload = () => resetGame();
}

/* ================= SPAWN ================= */

function spawnCart() {

  const map = currentLevel === 1 ? MAP02 : MAP03;
  const destinations = Object.keys(map.buildings);
  const randomDest =
    destinations[Math.floor(Math.random() * destinations.length)];

  const speedBoost = Math.floor(score / 1000) * SPEED_INCREMENT;
  const speed = BASE_SPEED + speedBoost;

  activeCarts.push({
    x: map.spawn.x,
    y: map.spawn.y,
    vx: 0,
    vy: -speed,
    speed: speed,
    destination: randomDest,
    img: load(randomDest + "_cart.png"),
    animTime: 0
  });
}

/* ================= UPDATE ================= */

function update() {

  if (gameState !== "playing") return;

  spawnTimer++;
  if (spawnTimer >= SPAWN_DELAY) {
    spawnTimer = 0;
    spawnCart();
  }

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let cart of activeCarts) {

    cart.x += cart.vx;
    cart.y += cart.vy;

    for (let key in map.intersections) {

      const node = map.intersections[key];
      const dist = Math.hypot(cart.x - node.x, cart.y - node.y);

      if (dist < 8 && !cart[key]) {

        const dir = intersections[key];

        if (dir === "up") { cart.vx = 0; cart.vy = -cart.speed; }
        if (dir === "left") { cart.vx = -cart.speed; cart.vy = 0; }
        if (dir === "right") { cart.vx = cart.speed; cart.vy = 0; }
        if (dir === "down") { cart.vx = 0; cart.vy = cart.speed; }

        cart[key] = true;
      }
    }

    checkBuildings(cart);
  }

  if (currentLevel === 1 && score >= 5000) {
    loadLevel(2);
  }
}

/* ================= BUILDINGS ================= */

function checkBuildings(cart) {

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let key in map.buildings) {

    const node = map.buildings[key];

    if (Math.hypot(cart.x - node.x, cart.y - node.y) < 20) {

      activeCarts = activeCarts.filter(c => c !== cart);

      if (key === cart.destination) {
        score += 100;
      } else {
        lives--;
        if (lives <= 0) loseGame();
      }
    }
  }
}

/* ================= DRAW ================= */

function draw() {

  ctx.setTransform(scaleX, 0, 0, scaleY, offsetX, offsetY);

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawIntersectionArrows();
  drawCarts();
  drawHUD();
}

function drawIntersectionArrows() {

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let key in map.intersections) {

    const node = map.intersections[key];
    const state = intersections[key];

    let img = arrowUpImg;
    let rotation = 0;

    if (state === "left") img = arrowLeftImg;
    if (state === "right") img = arrowRightImg;
    if (state === "down") {
      img = arrowUpImg;
      rotation = Math.PI;
    }

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(rotation);
    ctx.drawImage(img, -ARROW_SIZE/2, -ARROW_SIZE/2, ARROW_SIZE, ARROW_SIZE);
    ctx.restore();
  }
}

function drawCarts() {

  for (let cart of activeCarts) {

    let rotation = 0;

    if (cart.vy > 0) rotation = 0;
    else if (cart.vy < 0) rotation = Math.PI;
    else if (cart.vx < 0) rotation = Math.PI / 2;
    else if (cart.vx > 0) rotation = -Math.PI / 2;

    ctx.save();
    ctx.translate(cart.x, cart.y);
    ctx.rotate(rotation);
    ctx.drawImage(cart.img, -CART_SIZE/2, -CART_SIZE/2, CART_SIZE, CART_SIZE);
    ctx.restore();
  }
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Level: " + currentLevel, 20, 40);
  ctx.fillText("Score: " + score, 20, 75);
  ctx.fillText("Lives: " + lives, 20, 110);
}

/* ================= INPUT ================= */

canvas.addEventListener("click", e => {

  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const worldX = (e.clientX - rect.left - offsetX) / scaleX;
  const worldY = (e.clientY - rect.top - offsetY) / scaleY;

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let key in map.intersections) {

    const node = map.intersections[key];
    const dist = Math.hypot(worldX - node.x, worldY - node.y);

    if (dist < TAP_RADIUS) {

      const current = intersections[key];

      intersections[key] =
        current === "up" ? "left" :
        current === "left" ? "right" :
        "up";
    }
  }
});

/* ================= LOOP ================= */

function loseGame() {
  gameState = "lose";
  resultText.innerText = "GAME OVER";
  ui.style.display = "block";
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadLevel(1);
requestAnimationFrame(loop);

function restartGame() {
  loadLevel(currentLevel);
}
