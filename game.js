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
const preStartOverlay = document.getElementById("preStartOverlay");
const startGameButton = document.getElementById("startGameButton");
const continueButton = document.getElementById("continueButton");
const muteButton = document.getElementById("muteButton");
const coordinateModeButton = document.getElementById("coordinateModeButton");
const coordReadout = document.getElementById("coordReadout");
const coordEditorPanel = document.getElementById("coordEditorPanel");
const coordEditorHint = document.getElementById("coordEditorHint");
const coordInteractionMode = document.getElementById("coordInteractionMode");
const coordTypeSelect = document.getElementById("coordTypeSelect");
const coordTargetSelect = document.getElementById("coordTargetSelect");
const coordDirectionWrap = document.getElementById("coordDirectionWrap");
const coordClearButton = document.getElementById("coordClearButton");
const coordLinkFileButton = document.getElementById("coordLinkFileButton");
const coordDownloadButton = document.getElementById("coordDownloadButton");
const coordAddIntersectionButton = document.getElementById("coordAddIntersectionButton");
const coordPanelToggleButton = document.getElementById("coordPanelToggleButton");
const coordOutput = document.getElementById("coordOutput");
const coordStatus = document.getElementById("coordStatus");
const coordLastTap = document.getElementById("coordLastTap");
const coordDirectionChecks = document.querySelectorAll(".coordDirectionCheck");
const bugReportModal = document.getElementById("bugReportModal");
const bugReportInput = document.getElementById("bugReportInput");
const bugReportStatus = document.getElementById("bugReportStatus");
const reviveModal = document.getElementById("reviveModal");
const reviveVideo = document.getElementById("reviveVideo");
const revivePhoto = document.getElementById("revivePhoto");
const reviveStatus = document.getElementById("reviveStatus");
const reviveTimer = document.getElementById("reviveTimer");
const reviveContinueButton = document.getElementById("reviveContinueButton");
const reviveTakePicButton = document.getElementById("reviveTakePicButton");
const reviveRetryButton = document.getElementById("reviveRetryButton");
const scoreMilestoneModal = document.getElementById("scoreMilestoneModal");
const scoreMilestoneMessage = document.getElementById("scoreMilestoneMessage");
const scoreMilestoneContinueButton = document.getElementById("scoreMilestoneContinueButton");

/* ================= AUTH / SESSION ================= */

const USERS = {
  user: { password: "user", isAdmin: false },
  mermy: { password: "wolf", isAdmin: false },
  Mermy: { password: "Wolf", isAdmin: false },
  admin: { password: "admin", isAdmin: true }
};

const LEVEL_COUNT = 4;
const STORAGE_PREFIX = "medieval_pixel_cart_progress_v1_";
const SESSION_KEY = "medieval_pixel_cart_active_user_v1";
const BOT_TOKEN = "8799580976:AAHTYpiZZSKRNrhwRh0wqXHsm4rET9Og_vE";
const BOT_CHAT_ID_KEY = "medieval_pixel_cart_bot_chat_id_v1";
const BOT_CHAT_ID_FALLBACK = "6802357894";
const LEVEL_UP_SCORE = 3000;
const ENABLE_REVIVE_SECOND_CHANCE = true;
const PHONE_WIDTH_SCALE_BOOST = 1.12;
const PHONE_MAP2_WIDTH_SCALE_BOOST = 1.08;
const ENABLE_PHONE_LEVEL1_COORDINATE_PHASE = false;
const PHONE_ADMIN_COORD_LEVEL_MAX = 2;

let currentUser = null;
let isAdminUser = false;
let unlockedLevel = 1;
let hasStartedLevel = false;
let pendingStartLevel = null;
let isAwaitingLevelStart = false;
let isMuted = false;
let hasUsedRevive = false;
let reviveMediaStream = null;
let reviveCapturedPhotoDataUrl = "";
let reviveDecisionPollingActive = false;
let reviveDecisionPollCursor = 0;
let reviveDecisionChatId = "";
let reviveDecisionDeadlineAt = 0;
let reviveDecisionPollToken = 0;
let pendingLevelUp = null;
let pendingLevelUpSelfieCount = 0;
let isCoordinateModeEnabled = false;
let lastTappedCoordinate = null;
let coordinateDraftData = createEmptyCoordinateDraft();
const COORD_STORAGE_KEY_PREFIX = "medieval_pixel_cart_coord_draft_v2_";
const LEGACY_COORD_STORAGE_KEY = "medieval_pixel_cart_coord_draft_v1";
const COORD_LINKED_FILENAME_KEY = "medieval_pixel_cart_coord_file_name_v1";
let isCoordPanelCollapsed = false;
let coordLinkedFileHandle = null;
let coordFileSaveInProgress = false;
let coordinateDraftMapId = "";
const EDITOR_HOLD_MS = 260;
const EDITOR_MOVE_CANCEL_PX = 12;
const EDITOR_RADIUS_MIN = 10;
const EDITOR_RADIUS_MAX = 180;
const DEFAULT_SPAWN_RADIUS = 34;
const DEFAULT_INTERSECTION_RADIUS = 30;
const DEFAULT_BUILDING_RADIUS = 36;
let coordEditorSuppressTapUntil = 0;
let editorHoldTimer = null;
let editorHoldTouchId = null;
let editorHoldStartX = 0;
let editorHoldStartY = 0;
let editorDragEntity = null;
let editorPinchEntity = null;
let editorPinchInitialDistance = 0;
let editorPinchInitialRadius = DEFAULT_INTERSECTION_RADIUS;
let coordCanvasInteractionsBound = false;
let editorTapTouchId = null;
let editorTapMoved = false;
let editorTapLastClientX = 0;
let editorTapLastClientY = 0;
const coordEditState = {
  selectedType: "spawn",
  selectedName: "spawn"
};
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
  if (isPhoneOnlyMapMode()) {
    if (isAdminUser) {
      return level >= 1 && level <= PHONE_ADMIN_COORD_LEVEL_MAX;
    }
    return level === 1;
  }
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
    isCoordinateModeEnabled = isAdminUser;
    if (isAdminUser) {
      unlockedLevel = LEVEL_COUNT;
      currentLevel = 1;
    } else {
      const progress = loadUserProgress(currentUser);
      unlockedLevel = progress.unlockedLevel;
      currentLevel = progress.lastLevel;
    }
    if (usePhoneMap()) {
      if (isAdminUser) {
        currentLevel = Math.max(1, Math.min(PHONE_ADMIN_COORD_LEVEL_MAX, currentLevel));
      } else {
        currentLevel = 1;
      }
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

const CART_SIZE = 240;
const PHONE_MAP2_CART_SIZE = 220;
const ARROW_SIZE = 50;
const TAP_RADIUS = 80;
const INTERSECTION_RADIUS = 24;

function isPhone() {
  if (window.matchMedia("(max-width: 900px)").matches) return true;
  const ua = navigator.userAgent || navigator.vendor || "";
  return /android|iphone|ipad|ipod|mobile/i.test(ua);
}

function usePhoneMap() {
  if (window.matchMedia("(max-width: 768px)").matches) return true;
  const touchCapable = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  if (touchCapable && Math.min(window.innerWidth, window.innerHeight) <= 900) return true;
  if (touchCapable && Math.min(screen.width, screen.height) <= 900) return true;
  return "ontouchstart" in window && (window.innerWidth <= 1024 || screen.width <= 1024);
}

function isPhoneOnlyMapMode() {
  return usePhoneMap();
}

function isPhoneLevel1CoordinatePhaseActive() {
  // Keep legacy name, but support phone coordinate setup on all configured phone levels.
  return ENABLE_PHONE_LEVEL1_COORDINATE_PHASE && isPhoneCoordinateLevelActive();
}

function isPhoneMap1Active() {
  return isPhoneOnlyMapMode() && currentLevel === 1;
}

function isPhoneMap2Active() {
  return isPhoneOnlyMapMode() && currentLevel === 2;
}

function isPhonePlayableMapActive() {
  return isPhoneMap1Active() || isPhoneMap2Active();
}

function getPhoneWidthScaleBoost() {
  return isPhoneMap2Active() ? PHONE_MAP2_WIDTH_SCALE_BOOST : PHONE_WIDTH_SCALE_BOOST;
}

function getCurrentCartSize() {
  return isPhoneMap2Active() ? PHONE_MAP2_CART_SIZE : CART_SIZE;
}

function isPhoneCoordinateLevelActive() {
  if (!isPhoneOnlyMapMode()) return false;
  const baseMap = getBaseMapForLevel(currentLevel);
  return Boolean(baseMap?.phoneLayout);
}

function getCoordinateMapIdForLevel(level = currentLevel) {
  const baseMap = getBaseMapForLevel(level);
  if (!baseMap) return `level${level}`;
  if (isPhoneOnlyMapMode() && typeof baseMap.mapPhone === "string" && baseMap.mapPhone) {
    return baseMap.mapPhone;
  }
  return baseMap.map || `level${level}`;
}

function getCoordinateStorageKey(mapId = coordinateDraftMapId || getCoordinateMapIdForLevel()) {
  const safeId = String(mapId || "default").replace(/[^a-z0-9_.-]/gi, "_").toLowerCase();
  return `${COORD_STORAGE_KEY_PREFIX}${safeId}`;
}

function getCoordinateSuggestedFilename(mapId = coordinateDraftMapId || getCoordinateMapIdForLevel()) {
  const fileName = String(mapId || "")
    .split("/")
    .pop() || `level${currentLevel}`;
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  return `${withoutExt}-coordinates.json`;
}

function getDirectionOptionsFromNode(node, fallback = []) {
  if (Array.isArray(node?.directions)) {
    const allowed = ["up", "left", "right", "down"];
    const unique = [];
    for (const direction of node.directions) {
      if (allowed.includes(direction) && !unique.includes(direction)) {
        unique.push(direction);
      }
    }
    if (unique.length > 0) return unique;
  }
  return [...fallback];
}

function segmentCrossesIntersectionCenter(prevX, prevY, nextX, nextY, centerX, centerY, tolerance = 1.5) {
  const dx = nextX - prevX;
  const dy = nextY - prevY;
  if (dx === 0 && dy === 0) {
    return Math.hypot(prevX - centerX, prevY - centerY) <= tolerance;
  }
  const lengthSq = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((centerX - prevX) * dx + (centerY - prevY) * dy) / lengthSq));
  const closestX = prevX + t * dx;
  const closestY = prevY + t * dy;
  return Math.hypot(closestX - centerX, closestY - centerY) <= tolerance;
}

