const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restartBtn');

let player, blocks, abilities, gameOver, score, baseSpeedY, activeAbility, abilityTimer, projectiles;
const keysPressed = {};
let lastUndodgeableScore = 0;

function initGame() {
  player = { 
    x: canvas.width / 2 - 20, 
    y: canvas.height - 60, 
    width: 40, 
    height: 40, 
    color: '#4caf50', 
    speed: 3, 
    defaultSpeed: 3 
  };
  blocks = [];
  abilities = [];
  projectiles = [];
  gameOver = false;
  score = 0;
  baseSpeedY = 2;
  activeAbility = null;
  abilityTimer = 0;
  restartBtn.style.display = 'none';    
  setupControls();
}

function spawnBlock() {
  const size = Math.random() * 30 + 20;
  const x = Math.random() * (canvas.width - size);
  let speedY = baseSpeedY + Math.random() * 3;
  const speedX = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 1.5);
  const changeDirTimer = Math.floor(Math.random() * 60) + 30;

  let type = 'normal';
  const rand = Math.random();

  if (rand < 0.15) type = 'chaser';
  else if (rand < 0.45) type = 'random';

  blocks.push({ x, y: -size, size, speedY, speedX, timer: 0, changeDirTimer, type });
}

function spawnUndodgeableBlock() {
  const size = 50;
  const x = Math.random() * (canvas.width - size);
  const speedY = baseSpeedY * 1;
  blocks.push({ 
    x, y: -size, size, speedY, speedX: 0, timer: 0, changeDirTimer: 0, type: 'undodgeable'
  });
}

function spawnAbility() {
  const size = 20;
  const x = Math.random() * (canvas.width - size);
  const y = -size;
  const types = ['shield', 'speed', 'gun'];
  const type = types[Math.floor(Math.random() * types.length)];

  abilities.push({ x, y, size, type, speedY: 2 });
}

setInterval(spawnBlock, 400);
setInterval(spawnAbility, 8000);

function checkSpecialEvents() {

  if (score > 0 && score % 1000 === 0 && score !== lastUndodgeableScore) {
    spawnUndodgeableBlock();
    lastUndodgeableScore = score;
  }

  baseSpeedY = 2 + Math.floor(score / 500);  
}

