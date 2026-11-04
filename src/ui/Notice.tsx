import { Btn } from './kit'
import { useUI } from './store'

/** Full-screen [NOTICE]: slides in with a brief glitch. Queue-driven. */
export default function Notice() {
  const n = useUI((s) => s.notices[0])
  const dismiss = useUI((s) => s.dismissNotice)
  if (!n) return null
  const theme = n.kind === 'penalty' ? 'penalty' : n.kind === 'recovery' || n.kind === 'support' ? 'recovery' : undefined
  return (
    <div
      data-theme={theme}
      className={`fixed inset-0 z-50 grid place-items-center bg-[rgba(4,8,20,0.96)] p-5 ${n.kind === 'levelup' ? 'level-flash' : ''}`}
      role="alertdialog"
      aria-modal="true"
      aria-label={n.title}
    >
      <div className="sys glitch-in pulse-glow w-full max-w-sm p-6 text-center">
        <h2 className="sys-title !text-xl">{n.title.startsWith('[') ? n.title : `[${n.title}]`}</h2>
        {n.kind === 'levelup' && <div className="num my-3 text-5xl text-cyan">{n.body}</div>}
        {n.kind !== 'levelup' && <p className="my-4 leading-relaxed">{n.body}</p>}
        {n.lines && (
          <ul className="num mx-auto mb-4 max-w-[16rem] space-y-1 text-left text-lg text-cyan">
            {n.lines.map((l) => (
              <li key={l}>▲ {l}</li>
            ))}
          </ul>
        )}
        <Btn variant="primary" big onClick={dismiss}>
          {n.cta ?? 'Continue'}
        </Btn>
      </div>
    </div>
  )
}
