/* ================= CANVAS ================= */

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

/* ================= HELPERS ================= */

function isPhone() {
  return window.matchMedia("(max-width:768px)").matches;
}

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

function unlockAudio() {
  Object.values(sounds).forEach(s => {
    s.play().then(() => {
      s.pause();
      s.currentTime = 0;
    }).catch(() => {});
  });
}

canvas.addEventListener("click", unlockAudio, { once:true });
canvas.addEventListener("touchend", unlockAudio, { once:true });

/* ================= MAPS ================= */

const MAP02 = {
  map: "map02.png",
  mapPhone: "map02_phone.png",
  spawn: { x:599, y:846 },
  intersections: {
    intersection1:{ x:604, y:567 },
    intersection2:{ x:600, y:330 }
  },
  buildings:{
    sawmill:{ x:598,y:218 },
    mine:{ x:351,y:320 },
    barn:{ x:783,y:320 },
    tavern:{ x:384,y:571 },
    windmill:{ x:833,y:564 }
  }
};

const MAP03 = {
  map:"map03.png",
  mapPhone:"map03_phone.png",
  spawn:{ x:322,y:879 },
  intersections:{
    intersection1:{ x:322,y:560 },
    intersection2:{ x:324,y:345 },
    intersection3:{ x:741,y:344 },
    intersection4:{ x:1020,y:622 }
  },
  buildings:{
    sawmill:{ x:531,y:560 },
    barn:{ x:174,y:338 },
    mine:{ x:749,y:224 },
    tavern:{ x:867,y:627 },
    windmill:{ x:1029,y:758 }
  }
};

const MAP04 = {
  map:"map04.png",
  mapPhone:"map04_phone.png",
  spawn:{ x:12,y:483 },
  intersections:{
    intersection1:{ x:335,y:483 },
    intersection2:{ x:335,y:250 },
    intersection3:{ x:678,y:250 },
    intersection4:{ x:339,y:610 },
    intersection5:{ x:501,y:609 }
  },
  buildings:{
    mine:{ x:228,y:251 },
    castle:{ x:748,y:250 },
    barn:{ x:679,y:435 },
    tavern:{ x:333,y:711 },
    windmill:{ x:666,y:610 },
    sawmill:{ x:497,y:421 }
  }
};

function getMap(){
  if(currentLevel===1) return MAP02;
  if(currentLevel===2) return MAP03;
  return MAP04;
}

/* ================= STATE ================= */

let currentLevel=1;
let mapImg=new Image();
let intersections={};
let activeCarts=[];
let score=0;
let lives=3;
let spawnTimer=0;
let gameState="playing";

/* ================= RESPONSIVE ================= */

let scaleX=1, scaleY=1, offsetX=0, offsetY=0;

function resize(){
  canvas.width=window.innerWidth;
  canvas.height=window.innerHeight;

  const widthRatio=canvas.width/WORLD_WIDTH;
  const heightRatio=canvas.height/WORLD_HEIGHT;

  if(isPhone()){
    scaleX=widthRatio;
    scaleY=heightRatio;
    offsetX=0;
    offsetY=0;
  }else{
    const base=Math.min(widthRatio,heightRatio);
    scaleX=base;
    scaleY=base;
    offsetX=(canvas.width-WORLD_WIDTH*scaleX)/2;
    offsetY=(canvas.height-WORLD_HEIGHT*scaleY)/2;
  }
}
window.addEventListener("resize",resize);
resize();

/* ================= LEVEL LOAD ================= */

function loadLevel(level){
  currentLevel=level;
  const map=getMap();
  mapImg.src=isPhone()&&map.mapPhone?map.mapPhone:map.map;
  mapImg.onload=resetGame;
}

/* ================= RESET ================= */

function resetGame(){
  score=0;
  lives=3;
  spawnTimer=0;
  activeCarts=[];
  gameState="playing";
  intersections={};

  if(currentLevel===1){
    intersections.intersection1="up";
    intersections.intersection2="up";
  }
  else if(currentLevel===2){
    intersections.intersection1="up";
    intersections.intersection2="left";
    intersections.intersection3="up";
    intersections.intersection4="left";
  }
  else{
    intersections.intersection1="up";
    intersections.intersection2="left";
    intersections.intersection3="right";
    intersections.intersection4="down";
    intersections.intersection5="up";
  }

  ui.style.display="none";
}

/* ================= SPAWN ================= */

function spawnCart(){
  const map=getMap();
  const keys=Object.keys(map.buildings);
  const random=keys[Math.floor(Math.random()*keys.length)];
  const speed=BASE_SPEED+Math.floor(score/1000)*SPEED_INCREMENT;

  activeCarts.push({
    x:map.spawn.x,
    y:map.spawn.y,
    vx:currentLevel===3?speed:0,
    vy:currentLevel===3?0:-speed,
    speed:speed,
    destination:random,
    img:random==="castle"?CART_IMAGES.princess:CART_IMAGES[random]
  });

  sounds.spawn.currentTime=0;
  sounds.spawn.play();
}

/* ================= UPDATE ================= */

