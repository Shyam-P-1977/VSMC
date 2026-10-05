import { useState } from 'react'
import { useAsync } from '../../lib/hooks'
import { reports } from '../../api'
import { Download } from 'lucide-react'
import { Button, Card, PageHeader } from '../../components/ui'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { inr } from '../../lib/format'

export default function AdminReports() {
  const [report, setReport] = useState('revenue')
  const { data, loading, error } = useAsync(() => reports.get(report), [report])

  const handleDownload = async () => {
    try {
      const blob = await reports.csv(report)
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${report}-report.csv`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (e) {
      console.error(e)
    }
  }

  const reportsList = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'mechanic-performance', label: 'Mechanic Performance' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-xl font-bold">Reports</h2>
          <p className="text-sm text-muted">Generate and view system reports.</p>
        </div>
        <div className="flex gap-2">
          <select className="input !w-auto" value={report} onChange={(e) => setReport(e.target.value)}>
            {reportsList.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <Button onClick={handleDownload} icon={Download} disabled={loading || !data}>Export CSV</Button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading report data...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">Failed to load report: {error.message}</div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(data.summary).map(([key, value]) => (
              <Card key={key} className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">{key.replace(/_/g, ' ')}</p>
                <p className="mt-2 text-2xl font-bold">
                  {typeof value === 'number' && key.includes('revenue') || key.includes('value') || key.includes('outstanding') 
                    ? inr(value) : value}
                </p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(data.charts).map(([chartName, chartData]) => (
              <Card key={chartName} className="p-4">
                <h3 className="mb-4 font-semibold capitalize">{chartName.replace(/_/g, ' ')}</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.2)" />
                      <XAxis dataKey={chartData[0]?.date ? 'date' : 'name'} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'rgba(150, 150, 150, 0.1)' }}
                      />
                      <Bar dataKey="value" fill="var(--tw-colors-brand-500)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  {data.columns.map((col, i) => (
                    <th key={i} className="p-3 text-left font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-2/50">
                    {row.map((cell, j) => (
                      <td key={j} className="p-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
