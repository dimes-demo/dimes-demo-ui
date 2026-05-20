import { useState } from 'react'
import { useBuilderCredsStore } from '../store/builderCreds'
import { Button } from './ui/Button'
import { Field } from './ui/Field'
import { Input } from './ui/Input'

/**
 * Local-demo control: lets the user paste Polymarket builder API credentials so
 * the push-funded batch is submitted straight to the relayer from the browser,
 * bypassing the partner-API-key-guarded backend endpoint.
 *
 * The credentials live in memory only (see the builderCreds store) — they are
 * never persisted and never sent to the Dimes backend.
 */
export function BuilderCredsPanel() {
  const apiKey = useBuilderCredsStore((s) => s.apiKey)
  const apiSecret = useBuilderCredsStore((s) => s.apiSecret)
  const apiPassphrase = useBuilderCredsStore((s) => s.apiPassphrase)
  const hasCreds = useBuilderCredsStore((s) => s.hasCreds)
  const setCreds = useBuilderCredsStore((s) => s.setCreds)
  const clearCreds = useBuilderCredsStore((s) => s.clearCreds)

  const [expanded, setExpanded] = useState(false)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [secretInput, setSecretInput] = useState(apiSecret)
  const [passphraseInput, setPassphraseInput] = useState(apiPassphrase)

  const canSave = Boolean(keyInput.trim() && secretInput.trim() && passphraseInput.trim())

  const handleSave = () => {
    setCreds(keyInput, secretInput, passphraseInput)
    setExpanded(false)
  }

  const handleClear = () => {
    clearCreds()
    setKeyInput('')
    setSecretInput('')
    setPassphraseInput('')
    setExpanded(false)
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: '14px 16px',
        borderRadius: 'var(--radius)',
        border: '1px solid rgba(238,255,0,0.25)',
        background: 'rgba(238,255,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text)' }}>
          Direct relayer submission
          <span
            style={{
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 600,
              color: hasCreds ? 'var(--yellow-ink)' : 'var(--text-dim)',
              background: hasCreds ? 'var(--yellow)' : 'var(--surface-subtle)',
              padding: '2px 6px',
              borderRadius: 0,
            }}
          >
            {hasCreds ? 'Active — browser → relayer' : 'Off — using backend'}
          </span>
        </span>
        {!expanded && (
          <Button variant="ghost" onClick={() => setExpanded(true)} style={{ padding: '4px 10px', fontSize: 12 }}>
            {hasCreds ? 'Edit' : 'Set builder keys'}
          </Button>
        )}
      </div>

      <p
        style={{
          margin: '8px 0 0',
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--yellow)',
          fontWeight: 500,
        }}
      >
        ⚠ Local demo only. Your Polymarket builder API key, secret, and passphrase are HMAC-signed in
        this browser and sent directly to the Polymarket relayer. They are held in memory only —
        cleared on refresh — and never sent to the Dimes backend. Do not paste production builder
        credentials.
      </p>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Builder API key">
            <Input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="builder API key"
            />
          </Field>
          <Field label="Builder API secret">
            <Input
              type="password"
              autoComplete="off"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="builder API secret (base64)"
            />
          </Field>
          <Field label="Builder API passphrase">
            <Input
              type="password"
              autoComplete="off"
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              placeholder="builder API passphrase"
            />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" fullWidth disabled={!canSave} onClick={handleSave}>
              Save keys
            </Button>
            <Button variant="ghost" onClick={handleClear}>
              {hasCreds ? 'Clear' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
