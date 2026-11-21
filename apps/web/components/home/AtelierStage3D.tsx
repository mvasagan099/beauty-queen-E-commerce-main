"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { AtelierDepartmentId } from "./atelier-data";

interface AtelierStage3DProps {
  department: AtelierDepartmentId;
  className?: string;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Particle3D {
  angle: number;
  radius: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

function rotatePoint(p: Vec3, rx: number, ry: number): Vec3 {
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

function projectPoint(p: Vec3, cx: number, cy: number, fov: number) {
  const dist = fov / (fov + p.z + 360);
  return {
    x: cx + p.x * dist,
    y: cy + p.y * dist,
    scale: dist,
    z: p.z,
  };
}

export function AtelierStage3D({ department, className = "" }: AtelierStage3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const stateRef = useRef({
    rotX: 0.24,
    rotY: -0.4,
    targetRotX: 0.24,
    targetRotY: -0.4,
    dragging: false,
    lastX: 0,
    lastY: 0,
    time: 0,
    autoRotate: true,
    department,
  });

  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    stateRef.current.department = department;
    // Give a gentle rotational flourish when switching collections
    stateRef.current.targetRotY += 0.65;
  }, [department]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      stateRef.current.autoRotate = false;
      setAutoRotate(false);
    }

    const particles: Particle3D[] = Array.from({ length: 44 }, (_, i) => ({
      angle: (i / 44) * Math.PI * 2,
      radius: 135 + (i % 7) * 18,
      y: ((i % 9) - 4) * 34,
      speed: 0.003 + (i % 5) * 0.0012,
      size: 1.1 + (i % 3) * 0.85,
      alpha: 0.22 + (i % 4) * 0.14,
    }));

    let rafId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const drawRibbonMesh = (
      cx: number,
      cy: number,
      fov: number,
      t: number,
      rx: number,
      ry: number,
      variant: "saree" | "top",
    ) => {
      const cols = 28;
      const rows = 14;
      const grid: { x: number; y: number; z: number; sx: number; sy: number }[][] = [];

      for (let r = 0; r <= rows; r++) {
        const v = (r / rows) * 2 - 1;
        const rowPts = [];
        for (let c = 0; c <= cols; c++) {
          const u = (c / cols) * 2 - 1;
          let x: number;
          let y: number;
          let z: number;

          if (variant === "saree") {
            const wave = Math.sin(u * 3.1 + t * 1.25 + v * 1.4) * 34;
            const fold = Math.cos(u * 5.2 - t * 0.9) * 14 * Math.abs(v);
            x = u * 165 + Math.sin(v * 2.2 + t * 0.7) * 18;
            y = v * 115 + Math.sin(u * 2.4 + t) * 22;
            z = wave + fold;
          } else {
            // Twisted satin Mobius-like ribbon
            const theta = u * Math.PI;
            const halfTwist = theta * 0.5;
            const rMajor = 112;
            const wRibbon = v * 46;
            x = (rMajor + wRibbon * Math.cos(halfTwist)) * Math.cos(theta);
            y = wRibbon * Math.sin(halfTwist) + Math.sin(theta * 2 + t * 1.4) * 16;
            z = (rMajor + wRibbon * Math.cos(halfTwist)) * Math.sin(theta);
          }

          const rot = rotatePoint({ x, y, z }, rx, ry);
          const proj = projectPoint(rot, cx, cy, fov);
          rowPts.push({ x: rot.x, y: rot.y, z: rot.z, sx: proj.x, sy: proj.y });
        }
        grid.push(rowPts);
      }

      const quads: {
        pts: { sx: number; sy: number }[];
        avgZ: number;
        light: number;
        isBorder: boolean;
      }[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p00 = grid[r][c];
          const p10 = grid[r][c + 1];
          const p11 = grid[r + 1][c + 1];
          const p01 = grid[r + 1][c];

          const ux = p10.x - p00.x;
          const uy = p10.y - p00.y;
          const uz = p10.z - p00.z;
          const vx = p01.x - p00.x;
          const vy = p01.y - p00.y;
          const vz = p01.z - p00.z;

          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          const nLen = Math.hypot(nx, ny, nz) || 1;

          // Directional studio key light from top-front-right
          const dot = Math.abs((nx * 0.42 + ny * -0.55 + nz * 0.72) / nLen);
          const isBorder = r === 0 || r === 1 || r === rows - 1 || r === rows - 2;

          quads.push({
            pts: [p00, p10, p11, p01],
            avgZ: (p00.z + p10.z + p11.z + p01.z) * 0.25,
            light: dot,
            isBorder,
          });
        }
      }

      quads.sort((a, b) => b.avgZ - a.avgZ);

      for (const q of quads) {
        const spec = Math.pow(q.light, 3.2);
        let fill: string;
        if (q.isBorder && variant === "saree") {
          const l = Math.round(42 + q.light * 30 + spec * 18);
          fill = `hsl(39, 66%, ${Math.min(82, l)}%)`;
        } else if (variant === "saree") {
          const l = Math.round(18 + q.light * 26 + spec * 24);
          fill = `hsl(344, 72%, ${Math.min(72, l)}%)`;
        } else {
          const l = Math.round(36 + q.light * 30 + spec * 20);
          fill = `hsl(350, 38%, ${Math.min(84, l)}%)`;
        }

        ctx.beginPath();
        ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
        ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
        ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
        ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();

        if (q.isBorder && variant === "saree") {
          ctx.strokeStyle = "rgba(244, 212, 139, 0.35)";
          ctx.lineWidth = 0.6;
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(212, 163, 83, ${0.06 + spec * 0.22})`;
          ctx.lineWidth = 0.45;
          ctx.stroke();
        }
      }
    };

    const drawCosmeticsFlacon = (
      cx: number,
      cy: number,
      fov: number,
      t: number,
      rx: number,
      ry: number,
    ) => {
      const facets: { pts: { sx: number; sy: number }[]; avgZ: number; fill: string; stroke: string }[] = [];
      const sides = 8;

      const addCylinderBand = (
        yTop: number,
        yBot: number,
        rTop: number,
        rBot: number,
        xOffset: number,
        hue: number,
        sat: number,
        baseLight: number,
        metallic: boolean,
        alpha = 0.94,
      ) => {
        for (let i = 0; i < sides; i++) {
          const a0 = (i / sides) * Math.PI * 2;
          const a1 = ((i + 1) / sides) * Math.PI * 2;
          const raw = [
            { x: xOffset + Math.cos(a0) * rTop, y: yTop, z: Math.sin(a0) * rTop },
            { x: xOffset + Math.cos(a1) * rTop, y: yTop, z: Math.sin(a1) * rTop },
            { x: xOffset + Math.cos(a1) * rBot, y: yBot, z: Math.sin(a1) * rBot },
            { x: xOffset + Math.cos(a0) * rBot, y: yBot, z: Math.sin(a0) * rBot },
          ];
          const rot = raw.map((p) => rotatePoint(p, rx, ry));
          const proj = rot.map((p) => projectPoint(p, cx, cy, fov));

          const midAngle = (a0 + a1) * 0.5 + ry;
          const light = 0.5 + 0.5 * Math.cos(midAngle - 0.6);
          const spec = Math.pow(light, metallic ? 3.5 : 2.2);
          const l = Math.min(88, Math.round(baseLight + light * 24 + spec * 28));

          facets.push({
            pts: proj.map((p) => ({ sx: p.x, sy: p.y })),
            avgZ: (rot[0].z + rot[1].z + rot[2].z + rot[3].z) * 0.25,
            fill: `hsla(${hue}, ${sat}%, ${l}%, ${alpha})`,
            stroke: metallic
              ? `rgba(248, 224, 165, ${0.32 + spec * 0.45})`
              : `rgba(244, 212, 139, ${0.18 + spec * 0.35})`,
          });
        }
      };

      const bob = Math.sin(t * 1.4) * 8;
      // Faceted crystal serum bottle (right-center)
      addCylinderBand(-98 + bob, -66 + bob, 26, 18, 28, 39, 55, 58, true, 0.78);
      addCylinderBand(-66 + bob, -46 + bob, 14, 16, 28, 39, 64, 48, true, 0.92);
      addCylinderBand(-46 + bob, -28 + bob, 16, 54, 28, 38, 62, 42, true, 0.8);
      addCylinderBand(-28 + bob, 78 + bob, 54, 50, 28, 38, 68, 36, false, 0.76);
      addCylinderBand(78 + bob, 92 + bob, 50, 40, 28, 38, 52, 26, true, 0.9);

      // Matte velvet crimson lipstick & brushed gold case (left-front)
      const bob2 = Math.cos(t * 1.4) * 7;
      addCylinderBand(-74 + bob2, -30 + bob2, 13, 18, -58, 344, 78, 30, false, 0.96);
      addCylinderBand(-30 + bob2, 22 + bob2, 20, 20, -58, 40, 62, 44, true, 0.96);
      addCylinderBand(22 + bob2, 92 + bob2, 23, 23, -58, 340, 42, 18, true, 0.98);

      facets.sort((a, b) => b.avgZ - a.avgZ);

      for (const f of facets) {
        ctx.beginPath();
        ctx.moveTo(f.pts[0].sx, f.pts[0].sy);
        ctx.lineTo(f.pts[1].sx, f.pts[1].sy);
        ctx.lineTo(f.pts[2].sx, f.pts[2].sy);
        ctx.lineTo(f.pts[3].sx, f.pts[3].sy);
        ctx.closePath();
        ctx.fillStyle = f.fill;
        ctx.fill();
        ctx.strokeStyle = f.stroke;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    };

    const drawMedallionOrRings = (
      cx: number,
      cy: number,
      fov: number,
      t: number,
      rx: number,
      ry: number,
      mode: "kurthi" | "leggin",
    ) => {
      const rings = mode === "kurthi" ? 5 : 4;
      const segments = 48;

      for (let ring = 0; ring < rings; ring++) {
        const radius = mode === "kurthi" ? 42 + ring * 26 : 62 + ring * 22;
        const tilt = mode === "kurthi" ? (ring % 2 === 0 ? 0.2 : -0.2) : ring * 0.52 + t * 0.35;
        const projected: { x: number; y: number; z: number }[] = [];

        for (let s = 0; s <= segments; s++) {
          const a = (s / segments) * Math.PI * 2;
          const petal =
            mode === "kurthi"
              ? Math.sin(a * (6 + ring * 2) + t * 1.1) * (10 + ring * 2.5)
              : Math.sin(a * 3 + t * 1.8 + ring) * 14;

          const baseX = (radius + petal) * Math.cos(a);
          const baseY = (radius + petal) * Math.sin(a) * Math.cos(tilt);
          const baseZ = (radius + petal) * Math.sin(a) * Math.sin(tilt) + Math.cos(a * 4 + t) * 12;

          const rot = rotatePoint({ x: baseX, y: baseY, z: baseZ }, rx, ry);
          const proj = projectPoint(rot, cx, cy, fov);
          projected.push({ x: proj.x, y: proj.y, z: rot.z });
        }

        ctx.beginPath();
        projected.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();

        if (mode === "kurthi") {
          ctx.strokeStyle = ring % 2 === 0 ? "rgba(227, 194, 138, 0.85)" : "rgba(244, 228, 214, 0.65)";
          ctx.lineWidth = ring === rings - 1 ? 2.1 : 1.35;
        } else {
          ctx.strokeStyle = ring % 2 === 0 ? "rgba(181, 30, 72, 0.88)" : "rgba(217, 169, 88, 0.82)";
          ctx.lineWidth = 3.2 - ring * 0.35;
        }
        ctx.stroke();

        // Mirror-work embroidered jewel dots along kurthi petals
        if (mode === "kurthi" && ring >= 1) {
          for (let s = 0; s < segments; s += 6) {
            const pt = projected[s];
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 241, 214, 0.9)";
            ctx.fill();
          }
        }
      }
    };

    const drawOrbitHalo = (cx: number, cy: number, fov: number, rx: number, ry: number, t: number) => {
      const steps = 72;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const p = rotatePoint(
          {
            x: Math.cos(a) * 172,
            y: Math.sin(a * 2 + t * 0.4) * 18,
            z: Math.sin(a) * 172,
          },
          rx + 0.35,
          ry * 0.7,
        );
        const proj = projectPoint(p, cx, cy, fov);
        if (i === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      }
      ctx.strokeStyle = "rgba(212, 163, 83, 0.24)";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const render = () => {
      const st = stateRef.current;
      if (!reducedMotion) {
        st.time += 0.016;
        if (st.autoRotate && !st.dragging) {
          st.targetRotY += 0.0045;
        }
      }

      st.rotX += (st.targetRotX - st.rotX) * 0.08;
      st.rotY += (st.targetRotY - st.rotY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      const fov = Math.min(width, height) * 1.15;

      // Subtle warm studio rim spotlight behind the 3D sculpture
      const glow = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.min(width, height) * 0.52);
      glow.addColorStop(0, "rgba(212, 163, 83, 0.22)");
      glow.addColorStop(0.45, "rgba(168, 28, 68, 0.16)");
      glow.addColorStop(1, "rgba(26, 11, 16, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Orbiting zari gold dust behind/around object
      for (const pt of particles) {
        if (!reducedMotion) pt.angle += pt.speed;
        const raw = {
          x: Math.cos(pt.angle) * pt.radius,
          y: pt.y + Math.sin(st.time + pt.angle) * 6,
          z: Math.sin(pt.angle) * pt.radius,
        };
        const rot = rotatePoint(raw, st.rotX * 0.6, st.rotY * 0.6);
        const proj = projectPoint(rot, cx, cy, fov);
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, Math.max(0.7, pt.size * proj.scale), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 193, 120, ${pt.alpha * Math.min(1, proj.scale)})`;
        ctx.fill();
      }

      drawOrbitHalo(cx, cy, fov, st.rotX, st.rotY, st.time);

      if (st.department === "saree") {
        drawRibbonMesh(cx, cy, fov, st.time, st.rotX, st.rotY, "saree");
      } else if (st.department === "top") {
        drawRibbonMesh(cx, cy, fov, st.time, st.rotX, st.rotY, "top");
      } else if (st.department === "cosmetics") {
        drawCosmeticsFlacon(cx, cy, fov, st.time, st.rotX, st.rotY);
      } else if (st.department === "kurthi") {
        drawMedallionOrRings(cx, cy, fov, st.time, st.rotX, st.rotY, "kurthi");
      } else {
        drawMedallionOrRings(cx, cy, fov, st.time, st.rotX, st.rotY, "leggin");
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.dragging) return;
    const dx = e.clientX - stateRef.current.lastX;
    const dy = e.clientY - stateRef.current.lastY;
    stateRef.current.lastX = e.clientX;
    stateRef.current.lastY = e.clientY;
    stateRef.current.targetRotY += dx * 0.011;
    stateRef.current.targetRotX = Math.max(-1.1, Math.min(1.1, stateRef.current.targetRotX + dy * 0.008));
  };

  const handlePointerUp = () => {
    stateRef.current.dragging = false;
    setIsDragging(false);
  };

  const handleResetView = () => {
    stateRef.current.targetRotX = 0.24;
    stateRef.current.targetRotY = -0.4;
  };

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Interactive 3D couture sculpture. Drag to rotate 360 degrees."
        className={`w-full h-full block touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="text-xs text-[#E7D8CB]/80 bg-[#1A0B10]/70 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#D4A353]/25">
          Drag to orbit 360°
        </span>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setAutoRotate((prev) => !prev)}
            aria-label={autoRotate ? "Pause 3D rotation" : "Play 3D rotation"}
            className="p-1.5 rounded-md bg-[#1A0B10]/75 text-[#FBF7F2] border border-[#D4A353]/30 hover:border-[#D4A353] transition-colors"
            title={autoRotate ? "Pause rotation" : "Play rotation"}
          >
            {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset 3D camera view"
            className="p-1.5 rounded-md bg-[#1A0B10]/75 text-[#FBF7F2] border border-[#D4A353]/30 hover:border-[#D4A353] transition-colors"
            title="Reset angle"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
