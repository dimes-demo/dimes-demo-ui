export function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '6px 0',
      }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div
        style={{
          flex: 1,
          borderBottom: '1px dotted rgba(255,255,255,0.1)',
          minWidth: 20,
          alignSelf: 'center',
          marginBottom: 2,
        }}
      />
      <span
        style={{
          color: valueColor || 'var(--text)',
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  )
}
