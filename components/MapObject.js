'use client'

import { objectName, typeOf } from '../lib/objectTypes'

// Один объект на карте. Используется и в редакторе, и в рабочем режиме.
// status: null (нейтрально) | 'free' | 'booked' | 'busy' | 'off'
export default function MapObject({
  obj,
  status = null,
  ringColor = null,
  selected = false,
  dimmed = false,
  zoom = 1,
  onPointerDown,
  onDoubleClick,
}) {
  const t = typeOf(obj.type)
  const name = objectName(obj)
  const isZone = t.group === 'zone'

  const fontSize = Math.max(
    8,
    Math.min(15, Math.min(obj.width, obj.height) / (name.length > 12 ? 6.5 : 4.6))
  )

  return (
    <div
      className={[
        'mo',
        `shape-${t.shape}`,
        `grp-${t.group}`,
        status ? `st-${status}` : 'st-none',
        selected ? 'sel' : '',
        dimmed ? 'dim' : '',
        obj.locked ? 'locked' : '',
      ].join(' ')}
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        '--ring': ringColor || 'transparent',
        '--sw': `${1.5 / zoom}px`,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      data-id={obj.id}
    >
      {ringColor && <span className="ring" aria-hidden="true" />}
      <span
        className="cap"
        style={{ fontSize, transform: obj.rotation ? `rotate(${-obj.rotation}deg)` : undefined }}
      >
        {name}
      </span>

      <style jsx>{`
        .mo {
          position: absolute;
          display: grid;
          place-items: center;
          user-select: none;
          touch-action: none;
          box-sizing: border-box;
          border: calc(var(--sw) * 1.15) solid var(--edge, #b6c2c7);
          background: var(--fill, #fff);
          color: var(--label, #0d1b21);
          transition: filter 0.12s;
        }
        .shape-rounded {
          border-radius: 10px;
        }
        .shape-circle {
          border-radius: 50%;
        }
        .shape-rect {
          border-radius: 3px;
        }
        .shape-water {
          border-radius: 22px;
        }
        .cap {
          font-weight: 600;
          line-height: 1.15;
          text-align: center;
          padding: 2px 3px;
          pointer-events: none;
          overflow: hidden;
        }
        /* ── Инфраструктура: приглушённая, не спорит со статусами ── */
        .grp-zone {
          --fill: #e9eff2;
          --edge: #c6d3d8;
          --label: #627a84;
        }
        .shape-water {
          --fill: #cfe9f2;
          --edge: #8fc6d9;
          --label: #0a6a83;
        }
        .grp-service {
          --fill: #e6ebed;
          --edge: #c6d1d5;
          --label: #627a84;
        }
        .grp-decor {
          --fill: #f1f5f6;
          --edge: #d0dade;
          --label: #8299a3;
        }
        /* ── Статусы. Каждый отличается и цветом, и заливкой,
             чтобы их нельзя было спутать даже боковым зрением. ── */
        .st-free {
          --fill: #ecfdf3;
          --edge: #10b981;
          --label: #05603a;
        }
        .st-booked {
          --fill: #fef7db;
          --edge: #eab308;
          --label: #6b4708;
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(202, 138, 4, 0.28) 0 5px,
            transparent 5px 12px
          );
        }
        .st-busy {
          --fill: #e11d48;
          --edge: #9f1239;
          --label: #ffffff;
        }
        .st-off {
          --fill: #e2e8f0;
          --edge: #94a3b8;
          --label: #64748b;
        }
        .st-off .cap {
          text-decoration: line-through;
        }
        /* ── Рамка компании: отдельное кольцо снаружи фигуры ── */
        .ring {
          position: absolute;
          inset: calc(var(--sw) * -3.2);
          border: calc(var(--sw) * 2.6) solid var(--ring);
          border-radius: inherit;
          pointer-events: none;
          box-shadow: 0 0 0 calc(var(--sw) * 0.8) rgba(255, 255, 255, 0.75);
        }
        .shape-circle .ring {
          border-radius: 50%;
        }
        .sel {
          outline: calc(var(--sw) * 1.5) solid var(--water);
          outline-offset: calc(var(--sw) * 1.5);
        }
        .dim {
          filter: saturate(0.25) opacity(0.45);
        }
        .locked {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
