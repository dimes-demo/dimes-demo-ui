import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useAutoAuth } from './hooks/useAutoAuth'
import { useAuthStore } from './store/auth'
import { useSupportedMarketsCount } from './hooks/useSupportedMarketsCount'
import type { Market } from './api/types'
import { Layout } from './components/Layout'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { MarketList } from './components/MarketList'
import { TradePanel } from './components/TradePanel'
import { PositionList } from './components/PositionList'

const sectionTitle: React.CSSProperties = {
  fontSize: 'var(--fs-md)',
  fontWeight: 600,
  color: 'var(--text)',
  marginBottom: 4,
}

function MarketsTitle() {
  const count = useSupportedMarketsCount()
  return (
    <h2 style={sectionTitle}>
      Supported Markets
      <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>·</span>
      <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {count ?? '—'}
      </span>
      <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>(live)</span>
    </h2>
  )
}

function App() {
  const { isConnected } = useAccount()
  useAutoAuth()
  const jwt = useAuthStore((s) => s.jwt)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)

  return (
    <Layout>
      <Header />

      <main style={{ padding: '24px 0' }}>
        {!isConnected && <Hero />}

        {!jwt && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
              Loading…
            </span>
          </div>
        )}

        {jwt && (
          <>
            <div className="markets-layout">
              <div className="markets-layout__list">
                <MarketsTitle />
                <MarketList
                  onSelectMarket={setSelectedMarket}
                  selectedMarketId={selectedMarket?.id}
                />
              </div>
              <div className="markets-layout__panel">
                {/* Invisible mirror of the list column's <h2> + toolbar so the
                    trade panel starts at exactly the same Y as the table
                    headers — heights stay in sync without magic numbers. */}
                <div aria-hidden style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                  <h2 style={sectionTitle}>·</h2>
                  <div className="markets-toolbar">
                    <input className="markets-toolbar__input" tabIndex={-1} readOnly />
                  </div>
                </div>
                <div className="markets-layout__panel-fill">
                  <div className="markets-layout__panel-scroll dimes-scroll">
                    {selectedMarket ? (
                      <TradePanel
                        market={selectedMarket}
                        onClose={() => setSelectedMarket(null)}
                      />
                    ) : (
                      <div className="trade-panel-empty">
                        Select a market to start
                      </div>
                    )}
                  </div>
                </div>
                {/* Mirrors the markets-list pagination row so the panel's
                    bottom edge lines up with the LAST market row, not the
                    Prev/Next buttons. */}
                <div
                  aria-hidden
                  style={{
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    marginTop: 12,
                    padding: '0 4px',
                    height: 28,
                  }}
                />
              </div>
            </div>

            {isConnected && (
              <div style={{ marginTop: 40 }}>
                <h2 style={sectionTitle}>Your positions</h2>
                <PositionList />
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  )
}

export default App
