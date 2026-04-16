import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useDisconnect, useAccount, useBalance } from 'wagmi'
import { useAuthStore } from '../store/auth'
import { isDemoMode } from '../api/auth'

const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS as `0x${string}` | undefined

function UsdcBalance() {
  const { address } = useAccount()
  const { data } = useBalance({
    address,
    token: USDC_ADDRESS,
    query: { enabled: !!address && !!USDC_ADDRESS, refetchInterval: 15_000 },
  })

  if (!data) return null

  const amount = Number(data.value) / 10 ** data.decimals
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <span
      style={{
        padding: '8px 12px',
        fontSize: 'var(--fs-sm)',
        fontWeight: 600,
        color: 'var(--text)',
        background: 'var(--surface-subtle)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
      }}
    >
      {formatted} {data.symbol}
    </span>
  )
}

function DemoBadge() {
  return (
    <span
      title="No VITE_API_KEY set — running against the sandbox demo wallet. Reads and writes are scoped to a shared demo account."
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#0C0C0C',
        background: 'var(--yellow)',
        borderRadius: 999,
        boxShadow: '0 0 0 1px rgba(238,255,0,0.35), 0 0 12px rgba(238,255,0,0.25)',
        cursor: 'help',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#0C0C0C',
          animation: 'demoPulse 1.6s ease-in-out infinite',
        }}
      />
      Demo Mode
      <style>{`@keyframes demoPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </span>
  )
}

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <DimesLogo />
        {isDemoMode && <DemoBadge />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isConnected && <UsdcBalance />}
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
        <ConnectButton showBalance={false} />
      </div>
    </header>
  )
}
