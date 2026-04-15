import React from 'react'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="container">{children}</div>
    </div>
  )
}
