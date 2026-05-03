import { useState, useEffect, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount, useBalance } from 'wagmi'
import type { Market, MarketLeverage } from '../api/types'
import { leverageMaxBps } from '../api/types'
import { useTradeMachine, buildOfferParams } from '../hooks/useTradeMachine'
import { useValueTween } from '../hooks/useValueTween'
import { usePendingPositionsStore } from '../store/pendingPositions'
import {
  useApproveUsdc,
  useCheckAllowance,
  useCreatePosition,
  USDC_ADDRESS,
} from '../contract/hooks'
import { isDemoMode } from '../api/auth'
import { ApiError } from '../api/client'
import { quoteErrorHint, hintAdjustment, type CorrectedField } from '../api/quote-error-hints'
import { maxViableLeverageBps } from '../utils/capacity'
import { CapacityGuide } from './CapacityGuide'
import { CardShell } from './CardShell'
import { ErrorBanner } from './ErrorBanner'
import { LeverageSlider } from './LeverageSlider'
import { QuoteDetails } from './QuoteDetails'
import { QuoteErrorHint } from './QuoteErrorHint'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Input } from './ui/Input'

const PRESET_AMOUNTS = [50, 100, 500] as const
const DEFAULT_SLIPPAGE_BPS = 800 // 8%
const DEFAULT_LEVERAGE_BPS = 20000 // 2x
const SLIPPAGE_PRESETS_BPS = [200, 500, 800] as const
const FORCED_LEVERAGE_STEP_BPS = 5000 // 0.5x

