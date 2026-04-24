import { ConnectButton } from '@rainbow-me/rainbowkit'

/**
 * Pre-connect landing block. Rendered on top of the market list until the
 * user connects a wallet. Kept deliberately short — enough to explain what
 * the app does and set expectations about sandbox mode.
 */
export function Hero() {
  return (
    <section
      style={{
        padding: '56px 0 40px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 24,
      }}
    >
      <h1
        style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          maxWidth: '18ch',
        }}
      >
        Leveraged{' '}
        <span style={{ color: 'var(--yellow)' }}>prediction markets</span>,
        settled on-chain.
      </h1>

      <p
        style={{
          marginTop: 18,
          color: 'var(--text-muted)',
          fontSize: 'var(--fs-md)',
          lineHeight: 1.55,
          maxWidth: '54ch',
        }}
      >
        Up to 10× on Polymarket outcomes through the Dimes vault on Polygon.
        This repo is a reference frontend for the Dimes API — fork it, wire
        in your own backend, and ship.
      </p>

      <div
        style={{
          marginTop: 28,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <ConnectButton label="Connect wallet to trade" />
        <a
          href="https://docs.dimes.fi"
          target="_blank"
          rel="noreferrer"
          className="btn btn--ghost"
          style={{ textDecoration: 'none' }}
        >
          View docs →
        </a>
      </div>

      <div
        style={{
          marginTop: 32,
          padding: '10px 14px',
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 'var(--fs-xs)',
          color: 'var(--text-muted)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--yellow)',
            boxShadow: '0 0 8px rgba(238, 255, 0, 0.6)',
          }}
        />
        Sandbox mode — browsing is free, connect a wallet to place trades.
      </div>
    </section>
  )
}
