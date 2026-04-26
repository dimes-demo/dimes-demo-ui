import { useEffect, useState } from 'react'
import { isClosedPosition, isOpenPosition } from '../api/types'
import { usePositions } from '../hooks/usePositions'
import { usePendingPositionsStore } from '../store/pendingPositions'
import { PendingPositionCard } from './PendingPositionCard'
import { PositionCard } from './PositionCard'
import { SettledCard } from './SettledCard'

type Tab = 'active' | 'closed'

export function PositionList() {
  const [tab, setTab] = useState<Tab>('active')

  const apiState = tab === 'active' ? 'active' : 'inactive'
  const { data: positions, isLoading } = usePositions({
    sortBy: 'created_at',
    sortDirection: 'desc',
    state: apiState,
    expand: ['unwinds'],
  })

  const activePositions = tab === 'active' ? (positions?.filter(isOpenPosition) ?? []) : []
  const closedPositions = tab === 'closed' ? (positions?.filter(isClosedPosition) ?? []) : []

  const pendingStubs = usePendingPositionsStore((s) => s.stubs)
  const prunePendingStubs = usePendingPositionsStore((s) => s.pruneMatched)

  useEffect(() => {
    if (!positions) return
    prunePendingStubs(positions.map((p) => p.onChainPositionKey))
  }, [positions, prunePendingStubs])

  const unmatchedStubs = pendingStubs.filter(
    (stub) =>
      !positions?.some(
        (p) => p.onChainPositionKey.toLowerCase() === stub.key,
      ),
  )

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--card)',
            borderRadius: 0,
            padding: 4,
            width: 'fit-content',
          }}
        >
          {(['active', 'closed'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              style={{
                padding: '8px 20px',
                borderRadius: 0,
                border: 'none',
                background: tab === t ? 'var(--card-elevated)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-dim)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {t}
              {tab === t && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  {t === 'active' ? activePositions.length : closedPositions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            Loading positions...
          </span>
        </div>
      )}

      {/* Active tab */}
      {!isLoading && tab === 'active' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }} className='stat-grid'>
          {unmatchedStubs.map((stub) => (
            <PendingPositionCard key={stub.key} stub={stub} />
          ))}
          {activePositions.length === 0 && unmatchedStubs.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                No active positions
              </span>
            </div>
          ) : (
            activePositions.map((pos) => (
              <PositionCard
                key={pos.id}
                position={pos}
                unwinds={pos.unwinds}
                isUnwindsLoading={false}
              />
            ))
          )}
        </div>
      )}

      {/* Closed tab */}
      {!isLoading && tab === 'closed' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }} className='stat-grid'>
          {closedPositions.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                No closed positions
              </span>
            </div>
          ) : (
            closedPositions.map((pos) => (
              <SettledCard
                key={pos.id}
                position={pos}
                unwinds={pos.unwinds}
                isUnwindsLoading={false}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
