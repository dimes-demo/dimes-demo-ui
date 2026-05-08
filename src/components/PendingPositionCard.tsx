import { useState } from 'react'
import type { PendingPositionStub } from '../store/pendingPositions'
import { usePendingPositionsStore } from '../store/pendingPositions'
import { useMarket } from '../hooks/useMarketTitle'
import { CardShell } from './CardShell'

export function PendingPositionCard({ stub }: { stub: PendingPositionStub }) {
  const market = useMarket(stub.marketTicker)
  const displayTitle = market?.title || stub.marketTicker
  const [marketIdCopied, setMarketIdCopied] = useState(false)
  const removePendingStub = usePendingPositionsStore((s) => s.remove)
  const onCopyMarketId = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!market?.id) return
    navigator.clipboard.writeText(market.id)
    setMarketIdCopied(true)
    setTimeout(() => setMarketIdCopied(false), 1500)
  }
  const isYes = stub.side === 'yes'
  const sideColor = isYes ? 'var(--green)' : 'var(--red)'
  const sideSoft = isYes ? 'var(--green-soft)' : 'var(--red-soft)'
  const sideBorder = isYes ? 'var(--green-border)' : 'var(--red-border)'
  const leverageX = (stub.leverageBps / 10000).toFixed(2)
  const collateral = Number(stub.collateralUsd || 0).toFixed(2)

  return (
    <CardShell variant="yellow">
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 24px 20px' }}>
        {/* Status banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: stub.failed ? 'rgba(224,82,82,0.08)' : 'rgba(245,166,35,0.08)',
            border: `1px solid ${stub.failed ? 'rgba(224,82,82,0.25)' : 'rgba(245,166,35,0.22)'}`,
            borderRadius: 0,
            padding: '10px 12px',
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: stub.failed ? '#E05252' : '#F5A623',
              animation: stub.failed ? undefined : 'pendingPulse 1.1s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, color: stub.failed ? '#F5A1A1' : '#F5A623', fontWeight: 600 }}>
              {stub.failed ? 'Transaction failed — check your wallet' : 'Opening position'}
            </div>
            {!stub.failed && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Awaiting on-chain confirmation on Polygon…
              </div>
            )}
          </div>
          {stub.failed && (
            <button
              onClick={() => removePendingStub(stub.key)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(245,161,161,0.6)',
                cursor: 'pointer',
                padding: 4,
                flexShrink: 0,
                lineHeight: 1,
                fontSize: 16,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          )}
          {!stub.failed && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: 'rgba(245,166,35,0.15)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '40%',
                  background: '#F5A623',
                  animation: 'pendingSlide 1.6s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </div>

        {/* Header: ticker + side chip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              onClick={onCopyMarketId}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: marketIdCopied ? 'var(--green)' : '#ffffff',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
                cursor: market?.id ? 'pointer' : 'default',
                transition: 'color 0.2s',
              }}
              title={
                marketIdCopied
                  ? 'Market ID copied'
                  : market?.id
                    ? `${displayTitle} — click to copy market ID`
                    : displayTitle
              }
            >
              {marketIdCopied ? '✓ Market ID copied' : displayTitle}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                marginTop: 3,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              ${collateral} · {leverageX}x
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              padding: '4px 10px',
              borderRadius: 0,
              background: sideSoft,
              border: `1px solid ${sideBorder}`,
              color: sideColor,
              flexShrink: 0,
            }}
          >
            {isYes ? 'YES' : 'NO'}
          </span>
        </div>

        {/* Skeleton stat rows */}
        <div style={{ display: 'grid', gap: 11 }}>
          {[[64, 82], [78, 96], [56, 74], [86, 90], [70, 110]].map(([l, r], i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <Shimmer width={l} height={10} delay={i * 70} tone="dim" />
              <Shimmer width={r} height={10} delay={i * 70 + 110} tone="accent" />
            </div>
          ))}
        </div>

        {/* Button skeleton */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              height: 40,
              borderRadius: 'var(--radius)',
              background: 'rgba(238,255,0,0.06)',
              border: '1px solid rgba(238,255,0,0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(238,255,0,0.14) 50%, transparent 100%)',
                animation: 'pendingSheen 1.8s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes pendingPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
          @keyframes pendingSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
          @keyframes pendingShimmer {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.75; }
          }
          @keyframes pendingSheen {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </CardShell>
  )
}

function Shimmer({
  width,
  height,
  delay,
  tone,
}: {
  width: number
  height: number
  delay: number
  tone: 'dim' | 'accent'
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 0,
        background: tone === 'accent' ? 'rgba(238,255,0,0.10)' : 'rgba(255,255,255,0.06)',
        animation: 'pendingShimmer 1.4s ease-in-out infinite',
        animationDelay: `${delay}ms`,
      }}
    />
  )
}