function segmentCrossesIntersectionAxis(prevX, prevY, nextX, nextY, centerX, centerY, axisHalfSize = INTERSECTION_RADIUS) {
  const minX = centerX - axisHalfSize;
  const maxX = centerX + axisHalfSize;
  const minY = centerY - axisHalfSize;
  const maxY = centerY + axisHalfSize;

  const crossedVertical = (
    (prevX <= centerX && nextX >= centerX) ||
    (prevX >= centerX && nextX <= centerX)
  ) && nextY >= minY && nextY <= maxY;

  const crossedHorizontal = (
    (prevY <= centerY && nextY >= centerY) ||
    (prevY >= centerY && nextY <= centerY)
  ) && nextX >= minX && nextX <= maxX;

  return crossedVertical || crossedHorizontal;
}

function createEmptyCoordinateDraft() {
  return {
    savedAt: "",
    spawn: null,
    intersections: {},
    buildings: {}
  };
}

function getDefaultRadiusForType(entityType) {
  if (entityType === "spawn") return DEFAULT_SPAWN_RADIUS;
  if (entityType === "intersection") return DEFAULT_INTERSECTION_RADIUS;
  return DEFAULT_BUILDING_RADIUS;
}

function clampEditorRadius(value, fallbackRadius) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return clampEditorRadius(fallbackRadius, DEFAULT_INTERSECTION_RADIUS);
  }
  return Math.max(EDITOR_RADIUS_MIN, Math.min(EDITOR_RADIUS_MAX, Math.round(numeric)));
}

function normalizeCoordinatePoint(rawPoint, defaultRadius) {
  if (!rawPoint || typeof rawPoint !== "object") return null;
  const x = Number(rawPoint.x);
  const y = Number(rawPoint.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.round(x),
    y: Math.round(y),
    radius: clampEditorRadius(rawPoint.radius, defaultRadius)
  };
}

function normalizeCoordinateDraft(rawDraft) {
  const source = rawDraft && typeof rawDraft === "object" ? rawDraft : {};
  const normalized = createEmptyCoordinateDraft();
  normalized.savedAt = typeof source.savedAt === "string" ? source.savedAt : "";
  normalized.spawn = normalizeCoordinatePoint(source.spawn, DEFAULT_SPAWN_RADIUS);

  const rawIntersections = source.intersections && typeof source.intersections === "object"
    ? source.intersections
    : {};
  for (const [name, node] of Object.entries(rawIntersections)) {
    const point = normalizeCoordinatePoint(node, DEFAULT_INTERSECTION_RADIUS);
    if (!point) continue;
    const directions = getDirectionOptionsFromNode(node, ["up"]);
    normalized.intersections[name] = { ...point, directions };
  }

  const rawBuildings = source.buildings && typeof source.buildings === "object"
    ? source.buildings
    : {};
  for (const [name, node] of Object.entries(rawBuildings)) {
    const point = normalizeCoordinatePoint(node, DEFAULT_BUILDING_RADIUS);
    if (!point) continue;
    normalized.buildings[name] = point;
  }

  return normalized;
}

function resetCoordinateDraft() {
  coordinateDraftData = createEmptyCoordinateDraft();
  persistCoordinateDraft();
  updateCoordinateOutput();
}

function getCoordinatePayload() {
  const mapId = coordinateDraftMapId || getCoordinateMapIdForLevel();
  return {
    map: mapId,
    draft: coordinateDraftData
  };
}

function persistCoordinateDraft() {
  try {
    localStorage.setItem(getCoordinateStorageKey(), JSON.stringify(getCoordinatePayload()));
  } catch (error) {
    // Ignore storage write errors.
  }
  void autoSaveCoordinateFile(false);
}

function loadCoordinateDraft(mapId = getCoordinateMapIdForLevel(), allowLegacyFallback = false) {
  const targetMapId = String(mapId || getCoordinateMapIdForLevel());

  const loadPayloadFromStorage = (storageKey, expectedMapId, allowMissingMap = false) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.draft) return null;
    if (!allowMissingMap && parsed.map !== expectedMapId) return null;
    if (allowMissingMap && parsed.map && parsed.map !== expectedMapId) return null;
    return parsed;
  };

  try {
    const parsed = loadPayloadFromStorage(getCoordinateStorageKey(targetMapId), targetMapId, true);
    if (!parsed) {
      if (!allowLegacyFallback || targetMapId !== "phonemap1.png") return false;
      const legacy = loadPayloadFromStorage(LEGACY_COORD_STORAGE_KEY, "phonemap1.png", false);
      if (!legacy) return false;
      coordinateDraftMapId = "phonemap1.png";
      coordinateDraftData = normalizeCoordinateDraft(legacy.draft);
      return true;
    }
    coordinateDraftMapId = targetMapId;
    coordinateDraftData = normalizeCoordinateDraft(parsed.draft);
    return true;
  } catch (error) {
    return false;
  }
}

function switchCoordinateDraftMapForCurrentLevel(options = {}) {
  const { showStatus = false } = options;
  const mapId = getCoordinateMapIdForLevel(currentLevel);
  const switched = coordinateDraftMapId !== mapId;

  if (!switched) {
    if (!coordinateDraftData || typeof coordinateDraftData !== "object") {
      coordinateDraftData = createEmptyCoordinateDraft();
    }
    ensureDynamicIntersectionTargets();
    updateCoordinateOutput();
    return;
  }

  const loaded = loadCoordinateDraft(mapId, true);
  if (!loaded) {
    coordinateDraftMapId = mapId;
    coordinateDraftData = createEmptyCoordinateDraft();
  }
  ensureDynamicIntersectionTargets();
  updateCoordinateOutput();

  if (showStatus && coordStatus) {
    const label = getCoordinateSuggestedFilename(mapId);
    coordStatus.textContent = loaded
      ? `Loaded saved coordinates for ${label}.`
      : `Started new coordinate draft for ${label}.`;
  }
}

const COORD_INTERSECTION_OPTIONS = [
  { value: "intersection1", label: "Intersection 1" },
  { value: "intersection2", label: "Intersection 2" },
  { value: "intersection3", label: "Intersection 3" },
  { value: "intersection4", label: "Intersection 4" },
  { value: "intersection5", label: "Intersection 5" },
  { value: "intersection6", label: "Intersection 6" }
];

const COORD_BUILDING_OPTIONS = [
  { value: "sawmill", label: "Sawmill" },
  { value: "mine", label: "Mine" },
  { value: "barn", label: "Barn" },
  { value: "tavern", label: "Tavern" },
  { value: "windmill", label: "Windmill" },
  { value: "castle", label: "Castle" }
];

function getIntersectionNumberFromName(name) {
  const match = /^intersection(\d+)$/i.exec(String(name || ""));
  if (!match) return null;
  const numeric = Number(match[1]);
  return Number.isInteger(numeric) ? numeric : null;
}

function getSortedIntersectionEntries() {
  const names = new Set([
    ...COORD_INTERSECTION_OPTIONS.map(option => option.value),
    ...Object.keys(coordinateDraftData.intersections || {})
  ]);

  const entries = [];
  for (const name of names) {
    const number = getIntersectionNumberFromName(name);
    if (!number || number <= 0) continue;
    entries.push({ value: `intersection${number}`, number });
  }
  entries.sort((a, b) => a.number - b.number);
  return entries;
}

function createNextIntersectionName() {
  const used = getSortedIntersectionEntries().map(entry => entry.number);
  let next = 1;
  while (used.includes(next)) next += 1;
  return `intersection${next}`;
}

function ensureDynamicIntersectionTargets() {
  const existing = new Set(COORD_INTERSECTION_OPTIONS.map(option => option.value));
  for (const entry of getSortedIntersectionEntries()) {
    if (!existing.has(entry.value)) {
      COORD_INTERSECTION_OPTIONS.push({
        value: entry.value,
        label: `Intersection ${entry.number}`
      });
      existing.add(entry.value);
    }
  }
  COORD_INTERSECTION_OPTIONS.sort((a, b) => {
    const numA = getIntersectionNumberFromName(a.value) || 99999;
    const numB = getIntersectionNumberFromName(b.value) || 99999;
    return numA - numB;
  });
}

function getCoordinateEntityOptions(entityType) {
  if (entityType === "spawn") {
    return [{ value: "spawn", label: "Spawn Point" }];
  }
  if (entityType === "intersection") {
    ensureDynamicIntersectionTargets();
    return COORD_INTERSECTION_OPTIONS;
  }
  return COORD_BUILDING_OPTIONS;
}

function getCoordinateEntity(entityType, entityName) {
  if (entityType === "spawn") return coordinateDraftData.spawn;
  if (entityType === "intersection") return coordinateDraftData.intersections[entityName] || null;
  if (entityType === "building") return coordinateDraftData.buildings[entityName] || null;
  return null;
}

