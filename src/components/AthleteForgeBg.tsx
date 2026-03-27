"use client";
import { useEffect, useRef } from "react";

const CHARS = ["0", "1", "|", "/", "\\", "-", "+", "·", "×", "≡", "░"];

// ─── Silhouette draw functions (normalized to cx, base, scale s) ───────────

type DC = CanvasRenderingContext2D;

function drawSnatchSquat(ctx: DC, cx: number, base: number, s: number) {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Head
  ctx.beginPath(); ctx.arc(cx, base - s * 0.91, s * 0.07, 0, Math.PI * 2); ctx.fill();
  // Torso upright
  ctx.lineWidth = s * 0.11;
  ctx.beginPath(); ctx.moveTo(cx, base - s * 0.84); ctx.lineTo(cx, base - s * 0.5); ctx.stroke();
  // Arms overhead
  ctx.lineWidth = s * 0.06;
  ctx.beginPath(); ctx.moveTo(cx - s*0.06, base - s*0.8); ctx.lineTo(cx - s*0.32, base - s*1.02); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s*0.06, base - s*0.8); ctx.lineTo(cx + s*0.32, base - s*1.02); ctx.stroke();
  // Bar overhead
  ctx.lineWidth = s * 0.04;
  ctx.beginPath(); ctx.moveTo(cx - s*0.6, base - s*1.04); ctx.lineTo(cx + s*0.6, base - s*1.04); ctx.stroke();
  // Plates
  ctx.lineWidth = s * 0.1;
  [[cx - s*0.52, cx - s*0.52], [cx + s*0.52, cx + s*0.52]].forEach(([px]) => {
    ctx.beginPath(); ctx.moveTo(px, base - s*1.12); ctx.lineTo(px, base - s*0.95); ctx.stroke();
  });
  // Legs (wide squat)
  ctx.lineWidth = s * 0.1;
  ctx.beginPath(); ctx.moveTo(cx, base - s*0.5); ctx.lineTo(cx - s*0.3, base - s*0.24); ctx.lineTo(cx - s*0.22, base); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, base - s*0.5); ctx.lineTo(cx + s*0.3, base - s*0.24); ctx.lineTo(cx + s*0.22, base); ctx.stroke();
}

function drawDeadlift(ctx: DC, cx: number, base: number, s: number) {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  // Head (forward lean)
  ctx.beginPath(); ctx.arc(cx - s*0.06, base - s*0.92, s*0.07, 0, Math.PI*2); ctx.fill();
  // Torso bent
  ctx.lineWidth = s * 0.11;
  ctx.beginPath(); ctx.moveTo(cx - s*0.06, base - s*0.85); ctx.bezierCurveTo(cx+s*0.1, base-s*0.72, cx+s*0.18, base-s*0.55, cx+s*0.1, base-s*0.44); ctx.stroke();
  // Arms down
  ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.moveTo(cx - s*0.06, base-s*0.78); ctx.lineTo(cx - s*0.28, base-s*0.34); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s*0.1, base-s*0.72); ctx.lineTo(cx + s*0.3, base-s*0.34); ctx.stroke();
  // Bar
  ctx.lineWidth = s * 0.04;
  ctx.beginPath(); ctx.moveTo(cx - s*0.58, base-s*0.32); ctx.lineTo(cx + s*0.58, base-s*0.32); ctx.stroke();
  ctx.lineWidth = s * 0.1;
  [cx - s*0.5, cx + s*0.5].forEach(px => {
    ctx.beginPath(); ctx.moveTo(px, base-s*0.44); ctx.lineTo(px, base-s*0.2); ctx.stroke();
  });
  // Legs
  ctx.lineWidth = s * 0.1;
  ctx.beginPath(); ctx.moveTo(cx+s*0.05, base-s*0.44); ctx.lineTo(cx-s*0.08, base-s*0.2); ctx.lineTo(cx-s*0.04, base); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+s*0.1, base-s*0.44); ctx.lineTo(cx+s*0.2, base-s*0.18); ctx.lineTo(cx+s*0.14, base); ctx.stroke();
}

