import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Play,
  RotateCcw,
  Shield,
  Trophy,
} from 'lucide-react';
import { gameAudio } from '../../utils/gameAudio';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

interface TrackObject {
  id: number;
  segment: number;
  laneX: number; // -0.85 to +0.85
  kind: 'crab' | 'barrel' | 'mystery' | 'boostpad';
  crabPhase: number;
  crabSpeed: number;
  consumed: boolean;
}

interface TrackSegment {
  index: number;
  curve: number;
  y: number;
}

interface BuggyBestRecord {
  bestScore: number;
  bestTimeMs: number | null;
}

const STORAGE_KEY = 'sunil_games_beach_buggy_best_v1';
const CANVAS_W = 860;
const CANVAS_H = 520;
const SEG_LEN = 180;
const LAP_SEGMENTS = 160;
const TOTAL_LAPS = 3;
const DRAW_DISTANCE = 55;
const CAMERA_HEIGHT = 920;
const CAMERA_DEPTH = 0.84;
const ROAD_HALF_W = 1050;

function loadBest(): BuggyBestRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BuggyBestRecord;
      return {
        bestScore: Number(parsed.bestScore) || 0,
        bestTimeMs:
          typeof parsed.bestTimeMs === 'number' ? parsed.bestTimeMs : null,
      };
    }
  } catch {
    // Ignore storage error
  }
  return { bestScore: 0, bestTimeMs: null };
}

function saveBest(rec: BuggyBestRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // Ignore storage error
  }
}

