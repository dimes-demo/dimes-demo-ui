import { useState, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMarkets } from '../hooks/useMarkets'
import { usePrefetchMarketOdds } from '../hooks/useMarketOdds'
import type { Market } from '../api/types'

function getQueryParam(key: string): string | undefined {
  const value = new URLSearchParams(window.location.search).get(key)
  return value ?? undefined
}

function setQueryParams(params: Record<string, string | undefined>) {
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value)
    } else {
      url.searchParams.delete(key)
    }
  }
  window.history.replaceState(null, '', url.toString())
}

type SortKey = 'title' | 'category' | 'status' | 'eligible' | 'leverage'
type SortDir = 'asc' | 'desc'

const STATUS_DESCRIPTIONS: Record<string, string> = {
  open: 'Market is open and accepting trades',
  active: 'Market is open and accepting trades',
  closed: 'Trading has stopped, awaiting resolution',
  determined: 'Outcome determined, awaiting finalization',
  finalized: 'Resolved and finalized on-chain',
  disputed: 'Outcome under dispute',
}

function rejectionReadable(code: string | null | undefined) {
  if (!code) return 'Not eligible for new positions'
  return code.replace(/^OFFER_/, '').replace(/_/g, ' ').toLowerCase()
}

export function MarketList({
  onSelectMarket,
  selectedMarketId,
}: {
  onSelectMarket: (market: Market) => void
  selectedMarketId?: string
}) {
  const [search, setSearch] = useState(() => getQueryParam('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => getQueryParam('q') ?? '')
  const [category, setCategoryState] = useState<string | undefined>(() => getQueryParam('category'))
  const [status, setStatusState] = useState<string | undefined>(() => getQueryParam('status'))
  const [eligible, setEligibleState] = useState<string | undefined>(() => getQueryParam('eligible') ?? 'yes')
  const [copiedTicker, setCopiedTicker] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  const [cursor, setCursor] = useState<string | undefined>(() => getQueryParam('after'))
  const [cursorStack, setCursorStack] = useState<string[]>([])

  const resetPagination = () => {
    setCursor(undefined)
    setCursorStack([])
  }

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      resetPagination()
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const setCategory = (v: string | undefined) => {
    setCategoryState(v)
    resetPagination()
  }
  const setStatus = (v: string | undefined) => {
    setStatusState(v)
    resetPagination()
  }
  const setEligible = (v: string | undefined) => {
    setEligibleState(v)
    resetPagination()
  }

  useEffect(() => {
    setQueryParams({
      q: debouncedSearch || undefined,
      category,
      status,
      eligible,
      after: cursor,
    })
  }, [debouncedSearch, category, status, eligible, cursor])

  const acceptingNewPositions = eligible === 'yes' ? true : eligible === 'no' ? false : undefined

  const { data: page, isLoading, isFetching } = useMarkets(
    category,
    debouncedSearch || undefined,
    status,
    acceptingNewPositions,
    cursor,
  )

  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['markets'] })
  }

  const markets = page?.data
  const hasMore = page?.hasMore ?? false
  const hasPrev = cursorStack.length > 0

  const sortedMarkets = useMemo(() => {
    if (!markets) return markets
    if (!sortKey) return markets
    const copy = [...markets]
    const dir = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      switch (sortKey) {
        case 'title':
          av = (a.title || '').toLowerCase()
          bv = (b.title || '').toLowerCase()
          break
        case 'category':
          av = (a.category || '').toLowerCase()
          bv = (b.category || '').toLowerCase()
          break
        case 'status':
          av = a.status
          bv = b.status
          break
        case 'eligible':
          av = a.acceptingNewPositions ? 1 : 0
          bv = b.acceptingNewPositions ? 1 : 0
          break
        case 'leverage':
          av = a.leverage.maxBps
          bv = b.leverage.maxBps
          break
      }
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
    return copy
  }, [markets, sortKey, sortDir])

  const categories = ['Sports', 'Crypto']
  const formatCategory = (c: string) =>
    c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()

  const shouldScrollRef = useRef(false)
  useEffect(() => {
    if (shouldScrollRef.current && !isLoading) {
      shouldScrollRef.current = false
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isLoading])

  function goNext() {
    if (!markets || markets.length === 0) return
    const lastTicker = markets[markets.length - 1].ticker
    setCursorStack((s) => [...s, cursor ?? ''])
    setCursor(lastTicker)
    shouldScrollRef.current = true
  }

  function goPrev() {
    setCursorStack((s) => {
      const next = [...s]
      const prev = next.pop()
      setCursor(prev || undefined)
      return next
    })
    shouldScrollRef.current = true
  }

  function copyTicker(ticker: string) {
    navigator.clipboard.writeText(ticker)
    setCopiedTicker(ticker)
    setTimeout(() => setCopiedTicker(null), 1500)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div ref={containerRef}>
      {/* Search & filter toolbar */}
      <div className="markets-toolbar">
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="markets-toolbar__input"
        />
        <select
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || undefined)}
          className="markets-toolbar__select"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c.toLowerCase()}>{formatCategory(c)}</option>
          ))}
        </select>
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value || undefined)}
          className="markets-toolbar__select"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="determined">Determined</option>
          <option value="finalized">Finalized</option>
          <option value="disputed">Disputed</option>
        </select>
        <select
          value={eligible ?? ''}
          onChange={(e) => setEligible(e.target.value || undefined)}
          className="markets-toolbar__select"
        >
          <option value="">All eligibility</option>
          <option value="yes">Accepting quotes</option>
          <option value="no">Not accepting quotes</option>
        </select>
        <button
          onClick={refresh}
          disabled={isFetching}
          title="Refresh"
          aria-label="Refresh markets"
          className="markets-toolbar__refresh"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: isFetching ? 'marketRefreshSpin 0.8s linear infinite' : undefined,
            }}
          >
            <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
        <style>{`
          @keyframes marketRefreshSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
          }
        `}</style>
      </div>

      {isLoading ? (
        <MarketListSkeleton />
      ) : !markets || markets.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            {debouncedSearch || category || status || eligible ? 'No markets match your filters' : 'No markets available'}
          </span>
        </div>
      ) : (
        <>
          <div className="markets-table-wrap">
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: 'auto' }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 60 }} />
              </colgroup>
              <thead>
                <tr>
                  <SortableTh label="Title" sortKey="title" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="Eligible" sortKey="eligible" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <SortableTh label="Max Lev." sortKey="leverage" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                  <th
                    style={{
                      padding: '10px 14px',
                      fontSize: 11,
                      fontWeight: 500,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(20,20,20,0.95)',
                    }}
                  >
                    Ticker
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMarkets!.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    onSelect={onSelectMarket}
                    onCopy={copyTicker}
                    isCopied={copiedTicker === market.ticker}
                    isSelected={market.id === selectedMarketId}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(hasPrev || hasMore) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 12,
                padding: '0 4px',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Page {cursorStack.length + 1}
              </span>
              <PageButton label="Previous" disabled={!hasPrev} onClick={goPrev} />
              <PageButton label="Next" disabled={!hasMore} onClick={goNext} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SortableTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  current: SortKey | null
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'center' | 'right'
}) {
  const isActive = current === sortKey
  const arrow = isActive ? (dir === 'asc' ? '▲' : '▼') : '↕'
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '10px 14px',
        fontSize: 11,
        fontWeight: 500,
        color: isActive ? 'var(--yellow)' : 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textAlign: align,
        whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'rgba(20,20,20,0.95)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 9, opacity: isActive ? 1 : 0.4 }}>{arrow}</span>
      </span>
    </th>
  )
}

