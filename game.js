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

let scale = 1;
let offsetX = 0;
let offsetY = 0;

/* ================= GAME STATE ================= */

let gameState;
let score;
let lives;
let spawnTimer;
let activeCarts;
let intersections;

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

Object.values(sounds).forEach(s => {
  s.volume = 0.6;
});

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

/* ================= CANVAS ================= */

function resize() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const widthRatio = canvas.width / WORLD_WIDTH;
  const heightRatio = canvas.height / WORLD_HEIGHT;

  const isPhone = window.innerWidth <= 768;

  if (isPhone) {

    const PHONE_ZOOM = 0.75;
    const PHONE_Y_SHIFT = -120;

    scale = Math.max(widthRatio, heightRatio) * PHONE_ZOOM;

    offsetX = (canvas.width - WORLD_WIDTH * scale) / 2;
    offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2 + PHONE_Y_SHIFT;

  } else {

    scale = Math.min(widthRatio, heightRatio);

    offsetX = (canvas.width - WORLD_WIDTH * scale) / 2;
    offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2;
  }
}

window.addEventListener("resize", resize);
resize();

canvas.style.touchAction = "none";

/* ================= LOAD ================= */

function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const mapImg = load("map02.png");

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
    intersection2: "up"
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
    x: 599,
    y: 846,
    vx: 0,
    vy: -speed,
    speed: speed,
    destination: randomDest,
    img: CART_IMAGES[randomDest],
    turned1: false,
    turned2: false,
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

    handleIntersection(cart, "intersection1", 604, 567);
    handleIntersection(cart, "intersection2", 600, 330);

    checkBuildings(cart);
  }
}

function handleIntersection(cart, name, x, y) {

  const dist = Math.hypot(cart.x - x, cart.y - y);

  if (dist < 6) {

    if (cart[name]) return;

    const dir = intersections[name];

    if (dir === "up") {
      cart.vx = 0;
      cart.vy = -cart.speed;
    }
    if (dir === "left") {
      cart.vx = -cart.speed;
      cart.vy = 0;
    }
    if (dir === "right") {
      cart.vx = cart.speed;
      cart.vy = 0;
    }

    cart[name] = true;
  }
}

function checkBuildings(cart) {

  const buildings = {
    sawmill: { x: 598, y: 218 },
    mine: { x: 351, y: 320 },
    barn: { x: 783, y: 320 },
    tavern: { x: 384, y: 571 },
    windmill: { x: 833, y: 564 }
  };

  for (let key in buildings) {

    const node = buildings[key];
    const dist = Math.hypot(cart.x - node.x, cart.y - node.y);

    if (dist < 20) {

      activeCarts = activeCarts.filter(c => c !== cart);

      if (key === cart.destination) {

        score += 100;

        if (sounds[key]) {
          sounds[key].currentTime = 0;
          sounds[key].play();
        }

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

  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawIntersectionArrows();

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

    ctx.drawImage(
      cart.img,
      -CART_SIZE / 2,
      -CART_SIZE / 2,
      CART_SIZE,
      CART_SIZE
    );

    ctx.restore();
  }

  drawHUD();
}

function drawIntersectionArrows() {

  const nodes = {
    intersection1: { x: 604, y: 567 },
    intersection2: { x: 600, y: 330 }
  };

  for (let name in nodes) {

    const node = nodes[name];
    const state = intersections[name];

    let img = arrowUpImg;
    if (state === "left") img = arrowLeftImg;
    if (state === "right") img = arrowRightImg;

    ctx.drawImage(
      img,
      node.x - ARROW_SIZE / 2,
      node.y - ARROW_SIZE / 2,
      ARROW_SIZE,
      ARROW_SIZE
    );
  }
}

function drawHUD() {

  const isPhone = window.innerWidth <= 768;

  if (isPhone) {

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";

    ctx.fillText("Score: " + score, 20, 40);
    ctx.fillText("Lives: " + lives, 20, 70);

  } else {

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    ctx.fillStyle = "white";
    ctx.font = "28px Arial";

    ctx.fillText("Score: " + score, 20, 40);
    ctx.fillText("Lives: " + lives, 20, 75);
  }
}

/* ================= INPUT ================= */

function handleInput(clientX, clientY) {

  unlockAudio();

  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();

  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;

  const worldX = (canvasX - offsetX) / scale;
  const worldY = (canvasY - offsetY) / scale;

  const nodes = {
    intersection1: { x: 604, y: 567 },
    intersection2: { x: 600, y: 330 }
  };

  for (let name in nodes) {

    const node = nodes[name];
    const dist = Math.hypot(worldX - node.x, worldY - node.y);

    if (dist < TAP_RADIUS) {

      const current = intersections[name];

      intersections[name] =
        current === "up" ? "left" :
        current === "left" ? "right" :
        "up";
    }
  }
}

canvas.addEventListener("click", e => {
  handleInput(e.clientX, e.clientY);
});

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleInput(touch.clientX, touch.clientY);
});

/* ================= GAME OVER ================= */

function loseGame() {
  gameState = "lose";
  resultText.innerText = "GAME OVER";
  ui.style.display = "block";
}

/* ================= LOOP ================= */

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
