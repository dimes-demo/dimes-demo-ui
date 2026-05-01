export function StatRow({
  label,
  value,
  valueColor,
  previousValue,
}: {
  label: string
  value: string
  valueColor?: string
  previousValue?: string
}) {
  const changed = previousValue !== undefined && previousValue !== value

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '6px 0',
        borderLeft: changed ? '2px solid #F5A623' : '2px solid transparent',
        paddingLeft: changed ? 8 : 0,
        transition: 'border-color 0.3s ease, padding-left 0.3s ease',
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
      {changed && (
        <span
          style={{
            color: 'var(--text-dim)',
            fontSize: 12,
            fontWeight: 400,
            whiteSpace: 'nowrap',
            textDecoration: 'line-through',
          }}
        >
          {previousValue}
        </span>
      )}
      {changed && (
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>→</span>
      )}
      <span
        style={{
          color: changed ? '#F5A623' : (valueColor || 'var(--text)'),
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
