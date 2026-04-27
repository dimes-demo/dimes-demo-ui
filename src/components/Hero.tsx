import { ConnectButton } from '@rainbow-me/rainbowkit'

/**
 * Pre-connect landing block. Centered logo + welcome blurb + connect.
 * Squared edges, muted palette — matches the Sandbox 2.0 UI.
 */
export function Hero() {
  return (
    <section
      style={{
        minHeight: 'calc(100vh - 180px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px',
      }}
    >
      <img
        src="/logo-dark.png"
        alt="Dimes"
        style={{
          height: 64,
          width: 'auto',
          display: 'block',
          marginBottom: 24,
        }}
      />

      <p
        style={{
          maxWidth: 620,
          color: 'var(--text-muted)',
          fontSize: 14,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        Welcome to Dimes Sandbox v2.0, last updated: April 27, 2026. In this
        sandbox you'll be able to browse live prediction markets, fetch
        leveraged quotes, approve mock USDC, and open YES/NO positions
        end-to-end on Polygon.
      </p>

      <div
        style={{
          marginTop: 28,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready = mounted
            const connected = ready && account && chain

            const baseStyle: React.CSSProperties = {
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              lineHeight: 1.2,
              border: '1px solid var(--border)',
              background: 'var(--surface-subtle)',
              color: 'var(--text)',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }

            return (
              <div
                style={{
                  opacity: !ready ? 0 : 1,
                  pointerEvents: !ready ? 'none' : undefined,
                  display: 'inline-flex',
                  gap: 8,
                }}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        type="button"
                        onClick={openConnectModal}
                        style={{
                          ...baseStyle,
                          background: 'var(--yellow)',
                          color: 'var(--yellow-ink)',
                          borderColor: 'var(--yellow)',
                          fontWeight: 700,
                        }}
                      >
                        Connect wallet
                      </button>
                    )
                  }
                  if (chain.unsupported) {
                    return (
                      <button
                        type="button"
                        onClick={openChainModal}
                        style={{
                          ...baseStyle,
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
                      <button type="button" onClick={openChainModal} style={baseStyle}>
                        {chain.name}
                      </button>
                      <button type="button" onClick={openAccountModal} style={baseStyle}>
                        {account.displayName}
                      </button>
                    </>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>

        <a
          href="https://docs.dimes.fi"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 0,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font)',
            textDecoration: 'none',
            lineHeight: 1.2,
            transition: 'border-color 0.15s ease, color 0.15s ease',
          }}
        >
          View docs →
        </a>
      </div>
    </section>
  )
}