function update() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.y -= projectile.speed;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2);
    ctx.fill();

    let hit = false;
    for (let j = blocks.length - 1; j >= 0; j--) {
      const block = blocks[j];
      if (
        projectile.x > block.x &&
        projectile.x < block.x + block.size &&
        projectile.y > block.y &&
        projectile.y < block.y + block.size
      ) {
        blocks.splice(j, 1);
        score += 10;
        hit = true;
        break;
      }
    }

    if (hit || projectile.y < 0) {
      projectiles.splice(i, 1);
    }
  }

  if (keysPressed['a'] || keysPressed['arrowleft']) player.x -= player.speed;
  if (keysPressed['d'] || keysPressed['arrowright']) player.x += player.speed;
  if (keysPressed['w'] || keysPressed['arrowup']) player.y -= player.speed;
  if (keysPressed['s'] || keysPressed['arrowdown']) player.y += player.speed;

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

  checkSpecialEvents();

  blocks.forEach(block => {
    if (block.type !== 'undodgeable') {
      block.y += block.speedY;
    }

    if (block.type === 'undodgeable') {
      const dx = player.x + player.width / 2 - (block.x + block.size / 2);
      const dy = player.y + player.height / 2 - (block.y + block.size / 2);
      const angle = Math.atan2(dy, dx);
      const speed = 0.5;
      block.x += Math.cos(angle) * speed;
      block.y += Math.sin(angle) * speed;
    } else if (block.type === 'chaser') {
      const dx = player.x + player.width / 2 - (block.x + block.size / 2);
      const dy = player.y + player.height / 2 - (block.y + block.size / 2);
      const angle = Math.atan2(dy, dx);
      const speed = 1.5;
      block.x += Math.cos(angle) * speed * 1;
      block.y += Math.sin(angle) * speed;
    } else if (block.type === 'random') {
      block.x += block.speedX;
      block.timer++;
      if (block.timer >= block.changeDirTimer) {
        block.speedX = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 1.5);
        block.timer = 0;
        block.changeDirTimer = Math.floor(Math.random() * 60) + 30;
      }
      if (block.x < 0 || block.x > canvas.width - block.size) block.speedX *= -1;
    }

    if (block.y > canvas.height) score++;

    const colliding = (
      block.x < player.x + player.width &&
      block.x + block.size > player.x &&
      block.y < player.y + player.height &&
      block.y + block.size > player.y
    );

    if (colliding) {
      if (activeAbility !== 'shield') {
        gameOver = true;
        restartBtn.style.display = 'inline-block';
      }
    }
  });

  blocks = blocks.filter(block => block.y < canvas.height + block.size);

  abilities.forEach(ab => {
    ab.y += ab.speedY;

    const collected = (
      ab.x < player.x + player.width &&
      ab.x + ab.size > player.x &&
      ab.y < player.y + player.height &&
      ab.y + ab.size > player.y
    );

    if (collected) {
      activeAbility = ab.type;
      abilityTimer = ab.type === 'speed' ? 600 : ab.type === 'shield' ? 300 : 1;
    }
  });

  abilities = abilities.filter(ab => ab.y < canvas.height + ab.size && !(ab.x < player.x + player.width && ab.x + ab.size > player.x && ab.y < player.y + player.height && ab.y + ab.size > player.y));

  if (activeAbility) {
    abilityTimer--;
    if (activeAbility === 'speed') player.speed = 6;
    if (abilityTimer <= 0) {
      player.speed = player.defaultSpeed;
      activeAbility = null;
    }
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  blocks.forEach(block => {
    if (block.type === 'chaser') ctx.fillStyle = '#00FFFF';
    else if (block.type === 'random') ctx.fillStyle = '#ff9800';
    else if (block.type === 'undodgeable') ctx.fillStyle = '#800080';
    else ctx.fillStyle = '#f44336';

    ctx.fillRect(block.x, block.y, block.size, block.size);
  });

  abilities.forEach(ab => {
    if (ab.type === 'shield') ctx.fillStyle = '#FFD700';
    if (ab.type === 'speed') ctx.fillStyle = '#00FF00';
    if (ab.type === 'gun') ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ab.x + ab.size / 2, ab.y + ab.size / 2, ab.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Score: ${score}`, 10, 30);
  if (activeAbility) ctx.fillText(`Ability: ${activeAbility}`, 10, 60);

  if (gameOver) {
    ctx.fillStyle = 'white';
    ctx.font = '40px sans-serif';
    ctx.fillText('GAME OVER', 160, 400);
    ctx.font = '20px sans-serif';
    ctx.fillText(`Final Score: ${score}`, 230, 440);
  }
  requestAnimationFrame(update);
}

function setupControls() {
  const controls = {
    left: document.getElementById('left-btn'),
    right: document.getElementById('right-btn'),
    up: document.getElementById('up-btn'),
    down: document.getElementById('down-btn')
  };

  function addControlListeners(button, key) {
    const startEvents = ['mousedown', 'touchstart'];
    const endEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];

    startEvents.forEach(e => button.addEventListener(e, (event) => {
      keysPressed[key] = true;
      event.preventDefault();
    }));

    endEvents.forEach(e => button.addEventListener(e, (event) => {
      keysPressed[key] = false;
      event.preventDefault();
    }));
  }

  addControlListeners(controls.left, 'a');
  addControlListeners(controls.right, 'd');
  addControlListeners(controls.up, 'w');
  addControlListeners(controls.down, 's');
}

document.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()] = true;

  if (e.key === ' ' && activeAbility === 'gun') {
    projectiles.push({
      x: player.x + player.width / 2,
      y: player.y,
      speed: 8
    });

    console.log("Firing projectile!");
    activeAbility = null;
  }
});

document.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

function restartGame() {
  initGame();
  update();
}

initGame();
update();
