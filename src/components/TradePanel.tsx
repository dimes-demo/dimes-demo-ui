import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount, useBalance } from 'wagmi'
import type { Market } from '../api/types'
import { useOffer } from '../hooks/useOffer'
import { useMarketOdds } from '../hooks/useMarketOdds'
import { usePendingPositionsStore } from '../store/pendingPositions'
import {
  useApproveUsdc,
  useCheckAllowance,
  useCreatePosition,
  USDC_ADDRESS,
} from '../contract/hooks'
import { CardShell } from './CardShell'
import { ErrorBanner } from './ErrorBanner'
import { LeverageSlider } from './LeverageSlider'
import { QuoteDetails } from './QuoteDetails'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Input } from './ui/Input'

const PRESET_AMOUNTS = [50, 100, 500] as const
const DEFAULT_SLIPPAGE_BPS = 800 // 8%
const DEFAULT_LEVERAGE_BPS = 20000 // 2x
const FORCED_LEVERAGE_STEP_BPS = 5000 // 0.5x

function clampLeverageToMarket(target: number, market: { leverage: { minBps: number; maxBps: number; stepBps: number } }) {
  const step = Math.max(market.leverage.stepBps, FORCED_LEVERAGE_STEP_BPS)
  const minBps = market.leverage.minBps
  const maxBps = market.leverage.maxBps
  const maxSteps = Math.max(0, Math.floor((maxBps - minBps) / step))
  const clamped = Math.min(Math.max(target, minBps), minBps + maxSteps * step)
  const k = Math.round((clamped - minBps) / step)
  return minBps + Math.min(Math.max(k, 0), maxSteps) * step
}

