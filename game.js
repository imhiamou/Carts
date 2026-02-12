const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 700;

const ROAD_WIDTH = 128;
const INTERSECTION_SIZE = 128;

const sprite = new Image();
sprite.src = "sprites.png";

let intersection = { turnUp:false };

let cart = {
  x:150,
  y:WORLD_HEIGHT/2,
  speed:3,
  vx:3,
  vy:0,
  rotation:0
};

let gameState = "playing";

function getScale(){
  return Math.min(canvas.width/WORLD_WIDTH, canvas.height/WORLD_HEIGHT);
}

function getLayout(){
  return {
    horizontalY: WORLD_HEIGHT/2 - ROAD_WIDTH/2,
    verticalX: WORLD_WIDTH/2 - ROAD_WIDTH/2
  };
}

function drawGrass(){
  for(let x=0;x<WORLD_WIDTH;x+=128){
    for(let y=0;y<WORLD_HEIGHT;y+=128){
      ctx.drawImage(sprite,0,0,128,128,x,y,128,128);
    }
  }
}

function drawRoad(layout){
  for(let x=0;x<WORLD_WIDTH;x+=128){
    ctx.drawImage(sprite,128,0,128,128,x,layout.horizontalY,128,128);
  }
  for(let y=0;y<layout.horizontalY+ROAD_WIDTH;y+=128){
    ctx.drawImage(sprite,128,0,128,128,layout.verticalX,y,128,128);
  }
}

function drawBarn(layout){
  ctx.drawImage(sprite,384,0,128,128,
    layout.verticalX,
    50,
    256,
    256);
}

function drawCart(){
  ctx.save();
  ctx.translate(cart.x, cart.y);
  ctx.rotate(cart.rotation);
  ctx.drawImage(sprite,256,0,128,128,-64,-64,128,128);
  ctx.restore();
}

function updateCart(layout){
  if(gameState!=="playing") return;

  const ix = layout.verticalX;
  const iy = layout.horizontalY;

  const inside =
    cart.x > ix &&
    cart.x < ix + INTERSECTION_SIZE &&
    cart.y > iy &&
    cart.y < iy + INTERSECTION_SIZE;

  if(inside){
    if(intersection.turnUp){
      cart.vx=0;
      cart.vy=-cart.speed;
    }else{
      cart.vx=cart.speed;
      cart.vy=0;
    }
  }

  cart.x+=cart.vx;
  cart.y+=cart.vy;

  let targetRotation = cart.vx!==0 ? 0 : -Math.PI/2;
  cart.rotation += (targetRotation-cart.rotation)*0.15;

  if(cart.x>WORLD_WIDTH-100) endGame("lose");
  if(cart.y<100) endGame("win");
}

function endGame(result){
  gameState=result;
  document.getElementById("ui").style.display="block";
  document.getElementById("result").innerText =
    result==="win"?"🏆 YOU WIN":"💀 YOU LOSE";
}

function restartGame(){
  cart.x=150;
  cart.y=WORLD_HEIGHT/2;
  cart.vx=cart.speed;
  cart.vy=0;
  cart.rotation=0;
  intersection.turnUp=false;
  gameState="playing";
  document.getElementById("ui").style.display="none";
}

canvas.addEventListener("click",()=>{
  intersection.turnUp=!intersection.turnUp;
});

function gameLoop(){
  if(!sprite.complete){ requestAnimationFrame(gameLoop); return; }

  const layout=getLayout();
  const scale=getScale();

  ctx.setTransform(scale,0,0,scale,
    (canvas.width-WORLD_WIDTH*scale)/2,
    (canvas.height-WORLD_HEIGHT*scale)/2);

  drawGrass();
  drawRoad(layout);
  drawBarn(layout);
  drawCart();
  updateCart(layout);

  requestAnimationFrame(gameLoop);
}

gameLoop();
