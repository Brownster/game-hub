const MAP_SIZE = 3000;
const FOOD_COUNT = 200;
const FOOD_SIZE = 8;
const PLAYER_SPEED = 4;
const INITIAL_LENGTH = 5;
const SEGMENT_SIZE = 10;
const BOT_COUNT = 6;

const BOT_NAMES = [
  "Neon Fang",
  "Pixel Coil",
  "Circuit Viper",
  "Ghost Tail",
  "Nova Coil",
  "Byte Serpent",
  "Echo Fang",
  "Ion Twist"
];

const players = new Map();
const food = [];
const bots = new Set();

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function initializeFood() {
  food.length = 0;
  for (let i = 0; i < FOOD_COUNT; i += 1) {
    food.push(createFood());
  }
}

function createFood() {
  return {
    id: randomId(),
    x: Math.random() * MAP_SIZE,
    y: Math.random() * MAP_SIZE,
    color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    size: FOOD_SIZE
  };
}

function createPlayer(id, name, options = {}) {
  const startX = Math.random() * (MAP_SIZE - 200) + 100;
  const startY = Math.random() * (MAP_SIZE - 200) + 100;
  const hue = Math.random() * 360;
  const score = options.score ?? INITIAL_LENGTH;
  const speed = options.speed ?? PLAYER_SPEED;
  const color = options.color ?? `hsl(${hue}, 70%, 50%)`;
  const isBot = Boolean(options.isBot);

  const segments = [];
  for (let i = 0; i < score; i += 1) {
    segments.push({ x: startX, y: startY });
  }

  return {
    id,
    name,
    segments,
    angle: Math.random() * Math.PI * 2,
    speed,
    color,
    headSize: 12,
    dead: false,
    score,
    isBot
  };
}

function circleCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}

function updateGame() {
  players.forEach((player, id) => {
    if (player.dead) return;

    if (player.isBot) {
      const drift = (Math.random() - 0.5) * 0.15;
      player.angle += drift;
      if (Math.random() < 0.02) {
        player.angle += (Math.random() - 0.5) * 1.5;
      }
    }

    const head = player.segments[0];
    const newHead = {
      x: head.x + Math.cos(player.angle) * player.speed,
      y: head.y + Math.sin(player.angle) * player.speed
    };

    if (newHead.x < 0) newHead.x = MAP_SIZE;
    if (newHead.x > MAP_SIZE) newHead.x = 0;
    if (newHead.y < 0) newHead.y = MAP_SIZE;
    if (newHead.y > MAP_SIZE) newHead.y = 0;

    player.segments.unshift(newHead);

    if (player.segments.length > player.score) {
      player.segments.pop();
    }

    for (let i = food.length - 1; i >= 0; i -= 1) {
      if (circleCollision(newHead.x, newHead.y, player.headSize, food[i].x, food[i].y, FOOD_SIZE)) {
        food.splice(i, 1);
        player.score += 1;
        food.push(createFood());
      }
    }

    players.forEach((otherPlayer, otherId) => {
      if (otherId === id || otherPlayer.dead) return;

      for (let i = 3; i < otherPlayer.segments.length; i += 1) {
        const segment = otherPlayer.segments[i];
        if (circleCollision(newHead.x, newHead.y, player.headSize, segment.x, segment.y, SEGMENT_SIZE)) {
          player.dead = true;
          player.segments.forEach((seg, idx) => {
            if (idx % 2 === 0) {
              food.push({
                id: randomId(),
                x: seg.x,
                y: seg.y,
                color: player.color,
                size: FOOD_SIZE * 1.5
              });
            }
          });
        }
      }
    });

    if (player.isBot && player.dead) {
      const bot = createPlayer(player.id, player.name, {
        isBot: true,
        score: Math.floor(Math.random() * 25) + 8,
        speed: Math.random() * 1.2 + 2.6,
        color: player.color
      });
      players.set(id, bot);
      player.dead = false;
    }
  });
}

function serializeState() {
  return {
    players: Array.from(players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      segments: player.segments,
      color: player.color,
      headSize: player.headSize,
      dead: player.dead,
      score: player.score
    })),
    food
  };
}

export function initSlitherEngine() {
  initializeFood();

  bots.clear();
  for (let i = 0; i < BOT_COUNT; i += 1) {
    const id = `bot-${i}-${randomId()}`;
    const name = BOT_NAMES[i % BOT_NAMES.length];
    const score = Math.floor(Math.random() * 25) + 8;
    const speed = Math.random() * 1.2 + 2.6;
    const bot = createPlayer(id, name, { isBot: true, score, speed });
    bots.add(id);
    players.set(id, bot);
  }
}

export function addPlayer(id, name) {
  const player = createPlayer(id, name || "Anonymous");
  players.set(id, player);
  return player;
}

export function removePlayer(id) {
  if (bots.has(id)) return;
  players.delete(id);
}

export function updateAngle(id, angle) {
  const player = players.get(id);
  if (player && !player.dead) {
    player.angle = angle;
  }
}

export function respawnPlayer(id, name) {
  const player = createPlayer(id, name || "Anonymous");
  players.set(id, player);
  return player;
}

export function tickAndGetState() {
  updateGame();
  return serializeState();
}

export function getMapSize() {
  return MAP_SIZE;
}
