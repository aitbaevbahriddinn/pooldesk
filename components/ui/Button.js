'use client'

import { forwardRef } from 'react'

// Единая кнопка поверх существующих .btn/.btn-* классов из globals.css —
// без изменения самих классов, только явное API вариантов/размеров/
// состояния загрузки, которое раньше в каждом месте делалось вручную
// (подменой текста, без aria-busy).
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size,
    block = false,
    iconOnly = false,
    loading = false,
    loadingText,
    className = '',
    children,
    disabled,
    ...props
  },
  ref
) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    iconOnly ? 'btn-icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {loading ? loadingText ?? (iconOnly ? null : children) : children}
    </button>
  )
})

export default Button