function MarketRow({
  market,
  onSelect,
  onCopy,
  isCopied,
  isSelected,
}: {
  market: Market
  onSelect: (market: Market) => void
  onCopy: (ticker: string) => void
  isCopied: boolean
  isSelected: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const prefetchOdds = usePrefetchMarketOdds()
  const maxLeverage = (market.leverage.maxBps / 10000).toFixed(0)

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  const rowBg = isSelected
    ? 'rgba(238,255,0,0.08)'
    : hovered
      ? 'rgba(238,255,0,0.03)'
      : 'transparent'

  const statusTitle = STATUS_DESCRIPTIONS[market.status] || market.status

  return (
    <tr
      onClick={() => onSelect(market)}
      onMouseEnter={() => {
        setHovered(true)
        prefetchOdds(
          market.ticker,
          market.leverage.minBps,
          market.acceptingNewPositions,
        )
      }}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        background: rowBg,
        transition: 'background 0.15s ease',
        outline: isSelected ? '1px solid rgba(238,255,0,0.3)' : 'none',
      }}
    >
      <td
        style={{
          ...tdStyle,
          color: '#ffffff',
          fontWeight: 500,
        }}
        title={market.title || market.ticker}
      >
        {market.title || '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {market.category && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--surface-subtle)',
              borderRadius: 0,
              padding: '2px 8px',
            }}
          >
            {market.category}
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <span
          title={statusTitle}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: market.status === 'open' ? 'var(--green)' : 'var(--text-muted)',
            background:
              market.status === 'open' ? 'var(--green-soft)' : 'var(--border)',
            border: `1px solid ${
              market.status === 'open' ? 'rgba(68,255,151,0.2)' : 'var(--border)'
            }`,
            borderRadius: 0,
            padding: '2px 8px',
            textTransform: 'uppercase',
            cursor: 'help',
          }}
        >
          {market.status}
        </span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {market.acceptingNewPositions ? (
          <span
            title="Accepting new leveraged positions"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--green)',
              background: 'var(--green-soft)',
              border: '1px solid rgba(68,255,151,0.2)',
              borderRadius: 0,
              padding: '2px 8px',
              cursor: 'help',
            }}
          >
            YES
          </span>
        ) : (
          <span
            title={rejectionReadable(market.rejectionReasonCode)}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#FF6B6B',
              background: 'rgba(255,107,107,0.08)',
              border: '1px solid rgba(255,107,107,0.2)',
              borderRadius: 0,
              padding: '2px 8px',
              cursor: 'help',
            }}
          >
            NO
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#ffffff' }}>
        {maxLeverage}x
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCopy(market.ticker)
          }}
          title={isCopied ? `Copied ${market.ticker}` : `Copy ticker: ${market.ticker}`}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 0,
            padding: '4px 8px',
            cursor: 'pointer',
            color: isCopied ? 'var(--yellow)' : 'var(--text-dim)',
            fontSize: 10,
            lineHeight: 1,
            transition: 'color 0.15s ease, border-color 0.15s ease',
            borderColor: isCopied ? 'rgba(238,255,0,0.3)' : 'rgba(255,255,255,0.1)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {isCopied ? '✓' : ''}
        </button>
      </td>
    </tr>
  )
}

function MarketListSkeleton() {
  const columns = [240, 70, 60, 50, 60, 40]
  const rows = 18
  const rowTdStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }
  return (
    <div className="markets-table-wrap">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {columns.map((w, c) => (
                <td key={c} style={rowTdStyle}>
                  <div
                    style={{
                      height: 10,
                      width: w,
                      maxWidth: '100%',
                      borderRadius: 0,
                      background: 'rgba(255,255,255,0.06)',
                      animation: 'marketSkeletonPulse 1.4s ease-in-out infinite',
                      animationDelay: `${(r * 40 + c * 20) % 600}ms`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        @keyframes marketSkeletonPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
      `}</style>
    </div>
  )
}

function PageButton({
  label,
  disabled,
  onClick,
}: {
  label: string
  disabled: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && !disabled ? 'rgba(238,255,0,0.06)' : 'var(--surface-subtle)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 0,
        padding: '6px 14px',
        fontSize: 12,
        color: disabled ? '#333333' : 'var(--text)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}