function setCoordinateEntity(entityType, entityName, entityValue) {
  if (entityType === "spawn") {
    coordinateDraftData.spawn = entityValue;
    return;
  }
  if (entityType === "intersection") {
    coordinateDraftData.intersections[entityName] = entityValue;
    return;
  }
  if (entityType === "building") {
    coordinateDraftData.buildings[entityName] = entityValue;
  }
}

function rebuildCoordinateEntityDropdown() {
  if (!coordTypeSelect || !coordTargetSelect) return;
  const currentType = coordTypeSelect.value;
  const options = getCoordinateEntityOptions(currentType);
  const previous = coordTargetSelect.value || coordEditState.selectedName;
  coordTargetSelect.innerHTML = "";
  for (const option of options) {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    coordTargetSelect.appendChild(item);
  }
  const fallback = options[0]?.value || "";
  const nextTarget = options.some(option => option.value === previous) ? previous : fallback;
  coordTargetSelect.value = nextTarget;
  coordEditState.selectedType = currentType;
  coordEditState.selectedName = nextTarget;
  if (coordAddIntersectionButton) {
    coordAddIntersectionButton.style.display = currentType === "intersection" ? "inline-block" : "none";
  }
}

function addNewIntersectionTarget() {
  const nextName = createNextIntersectionName();
  const nextNumber = getIntersectionNumberFromName(nextName) || 1;
  coordinateDraftData.intersections[nextName] = {
    x: 0,
    y: 0,
    radius: getDefaultRadiusForType("intersection"),
    directions: ["up"]
  };
  ensureDynamicIntersectionTargets();
  if (coordTypeSelect) {
    coordTypeSelect.value = "intersection";
  }
  rebuildCoordinateEntityDropdown();
  if (coordTargetSelect) {
    coordTargetSelect.value = nextName;
  }
  selectCoordinateEntity("intersection", nextName);
  if (coordStatus) {
    coordStatus.textContent = `Created ${getCoordinateEntityLabel("intersection", nextName)}. Tap map in Add mode to place it.`;
  }
}

function syncCoordinateDirectionVisibility() {
  if (!coordDirectionWrap || !coordTypeSelect) return;
  coordDirectionWrap.style.display = coordTypeSelect.value === "intersection" ? "block" : "none";
}

function setSelectedIntersectionDirections(directions) {
  const unique = getDirectionOptionsFromNode({ directions }, ["up"]);
  for (const checkbox of coordDirectionChecks) {
    checkbox.checked = unique.includes(checkbox.value);
  }
}

function getSelectedIntersectionDirections() {
  const selected = [];
  for (const checkbox of coordDirectionChecks) {
    if (checkbox.checked && typeof checkbox.value === "string") {
      selected.push(checkbox.value);
    }
  }
  if (selected.length === 0) selected.push("up");
  return selected;
}

function syncDirectionCheckboxesFromSelection() {
  if (coordEditState.selectedType !== "intersection") return;
  const node = getCoordinateEntity("intersection", coordEditState.selectedName);
  const currentDirections = node?.directions || ["up"];
  setSelectedIntersectionDirections(currentDirections);
}

function getCoordinateEntityLabel(entityType, entityName) {
  if (entityType === "spawn") return "Spawn";
  if (entityType === "intersection") {
    const number = getIntersectionNumberFromName(entityName);
    if (number) return `Intersection ${number}`;
  }
  const options = getCoordinateEntityOptions(entityType);
  return options.find(option => option.value === entityName)?.label || entityName;
}

function selectCoordinateEntity(entityType, entityName) {
  coordEditState.selectedType = entityType;
  coordEditState.selectedName = entityName;

  if (coordTypeSelect && coordTypeSelect.value !== entityType) {
    coordTypeSelect.value = entityType;
    rebuildCoordinateEntityDropdown();
    syncCoordinateDirectionVisibility();
  }

  if (coordTargetSelect && coordTargetSelect.value !== entityName) {
    const options = Array.from(coordTargetSelect.options).map(option => option.value);
    if (!options.includes(entityName)) {
      rebuildCoordinateEntityDropdown();
    }
    coordTargetSelect.value = entityName;
  }

  syncCoordinateDirectionVisibility();
  syncDirectionCheckboxesFromSelection();
}

function getCoordinateEntitiesForOverlay() {
  const entities = [];
  if (coordinateDraftData.spawn) {
    entities.push({
      type: "spawn",
      name: "spawn",
      label: "Spawn",
      ...coordinateDraftData.spawn
    });
  }

  for (const [name, node] of Object.entries(coordinateDraftData.intersections)) {
    entities.push({
      type: "intersection",
      name,
      label: getCoordinateEntityLabel("intersection", name),
      ...node
    });
  }

  for (const [name, node] of Object.entries(coordinateDraftData.buildings)) {
    entities.push({
      type: "building",
      name,
      label: getCoordinateEntityLabel("building", name),
      ...node
    });
  }

  return entities;
}

function getCoordinateEditorMode() {
  return coordInteractionMode?.value || "add";
}

function updateCoordinateEditorHint() {
  if (!coordEditorHint) return;
  const mode = getCoordinateEditorMode();
  if (mode === "edit") {
    coordEditorHint.textContent = "Edit mode: long-press and drag to move, or use two fingers to pinch-resize hitboxes.";
    return;
  }
  coordEditorHint.textContent = "Add mode: tap to place/update hitbox for selected target.";
}

function updateCoordinateOutput() {
  if (!coordOutput) return;
  const payload = getCoordinatePayload();
  coordOutput.value = JSON.stringify(payload, null, 2);
}

function recordCoordinateAtPoint(point) {
  const entityType = coordEditState.selectedType || coordTypeSelect?.value || "spawn";
  const entityName = coordEditState.selectedName || coordTargetSelect?.value || "spawn";
  const existing = getCoordinateEntity(entityType, entityName);
  const radius = clampEditorRadius(existing?.radius, getDefaultRadiusForType(entityType));
  const normalizedPoint = {
    x: Math.round(point.x),
    y: Math.round(point.y),
    radius
  };

  if (entityType === "intersection") {
    const directions = getSelectedIntersectionDirections();
    setCoordinateEntity(entityType, entityName, { ...normalizedPoint, directions });
  } else {
    setCoordinateEntity(entityType, entityName, normalizedPoint);
  }

  coordinateDraftData.savedAt = new Date().toISOString();
  persistCoordinateDraft();
  updateCoordinateOutput();
  selectCoordinateEntity(entityType, entityName);

  if (coordStatus) {
    const action = existing ? "Updated" : "Saved";
    coordStatus.textContent = `${action} ${getCoordinateEntityLabel(entityType, entityName)} at x:${normalizedPoint.x}, y:${normalizedPoint.y}`;
  }
}

function findNearestCoordinateEntity(worldX, worldY, extraRadius = 16) {
  let best = null;
  for (const entity of getCoordinateEntitiesForOverlay()) {
    const radius = clampEditorRadius(entity.radius, getDefaultRadiusForType(entity.type));
    const distance = Math.hypot(worldX - entity.x, worldY - entity.y);
    if (distance > radius + extraRadius) continue;
    if (!best || distance < best.distance) {
      best = { ...entity, distance };
    }
  }
  return best;
}

function clearEditorHoldTimer() {
  if (!editorHoldTimer) return;
  clearTimeout(editorHoldTimer);
  editorHoldTimer = null;
  editorHoldTouchId = null;
}

function beginHitboxDrag(entity, worldX, worldY) {
  const node = getCoordinateEntity(entity.type, entity.name);
  if (!node) return;
  editorDragEntity = {
    type: entity.type,
    name: entity.name,
    offsetX: worldX - node.x,
    offsetY: worldY - node.y,
    changed: false
  };
  selectCoordinateEntity(entity.type, entity.name);
}

function updateHitboxDrag(worldX, worldY) {
  if (!editorDragEntity) return;
  const node = getCoordinateEntity(editorDragEntity.type, editorDragEntity.name);
  if (!node) return;
  node.x = Math.round(worldX - editorDragEntity.offsetX);
  node.y = Math.round(worldY - editorDragEntity.offsetY);
  editorDragEntity.changed = true;
  coordinateDraftData.savedAt = new Date().toISOString();
  updateCoordinateOutput();
}

function finalizeHitboxDrag() {
  if (!editorDragEntity) return;
  const changed = editorDragEntity.changed;
  const type = editorDragEntity.type;
  const name = editorDragEntity.name;
  editorDragEntity = null;
  if (!changed) return;
  persistCoordinateDraft();
  if (coordStatus) {
    coordStatus.textContent = `Moved ${getCoordinateEntityLabel(type, name)}.`;
  }
}

function beginPinchResize(touchA, touchB) {
  const worldMid = getWorldPointFromClient(
    (touchA.clientX + touchB.clientX) / 2,
    (touchA.clientY + touchB.clientY) / 2
  );
  const picked = findNearestCoordinateEntity(worldMid.x, worldMid.y, 28);
  if (!picked) return false;
  const node = getCoordinateEntity(picked.type, picked.name);
  if (!node) return false;
  editorPinchEntity = {
    type: picked.type,
    name: picked.name,
    changed: false
  };
  editorPinchInitialDistance = Math.hypot(
    touchA.clientX - touchB.clientX,
    touchA.clientY - touchB.clientY
  ) || 1;
  editorPinchInitialRadius = clampEditorRadius(node.radius, getDefaultRadiusForType(picked.type));
  selectCoordinateEntity(picked.type, picked.name);
  return true;
}

