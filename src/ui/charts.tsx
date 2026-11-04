import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Recharts is heavy: these are loaded lazily (React.lazy) so the first paint stays fast.
const TIP = { background: '#0a1330', border: '1px solid #2f7bff' }

export default function FearChart({ data }: { data: { name: string; predicted: number; actual: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="#1b2a55" strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="#8fa6cf" fontSize={11} />
        <YAxis domain={[0, 100]} stroke="#8fa6cf" fontSize={11} width={28} />
        <Tooltip contentStyle={TIP} />
        <Bar dataKey="predicted" fill="#4da3ff" name="predicted %" />
        <Bar dataKey="actual" fill="#5ee7ff" name="actual %" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendChart({ data }: { data: { week: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="week" stroke="#8fa6cf" fontSize={11} />
        <YAxis stroke="#8fa6cf" fontSize={11} width={24} allowDecimals={false} />
        <Tooltip contentStyle={TIP} />
        <Line dataKey="total" stroke="#5ee7ff" dot />
      </LineChart>
    </ResponsiveContainer>
  )
}
