import { useReducer, useCallback, useRef } from 'react';
import { createOffer, createDraftQuote, promoteDraftQuote } from '../api/offers';
import { ApiError } from '../api/client';
import { MARKET_MOVED_CODES } from '../api/quote-error-hints';
import type { CreateOfferParams, Offer } from '../api/types';

const LEVERAGE_STEP_BPS = 2500;
const MAX_MARKET_MOVED_RETRIES = 3;

// ── State types ──

export type TradeState =
  | { phase: 'idle' }
  | { phase: 'loading-draft' }
  | { phase: 'draft-ready'; draft: Offer; quotedAt: number }
  | { phase: 'promoting'; draft: Offer; quotedAt: number }
  | { phase: 'promoted'; draft: Offer; promotedOffer: Offer; correctedFrom?: Offer; quotedAt: number }
  | { phase: 'market-moved'; originalDraft: Offer; newDraft: Offer; retryCount: number; quotedAt: number }
  | { phase: 'error'; error: unknown; draft?: Offer };

type Action =
  | { type: 'LOADING' }
  | { type: 'DRAFT_READY'; draft: Offer; quotedAt: number }
  | { type: 'PROMOTING'; draft: Offer; quotedAt: number }
  | { type: 'PROMOTED'; draft: Offer; promotedOffer: Offer; correctedFrom?: Offer; quotedAt: number }
  | { type: 'MARKET_MOVED'; originalDraft: Offer; newDraft: Offer; retryCount: number; quotedAt: number }
  | { type: 'ERROR'; error: unknown; draft?: Offer }
  | { type: 'RESET' };

function reducer(_state: TradeState, action: Action): TradeState {
  switch (action.type) {
    case 'LOADING':
      return { phase: 'loading-draft' };
    case 'DRAFT_READY':
      return { phase: 'draft-ready', draft: action.draft, quotedAt: action.quotedAt };
    case 'PROMOTING':
      return { phase: 'promoting', draft: action.draft, quotedAt: action.quotedAt };
    case 'PROMOTED':
      return {
        phase: 'promoted',
        draft: action.draft,
        promotedOffer: action.promotedOffer,
        correctedFrom: action.correctedFrom,
        quotedAt: action.quotedAt,
      };
    case 'MARKET_MOVED':
      return {
        phase: 'market-moved',
        originalDraft: action.originalDraft,
        newDraft: action.newDraft,
        retryCount: action.retryCount,
        quotedAt: action.quotedAt,
      };
    case 'ERROR':
      return { phase: 'error', error: action.error, draft: action.draft };
    case 'RESET':
      return { phase: 'idle' };
  }
}

export interface UseTradeMachineParams {
  marketTicker: string;
  effectiveSide: 'yes' | 'no';
  leverageBps: number;
  collateralUsd: number;
  slippageBps: number;
}

export function buildOfferParams(params: UseTradeMachineParams): CreateOfferParams {
  const leverageBps = Math.round(params.leverageBps / LEVERAGE_STEP_BPS) * LEVERAGE_STEP_BPS;
  const notionalUsdPips = Math.round(params.collateralUsd * leverageBps);
  return {
    marketTicker: params.marketTicker,
    effectiveSide: params.effectiveSide,
    leverageBps,
    notionalAmountUsdPips: notionalUsdPips.toString(),
    slippageBps: params.slippageBps,
  };
}

function isMarketMovedError(err: unknown): boolean {
  return err instanceof ApiError && !!err.code && MARKET_MOVED_CODES.has(err.code);
}

export function useTradeMachine() {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' } as TradeState);
  const lastParamsRef = useRef<CreateOfferParams | null>(null);
  const quotedAtRef = useRef(0);

  const getDraft = useCallback(async (params: UseTradeMachineParams) => {
    dispatch({ type: 'LOADING' });
    const offerParams = buildOfferParams(params);
    lastParamsRef.current = offerParams;
    try {
      const draft = await createDraftQuote(offerParams);
      quotedAtRef.current = Date.now();
      dispatch({ type: 'DRAFT_READY', draft, quotedAt: quotedAtRef.current });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err });
    }
  }, []);

  const promote = useCallback(async (draft: Offer, retryCount = 0) => {
    const qa = quotedAtRef.current;
    dispatch({ type: 'PROMOTING', draft, quotedAt: qa });
    try {
      const promotedOffer = await promoteDraftQuote(draft.id);
      dispatch({ type: 'PROMOTED', draft, promotedOffer, quotedAt: qa });
    } catch (err) {
      if (isMarketMovedError(err) && retryCount < MAX_MARKET_MOVED_RETRIES && lastParamsRef.current) {
        try {
          const newDraft = await createDraftQuote(lastParamsRef.current);
          quotedAtRef.current = Date.now();
          dispatch({
            type: 'MARKET_MOVED',
            originalDraft: draft,
            newDraft,
            retryCount: retryCount + 1,
            quotedAt: quotedAtRef.current,
          });
        } catch (draftErr) {
          dispatch({ type: 'ERROR', error: draftErr, draft });
        }
      } else {
        dispatch({ type: 'ERROR', error: err, draft });
      }
    }
  }, []);

  const correctAndPromote = useCallback(async (originalDraft: Offer, adjustedParams: CreateOfferParams) => {
    dispatch({ type: 'PROMOTING', draft: originalDraft, quotedAt: quotedAtRef.current });
    lastParamsRef.current = adjustedParams;
    try {
      const promotedOffer = await createOffer(adjustedParams);
      quotedAtRef.current = Date.now();
      dispatch({
        type: 'PROMOTED',
        draft: promotedOffer,
        promotedOffer,
        correctedFrom: originalDraft,
        quotedAt: quotedAtRef.current,
      });
    } catch (err) {
      dispatch({ type: 'ERROR', error: err });
    }
  }, []);

  const acceptChanges = useCallback(async (newDraft: Offer, retryCount: number) => {
    await promote(newDraft, retryCount);
  }, [promote]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    lastParamsRef.current = null;
    quotedAtRef.current = 0;
  }, []);

  return { state, getDraft, promote, correctAndPromote, acceptChanges, reset };
}
