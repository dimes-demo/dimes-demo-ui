import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount, useBalance } from 'wagmi'
import type { Market } from '../api/types'
import { useOffer } from '../hooks/useOffer'
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

  const queryClient = useQueryClient()
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
    create(offer)
  }

  return (
    <CardShell variant="yellow">
      <div className="trade-panel" style={{ padding: '22px 24px 20px' }}>
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
            <Input
              type="number"
              inputMode="decimal"
              value={collateralUsd}
              onChange={(e) => updateCollateral(e.target.value)}
              placeholder="0.00"
              leadingSlot="$"
              trailingSlot="USDC"
            />
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
        <LeverageSlider
          min={market.leverage.minBps}
          max={market.leverage.maxBps}
          step={market.leverage.stepBps}
          value={leverageBps}
          onChange={(v) => { setLeverageBps(v); clearOffer(); }}
        />

        {/* Get quote */}
        <div style={{ marginTop: 20 }}>
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
