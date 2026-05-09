import { useEffect, useState } from 'react';
import { reportsAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar
} from 'recharts';

const PAYMENT_METHODS = [
  { id: 'CASH',          label: 'Cash',          color: '#10B981' },
  { id: 'MPESA',         label: 'M-Pesa',        color: '#3B82F6' },
  { id: 'CREDIT',        label: 'Credit',        color: '#F97316' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', color: '#8B5CF6' },
  { id: 'CHEQUE',        label: 'Cheque',        color: '#EF4444' },
];

const kes = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export default function ReportsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState('30');

  useEffect(() => { loadReport(); }, [range]);

  const loadReport = () => {
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - parseInt(range));
    reportsAPI.sales({
      from: from.toISOString().split('T')[0],
      to:   new Date().toISOString().split('T')[0],
    })
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!data || !data.summary) return (
    <div className="flex items-center justify-center h-64 text-brand-gray">
      No report data available
    </div>
  );

  // Build payment totals by reading nested sale.payments[] array
  const paymentTotals = {};
  PAYMENT_METHODS.forEach(m => { paymentTotals[m.id] = 0; });
  (data.sales || []).forEach(sale => {
    if (Array.isArray(sale.payments) && sale.payments.length > 0) {
      sale.payments.forEach(p => {
        if (paymentTotals[p.method] !== undefined) {
          paymentTotals[p.method] += parseFloat(p.amount || 0);
        } else {
          paymentTotals[p.method] = parseFloat(p.amount || 0);
        }
      });
    } else {
      paymentTotals['CASH'] += parseFloat(sale.total || 0);
    }
  });

  const paymentData    = PAYMENT_METHODS.map(m => ({ ...m, amount: paymentTotals[m.id] || 0 }));
  const activePayments = paymentData.filter(p => p.amount > 0);

  // Build daily trend
  const dailyMap = {};
  (data.sales || []).forEach(sale => {
    const date = new Date(sale.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, count: 0 };
    dailyMap[date].revenue += parseFloat(sale.total || 0);
    dailyMap[date].count   += 1;
  });
  const dailyData = Object.values(dailyMap);

  const actualMargin = data.summary.totalRevenue > 0
    ? ((data.summary.grossProfit / data.summary.totalRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold text-brand-charcoal">Reports</h2>
          <p className="text-brand-gray text-sm mt-0.5">Sales performance and insights</p>
        </div>
        <select className="input w-auto text-sm py-2" value={range} onChange={e => setRange(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Stat cards — all real figures from backend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: kes(data.summary.totalRevenue), sub: `${data.summary.totalSales} sales`, gradient: 'from-orange-500 to-orange-600', icon: '💰' },
          { label: 'Gross Profit',  value: kes(data.summary.grossProfit),  sub: `${actualMargin}% actual margin`,  gradient: 'from-green-500 to-green-600',  icon: '📈' },
          { label: 'VAT Collected', value: kes(data.summary.totalVAT),     sub: '16% rate',                       gradient: 'from-blue-500 to-blue-600',    icon: '🏛️' },
          { label: 'Cost of Goods', value: kes(data.summary.totalCOGS),    sub: 'Revenue minus COGS = profit',    gradient: 'from-gray-600 to-gray-700',    icon: '📦' },
        ].map(stat => (
          <div key={stat.label} className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}>
            <div className="relative z-10">
              <span className="text-2xl mb-3 block">{stat.icon}</span>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="font-display text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-white/70 text-xs mt-1">{stat.sub}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full"/>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue area chart */}
        <div className="xl:col-span-2 card">
          <h3 className="font-display text-lg font-bold text-brand-charcoal mb-4">Revenue Trend</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v => [kes(v), 'Revenue']} contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: 'none', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}/>
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#revGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-brand-gray text-sm">No data for this period</div>
          )}
        </div>

        {/* Payment methods donut */}
        <div className="card">
          <h3 className="font-display text-lg font-bold text-brand-charcoal mb-4">Payment Methods</h3>
          {activePayments.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={activePayments} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="amount" stroke="none">
                    {activePayments.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [kes(v), n]} contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: 'none', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {PAYMENT_METHODS.map(m => {
                  const amount = paymentTotals[m.id] || 0;
                  return (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, opacity: amount > 0 ? 1 : 0.25 }}/>
                        <span className={amount > 0 ? 'text-brand-charcoal font-medium' : 'text-brand-gray text-xs'}>{m.label}</span>
                      </div>
                      <span className={`font-mono text-xs font-medium ${amount > 0 ? 'text-brand-charcoal' : 'text-brand-gray'}`}>{kes(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-brand-gray text-sm">No payment data</div>
          )}
        </div>
      </div>

      {/* Revenue vs COGS vs Profit bar */}
      <div className="card">
        <h3 className="font-display text-lg font-bold text-brand-charcoal mb-4">Revenue vs Cost vs Profit</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[{ name: 'Period summary', Revenue: parseFloat(data.summary.totalRevenue), COGS: parseFloat(data.summary.totalCOGS), Profit: parseFloat(data.summary.grossProfit) }]} margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }}/>
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
            <Tooltip formatter={v => kes(v)} contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: 'none', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}/>
            <Bar dataKey="Revenue" fill="#F97316" radius={[4,4,0,0]}/>
            <Bar dataKey="COGS"    fill="#6B7280" radius={[4,4,0,0]}/>
            <Bar dataKey="Profit"  fill="#10B981" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-brand-charcoal">Recent Transactions</h3>
          <span className="text-xs text-brand-gray">{data.sales?.length || 0} total</span>
        </div>
        <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Receipt</th>
                <th className="table-header text-left">Cashier</th>
                <th className="table-header text-left">Payment</th>
                <th className="table-header text-right">Items</th>
                <th className="table-header text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(data.sales || []).length === 0 ? (
                <tr><td colSpan={6} className="table-cell text-center text-brand-gray py-8">No sales in this period</td></tr>
              ) : (data.sales || []).slice(0, 20).map(sale => {
                const methodId   = sale.payments?.[0]?.method || 'CASH';
                const methodInfo = PAYMENT_METHODS.find(m => m.id === methodId);
                return (
                  <tr key={sale.id} className="hover:bg-brand-gray-light transition-colors">
                    <td className="table-cell text-sm">{new Date(sale.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</td>
                    <td className="table-cell text-sm font-mono text-brand-gray">#{sale.id.slice(0,8).toUpperCase()}</td>
                    <td className="table-cell text-sm text-brand-gray">{sale.cashier?.name || '—'}</td>
                    <td className="table-cell">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: methodInfo?.color || '#6B7280' }}>
                        {methodInfo?.label || methodId}
                      </span>
                    </td>
                    <td className="table-cell text-right text-sm">{sale.saleItems?.length || 0}</td>
                    <td className="table-cell text-right font-mono text-sm font-semibold text-brand-orange">{kes(sale.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}