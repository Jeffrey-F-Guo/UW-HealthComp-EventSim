// src/components/RegionMap.jsx
import React, { useEffect, useRef } from 'react';

const NODES = [
  { name: 'Seattle',    x: 0.22, y: 0.32 },
  { name: 'Spokane',    x: 0.78, y: 0.30 },
  { name: 'Tacoma',     x: 0.24, y: 0.48 },
  { name: 'Bellingham', x: 0.18, y: 0.15 },
  { name: 'Olympia',    x: 0.22, y: 0.60 },
  { name: 'Yakima',     x: 0.57, y: 0.52 },
];

const EDGES = [[0,1],[0,2],[0,3],[0,4],[1,5],[2,4],[2,5]];

function loadColor(load) {
  if (load > 0.75) return '#ff3b6b';
  if (load > 0.50) return '#ffaa00';
  return '#00ff9d';
}

export function RegionMap({ lastFrame }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      tRef.current += 0.04;
      const t = tRef.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Dot matrix background
      const cols = 26, rows = 16;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = W * 0.05 + W * 0.90 * c / (cols - 1);
          const y = H * 0.08 + H * 0.84 * r / (rows - 1);
          ctx.beginPath();
          ctx.arc(x, y, 0.7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,212,255,0.07)';
          ctx.fill();
        }
      }

      // State outline (abstract WA shape)
      ctx.beginPath();
      ctx.moveTo(W*0.06, H*0.12);
      ctx.lineTo(W*0.87, H*0.10);
      ctx.lineTo(W*0.93, H*0.52);
      ctx.lineTo(W*0.72, H*0.92);
      ctx.lineTo(W*0.10, H*0.90);
      ctx.lineTo(W*0.06, H*0.55);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(0,212,255,0.14)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,212,255,0.025)';
      ctx.fill();

      // Edges
      EDGES.forEach(([a, b]) => {
        const na = NODES[a], nb = NODES[b];
        const pulse = Math.sin(t + a * 0.5) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.moveTo(W * na.x, H * na.y);
        ctx.lineTo(W * nb.x, H * nb.y);
        ctx.strokeStyle = `rgba(0,212,255,${0.06 + pulse * 0.08})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Travelling packet dot
        const progress = (t * 0.3 + a * 0.37) % 1;
        const px = W * (na.x + (nb.x - na.x) * progress);
        const py = H * (na.y + (nb.y - na.y) * progress);
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${0.3 + pulse * 0.3})`;
        ctx.fill();
      });

      // Nodes
      NODES.forEach((node, i) => {
        const x = W * node.x, y = H * node.y;
        // Simulate a load value; in a real app you'd pass per-office data
        const load = 0.35 + 0.55 * ((Math.sin(t * 0.5 + i * 1.1) + 1) / 2);
        const color = loadColor(load);
        const pulse = Math.sin(t * 1.8 + i * 0.9) * 0.5 + 0.5;

        // Outer pulse ring
        ctx.beginPath();
        ctx.arc(x, y, 6 + pulse * 9, 0, Math.PI * 2);
        const ringAlpha = 0.35 - pulse * 0.28;
        ctx.strokeStyle = color.replace('#', 'rgba(').replace('ff3b6b', '255,59,107,').replace('ffaa00', '255,170,0,').replace('00ff9d', '0,255,157,') + ringAlpha + ')';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Core
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Load bar
        const bw = 32, bh = 3;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - bw/2, y + 8, bw, bh);
        ctx.fillStyle = color;
        ctx.fillRect(x - bw/2, y + 8, bw * load, bh);

        // Label
        ctx.fillStyle = 'rgba(200,220,240,0.75)';
        ctx.font = '7.5px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.name.toUpperCase(), x, y - 9);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="map-container glass-panel">
      <div className="panel-header">
        <span>Regional Node Status</span>
        <div className="panel-header-line" />
      </div>
      <canvas ref={canvasRef} className="map-canvas" />
    </div>
  );
}