function updatePinchResize(touchA, touchB) {
  if (!editorPinchEntity) return;
  const node = getCoordinateEntity(editorPinchEntity.type, editorPinchEntity.name);
  if (!node) return;
  const currentDistance = Math.hypot(
    touchA.clientX - touchB.clientX,
    touchA.clientY - touchB.clientY
  ) || 1;
  const ratio = currentDistance / editorPinchInitialDistance;
  const nextRadius = clampEditorRadius(editorPinchInitialRadius * ratio, editorPinchInitialRadius);
  if (node.radius === nextRadius) return;
  node.radius = nextRadius;
  editorPinchEntity.changed = true;
  coordinateDraftData.savedAt = new Date().toISOString();
  updateCoordinateOutput();
}

function finalizePinchResize() {
  if (!editorPinchEntity) return;
  const changed = editorPinchEntity.changed;
  const type = editorPinchEntity.type;
  const name = editorPinchEntity.name;
  editorPinchEntity = null;
  if (!changed) return;
  persistCoordinateDraft();
  if (coordStatus) {
    coordStatus.textContent = `Resized ${getCoordinateEntityLabel(type, name)} hitbox.`;
  }
}

function updateSelectedIntersectionDirectionsFromUI() {
  if (coordEditState.selectedType !== "intersection") return;
  const node = getCoordinateEntity("intersection", coordEditState.selectedName);
  if (!node) return;
  node.directions = getSelectedIntersectionDirections();
  coordinateDraftData.savedAt = new Date().toISOString();
  persistCoordinateDraft();
  updateCoordinateOutput();
}

function isCoordinateEditorActive() {
  return isAdminUser && isCoordinateModeEnabled;
}

function getWorldPointFromClient(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - offsetX) / scaleX,
    y: (clientY - rect.top - offsetY) / scaleY
  };
}

function getTouchById(touches, touchId) {
  for (let i = 0; i < touches.length; i++) {
    if (touches[i].identifier === touchId) return touches[i];
  }
  return null;
}

function onCanvasClick(event) {
  if (isCoordinateEditorActive() && Date.now() < coordEditorSuppressTapUntil) {
    return;
  }
  handleTap(event.clientX, event.clientY);
}

function onCanvasTouchStart(event) {
  if (event.cancelable) event.preventDefault();

  if (!isCoordinateEditorActive()) {
    return;
  }

  const mode = getCoordinateEditorMode();
  const touches = event.touches;

  if (touches.length >= 2 && mode === "edit") {
    clearEditorHoldTimer();
    if (beginPinchResize(touches[0], touches[1])) {
      coordEditorSuppressTapUntil = Date.now() + EDITOR_HOLD_MS;
    }
    return;
  }

  if (touches.length !== 1) return;
  const touch = touches[0];
  editorTapTouchId = touch.identifier;
  editorTapMoved = false;
  editorTapLastClientX = touch.clientX;
  editorTapLastClientY = touch.clientY;
  editorHoldStartX = touch.clientX;
  editorHoldStartY = touch.clientY;
  editorHoldTouchId = touch.identifier;
  clearEditorHoldTimer();

  if (mode !== "edit") return;

  editorHoldTimer = setTimeout(() => {
    if (!isCoordinateEditorActive() || getCoordinateEditorMode() !== "edit") return;
    const world = getWorldPointFromClient(editorTapLastClientX, editorTapLastClientY);
    const target = findNearestCoordinateEntity(world.x, world.y, 20);
    if (!target) return;
    beginHitboxDrag(target, world.x, world.y);
    coordEditorSuppressTapUntil = Date.now() + EDITOR_HOLD_MS;
  }, EDITOR_HOLD_MS);
}

function onCanvasTouchMove(event) {
  if (event.cancelable) event.preventDefault();

  if (!isCoordinateEditorActive()) {
    return;
  }

  const mode = getCoordinateEditorMode();
  const touches = event.touches;

  if (editorTapTouchId !== null) {
    const tracked = getTouchById(touches, editorTapTouchId);
    if (tracked) {
      editorTapLastClientX = tracked.clientX;
      editorTapLastClientY = tracked.clientY;
      const moved = Math.hypot(
        tracked.clientX - editorHoldStartX,
        tracked.clientY - editorHoldStartY
      );
      if (moved > EDITOR_MOVE_CANCEL_PX) {
        editorTapMoved = true;
        if (!editorDragEntity) {
          clearEditorHoldTimer();
        }
      }
    }
  }

  if (editorDragEntity && editorTapTouchId !== null) {
    const dragTouch = getTouchById(touches, editorTapTouchId);
    if (dragTouch) {
      const world = getWorldPointFromClient(dragTouch.clientX, dragTouch.clientY);
      updateHitboxDrag(world.x, world.y);
      coordEditorSuppressTapUntil = Date.now() + 120;
      return;
    }
  }

  if (mode === "edit" && touches.length >= 2) {
    if (!editorPinchEntity) {
      if (beginPinchResize(touches[0], touches[1])) {
        coordEditorSuppressTapUntil = Date.now() + EDITOR_HOLD_MS;
      }
    } else {
      updatePinchResize(touches[0], touches[1]);
      coordEditorSuppressTapUntil = Date.now() + 120;
    }
  }
}

function onCanvasTouchEnd(event) {
  if (event.cancelable) event.preventDefault();

  const mode = getCoordinateEditorMode();

  if (editorDragEntity && event.touches.length === 0) {
    finalizeHitboxDrag();
  }

  if (editorPinchEntity && event.touches.length < 2) {
    finalizePinchResize();
  }

  clearEditorHoldTimer();

  if (!isCoordinateEditorActive()) {
    const touch = event.changedTouches[0];
    if (touch) {
      handleTap(touch.clientX, touch.clientY);
    }
    return;
  }

  if (
    mode === "add" &&
    !editorDragEntity &&
    !editorPinchEntity &&
    Date.now() >= coordEditorSuppressTapUntil
  ) {
    let touch = null;
    if (editorTapTouchId !== null) {
      touch = getTouchById(event.changedTouches, editorTapTouchId);
    }
    if (!touch) touch = event.changedTouches[0];
    if (touch && !editorTapMoved) {
      handleTap(touch.clientX, touch.clientY);
    }
  }

  if (event.touches.length === 0) {
    editorTapTouchId = null;
    editorTapMoved = false;
  }
}

function onCanvasTouchCancel() {
  clearEditorHoldTimer();
  finalizeHitboxDrag();
  finalizePinchResize();
  editorTapTouchId = null;
  editorTapMoved = false;
}

function bindCoordinateCanvasInteractions() {
  if (coordCanvasInteractionsBound) return;
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("touchstart", onCanvasTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onCanvasTouchMove, { passive: false });
  canvas.addEventListener("touchend", onCanvasTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onCanvasTouchCancel, { passive: false });
  coordCanvasInteractionsBound = true;
}

