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
          border: var(--sw) solid var(--edge, #b6c2c7);
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
          --fill: #eef3f5;
          --edge: #cdd8dc;
          --label: #6a7b83;
        }
        .shape-water {
          --fill: #d7ecf3;
          --edge: #a8cfdc;
          --label: #0b6e8c;
        }
        .grp-service {
          --fill: #e9edee;
          --edge: #ccd5d8;
          --label: #6a7b83;
        }
        .grp-decor {
          --fill: #f4f7f8;
          --edge: #d3dcdf;
          --label: #8a9aa1;
        }
        /* ── Статусы: единственное место с насыщенным цветом ── */
        .st-free {
          --fill: #e8f6ed;
          --edge: #17a34a;
          --label: #10682f;
        }
        .st-booked {
          --fill: #fdf3dd;
          --edge: #d99407;
          --label: #8a5c02;
        }
        .st-busy {
          --fill: #fdeaea;
          --edge: #dc2626;
          --label: #971b1b;
        }
        .st-off {
          --fill: #eef1f2;
          --edge: #94a3b8;
          --label: #7b8a93;
        }
        .st-off .cap {
          text-decoration: line-through;
        }
        /* ── Рамка компании: отдельное кольцо снаружи фигуры ── */
        .ring {
          position: absolute;
          inset: calc(var(--sw) * -2.6);
          border: calc(var(--sw) * 2) solid var(--ring);
          border-radius: inherit;
          pointer-events: none;
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