function drawRopeClimb(ctx: DC, cx: number, base: number, s: number) {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  // Rope
  ctx.lineWidth = s * 0.03;
  ctx.beginPath(); ctx.moveTo(cx+s*0.02, base - s*1.25); ctx.lineTo(cx+s*0.02, base); ctx.stroke();
  // Head
  ctx.beginPath(); ctx.arc(cx, base-s*0.98, s*0.07, 0, Math.PI*2); ctx.fill();
  // Body
  ctx.lineWidth = s * 0.11;
  ctx.beginPath(); ctx.moveTo(cx, base-s*0.9); ctx.bezierCurveTo(cx+s*0.08, base-s*0.7, cx, base-s*0.58, cx-s*0.04, base-s*0.52); ctx.stroke();
  // Arms up
  ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.moveTo(cx-s*0.04, base-s*0.86); ctx.lineTo(cx-s*0.1, base-s*1.08); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+s*0.06, base-s*0.86); ctx.lineTo(cx+s*0.12, base-s*1.08); ctx.stroke();
  // Legs bent (S-hook)
  ctx.lineWidth = s * 0.09;
  ctx.beginPath(); ctx.moveTo(cx-s*0.04, base-s*0.52); ctx.bezierCurveTo(cx-s*0.18,base-s*0.36,cx-s*0.12,base-s*0.2,cx+s*0.04,base-s*0.16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-s*0.04, base-s*0.52); ctx.bezierCurveTo(cx+s*0.1,base-s*0.4,cx+s*0.14,base-s*0.22,cx+s*0.04,base-s*0.16); ctx.stroke();
}

function drawKBSwing(ctx: DC, cx: number, base: number, s: number) {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  // Head
  ctx.beginPath(); ctx.arc(cx+s*0.05, base-s*0.95, s*0.07, 0, Math.PI*2); ctx.fill();
  // Torso (hip-hinge)
  ctx.lineWidth = s * 0.11;
  ctx.beginPath(); ctx.moveTo(cx+s*0.05, base-s*0.88); ctx.bezierCurveTo(cx+s*0.08,base-s*0.7,cx,base-s*0.58,cx-s*0.08,base-s*0.5); ctx.stroke();
  // Arms forward
  ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.moveTo(cx+s*0.04, base-s*0.8); ctx.lineTo(cx-s*0.3, base-s*0.72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+s*0.04, base-s*0.8); ctx.lineTo(cx-s*0.3, base-s*0.64); ctx.stroke();
  // KB
  ctx.beginPath(); ctx.arc(cx-s*0.4, base-s*0.68, s*0.09, 0, Math.PI*2); ctx.fill();
  ctx.lineWidth = s * 0.035;
  ctx.beginPath(); ctx.arc(cx-s*0.4, base-s*0.78, s*0.07, Math.PI, 0); ctx.stroke();
  // Legs
  ctx.lineWidth = s * 0.1;
  ctx.beginPath(); ctx.moveTo(cx-s*0.08, base-s*0.5); ctx.lineTo(cx-s*0.18, base-s*0.22); ctx.lineTo(cx-s*0.12, base); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-s*0.08, base-s*0.5); ctx.lineTo(cx+s*0.12, base-s*0.22); ctx.lineTo(cx+s*0.08, base); ctx.stroke();
}

