/* ================= CANVAS ================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const resultText = document.getElementById("result");
const levelMenu = document.getElementById("levelMenu");
const topControls = document.getElementById("topControls");
const menuTitle = document.getElementById("menuTitle");
const menuSubtitle = document.getElementById("menuSubtitle");
const levelButtons = document.getElementById("levelButtons");
const continueButton = document.getElementById("continueButton");
const muteButton = document.getElementById("muteButton");
const bugReportModal = document.getElementById("bugReportModal");
const bugReportInput = document.getElementById("bugReportInput");
const bugReportStatus = document.getElementById("bugReportStatus");

/* ================= AUTH / SESSION ================= */

const USERS = {
  mermy: { password: "wolf", isAdmin: false },
  admin: { password: "admin", isAdmin: true }
};

const LEVEL_COUNT = 4;
const STORAGE_PREFIX = "medieval_pixel_cart_progress_v1_";
const SESSION_KEY = "medieval_pixel_cart_active_user_v1";
const BOT_TOKEN = "8799580976:AAHTYpiZZSKRNrhwRh0wqXHsm4rET9Og_vE";
const BOT_CHAT_ID_KEY = "medieval_pixel_cart_bot_chat_id_v1";
const LEVEL_UP_SCORE = 3000;

let currentUser = null;
let isAdminUser = false;
let unlockedLevel = 1;
let hasStartedLevel = false;
let isMuted = false;

function progressStorageKey(username) {
  return STORAGE_PREFIX + username;
}

function loadUserProgress(username) {
  const fallback = { unlockedLevel: 1, lastLevel: 1 };
  try {
    const raw = localStorage.getItem(progressStorageKey(username));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const savedUnlocked = Math.max(1, Math.min(LEVEL_COUNT, Number(parsed.unlockedLevel) || 1));
    const savedLast = Math.max(1, Math.min(savedUnlocked, Number(parsed.lastLevel) || 1));
    return { unlockedLevel: savedUnlocked, lastLevel: savedLast };
  } catch (error) {
    return fallback;
  }
}

function saveUserProgress() {
  if (!currentUser || isAdminUser) return;
  const safeUnlocked = Math.max(1, Math.min(LEVEL_COUNT, unlockedLevel));
  const safeLast = Math.max(1, Math.min(safeUnlocked, currentLevel));
  const payload = JSON.stringify({
    unlockedLevel: safeUnlocked,
    lastLevel: safeLast
  });
  localStorage.setItem(progressStorageKey(currentUser), payload);
}

function setUnlockedLevel(level) {
  if (isAdminUser) return;
  const bounded = Math.max(1, Math.min(LEVEL_COUNT, level));
  if (bounded > unlockedLevel) {
    unlockedLevel = bounded;
    saveUserProgress();
  }
}

function canAccessLevel(level) {
  return isAdminUser || level <= unlockedLevel;
}

function ensureSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.username !== "string" || typeof parsed.password !== "string") {
      return false;
    }
    const account = USERS[parsed.username];
    if (!account || account.password !== parsed.password) {
      return false;
    }
    currentUser = parsed.username;
    isAdminUser = account.isAdmin;
    if (isAdminUser) {
      unlockedLevel = LEVEL_COUNT;
      currentLevel = 1;
    } else {
      const progress = loadUserProgress(currentUser);
      unlockedLevel = progress.unlockedLevel;
      currentLevel = progress.lastLevel;
    }
    return true;
  } catch (error) {
    return false;
  }
}

function clearSessionAndGoLogin() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

/* ================= WORLD ================= */

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

/* ================= SIZE ================= */

const CART_SIZE = 170;
const ARROW_SIZE = 50;
const TAP_RADIUS = 80;
const INTERSECTION_RADIUS = 8;

function isPhone() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function usePhoneMap() {
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  return "ontouchstart" in window && (window.innerWidth <= 1024 || screen.width <= 1024);
}

function getTapRadius() {
  return isPhone() ? 110 : TAP_RADIUS;
}

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
  windmill: loadImage("windmill_cart.png"),
  princess: loadImage("princess_cart.png")
};

/* ================= SOUNDS ================= */

