import { useCallback, useEffect, useRef, useState } from 'react';
import { Crosshair, Play, RotateCcw, ShieldAlert, Trophy } from 'lucide-react';
import { gameAudio } from '../../utils/gameAudio';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'crate' | 'rock';
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  life: number;
  damage: number;
}

interface EnemyBot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  fireCooldown: number;
  speed: number;
  strafeDir: number;
}

interface Pickup {
  id: number;
  x: number;
  y: number;
  kind: 'medkit' | 'rapid';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FireBestRecord {
  bestScore: number;
  bestKills: number;
}

const STORAGE_KEY = 'sunil_games_fire_battle_best_v1';
const WORLD_SIZE = 1500;
const CANVAS_W = 860;
const CANVAS_H = 520;

function loadBest(): FireBestRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FireBestRecord;
      return {
        bestScore: Number(parsed.bestScore) || 0,
        bestKills: Number(parsed.bestKills) || 0,
      };
    }
  } catch {
    // Ignore storage error
  }
  return { bestScore: 0, bestKills: 0 };
}

function saveBest(record: FireBestRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage error
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function circleIntersectsRect(
  cx: number,
  cy: number,
  r: number,
  rect: Obstacle
): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function resolveCircleRect(
  cx: number,
  cy: number,
  r: number,
  rect: Obstacle
): { x: number; y: number } {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= r * r) return { x: cx, y: cy };
  const dist = Math.sqrt(distSq) || 0.001;
  const overlap = r - dist;
  return {
    x: cx + (dx / dist) * overlap,
    y: cy + (dy / dist) * overlap,
  };
}

function createObstacles(): Obstacle[] {
  const list: Obstacle[] = [];
  const seeds = [
    [320, 320, 74, 74, 'crate'],
    [1100, 320, 74, 74, 'crate'],
    [320, 1100, 74, 74, 'crate'],
    [1100, 1100, 74, 74, 'crate'],
    [700, 440, 100, 46, 'rock'],
    [700, 1010, 100, 46, 'rock'],
    [450, 700, 46, 100, 'rock'],
    [1000, 700, 46, 100, 'rock'],
    [540, 540, 56, 56, 'crate'],
    [910, 540, 56, 56, 'crate'],
    [540, 910, 56, 56, 'crate'],
    [910, 910, 56, 56, 'crate'],
    [220, 720, 62, 62, 'crate'],
    [1220, 720, 62, 62, 'crate'],
    [720, 210, 62, 62, 'crate'],
    [720, 1230, 62, 62, 'crate'],
  ] as const;

  for (const [x, y, w, h, kind] of seeds) {
    list.push({ x, y, w, h, kind });
  }
  return list;
}