function formatRaceTime(ms: number): string {
  const totalSec = Math.max(0, ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(
    hundredths
  ).padStart(2, '0')}`;
}

function buildTrack(): { segments: TrackSegment[]; objects: TrackObject[] } {
  const segments: TrackSegment[] = [];
  for (let i = 0; i < LAP_SEGMENTS; i++) {
    let curve = 0;
    if (i > 12 && i < 42) curve = 2.2;
    else if (i >= 52 && i < 82) curve = -2.6;
    else if (i >= 95 && i < 120) curve = 1.9;
    else if (i >= 130 && i < 150) curve = -1.6;

    const y = Math.sin((i / LAP_SEGMENTS) * Math.PI * 6) * 280;
    segments.push({ index: i, curve, y });
  }

  const objects: TrackObject[] = [];
  let nextId = 1;
  for (let s = 10; s < LAP_SEGMENTS - 6; s += 5) {
    const r = Math.random();
    if (r < 0.34) {
      objects.push({
        id: nextId++,
        segment: s,
        laneX: (Math.random() - 0.5) * 1.2,
        kind: 'crab',
        crabPhase: Math.random() * Math.PI * 2,
        crabSpeed: 1.5 + Math.random() * 1.4,
        consumed: false,
      });
    } else if (r < 0.58) {
      objects.push({
        id: nextId++,
        segment: s,
        laneX: (Math.random() - 0.5) * 1.35,
        kind: 'barrel',
        crabPhase: 0,
        crabSpeed: 0,
        consumed: false,
      });
    } else if (r < 0.8) {
      objects.push({
        id: nextId++,
        segment: s,
        laneX: (Math.random() - 0.5) * 1.2,
        kind: 'mystery',
        crabPhase: 0,
        crabSpeed: 0,
        consumed: false,
      });
    } else {
      objects.push({
        id: nextId++,
        segment: s,
        laneX: (Math.random() - 0.5) * 1.1,
        kind: 'boostpad',
        crabPhase: 0,
        crabSpeed: 0,
        consumed: false,
      });
    }
  }

  return { segments, objects };
}

export function BeachBuggyGame({
  onScoreUpdate,
}: {
  onScoreUpdate?: (best: BuggyBestRecord) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [bestRecord, setBestRecord] = useState<BuggyBestRecord>(loadBest);
  const [hud, setHud] = useState({
    lap: 1,
    totalLaps: TOTAL_LAPS,
    elapsedMs: 0,
    speedKmh: 0,
    boostCharge: 100,
    boosting: false,
    shielded: false,
    score: 0,
    bannerText: '',
  });

  const controlsRef = useRef({
    left: false,
    right: false,
    up: false,
    boost: false,
  });

  const raceRef = useRef<{
    segments: TrackSegment[];
    objects: TrackObject[];
    position: number; // z distance along current track
    playerX: number; // -1.25 to +1.25
    speed: number;
    lap: number;
    score: number;
    boostCharge: number;
    boostTimer: number;
    shieldTimer: number;
    stunTimer: number;
    elapsedMs: number;
    skyOffset: number;
    bannerText: string;
    bannerTimer: number;
  } | null>(null);

  const startRace = useCallback(() => {
    const { segments, objects } = buildTrack();
    raceRef.current = {
      segments,
      objects,
      position: 0,
      playerX: 0,
      speed: 2200,
      lap: 1,
      score: 0,
      boostCharge: 100,
      boostTimer: 0,
      shieldTimer: 0,
      stunTimer: 0,
      elapsedMs: 0,
      skyOffset: 0,
      bannerText: 'LAP 1 — GO!',
      bannerTimer: 1.5,
    };
    setHud({
      lap: 1,
      totalLaps: TOTAL_LAPS,
      elapsedMs: 0,
      speedKmh: 90,
      boostCharge: 100,
      boosting: false,
      shielded: false,
      score: 0,
      bannerText: 'LAP 1 — GO!',
    });
    setGameState('PLAYING');
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (gameState !== 'PLAYING') return;
      const k = e.key.toLowerCase();
      if (['arrowleft', 'a'].includes(k)) {
        e.preventDefault();
        controlsRef.current.left = true;
      }
      if (['arrowright', 'd'].includes(k)) {
        e.preventDefault();
        controlsRef.current.right = true;
      }
      if (['arrowup', 'w'].includes(k)) {
        e.preventDefault();
        controlsRef.current.up = true;
      }
      if ([' ', 'shift'].includes(k)) {
        e.preventDefault();
        controlsRef.current.boost = true;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'a'].includes(k)) controlsRef.current.left = false;
      if (['arrowright', 'd'].includes(k)) controlsRef.current.right = false;
      if (['arrowup', 'w'].includes(k)) controlsRef.current.up = false;
      if ([' ', 'shift'].includes(k)) controlsRef.current.boost = false;
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controlsRef.current = { left: false, right: false, up: false, boost: false };
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let rafId = 0;
    let lastTime = performance.now();
    let hudAcc = 0;
    const trackLen = LAP_SEGMENTS * SEG_LEN;

    function projectPoint(
      worldX: number,
      worldY: number,
      worldZ: number,
      camX: number,
      camY: number,
      camZ: number
    ) {
      const dz = Math.max(10, worldZ - camZ);
      const scale = CAMERA_DEPTH / dz;
      const screenX = Math.round(CANVAS_W / 2 + scale * (worldX - camX) * (CANVAS_W / 2));
      const screenY = Math.round(CANVAS_H / 2 - scale * (worldY - camY) * (CANVAS_H / 2));
      const screenW = Math.round(scale * ROAD_HALF_W * (CANVAS_W / 2));
      return { screenX, screenY, screenW, scale };
    }

    function drawTrapezoid(
      ctx: CanvasRenderingContext2D,
      x1: number,
      y1: number,
      w1: number,
      x2: number,
      y2: number,
      w2: number,
      color: string
    ) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x2 - w2, y2);
      ctx.lineTo(x2 + w2, y2);
      ctx.lineTo(x1 + w1, y1);
      ctx.closePath();
      ctx.fill();
    }

    function step(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const r = raceRef.current;
      const canvas = canvasRef.current;
      if (!r || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ctrl = controlsRef.current;
      r.elapsedMs += dt * 1000;
      if (r.bannerTimer > 0) {
        r.bannerTimer = Math.max(0, r.bannerTimer - dt);
        if (r.bannerTimer === 0) r.bannerText = '';
      }
      if (r.shieldTimer > 0) r.shieldTimer = Math.max(0, r.shieldTimer - dt);
      if (r.stunTimer > 0) r.stunTimer = Math.max(0, r.stunTimer - dt);

      // Boost activation
      if (ctrl.boost && r.boostCharge >= 25 && r.boostTimer <= 0) {
        r.boostTimer = 1.6;
        r.boostCharge = Math.max(0, r.boostCharge - 35);
        r.bannerText = 'NITRO BOOST!';
        r.bannerTimer = 1.0;
        gameAudio.playBoost();
      }
      if (r.boostTimer > 0) {
        r.boostTimer = Math.max(0, r.boostTimer - dt);
      } else {
        r.boostCharge = Math.min(100, r.boostCharge + dt * 12);
      }

      const baseSegIndex = Math.floor(r.position / SEG_LEN) % LAP_SEGMENTS;
      const currentSeg = r.segments[baseSegIndex];

      // Speed & Steering Physics
      const maxSpeed = r.boostTimer > 0 ? 7400 : ctrl.up ? 5400 : 4500;
      const accel = r.boostTimer > 0 ? 5200 : 2100;
      if (r.stunTimer > 0) {
        r.speed = Math.max(1100, r.speed - 3600 * dt);
      } else if (r.speed < maxSpeed) {
        r.speed = Math.min(maxSpeed, r.speed + accel * dt);
      } else {
        r.speed = Math.max(maxSpeed, r.speed - 1800 * dt);
      }

      // Off-road beach sand drag
      if (Math.abs(r.playerX) > 0.96) {
        r.speed = Math.max(1600, r.speed - 2800 * dt);
      }

      const speedRatio = r.speed / 5400;
      const steerInput = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
      r.playerX += steerInput * 1.95 * Math.max(0.45, speedRatio) * dt;
      // Centrifugal drift on curves
      r.playerX -= currentSeg.curve * 0.19 * speedRatio * dt;
      r.playerX = Math.max(-1.35, Math.min(1.35, r.playerX));

      r.skyOffset += currentSeg.curve * speedRatio * dt * 28;
      r.position += r.speed * dt;
      r.score += Math.round(r.speed * dt * 0.015);

      // Lap Progression
      if (r.position >= trackLen) {
        r.position -= trackLen;
        if (r.lap >= TOTAL_LAPS) {
          // Race finished!
          r.score += 1000;
          gameAudio.playLap();
          const prev = loadBest();
          const nextBest: BuggyBestRecord = {
            bestScore: Math.max(prev.bestScore, r.score),
            bestTimeMs:
              prev.bestTimeMs === null
                ? Math.round(r.elapsedMs)
                : Math.min(prev.bestTimeMs, Math.round(r.elapsedMs)),
          };
          saveBest(nextBest);
          setBestRecord(nextBest);
          onScoreUpdate?.(nextBest);
          setHud({
            lap: TOTAL_LAPS,
            totalLaps: TOTAL_LAPS,
            elapsedMs: r.elapsedMs,
            speedKmh: Math.round(r.speed / 35),
            boostCharge: Math.round(r.boostCharge),
            boosting: false,
            shielded: r.shieldTimer > 0,
            score: r.score,
            bannerText: 'FINISH!',
          });
          setGameState('GAME_OVER');
          return;
        } else {
          r.lap += 1;
          r.score += 350;
          r.bannerText = `LAP ${r.lap}/${TOTAL_LAPS}!`;
          r.bannerTimer = 1.6;
          gameAudio.playLap();
          // Reset consumed objects for next lap
          for (const obj of r.objects) {
            obj.consumed = false;
          }
        }
      }

      // Track Object Collisions & Crab Movement
      const playerSeg = Math.floor(r.position / SEG_LEN) % LAP_SEGMENTS;
      for (const obj of r.objects) {
        if (obj.kind === 'crab') {
          obj.crabPhase += obj.crabSpeed * dt;
        }
        if (obj.consumed) continue;
        if (Math.abs(obj.segment - playerSeg) <= 1) {
          const objLane =
            obj.kind === 'crab'
              ? obj.laneX + Math.sin(obj.crabPhase) * 0.42
              : obj.laneX;
          if (Math.abs(r.playerX - objLane) < 0.24) {
            obj.consumed = true;
            if (obj.kind === 'boostpad') {
              r.boostTimer = Math.max(r.boostTimer, 1.3);
              r.score += 120;
              r.bannerText = 'TURBO PAD!';
              r.bannerTimer = 0.9;
              gameAudio.playBoost();
            } else if (obj.kind === 'mystery') {
              const roll = Math.random();
              gameAudio.playPickup();
              if (roll < 0.4) {
                r.boostTimer = 1.8;
                r.boostCharge = 100;
                r.bannerText = 'POWER-UP: MEGA NITRO!';
              } else if (roll < 0.75) {
                r.shieldTimer = 6.0;
                r.bannerText = 'POWER-UP: CRAB SHIELD!';
              } else {
                r.score += 300;
                r.bannerText = 'POWER-UP: +300 BONUS!';
              }
              r.bannerTimer = 1.4;
            } else {
              // Crab or Barrel collision
              if (r.shieldTimer > 0) {
                r.shieldTimer = 0;
                r.score += 75;
                r.bannerText = 'SHIELD BLOCKED HIT!';
                r.bannerTimer = 1.0;
                gameAudio.playPickup();
              } else {
                r.stunTimer = 0.55;
                r.speed = Math.max(1100, r.speed * 0.45);
                r.bannerText = obj.kind === 'crab' ? 'CRAB SNAP!' : 'BARREL CRASH!';
                r.bannerTimer = 1.0;
                gameAudio.playCrash();
              }
            }
          }
        }
      }

      // Sync React HUD
      hudAcc += dt;
      if (hudAcc >= 0.06) {
        hudAcc = 0;
        setHud({
          lap: r.lap,
          totalLaps: TOTAL_LAPS,
          elapsedMs: r.elapsedMs,
          speedKmh: Math.round(r.speed / 35),
          boostCharge: Math.round(r.boostCharge),
          boosting: r.boostTimer > 0,
          shielded: r.shieldTimer > 0,
          score: r.score,
          bannerText: r.bannerText,
        });
      }

      // ================= RENDER 3D PERSPECTIVE BEACH TRACK =================
      const horizonY = CANVAS_H * 0.44;

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.65, '#38bdf8');
      skyGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, horizonY);

      // Sun
      const sunX = CANVAS_W * 0.72 - (r.skyOffset % 220) * 0.25;
      ctx.beginPath();
      ctx.arc(sunX, horizonY - 75, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      // Distant Ocean Strip & Islands
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, horizonY - 12, CANVAS_W, 18);

      // Base beach sand ground
      ctx.fillStyle = '#e6c27a';
      ctx.fillRect(0, horizonY, CANVAS_W, CANVAS_H - horizonY);

      // Project road segments back-to-front
      const baseIndex = Math.floor(r.position / SEG_LEN);
      const basePercent = (r.position % SEG_LEN) / SEG_LEN;
      const baseSeg = r.segments[baseIndex % LAP_SEGMENTS];
      const baseY = baseSeg.y;

      let xCurve = 0;
      let dxCurve = -(baseSeg.curve * basePercent);
      let maxY = CANVAS_H;

      const projectedList: {
        segIdx: number;
        p1: ReturnType<typeof projectPoint>;
        p2: ReturnType<typeof projectPoint>;
      }[] = [];

      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const seg = r.segments[(baseIndex + n) % LAP_SEGMENTS];
        const z1 = n * SEG_LEN - basePercent * SEG_LEN;
        const z2 = (n + 1) * SEG_LEN - basePercent * SEG_LEN;

        const p1 = projectPoint(
          r.playerX * ROAD_HALF_W - xCurve,
          seg.y,
          z1,
          0,
          CAMERA_HEIGHT + baseY,
          0
        );
        xCurve += dxCurve;
        dxCurve += seg.curve;
        const nextSeg = r.segments[(baseIndex + n + 1) % LAP_SEGMENTS];
        const p2 = projectPoint(
          r.playerX * ROAD_HALF_W - xCurve,
          nextSeg.y,
          z2,
          0,
          CAMERA_HEIGHT + baseY,
          0
        );

        if (p1.screenY <= p2.screenY || p2.screenY >= maxY) continue;
        maxY = p2.screenY;

        const isAlt = Math.floor((baseIndex + n) / 2) % 2 === 0;
        // Ocean on far left, warm beach sand on right
        drawTrapezoid(
          ctx,
          0,
          p1.screenY,
          CANVAS_W * 2,
          0,
          p2.screenY,
          CANVAS_W * 2,
          isAlt ? '#eab668' : '#deb062'
        );

        // Ocean water strip on left shoulder
        ctx.fillStyle = isAlt ? '#0284c7' : '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(0, p1.screenY);
        ctx.lineTo(p1.screenX - p1.screenW * 1.45, p1.screenY);
        ctx.lineTo(p2.screenX - p2.screenW * 1.45, p2.screenY);
        ctx.lineTo(0, p2.screenY);
        ctx.closePath();
        ctx.fill();

        // Rumble curbs
        drawTrapezoid(
          ctx,
          p1.screenX,
          p1.screenY,
          p1.screenW * 1.08,
          p2.screenX,
          p2.screenY,
          p2.screenW * 1.08,
          isAlt ? '#ef4444' : '#ffffff'
        );

        // Track surface (packed coastal boardwalk)
        const isStartLine = (baseIndex + n) % LAP_SEGMENTS < 2;
        drawTrapezoid(
          ctx,
          p1.screenX,
          p1.screenY,
          p1.screenW,
          p2.screenX,
          p2.screenY,
          p2.screenW,
          isStartLine ? '#f8fafc' : isAlt ? '#3f3f46' : '#323238'
        );

        // Center dashed lane markings
        if (isAlt && !isStartLine) {
          drawTrapezoid(
            ctx,
            p1.screenX,
            p1.screenY,
            Math.max(2, p1.screenW * 0.025),
            p2.screenX,
            p2.screenY,
            Math.max(2, p2.screenW * 0.025),
            '#fde047'
          );
        }

        projectedList.push({ segIdx: (baseIndex + n) % LAP_SEGMENTS, p1, p2 });
      }

      // Draw roadside palm trees & track objects back-to-front
      for (let idx = projectedList.length - 1; idx >= 0; idx--) {
        const { segIdx, p1 } = projectedList[idx];
        const scale = Math.min(1.8, p1.screenW / 320);

        // Palm tree every 6 segments on right beach
        if (segIdx % 6 === 0 && scale > 0.06) {
          const px = p1.screenX + p1.screenW * 1.32;
          const py = p1.screenY;
          const trunkH = 95 * scale;
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = Math.max(2, 10 * scale);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(px + 10 * scale, py - trunkH * 0.5, px + 4 * scale, py - trunkH);
          ctx.stroke();

          // Fronds
          const topX = px + 4 * scale;
          const topY = py - trunkH;
          ctx.fillStyle = '#15803d';
          for (let f = 0; f < 5; f++) {
            const ang = -Math.PI + (f * Math.PI) / 4;
            ctx.beginPath();
            ctx.ellipse(
              topX + Math.cos(ang) * 22 * scale,
              topY + Math.sin(ang) * 10 * scale,
              24 * scale,
              7 * scale,
              ang * 0.4,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }

        // Track Objects on this segment
        for (const obj of r.objects) {
          if (obj.consumed || obj.segment !== segIdx || scale <= 0.05) continue;
          const lane =
            obj.kind === 'crab'
              ? obj.laneX + Math.sin(obj.crabPhase) * 0.42
              : obj.laneX;
          const ox = p1.screenX + lane * p1.screenW;
          const oy = p1.screenY;
          const sz = 28 * scale;

          if (obj.kind === 'boostpad') {
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.moveTo(ox - sz * 1.1, oy);
            ctx.lineTo(ox + sz * 1.1, oy);
            ctx.lineTo(ox + sz * 0.85, oy - sz * 0.65);
            ctx.lineTo(ox - sz * 0.85, oy - sz * 0.65);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#cffafe';
            ctx.lineWidth = Math.max(1, 2 * scale);
            ctx.stroke();
          } else if (obj.kind === 'mystery') {
            const floatY = oy - sz * 1.15 - Math.sin(now * 0.008) * 6 * scale;
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(ox - sz * 0.7, floatY - sz * 0.7, sz * 1.4, sz * 1.4);
            ctx.strokeStyle = '#fef3c7';
            ctx.lineWidth = Math.max(1.5, 2.5 * scale);
            ctx.strokeRect(ox - sz * 0.7, floatY - sz * 0.7, sz * 1.4, sz * 1.4);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(10, Math.round(sz * 0.95))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', ox, floatY);
          } else if (obj.kind === 'crab') {
            // Animated scuttling beach crab
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(ox, oy - sz * 0.45, sz * 0.78, sz * 0.48, 0, 0, Math.PI * 2);
            ctx.fill();
            // Claws
            ctx.beginPath();
            ctx.arc(ox - sz * 0.8, oy - sz * 0.85, sz * 0.28, 0, Math.PI * 2);
            ctx.arc(ox + sz * 0.8, oy - sz * 0.85, sz * 0.28, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ox - sz * 0.25, oy - sz * 0.72, sz * 0.14, 0, Math.PI * 2);
            ctx.arc(ox + sz * 0.25, oy - sz * 0.72, sz * 0.14, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Wooden barrel obstacle
            ctx.fillStyle = '#92400e';
            ctx.fillRect(ox - sz * 0.65, oy - sz * 1.25, sz * 1.3, sz * 1.25);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = Math.max(1, 2 * scale);
            ctx.strokeRect(ox - sz * 0.65, oy - sz * 1.25, sz * 1.3, sz * 1.25);
          }
        }
      }

      // Draw Player Dune Buggy (bottom center)
      const carX = CANVAS_W / 2;
      const bounce = Math.sin(now * 0.03) * (r.speed > 2000 ? 2 : 0.5);
      const carY = CANVAS_H - 68 + bounce;

      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(steerInput * 0.08);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 32, 62, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rear knobby tires
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(-56, -2, 22, 34, 6);
      ctx.roundRect(34, -2, 22, 34, 6);
      ctx.fill();

      // Buggy Chassis
      ctx.fillStyle = r.stunTimer > 0 ? '#ef4444' : '#2563eb';
      ctx.beginPath();
      ctx.roundRect(-38, -16, 76, 40, 10);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Roll cage & Driver Helmet
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, -18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-26, 2);
      ctx.lineTo(-16, -32);
      ctx.lineTo(16, -32);
      ctx.lineTo(26, 2);
      ctx.stroke();

      // Nitro exhaust flames when boosting
      if (r.boostTimer > 0) {
        const flameH = 16 + Math.random() * 14;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-22, 24);
        ctx.lineTo(-12, 24);
        ctx.lineTo(-17, 24 + flameH);
        ctx.moveTo(12, 24);
        ctx.lineTo(22, 24);
        ctx.lineTo(17, 24 + flameH);
        ctx.fill();
      }

      // Active Shield Bubble
      if (r.shieldTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, -4, 66, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.restore();

      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, onScoreUpdate]);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Race HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-[#121217] px-4 py-2.5 text-xs font-mono tabular-nums">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-zinc-400">LAP </span>
            <span className="text-zinc-100 font-semibold">
              {hud.lap}/{hud.totalLaps}
            </span>
          </div>
          <div>
            <span className="text-zinc-400">TIME </span>
            <span className="text-zinc-100 font-semibold">
              {formatRaceTime(hud.elapsedMs)}
            </span>
          </div>
          <div>
            <span className="text-zinc-400">SPEED </span>
            <span className="text-sky-400 font-semibold">{hud.speedKmh} km/h</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">BOOST</span>
            <svg
              viewBox="0 0 100 6"
              className="w-20 h-2 rounded-full bg-zinc-800 overflow-hidden"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width={hud.boostCharge}
                height="6"
                rx="3"
                className={hud.boosting ? 'fill-cyan-400' : 'fill-amber-400'}
              />
            </svg>
          </div>

          {hud.shielded && (
            <span className="inline-flex items-center gap-1 text-sky-400">
              <Shield className="w-3.5 h-3.5" />
              SHIELD
            </span>
          )}

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

      {/* Canvas Viewport + Mobile Touch Buttons */}
      <div className="relative rounded-xl border border-zinc-800 bg-[#09141d] overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-auto block"
        />

        {/* Dynamic Event Banner */}
        {gameState === 'PLAYING' && hud.bannerText && (
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-black/70 border border-white/15 font-display text-sm font-bold text-amber-300 tracking-wide shadow-lg">
            {hud.bannerText}
          </div>
        )}

        {/* Mobile Left / Right / Boost Touch Controls */}
        {gameState === 'PLAYING' && (
          <>
            <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  controlsRef.current.left = true;
                }}
                onPointerUp={() => {
                  controlsRef.current.left = false;
                }}
                onPointerLeave={() => {
                  controlsRef.current.left = false;
                }}
                onPointerCancel={() => {
                  controlsRef.current.left = false;
                }}
                className="w-14 h-14 rounded-xl border border-white/25 bg-black/45 active:bg-blue-600/80 text-white flex items-center justify-center touch-none shadow-lg"
                aria-label="Steer left"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  controlsRef.current.right = true;
                }}
                onPointerUp={() => {
                  controlsRef.current.right = false;
                }}
                onPointerLeave={() => {
                  controlsRef.current.right = false;
                }}
                onPointerCancel={() => {
                  controlsRef.current.right = false;
                }}
                className="w-14 h-14 rounded-xl border border-white/25 bg-black/45 active:bg-blue-600/80 text-white flex items-center justify-center touch-none shadow-lg"
                aria-label="Steer right"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                controlsRef.current.boost = true;
              }}
              onPointerUp={() => {
                controlsRef.current.boost = false;
              }}
              onPointerLeave={() => {
                controlsRef.current.boost = false;
              }}
              onPointerCancel={() => {
                controlsRef.current.boost = false;
              }}
              className="absolute bottom-4 right-4 w-20 h-14 rounded-xl border border-amber-400/70 bg-amber-500/80 active:bg-amber-400 text-zinc-950 font-display text-xs font-bold flex items-center justify-center gap-1 touch-none shadow-lg"
              aria-label="Activate nitro boost"
            >
              <Flame className="w-4 h-4 fill-current" />
              BOOST
            </button>
          </>
        )}

        {/* Title Menu */}
        {gameState === 'TITLE_MENU' && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-[#111116] p-6 text-center space-y-4 shadow-2xl">
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-bold text-zinc-100">
                  Beach Buggy Kart Race
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  3D-perspective coastal dune buggy race. Dodge scuttling crabs and barrels, hit cyan turbo pads, grab ? power-up boxes, and complete 3 laps as fast as possible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs bg-zinc-900/80 border border-zinc-800 rounded-lg p-3">
                <div>
                  <span className="font-semibold text-zinc-200 block">Desktop</span>
                  <span className="text-zinc-400">A/D or Arrows steer · Space boost</span>
                </div>
                <div>
                  <span className="font-semibold text-zinc-200 block">Mobile Touch</span>
                  <span className="text-zinc-400">On-screen Left / Right &amp; BOOST</span>
                </div>
              </div>

              {bestRecord.bestScore > 0 && (
                <div className="text-xs font-mono text-amber-400 tabular-nums">
                  Best Score: {bestRecord.bestScore}
                  {bestRecord.bestTimeMs !== null
                    ? ` · Fastest 3 Laps: ${formatRaceTime(bestRecord.bestTimeMs)}`
                    : ''}
                </div>
              )}

              <button
                type="button"
                onClick={startRace}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                Start 3-Lap Race
              </button>
            </div>
          </div>
        )}

        {/* Finish / Summary Overlay */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="max-w-sm w-full rounded-xl border border-zinc-800 bg-[#111116] p-6 text-center space-y-4 shadow-2xl">
              <div className="space-y-1">
                <h3 className="font-display text-xl font-bold text-zinc-100">
                  Race Complete!
                </h3>
                <p className="text-xs text-zinc-400 font-mono tabular-nums">
                  Finish Time: {formatRaceTime(hud.elapsedMs)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] text-zinc-400">SCORE</div>
                  <div className="text-lg font-bold text-blue-400">{hud.score}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400">BEST SCORE</div>
                  <div className="text-lg font-bold text-amber-400">
                    {bestRecord.bestScore}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={startRace}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Race Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
