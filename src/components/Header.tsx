import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useDisconnect, useAccount } from 'wagmi'
import { useAuthStore } from '../store/auth'

function DimesLogo() {
  return (
    <svg width="100" height="28" viewBox="0 0 100 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text
        x="0"
        y="22"
        fill="var(--yellow)"
        fontFamily="var(--font)"
        fontWeight="700"
        fontSize="24"
        letterSpacing="0.02em"
      >
        DIMES
      </text>
    </svg>
  )
}

export function Header() {
  const { disconnect } = useDisconnect()
  const { isConnected } = useAccount()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const handleLogout = () => {
    clearAuth()
    disconnect()
  }

  return (
    <header
      className="header-row"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <DimesLogo />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isConnected && (
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn--ghost"
            style={{ padding: '8px 14px', fontSize: 'var(--fs-sm)' }}
          >
            Logout
          </button>
        )}
        <ConnectButton />
      </div>
    </header>
  )
}