const sounds = {
  spawn: loadSound("cart.mp3"),
  wrong: loadSound("Wrong.mp3"),
  sawmill: loadSound("sawmill.mp3"),
  mine: loadSound("mine.mp3"),
  barn: loadSound("barn.mp3"),
  tavern: loadSound("tavern.mp3"),
  windmill: loadSound("windmill.mp3"),
  castle: loadSound("castle.mp3")
};

function applyMuteState() {
  Object.values(sounds).forEach(s => {
    s.muted = isMuted;
  });
  const label = isMuted ? "Unmute" : "Mute";
  muteButton.textContent = label;
}

/* ===== UNLOCK AUDIO (CRITICAL FOR BROWSERS) ===== */

function unlockAudio() {
  if (isMuted) return;
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
}

canvas.addEventListener("click", unlockAudio, { once: true });
canvas.addEventListener("touchend", unlockAudio, { once: true, passive: true });

/* ================= MAP02 ================= */

const MAP02 = {
  map: "map02.png",
  mapPhone: "map02_phone.png",
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
  mapPhone: "map03_phone.png",
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

/* ================= MAP04 ================= */

const MAP04 = {
  map: "map04.png",
  spawn: { x: 20, y: 533 },

  intersections: {
    intersection1: { x: 411, y: 531 },
    intersection2: { x: 407, y: 275 },
    intersection3: { x: 826, y: 275 },
    intersection4: { x: 412, y: 679 },
    intersection5: { x: 607, y: 679 }
  },

  buildings: {
    mine: { x: 277, y: 275 },
    castle: { x: 918, y: 276 },
    barn: { x: 826, y: 494 },
    tavern: { x: 412, y: 794 },
    windmill: { x: 814, y: 671 },
    sawmill: { x: 607, y: 461 }
  }
};

/* ================= MAP05 ================= */

const MAP05 = {
  map: "map05.png",
  spawn: { x: 607, y: 897 },

  intersections: {
    intersection1: { x: 607, y: 612 },
    intersection2: { x: 909, y: 612 },
    intersection3: { x: 438, y: 605 }
  },

  buildings: {
    castle: { x: 605, y: 219 },
    barn: { x: 909, y: 798 },
    sawmill: { x: 912, y: 382 },
    windmill: { x: 433, y: 398 },
    mine: { x: 336, y: 621 }
  }
};

function getMap() {
  if (currentLevel === 1) return MAP02;
  if (currentLevel === 2) return MAP03;
  if (currentLevel === 3) return MAP04;
  return MAP05;
}

/* ================= LEVEL STATE ================= */

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
let dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (isPhone() && dpr < 2) dpr = 2;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (isPhone() && window.visualViewport) {
    w = window.visualViewport.width;
    h = window.visualViewport.height;
  }

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";

  const widthRatio = w / WORLD_WIDTH;
  const heightRatio = h / WORLD_HEIGHT;

  if (isPhone()) {
    scaleX = widthRatio;
    scaleY = heightRatio;
    offsetX = 0;
    offsetY = 0;
  } else {
    const baseScale = Math.min(widthRatio, heightRatio);
    scaleX = baseScale;
    scaleY = baseScale;
    offsetX = (w - WORLD_WIDTH * scaleX) / 2;
    offsetY = (h - WORLD_HEIGHT * scaleY) / 2;
  }
}

let lastPhone = usePhoneMap();

function onResize() {
  resize();
  const nowPhone = usePhoneMap();
  if (nowPhone !== lastPhone) {
    lastPhone = nowPhone;
    const map = getMap();
    mapImg.src = nowPhone && map.mapPhone ? map.mapPhone : map.map;
  }
}
window.addEventListener("resize", onResize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", onResize);
}
resize();

/* ================= LEVEL MENU ================= */

function renderLevelMenu() {
  menuTitle.textContent = isAdminUser ? "Admin Level Menu" : "Select Level";
  menuSubtitle.textContent = isAdminUser
    ? `Logged in as admin. All ${LEVEL_COUNT} levels are unlocked.`
    : `Logged in as ${currentUser}. Unlocked up to Level ${unlockedLevel}.`;
  levelButtons.innerHTML = "";

  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const unlocked = canAccessLevel(level);
    const button = document.createElement("button");
    const isCurrent = hasStartedLevel && level === currentLevel;
    button.textContent = unlocked
      ? `Level ${level}${isCurrent ? " (Current)" : ""}`
      : `Level ${level} (Locked)`;
    button.disabled = !unlocked;
    button.addEventListener("click", () => selectLevel(level));
    levelButtons.appendChild(button);
  }
}

