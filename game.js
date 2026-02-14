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

/* ================= LOAD MAP ================= */

const mapImg = new Image();
mapImg.src = "map02.png";

/* ================= SCALE ================= */

function getScale() {
  return Math.min(
    canvas.width / WORLD_WIDTH,
    canvas.height / WORLD_HEIGHT
  );
}

/* ================= LOOP ================= */

function loop() {

  const scale = getScale();

  ctx.setTransform(
    scale, 0, 0, scale,
    (canvas.width - WORLD_WIDTH * scale) / 2,
    (canvas.height - WORLD_HEIGHT * scale) / 2
  );

  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  if (mapImg.complete) {
    ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  requestAnimationFrame(loop);
}

mapImg.onload = loop;

/* ================= CLICK ================= */

canvas.addEventListener("click", function (e) {

  const scale = getScale();
  const rect = canvas.getBoundingClientRect();

  const offsetX = (canvas.width - WORLD_WIDTH * scale) / 2;
  const offsetY = (canvas.height - WORLD_HEIGHT * scale) / 2;

  const mouseX = (e.clientX - rect.left - offsetX) / scale;
  const mouseY = (e.clientY - rect.top - offsetY) / scale;

  console.log("X:", Math.round(mouseX), "Y:", Math.round(mouseY));

});
