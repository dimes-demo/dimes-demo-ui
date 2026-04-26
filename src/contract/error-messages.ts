import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionExecutionError,
  UserRejectedRequestError,
  formatUnits,
} from 'viem';

export type FormattedContractError = {
  message: string;
  code?: string;
};

const fmtUsdc = (v: unknown) =>
  typeof v === 'bigint' ? `${formatUnits(v, 6)} USDC` : String(v);

const fmtBps = (v: unknown) => {
  if (typeof v === 'bigint') return `${(Number(v) / 100).toFixed(2)}%`;
  if (typeof v === 'number') return `${(v / 100).toFixed(2)}%`;
  return String(v);
};

type Formatter = (args: readonly unknown[] | undefined) => string;

const friendlyByErrorName: Record<string, Formatter> = {
  // Signature
  InvalidSignature: () => 'Quote signature is invalid. Refresh and try again.',
  SignatureExpired: () => 'Quote has expired. Refresh and try again.',
  TokenIdMismatch: () => 'Quote token mismatch. Refresh and try again.',

  // Capital / capacity
  InsufficientCapital: () => 'Pool is short on capital right now. Try a smaller size.',
  UserCapitalExceeded: (a) =>
    a && a.length >= 4
      ? `You'd exceed your account cap of ${fmtUsdc(a[3])} (current ${fmtUsdc(a[1])}, requested ${fmtUsdc(a[2])}).`
      : "You'd exceed your account capital cap.",
  MarketCapitalExceeded: (a) =>
    a && a.length >= 4
      ? `Market is at capacity (cap ${fmtUsdc(a[3])}, requested ${fmtUsdc(a[2])}).`
      : 'Market is at capacity.',
  TotalCapitalExceeded: (a) =>
    a && a.length >= 3
      ? `Protocol is at capacity (cap ${fmtUsdc(a[2])}, requested ${fmtUsdc(a[1])}).`
      : 'Protocol is at capacity.',
  TokenCapitalExceeded: () => 'This outcome is at capacity.',

  // Position validation
  InvalidLeverage: (a) =>
    a && a.length >= 1 ? `Invalid leverage (${fmtBps(a[0])}).` : 'Invalid leverage.',
  CollateralBelowMinimum: (a) =>
    a && a.length >= 2
      ? `Collateral ${fmtUsdc(a[0])} is below the minimum of ${fmtUsdc(a[1])}.`
      : 'Collateral is below the minimum.',
  InvalidCollateral: (a) =>
    a && a.length >= 1 ? `Invalid collateral amount (${fmtUsdc(a[0])}).` : 'Invalid collateral amount.',
  InvalidNotional: (a) =>
    a && a.length >= 1 ? `Invalid notional (${fmtUsdc(a[0])}).` : 'Invalid notional.',
  ZeroAmount: () => 'Amount cannot be zero.',
  ZeroAddress: () => 'Address cannot be zero.',

  // Position state
  PositionAlreadyExists: () => 'A position with this seed already exists.',
  PositionNotFound: () => 'Position not found.',
  PositionAlreadyFinalized: () => 'Position is already finalized.',
  InvalidPositionState: () => 'Position is in the wrong state for this action.',
  NotPositionOwner: () => "You're not the owner of this position.",

  // Operational controls
  NewPositionsPaused: () => 'New positions are paused.',
  UserActionsPaused: () => 'User actions are temporarily paused.',
  EmergencyOnlyMode: () => 'Protocol is in emergency-only mode.',
  ServerHalted: () => 'Protocol is halted. Try again later.',

  // Close / settle / unwind
  NoTokensToClose: () => 'Position has no tokens to close.',
  InvalidProceeds: () => 'Invalid proceeds amount.',
  InvalidMarketOutcome: () => 'Invalid market outcome.',
  InvalidTokensToSell: () => 'Invalid token amount to sell.',
  InvalidTargetLeverage: () => 'Target leverage must be lower than current.',

  // Cancel
  CancelDelayNotElapsed: () => 'Cancel delay has not elapsed yet.',
  CancelDelayTooLong: () => 'Cancel delay exceeds the maximum allowed.',

  // ERC20 / token safety
  SafeERC20FailedOperation: () => 'Token transfer failed.',
  UnauthorizedTokenSender: () => 'Unauthorized token sender.',
  CannotRescueOperationalToken: () => 'Cannot rescue operational tokens.',

  // Wallet-level standard errors (from ERC20s like USDC)
  ERC20InsufficientBalance: () => 'Insufficient USDC balance.',
  ERC20InsufficientAllowance: () => 'Insufficient USDC allowance. Approve and try again.',
};

function humanizeName(name: string): string {
  // CamelCase → "Camel Case"
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function firstLine(s: string): string {
  const i = s.indexOf('\n');
  return (i === -1 ? s : s.slice(0, i)).trim();
}

export function formatContractError(err: unknown): FormattedContractError {
  if (!err) return { message: 'Transaction failed.' };

  if (err instanceof BaseError) {
    const rejected = err.walk((e) => e instanceof UserRejectedRequestError);
    if (rejected) return { message: 'Transaction rejected in wallet.', code: 'UserRejected' };

    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError) as
      | ContractFunctionRevertedError
      | null;
    if (reverted) {
      const errorName = reverted.data?.errorName;
      const args = reverted.data?.args as readonly unknown[] | undefined;
      if (errorName) {
        const fmt = friendlyByErrorName[errorName];
        return {
          message: fmt ? fmt(args) : humanizeName(errorName),
          code: errorName,
        };
      }
      // Reverted but selector not in ABI — surface the short message.
      return { message: reverted.shortMessage || 'Contract reverted.' };
    }

    const exec = err.walk((e) => e instanceof ContractFunctionExecutionError) as
      | ContractFunctionExecutionError
      | null;
    if (exec?.shortMessage) return { message: firstLine(exec.shortMessage) };

    if (err.shortMessage) return { message: firstLine(err.shortMessage) };
    return { message: firstLine(err.message) };
  }

  if (err instanceof Error) return { message: firstLine(err.message) };
  return { message: 'Transaction failed.' };
}
