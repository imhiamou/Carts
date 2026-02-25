const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const resultText = document.getElementById("result");

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= SIZE ================= */

const CART_SIZE = 170;
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

/* ================= LEVEL STATE ================= */

let currentLevel = 1;
let mapImg;

let gameState;
let score;
let lives;
let spawnTimer;
let activeCarts;

/* ================= MAP02 DATA ================= */

const MAP02 = {
  spawn: { x: 599, y: 846 },

  buildings: {
    sawmill: { x: 598, y: 218 },
    mine: { x: 351, y: 320 },
    barn: { x: 783, y: 320 },
    tavern: { x: 384, y: 571 },
    windmill: { x: 833, y: 564 }
  }
};

/* ================= MAP03 DATA ================= */

const MAP03 = {
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

let intersections = {};

/* ================= RESPONSIVE ================= */

function resize() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const widthRatio = canvas.width / WORLD_WIDTH;
  const heightRatio = canvas.height / WORLD_HEIGHT;

  const isPhone = window.innerWidth <= 768;

  if (isPhone) {
    scaleX = Math.max(widthRatio, heightRatio) * 0.75;
    scaleY = scaleX * 1.15;
    offsetX = (canvas.width - WORLD_WIDTH * scaleX) / 2;
    offsetY = (canvas.height - WORLD_HEIGHT * scaleY) / 2 - 120;
  } else {
    scaleX = Math.min(widthRatio, heightRatio);
    scaleY = scaleX;
    offsetX = (canvas.width - WORLD_WIDTH * scaleX) / 2;
    offsetY = (canvas.height - WORLD_HEIGHT * scaleY) / 2;
  }
}

window.addEventListener("resize", resize);
resize();

/* ================= LOAD LEVEL ================= */

function loadLevel(level) {

  currentLevel = level;

  mapImg = new Image();
  mapImg.src = level === 1 ? "map02.png" : "map03.png";

  mapImg.onload = () => resetGame();
}

/* ================= RESET ================= */

function resetGame() {

  gameState = "playing";
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];

  intersections = {
    intersection1: "up",
    intersection2: "up",
    intersection3: "up",
    intersection4: "left"
  };

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
    x: map.spawn.x,
    y: map.spawn.y,
    vx: 0,
    vy: -speed,
    speed: speed,
    destination: randomDest,
    img: new Image(),
    animTime: 0,
    turned1: false,
    turned2: false,
    forcedDown: false
  });

  activeCarts[activeCarts.length - 1].img.src =
    randomDest + "_cart.png";
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

    if (currentLevel === 1) {

      /* ORIGINAL MAP02 HARD TURNS */

      if (!cart.turned1 && cart.y <= 567) {
        cart.turned1 = true;
      }

      if (!cart.turned2 && cart.y <= 330) {
        cart.turned2 = true;
      }

    } else {

      /* MAP03 NODE SYSTEM */

      if (!cart.forcedDown && cart.x >= 1016) {
        cart.x = 1016;
        cart.vx = 0;
        cart.vy = cart.speed;
        cart.forcedDown = true;
      }

      for (let key in MAP03.intersections) {
        const node = MAP03.intersections[key];
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

    if (Math.hypot(cart.x - node.x, cart.y - node.y) < 25) {

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
