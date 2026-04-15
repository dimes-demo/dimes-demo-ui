import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  children: ReactNode
  action?: ReactNode
}

export function Field({ label, action, children }: FieldProps) {
  return (
    <div className="field">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <label className="field__label" style={{ marginBottom: 0 }}>
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}