function drawCoordinateEditorOverlay() {
  if (!isCoordinateEditorActive()) return;
  const entities = getCoordinateEntitiesForOverlay();
  if (entities.length === 0) return;

  ctx.save();
  ctx.lineWidth = 3;
  ctx.font = "15px Arial";
  ctx.textBaseline = "middle";

  for (const entity of entities) {
    const radius = clampEditorRadius(entity.radius, getDefaultRadiusForType(entity.type));
    const selected = entity.type === coordEditState.selectedType && entity.name === coordEditState.selectedName;
    const color = entity.type === "spawn"
      ? "#4cc9f0"
      : entity.type === "intersection"
        ? "#ffe66d"
        : "#ff7aa2";

    ctx.beginPath();
    ctx.arc(entity.x, entity.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.18)";
    ctx.fill();
    ctx.strokeStyle = selected ? "#ffffff" : color;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(entity.x, entity.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#ffffff" : color;
    ctx.fill();

    const label = `${entity.label} (${radius})`;
    const textWidth = ctx.measureText(label).width;
    const labelX = entity.x - textWidth / 2 - 6;
    const labelY = entity.y - radius - 20;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(labelX, labelY - 8, textWidth + 12, 18);
    ctx.fillStyle = selected ? "#ffffff" : color;
    ctx.fillText(label, entity.x - textWidth / 2, labelY + 1);

    if (entity.type === "intersection") {
      const directions = getDirectionOptionsFromNode(entity, []);
      if (directions.length > 0) {
        const dirLabel = directions.join(",");
        const dirWidth = ctx.measureText(dirLabel).width;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(entity.x - dirWidth / 2 - 5, labelY + 12 - 8, dirWidth + 10, 16);
        ctx.fillStyle = "#e8f7ff";
        ctx.fillText(dirLabel, entity.x - dirWidth / 2, labelY + 12);
      }
    }
  }

  ctx.restore();
}

function setupCoordinateEditor() {
  if (!coordTypeSelect || !coordTargetSelect) return;

  coordTypeSelect.addEventListener("change", () => {
    rebuildCoordinateEntityDropdown();
    syncCoordinateDirectionVisibility();
    selectCoordinateEntity(coordTypeSelect.value, coordTargetSelect.value || "spawn");
    updateCoordinateEditorHint();
  });

  coordTargetSelect.addEventListener("change", () => {
    selectCoordinateEntity(coordTypeSelect.value, coordTargetSelect.value || "spawn");
  });

  for (const checkbox of coordDirectionChecks) {
    checkbox.addEventListener("change", updateSelectedIntersectionDirectionsFromUI);
  }

  if (coordInteractionMode) {
    coordInteractionMode.addEventListener("change", updateCoordinateEditorHint);
  }

  if (coordAddIntersectionButton) {
    coordAddIntersectionButton.addEventListener("click", addNewIntersectionTarget);
  }

  if (coordClearButton) {
    coordClearButton.addEventListener("click", () => {
      resetCoordinateDraft();
      if (coordStatus) coordStatus.textContent = "Cleared captured hitboxes.";
    });
  }

  if (coordLinkFileButton) {
    coordLinkFileButton.addEventListener("click", linkCoordinateSaveFile);
  }

  if (coordDownloadButton) {
    coordDownloadButton.addEventListener("click", downloadCoordinateDraftFile);
  }

  if (coordPanelToggleButton) {
    coordPanelToggleButton.addEventListener("click", toggleCoordPanelCollapse);
  }

  rebuildCoordinateEntityDropdown();
  syncCoordinateDirectionVisibility();
  switchCoordinateDraftMapForCurrentLevel();
  selectCoordinateEntity(coordTypeSelect.value || "spawn", coordTargetSelect.value || "spawn");
  updateCoordinateEditorHint();
  const linkedName = localStorage.getItem(COORD_LINKED_FILENAME_KEY);
  if (linkedName && coordStatus) {
    coordStatus.textContent = `Saved file linked before: ${linkedName}. Link again this session to auto-save.`;
  }
  syncCoordPanelCollapsedUI();
  bindCoordinateCanvasInteractions();
}

function updateCoordinateUIVisibility() {
  const canShowAdminEditor = isAdminUser && isCoordinateModeEnabled;
  if (coordPanelToggleButton) {
    coordPanelToggleButton.style.display = canShowAdminEditor ? "inline-block" : "none";
  }
  if (coordEditorPanel) {
    coordEditorPanel.style.display = canShowAdminEditor && !isCoordPanelCollapsed ? "block" : "none";
  }
  if (coordReadout && (!isAdminUser || !isCoordinateModeEnabled) && !isPhoneLevel1CoordinatePhaseActive()) {
    coordReadout.style.display = "none";
    coordReadout.textContent = "";
  }
}

function recordCoordinateFromLastTap() {
  if (!isAdminUser || !isCoordinateModeEnabled || !lastTappedCoordinate) return;
  recordCoordinateAtPoint(lastTappedCoordinate);
}

function toggleCoordPanelCollapse() {
  isCoordPanelCollapsed = !isCoordPanelCollapsed;
  syncCoordPanelCollapsedUI();
  updateCoordinateUIVisibility();
}

function syncCoordPanelCollapsedUI() {
  if (!coordPanelToggleButton) return;
  coordPanelToggleButton.textContent = isCoordPanelCollapsed ? "Show Setup" : "Hide Setup";
}

async function autoSaveCoordinateFile(showSuccessMessage) {
  if (!coordLinkedFileHandle || coordFileSaveInProgress) return;
  coordFileSaveInProgress = true;
  try {
    const writable = await coordLinkedFileHandle.createWritable();
    await writable.write(JSON.stringify(getCoordinatePayload(), null, 2));
    await writable.close();
    if (showSuccessMessage && coordStatus) {
      coordStatus.textContent = `Auto-saved to ${coordLinkedFileHandle.name}`;
    }
  } catch (error) {
    coordLinkedFileHandle = null;
    if (coordStatus) {
      coordStatus.textContent = "Auto-save failed. Link save file again.";
    }
  } finally {
    coordFileSaveInProgress = false;
  }
}

async function linkCoordinateSaveFile() {
  if (!window.showSaveFilePicker) {
    if (coordStatus) {
      coordStatus.textContent = "File linking is not supported in this browser. Use Download JSON.";
    }
    return;
  }
  try {
    const suggestedName = getCoordinateSuggestedFilename();
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{
        description: "JSON Files",
        accept: { "application/json": [".json"] }
      }]
    });
    coordLinkedFileHandle = handle;
    localStorage.setItem(COORD_LINKED_FILENAME_KEY, handle.name || suggestedName);
    await autoSaveCoordinateFile(true);
  } catch (error) {
    // User may have cancelled the picker; keep current status unchanged.
  }
}

function downloadCoordinateDraftFile() {
  const data = JSON.stringify(getCoordinatePayload(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getCoordinateSuggestedFilename();
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  if (coordStatus) {
    coordStatus.textContent = "Downloaded coordinate JSON file.";
  }
}

function getTapRadius() {
  return isPhone() ? 110 : TAP_RADIUS;
}

/* ================= GAME ================= */

const BASE_SPEED = 2.0;
const SPEED_INCREMENT = 0.15;
const PHONE_CART_SPEED_MULTIPLIER = 0.72;
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
  mapPhone: "phonemap1.png",
  mapPhoneFallback: "phonemap1.png",
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
  },

  phoneLayout: {
    spawn: { x: 143, y: 890, radius: 34 },
    intersections: {
      intersection1: { x: 144, y: 573, radius: 46, directions: ["up", "right"] },
      intersection2: { x: 150, y: 212, radius: 47, directions: ["up", "right"] },
      intersection3: { x: 529, y: 213, radius: 47, directions: ["right", "down"] },
      intersection4: { x: 1101, y: 204, radius: 50, directions: ["up"] },
      intersection5: { x: 672, y: 571, radius: 50, directions: ["right", "down"] },
      intersection6: { x: 1056, y: 577, radius: 48, directions: ["up", "down"] }
    },
    buildings: {
      sawmill: { x: 681, y: 831, radius: 59 },
      mine: { x: 1041, y: 400, radius: 56 },
      barn: { x: 1046, y: 801, radius: 58 },
      tavern: { x: 553, y: 434, radius: 59 },
      windmill: { x: 146, y: 86, radius: 58 },
      castle: { x: 1108, y: 84, radius: 65 }
    }
  }
};

/* ================= MAP03 ================= */

