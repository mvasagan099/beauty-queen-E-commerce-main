"use client";

import { useRef, useState } from "react";

interface TiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function TiltCard3D({ children, className = "", maxTilt = 10 }: TiltCard3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<{
    transform: string;
    glareX: number;
    glareY: number;
    active: boolean;
  }>({
    transform: "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    glareX: 50,
    glareY: 50,
    active: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotY = (px - 0.5) * maxTilt * 2;
    const rotX = (0.5 - py) * maxTilt * 2;

    setStyle({
      transform: `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`,
      glareX: Math.round(px * 100),
      glareY: Math.round(py * 100),
      active: true,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      glareX: 50,
      glareY: 50,
      active: false,
    });
  };

  return (
    <div className="perspective-1200">
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: style.transform,
          transition: style.active
            ? "transform 120ms cubic-bezier(0.22, 1, 0.36, 1)"
            : "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`relative preserve-3d motion-safe-3d ${className}`}
      >
        {children}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: style.active ? 1 : 0,
            background: `radial-gradient(circle at ${style.glareX}% ${style.glareY}%, rgba(212, 163, 83, 0.24), transparent 58%)`,
          }}
        />
      </div>
    </div>
  );
}