export function TradePanel({
  market,
  onClose,
}: {
  market: Market
  onClose: () => void
}) {
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [collateralUsd, setCollateralUsd] = useState('')
  const [leverageBps, setLeverageBps] = useState(() =>
    clampLeverageToMarket(DEFAULT_LEVERAGE_BPS, market),
  )
  const [showTicker, setShowTicker] = useState(false)

  useEffect(() => {
    setLeverageBps(clampLeverageToMarket(DEFAULT_LEVERAGE_BPS, market))
    setShowTicker(false)
  }, [market.ticker, market.leverage.minBps, market.leverage.maxBps, market.leverage.stepBps])

  const slippageBps = DEFAULT_SLIPPAGE_BPS

  const queryClient = useQueryClient()
  const addPendingStub = usePendingPositionsStore((s) => s.add)
  const removePendingStub = usePendingPositionsStore((s) => s.remove)
  const { address, isConnected } = useAccount()
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
    query: { enabled: !!address },
  })

  const { offer, isLoading: offerLoading, error: offerError, getQuote, clearOffer } = useOffer()
  const {
    approve,
    isPending: approvePending,
    isConfirming: approveConfirming,
    isSuccess: approveSuccess,
    simulateError: approveSimError,
  } = useApproveUsdc()
  const {
    create,
    isPending: createPending,
    isConfirming: createConfirming,
    isSuccess: createSuccess,
    isReceiptError: createReceiptError,
    error: createWriteError,
    verifyError,
    reset: resetCreate,
  } = useCreatePosition()
  const { allowance, refetch: refetchAllowance } = useCheckAllowance(
    address,
    offer?.polygonVaultContractAddress as `0x${string}` | undefined,
  )

  const requiredApproval = offer ? BigInt(offer.totalUserAmountUsdcUnits) : 0n
  const hasAllowance = allowance !== undefined && allowance >= requiredApproval && requiredApproval > 0n
  const canCreate = hasAllowance || approveSuccess

  const canGetQuote = isConnected && collateralUsd && Number(collateralUsd) > 0

  useEffect(() => {
    if (createSuccess) {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    }
  }, [createSuccess, queryClient])

  const stubKey = offer?.onChainPositionKey
  useEffect(() => {
    if (!stubKey) return
    if (createWriteError || verifyError || createReceiptError) {
      removePendingStub(stubKey)
    }
  }, [stubKey, createWriteError, verifyError, createReceiptError, removePendingStub])

  const [isOfferExpired, setIsOfferExpired] = useState(false)
  useEffect(() => {
    if (!offer) {
      setIsOfferExpired(false)
      return
    }
    const check = () => setIsOfferExpired(new Date(offer.expiresAt).getTime() <= Date.now())
    check()
    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [offer])

  const updateCollateral = (next: string) => {
    setCollateralUsd(next)
    clearOffer()
  }

  const addToCollateral = (delta: number) => {
    const current = Number(collateralUsd) || 0
    updateCollateral(String(current + delta))
  }

  const handleMax = () => {
    if (!usdcBalance) return
    const asDollars = Number(usdcBalance.value) / 1_000_000
    updateCollateral(asDollars.toFixed(2))
  }

  const handleGetQuote = () => {
    if (!canGetQuote) return
    resetCreate()
    getQuote({
      marketTicker: market.ticker,
      effectiveSide: side,
      leverageBps,
      collateralUsd: Number(collateralUsd),
      slippageBps,
    })
  }

  const handleApprove = async () => {
    if (!offer) return
    await approve(
      offer.polygonVaultContractAddress,
      BigInt(offer.totalUserAmountUsdcUnits),
    )
    refetchAllowance()
  }

  const handleCreate = () => {
    if (!offer) return
    if (offer.onChainPositionKey) {
      addPendingStub({
        key: offer.onChainPositionKey,
        marketTicker: offer.marketTicker,
        side: offer.effectiveSide === 'no' ? 'no' : 'yes',
        leverageBps: offer.leverageBps,
        collateralUsd: offer.notionalAmountUsd
          ? (Number(offer.notionalAmountUsd) / (offer.leverageBps / 10000)).toFixed(2)
          : collateralUsd,
        createdAt: Date.now(),
      })
    }
    create(offer)
  }

  const headlineText = showTicker
    ? market.ticker
    : market.title || market.ticker

  const odds = useMarketOdds(
    market.ticker,
    market.acceptingNewPositions,
    market.leverage.minBps,
  )
  const formatCents = (p: number) =>
    p < 0.1 ? `${(p * 100).toFixed(1)}¢` : `${Math.round(p * 100)}¢`

  return (
    <CardShell variant="yellow" className="trade-panel-card-shell">
      <div className="trade-panel" style={{ padding: '24px 24px 20px' }}>
        {/* Header — title (click to toggle ticker) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 18,
            gap: 12,
          }}
        >
          <div
            onClick={() => setShowTicker((s) => !s)}
            title={showTicker ? 'Click for title' : 'Click for ticker'}
            style={{
              minWidth: 0,
              flex: '1 1 auto',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              fontFamily: showTicker ? 'monospace' : 'var(--font)',
            }}
          >
            {headlineText}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Side selector — odds shown under YES/NO when available */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 18,
          }}
        >
          <SideButton
            label="YES"
            sub={odds ? formatCents(odds.yes) : market.yesSubTitle}
            variant="yes"
            active={side === 'yes'}
            onClick={() => { setSide('yes'); clearOffer(); }}
          />
          <SideButton
            label="NO"
            sub={odds ? formatCents(odds.no) : null}
            variant="no"
            active={side === 'no'}
            onClick={() => { setSide('no'); clearOffer(); }}
          />
        </div>

        {/* Collateral */}
        <div style={{ marginBottom: 18 }}>
          <Field label="Collateral">
            <Input
              type="number"
              inputMode="decimal"
              value={collateralUsd}
              onChange={(e) => updateCollateral(e.target.value)}
              placeholder="0.00"
              leadingSlot="$"
            />
          </Field>
          <div className="quick-btn-row">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="quick-btn"
                onClick={() => addToCollateral(amount)}
              >
                +${amount}
              </button>
            ))}
            <button
              type="button"
              className="quick-btn"
              onClick={handleMax}
              disabled={!usdcBalance}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Leverage card */}
        <div className="lev-wrap">
          <LeverageSlider
            min={market.leverage.minBps}
            max={market.leverage.maxBps}
            step={Math.max(market.leverage.stepBps, FORCED_LEVERAGE_STEP_BPS)}
            value={leverageBps}
            onChange={(v) => { setLeverageBps(v); clearOffer(); }}
          />
        </div>

        {/* Get quote */}
        <div style={{ marginTop: 18 }}>
          <Button
            variant="primary"
            fullWidth
            disabled={!canGetQuote || offerLoading}
            onClick={handleGetQuote}
          >
            {offerLoading
              ? 'Getting quote…'
              : isConnected
                ? 'Get quote'
                : 'Connect wallet to trade'}
          </Button>
        </div>

        <ErrorBanner error={offerError} onDismiss={clearOffer} />
        <ErrorBanner
          error={verifyError ? new Error(verifyError) : null}
          onDismiss={resetCreate}
        />
        <ErrorBanner
          error={approveSimError ? new Error(approveSimError) : null}
          onDismiss={() => {}}
        />

        {offerLoading && !offer && <QuoteSkeleton />}

        {offer && <QuoteDetails offer={offer} hideExpiry={createSuccess} />}

        {offer && !createSuccess && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {!canCreate && (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleApprove}
                disabled={approvePending || approveConfirming || isOfferExpired}
              >
                {approveConfirming ? 'Confirming…' : approvePending ? 'Approving…' : 'Approve USDC'}
              </Button>
            )}
            <Button
              variant="primary"
              fullWidth
              onClick={handleCreate}
              disabled={!canCreate || createPending || createConfirming || isOfferExpired}
            >
              {isOfferExpired
                ? 'Quote expired'
                : createConfirming
                  ? 'Confirming…'
                  : createPending
                    ? 'Creating…'
                    : 'Create position'}
            </Button>
          </div>
        )}

        {createSuccess && (
          <div
            style={{
              marginTop: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              background: 'var(--green-soft)',
              border: '1px solid var(--green-border)',
              color: 'var(--green)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Position created successfully.
          </div>
        )}
      </div>
    </CardShell>
  )
}

