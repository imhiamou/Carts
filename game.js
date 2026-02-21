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

/* ================= GAME TUNING ================= */

const BASE_SPEED = 2.0;
const SPEED_INCREMENT = 0.15;
const SPAWN_DELAY = 200;

/* ================= VIEW ================= */

let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;

/* ================= LEVEL DATA ================= */

const LEVEL = {

  spawn: { x: 322, y: 879 },

  intersections: {
    intersection1: { x: 322, y: 560 },
    intersection2: { x: 324, y: 345 },
    intersection3: { x: 741, y: 344 },
    intersectionTurn: { x: 1016, y: 339 },
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

let intersections;

const INTERSECTION_RULES = {
  intersection1: ["up", "right"],
  intersection2: ["left", "right"],
  intersection3: ["up", "right"],
  intersectionTurn: ["right", "down"],
  intersection4: ["left", "down"]
};

let gameState;
let score;
let lives;
let spawnTimer;
let activeCarts;

/* ================= AUDIO ================= */

const sounds = {
  spawn: new Audio("cart.mp3"),
  wrong: new Audio("Wrong.mp3"),
  sawmill: new Audio("sawmill.mp3"),
  mine: new Audio("mine.mp3"),
  barn: new Audio("barn.mp3"),
  tavern: new Audio("tavern.mp3"),
  windmill: new Audio("windmill.mp3")
};

Object.values(sounds).forEach(s => s.volume = 0.6);

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
  audioUnlocked = true;
}

/* ================= RESPONSIVE ================= */

function resize() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const widthRatio = canvas.width / WORLD_WIDTH;
  const heightRatio = canvas.height / WORLD_HEIGHT;

  const isPhone = window.innerWidth <= 768;
  const Y_SHIFT = 0;
  if (isPhone) {

    // Keep normal horizontal scaling
    scaleX = Math.min(widthRatio, heightRatio);
     const Y_SHIFT = -150;
    // Stretch ONLY height
    const HEIGHT_STRETCH = 1.8;
    scaleY = scaleX * HEIGHT_STRETCH;

  } else {

    scaleX = Math.min(widthRatio, heightRatio);
    scaleY = scaleX;
  }

  offsetX = (canvas.width - WORLD_WIDTH * scaleX) / 2;
  offsetY = ((canvas.height - WORLD_HEIGHT * scaleY) / 2)+Y_SHIFT;
}

window.addEventListener("resize", resize);
resize();

/* ================= LOAD ================= */

function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const mapImg = load("map03.png");
const arrowUpImg = load("arrow_up.png");
const arrowLeftImg = load("arrow_left.png");
const arrowRightImg = load("arrow_right.png");

const CART_IMAGES = {
  sawmill: load("sawmill_cart.png"),
  mine: load("mine_cart.png"),
  barn: load("barn_cart.png"),
  tavern: load("tavern_cart.png"),
  windmill: load("windmill_cart.png")
};

const DESTINATIONS = Object.keys(CART_IMAGES);

/* ================= RESET ================= */

function resetGame() {

  gameState = "playing";
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];

  intersections = {
    intersection1: "up",
    intersection2: "left",
    intersection3: "up",
    intersectionTurn: "right",
    intersection4: "left"
  };

  ui.style.display = "none";
}

/* ================= SPAWN ================= */

function spawnCart() {

  const randomDest =
    DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];

  const speedBoost = Math.floor(score / 1000) * SPEED_INCREMENT;
  const speed = BASE_SPEED + speedBoost;

  activeCarts.push({
    x: LEVEL.spawn.x,
    y: LEVEL.spawn.y,
    vx: 0,
    vy: -speed,
    speed: speed,
    destination: randomDest,
    img: CART_IMAGES[randomDest],
    animTime: 0
  });

  sounds.spawn.currentTime = 0;
  sounds.spawn.play();
}

/* ================= UPDATE ================= */

function update() {

  if (gameState !== "playing") return;

  spawnTimer++;
  if (spawnTimer >= SPAWN_DELAY) {
    spawnTimer = 0;
    spawnCart();
  }

  for (let cart of activeCarts) {

    cart.x += cart.vx;
    cart.y += cart.vy;
    cart.animTime += 0.15;

    for (let key in LEVEL.intersections) {
      const node = LEVEL.intersections[key];
      handleIntersection(cart, key, node.x, node.y);
    }

    checkBuildings(cart);
  }
}

function handleIntersection(cart, name, x, y) {

  const dist = Math.hypot(cart.x - x, cart.y - y);
  if (dist >= 8) return;
  if (cart[name]) return;

  const dir = intersections[name];

  if (dir === "up") { cart.vx = 0; cart.vy = -cart.speed; }
  if (dir === "left") { cart.vx = -cart.speed; cart.vy = 0; }
  if (dir === "right") { cart.vx = cart.speed; cart.vy = 0; }
  if (dir === "down") { cart.vx = 0; cart.vy = cart.speed; }

  cart[name] = true;
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

function drawCarts() {

  for (let cart of activeCarts) {

    let rotation = 0;

    if (cart.vy > 0) rotation = 0;
    else if (cart.vy < 0) rotation = Math.PI;
    else if (cart.vx < 0) rotation = Math.PI / 2;
    else if (cart.vx > 0) rotation = -Math.PI / 2;

    const bob = Math.sin(cart.animTime) * 4;

    ctx.save();
    ctx.translate(cart.x, cart.y + bob);
    ctx.rotate(rotation);
    ctx.drawImage(cart.img, -CART_SIZE/2, -CART_SIZE/2, CART_SIZE, CART_SIZE);
    ctx.restore();
  }
}

function drawIntersectionArrows() {

  for (let name in LEVEL.intersections) {

    const node = LEVEL.intersections[name];
    const state = intersections[name];

    let img = arrowUpImg;
    let rotation = 0;

    if (state === "left") img = arrowLeftImg;
    else if (state === "right") img = arrowRightImg;
    else if (state === "down") {
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

/* ================= CLICK ================= */

canvas.addEventListener("click", e => {

  unlockAudio();
  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const worldX = (e.clientX - rect.left - offsetX) / scaleX;
  const worldY = (e.clientY - rect.top - offsetY) / scaleY;

  for (let name in LEVEL.intersections) {

    const node = LEVEL.intersections[name];

    if (Math.hypot(worldX - node.x, worldY - node.y) < TAP_RADIUS) {

      const allowed = INTERSECTION_RULES[name];
      const current = intersections[name];
      const index = allowed.indexOf(current);

      intersections[name] = allowed[(index + 1) % allowed.length];
    }
  }
});

/* ================= HUD ================= */

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Score: " + score, 40, 50);
  ctx.fillText("Lives: " + lives, 40, 85);
}

/* ================= BUILDINGS ================= */

function checkBuildings(cart) {

  for (let key in LEVEL.buildings) {

    const node = LEVEL.buildings[key];

    if (Math.hypot(cart.x - node.x, cart.y - node.y) < 25) {

      activeCarts = activeCarts.filter(c => c !== cart);

      if (key === cart.destination) {
        score += 100;
        sounds[key].currentTime = 0;
        sounds[key].play();
      } else {
        lives--;
        sounds.wrong.currentTime = 0;
        sounds.wrong.play();
        if (lives <= 0) loseGame();
      }
    }
  }
}

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

mapImg.onload = () => {
  resetGame();
  loop();
};

function restartGame() {
  resetGame();
}
