import { useEffect, useRef, useState, type ReactNode } from 'react'

export function SystemWindow({
  title,
  right,
  children,
  className = '',
  glow = false,
}: {
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <section className={`sys p-4 ${glow ? 'pulse-glow' : ''} ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="sys-title">[{title}]</h2>}
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Btn({
  variant = 'default',
  big,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' | 'ghost'; big?: boolean }) {
  const v = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : variant === 'ghost' ? 'btn-ghost' : ''
  return <button type="button" {...rest} className={`btn ${v} ${big ? 'btn-big' : ''} ${className}`} />
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

export function Bar({ value, max = 100, kind, label, right }: { value: number; max?: number; kind?: 'hp' | 'mp'; label?: string; right?: string }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  return (
    <div>
      {(label || right) && (
        <div className="mb-1 flex justify-between text-xs">
          <span className="sys-dim tracking-widest">{label}</span>
          <span className="num">{right}</span>
        </div>
      )}
      <div className={`bar ${kind ?? ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Live counter, e.g. `Push-ups [12/40]`. */
export function Counter({ label, value, target, unit }: { label: string; value: number; target: number; unit?: string }) {
  return (
    <span className="num text-base">
      {label} <span className="text-cyan">[{Math.round(value)}/{target}{unit ? ` ${unit}` : ''}]</span>
    </span>
  )
}

export function CheckRow({ label, checked, onToggle, disabled }: { label: ReactNode; checked: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} className="tap-row" onClick={onToggle}>
      <span className="box">{checked ? '✓' : ''}</span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

/** 1-5 big tap targets. */
export function Rating({ value, onChange, labels, label }: { value: number | null; onChange: (n: number) => void; labels?: [string, string]; label?: string }) {
  return (
    <div>
      {label && <div className="mb-1 text-sm">{label}</div>}
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-pressed={value === n} className="chip num !text-xl !min-h-[52px] justify-center" onClick={() => onChange(n)}>
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="mt-1 flex justify-between text-[11px] sys-dim">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="field">{label}</span>
      {children}
    </label>
  )
}

export function LockedCard({ title, label, hint }: { title: string; label: string; hint?: string }) {
  return (
    <div className="sys p-4 opacity-60" aria-label={`${title}: ${label}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="sys-title !text-[#8fa6cf]">{title}</h3>
        <span className="num text-xs tracking-widest text-[#8fa6cf]">{label}</span>
      </div>
      {hint && <p className="mt-2 text-sm sys-dim">{hint}</p>}
    </div>
  )
}

export function Screen({ title, onBack, children, right }: { title: string; onBack?: () => void; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 safe-top">
      <div className="mb-3 flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back" className="btn btn-ghost !min-h-[44px] !px-3">
            ←
          </button>
        )}
        <h1 className="sys-title flex-1 !text-lg">[{title}]</h1>
        {right}
      </div>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </div>
  )
}

/** Bottom sheet for quick inputs. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sys glitch-in max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-md p-4 safe-bottom">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="sys-title">[{title}]</h2>
          <button type="button" className="btn btn-ghost !min-h-[40px] !px-3" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Re-render every `ms`. Returns the current time from `clock`. */
export function useNow(ms = 1000, clock: () => number = Date.now): number {
  const [t, setT] = useState(clock())
  useEffect(() => {
    const id = setInterval(() => setT(clock()), ms)
    return () => clearInterval(id)
  }, [ms, clock])
  return t
}

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function fmtHMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Keep the screen awake while mounted (best effort). */
export function useWakeLock(active: boolean) {
  const lock = useRef<WakeLockSentinel | null>(null)
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let cancelled = false
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) void l.release()
        else lock.current = l
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      void lock.current?.release().catch(() => undefined)
      lock.current = null
    }
  }, [active])
}
