import { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '../lib/supabase';
import UserCard from './UserCard';

interface InfiniteCanvasProps {
  users: User[];
  onUserClick: (user: User) => void;
}

interface UserPosition {
  x: number;
  y: number;
}

export default function InfiniteCanvas({ users, onUserClick }: InfiniteCanvasProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const userPositions = useMemo(() => {
    const positions: Record<string, UserPosition> = {};
    const bubbleRadius = 80;
    const padding = 10;

    if (users.length === 0) return positions;

    positions[users[0].id] = { x: 0, y: 0 };

    if (users.length === 1) return positions;

    for (let i = 1; i < users.length; i++) {
      let placed = false;
      let ring = 1;
      let maxAttempts = 360;
      let attempt = 0;

      while (!placed && attempt < maxAttempts) {
        const angle = (attempt * 360) / Math.min(ring * 8, 360);
        const distance = ring * (bubbleRadius * 2 + padding);
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;

        let collision = false;
        for (let j = 0; j < i; j++) {
          const otherPos = positions[users[j].id];
          if (otherPos) {
            const dx = x - otherPos.x;
            const dy = y - otherPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = bubbleRadius * 2 + padding;

            if (dist < minDist) {
              collision = true;
              break;
            }
          }
        }

        if (!collision) {
          positions[users[i].id] = { x, y };
          placed = true;
        } else {
          attempt++;
          if (attempt >= Math.min(ring * 8, 360)) {
            ring++;
            attempt = 0;
          }
        }
      }

      if (!placed) {
        const angle = (i * 360) / users.length;
        const distance = 300 + (i % 5) * 100;
        positions[users[i].id] = {
          x: Math.cos((angle * Math.PI) / 180) * distance,
          y: Math.sin((angle * Math.PI) / 180) * distance,
        };
      }
    }

    return positions;
  }, [users]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.3, zoom + delta), 2);
    setZoom(newZoom);
  };

  const getTouchDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    } else if (e.touches.length === 2) {
      setTouchDistance(getTouchDistance(e.touches[0], e.touches[1]));
      setIsDragging(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2) {
      const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const delta = (newDistance - touchDistance) * 0.01;
      const newZoom = Math.min(Math.max(0.3, zoom + delta), 2);
      setZoom(newZoom);
      setTouchDistance(newDistance);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(0);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden cursor-move bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="application"
      aria-label="Interactive canvas with user profiles"
    >
      <div className="canvas-background absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.3
        }} />
      </div>

      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          left: '50%',
          top: '50%',
        }}
      >
        <div className="relative" style={{ width: 0, height: 0 }}>
          {users.map((user, index) => {
            const pos = userPositions[user.id];
            if (!pos) return null;

            return (
              <div
                key={user.id}
                className="absolute"
                style={{
                  left: pos.x - 80,
                  top: pos.y - 80,
                  animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`,
                }}
              >
                <UserCard user={user} onClick={() => onUserClick(user)} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg text-xs md:text-sm backdrop-blur-sm" role="status" aria-live="polite">
        <p className="hidden md:block">Scroll to zoom • Drag to pan • Pinch to zoom on mobile</p>
        <p className="md:hidden">Drag to move • Pinch to zoom</p>
        <p className="text-cyan-400">{users.length} members floating</p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
