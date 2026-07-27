'use client'

import { memo } from 'react'
import TypeIcon from './TypeIcon'
import { objectName, shapeOf, typeOf } from '../lib/objectTypes'

const POLY_SHAPES = ['hex', 'octa', 'diamond']

// Один объект на карте. Используется и в редакторе, и в рабочем режиме.
// status: null (нейтрально) | 'free' | 'booked' | 'busy' | 'off'
// Обёрнут в memo: во время перетаскивания родитель обновляет только
// перемещаемые объекты (остальные сохраняют ссылку в массиве objects),
// поэтому немодифицированные объекты не должны перерисовываться —
// это требует, чтобы onPointerDown, приходящий сверху, был стабильной
// ссылкой (см. MapEditor/MapBoard, где он больше не создаётся инлайн).
function MapObject({
  obj,
  status = null,
  ringColor = null,
  selected = false,
  dimmed = false,
  dragging = false,
  zoom = 1,
  onPointerDown,
  onDoubleClick,
}) {
  const t = typeOf(obj.type)
  const shape = shapeOf(obj)
  const name = objectName(obj)
  const isPoly = POLY_SHAPES.includes(shape)

  const shortest = Math.min(obj.width, obj.height)
  const onScreen = shortest * zoom
  const showIcon = onScreen > 52
  const showText = onScreen > 26

  const fontSize = Math.max(
    9,
    Math.min(16, shortest / (name.length > 13 ? 6.2 : 4.4))
  )
  const iconSize = Math.max(12, Math.min(30, shortest * 0.24))
  const border = 1.6 / zoom

  return (
    <div
      className={[
        'mo',
        `sh-${shape}`,
        `grp-${t.group}`,
        status ? `st-${status}` : 'st-none',
        selected ? 'sel' : '',
        dimmed ? 'dim' : '',
        dragging ? 'dragging' : '',
        obj.locked ? 'locked' : '',
      ].join(' ')}
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
        '--ring': ringColor || 'transparent',
        '--bw': `${border}px`,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      data-id={obj.id}
    >
      <span className={`face sh-${shape}`} aria-hidden="true" />
      {ringColor && <span className={`ring sh-${shape}`} aria-hidden="true" />}
      {selected && isPoly && <span className={`sel-glow sh-${shape}`} aria-hidden="true" />}

      <span
        className="cap"
        style={{ transform: obj.rotation ? `rotate(${-obj.rotation}deg)` : undefined }}
      >
        {showIcon && (
          <span className="ic">
            <TypeIcon name={t.icon} size={iconSize} stroke={1.6} />
          </span>
        )}
        {showText && (
          <span className="txt" style={{ fontSize }}>
            {name}
          </span>
        )}
      </span>

      <style jsx>{`
        .mo {
          position: absolute;
          display: grid;
          place-items: center;
          user-select: none;
          touch-action: none;
          box-sizing: border-box;
          background: var(--edge, #b0c0c6);
          color: var(--label, #0c1b22);
          transition: filter var(--dur-fast, 0.12s), box-shadow var(--dur-fast, 0.12s);
        }
        .mo:hover:not(.locked):not(.dim):not(.dragging) {
          filter: brightness(1.05);
        }
        .mo.dragging {
          box-shadow: 0 16px 32px rgba(6, 18, 24, 0.38);
          z-index: 5;
        }
        .face {
          position: absolute;
          inset: var(--bw);
          background: var(--fill, #fff);
          background-image: linear-gradient(
            168deg,
            rgba(255, 255, 255, 0.55) 0%,
            rgba(255, 255, 255, 0) 55%
          );
          pointer-events: none;
        }
        .cap {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3%;
          width: 92%;
          pointer-events: none;
          overflow: hidden;
        }
        .ic {
          display: block;
          opacity: 0.62;
          line-height: 0;
        }
        .txt {
          font-weight: 650;
          line-height: 1.14;
          text-align: center;
          letter-spacing: -0.01em;
        }

        /* ── Формы ───────────────────────────────── */
        .sh-rect {
          border-radius: 4px;
        }
        .sh-rounded {
          border-radius: 14px;
        }
        .sh-pill {
          border-radius: 999px;
        }
        .sh-circle,
        .sh-oval {
          border-radius: 50%;
        }
        .sh-water {
          border-radius: 44% 56% 48% 52% / 54% 46% 54% 46%;
        }
        .sh-hex {
          clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        }
        .sh-octa {
          clip-path: polygon(
            30% 0%,
            70% 0%,
            100% 30%,
            100% 70%,
            70% 100%,
            30% 100%,
            0% 70%,
            0% 30%
          );
        }
        .sh-diamond {
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }

        /* ── Инфраструктура: приглушённая, не спорит со статусами ── */
        .grp-zone {
          --fill: #e9eff2;
          --edge: #c2d0d6;
          --label: #5d757f;
        }
        .grp-service {
          --fill: #e7ecee;
          --edge: #c4d0d4;
          --label: #5d757f;
        }
        .grp-decor {
          --fill: #f1f5f6;
          --edge: #ccd8dc;
          --label: #7e959f;
        }
        .sh-water.grp-zone,
        .grp-zone.sh-water {
          --fill: #cfe9f2;
          --edge: #86c2d7;
          --label: #0a6a83;
        }

        /* ── Статусы. Отличаются и цветом, и заливкой,
             чтобы их нельзя было спутать боковым зрением.
             Значения берутся из globals.css (--free-fill и т.д.) —
             единый источник вместо трёх независимых копий. ── */
        .st-free {
          --fill: var(--free-fill, #ecfdf3);
          --edge: var(--free-edge, #10b981);
          --label: var(--free-label, #05603a);
        }
        .st-booked {
          --fill: var(--booked-fill, #fef7db);
          --edge: var(--booked-edge, #eab308);
          --label: var(--booked-label, #6b4708);
        }
        .st-booked .face {
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(202, 138, 4, 0.3) 0 5px,
            transparent 5px 12px
          );
        }
        .st-busy {
          --fill: var(--busy-fill, #e11d48);
          --edge: var(--busy-edge, #9f1239);
          --label: var(--busy-label, #ffffff);
        }
        .st-busy .face {
          background-image: linear-gradient(
            168deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0) 60%
          );
        }
        .st-busy .ic {
          opacity: 0.85;
        }
        .st-off {
          --fill: var(--off-fill, #e2e8f0);
          --edge: var(--off-edge, #94a3b8);
          --label: var(--off-label, #607484);
        }
        .st-off .txt {
          text-decoration: line-through;
        }

        /* ── Рамка компании: кольцо снаружи фигуры ── */
        .ring {
          position: absolute;
          inset: calc(var(--bw) * -3.4);
          border: calc(var(--bw) * 2.4) solid var(--ring);
          pointer-events: none;
          box-shadow: 0 0 0 calc(var(--bw) * 0.9) rgba(255, 255, 255, 0.8);
        }
        .ring.sh-hex,
        .ring.sh-octa,
        .ring.sh-diamond {
          border: none;
          background: var(--ring);
          box-shadow: none;
          z-index: -1;
        }

        .sel {
          outline: calc(var(--bw) * 2) solid var(--water, #0d87a6);
          outline-offset: calc(var(--bw) * 2);
        }
        .sh-hex.sel,
        .sh-octa.sel,
        .sh-diamond.sel {
          outline: none;
        }
        /* ── Выделение для фигур с clip-path: outline не умеет повторять
             форму, поэтому вместо блюра рисуем такой же "ореол", как
             у рамки компании (.ring) — единый визуальный язык. ── */
        .sel-glow {
          position: absolute;
          inset: calc(var(--bw) * -3.4);
          background: var(--water, #0d87a6);
          pointer-events: none;
          z-index: -1;
        }
        .dim {
          filter: saturate(0.2) opacity(0.4);
        }
        .locked {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default memo(MapObject)