function SideButton({
  label,
  sub,
  variant,
  active,
  onClick,
}: {
  label: string
  sub: string | null
  variant: 'yes' | 'no'
  active: boolean
  onClick: () => void
}) {
  const isYes = variant === 'yes'
  const accent = isYes ? 'var(--green)' : 'var(--red)'
  const accentSoft = isYes ? 'var(--green-soft)' : 'var(--red-soft)'
  const accentBorder = isYes ? 'var(--green-border)' : 'var(--red-border)'

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '12px 0',
        borderRadius: 'var(--radius)',
        border: `1px solid ${active ? accentBorder : 'var(--border)'}`,
        background: active ? accentSoft : 'transparent',
        color: active ? accent : 'var(--text-muted)',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}>{label}</span>
      {sub ? (
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            opacity: active ? 0.85 : 0.6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {sub}
        </span>
      ) : null}
    </button>
  )
}

function QuoteSkeleton() {
  const rowWidths = [72, 92, 84, 110, 96, 88]
  return (
    <div style={{ padding: '12px 0', marginTop: 4 }}>
      <div
        style={{
          height: 12,
          width: 110,
          borderRadius: 0,
          background: 'rgba(255,255,255,0.08)',
          marginBottom: 14,
          animation: 'quoteSkeletonPulse 1.4s ease-in-out infinite',
        }}
      />
      {rowWidths.map((w, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '9px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div
            style={{
              height: 10,
              width: 74,
              borderRadius: 0,
              background: 'rgba(255,255,255,0.05)',
              animation: 'quoteSkeletonPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 60}ms`,
            }}
          />
          <div
            style={{
              height: 10,
              width: w,
              borderRadius: 0,
              background: 'rgba(238,255,0,0.08)',
              animation: 'quoteSkeletonPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 60 + 120}ms`,
            }}
          />
        </div>
      ))}
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            height: 3,
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '30%',
              background: 'var(--yellow)',
              borderRadius: 0,
              animation: 'quoteSkeletonSlide 1.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes quoteSkeletonPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
        @keyframes quoteSkeletonSlide {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  )
}
