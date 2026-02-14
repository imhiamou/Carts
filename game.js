const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= CANVAS ================= */

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

function getScale() {
  return Math.min(
    canvas.width / WORLD_WIDTH,
    canvas.height / WORLD_HEIGHT
  );
}

/* ================= LOAD IMAGES ================= */

function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const mapImg = load("map02.png");
const arrowImg = load("arrow.png");

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
  mine: { x: 351, y: 309 },
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

let gameState = "playing";
let delivered = 0;
let spawnIndex = 0;
let spawnTimer = 0;
const SPAWN_DELAY = 120;

/* ================= INTERSECTIONS ================= */

let intersections = {
  intersection1: "up",
  intersection2: "up"
};

/* ================= CARTS ================= */

let activeCarts = [];

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
        removeCart(cart);
        if (delivered === DESTINATIONS.length) {
          gameState = "win";
          console.log("YOU WIN");
        }
      } else {
        gameState = "lose";
        console.log("YOU LOSE");
      }
    }
  }
}

function removeCart(cart) {
  activeCarts = activeCarts.filter(c => c !== cart);
}

/* ================= DRAW ================= */

function draw() {

  const scale = getScale();

  ctx.setTransform(
    scale, 0, 0, scale,
    (canvas.width - WORLD_WIDTH * scale) / 2,
    (canvas.height - WORLD_HEIGHT * scale) / 2
  );

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawIntersectionArrows();

  for (let cart of activeCarts) {
    ctx.drawImage(cart.img, cart.x - 60, cart.y - 60, 120, 120);
  }
}

function drawIntersectionArrows() {

  for (let name of ["intersection1", "intersection2"]) {

    const node = NODES[name];
    const state = intersections[name];

    let rotation = 0;

    if (state === "up") rotation = -Math.PI / 2;
    if (state === "left") rotation = Math.PI;
    if (state === "right") rotation = 0;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(rotation);

    ctx.drawImage(arrowImg, -40, -40, 80, 80);

    ctx.restore();
  }
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

  for (let name of ["intersection1", "intersection2"]) {

    const node = NODES[name];
    const dist = Math.hypot(mouseX - node.x, mouseY - node.y);

    if (dist < 40) {

      const current = intersections[name];

      intersections[name] =
        current === "up" ? "left" :
        current === "left" ? "right" :
        "up";
    }
  }
});

/* ================= LOOP ================= */

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

mapImg.onload = loop;
