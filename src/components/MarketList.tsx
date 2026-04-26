import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMarkets } from '../hooks/useMarkets'
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

export function MarketList({
  onSelectMarket,
  selectedMarketId,
}: {
  onSelectMarket: (market: Market) => void
  selectedMarketId?: string | null
}) {
  const [search, setSearch] = useState(() => getQueryParam('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => getQueryParam('q') ?? '')
  const [category, setCategoryState] = useState<string | undefined>(() => getQueryParam('category'))
  const [status, setStatusState] = useState<string | undefined>(() => getQueryParam('status'))
  const [eligible, setEligibleState] = useState<string | undefined>(() => getQueryParam('eligible') ?? 'yes')
  const [copiedTicker, setCopiedTicker] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cursor-based pagination: current page cursor + a stack to walk backwards.
  const [cursor, setCursor] = useState<string | undefined>(() => getQueryParam('after'))
  const [cursorStack, setCursorStack] = useState<string[]>([])

  const resetPagination = () => {
    setCursor(undefined)
    setCursorStack([])
  }

  // Debounce search input. Resetting pagination when the debounced value
  // actually changes happens below via setSearch's wrapper.
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

  // Sync state to URL query params
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

  const categories = ['Sport', 'Crypto']

  const formatCategory = (c: string) =>
    c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()

  const shouldScrollRef = useRef(false)

  // Scroll to top after page data loads from a pagination click
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

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-subtle)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  }

  return (
    <div ref={containerRef} style={{ padding: '16px 0' }}>
      {/* Search & filter toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 200px', minWidth: 180 }}
        />
        <select
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || undefined)}
          style={{ ...inputStyle, flex: '0 0 auto', cursor: 'pointer' }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c.toLowerCase()}>{formatCategory(c)}</option>
          ))}
        </select>
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value || undefined)}
          style={{ ...inputStyle, flex: '0 0 auto', cursor: 'pointer' }}
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
          style={{ ...inputStyle, flex: '0 0 auto', cursor: 'pointer' }}
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
          style={{
            ...inputStyle,
            flex: '0 0 auto',
            cursor: isFetching ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10px',
            color: 'var(--text)',
          }}
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
          <div
            style={{
              border: '1px solid rgba(238,255,0,0.15)',
              borderRadius: 12,
              overflow: 'auto',
              background: 'var(--card)',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: 800,
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th style={thStyle}>Ticker</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Eligible</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Max Leverage YES</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Max Leverage NO</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    onSelect={onSelectMarket}
                    onCopy={copyTicker}
                    isCopied={copiedTicker === market.ticker}
                    isSelected={selectedMarketId === market.id}
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
                justifyContent: 'space-between',
                marginTop: 12,
                padding: '0 4px',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                Page {cursorStack.length + 1}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <PageButton
                  label="Previous"
                  disabled={!hasPrev}
                  onClick={goPrev}
                />
                <PageButton
                  label="Next"
                  disabled={!hasMore}
                  onClick={goNext}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
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
  const [pressed, setPressed] = useState(false)
  const maxLeverageYes = (market.leverage.maxYesBps / 10000).toFixed(0)
  const maxLeverageNo = (market.leverage.maxNoBps / 10000).toFixed(0)

  const rowBg = isSelected
    ? 'rgba(238,255,0,0.09)'
    : pressed
    ? 'rgba(238,255,0,0.14)'
    : hovered
    ? 'rgba(238,255,0,0.03)'
    : 'transparent'

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.18s ease, box-shadow 0.18s ease',
  }

  const firstTdStyle: React.CSSProperties = {
    ...tdStyle,
    maxWidth: 200,
    boxShadow: isSelected ? 'inset 3px 0 0 var(--yellow)' : 'none',
  }

  return (
    <tr
      onClick={() => onSelect(market)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        cursor: 'pointer',
        background: rowBg,
        transition: 'background 0.18s ease',
      }}
    >
      <td style={firstTdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            title={market.ticker}
            style={{
              fontWeight: 600,
              fontFamily: 'monospace',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: '1 1 auto',
              color: isSelected ? 'var(--yellow)' : undefined,
            }}
          >
            {market.ticker}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCopy(market.ticker)
            }}
            title="Copy ticker"
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              color: isCopied ? 'var(--yellow)' : 'var(--text-dim)',
              fontSize: 11,
              lineHeight: 1,
              transition: 'color 0.15s ease, border-color 0.15s ease',
              borderColor: isCopied ? 'rgba(238,255,0,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {isCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </td>
      <td
        style={{
          ...tdStyle,
          maxWidth: 280,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--text-muted)',
        }}
      >
        {market.title || '—'}
      </td>
      <td style={tdStyle}>
        {market.category && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'var(--surface-subtle)',
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {market.category}
          </span>
        )}
      </td>
      <td style={tdStyle}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: market.status === 'open' ? 'var(--green)' : 'var(--text-muted)',
            background:
              market.status === 'open'
                ? 'var(--green-soft)'
                : 'var(--border)',
            border: `1px solid ${
              market.status === 'open'
                ? 'rgba(68,255,151,0.2)'
                : 'var(--border)'
            }`,
            borderRadius: 4,
            padding: '2px 8px',
            textTransform: 'uppercase',
          }}
        >
          {market.status}
        </span>
      </td>
      <td style={tdStyle}>
        {market.acceptingNewPositions ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--green)',
              background: 'var(--green-soft)',
              border: '1px solid rgba(68,255,151,0.2)',
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            YES
          </span>
        ) : (
          <span
            title={market.rejectionReasonCode ?? undefined}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#FF6B6B',
              background: 'rgba(255,107,107,0.08)',
              border: '1px solid rgba(255,107,107,0.2)',
              borderRadius: 4,
              padding: '2px 8px',
              cursor: market.rejectionReasonCode ? 'help' : undefined,
            }}
          >
            {market.rejectionReasonCode
              ? market.rejectionReasonCode.replace(/^QUOTE_/, '').replaceAll('_', ' ')
              : 'NO'}
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--yellow)' }}>
        {maxLeverageYes}x
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--yellow)' }}>
        {maxLeverageNo}x
      </td>
    </tr>
  )
}

function MarketListSkeleton() {
  const columns = [80, 240, 70, 60, 50, 60, 60]
  const rows = 15
  const rowTdStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }
  return (
    <div
      style={{
        border: '1px solid rgba(238,255,0,0.15)',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'var(--card)',
      }}
    >
      <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
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
                      borderRadius: 4,
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
        borderRadius: 6,
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
