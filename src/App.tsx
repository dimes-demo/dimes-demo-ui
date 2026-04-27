import { useState, useCallback, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useAutoAuth } from './hooks/useAutoAuth'
import { useAuthStore } from './store/auth'
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

function MarketsTitle({ count }: { count?: number }) {
  return (
    <h2 style={sectionTitle}>
      Supported Markets
      {count != null && (
        <>
          <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>·</span>
          <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {count}
          </span>
        </>
      )}
    </h2>
  )
}

function App() {
  const { isConnected } = useAccount()
  useAutoAuth()
  const jwt = useAuthStore((s) => s.jwt)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [marketCount, setMarketCount] = useState<number | undefined>(undefined)
  const onTotalCount = useCallback((n: number | undefined) => setMarketCount(n), [])

  const drawerOpen = selectedMarket !== null

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <Layout>
      {isConnected && <Header />}

      <main style={{ padding: '24px 0' }}>
        {!isConnected && <Hero />}

        {isConnected && !jwt && (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-sm)' }}>
              Loading…
            </span>
          </div>
        )}

        {jwt && (
          <>
            <div>
              <MarketsTitle count={marketCount} />
              <MarketList
                onSelectMarket={setSelectedMarket}
                selectedMarketId={selectedMarket?.id}
                onTotalCount={onTotalCount}
              />
            </div>

            {/* Trade drawer — overlays from right, no layout shift */}
            <div
              className={`trade-drawer-backdrop${drawerOpen ? ' trade-drawer-backdrop--open' : ''}`}
              onClick={() => setSelectedMarket(null)}
            />
            <div className={`trade-drawer${drawerOpen ? ' trade-drawer--open' : ''}`}>
              <div className="trade-drawer__inner dimes-scroll">
                {selectedMarket && (
                  <TradePanel
                    market={selectedMarket}
                    onClose={() => setSelectedMarket(null)}
                  />
                )}
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
