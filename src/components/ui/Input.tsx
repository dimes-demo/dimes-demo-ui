import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  leadingSlot?: ReactNode
  trailingSlot?: ReactNode
}

export function Input({ leadingSlot, trailingSlot, ...rest }: InputProps) {
  return (
    <div className="input-row">
      {leadingSlot != null && <span className="input-row__prefix">{leadingSlot}</span>}
      <input {...rest} />
      {trailingSlot != null && <span className="input-row__suffix">{trailingSlot}</span>}
    </div>
  )
}
