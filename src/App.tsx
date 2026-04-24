import { useState } from 'react'
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
            {selectedMarket && (
              <div style={{ marginBottom: 24 }}>
                <TradePanel
                  market={selectedMarket}
                  onClose={() => setSelectedMarket(null)}
                />
              </div>
            )}

            {isConnected && (
              <div style={{ marginBottom: 32 }}>
                <h2
                  style={{
                    fontSize: 'var(--fs-md)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    marginBottom: 4,
                  }}
                >
                  Your positions
                </h2>
                <PositionList />
              </div>
            )}

            <div>
              <h2
                style={{
                  fontSize: 'var(--fs-md)',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: 4,
                }}
              >
                Markets
              </h2>
              <MarketList
                onSelectMarket={(m) => {
                  setSelectedMarket(m)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                selectedMarketId={selectedMarket?.id ?? null}
              />
            </div>
          </>
        )}
      </main>
    </Layout>
  )
}

export default App