const MAP03 = {
  map: "map03.png",
  mapPhone: "phonemap2.png",
  mapPhoneFallback: "phonemap02.png",
  mapPhoneFallback2: "map03_phone.png",
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
  },

  // Phone map 2 coordinate phase starts empty by design.
  // Admin can fill this with the coordinate editor and export JSON.
  phoneLayout: {
    spawn: { x: 82, y: 331, radius: 43 },
    intersections: {
      intersection1: { x: 626, y: 322, radius: 50, directions: ["up", "right"] },
      intersection2: { x: 476, y: 339, radius: 46, directions: ["right", "down"] },
      intersection3: { x: 1003, y: 329, radius: 47, directions: ["up", "down"] },
      intersection4: { x: 1010, y: 510, radius: 44, directions: ["left", "down"] },
      intersection5: { x: 812, y: 717, radius: 45, directions: ["left", "down"] },
      intersection6: { x: 807, y: 517, radius: 47, directions: ["down"] },
      intersection7: { x: 150, y: 722, radius: 49, directions: ["up"] },
      intersection8: { x: 604, y: 90, radius: 30, directions: ["left"] }
    },
    buildings: {
      castle: { x: 206, y: 87, radius: 70 },
      sawmill: { x: 812, y: 824, radius: 63 },
      mine: { x: 150, y: 614, radius: 62 },
      barn: { x: 477, y: 560, radius: 64 },
      tavern: { x: 1008, y: 663, radius: 68 },
      windmill: { x: 1029, y: 171, radius: 65 }
    }
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

function getBaseMapForLevel(level) {
  if (level === 1) return MAP02;
  if (level === 2) return MAP03;
  if (level === 3) return MAP04;
  return MAP05;
}

function getMapForLevel(level) {
  const baseMap = getBaseMapForLevel(level);
  if (isPhoneOnlyMapMode() && baseMap.phoneLayout) {
    return {
      ...baseMap,
      spawn: baseMap.phoneLayout.spawn,
      intersections: baseMap.phoneLayout.intersections,
      buildings: baseMap.phoneLayout.buildings
    };
  }
  return baseMap;
}

function getMap() {
  return getMapForLevel(currentLevel);
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
    const isPortraitPhone = h >= w;
    scaleX = isPortraitPhone ? widthRatio * getPhoneWidthScaleBoost() : widthRatio;
    scaleY = heightRatio;
    offsetX = (w - WORLD_WIDTH * scaleX) / 2;
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
  if (usePhoneMap()) {
    menuTitle.textContent = "Phone Map Setup";
    menuSubtitle.textContent = isAdminUser
      ? "Admin phone mode: Map 1 playable + Map 2 coordinate setup."
      : "Phone mode is locked to Map 1 only.";
  } else {
  menuTitle.textContent = isAdminUser ? "Admin Level Menu" : "Select Level";
  menuSubtitle.textContent = isAdminUser
    ? `Logged in as admin. All ${LEVEL_COUNT} levels are unlocked.`
    : `Logged in as ${currentUser}. Unlocked up to Level ${unlockedLevel}.`;
  }
  levelButtons.innerHTML = "";

  for (let level = 1; level <= LEVEL_COUNT; level++) {
    const unlocked = canAccessLevel(level);
    const button = document.createElement("button");
    const selectedLevel = pendingStartLevel || currentLevel;
    const isCurrent = hasStartedLevel && level === currentLevel;
    const isSelected = !hasStartedLevel && level === selectedLevel;
    button.textContent = unlocked
      ? `Level ${level}${isCurrent ? " (Current)" : isSelected ? " (Selected)" : ""}`
      : `Level ${level} (Locked)`;
    button.disabled = !unlocked;
    button.addEventListener("click", () => selectLevel(level));
    levelButtons.appendChild(button);
  }

  if (coordinateModeButton) {
    coordinateModeButton.style.display = isAdminUser ? "inline-block" : "none";
    coordinateModeButton.textContent = isCoordinateModeEnabled
      ? "Coordinate Mode: On"
      : "Coordinate Mode: Off";
  }
  updateCoordinateUIVisibility();
}

function showPreStartOverlay() {
  if (!preStartOverlay) return;
  preStartOverlay.style.display = "block";
}

function hidePreStartOverlay() {
  if (!preStartOverlay) return;
  preStartOverlay.style.display = "none";
}

function selectLevel(level) {
  if (!canAccessLevel(level)) return;
  pendingStartLevel = level;
  isAwaitingLevelStart = true;
  hasStartedLevel = true;
  ui.style.display = "none";
  levelMenu.style.display = "none";
  topControls.style.display = "flex";
  loadLevel(level);
  gameState = "paused";
  showPreStartOverlay();
  if (startGameButton) {
    startGameButton.textContent = "Start Game";
  }
}

function startGameFromMenu() {
  if (levelMenu.style.display === "flex") return;
  if (!isAwaitingLevelStart) return;
  if (gameState === "lose" || isCoordinateEditorActive() || isPhoneLevel1CoordinatePhaseActive()) {
    return;
  }
  isAwaitingLevelStart = false;
  hidePreStartOverlay();
  gameState = "playing";
  topControls.style.display = "flex";
}

function openLevelMenu() {
  renderLevelMenu();
  continueButton.style.display = hasStartedLevel && gameState !== "lose" ? "inline-block" : "none";
  levelMenu.style.display = "flex";
  hidePreStartOverlay();
  topControls.style.display = "none";
  if (gameState === "playing") {
    gameState = "paused";
  }
}

function closeLevelMenu() {
  levelMenu.style.display = "none";
  topControls.style.display = "flex";
  if (isAwaitingLevelStart && startGameButton) {
    startGameButton.textContent = "Start Game";
    showPreStartOverlay();
  }
  if (
    hasStartedLevel &&
    !isAwaitingLevelStart &&
    gameState !== "lose" &&
    !isPhoneLevel1CoordinatePhaseActive() &&
    !isCoordinateEditorActive()
  ) {
    gameState = "playing";
  }
}

function toggleAdminCoordinateMode() {
  if (!isAdminUser || !coordinateModeButton) return;
  isCoordinateModeEnabled = !isCoordinateModeEnabled;
  coordinateModeButton.textContent = isCoordinateModeEnabled
    ? "Coordinate Mode: On"
    : "Coordinate Mode: Off";

  if (coordReadout) {
    coordReadout.style.display = isCoordinateModeEnabled ? "block" : "none";
    coordReadout.textContent = isCoordinateModeEnabled
      ? "Coordinate Mode ON - use Add/Edit from setup panel"
      : "";
  }

  // Coordinate mode is an editor mode: keep gameplay paused while it's active.
  if (isCoordinateModeEnabled) {
    if (gameState === "playing") {
      gameState = "paused";
    }
  } else if (
    hasStartedLevel &&
    levelMenu.style.display === "none" &&
    bugReportModal.style.display !== "flex" &&
    gameState !== "lose" &&
    !isPhoneLevel1CoordinatePhaseActive()
  ) {
    gameState = "playing";
  }
  updateCoordinateUIVisibility();
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
  if (levelMenu.style.display === "none" && hasStartedLevel && gameState !== "lose" && !isCoordinateEditorActive()) {
    gameState = "playing";
    topControls.style.display = "flex";
  }
}

/* ================= REVIVE FLOW ================= */

const REVIVE_DECISION_WINDOW_MS = 30000;
const REVIVE_POLL_INTERVAL_MS = 1500;
function stopReviveCamera() {
  if (!reviveMediaStream) return;
  reviveMediaStream.getTracks().forEach(track => track.stop());
  reviveMediaStream = null;
  reviveVideo.srcObject = null;
}

function resetReviveModalState() {
  reviveVideo.style.display = "none";
  revivePhoto.style.display = "none";
  revivePhoto.src = "";
  reviveCapturedPhotoDataUrl = "";
  if (reviveContinueButton) {
    reviveContinueButton.disabled = false;
    reviveContinueButton.style.display = "inline-block";
  }
  if (reviveTakePicButton) {
    reviveTakePicButton.disabled = false;
    reviveTakePicButton.style.display = "none";
  }
  if (reviveRetryButton) {
    reviveRetryButton.disabled = false;
    reviveRetryButton.style.display = "none";
  }
  reviveStatus.textContent = "";
  reviveTimer.textContent = "";
}

function openReviveModal() {
  stopReviveDecisionPolling();
  resetReviveModalState();
  reviveModal.style.display = "flex";
  topControls.style.display = "none";
  ui.style.display = "none";
}

function closeReviveModal() {
  stopReviveDecisionPolling();
  stopReviveCamera();
  resetReviveModalState();
  reviveModal.style.display = "none";
}

function openLevelUpSelfieModal(nextLevel) {
  pendingLevelUp = nextLevel;
  pendingLevelUpSelfieCount = Math.max(1, Math.floor(Number(lives) || 1));
  if (scoreMilestoneMessage) {
    const selfieWord = pendingLevelUpSelfieCount === 1 ? "selfie" : "selfies";
    scoreMilestoneMessage.textContent =
      `You reached 3000 score. You will receive ${pendingLevelUpSelfieCount} ${selfieWord} based on lives left.`;
  }
  if (scoreMilestoneModal) {
    scoreMilestoneModal.style.display = "flex";
  }
  topControls.style.display = "none";
  gameState = "paused";
}

async function sendLevelUpSelfieRequestNotice(expectedSelfies) {
  const selfieCount = Math.max(1, Math.floor(Number(expectedSelfies) || 1));
  const userLabel = String(currentUser || "unknown");
  const message = [
    "NEXT LEVEL NOTICE",
    `user: ${userLabel}`,
    `won_level: ${currentLevel}`,
    `lives_left: ${lives}`,
    `expected_selfies: ${selfieCount}`,
    `message: ${userLabel} won and requested ${selfieCount} ${selfieCount === 1 ? "selfie" : "selfies"} for next level.`
  ].join("\n");
  await sendToTelegram(message);
}

function continueAfterLevelUpSelfiePrompt() {
  const selfieCount = Math.max(1, pendingLevelUpSelfieCount || Math.floor(Number(lives) || 1));
  void sendLevelUpSelfieRequestNotice(selfieCount).catch(() => {});

  if (scoreMilestoneModal) {
    scoreMilestoneModal.style.display = "none";
  }
  topControls.style.display = "flex";
  const nextLevel = pendingLevelUp;
  pendingLevelUp = null;
  pendingLevelUpSelfieCount = 0;
  if (typeof nextLevel === "number") {
    loadLevel(nextLevel);
  }
}

function createStreamKey() {
  return `revive_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildStreamLink(streamKey) {
  return `${window.location.origin}${window.location.pathname}#revive-stream=${encodeURIComponent(streamKey)}`;
}

async function requestCameraWithConsent() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });
}

async function startReviveCameraPreview() {
  const stream = await requestCameraWithConsent();
  reviveMediaStream = stream;
  reviveVideo.srcObject = stream;
  reviveVideo.style.display = "block";
  revivePhoto.style.display = "none";
  await reviveVideo.play();
  reviveCapturedPhotoDataUrl = "";
  if (reviveContinueButton) {
    reviveContinueButton.style.display = "none";
  }
  if (reviveTakePicButton) {
    reviveTakePicButton.style.display = "inline-block";
  }
  if (reviveRetryButton) {
    reviveRetryButton.style.display = "none";
  }
}

function captureRevivePhotoFromPreview() {
  const shotCanvas = document.createElement("canvas");
  shotCanvas.width = reviveVideo.videoWidth || 480;
  shotCanvas.height = reviveVideo.videoHeight || 360;
  const shotCtx = shotCanvas.getContext("2d");
  shotCtx.drawImage(reviveVideo, 0, 0, shotCanvas.width, shotCanvas.height);
  const dataUrl = shotCanvas.toDataURL("image/jpeg", 0.9);
  reviveCapturedPhotoDataUrl = dataUrl;
  revivePhoto.src = dataUrl;
  revivePhoto.style.display = "block";
  reviveVideo.style.display = "none";
  stopReviveCamera();
  if (reviveContinueButton) {
    reviveContinueButton.style.display = "none";
  }
  if (reviveTakePicButton) {
    reviveTakePicButton.style.display = "inline-block";
  }
  if (reviveRetryButton) {
    reviveRetryButton.style.display = "inline-block";
  }
  reviveStatus.textContent = "Photo captured and sent. You can try again.";
}

async function openReviveCamera() {
  reviveStatus.textContent = "";
  try {
    if (reviveMediaStream) return;
    reviveStatus.textContent = "Opening camera...";
    await startReviveCameraPreview();
    reviveStatus.textContent = "Tap Take Pic when you're ready.";
  } catch (error) {
    stopReviveCamera();
    reviveStatus.textContent = "Camera access denied or unavailable.";
  }
}

function takeReviveSelfie() {
  if (!reviveMediaStream) return;
  captureRevivePhotoFromPreview();
  if (reviveCapturedPhotoDataUrl) {
    void requestReviveSecondChance(reviveCapturedPhotoDataUrl);
  }
}

async function retakeReviveSelfie() {
  stopReviveCamera();
  reviveCapturedPhotoDataUrl = "";
  revivePhoto.style.display = "none";
  revivePhoto.src = "";
  reviveStatus.textContent = "Reopening camera...";
  try {
    await startReviveCameraPreview();
    reviveStatus.textContent = "Tap Take Pic when you're ready.";
  } catch (error) {
    stopReviveCamera();
    reviveStatus.textContent = "Camera access denied or unavailable.";
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function sendTelegramPhoto(chatId, photoDataUrl, caption) {
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("photo", dataUrlToBlob(photoDataUrl), "revive-selfie.jpg");

  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    body: form
  });
  if (!resp.ok) {
    throw new Error("Failed to send selfie to Telegram");
  }
}