function drawBoxJump(ctx: DC, cx: number, base: number, s: number) {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  // Box
  ctx.lineWidth = s * 0.04;
  ctx.strokeRect(cx - s*0.22, base - s*0.25, s*0.44, s*0.25);
  const bTop = base - s*0.25;
  // Head
  ctx.beginPath(); ctx.arc(cx, bTop - s*0.72, s*0.07, 0, Math.PI*2); ctx.fill();
  // Torso
  ctx.lineWidth = s * 0.11;
  ctx.beginPath(); ctx.moveTo(cx, bTop - s*0.64); ctx.lineTo(cx, bTop - s*0.36); ctx.stroke();
  // Arms
  ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.moveTo(cx-s*0.04, bTop-s*0.58); ctx.lineTo(cx-s*0.22, bTop-s*0.74); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+s*0.04, bTop-s*0.58); ctx.lineTo(cx+s*0.22, bTop-s*0.74); ctx.stroke();
  // Legs
  ctx.lineWidth = s * 0.1;
  ctx.beginPath(); ctx.moveTo(cx, bTop-s*0.36); ctx.lineTo(cx-s*0.1, bTop); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, bTop-s*0.36); ctx.lineTo(cx+s*0.1, bTop); ctx.stroke();
}

function drawStanding(ctx: DC, cx: number, base: number, s: number) {
  ctx.fillStyle = "white";
  ctx.strokeStyle = "white";
  ctx.lineCap = "round";
  // Head
  ctx.beginPath(); ctx.arc(cx, base-s*0.93, s*0.07, 0, Math.PI*2); ctx.fill();
  // Torso
  ctx.lineWidth = s * 0.11;
  ctx.beginPath(); ctx.moveTo(cx, base-s*0.86); ctx.lineTo(cx, base-s*0.5); ctx.stroke();
  // Arms relaxed
  ctx.lineWidth = s * 0.065;
  ctx.beginPath(); ctx.moveTo(cx-s*0.06, base-s*0.82); ctx.lineTo(cx-s*0.2, base-s*0.54); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+s*0.06, base-s*0.82); ctx.lineTo(cx+s*0.2, base-s*0.54); ctx.stroke();
  // Legs
  ctx.lineWidth = s * 0.1;
  ctx.beginPath(); ctx.moveTo(cx, base-s*0.5); ctx.lineTo(cx-s*0.12, base-s*0.24); ctx.lineTo(cx-s*0.1, base); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, base-s*0.5); ctx.lineTo(cx+s*0.12, base-s*0.24); ctx.lineTo(cx+s*0.1, base); ctx.stroke();
}

