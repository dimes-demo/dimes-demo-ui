import { useEffect, useState } from 'react'
import type { Position } from '../api/types'
import { isClosedPosition, isOpenPosition } from '../api/types'
import { usePositions } from '../hooks/usePositions'
import { usePendingPositionsStore } from '../store/pendingPositions'
import { CardShell } from './CardShell'
import { PendingPositionCard } from './PendingPositionCard'
import { PositionCard } from './PositionCard'
import { PositionDetailDrawer } from './PositionDetailDrawer'
import { SettledCard } from './SettledCard'

type Tab = 'active' | 'closed'

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  gap: 16,
}

export function PositionList() {
  const [tab, setTab] = useState<Tab>('active')
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)

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
    setSelectedPosition(null)
  }

  const drawerOpen = selectedPosition !== null
  const selectedUnwinds = selectedPosition
    ? positions?.find((p) => p.id === selectedPosition.id)?.unwinds
    : undefined

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
        <div style={gridStyle} className="stat-grid">
          {[0, 1, 2].map((i) => (
            <PositionCardSkeleton key={i} delay={i * 80} />
          ))}
        </div>
      )}

      {/* Active tab */}
      {!isLoading && tab === 'active' && (
        <div style={gridStyle} className="stat-grid">
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
                onClick={() => setSelectedPosition(pos)}
                isSelected={selectedPosition?.id === pos.id}
              />
            ))
          )}
        </div>
      )}

      {/* Closed tab */}
      {!isLoading && tab === 'closed' && (
        <div style={gridStyle} className="stat-grid">
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
                onClick={() => setSelectedPosition(pos)}
                isSelected={selectedPosition?.id === pos.id}
              />
            ))
          )}
        </div>
      )}

      {/* Detail drawer */}
      <PositionDetailDrawer
        position={selectedPosition}
        unwinds={selectedUnwinds}
        isUnwindsLoading={false}
        open={drawerOpen}
        onClose={() => setSelectedPosition(null)}
      />
    </div>
  )
}

function PositionCardSkeleton({ delay }: { delay: number }) {
  const shimmer = (w: number, h: number, d: number, tone: 'dim' | 'accent' = 'dim') => ({
    width: w,
    height: h,
    background: tone === 'accent' ? 'rgba(238,255,0,0.08)' : 'rgba(255,255,255,0.06)',
    animation: 'posSkeletonPulse 1.4s ease-in-out infinite',
    animationDelay: `${delay + d}ms`,
  })

  return (
    <CardShell variant="yellow">
      <div style={{ padding: '22px 24px 20px' }}>
        {/* Header: title + badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={shimmer(160, 14, 0)} />
            <div style={{ ...shimmer(100, 10, 60), marginTop: 6 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={shimmer(36, 20, 40, 'accent')} />
            <div style={shimmer(48, 20, 80)} />
          </div>
        </div>

        {/* Stats grid (2-col, mimics simple mode) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 18px' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i}>
              <div style={shimmer(50 + (i % 3) * 10, 8, i * 40)} />
              <div style={{ ...shimmer(60 + (i % 4) * 14, 14, i * 40 + 60, 'accent'), marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes posSkeletonPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </CardShell>
  )
}
