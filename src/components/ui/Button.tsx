import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'side-yes' | 'side-no' | 'chip'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  active?: boolean
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  active = false,
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    active ? 'is-active' : '',
    fullWidth ? 'btn--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  )
}