// All draw functions
const DRAW_FNS = [drawSnatchSquat, drawDeadlift, drawRopeClimb, drawKBSwing, drawBoxJump, drawStanding];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AthleteForgeBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CELL = 14;     // cell size (square-ish)
    const CELL_H = 20;

    let animId: number;
    let scanY = -0.05; // normalized 0..1

    type Cell = { char: string; inSilhouette: boolean };
    let grid: Cell[][] = [];
    let cols = 0, rows = 0;

    // Each athlete slot
    type Athlete = { fn: typeof DRAW_FNS[0]; cx: number; base: number; s: number };
    let athletes: Athlete[] = [];

    /** Randomize athlete positions on init/resize */
    const placeAthletes = (W: number, H: number) => {
      const count = 5 + Math.floor(Math.random() * 3); // 5–7 athletes
      athletes = [];
      for (let i = 0; i < count; i++) {
        athletes.push({
          fn: DRAW_FNS[Math.floor(Math.random() * DRAW_FNS.length)],
          cx: (0.1 + Math.random() * 0.8) * W,
          base: (0.65 + Math.random() * 0.35) * H,
          s: (0.12 + Math.random() * 0.18) * H,
        });
      }
    };

    /** Draw all athletes (silhouette only) to an offscreen canvas */
    const renderSilhouetteMask = (W: number, H: number): ImageData => {
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const oCtx = off.getContext("2d")!;
      oCtx.fillStyle = "#000";
      oCtx.fillRect(0, 0, W, H);
      // Minimal blur for crispness
      oCtx.filter = "blur(3px)";
      oCtx.fillStyle = "white";
      oCtx.strokeStyle = "white";
      athletes.forEach(a => a.fn(oCtx, a.cx, a.base, a.s));
      oCtx.filter = "none";
      return oCtx.getImageData(0, 0, W, H);
    };

    const buildGrid = (W: number, H: number) => {
      cols = Math.ceil(W / CELL) + 1;
      rows = Math.ceil(H / CELL_H) + 1;
      const data = renderSilhouetteMask(W, H).data;
      grid = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
          const px = Math.min(W-1, Math.floor(c * CELL + CELL/2));
          const py = Math.min(H-1, Math.floor(r * CELL_H + CELL_H/2));
          const b = data[(py * W + px) * 4];
          grid[r][c] = {
            char: CHARS[Math.floor(Math.random() * CHARS.length)],
            inSilhouette: b > 15,
          };
        }
      }
    };

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      placeAthletes(canvas.width, canvas.height);
      buildGrid(canvas.width, canvas.height);
    };

    init();
    window.addEventListener("resize", init);

    let lastSwap = 0;

    const render = (ts: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const scanPx = scanY * H;
      // Half-width of the "reveal zone" on each side of the laser
      const REVEAL_HALF = 48;
      const CORE_HALF = 14;

      ctx.font = `bold ${Math.round(CELL_H * 0.62)}px 'Courier New', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r]?.[c];
          if (!cell) continue;
          if (!cell.inSilhouette) continue; // outside silhouette: render nothing

          const x = c * CELL + CELL / 2;
          const y = r * CELL_H + CELL_H / 2;
          const dist = Math.abs(y - scanPx);

          if (dist > REVEAL_HALF) continue; // hidden until laser passes

          const scanFactor = Math.max(0, 1 - dist / REVEAL_HALF);
          const coreFactor = Math.max(0, 1 - dist / CORE_HALF);

          let rr: number, gg: number, bb: number, alpha: number;

          if (coreFactor > 0) {
            // Core — bright red
            rr = 227; gg = 27; bb = 35;
            alpha = 0.15 + coreFactor * 0.85;
          } else {
            // Halo — fading white-red
            rr = 240; gg = 140; bb = 130;
            alpha = scanFactor * 0.6;
          }

          ctx.fillStyle = `rgba(${rr},${gg},${bb},${Math.min(0.95, alpha)})`;
          ctx.fillText(cell.char, x, y);
        }
      }

      // ── LASER: thin 1px line with subtle glow ──
      // Outer soft glow
      const gOuter = ctx.createLinearGradient(0, scanPx - 12, 0, scanPx + 12);
      gOuter.addColorStop(0, "rgba(227,27,35,0)");
      gOuter.addColorStop(0.5, "rgba(227,27,35,0.12)");
      gOuter.addColorStop(1, "rgba(227,27,35,0)");
      ctx.fillStyle = gOuter;
      ctx.fillRect(0, scanPx - 12, W, 24);

      // Inner glow
      const gInner = ctx.createLinearGradient(0, scanPx - 3, 0, scanPx + 3);
      gInner.addColorStop(0, "rgba(255,80,80,0)");
      gInner.addColorStop(0.5, "rgba(255,80,80,0.35)");
      gInner.addColorStop(1, "rgba(255,80,80,0)");
      ctx.fillStyle = gInner;
      ctx.fillRect(0, scanPx - 3, W, 6);

      // Core laser line (1px, sharp)
      ctx.fillStyle = "rgba(255, 60, 60, 0.85)";
      ctx.fillRect(0, scanPx - 0.5, W, 1);

      // ── Char refresh ──
      if (ts - lastSwap > 120) {
        const count = Math.floor(cols * rows * 0.003);
        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          if (grid[r]?.[c]) grid[r][c].char = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        lastSwap = ts;
      }

      scanY += 0.00055;
      if (scanY > 1.1) {
        // Random re-scatter on each loop
        scanY = -0.05;
        placeAthletes(W, H);
        buildGrid(W, H);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
    />
  );
}
