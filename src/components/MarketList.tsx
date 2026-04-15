import { useState, useMemo, useEffect, useRef } from 'react'
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
}: {
  onSelectMarket: (market: Market) => void
}) {
  const [search, setSearch] = useState(() => getQueryParam('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => getQueryParam('q') ?? '')
  const [category, setCategoryState] = useState<string | undefined>(() => getQueryParam('category'))
  const [status, setStatusState] = useState<string | undefined>(() => getQueryParam('status'))
  const [eligible, setEligibleState] = useState<string | undefined>(() => getQueryParam('eligible'))
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

  const { data: page, isLoading } = useMarkets(
    category,
    debouncedSearch || undefined,
    status,
    acceptingNewPositions,
    cursor,
  )

  const markets = page?.data

  const hasMore = page?.hasMore ?? false
  const hasPrev = cursorStack.length > 0

  // Extract unique categories from the current page for the filter dropdown
  const categories = useMemo(() => {
    if (!markets) return []
    const set = new Set(markets.map((m) => m.category).filter(Boolean))
    return Array.from(set).sort()
  }, [markets])

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
            <option key={c} value={c}>{c}</option>
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
          <option value="yes">Accepting offers</option>
          <option value="no">Not accepting offers</option>
        </select>
      </div>

      {isLoading ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>Loading markets...</span>
        </div>
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
                  <th style={thStyle}>Provider</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Eligible</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Max Leverage</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Min Notional</th>
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
}: {
  market: Market
  onSelect: (market: Market) => void
  onCopy: (ticker: string) => void
  isCopied: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const maxLeverage = (market.leverage.maxBps / 10000).toFixed(0)

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  return (
    <tr
      onClick={() => onSelect(market)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        background: hovered ? 'rgba(238,255,0,0.03)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
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
      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-muted)' }}>
        {market.provider}
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
              ? market.rejectionReasonCode.replace(/^offer_/, '').replaceAll('_', ' ')
              : 'NO'}
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--yellow)' }}>
        {maxLeverage}x
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
        ${market.minNotionalUsd}
      </td>
    </tr>
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