function clampLeverageToMarket(target: number, market: { leverage: MarketLeverage }, side: 'yes' | 'no' = 'yes', round: 'nearest' | 'down' | 'up' = 'nearest') {
  const step = Math.max(market.leverage.stepBps, FORCED_LEVERAGE_STEP_BPS)
  const minBps = market.leverage.minBps
  const maxBps = leverageMaxBps(market.leverage, side)
  const maxSteps = Math.max(0, Math.floor((maxBps - minBps) / step))
  const clamped = Math.min(Math.max(target, minBps), minBps + maxSteps * step)
  const snap = round === 'down' ? Math.floor : round === 'up' ? Math.ceil : Math.round
  const k = snap((clamped - minBps) / step)
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
    clampLeverageToMarket(DEFAULT_LEVERAGE_BPS, market, side),
  )
  const [showTicker, setShowTicker] = useState(false)

  const sideMaxBps = leverageMaxBps(market.leverage, side)
  const maxViableLev = useMemo(() => maxViableLeverageBps(market, side), [market, side])

  useEffect(() => {
    setLeverageBps(clampLeverageToMarket(DEFAULT_LEVERAGE_BPS, market, side))
    setShowTicker(false)
  }, [market.ticker, market.leverage.minBps, market.leverage.maxBps, market.leverage.maxYesBps, market.leverage.maxNoBps, market.leverage.stepBps, side])
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

  const [isAutoCorrectingRef] = useState(() => ({ current: false }))
  const { state: tradeState, getDraft, promote, correctAndPromote, acceptChanges, reset: resetTrade } = useTradeMachine()

  const draft = tradeState.phase === 'draft-ready' ? tradeState.draft
    : tradeState.phase === 'promoting' ? tradeState.draft
    : tradeState.phase === 'promoted' ? tradeState.draft
    : tradeState.phase === 'market-moved' ? tradeState.newDraft
    : tradeState.phase === 'error' ? tradeState.draft
    : null

  const promotedOffer = tradeState.phase === 'promoted' ? tradeState.promotedOffer : null

  const quotedAt = (tradeState.phase === 'draft-ready' || tradeState.phase === 'promoting'
    || tradeState.phase === 'promoted' || tradeState.phase === 'market-moved')
    ? tradeState.quotedAt : undefined

  const correctedFrom = tradeState.phase === 'promoted' ? tradeState.correctedFrom : undefined

  const offerLoading = tradeState.phase === 'loading-draft'
  const offerError = tradeState.phase === 'error' ? tradeState.error : null
  const isPromoting = tradeState.phase === 'promoting'
  const isMarketMoved = tradeState.phase === 'market-moved'
  const isCorrecting = isPromoting && isAutoCorrectingRef.current

  const clearOffer = resetTrade
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
    draft?.polygonVaultContractAddress as `0x${string}` | undefined,
  )

  const requiredApproval = draft ? BigInt(draft.totalUserAmountUsdcUnits) : 0n
  const hasAllowance = allowance !== undefined && allowance >= requiredApproval && requiredApproval > 0n
  const canCreate = hasAllowance || approveSuccess

  const canGetQuote = isConnected && collateralUsd && Number(collateralUsd) > 0

  useEffect(() => {
    if (createSuccess) {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
    }
  }, [createSuccess, queryClient])

  const stubKey = promotedOffer?.onChainPositionKey
  useEffect(() => {
    if (!stubKey) return
    if (createWriteError || verifyError || createReceiptError) {
      removePendingStub(stubKey)
    }
  }, [stubKey, createWriteError, verifyError, createReceiptError, removePendingStub])

  // Track promoted offer expiry — the 15s matters while the wallet is open
  const [isOfferExpired, setIsOfferExpired] = useState(false)
  useEffect(() => {
    if (!promotedOffer) {
      setIsOfferExpired(false)
      return
    }
    const check = () => setIsOfferExpired(new Date(promotedOffer.expiresAt).getTime() <= Date.now())
    check()
    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [promotedOffer])

  const walletOpen = !!(promotedOffer && (createPending || createConfirming))

  // Trigger wallet signing as soon as promotion succeeds
  const prevPromotedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!promotedOffer) return
    isAutoCorrectingRef.current = false
    if (prevPromotedRef.current === promotedOffer.id) return
    prevPromotedRef.current = promotedOffer.id
    if (promotedOffer.onChainPositionKey) {
      addPendingStub({
        key: promotedOffer.onChainPositionKey,
        marketTicker: promotedOffer.marketTicker,
        side: promotedOffer.effectiveSide === 'no' ? 'no' : 'yes',
        leverageBps: promotedOffer.leverageBps,
        collateralUsd: promotedOffer.notionalAmountUsd
          ? (Number(promotedOffer.notionalAmountUsd) / (promotedOffer.leverageBps / 10000)).toFixed(2)
          : collateralUsd,
        createdAt: Date.now(),
      })
    }
    create(promotedOffer)
  }, [promotedOffer])

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
    getDraft({
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
  const correctionNonceRef = useRef(0)
  const adjustmentRef = useRef(adjustment)
  adjustmentRef.current = adjustment

  useEffect(() => {
    if (!offerError) return

    const adj = adjustmentRef.current
    const errorDraft = tradeState.phase === 'error' ? tradeState.draft : undefined
    const hasAdjustment = adj && Math.abs(adj.toValue - adj.fromValue) >= 1e-4

    if (!hasAdjustment) {
      isAutoCorrectingRef.current = false
      setErrorPulseNonce((n) => n + 1)
      return
    }

    isAutoCorrectingRef.current = true

    let adjustedCollateral = Number(collateralUsd) || 0
    let adjustedLeverage = leverageBps
    let adjustedSlippage = slippageBps
    let toValue = adj.toValue

    if (adj.field === 'collateral') {
      setCollateralUsd(adj.toValue.toFixed(2))
      adjustedCollateral = adj.toValue
    } else if (adj.field === 'leverage') {
      const round = adj.reason === 'clamp-max' ? 'down' : 'up'
      toValue = clampLeverageToMarket(adj.toValue, market, side, round)
      setLeverageBps(toValue)
      adjustedLeverage = toValue
    } else if (adj.field === 'slippage') {
      setSlippageBps(adj.toValue)
      setAdvancedOpen(true)
      adjustedSlippage = adj.toValue
    }
    correctionNonceRef.current += 1
    setCorrection({
      field: adj.field,
      fromValue: adj.fromValue,
      toValue,
      nonce: correctionNonceRef.current,
    })

    const adjustedTradeParams = {
      marketTicker: market.ticker,
      effectiveSide: side,
      leverageBps: adjustedLeverage,
      collateralUsd: adjustedCollateral,
      slippageBps: adjustedSlippage,
    }

    if (errorDraft) {
      correctAndPromote(errorDraft, buildOfferParams(adjustedTradeParams))
    } else {
      getDraft(adjustedTradeParams)
    }

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
    if (!draft) return
    await approve(
      draft.polygonVaultContractAddress,
      2n ** 256n - 1n,
    )
    refetchAllowance()
  }

  const handleCreate = () => {
    if (!draft) return
    promote(draft)
  }

  const handleAcceptChanges = () => {
    if (tradeState.phase !== 'market-moved') return
    acceptChanges(tradeState.newDraft, tradeState.retryCount)
  }

  const headlineText = showTicker
    ? market.ticker
    : market.title || market.ticker

  const formatCents = (usd: string) => {
    const p = Number(usd)
    return p < 0.1 ? `${(p * 100).toFixed(1)}¢` : `${Math.round(p * 100)}¢`
  }

  return (
    <CardShell variant="yellow" className="trade-panel-card-shell">
      <div
        className="trade-panel"
        style={{ padding: '24px 24px 20px', position: 'relative' }}
      >
        {errorPulseNonce > 0 && (
          <span
            key={`fail-${errorPulseNonce}`}
            className="panel-fail-ring"
            aria-hidden
          />
        )}
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
            sub={market.prices ? formatCents(market.prices.yesBidPriceUsd) : market.yesSubTitle}
            variant="yes"
            active={side === 'yes'}
            onClick={() => { setSide('yes'); clearOffer(); }}
          />
          <SideButton
            label="NO"
            sub={market.prices ? formatCents(market.prices.noBidPriceUsd) : null}
            variant="no"
            active={side === 'no'}
            onClick={() => { setSide('no'); clearOffer(); }}
          />
        </div>

        {/* Collateral */}
        <div style={{ marginBottom: 18 }}>
          <Field label="Collateral">
            <div className="correction-host">
              <Input
                type="number"
                inputMode="decimal"
                value={displayCollateral}
                onChange={(e) => updateCollateral(e.target.value)}
                placeholder="0.00"
                leadingSlot="$"
              />
              {correction?.field === 'collateral' && !isAutoCorrectingRef.current && (
                <span
                  key={`corr-coll-${correction.nonce}`}
                  className="correction-overlay"
                  aria-hidden
                />
              )}
            </div>
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
        <div
          className="lev-wrap correction-host"
          data-correcting={correction?.field === 'leverage' && leverageTween.active ? 'true' : 'false'}
        >
          <LeverageSlider
            min={market.leverage.minBps}
            max={sideMaxBps}
            step={Math.max(market.leverage.stepBps, FORCED_LEVERAGE_STEP_BPS)}
            value={displayLeverageBps}
            onChange={(v) => { setLeverageBps(v); clearOffer(); }}
            maxViableStep={maxViableLev}
          />
          {correction?.field === 'leverage' && !isAutoCorrectingRef.current && (
            <span
              key={`corr-lev-${correction.nonce}`}
              className="correction-overlay"
              aria-hidden
            />
          )}
        </div>

        <CapacityGuide
          market={market}
          side={side}
          leverageBps={leverageBps}
          collateralUsd={Number(collateralUsd) || 0}
        />

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
                    {correction?.field === 'slippage' && !isAutoCorrectingRef.current && (
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
        <div style={{ marginTop: 18, position: 'relative' }}>
          <Button
            variant={draft && !createSuccess ? 'ghost' : 'primary'}
            className="get-quote-btn"
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
          {correction && !isAutoCorrectingRef.current && (
            <span
              key={`cta-${correction.nonce}`}
              className="cta-breath"
              aria-hidden
            />
          )}
        </div>

        {!offerHint && !isAutoCorrectingRef.current && <ErrorBanner error={offerError} onDismiss={clearOffer} />}
        {!isAutoCorrectingRef.current && (
          <QuoteErrorHint
            hint={offerHint}
            adjustment={adjustment}
            market={market}
            side={side}
            leverageBps={leverageBps}
          />
        )}
        <ErrorBanner
          error={verifyError ?? createWriteError ?? createReceiptErrorObj}
          onDismiss={resetCreate}
        />
        <ErrorBanner
          error={approveSimError ?? approveWriteError ?? approveReceiptError}
          onDismiss={resetApprove}
        />

        {offerLoading && !draft && <QuoteSkeleton />}

        {draft && (
          <QuoteDetails
            offer={walletOpen ? promotedOffer! : draft}
            hideExpiry={!walletOpen}
            previousOffer={isMarketMoved ? tradeState.originalDraft : correctedFrom}
            quotedAt={quotedAt}
            onRefresh={handleGetQuote}
          />
        )}

        {isMarketMoved && (
          <div
            style={{
              marginTop: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              background: 'rgba(245, 166, 35, 0.08)',
              border: '1px solid rgba(245, 166, 35, 0.25)',
              color: '#F5A623',
              fontSize: 'var(--fs-sm)',
              fontWeight: 500,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              Market conditions changed — review the updated numbers above.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" onClick={handleAcceptChanges}>
                Accept Changes
              </Button>
              <Button variant="ghost" onClick={resetTrade}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {draft && !createSuccess && isDemoMode && (
          <div
            style={{
              marginTop: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              background: 'rgba(238,255,0,0.08)',
              border: '1px solid rgba(238,255,0,0.25)',
              color: 'var(--yellow)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Demo mode — positions are read-only. Set a <code style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9em' }}>VITE_API_KEY</code> to trade.
          </div>
        )}

        {draft && !createSuccess && !isDemoMode && !isMarketMoved && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {!canCreate && (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleApprove}
                disabled={approvePending || approveConfirming}
              >
                {approveConfirming ? 'Confirming…' : approvePending ? 'Approving…' : 'Approve USDC'}
              </Button>
            )}
            <Button
              variant="primary"
              fullWidth
              onClick={handleCreate}
              disabled={!canCreate || isPromoting || createPending || createConfirming || (walletOpen && isOfferExpired)}
            >
              {walletOpen && isOfferExpired
                ? 'Quote expired'
                : createConfirming
                  ? 'Confirming…'
                  : createPending
                    ? 'Confirm in wallet…'
                    : isCorrecting
                      ? 'Adjusting…'
                      : isPromoting
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