export function FireBattleGame({
  onScoreUpdate,
}: {
  onScoreUpdate?: (best: FireBestRecord) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [hud, setHud] = useState({
    hp: 100,
    maxHp: 100,
    score: 0,
    kills: 0,
    wave: 1,
    safeRadius: 720,
    outsideZone: false,
    rapidTimer: 0,
  });
  const [bestRecord, setBestRecord] = useState<FireBestRecord>(loadBest);

  // Touch joystick & fire visual state
  const [joyActive, setJoyActive] = useState(false);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const joyOriginRef = useRef<{ x: number; y: number; pointerId: number | null }>({
    x: 0,
    y: 0,
    pointerId: null,
  });

  const inputRef = useRef({
    keys: new Set<string>(),
    mouseX: CANVAS_W / 2,
    mouseY: CANVAS_H / 2,
    mouseDown: false,
    joyX: 0,
    joyY: 0,
    touchFire: false,
  });

  const simRef = useRef<{
    player: {
      x: number;
      y: number;
      angle: number;
      hp: number;
      maxHp: number;
      fireCooldown: number;
      rapidTimer: number;
      invuln: number;
    };
    obstacles: Obstacle[];
    bots: EnemyBot[];
    bullets: Bullet[];
    pickups: Pickup[];
    particles: Particle[];
    safeZone: {
      cx: number;
      cy: number;
      radius: number;
      targetRadius: number;
      shrinkRate: number;
      damageTimer: number;
    };
    score: number;
    kills: number;
    wave: number;
    spawnTimer: number;
    pickupTimer: number;
    nextId: number;
    survivalAcc: number;
  } | null>(null);

  const initMatch = useCallback(() => {
    const obstacles = createObstacles();
    simRef.current = {
      player: {
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        angle: 0,
        hp: 100,
        maxHp: 100,
        fireCooldown: 0,
        rapidTimer: 0,
        invuln: 0,
      },
      obstacles,
      bots: [],
      bullets: [],
      pickups: [
        { id: 1, x: 520, y: 750, kind: 'medkit' },
        { id: 2, x: 980, y: 750, kind: 'rapid' },
      ],
      particles: [],
      safeZone: {
        cx: WORLD_SIZE / 2,
        cy: WORLD_SIZE / 2,
        radius: 720,
        targetRadius: 150,
        shrinkRate: 8.5,
        damageTimer: 0,
      },
      score: 0,
      kills: 0,
      wave: 1,
      spawnTimer: 0.4,
      pickupTimer: 6,
      nextId: 10,
      survivalAcc: 0,
    };

    // Spawn 4 initial bots around perimeter
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4 + 0.35;
      const dist = 420;
      simRef.current.bots.push({
        id: simRef.current.nextId++,
        x: WORLD_SIZE / 2 + Math.cos(a) * dist,
        y: WORLD_SIZE / 2 + Math.sin(a) * dist,
        vx: 0,
        vy: 0,
        angle: a + Math.PI,
        hp: 45,
        maxHp: 45,
        fireCooldown: 1 + Math.random() * 0.8,
        speed: 98 + Math.random() * 20,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    setHud({
      hp: 100,
      maxHp: 100,
      score: 0,
      kills: 0,
      wave: 1,
      safeRadius: 720,
      outsideZone: false,
      rapidTimer: 0,
    });
    setGameState('PLAYING');
  }, []);

  // Keyboard listeners
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (gameState !== 'PLAYING') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (k.startsWith('arrow') || k === ' ') e.preventDefault();
        inputRef.current.keys.add(k);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      inputRef.current.keys.delete(e.key.toLowerCase());
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      inputRef.current.keys.clear();
    };
  }, [gameState]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudSyncAcc = 0;

    function spawnParticles(
      x: number,
      y: number,
      color: string,
      count: number,
      speed = 130
    ) {
      const sim = simRef.current;
      if (!sim) return;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * speed;
        sim.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.28 + Math.random() * 0.25,
          maxLife: 0.5,
          color,
          size: 2 + Math.random() * 3,
        });
      }
    }

    function step(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const sim = simRef.current;
      const canvas = canvasRef.current;
      if (!sim || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const inp = inputRef.current;
      const p = sim.player;

      // 1. Movement (Keyboard + Touch Joystick)
      let mx = inp.joyX;
      let my = inp.joyY;
      if (inp.keys.has('w') || inp.keys.has('arrowup')) my -= 1;
      if (inp.keys.has('s') || inp.keys.has('arrowdown')) my += 1;
      if (inp.keys.has('a') || inp.keys.has('arrowleft')) mx -= 1;
      if (inp.keys.has('d') || inp.keys.has('arrowright')) mx += 1;

      const mag = Math.hypot(mx, my);
      if (mag > 1) {
        mx /= mag;
        my /= mag;
      }

      const moveSpeed = 230;
      p.x = clamp(p.x + mx * moveSpeed * dt, 24, WORLD_SIZE - 24);
      p.y = clamp(p.y + my * moveSpeed * dt, 24, WORLD_SIZE - 24);
      for (const obs of sim.obstacles) {
        const resolved = resolveCircleRect(p.x, p.y, 17, obs);
        p.x = resolved.x;
        p.y = resolved.y;
      }

      // Camera centered on player
      const camX = clamp(p.x - CANVAS_W / 2, 0, WORLD_SIZE - CANVAS_W);
      const camY = clamp(p.y - CANVAS_H / 2, 0, WORLD_SIZE - CANVAS_H);

      // Aiming: if using touchFire, auto-aim at closest bot within 460px or movement angle
      if (inp.touchFire) {
        let closestBot: EnemyBot | null = null;
        let closestDist = 480;
        for (const bot of sim.bots) {
          const d = Math.hypot(bot.x - p.x, bot.y - p.y);
          if (d < closestDist) {
            closestDist = d;
            closestBot = bot;
          }
        }
        if (closestBot) {
          p.angle = Math.atan2(closestBot.y - p.y, closestBot.x - p.x);
        } else if (mag > 0.15) {
          p.angle = Math.atan2(my, mx);
        }
      } else {
        const worldMouseX = inp.mouseX + camX;
        const worldMouseY = inp.mouseY + camY;
        p.angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
      }

      // 2. Player Shooting
      if (p.rapidTimer > 0) p.rapidTimer = Math.max(0, p.rapidTimer - dt);
      if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
      if (p.fireCooldown > 0) p.fireCooldown -= dt;

      const wantsFire = inp.mouseDown || inp.touchFire || inp.keys.has(' ');
      const fireRate = p.rapidTimer > 0 ? 0.1 : 0.17;
      if (wantsFire && p.fireCooldown <= 0) {
        p.fireCooldown = fireRate;
        const muzzleX = p.x + Math.cos(p.angle) * 22;
        const muzzleY = p.y + Math.sin(p.angle) * 22;
        const bSpeed = 680;
        const spread = (Math.random() - 0.5) * 0.05;
        sim.bullets.push({
          x: muzzleX,
          y: muzzleY,
          vx: Math.cos(p.angle + spread) * bSpeed,
          vy: Math.sin(p.angle + spread) * bSpeed,
          fromPlayer: true,
          life: 1.2,
          damage: p.rapidTimer > 0 ? 24 : 20,
        });
        spawnParticles(muzzleX, muzzleY, '#facc15', 3, 70);
        gameAudio.playShoot();
      }

      // 3. Safe Zone Shrinking
      const sz = sim.safeZone;
      if (sz.radius > sz.targetRadius) {
        sz.radius = Math.max(sz.targetRadius, sz.radius - sz.shrinkRate * dt);
      }
      const distFromZone = Math.hypot(p.x - sz.cx, p.y - sz.cy);
      const outsideZone = distFromZone > sz.radius;
      if (outsideZone) {
        sz.damageTimer += dt;
        if (sz.damageTimer >= 0.75) {
          sz.damageTimer = 0;
          p.hp = Math.max(0, p.hp - 5);
          gameAudio.playDamage();
          spawnParticles(p.x, p.y, '#38bdf8', 5, 80);
        }
      } else {
        sz.damageTimer = 0;
      }

      // 4. Bot Spawning & AI
      sim.wave = 1 + Math.floor(sim.kills / 5);
      sim.spawnTimer -= dt;
      const maxBots = Math.min(12, 4 + sim.wave * 2);
      if (sim.spawnTimer <= 0 && sim.bots.length < maxBots) {
        sim.spawnTimer = Math.max(1.2, 3.2 - sim.wave * 0.25);
        const angle = Math.random() * Math.PI * 2;
        const spawnR = Math.min(sz.radius - 30, 360 + Math.random() * 220);
        const bx = clamp(sz.cx + Math.cos(angle) * spawnR, 40, WORLD_SIZE - 40);
        const by = clamp(sz.cy + Math.sin(angle) * spawnR, 40, WORLD_SIZE - 40);
        const hpScale = 45 + (sim.wave - 1) * 10;
        sim.bots.push({
          id: sim.nextId++,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          angle: Math.atan2(p.y - by, p.x - bx),
          hp: hpScale,
          maxHp: hpScale,
          fireCooldown: 0.9 + Math.random() * 0.9,
          speed: 96 + Math.min(60, sim.wave * 8),
          strafeDir: Math.random() > 0.5 ? 1 : -1,
        });
      }

      for (const bot of sim.bots) {
        const dx = p.x - bot.x;
        const dy = p.y - bot.y;
        const dist = Math.hypot(dx, dy) || 1;
        bot.angle = Math.atan2(dy, dx);

        let moveX = dx / dist;
        let moveY = dy / dist;
        if (dist < 220) {
          // Strafe smoothly at mid-range
          moveX = (-dy / dist) * bot.strafeDir;
          moveY = (dx / dist) * bot.strafeDir;
        }

        // Pull bots back inside safe zone if near edge
        const botZoneDist = Math.hypot(bot.x - sz.cx, bot.y - sz.cy);
        if (botZoneDist > sz.radius - 25) {
          moveX = (sz.cx - bot.x) / (botZoneDist || 1);
          moveY = (sz.cy - bot.y) / (botZoneDist || 1);
        }

        bot.x = clamp(bot.x + moveX * bot.speed * dt, 24, WORLD_SIZE - 24);
        bot.y = clamp(bot.y + moveY * bot.speed * dt, 24, WORLD_SIZE - 24);
        for (const obs of sim.obstacles) {
          const res = resolveCircleRect(bot.x, bot.y, 16, obs);
          bot.x = res.x;
          bot.y = res.y;
        }

        bot.fireCooldown -= dt;
        if (bot.fireCooldown <= 0 && dist < 440) {
          bot.fireCooldown = Math.max(0.75, 1.85 - sim.wave * 0.1) + Math.random() * 0.4;
          const inaccuracy = (Math.random() - 0.5) * 0.18;
          const bSpd = 380;
          sim.bullets.push({
            x: bot.x + Math.cos(bot.angle) * 20,
            y: bot.y + Math.sin(bot.angle) * 20,
            vx: Math.cos(bot.angle + inaccuracy) * bSpd,
            vy: Math.sin(bot.angle + inaccuracy) * bSpd,
            fromPlayer: false,
            life: 1.5,
            damage: 9 + Math.min(6, sim.wave),
          });
        }
      }

      // 5. Bullets Update & Collision
      for (let i = sim.bullets.length - 1; i >= 0; i--) {
        const b = sim.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        if (b.life <= 0 || b.x < 0 || b.x > WORLD_SIZE || b.y < 0 || b.y > WORLD_SIZE) {
          sim.bullets.splice(i, 1);
          continue;
        }

        let hitWall = false;
        for (const obs of sim.obstacles) {
          if (circleIntersectsRect(b.x, b.y, 4, obs)) {
            hitWall = true;
            spawnParticles(b.x, b.y, obs.kind === 'crate' ? '#d97706' : '#94a3b8', 4, 90);
            break;
          }
        }
        if (hitWall) {
          sim.bullets.splice(i, 1);
          continue;
        }

        if (b.fromPlayer) {
          let hitBot = false;
          for (let j = sim.bots.length - 1; j >= 0; j--) {
            const bot = sim.bots[j];
            if (Math.hypot(b.x - bot.x, b.y - bot.y) < 18) {
              bot.hp -= b.damage;
              hitBot = true;
              spawnParticles(b.x, b.y, '#ef4444', 5, 120);
              gameAudio.playHit();
              if (bot.hp <= 0) {
                spawnParticles(bot.x, bot.y, '#f97316', 14, 180);
                gameAudio.playEnemyDown();
                sim.kills += 1;
                sim.score += 100 + sim.wave * 20;
                if (Math.random() < 0.35) {
                  sim.pickups.push({
                    id: sim.nextId++,
                    x: bot.x,
                    y: bot.y,
                    kind: Math.random() < 0.65 ? 'medkit' : 'rapid',
                  });
                }
                sim.bots.splice(j, 1);
              }
              break;
            }
          }
          if (hitBot) {
            sim.bullets.splice(i, 1);
            continue;
          }
        } else {
          if (Math.hypot(b.x - p.x, b.y - p.y) < 17 && p.invuln <= 0) {
            p.hp = Math.max(0, p.hp - b.damage);
            p.invuln = 0.12;
            spawnParticles(p.x, p.y, '#ef4444', 7, 130);
            gameAudio.playDamage();
            sim.bullets.splice(i, 1);
            continue;
          }
        }
      }

      // 6. Pickups
      sim.pickupTimer -= dt;
      if (sim.pickupTimer <= 0 && sim.pickups.length < 5) {
        sim.pickupTimer = 7;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * Math.max(80, sz.radius - 40);
        sim.pickups.push({
          id: sim.nextId++,
          x: clamp(sz.cx + Math.cos(a) * r, 50, WORLD_SIZE - 50),
          y: clamp(sz.cy + Math.sin(a) * r, 50, WORLD_SIZE - 50),
          kind: Math.random() < 0.65 ? 'medkit' : 'rapid',
        });
      }

      for (let i = sim.pickups.length - 1; i >= 0; i--) {
        const pk = sim.pickups[i];
        if (Math.hypot(pk.x - p.x, pk.y - p.y) < 26) {
          if (pk.kind === 'medkit') {
            p.hp = Math.min(p.maxHp, p.hp + 30);
          } else {
            p.rapidTimer = 7;
          }
          sim.score += 25;
          gameAudio.playPickup();
          spawnParticles(pk.x, pk.y, pk.kind === 'medkit' ? '#22c55e' : '#38bdf8', 10, 120);
          sim.pickups.splice(i, 1);
        }
      }

      // 7. Particles & Survival Score
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const pt = sim.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) sim.particles.splice(i, 1);
      }

      sim.survivalAcc += dt;
      if (sim.survivalAcc >= 1) {
        sim.survivalAcc -= 1;
        sim.score += 5;
      }

      // Check Game Over
      if (p.hp <= 0) {
        gameAudio.playGameOver();
        const prevBest = loadBest();
        const nextBest: FireBestRecord = {
          bestScore: Math.max(prevBest.bestScore, sim.score),
          bestKills: Math.max(prevBest.bestKills, sim.kills),
        };
        saveBest(nextBest);
        setBestRecord(nextBest);
        onScoreUpdate?.(nextBest);
        setHud({
          hp: 0,
          maxHp: p.maxHp,
          score: sim.score,
          kills: sim.kills,
          wave: sim.wave,
          safeRadius: Math.round(sz.radius),
          outsideZone,
          rapidTimer: 0,
        });
        setGameState('GAME_OVER');
        return;
      }

      // Sync React HUD at ~12Hz for smooth DOM updates without overhead
      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.08) {
        hudSyncAcc = 0;
        setHud({
          hp: Math.ceil(p.hp),
          maxHp: p.maxHp,
          score: sim.score,
          kills: sim.kills,
          wave: sim.wave,
          safeRadius: Math.round(sz.radius),
          outsideZone,
          rapidTimer: p.rapidTimer,
        });
      }

      // ================= RENDER =================
      ctx.save();
      ctx.fillStyle = '#18221b';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.translate(-camX, -camY);

      // Terrain grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const startGridX = Math.floor(camX / 60) * 60;
      const startGridY = Math.floor(camY / 60) * 60;
      ctx.beginPath();
      for (let gx = startGridX; gx <= camX + CANVAS_W; gx += 60) {
        ctx.moveTo(gx, camY);
        ctx.lineTo(gx, camY + CANVAS_H);
      }
      for (let gy = startGridY; gy <= camY + CANVAS_H; gy += 60) {
        ctx.moveTo(camX, gy);
        ctx.lineTo(camX + CANVAS_W, gy);
      }
      ctx.stroke();

      // World border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, WORLD_SIZE - 4, WORLD_SIZE - 4);

      // Safe zone storm overlay (outside circle)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, WORLD_SIZE, WORLD_SIZE);
      ctx.arc(sz.cx, sz.cy, sz.radius, 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.22)';
      ctx.fill('evenodd');
      ctx.restore();

      // Active Safe Zone border
      ctx.beginPath();
      ctx.arc(sz.cx, sz.cy, sz.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Target inner safe zone hint
      ctx.beginPath();
      ctx.setLineDash([8, 8]);
      ctx.arc(sz.cx, sz.cy, sz.targetRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Pickups
      for (const pk of sim.pickups) {
        ctx.save();
        ctx.translate(pk.x, pk.y);
        ctx.fillStyle = pk.kind === 'medkit' ? '#16a34a' : '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        if (pk.kind === 'medkit') {
          ctx.fillRect(-6, -2, 12, 4);
          ctx.fillRect(-2, -6, 4, 12);
        } else {
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('2X', 0, 1);
        }
        ctx.restore();
      }

      // Obstacles
      for (const obs of sim.obstacles) {
        if (obs.kind === 'crate') {
          ctx.fillStyle = '#92400e';
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y);
          ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
          ctx.moveTo(obs.x + obs.w, obs.y);
          ctx.lineTo(obs.x, obs.y + obs.h);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
          ctx.stroke();
        } else {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 10);
          ctx.fill();
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Bullets
      for (const b of sim.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.fromPlayer ? 4 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = b.fromPlayer ? '#fde047' : '#f87171';
        ctx.fill();
      }

      // Enemy Bots
      for (const bot of sim.bots) {
        ctx.save();
        ctx.translate(bot.x, bot.y);
        ctx.rotate(bot.angle);
        // Gun barrel
        ctx.fillStyle = '#18181b';
        ctx.fillRect(8, -3, 16, 6);
        // Body
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Bot HP Bar
        const hpRatio = Math.max(0, bot.hp / bot.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(bot.x - 16, bot.y - 26, 32, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bot.x - 16, bot.y - 26, 32 * hpRatio, 4);
      }

      // Player
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      // Rifle
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(10, -3.5, 19, 7);
      // Armor Ring
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fillStyle = p.rapidTimer > 0 ? '#0284c7' : '#2563eb';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Visor
      ctx.beginPath();
      ctx.arc(6, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fde047';
      ctx.fill();
      ctx.restore();

      // Particles
      for (const pt of sim.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      // Mini-radar (top-right inside canvas)
      const mapSize = 104;
      const mapX = CANVAS_W - mapSize - 12;
      const mapY = 12;
      ctx.fillStyle = 'rgba(9, 9, 11, 0.78)';
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mapX, mapY, mapSize, mapSize);

      const scale = mapSize / WORLD_SIZE;
      ctx.beginPath();
      ctx.arc(
        mapX + sz.cx * scale,
        mapY + sz.cy * scale,
        sz.radius * scale,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      for (const bot of sim.bots) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(mapX + bot.x * scale - 1.5, mapY + bot.y * scale - 1.5, 3, 3);
      }
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(mapX + p.x * scale, mapY + p.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, onScoreUpdate]);

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    inputRef.current.mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    inputRef.current.mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
  }

  // Virtual Joystick Handlers
  function handleJoyStart(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      pointerId: e.pointerId,
    };
    updateJoystick(e.clientX, e.clientY);
  }

  function handleJoyMove(e: React.PointerEvent<HTMLDivElement>) {
    if (joyOriginRef.current.pointerId !== e.pointerId) return;
    updateJoystick(e.clientX, e.clientY);
  }

  function handleJoyEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (joyOriginRef.current.pointerId !== e.pointerId) return;
    joyOriginRef.current.pointerId = null;
    inputRef.current.joyX = 0;
    inputRef.current.joyY = 0;
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = 'translate(0px, 0px)';
    }
    setJoyActive(false);
  }

  function updateJoystick(clientX: number, clientY: number) {
    const maxR = 34;
    const dx = clientX - joyOriginRef.current.x;
    const dy = clientY - joyOriginRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    inputRef.current.joyX = kx / maxR;
    inputRef.current.joyY = ky / maxR;
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate(${kx}px, ${ky}px)`;
    }
    setJoyActive(true);
  }

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));

  return (
    <div className="flex flex-col gap-3">
      {/* Top HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-[#121217] px-4 py-2.5">
        <div className="flex items-center gap-4">
          <div className="space-y-1 min-w-[140px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-300">HP</span>
              <span className="font-mono font-semibold text-zinc-100 tabular-nums">
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <svg viewBox="0 0 100 6" className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden" preserveAspectRatio="none" aria-hidden="true">
              <rect
                x="0"
                y="0"
                width={hpPct}
                height="6"
                rx="3"
                className={
                  hud.hp > 50
                    ? 'fill-emerald-500'
                    : hud.hp > 25
                      ? 'fill-amber-500'
                      : 'fill-red-500'
                }
              />
            </svg>
          </div>

          {hud.outsideZone && gameState === 'PLAYING' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/60 border border-red-500/40 text-xs font-medium text-red-200">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              Outside Safe Zone
            </div>
          )}

          {hud.rapidTimer > 0 && gameState === 'PLAYING' && (
            <span className="text-xs font-mono text-sky-400 tabular-nums">
              2X FIRE {hud.rapidTimer.toFixed(1)}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-5 text-xs font-mono tabular-nums">
          <div>
            <span className="text-zinc-400">WAVE </span>
            <span className="text-zinc-100 font-semibold">{hud.wave}</span>
          </div>
          <div>
            <span className="text-zinc-400">KILLS </span>
            <span className="text-zinc-100 font-semibold">{hud.kills}</span>
          </div>
          <div>
            <span className="text-zinc-400">SCORE </span>
            <span className="text-blue-400 font-semibold">{hud.score}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST {bestRecord.bestScore}</span>
          </div>
        </div>
      </div>

      {/* Canvas Viewport + Touch Controls Overlay */}
      <div className="relative rounded-xl border border-zinc-800 bg-[#0d1410] overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerMove={handleCanvasPointerMove}
          onPointerDown={(e) => {
            if (gameState !== 'PLAYING') return;
            handleCanvasPointerMove(e);
            inputRef.current.mouseDown = true;
          }}
          onPointerUp={() => {
            inputRef.current.mouseDown = false;
          }}
          onPointerLeave={() => {
            inputRef.current.mouseDown = false;
          }}
          className="w-full h-auto block cursor-crosshair touch-none"
        />

        {/* Mobile / On-Screen Touch Controls (Active during play) */}
        {gameState === 'PLAYING' && (
          <>
            {/* Left Virtual Joystick */}
            <div
              onPointerDown={handleJoyStart}
              onPointerMove={handleJoyMove}
              onPointerUp={handleJoyEnd}
              onPointerCancel={handleJoyEnd}
              className="absolute bottom-4 left-4 w-24 h-24 rounded-full border border-white/20 bg-black/35 backdrop-blur-[2px] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
              aria-label="Virtual movement joystick"
            >
              <div
                ref={joyKnobRef}
                className={`w-10 h-10 rounded-full border transition-colors ${
                  joyActive
                    ? 'bg-blue-500/80 border-white'
                    : 'bg-white/25 border-white/50'
                }`}
              />
            </div>

            {/* Right Fire Button (Auto-aims nearest enemy on touch) */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                inputRef.current.touchFire = true;
              }}
              onPointerUp={() => {
                inputRef.current.touchFire = false;
              }}
              onPointerLeave={() => {
                inputRef.current.touchFire = false;
              }}
              onPointerCancel={() => {
                inputRef.current.touchFire = false;
              }}
              className="absolute bottom-5 right-5 w-20 h-20 rounded-full border-2 border-red-400/70 bg-red-600/75 active:bg-red-500 text-white font-display text-xs font-bold tracking-wide shadow-lg flex flex-col items-center justify-center gap-1 touch-none"
              aria-label="Fire weapon"
            >
              <Crosshair className="w-5 h-5" />
              FIRE
            </button>
          </>
        )}

        {/* Title Menu Overlay */}
        {gameState === 'TITLE_MENU' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-[#111116] p-6 text-center space-y-4 shadow-2xl">
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold text-zinc-100">
                  Fire Battle Survival
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Top-down battle survival shooter. Eliminate enemy bots, grab medkits and 2X fire boosts, and stay inside the shrinking blue safe zone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-zinc-200 block">Desktop</span>
                  <span className="text-zinc-400">WASD move · Mouse aim &amp; click fire</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block">Mobile Touch</span>
                  <span className="text-zinc-400">Left joystick · Right auto-aim FIRE</span>
                </div>
              </div>

              {bestRecord.bestScore > 0 && (
                <div className="text-xs font-mono text-amber-400 tabular-nums">
                  High Score: {bestRecord.bestScore} · Best Eliminations: {bestRecord.bestKills}
                </div>
              )}

              <button
                type="button"
                onClick={initMatch}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Drop Into Battle
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-sm w-full rounded-xl border border-zinc-800 bg-[#111116] p-6 text-center space-y-4 shadow-2xl">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-zinc-100">
                  Eliminated
                </h3>
                <p className="text-xs text-zinc-400">
                  Wave {hud.wave} · {hud.kills} bot{hud.kills === 1 ? '' : 's'} eliminated
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] text-zinc-400">SCORE</div>
                  <div className="text-lg font-bold text-blue-400">{hud.score}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">BEST</div>
                  <div className="text-lg font-bold text-amber-400">
                    {bestRecord.bestScore}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={initMatch}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
