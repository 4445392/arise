import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { calibration, disasterLine } from '../../engine/fear'
import { trustPct } from '../../engine/trust'
import { STAT_KEYS } from '../../engine/types'
import { repo } from '../../data'
import { Screen, SystemWindow } from '../kit'
import { useUI } from '../store'

const AX = { stroke: '#8fa6cf', fontSize: 11 } as const
const TIP = { background: '#0a1330', border: '1px solid #2f7bff' }

interface Series {
  xp: { d: string; xp: number }[]
  trust: { d: string; trust: number | null }[]
  deep: { d: string; hours: number }[]
  screen: { d: string; min: number; target?: number }[]
  fearLine: string
  buckets: { name: string; predicted: number; actual: number }[]
}

export function History() {
  const snap = useUI((s) => s.snap)!
  const back = useUI((s) => s.back)
  const [s, setS] = useState<Series | null>(null)

  useEffect(() => {
    void (async () => {
      const [logs, events, sessions, screen, fears] = await Promise.all([
        repo.db.dayLogs.orderBy('dayKey').toArray(), repo.db.events.toArray(), repo.db.sessions.toArray(), repo.db.screenTime.orderBy('dayKey').toArray(), repo.db.fears.toArray(),
      ])
      const evBy = new Map<string, number>()
      for (const e of events) evBy.set(e.dayKey, (evBy.get(e.dayKey) ?? 0) + e.xp)
      let cum = 0
      const days = [...new Set([...logs.map((l) => l.dayKey), ...events.map((e) => e.dayKey)])].sort()
      const xp = days.map((d) => {
        cum += (logs.find((l) => l.dayKey === d)?.xp ?? 0) + (evBy.get(d) ?? 0)
        return { d: d.slice(5), xp: Math.round(cum) }
      })
      const promises = logs.map((l) => ({ dayKey: l.dayKey, kept: l.kept, total: l.total }))
      const trust = logs.map((l) => ({ d: l.dayKey.slice(5), trust: trustPct(promises, l.dayKey, 7) === null ? null : Math.round(trustPct(promises, l.dayKey, 7)!) }))
      const deepBy = new Map<string, number>()
      for (const x of sessions) deepBy.set(x.dayKey, (deepBy.get(x.dayKey) ?? 0) + x.minutes)
      const deep = [...deepBy.entries()].sort().map(([d, m]) => ({ d: d.slice(5), hours: Math.round((m / 60) * 10) / 10 }))
      const cal = calibration(fears.map((f) => ({ id: f.id ?? 0, predicted: f.predicted, severity: f.severity, outcome: f.outcome })))
      setS({
        xp, trust, deep,
        screen: screen.map((x) => ({ d: x.dayKey.slice(5), min: x.minutes, target: snap.player.screenTargetMin })),
        fearLine: disasterLine(fears.map((f) => ({ id: f.id ?? 0, predicted: f.predicted, severity: f.severity, outcome: f.outcome }))),
        buckets: cal.buckets.map((b) => ({ name: b.label, predicted: Math.round(b.avgPredicted), actual: Math.round(b.actual) })),
      })
    })()
  }, [snap.today, snap.totals.xp, snap.player.screenTargetMin])

  const radar = STAT_KEYS.map((k) => ({ stat: k, level: snap.totals.stats[k] }))
  const empty = (arr: unknown[] | undefined) => !arr || arr.length < 2

  return (
    <Screen title="HISTORY" onBack={back}>
      <SystemWindow title="XP OVER TIME">
        {empty(s?.xp) ? <p className="sys-dim text-sm">Appears after two days of data.</p> : (
          <div className="h-44" role="img" aria-label="Cumulative XP over time">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={s!.xp}><CartesianGrid stroke="#1b2a55" strokeDasharray="3 3" /><XAxis dataKey="d" {...AX} /><YAxis {...AX} width={40} /><Tooltip contentStyle={TIP} /><Area dataKey="xp" stroke="#5ee7ff" fill="#2f7bff55" /></AreaChart></ResponsiveContainer>
          </div>
        )}
      </SystemWindow>
      <SystemWindow title="STATS RADAR">
        <div className="h-56" role="img" aria-label={`Stat levels: ${radar.map((r) => `${r.stat} ${r.level}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%"><RadarChart data={radar}><PolarGrid stroke="#1b2a55" /><PolarAngleAxis dataKey="stat" tick={{ fill: '#cfe0ff', fontSize: 12 }} /><Radar dataKey="level" stroke="#5ee7ff" fill="#2f7bff" fillOpacity={0.5} /></RadarChart></ResponsiveContainer>
        </div>
      </SystemWindow>
      <SystemWindow title="TRUST (7-DAY)">
        {empty(s?.trust) ? <p className="sys-dim text-sm">Appears after two days of data.</p> : (
          <div className="h-36" role="img" aria-label="7-day TRUST over time">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={s!.trust}><CartesianGrid stroke="#1b2a55" strokeDasharray="3 3" /><XAxis dataKey="d" {...AX} /><YAxis domain={[0, 100]} {...AX} width={30} /><Tooltip contentStyle={TIP} /><Line dataKey="trust" stroke="#5ee7ff" dot={false} connectNulls /></LineChart></ResponsiveContainer>
          </div>
        )}
      </SystemWindow>
      <SystemWindow title="DEEP WORK (HOURS)">
        {empty(s?.deep) ? <p className="sys-dim text-sm">Log Dungeon sessions to see this.</p> : (
          <div className="h-36" role="img" aria-label="Deep work hours per day">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={s!.deep}><XAxis dataKey="d" {...AX} /><YAxis {...AX} width={28} /><Tooltip contentStyle={TIP} /><Bar dataKey="hours" fill="#4da3ff" /></BarChart></ResponsiveContainer>
          </div>
        )}
      </SystemWindow>
      <SystemWindow title="SCREEN TIME (MIN)">
        {empty(s?.screen) ? <p className="sys-dim text-sm">Log screen time at Shutdown to see the trend against your target.</p> : (
          <div className="h-36" role="img" aria-label="Screen time versus target">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={s!.screen}><XAxis dataKey="d" {...AX} /><YAxis {...AX} width={36} /><Tooltip contentStyle={TIP} /><Line dataKey="min" stroke="#ff6a5e" /><Line dataKey="target" stroke="#2dd4bf" strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer>
          </div>
        )}
      </SystemWindow>
      <SystemWindow title="FEAR CALIBRATION">
        <p className="font-display text-lg">{s?.fearLine}</p>
        {s && s.buckets.length > 0 && (
          <div className="mt-2 h-40" role="img" aria-label="Predicted versus actual probability of feared outcomes">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={s.buckets}><XAxis dataKey="name" {...AX} /><YAxis domain={[0, 100]} {...AX} width={28} /><Tooltip contentStyle={TIP} /><Bar dataKey="predicted" fill="#4da3ff" /><Bar dataKey="actual" fill="#5ee7ff" /></BarChart></ResponsiveContainer>
          </div>
        )}
      </SystemWindow>
    </Screen>
  )
}
