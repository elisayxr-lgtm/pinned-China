'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff, Minus, Plus, RotateCcw } from 'lucide-react';

type Point = { x: number; y: number };
type Transform = Point & { zoom: number };
export type MapLabel = { name: string; x: number; y: number };
export type MapPinData = MapLabel & { photo: ReactNode; onOpen: () => void };

function overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 4;
}

// Layout in screen pixels, so labels and photo cards remain legible at every zoom.
function arrange<T extends MapLabel>(items: T[], w: number, h: number, zoom: number, photo: boolean, obstacles: { x: number; y: number; w: number; h: number }[] = [], marginY = 0) {
  const occupied = [...obstacles];
  return items.map((item) => {
    const anchor = { x: item.x * w * zoom, y: item.y * h * zoom };
    const box = { ...anchor, w: photo ? 76 : item.name.length * 14 + 12, h: photo ? 84 : 24 };
    let best = { ...box };
    let found = false;
    for (let radius = 0; radius <= (photo ? 220 : 40) && !found; radius += 20) {
      for (let step = 0; step < (radius ? 16 : 1); step++) {
        const angle = Math.PI * 2 * step / 16;
        const candidate = { ...box, x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius };
        if (candidate.x < box.w / 2 || candidate.x > w * zoom - box.w / 2 || candidate.y < box.h / 2 - marginY || candidate.y > h * zoom - box.h / 2 + marginY) continue;
        if (!occupied.some((other) => overlap(candidate, other))) { best = candidate; found = true; break; }
      }
    }
    if (found || photo) occupied.push(best);
    return { ...item, placed: found, box: best, left: best.x / zoom, top: best.y / zoom, anchor };
  });
}

