'use client'

import { forwardRef } from 'react'
import Button from './Button'
import Icon from './Icon'

// Кнопка-иконка для «хрома» интерфейса (навигация, зум, закрытие, undo/redo) —
// требует aria-label, т.к. видимого текста нет.
const IconButton = forwardRef(function IconButton(
  { icon, size = 18, variant = 'quiet', label, className = '', ...props },
  ref
) {
  return (
    <Button ref={ref} variant={variant} iconOnly className={className} aria-label={label} title={label} {...props}>
      <Icon name={icon} size={size} />
    </Button>
  )
})

export default IconButton