function selectLevel(level) {
  if (!canAccessLevel(level)) return;
  hasStartedLevel = true;
  ui.style.display = "none";
  levelMenu.style.display = "none";
  topControls.style.display = "flex";
  loadLevel(level);
}

function openLevelMenu() {
  renderLevelMenu();
  continueButton.style.display = hasStartedLevel && gameState !== "lose" ? "inline-block" : "none";
  levelMenu.style.display = "flex";
  topControls.style.display = "none";
  if (gameState === "playing") {
    gameState = "paused";
  }
}

function closeLevelMenu() {
  levelMenu.style.display = "none";
  topControls.style.display = "flex";
  if (hasStartedLevel && gameState !== "lose") {
    gameState = "playing";
  }
}

function logout() {
  clearSessionAndGoLogin();
}

/* ================= BUG REPORT ================= */

function openBugReport() {
  if (gameState === "playing") {
    gameState = "paused";
  }
  bugReportInput.value = "";
  bugReportStatus.textContent = "";
  bugReportModal.style.display = "flex";
}

function closeBugReport() {
  bugReportModal.style.display = "none";
  if (levelMenu.style.display === "none" && hasStartedLevel && gameState !== "lose") {
    gameState = "playing";
    topControls.style.display = "flex";
  }
}

async function detectBotChatId() {
  const existing = localStorage.getItem(BOT_CHAT_ID_KEY);
  if (existing) return existing;

  const updatesResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=10`);
  if (!updatesResp.ok) {
    throw new Error("Unable to read Telegram updates");
  }

  const updatesJson = await updatesResp.json();
  const updates = Array.isArray(updatesJson.result) ? updatesJson.result : [];
  const latest = updates.reverse().find(item => item?.message?.chat?.id);
  if (!latest) return null;

  const chatId = String(latest.message.chat.id);
  localStorage.setItem(BOT_CHAT_ID_KEY, chatId);
  return chatId;
}

async function sendToTelegram(messageText) {
  const chatId = await detectBotChatId();
  if (!chatId) {
    throw new Error("No Telegram chat found yet. Send /start or any message to the bot first.");
  }

  const sendResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: messageText
    })
  });

  if (!sendResp.ok) {
    throw new Error("Telegram sendMessage request failed");
  }
}

async function sendBugReport() {
  const message = bugReportInput.value.trim();
  if (!message) {
    bugReportStatus.textContent = "Please describe the bug before sending.";
    return;
  }

  const payload = {
    user: currentUser,
    isAdmin: isAdminUser,
    level: currentLevel,
    score: score,
    lives: lives,
    report: message,
    createdAt: new Date().toISOString()
  };

  const queueKey = "medieval_pixel_cart_bug_queue_v1";

  try {
    const telegramMessage = [
      "BUG REPORT (game)",
      `time: ${payload.createdAt}`,
      `user: ${payload.user}${payload.isAdmin ? " (admin)" : ""}`,
      `level: ${payload.level}`,
      `score: ${payload.score}`,
      `lives: ${payload.lives}`,
      "",
      payload.report
    ].join("\n");
    await sendToTelegram(telegramMessage);
    bugReportStatus.textContent = "Bug report sent. Thanks!";
    bugReportInput.value = "";
  } catch (error) {
    bugReportStatus.textContent = error.message.includes("No Telegram chat found")
      ? "No bot chat found yet. Send a message to @Mermygame_bot first. Report saved locally."
      : "Failed to send report to Telegram. It was saved locally for retry later.";
    const existing = JSON.parse(localStorage.getItem(queueKey) || "[]");
    existing.push(payload);
    localStorage.setItem(queueKey, JSON.stringify(existing));
  }
}

/* ================= LEVEL LOAD ================= */

function loadLevel(level) {
  currentLevel = level;
  if (currentUser && !isAdminUser) {
    saveUserProgress();
  }
  score = 0;
  spawnTimer = 0;
  activeCarts = [];
  const map = level === 1 ? MAP02 : level === 2 ? MAP03 : level === 3 ? MAP04 : MAP05;
  mapImg.src = usePhoneMap() && map.mapPhone ? map.mapPhone : map.map;

  mapImg.onload = () => resetGame();
}

/* ================= RESET ================= */

function resetGame() {
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];
  gameState = levelMenu.style.display === "none" ? "playing" : "paused";

  intersections = {};

  if (currentLevel === 1) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "up";
  } else if (currentLevel === 2) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "left";
    intersections.intersection3 = "up";
    intersections.intersection4 = "left";
  } else if (currentLevel === 3) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "left";
    intersections.intersection3 = "right";
    intersections.intersection4 = "down";
    intersections.intersection5 = "up";
  } else if (currentLevel === 4) {
    intersections.intersection1 = "up";
    intersections.intersection2 = "up";
    intersections.intersection3 = "up";
  }

  ui.style.display = "none";
}

/* ================= SPAWN ================= */

function spawnCart() {
  const map = getMap();
  const destinations = Object.keys(map.buildings);
  const randomDest = destinations[Math.floor(Math.random() * destinations.length)];

  const speedBoost = Math.floor(score / 1000) * SPEED_INCREMENT;
  const speed = BASE_SPEED + speedBoost;

  const cartImg = randomDest === "castle" ? CART_IMAGES.princess : CART_IMAGES[randomDest];
  const spawnRight = currentLevel === 3;
  const spawnUp = !spawnRight;
  activeCarts.push({
    x: map.spawn.x,
    y: map.spawn.y,
    vx: spawnRight ? speed : 0,
    vy: spawnUp ? -speed : 0,
    speed: speed,
    destination: randomDest,
    img: cartImg,
    forcedDown: false
  });

  sounds.spawn.currentTime = 0;
  sounds.spawn.play().catch(() => {});
}

/* ================= UPDATE ================= */

function update() {
  if (gameState !== "playing") return;

  spawnTimer++;
  if (spawnTimer >= SPAWN_DELAY) {
    spawnTimer = 0;
    spawnCart();
  }

  const map = getMap();

  for (const cart of activeCarts) {
    cart.x += cart.vx;
    cart.y += cart.vy;

    if (currentLevel === 2 && !cart.forcedDown && cart.x >= 1016) {
      cart.x = 1016;
      cart.vx = 0;
      cart.vy = cart.speed;
      cart.forcedDown = true;
    }

    const prevX = cart.x - cart.vx;
    const prevY = cart.y - cart.vy;

    for (const key in map.intersections) {
      const node = map.intersections[key];
      const radius = currentLevel === 4 ? 22 : INTERSECTION_RADIUS;
      const hit = segmentHitsCircle(
        prevX, prevY,
        cart.x, cart.y,
        node.x, node.y,
        radius
      );

      if (hit && !cart[key]) {
        const dir = intersections[key];

        if (currentLevel === 4) {
          cart.x = node.x;
          cart.y = node.y;
        }

        if (dir === "up") { cart.vx = 0; cart.vy = -cart.speed; }
        if (dir === "left") { cart.vx = -cart.speed; cart.vy = 0; }
        if (dir === "right") { cart.vx = cart.speed; cart.vy = 0; }
        if (dir === "down") { cart.vx = 0; cart.vy = cart.speed; }

        cart[key] = true;
      }
    }

    checkBuildings(cart);
  }

  if (currentLevel === 1 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(2);
    loadLevel(2);
  }
  if (currentLevel === 2 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(3);
    loadLevel(3);
  }
  if (currentLevel === 3 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(4);
    loadLevel(4);
  }
}

/* ================= BUILDINGS ================= */

function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(ax - cx, ay - cy) <= r;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / lenSq));
  const px = ax + t * dx;
  const py = ay + t * dy;
  return Math.hypot(px - cx, py - cy) <= r;
}

function checkBuildings(cart) {
  const map = getMap();
  const prevX = cart.x - cart.vx;
  const prevY = cart.y - cart.vy;
  const hitRadius = 20;

  for (const key in map.buildings) {
    const node = map.buildings[key];
    const hit = Math.hypot(cart.x - node.x, cart.y - node.y) < hitRadius ||
      segmentHitsCircle(prevX, prevY, cart.x, cart.y, node.x, node.y, hitRadius);

    if (hit) {
      activeCarts = activeCarts.filter(c => c !== cart);

      if (key === cart.destination) {
        score += 100;
        sounds[key].currentTime = 0;
        sounds[key].play().catch(() => {});
      } else {
        lives--;
        sounds.wrong.currentTime = 0;
        sounds.wrong.play().catch(() => {});
        if (lives <= 0) loseGame();
      }
    }
  }
}

/* ================= INPUT ================= */

function handleTap(clientX, clientY) {
  if (gameState !== "playing") return;

  const rect = canvas.getBoundingClientRect();
  const worldX = (clientX - rect.left - offsetX) / scaleX;
  const worldY = (clientY - rect.top - offsetY) / scaleY;

  const map = getMap();
  const tapRadius = getTapRadius();

  for (const key in map.intersections) {
    const node = map.intersections[key];
    const dist = Math.hypot(worldX - node.x, worldY - node.y);

    if (dist < tapRadius) {
      if (currentLevel === 2) {
        if (key === "intersection1") intersections[key] = intersections[key] === "up" ? "right" : "up";
        if (key === "intersection2") intersections[key] = intersections[key] === "left" ? "right" : "left";
        if (key === "intersection3") intersections[key] = intersections[key] === "up" ? "right" : "up";
        if (key === "intersection4") intersections[key] = intersections[key] === "left" ? "down" : "left";
      } else if (currentLevel === 3) {
        if (key === "intersection1") intersections[key] = intersections[key] === "up" ? "down" : "up";
        if (key === "intersection2") intersections[key] = intersections[key] === "left" ? "right" : "left";
        if (key === "intersection3") intersections[key] = intersections[key] === "right" ? "down" : "right";
        if (key === "intersection4") intersections[key] = intersections[key] === "down" ? "right" : "down";
        if (key === "intersection5") intersections[key] = intersections[key] === "up" ? "right" : "up";
      } else if (currentLevel === 4) {
        if (key === "intersection1") {
          intersections[key] =
            intersections[key] === "up" ? "left" :
            intersections[key] === "left" ? "right" : "up";
        }
        if (key === "intersection2") intersections[key] = intersections[key] === "up" ? "down" : "up";
        if (key === "intersection3") intersections[key] = intersections[key] === "up" ? "left" : "up";
      } else {
        intersections[key] =
          intersections[key] === "up" ? "left" :
          intersections[key] === "left" ? "right" :
          "up";
      }
    }
  }
}

canvas.addEventListener("click", e => handleTap(e.clientX, e.clientY));
canvas.addEventListener("touchend", e => {
  if (e.cancelable) e.preventDefault();
  const t = e.changedTouches[0];
  if (t) handleTap(t.clientX, t.clientY);
}, { passive: false });

/* ================= DRAW ================= */

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, offsetX * dpr, offsetY * dpr);
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawArrows();
  drawCarts();
  drawHUD();
}

function drawArrows() {
  const map = getMap();
  for (const key in map.intersections) {
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
    ctx.drawImage(img, -ARROW_SIZE / 2, -ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE);
    ctx.restore();
  }
}

function drawCarts() {
  for (const cart of activeCarts) {
    let rotation = 0;
    if (cart.vy > 0) rotation = 0;
    else if (cart.vy < 0) rotation = Math.PI;
    else if (cart.vx < 0) rotation = Math.PI / 2;
    else if (cart.vx > 0) rotation = -Math.PI / 2;

    ctx.save();
    ctx.translate(cart.x, cart.y);
    ctx.rotate(rotation);
    ctx.drawImage(cart.img, -CART_SIZE / 2, -CART_SIZE / 2, CART_SIZE, CART_SIZE);
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
  topControls.style.display = "none";
}

function restartGame() {
  ui.style.display = "none";
  topControls.style.display = "flex";
  resetGame();
}

function toggleMute() {
  isMuted = !isMuted;
  applyMuteState();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

if (!ensureSession()) {
  clearSessionAndGoLogin();
} else {
  topControls.style.display = "flex";
  loadLevel(currentLevel);
  gameState = "paused";
  openLevelMenu();
  applyMuteState();
  requestAnimationFrame(loop);
}
