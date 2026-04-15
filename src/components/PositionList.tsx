import { useState } from 'react'
import { isClosedPosition, isOpenPosition } from '../api/types'
import { usePositions } from '../hooks/usePositions'
import { PositionCard } from './PositionCard'
import { SettledCard } from './SettledCard'

type Tab = 'active' | 'closed'

type SortOption = 'newest' | 'oldest' | 'recently_closed'

const sortConfig: Record<SortOption, { sortBy: string; sortDirection: string; label: string }> = {
  newest: { sortBy: 'created_at', sortDirection: 'desc', label: 'Newest first' },
  oldest: { sortBy: 'created_at', sortDirection: 'asc', label: 'Oldest first' },
  recently_closed: { sortBy: 'closed_at', sortDirection: 'desc', label: 'Recently closed' },
}

const activeSortOptions: SortOption[] = ['newest', 'oldest']
const closedSortOptions: SortOption[] = ['newest', 'oldest', 'recently_closed']

export function PositionList() {
  const [tab, setTab] = useState<Tab>('active')
  const [sort, setSort] = useState<SortOption>('newest')

  const { sortBy, sortDirection } = sortConfig[sort]
  const { data: positions, isLoading } = usePositions({ sortBy, sortDirection })

  const activePositions = positions?.filter(isOpenPosition) ?? []

  const closedPositions = positions?.filter(isClosedPosition) ?? []

  const currentSortOptions = tab === 'active' ? activeSortOptions : closedSortOptions

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    if (newTab === 'active' && sort === 'recently_closed') {
      setSort('newest')
    }
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface-subtle)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  }

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Tabs + Sort */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--card)',
            borderRadius: 8,
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
                borderRadius: 6,
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
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  color: tab === t ? 'var(--text-muted)' : 'var(--text-dim)',
                }}
              >
                {t === 'active' ? activePositions.length : closedPositions.length}
              </span>
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          style={selectStyle}
        >
          {currentSortOptions.map((opt) => (
            <option key={opt} value={opt}>
              {sortConfig[opt].label}
            </option>
          ))}
        </select>
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
          {activePositions.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                No active positions
              </span>
            </div>
          ) : (
            activePositions.map((pos) => (
              <PositionCard key={pos.id} position={pos} />
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
              <SettledCard key={pos.id} position={pos} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