export function TravelMap({ aspect, children, labels, pins, showPhotos, onTogglePhotos }: {
  aspect: number; children: ReactNode; labels: MapLabel[]; pins: MapPinData[];
  showPhotos: boolean; onTogglePhotos: () => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 640 });
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, zoom: 1 });
  const current = useRef(transform);
  const pointers = useRef(new Map<number, Point>());
  const dragged = useRef(false);
  const gestureDistance = useRef(0);
  const fitWidth = Math.min(size.width, size.height * aspect);
  const fitHeight = fitWidth / aspect;
  const apply = (next: Transform) => {
    const zoom = Math.max(1, Math.min(5, next.zoom));
    const limitX = Math.max(0, (fitWidth * zoom - size.width) / 2 + 60);
    const limitY = Math.max(0, (fitHeight * zoom - size.height) / 2 + 60);
    const value = { zoom, x: Math.max(-limitX, Math.min(limitX, next.x)), y: Math.max(-limitY, Math.min(limitY, next.y)) };
    current.current = value; setTransform(value);
  };
  const changeZoom = (factor: number, anchor: Point = { x: 0, y: 0 }) => {
    const before = current.current;
    const zoom = Math.max(1, Math.min(5, before.zoom * factor));
    const ratio = zoom / before.zoom;
    apply({ zoom, x: anchor.x - (anchor.x - before.x) * ratio, y: anchor.y - (anchor.y - before.y) * ratio });
  };
  const zoomRef = useRef(changeZoom);
  zoomRef.current = changeZoom;
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomRef.current(Math.exp(-Math.max(-100, Math.min(100, event.deltaY * (event.deltaMode === 1 ? 16 : 1))) * .003));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); element.removeEventListener('wheel', wheel); };
  }, []);
  const marginY = Math.max(0, (size.height - fitHeight * transform.zoom) / 2 - 10);
  const photoPins = arrange(pins, fitWidth, fitHeight, transform.zoom, showPhotos, [], marginY);
  const placedLabels = arrange(labels.filter((label) => !showPhotos || !pins.some((pin) => pin.name === label.name)), fitWidth, fitHeight, transform.zoom, false, showPhotos ? photoPins.map((p) => p.box) : pins.map((p) => ({ x: p.x * fitWidth * transform.zoom, y: p.y * fitHeight * transform.zoom, w: 28, h: 38 })), marginY).filter((label) => label.placed);
  return (
    <div className="interactive-map">
      <div className="map-toolbar">
        <button type="button" onClick={onTogglePhotos} aria-pressed={!showPhotos}>{showPhotos ? <EyeOff size={17} /> : <Eye size={17} />}{showPhotos ? '隐藏照片' : '显示照片'}</button>
        <span className="map-scale">{Math.round(transform.zoom * 100)}%</span>
        <button type="button" onClick={() => changeZoom(1.3)} disabled={transform.zoom >= 5} aria-label="放大地图"><Plus size={18} /></button>
        <button type="button" onClick={() => changeZoom(1 / 1.3)} disabled={transform.zoom <= 1} aria-label="缩小地图"><Minus size={18} /></button>
        <button type="button" onClick={() => apply({ x: 0, y: 0, zoom: 1 })} aria-label="地图居中复位"><RotateCcw size={17} /></button>
      </div>
      <div ref={viewport} className="map-gesture-surface" aria-label="可缩放和拖动的旅行地图" tabIndex={0}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '0'].includes(e.key)) e.preventDefault();
          if (e.key === '+' || e.key === '=') changeZoom(1.3);
          if (e.key === '-') changeZoom(1 / 1.3);
          if (e.key === '0') apply({ x: 0, y: 0, zoom: 1 });
          const delta: Record<string, Point> = { ArrowLeft: { x: 60, y: 0 }, ArrowRight: { x: -60, y: 0 }, ArrowUp: { x: 0, y: 60 }, ArrowDown: { x: 0, y: -60 } };
          if (delta[e.key]) apply({ ...current.current, x: current.current.x + delta[e.key].x, y: current.current.y + delta[e.key].y });
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (pointers.current.size === 0) { dragged.current = false; gestureDistance.current = 0; }
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          // Capture on the hit element so a stationary tap still activates a pin.
          (e.target as Element).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const old = pointers.current.get(e.pointerId);
          if (!old) return;
          const before = [...pointers.current.values()];
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const after = [...pointers.current.values()];
          gestureDistance.current += Math.hypot(e.clientX - old.x, e.clientY - old.y);
          if (gestureDistance.current > 5 || after.length > 1) dragged.current = true;
          if (after.length === 1) apply({ ...current.current, x: current.current.x + e.clientX - old.x, y: current.current.y + e.clientY - old.y });
          else if (after.length === 2) {
            const distance = (p: Point[]) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
            const midpoint = (p: Point[]) => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
            const a = midpoint(before), b = midpoint(after), rect = e.currentTarget.getBoundingClientRect();
            if (distance(before) > 2) zoomRef.current(distance(after) / distance(before), { x: a.x - rect.left - rect.width / 2, y: a.y - rect.top - rect.height / 2 });
            apply({ ...current.current, x: current.current.x + b.x - a.x, y: current.current.y + b.y - a.y });
          }
        }}
        onPointerUp={(e) => pointers.current.delete(e.pointerId)}
        onPointerCancel={(e) => { pointers.current.delete(e.pointerId); dragged.current = true; }}
        onLostPointerCapture={(e) => pointers.current.delete(e.pointerId)}
        onClickCapture={(e) => { if (dragged.current && e.detail !== 0) { e.preventDefault(); e.stopPropagation(); } }}
      >
        <div className="map-scene" style={{ width: fitWidth, height: fitHeight, transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})` }}>
          {children}
          <svg className="map-connectors" viewBox={`0 0 ${fitWidth} ${fitHeight}`} aria-hidden="true">
            {photoPins.map((p) => <line key={p.name} x1={p.x * fitWidth} y1={p.y * fitHeight} x2={showPhotos ? p.left : p.x * fitWidth} y2={showPhotos ? p.top : p.y * fitHeight} />)}
            {placedLabels.map((p) => <line key={`label-${p.name}`} x1={p.x * fitWidth} y1={p.y * fitHeight} x2={p.left} y2={p.top} />)}
          </svg>
          {photoPins.map((pin) => <button key={pin.name} type="button" className={`map-photo-pin ${showPhotos ? '' : 'pin-only'}`}
            style={{ left: showPhotos ? pin.left : pin.x * fitWidth, top: showPhotos ? pin.top : pin.y * fitHeight, transform: `translate(-50%, -50%) scale(${1 / transform.zoom})` }}
            onClick={pin.onOpen} aria-label={`打开${pin.name}旅行记忆`} title={pin.name}>
            <span className="pin-head" />
            {showPhotos && <span className="polaroid">{pin.photo}<span className="pin-caption"><strong>{pin.name}</strong></span></span>}
          </button>)}
          <div className="floating-map-labels" aria-hidden="true">
            {placedLabels.map((label) => <span key={label.name} style={{ left: label.left, top: label.top, transform: `translate(-50%, -50%) scale(${1 / transform.zoom})` }}>{label.name}</span>)}
          </div>
        </div>
      </div>
      <p className="map-gesture-hint">滚轮 / 双指缩放 · 拖动探索 · 放大查看更多地名</p>
    </div>
  );
}