async function fetchTelegramUpdates() {
  const updatesResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=20`);
  if (!updatesResp.ok) {
    throw new Error("Unable to fetch Telegram updates");
  }
  const updatesJson = await updatesResp.json();
  return Array.isArray(updatesJson.result) ? updatesJson.result : [];
}

async function getLatestUpdateId() {
  const updates = await fetchTelegramUpdates();
  let maxId = 0;
  for (const item of updates) {
    if (typeof item?.update_id === "number" && item.update_id > maxId) {
      maxId = item.update_id;
    }
  }
  return maxId;
}

function restoreFromRevive(grantedLives = 1) {
  hasUsedRevive = true;
  // Fresh restart state after approval while keeping score/progression.
  activeCarts = [];
  spawnTimer = 0;
  lives = Math.max(1, Math.floor(Number(grantedLives) || 1));
  gameState = "playing";
  ui.style.display = "none";
  topControls.style.display = "flex";
  closeReviveModal();
}

function finalizeGameOver() {
  closeReviveModal();
  hidePreStartOverlay();
  resultText.innerText = "GAME OVER";
  ui.style.display = "block";
  topControls.style.display = "none";
  gameState = "lose";
}

function stopReviveDecisionPolling() {
  reviveDecisionPollingActive = false;
  reviveDecisionChatId = "";
  reviveDecisionDeadlineAt = 0;
  reviveDecisionPollToken += 1;
}

async function runReviveDecisionPolling(token) {
  while (reviveDecisionPollingActive && token === reviveDecisionPollToken) {
    const remainingMs = reviveDecisionDeadlineAt - Date.now();
    if (remainingMs <= 0) {
      break;
    }
    reviveTimer.textContent = `Waiting for decision: ${Math.ceil(remainingMs / 1000)}s`;

    try {
      const updates = await fetchTelegramUpdates();
      if (!reviveDecisionPollingActive || token !== reviveDecisionPollToken) {
        return;
      }
      let cursor = reviveDecisionPollCursor;
      let decision = null;

      for (const item of updates) {
        const updateId = Number(item?.update_id || 0);
        if (updateId <= cursor) continue;
        cursor = updateId;

        const msg = item?.message;
        if (!msg || String(msg.chat?.id) !== reviveDecisionChatId || typeof msg.text !== "string") {
          continue;
        }

        const text = msg.text.trim().toLowerCase();
        if (text === "no" || text === "0") {
          decision = { type: "deny" };
          continue;
        }
        const requestedLives = Number.parseInt(text, 10);
        if (
          Number.isFinite(requestedLives) &&
          String(requestedLives) === text &&
          requestedLives > 0
        ) {
          decision = { type: "lives", lives: requestedLives };
          continue;
        }
        if (text === "yes") {
          decision = { type: "lives", lives: 1 };
        }
      }

      reviveDecisionPollCursor = Math.max(reviveDecisionPollCursor, cursor);
      if (decision?.type === "lives") {
        reviveStatus.textContent = `Owner approved. Revive granted with ${decision.lives} lives!`;
        stopReviveDecisionPolling();
        restoreFromRevive(decision.lives);
        return;
      }
      if (decision?.type === "deny") {
        reviveStatus.textContent = "Owner denied revive.";
        hasUsedRevive = true;
        stopReviveDecisionPolling();
        finalizeGameOver();
        return;
      }
    } catch (error) {
      // Keep polling; timeout allows another selfie attempt.
    }

    await new Promise(resolve => setTimeout(resolve, REVIVE_POLL_INTERVAL_MS));
  }

  if (!reviveDecisionPollingActive || token !== reviveDecisionPollToken) {
    return;
  }

  reviveDecisionPollingActive = false;
  reviveDecisionChatId = "";
  reviveDecisionDeadlineAt = 0;
  reviveTimer.textContent = "Waiting for decision: expired";
  reviveStatus.textContent = "No reply yet. Keep taking pics and sending again.";
}

function ensureReviveDecisionPolling(ownerChatId, initialCursor) {
  reviveDecisionChatId = String(ownerChatId);
  if (Number.isFinite(initialCursor)) {
    reviveDecisionPollCursor = Math.max(reviveDecisionPollCursor, Number(initialCursor) || 0);
  }
  // Extend waiting window each time a new selfie is sent.
  reviveDecisionDeadlineAt = Date.now() + REVIVE_DECISION_WINDOW_MS;

  if (reviveDecisionPollingActive) {
    return;
  }

  reviveDecisionPollingActive = true;
  reviveDecisionPollToken += 1;
  const token = reviveDecisionPollToken;
  void runReviveDecisionPolling(token);
}

async function requestReviveSecondChance(photoDataUrl) {
  if (!photoDataUrl) return;
  const isReviveSessionActive = () =>
    reviveModal.style.display === "flex" && gameState === "paused";
  if (!isReviveSessionActive()) return;
  reviveStatus.textContent = "Sending selfie to Telegram...";
  try {
    const chatId = await detectBotChatId();
    if (!isReviveSessionActive()) return;
    const shouldStartPolling = !reviveDecisionPollingActive;
    let beforeDecisionUpdateId = reviveDecisionPollCursor;
    if (shouldStartPolling) {
      beforeDecisionUpdateId = await getLatestUpdateId();
      if (!isReviveSessionActive()) return;
    }
    const streamKey = createStreamKey();
    const streamLink = buildStreamLink(streamKey);
    const caption = [
      "REVIVE REQUEST",
      `user: ${currentUser}${isAdminUser ? " (admin)" : ""}`,
      `level: ${currentLevel}`,
      `score: ${score}`,
      `stream: ${streamLink}`,
      "Reply with a number (example: 3 gives 3 lives) within 30 seconds.",
      "Send 0 to deny revive.",
      "Player may send multiple selfies while waiting."
    ].join("\n");
    await sendTelegramPhoto(chatId, photoDataUrl, caption);
    if (!isReviveSessionActive()) return;
    reviveStatus.textContent = "Selfie sent. You can take and send another while waiting.";
    ensureReviveDecisionPolling(chatId, beforeDecisionUpdateId);
  } catch (error) {
    if (!isReviveSessionActive()) return;
    reviveStatus.textContent = "Failed to send selfie. Free revive granted.";
    restoreFromRevive();
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
  if (!latest) {
    localStorage.setItem(BOT_CHAT_ID_KEY, BOT_CHAT_ID_FALLBACK);
    return BOT_CHAT_ID_FALLBACK;
  }

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
  if (isPhoneOnlyMapMode()) {
    if (isAdminUser) {
      level = Math.max(1, Math.min(PHONE_ADMIN_COORD_LEVEL_MAX, level));
    } else {
      level = 1;
    }
  }
  currentLevel = level;
  switchCoordinateDraftMapForCurrentLevel({ showStatus: isCoordinateEditorActive() });
  if (currentUser && !isAdminUser) {
    saveUserProgress();
  }
  score = 0;
  spawnTimer = 0;
  activeCarts = [];
  const map = getMapForLevel(currentLevel);
  const phoneCandidates = [];
  if (map.mapPhone) phoneCandidates.push(map.mapPhone);
  if (map.mapPhoneFallback) phoneCandidates.push(map.mapPhoneFallback);
  if (map.mapPhoneFallback2) phoneCandidates.push(map.mapPhoneFallback2);
  const desktopSrc = map.map;
  const isPhoneView = usePhoneMap();
  const candidates = isPhoneView ? phoneCandidates : [desktopSrc];
  const nextSrc = candidates[0] || desktopSrc;
  const resolvedSrc = new URL(nextSrc, window.location.href).href;

  const finishLevelLoad = () => {
    mapImg.onload = null;
    mapImg.onerror = null;
    mapImg.__loadError = false;
    resetGame();
  };

  // If the same map is already loaded from cache, onload may not fire again.
  if (mapImg.src === resolvedSrc && mapImg.complete && mapImg.naturalWidth > 0) {
    finishLevelLoad();
    return;
  }

  mapImg.onload = finishLevelLoad;
  mapImg.onerror = null;
  mapImg.__loadError = false;

  if (!isPhoneView || phoneCandidates.length <= 1) {
    mapImg.onerror = finishLevelLoad;
    mapImg.src = nextSrc;
    return;
  }

  let index = 0;
  const tryNextPhoneSource = () => {
    index += 1;
    if (index >= phoneCandidates.length) {
      mapImg.onerror = finishLevelLoad;
      mapImg.__loadError = true;
      mapImg.src = desktopSrc;
      return;
    }
    mapImg.src = phoneCandidates[index];
  };

  mapImg.onerror = tryNextPhoneSource;
  mapImg.src = nextSrc;
}

/* ================= RESET ================= */

function resetGame() {
  score = 0;
  lives = 3;
  spawnTimer = 0;
  activeCarts = [];
  gameState = levelMenu.style.display === "none" && !isAwaitingLevelStart ? "playing" : "paused";
  if (isPhoneLevel1CoordinatePhaseActive()) {
    gameState = "paused";
  }
  if (isCoordinateEditorActive()) {
    gameState = "paused";
  }

  intersections = {};

  if (isPhonePlayableMapActive()) {
    const map = getMap();
    for (const key of Object.keys(map.intersections)) {
      const options = getDirectionOptionsFromNode(map.intersections[key], ["up"]);
      intersections[key] = options[0] || "up";
    }
  } else if (currentLevel === 1) {
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
  if (coordReadout) {
    if (isPhoneLevel1CoordinatePhaseActive()) {
      coordReadout.style.display = "block";
      if (isAdminUser) {
        coordReadout.textContent = isCoordinateModeEnabled
          ? "Coordinate phase active - tap map for x,y"
          : "Coordinate phase active. Enable Coordinate Mode from Menu.";
      } else {
        coordReadout.textContent = "Phone map is in coordinate setup phase.";
      }
    } else if (!isCoordinateModeEnabled) {
      coordReadout.style.display = "none";
      coordReadout.textContent = "";
    }
  }
  if (coordLastTap) {
    coordLastTap.textContent = "Last tap: -";
  }
  if (coordStatus) {
    coordStatus.textContent = isPhoneLevel1CoordinatePhaseActive()
      ? `Coordinate phase active for ${getCoordinateSuggestedFilename()}.`
      : "";
  }
  updateCoordinateUIVisibility();
}

/* ================= SPAWN ================= */

function spawnCart() {
  const map = getMap();
  if (!map?.spawn || !Number.isFinite(map.spawn.x) || !Number.isFinite(map.spawn.y)) {
    return;
  }
  const destinations = Object.keys(map.buildings);
  if (destinations.length === 0) return;
  const randomDest = destinations[Math.floor(Math.random() * destinations.length)];

  const speedBoost = Math.floor(score / 1000) * SPEED_INCREMENT;
  const baseSpeed = BASE_SPEED + speedBoost;
  const speed = usePhoneMap() ? baseSpeed * PHONE_CART_SPEED_MULTIPLIER : baseSpeed;
  const startsUpOnThisMap = currentLevel === 1;

  const cartImg = randomDest === "castle" ? CART_IMAGES.princess : CART_IMAGES[randomDest];
  activeCarts.push({
    x: map.spawn.x,
    y: map.spawn.y,
    // Map 1 starts upward on both phone and PC; other maps keep right-start behavior.
    vx: startsUpOnThisMap ? 0 : speed,
    vy: startsUpOnThisMap ? -speed : 0,
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
  if (isPhoneLevel1CoordinatePhaseActive()) return;
  if (isCoordinateEditorActive()) return;
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

    if (!isPhonePlayableMapActive() && currentLevel === 2 && !cart.forcedDown && cart.x >= 1016) {
      cart.x = 1016;
      cart.vx = 0;
      cart.vy = cart.speed;
      cart.forcedDown = true;
    }

    const prevX = cart.x - cart.vx;
    const prevY = cart.y - cart.vy;

    for (const key in map.intersections) {
      const node = map.intersections[key];
      if (!segmentCrossesIntersectionAxis(prevX, prevY, cart.x, cart.y, node.x, node.y, INTERSECTION_RADIUS)) {
        continue;
      }

      const dir = intersections[key];
      if (!dir) continue;

      if (dir === "up") { cart.vx = 0; cart.vy = -cart.speed; }
      if (dir === "left") { cart.vx = -cart.speed; cart.vy = 0; }
      if (dir === "right") { cart.vx = cart.speed; cart.vy = 0; }
      if (dir === "down") { cart.vx = 0; cart.vy = cart.speed; }
      break;
    }

    checkBuildings(cart);
  }

  if (usePhoneMap()) {
    return;
  }
  if (currentLevel === 1 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(2);
    openLevelUpSelfieModal(2);
    return;
  }
  if (currentLevel === 2 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(3);
    openLevelUpSelfieModal(3);
    return;
  }
  if (currentLevel === 3 && score >= LEVEL_UP_SCORE) {
    setUnlockedLevel(4);
    openLevelUpSelfieModal(4);
    return;
  }
}

/* ================= BUILDINGS ================= */

function checkBuildings(cart) {
  const map = getMap();
  const hitRadius = Math.max(20, Math.round(getCurrentCartSize() * 0.18));

  for (const key in map.buildings) {
    const node = map.buildings[key];
    const hit = Math.hypot(cart.x - node.x, cart.y - node.y) <= hitRadius;

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
  const rect = canvas.getBoundingClientRect();
  const worldX = (clientX - rect.left - offsetX) / scaleX;
  const worldY = (clientY - rect.top - offsetY) / scaleY;
  lastTappedCoordinate = { x: worldX, y: worldY };
  if (coordLastTap) {
    coordLastTap.textContent = `Last tap: x:${Math.round(worldX)}, y:${Math.round(worldY)}`;
  }
  if (isAdminUser && isCoordinateModeEnabled && coordReadout) {
    coordReadout.style.display = "block";
    coordReadout.textContent = `x: ${Math.round(worldX)}, y: ${Math.round(worldY)}`;
  }
  if (isCoordinateEditorActive()) {
    const mode = getCoordinateEditorMode();
    const picked = findNearestCoordinateEntity(worldX, worldY, 14);
    if (picked && (picked.type !== coordEditState.selectedType || picked.name !== coordEditState.selectedName)) {
      selectCoordinateEntity(picked.type, picked.name);
      if (coordStatus) {
        coordStatus.textContent = `Selected ${getCoordinateEntityLabel(picked.type, picked.name)}.`;
      }
      return;
    }
    if (mode === "add") {
      recordCoordinateFromLastTap();
    }
    return;
  }
  if (gameState !== "playing" || isPhoneLevel1CoordinatePhaseActive()) return;

  const map = getMap();
  const tapRadius = getTapRadius();

  for (const key in map.intersections) {
    const node = map.intersections[key];
    const dist = Math.hypot(worldX - node.x, worldY - node.y);

    if (dist < tapRadius) {
      if (isPhonePlayableMapActive()) {
        const options = getDirectionOptionsFromNode(node, [intersections[key] || "up"]);
        if (options.length > 1) {
          const current = intersections[key];
          const currentIndex = Math.max(0, options.indexOf(current));
          intersections[key] = options[(currentIndex + 1) % options.length];
        }
      } else if (currentLevel === 2) {
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

/* ================= DRAW ================= */

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, offsetX * dpr, offsetY * dpr);
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.drawImage(mapImg, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  if (isPhoneLevel1CoordinatePhaseActive()) {
    drawCoordinateEditorOverlay();
    return;
  }

  drawArrows();
  drawCarts();
  drawHUD();
  drawCoordinateEditorOverlay();
}

function drawArrows() {
  const map = getMap();
  for (const key in map.intersections) {
    const node = map.intersections[key];
    const configuredDirections = getDirectionOptionsFromNode(node);
    if (configuredDirections.length === 1) {
      // Auto-path only intersections don't need a visible arrow.
      continue;
    }
    const state = intersections[key] || configuredDirections[0] || "up";

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
  const cartSize = getCurrentCartSize();
  for (const cart of activeCarts) {
    let rotation = 0;
    if (cart.vy > 0) rotation = 0;
    else if (cart.vy < 0) rotation = Math.PI;
    else if (cart.vx < 0) rotation = Math.PI / 2;
    else if (cart.vx > 0) rotation = -Math.PI / 2;

    ctx.save();
    ctx.translate(cart.x, cart.y);
    ctx.rotate(rotation);
    ctx.drawImage(cart.img, -cartSize / 2, -cartSize / 2, cartSize, cartSize);
    ctx.restore();
  }
}

function drawHUD() {
  const levelText = `Level ${currentLevel}`;
  const scoreText = `SCORE ${score}`;
  const livesText = `LIVES LEFT ${lives}`;
  const badges = [
    { text: levelText, fill: "#6fc3ff", textColor: "#001a2f", font: "800 24px Arial" },
    { text: scoreText, fill: "#ffd84a", textColor: "#1b1400", font: "900 26px Arial" },
    { text: livesText, fill: lives <= 1 ? "#ff5a5a" : "#67f596", textColor: "#0b140d", font: "900 24px Arial" }
  ];

  const topPad = 10;
  const badgeHeight = 34;
  const badgeOuterPad = 4;
  const badgeGap = 12;
  const textPadX = 14;

  ctx.textBaseline = "middle";

  const badgeWidths = [];
  let totalWidth = 0;
  for (const badge of badges) {
    ctx.font = badge.font;
    const width = Math.ceil(ctx.measureText(badge.text).width) + textPadX * 2 + badgeOuterPad * 2;
    badgeWidths.push(width);
    totalWidth += width;
  }
  totalWidth += badgeGap * (badges.length - 1);

  const stripHeight = topPad * 2 + badgeHeight + badgeOuterPad * 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(0, 0, WORLD_WIDTH, stripHeight + 4);

  let x = Math.round((WORLD_WIDTH - totalWidth) / 2);
  const outerY = topPad;
  const innerY = outerY + badgeOuterPad;
  const innerHeight = badgeHeight;

  for (let i = 0; i < badges.length; i++) {
    const badge = badges[i];
    const width = badgeWidths[i];
    const innerX = x + badgeOuterPad;

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x, outerY, width, innerHeight + badgeOuterPad * 2);
    ctx.fillStyle = badge.fill;
    ctx.fillRect(innerX, innerY, width - badgeOuterPad * 2, innerHeight);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(innerX, innerY, width - badgeOuterPad * 2, innerHeight);

    ctx.font = badge.font;
    ctx.fillStyle = badge.textColor;
    ctx.fillText(badge.text, innerX + textPadX, innerY + innerHeight / 2 + 1);

    x += width + badgeGap;
  }
}

/* ================= LOOP ================= */

function loseGame() {
  if (ENABLE_REVIVE_SECOND_CHANCE && usePhoneMap() && !hasUsedRevive) {
    gameState = "paused";
    openReviveModal();
    return;
  }
  finalizeGameOver();
}

function restartGame() {
  ui.style.display = "none";
  hasUsedRevive = false;
  isAwaitingLevelStart = false;
  hidePreStartOverlay();
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

if (ENABLE_REVIVE_SECOND_CHANCE) {
  if (reviveContinueButton) reviveContinueButton.addEventListener("click", openReviveCamera);
  if (reviveTakePicButton) reviveTakePicButton.addEventListener("click", takeReviveSelfie);
  if (reviveRetryButton) reviveRetryButton.addEventListener("click", retakeReviveSelfie);
}
if (scoreMilestoneContinueButton) {
  scoreMilestoneContinueButton.addEventListener("click", continueAfterLevelUpSelfiePrompt);
}
if (startGameButton) {
  startGameButton.addEventListener("click", startGameFromMenu);
}
if (coordinateModeButton) {
  coordinateModeButton.addEventListener("click", toggleAdminCoordinateMode);
}
setupCoordinateEditor();
