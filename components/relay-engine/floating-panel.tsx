'use client'


interface FloatingPanelProps {
  isOpen: boolean
  hasError?: boolean
  onToggle: () => void
  ariaLabel?: string
}


export default function FloatingPanel({
  isOpen,
  hasError = false,
  onToggle,
  ariaLabel,
}: FloatingPanelProps) {
  const label = ariaLabel || (isOpen ? 'Close support panel' : 'Open support panel')

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 9999,
        width: 48,
        height: 48,
        borderRadius: 999,
        border: 'none',
        background: hasError ? '#a52e2e' : '#1f6f4a',
        color: '#fff',
        fontSize: 20,
        cursor: 'pointer',
        boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
      }}
    >
      {isOpen ? '×' : '💬'}
    </button>
  )
}
