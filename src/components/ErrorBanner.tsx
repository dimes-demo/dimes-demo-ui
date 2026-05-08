import { formatApiError } from '../api/error-messages';
import { formatContractError } from '../contract/error-messages';

function isApiError(err: unknown): err is { status: number; code: string; message: string } {
  return err != null && typeof err === 'object' && 'status' in err && 'code' in err;
}

export function ErrorBanner({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!error) return null;

  const apiError = isApiError(error) ? error : null;
  const status = apiError?.status;

  let message: string;
  let code: string | undefined;
  if (apiError) {
    message = formatApiError(error);
    code = apiError.code ?? undefined;
  } else {
    const formatted = formatContractError(error);
    message = formatted.message;
    code = formatted.code;
  }

  return (
    <div
      role="alert"
      style={{
        marginTop: 12,
        padding: '12px 14px',
        borderRadius: 0,
        border: '1px solid rgba(224, 82, 82, 0.35)',
        background: 'linear-gradient(180deg, rgba(224, 82, 82, 0.08) 0%, rgba(224, 82, 82, 0.02) 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        fontFamily: 'var(--font)',
      }}
    >
      <div
        aria-hidden
        style={{
          flex: '0 0 auto',
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '1.5px solid #E05252',
          color: 'var(--red)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1,
          marginTop: 1,
        }}
      >
        !
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#F5A1A1', fontSize: 13, lineHeight: 1.35, wordBreak: 'break-word' }}>
          {message}
        </div>
        {(code || status) && (
          <div
            style={{
              marginTop: 4,
              color: 'rgba(245, 161, 161, 0.55)',
              fontSize: 10,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              letterSpacing: 0.3,
              wordBreak: 'break-all',
            }}
          >
            {status ? `${status}` : ''}
            {status && code ? ' · ' : ''}
            {code ?? ''}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          style={{
            flex: '0 0 auto',
            background: 'transparent',
            border: 'none',
            color: 'rgba(245, 161, 161, 0.6)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 2,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