function update(){
  if(gameState!=="playing") return;

  spawnTimer++;
  if(spawnTimer>=SPAWN_DELAY){
    spawnTimer=0;
    spawnCart();
  }

  const map=getMap();

  for(let cart of activeCarts){

    cart.x+=cart.vx;
    cart.y+=cart.vy;

    if(currentLevel===2 && cart.x>=1016){
      cart.x=1016;
      cart.vx=0;
      cart.vy=cart.speed;
    }

    for(let key in map.intersections){
      const node=map.intersections[key];
      if(Math.hypot(cart.x-node.x,cart.y-node.y)<12 && !cart[key]){
        const dir=intersections[key];
        if(dir==="up"){cart.vx=0;cart.vy=-cart.speed;}
        if(dir==="down"){cart.vx=0;cart.vy=cart.speed;}
        if(dir==="left"){cart.vx=-cart.speed;cart.vy=0;}
        if(dir==="right"){cart.vx=cart.speed;cart.vy=0;}
        cart[key]=true;
      }
    }

    checkBuildings(cart);
  }

  if(currentLevel===1 && score>=100) loadLevel(2);
  if(currentLevel===2 && score>=100) loadLevel(3);
}

/* ================= BUILDINGS ================= */

function checkBuildings(cart){
  const map=getMap();
  for(let key in map.buildings){
    const node=map.buildings[key];
    if(Math.hypot(cart.x-node.x,cart.y-node.y)<20){
      activeCarts=activeCarts.filter(c=>c!==cart);
      if(key===cart.destination){
        score+=100;
        sounds[key]?.play();
      }else{
        lives--;
        sounds.wrong.play();
        if(lives<=0) loseGame();
      }
    }
  }
}

/* ================= INPUT ================= */

function handleTap(clientX,clientY){
  if(gameState!=="playing") return;

  const rect=canvas.getBoundingClientRect();
  const worldX=(clientX-rect.left-offsetX)/scaleX;
  const worldY=(clientY-rect.top-offsetY)/scaleY;

  const map=getMap();

  for(let key in map.intersections){
    const node=map.intersections[key];
    if(Math.hypot(worldX-node.x,worldY-node.y)<TAP_RADIUS){

      if(currentLevel===3){
        if(key==="intersection1") intersections[key]=intersections[key]==="up"?"down":"up";
        if(key==="intersection2") intersections[key]=intersections[key]==="left"?"right":"left";
        if(key==="intersection3") intersections[key]=intersections[key]==="right"?"down":"right";
        if(key==="intersection4") intersections[key]=intersections[key]==="down"?"right":"down";
        if(key==="intersection5") intersections[key]=intersections[key]==="up"?"right":"up";
      }
      else if(currentLevel===2){
        if(key==="intersection1") intersections[key]=intersections[key]==="up"?"right":"up";
        if(key==="intersection2") intersections[key]=intersections[key]==="left"?"right":"left";
        if(key==="intersection3") intersections[key]=intersections[key]==="up"?"right":"up";
        if(key==="intersection4") intersections[key]=intersections[key]==="left"?"down":"left";
      }
      else{
        intersections[key]=intersections[key]==="up"?"left":
                           intersections[key]==="left"?"right":"up";
      }
    }
  }
}

canvas.addEventListener("click",e=>handleTap(e.clientX,e.clientY));
canvas.addEventListener("touchend",e=>{
  const t=e.changedTouches[0];
  if(t) handleTap(t.clientX,t.clientY);
});

/* ================= DRAW ================= */

function draw(){
  ctx.setTransform(scaleX,0,0,scaleY,offsetX,offsetY);
  ctx.clearRect(0,0,WORLD_WIDTH,WORLD_HEIGHT);
  ctx.drawImage(mapImg,0,0,WORLD_WIDTH,WORLD_HEIGHT);

  const map=getMap();

  for(let key in map.intersections){
    const node=map.intersections[key];
    const state=intersections[key];
    let img=arrowUpImg,rot=0;
    if(state==="left") img=arrowLeftImg;
    if(state==="right") img=arrowRightImg;
    if(state==="down"){ img=arrowUpImg; rot=Math.PI; }
    ctx.save();
    ctx.translate(node.x,node.y);
    ctx.rotate(rot);
    ctx.drawImage(img,-ARROW_SIZE/2,-ARROW_SIZE/2,ARROW_SIZE,ARROW_SIZE);
    ctx.restore();
  }

  for(let cart of activeCarts){
    let rot=0;
    if(cart.vy<0) rot=Math.PI;
    else if(cart.vx<0) rot=Math.PI/2;
    else if(cart.vx>0) rot=-Math.PI/2;
    ctx.save();
    ctx.translate(cart.x,cart.y);
    ctx.rotate(rot);
    ctx.drawImage(cart.img,-CART_SIZE/2,-CART_SIZE/2,CART_SIZE,CART_SIZE);
    ctx.restore();
  }

  ctx.fillStyle="white";
  ctx.font="28px Arial";
  ctx.fillText("Level: "+currentLevel,20,40);
  ctx.fillText("Score: "+score,20,75);
  ctx.fillText("Lives: "+lives,20,110);
}

/* ================= LOOP ================= */

function loseGame(){
  gameState="lose";
  resultText.innerText="GAME OVER";
  ui.style.display="block";
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}

loadLevel(1);
requestAnimationFrame(loop);
