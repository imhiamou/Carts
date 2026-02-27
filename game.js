/* ================= CANVAS ================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const resultText = document.getElementById("result");

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= PHONE WORLD ================= */

const isPhone = window.matchMedia("(max-width: 768px)").matches;

const PHONE_WORLD_WIDTH = 900;
const PHONE_WORLD_HEIGHT = 1800;

const X_SCALE_PHONE = PHONE_WORLD_WIDTH / WORLD_WIDTH;   // 0.75
const Y_SCALE_PHONE = PHONE_WORLD_HEIGHT / WORLD_HEIGHT; // 2.0

function phoneTransform(value, axis) {
  if (!isPhone) return value;
  return axis === "x"
    ? value * X_SCALE_PHONE
    : value * Y_SCALE_PHONE;
}

/* ================= SIZE ================= */

const CART_SIZE = 170;
const ARROW_SIZE = 80;
const TAP_RADIUS = 80;

/* ================= GAME ================= */

const BASE_SPEED = 2.0;
const SPEED_INCREMENT = 0.15;
const SPAWN_DELAY = 200;

/* ================= LOADERS ================= */

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function loadSound(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.6;
  return audio;
}

/* ================= IMAGES ================= */

const arrowUpImg = loadImage("arrow_up.png");
const arrowLeftImg = loadImage("arrow_left.png");
const arrowRightImg = loadImage("arrow_right.png");

const CART_IMAGES = {
  sawmill: loadImage("sawmill_cart.png"),
  mine: loadImage("mine_cart.png"),
  barn: loadImage("barn_cart.png"),
  tavern: loadImage("tavern_cart.png"),
  windmill: loadImage("windmill_cart.png")
};

/* ================= SOUNDS ================= */

const sounds = {
  spawn: loadSound("cart.mp3"),
  wrong: loadSound("Wrong.mp3"),
  sawmill: loadSound("sawmill.mp3"),
  mine: loadSound("mine.mp3"),
  barn: loadSound("barn.mp3"),
  tavern: loadSound("tavern.mp3"),
  windmill: loadSound("windmill.mp3")
};

canvas.addEventListener("click", () => {
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
}, { once: true });

/* ================= MAPS ================= */

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

/* ================= STATE ================= */

let currentLevel = 1;
let mapImg = new Image();
let intersections = {};
let activeCarts = [];
let score = 0;
let lives = 3;
let spawnTimer = 0;
let gameState = "playing";

/* ================= RESPONSIVE ================= */

let scaleX = 1;
let scaleY = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const worldW = isPhone ? PHONE_WORLD_WIDTH : WORLD_WIDTH;
  const worldH = isPhone ? PHONE_WORLD_HEIGHT : WORLD_HEIGHT;

  const widthRatio = canvas.width / worldW;
  const heightRatio = canvas.height / worldH;

  const scale = Math.min(widthRatio, heightRatio);

  scaleX = scale;
  scaleY = scale;

  offsetX = (canvas.width - worldW * scale) / 2;
  offsetY = (canvas.height - worldH * scale) / 2;
}

window.addEventListener("resize", resize);
resize();

/* ================= LEVEL ================= */

function loadLevel(level) {
  currentLevel = level;
  mapImg.src = level === 1 ? MAP02.map : MAP03.map;
  mapImg.onload = resetGame;
}

function resetGame() {
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];
  gameState = "playing";
  intersections = {};

  if (currentLevel === 1) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "up";
  } else {
    intersections.intersection1 = "up";
    intersections.intersection2 = "left";
    intersections.intersection3 = "up";
    intersections.intersection4 = "left";
  }

  ui.style.display = "none";
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
    x: phoneTransform(map.spawn.x, "x"),
    y: phoneTransform(map.spawn.y, "y"),
    vx: 0,
    vy: -speed,
    speed: speed,
    destination: randomDest,
    img: CART_IMAGES[randomDest],
    forcedDown: false
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

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let cart of activeCarts) {

    cart.x += cart.vx;
    cart.y += cart.vy;

    if (currentLevel === 2 &&
        !cart.forcedDown &&
        cart.x >= phoneTransform(1016, "x")) {

      cart.x = phoneTransform(1016, "x");
      cart.vx = 0;
      cart.vy = cart.speed;
      cart.forcedDown = true;
    }

    for (let key in map.intersections) {

      const node = {
        x: phoneTransform(map.intersections[key].x, "x"),
        y: phoneTransform(map.intersections[key].y, "y")
      };

      const dist = Math.hypot(cart.x - node.x, cart.y - node.y);

      if (dist < 12 && !cart[key]) {

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

  if (currentLevel === 1 && score >= 100) {
    loadLevel(2);
  }
}

/* ================= BUILDINGS ================= */

function checkBuildings(cart) {

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let key in map.buildings) {

    const node = {
      x: phoneTransform(map.buildings[key].x, "x"),
      y: phoneTransform(map.buildings[key].y, "y")
    };

    if (Math.hypot(cart.x - node.x, cart.y - node.y) < 20) {

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

/* ================= DRAW ================= */

function draw() {

  const worldW = isPhone ? PHONE_WORLD_WIDTH : WORLD_WIDTH;
  const worldH = isPhone ? PHONE_WORLD_HEIGHT : WORLD_HEIGHT;

  ctx.setTransform(scaleX, 0, 0, scaleY, offsetX, offsetY);
  ctx.clearRect(0, 0, worldW, worldH);
  ctx.drawImage(mapImg, 0, 0, worldW, worldH);

  drawArrows();
  drawCarts();
  drawHUD();
}

function drawArrows() {

  const map = currentLevel === 1 ? MAP02 : MAP03;

  for (let key in map.intersections) {

    const node = {
      x: phoneTransform(map.intersections[key].x, "x"),
      y: phoneTransform(map.intersections[key].y, "y")
    };

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

/* ================= LOOP ================= */

function loseGame() {
  gameState = "lose";
  resultText.innerText = "GAME OVER";
  ui.style.display = "block";
}

function restartGame() {
  ui.style.display = "none";
  resetGame();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadLevel(1);
requestAnimationFrame(loop);
