import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' })
}

export default function TrendChart({ data }) {
  if (data.length < 2) {
    return <div className="empty">Necesitas al menos 2 capturas para ver la evolución.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={fmtDate} stroke="var(--text-muted)" fontSize={12} />
        <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
        <Tooltip
          labelFormatter={(v) => new Date(v).toLocaleDateString('es')}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)' }}
        />
        <Legend />
        <Line type="monotone" dataKey="followers" name="Seguidores" stroke="#d6336c" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="following" name="Seguidos" stroke="#7048e8" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="mutual" name="Mutuos" stroke="#2f9e44" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
