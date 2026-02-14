const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const resultText = document.getElementById("result");

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= SIZE ================= */

const CART_SIZE = 110;
const ARROW_SIZE = 80;
const TAP_RADIUS = 60;

/* ================= VIEW STATE ================= */

let scale = 1;
let offsetX = 0;
let offsetY = 0;

/* ================= CANVAS ================= */

function resize() {

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  scale = Math.min(
    canvas.width / WORLD_WIDTH,
    canvas.height / WORLD_HEIGHT
  );

  offsetX = (canvas.width - WORLD_WIDTH * scale) / 2;
  offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2;
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

/* ================= NODES ================= */

const NODES = {
  start: { x: 599, y: 846 },
  intersection1: { x: 604, y: 567 },
  intersection2: { x: 600, y: 330 },
  sawmill: { x: 598, y: 218 },
  mine: { x: 351, y: 320 },
  barn: { x: 783, y: 320 },
  tavern: { x: 384, y: 571 },
  windmill: { x: 833, y: 564 }
};

const DESTINATIONS = [
  "sawmill",
  "mine",
  "barn",
  "tavern",
  "windmill"
];

/* ================= GAME STATE ================= */

let gameState;
let delivered;
let spawnIndex;
let spawnTimer;
let activeCarts;
let intersections;

const SPAWN_DELAY = 120;

/* ================= RESET ================= */

function resetGame() {

  gameState = "playing";
  delivered = 0;
  spawnIndex = 0;
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

  if (spawnIndex >= DESTINATIONS.length) return;

  const dest = DESTINATIONS[spawnIndex];

  activeCarts.push({
    x: NODES.start.x,
    y: NODES.start.y,
    vx: 0,
    vy: -2.5,
    speed: 2.5,
    destination: dest,
    img: CART_IMAGES[dest],
    turned1: false,
    turned2: false
  });

  spawnIndex++;
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

    handleIntersection(cart, "intersection1");
    handleIntersection(cart, "intersection2");

    checkBuildings(cart);
  }
}

function handleIntersection(cart, name) {

  const node = NODES[name];
  const dist = Math.hypot(cart.x - node.x, cart.y - node.y);

  if (dist < 6) {

    if (name === "intersection1" && cart.turned1) return;
    if (name === "intersection2" && cart.turned2) return;

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

    if (name === "intersection1") cart.turned1 = true;
    if (name === "intersection2") cart.turned2 = true;
  }
}

function checkBuildings(cart) {

  for (let key of DESTINATIONS) {

    const node = NODES[key];
    const dist = Math.hypot(cart.x - node.x, cart.y - node.y);

    if (dist < 20) {

      if (key === cart.destination) {

        delivered++;
        activeCarts = activeCarts.filter(c => c !== cart);

        if (delivered === DESTINATIONS.length) winGame();

      } else {
        loseGame();
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

    ctx.save();
    ctx.translate(cart.x, cart.y);
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
}

function drawIntersectionArrows() {

  for (let name of ["intersection1", "intersection2"]) {

    const node = NODES[name];
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

/* ================= INPUT ================= */

function handleInput(clientX, clientY) {

  if (gameState !== "playing") return;

  const worldX = (clientX - offsetX) / scale;
  const worldY = (clientY - offsetY) / scale;

  for (let name of ["intersection1", "intersection2"]) {

    const node = NODES[name];
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
  const t = e.touches[0];
  handleInput(t.clientX, t.clientY);
});

/* ================= WIN / LOSE ================= */

function winGame() {
  gameState = "win";
  resultText.innerText = "YOU WIN";
  ui.style.display = "block";
}

function loseGame() {
  gameState = "lose";
  resultText.innerText = "YOU LOSE";
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
