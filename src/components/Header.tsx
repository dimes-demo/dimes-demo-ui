import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useDisconnect, useAccount, useBalance } from 'wagmi'
import { useAuthStore } from '../store/auth'
import { isDemoMode } from '../api/auth'
import { useDepositWallet } from '../contract/useDepositWallet'

function CompactConnectButton() {
  const baseBtn: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 0,
    border: '1px solid var(--border)',
    background: 'var(--surface-subtle)',
    color: 'var(--text)',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    lineHeight: 1.2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.15s ease, border-color 0.15s ease',
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted
        const connected = ready && account && chain
        return (
          <div
            style={{
              opacity: !ready ? 0 : 1,
              pointerEvents: !ready ? 'none' : undefined,
              userSelect: !ready ? 'none' : undefined,
              display: 'inline-flex',
              gap: 8,
            }}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    style={{
                      ...baseBtn,
                      background: 'var(--yellow)',
                      color: 'var(--yellow-ink)',
                      borderColor: 'var(--yellow)',
                      fontWeight: 700,
                    }}
                  >
                    Connect Wallet
                  </button>
                )
              }
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    style={{
                      ...baseBtn,
                      background: 'rgba(224,82,82,0.08)',
                      color: 'var(--red)',
                      borderColor: 'rgba(224,82,82,0.3)',
                    }}
                  >
                    Wrong network
                  </button>
                )
              }
              return (
                <>
                  <button
                    onClick={openChainModal}
                    type="button"
                    style={baseBtn}
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain'}
                        src={chain.iconUrl}
                        style={{ width: 14, height: 14, borderRadius: '50%' }}
                      />
                    )}
                    {chain.name}
                  </button>
                  <button
                    onClick={openAccountModal}
                    type="button"
                    style={baseBtn}
                  >
                    {account.displayName}
                  </button>
                </>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}

const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS as `0x${string}` | undefined

function UsdcBalance() {
  const { address } = useAccount()
  const { data } = useBalance({
    address,
    token: USDC_ADDRESS,
    query: { enabled: !!address && !!USDC_ADDRESS },
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
        borderRadius: 0,
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
        borderRadius: 0,
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

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * Opt-in toggle for the Polymarket deposit-wallet (push-funded) flow. Hidden in
 * demo mode (the demo wallet endpoint cannot scope a JWT to an arbitrary
 * deposit-wallet address). When the connected wallet has no deposit wallet, a
 * disabled placeholder is shown so the capability is still discoverable.
 */
function DepositWalletToggle() {
  const { available, address: depositWalletAddress, isLoading, chainSupported } = useDepositWallet()
  const depositWalletMode = useAuthStore((s) => s.depositWalletMode)
  const setDepositWalletMode = useAuthStore((s) => s.setDepositWalletMode)

  // The deposit-wallet flow only exists on Polygon mainnet.
  if (isDemoMode || !chainSupported) return null

  if (isLoading || !available || !depositWalletAddress) {
    return (
      <span
        title={
          isLoading
            ? 'Checking for a Polymarket deposit wallet…'
            : 'No Polymarket deposit wallet is deployed for the connected wallet. The push-funded flow is unavailable.'
        }
        style={{
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          borderRadius: 0,
          border: '1px dashed var(--border)',
          background: 'transparent',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font)',
          lineHeight: 1.2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'help',
        }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-dim)', opacity: 0.5 }}
        />
        {isLoading ? 'Checking deposit wallet…' : 'No Deposit Wallet'}
      </span>
    )
  }

  const toggle = () => {
    if (depositWalletMode) {
      setDepositWalletMode(false, null)
    } else {
      setDepositWalletMode(true, depositWalletAddress)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={
        depositWalletMode
          ? `Push-funded flow active — quotes and positions are scoped to deposit wallet ${depositWalletAddress}`
          : `A Polymarket deposit wallet (${depositWalletAddress}) is available for this wallet. Enable the push-funded flow.`
      }
      style={{
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 0,
        border: `1px solid ${depositWalletMode ? 'var(--yellow)' : 'var(--border)'}`,
        background: depositWalletMode ? 'var(--yellow)' : 'var(--surface-subtle)',
        color: depositWalletMode ? 'var(--yellow-ink)' : 'var(--text)',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        lineHeight: 1.2,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: depositWalletMode ? 'var(--yellow-ink)' : 'var(--text-dim)',
        }}
      />
      {depositWalletMode ? `Deposit Wallet · ${shortenAddress(depositWalletAddress)}` : 'Use Deposit Wallet'}
    </button>
  )
}

function DimesLogo() {
  return (
    <img
      src="/logo-dark.png"
      alt="Dimes"
      style={{ height: 36, width: 'auto', display: 'block', marginLeft: -6 }}
    />
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
        {isConnected && <DepositWalletToggle />}
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
        <CompactConnectButton />
      </div>
    </header>
  )
}
