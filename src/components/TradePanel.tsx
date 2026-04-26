import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount, useBalance } from 'wagmi'
import type { Market } from '../api/types'
import { useOffer } from '../hooks/useOffer'
import { useValueTween } from '../hooks/useValueTween'
import { usePendingPositionsStore } from '../store/pendingPositions'
import {
  useApproveUsdc,
  useCheckAllowance,
  useCreatePosition,
  USDC_ADDRESS,
} from '../contract/hooks'
import { ApiError } from '../api/client'
import { quoteErrorHint, hintAdjustment, type CorrectedField } from '../api/quote-error-hints'
import { CardShell } from './CardShell'
import { ErrorBanner } from './ErrorBanner'
import { LeverageSlider } from './LeverageSlider'
import { QuoteDetails } from './QuoteDetails'
import { QuoteErrorHint } from './QuoteErrorHint'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Input } from './ui/Input'

const PRESET_AMOUNTS = [50, 100, 500] as const
const DEFAULT_SLIPPAGE_BPS = 200
const SLIPPAGE_PRESETS_BPS = [50, 100, 200, 500] as const

export function TradePanel({
  market,
  onClose,
}: {
  market: Market
  onClose: () => void
}) {
  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [collateralUsd, setCollateralUsd] = useState('')
  const [leverageBps, setLeverageBps] = useState(market.leverage.minBps)

  const sideMaxBps = side === 'yes' ? market.leverage.maxYesBps : market.leverage.maxNoBps

  useEffect(() => {
    const { minBps, stepBps } = market.leverage
    const maxSteps = Math.floor((sideMaxBps - minBps) / stepBps)
    setLeverageBps((prev) => {
      const clamped = Math.min(Math.max(prev, minBps), minBps + maxSteps * stepBps)
      const k = Math.round((clamped - minBps) / stepBps)
      return minBps + Math.min(Math.max(k, 0), maxSteps) * stepBps
    })
  }, [market.ticker, market.leverage, sideMaxBps])
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS)
  const [advancedOpen, setAdvancedOpen] = useState(false)

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
    error: approveWriteError,
    receiptError: approveReceiptError,
    reset: resetApprove,
  } = useApproveUsdc()
  const {
    create,
    isPending: createPending,
    isConfirming: createConfirming,
    isSuccess: createSuccess,
    isReceiptError: createReceiptError,
    receiptError: createReceiptErrorObj,
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

  // Clean up the optimistic stub if the flow fails anywhere after the click:
  // wallet rejection / write error, or on-chain revert.
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
    // USDC has 6 decimals; show a trimmed dollar value.
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

  const offerHint = quoteErrorHint(
    offerError instanceof ApiError ? offerError.code : null,
    offerError instanceof ApiError ? offerError.params : null,
    { leverageBps },
  )

  const adjustment = hintAdjustment(offerHint, {
    collateralUsd: Number(collateralUsd) || 0,
    leverageBps,
    slippageBps,
  })

  // Auto-correct inputs the moment a quote error returns a constraint hint.
  // The user still presses Get Quote again to retry — we never silently
  // re-fire the API call.
  const [correction, setCorrection] = useState<{
    field: CorrectedField
    fromValue: number
    toValue: number
    nonce: number
  } | null>(null)
  const [errorPulseNonce, setErrorPulseNonce] = useState(0)
  const lastHandledErrorRef = useRef<unknown>(null)
  const correctionNonceRef = useRef(0)
  const adjustmentRef = useRef(adjustment)
  adjustmentRef.current = adjustment

  useEffect(() => {
    if (!offerError) {
      lastHandledErrorRef.current = null
      return
    }
    if (offerError === lastHandledErrorRef.current) return
    lastHandledErrorRef.current = offerError

    setErrorPulseNonce((n) => n + 1)

    const adj = adjustmentRef.current
    if (!adj) return
    if (Math.abs(adj.toValue - adj.fromValue) < 1e-4) return

    if (adj.field === 'collateral') {
      setCollateralUsd(adj.toValue.toFixed(2))
    } else if (adj.field === 'leverage') {
      setLeverageBps(adj.toValue)
    } else if (adj.field === 'slippage') {
      setSlippageBps(adj.toValue)
      setAdvancedOpen(true)
    }
    correctionNonceRef.current += 1
    setCorrection({
      field: adj.field,
      fromValue: adj.fromValue,
      toValue: adj.toValue,
      nonce: correctionNonceRef.current,
    })
  }, [offerError])

  // Tween display values for whichever field is mid-correction. When the
  // tween isn't active for a given field, we fall back to the live state.
  const collateralTween = useValueTween(
    correction?.field === 'collateral' ? correction.fromValue : 0,
    correction?.field === 'collateral' ? correction.toValue : 0,
    correction?.field === 'collateral' ? correction.nonce : 0,
  )
  const leverageTween = useValueTween(
    correction?.field === 'leverage' ? correction.fromValue : 0,
    correction?.field === 'leverage' ? correction.toValue : 0,
    correction?.field === 'leverage' ? correction.nonce : 0,
  )
  const slippageTween = useValueTween(
    correction?.field === 'slippage' ? correction.fromValue : 0,
    correction?.field === 'slippage' ? correction.toValue : 0,
    correction?.field === 'slippage' ? correction.nonce : 0,
  )

  const displayCollateral =
    correction?.field === 'collateral' && collateralTween.active
      ? collateralTween.value.toFixed(2)
      : collateralUsd
  const displayLeverageBps =
    correction?.field === 'leverage' && leverageTween.active
      ? leverageTween.value
      : leverageBps
  const displaySlippagePct =
    correction?.field === 'slippage' && slippageTween.active
      ? (slippageTween.value / 100).toFixed(2).replace(/\.?0+$/, '')
      : (slippageBps / 100).toString()

  const handleApprove = async () => {
    if (!offer) return
    await approve(
      offer.polygonVaultContractAddress,
      2n ** 256n - 1n,
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

  return (
    <CardShell variant="yellow">
      <div
        className="trade-panel"
        style={{ padding: '22px 24px 20px', position: 'relative' }}
      >
        {errorPulseNonce > 0 && (
          <span
            key={`fail-${errorPulseNonce}`}
            className="panel-fail-ring"
            aria-hidden
          />
        )}
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 20,
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--text)' }}>
              {market.ticker}
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 2 }}>
              {market.title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Side selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <Button
            variant="side-yes"
            active={side === 'yes'}
            onClick={() => { setSide('yes'); clearOffer(); }}
          >
            YES
          </Button>
          <Button
            variant="side-no"
            active={side === 'no'}
            onClick={() => { setSide('no'); clearOffer(); }}
          >
            NO
          </Button>
        </div>

        {/* Collateral */}
        <div style={{ marginBottom: 20 }}>
          <Field
            label="Collateral"
            action={
              usdcBalance ? (
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)' }}>
                  Balance: {(Number(usdcBalance.value) / 1_000_000).toFixed(2)} USDC
                </span>
              ) : null
            }
          >
            <div className="correction-host">
              <Input
                type="number"
                inputMode="decimal"
                value={displayCollateral}
                onChange={(e) => updateCollateral(e.target.value)}
                placeholder="0.00"
                leadingSlot="$"
                trailingSlot="USDC"
              />
              {correction?.field === 'collateral' && (
                <span
                  key={`corr-coll-${correction.nonce}`}
                  className="correction-overlay"
                  aria-hidden
                />
              )}
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="chip"
                onClick={() => addToCollateral(amount)}
              >
                +${amount}
              </Button>
            ))}
            <Button
              variant="chip"
              onClick={handleMax}
              disabled={!usdcBalance}
            >
              MAX
            </Button>
          </div>
        </div>

        {/* Leverage slider */}
        <div
          className="correction-host"
          data-correcting={correction?.field === 'leverage' && leverageTween.active ? 'true' : 'false'}
        >
          <LeverageSlider
            min={market.leverage.minBps}
            max={sideMaxBps}
            step={market.leverage.stepBps}
            value={displayLeverageBps}
            onChange={(v) => { setLeverageBps(v); clearOffer(); }}
          />
          {correction?.field === 'leverage' && (
            <span
              key={`corr-lev-${correction.nonce}`}
              className="correction-overlay"
              aria-hidden
            />
          )}
        </div>

        {/* Advanced */}
        <div className="adv">
          <div className="adv__toggle-row">
            <button
              type="button"
              className="adv__toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((o) => !o)}
            >
              <span className="adv__caret" aria-hidden />
              Advanced
            </button>
            <span className="adv__rule" aria-hidden />
          </div>
          <div className={`adv__panel${advancedOpen ? ' adv__panel--open' : ''}`}>
            <div className="adv__panel-inner">
              <div className="adv__panel-content">
                <div className="adv__row">
                  <span className="adv__label">Slippage</span>
                  <label className="adv__custom correction-host">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={displaySlippagePct}
                      onChange={(e) => {
                        const pct = Number(e.target.value)
                        if (Number.isNaN(pct)) return
                        setSlippageBps(Math.max(0, Math.round(pct * 100)))
                        clearOffer()
                      }}
                      placeholder="2.0"
                      aria-label="Custom slippage percent"
                    />
                    <span className="adv__custom-suffix">%</span>
                    {correction?.field === 'slippage' && (
                      <span
                        key={`corr-slip-${correction.nonce}`}
                        className="correction-overlay"
                        aria-hidden
                      />
                    )}
                  </label>
                  <div className="adv__chips" role="radiogroup" aria-label="Slippage presets">
                    {SLIPPAGE_PRESETS_BPS.map((bps) => {
                      const active = slippageBps === bps
                      return (
                        <button
                          key={bps}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={`adv__chip${active ? ' adv__chip--active' : ''}`}
                          onClick={() => { setSlippageBps(bps); clearOffer(); }}
                        >
                          {bps / 100}%
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Get quote */}
        <div style={{ marginTop: 20, position: 'relative' }}>
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
          {correction && (
            <span
              key={`cta-${correction.nonce}`}
              className="cta-breath"
              aria-hidden
            />
          )}
        </div>

        <ErrorBanner error={offerError} onDismiss={clearOffer} />
        <QuoteErrorHint hint={offerHint} adjustment={adjustment} />
        <ErrorBanner
          error={verifyError ?? createWriteError ?? createReceiptErrorObj}
          onDismiss={resetCreate}
        />
        <ErrorBanner
          error={approveSimError ?? approveWriteError ?? approveReceiptError}
          onDismiss={resetApprove}
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

function QuoteSkeleton() {
  const rowWidths = [72, 92, 84, 110, 96, 88]
  return (
    <div style={{ padding: '12px 0', marginTop: 4 }}>
      <div
        style={{
          height: 12,
          width: 110,
          borderRadius: 4,
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
              borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              animation: 'quoteSkeletonPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 60}ms`,
            }}
          />
          <div
            style={{
              height: 10,
              width: w,
              borderRadius: 4,
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
            borderRadius: 2,
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
              borderRadius: 2,
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
