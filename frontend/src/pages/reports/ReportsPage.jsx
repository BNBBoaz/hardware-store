import { useEffect, useState } from 'react';
import { reportsAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];
const PAYMENT_METHODS = ['CASH', 'MPESA', 'CREDIT', 'BANK', 'CHEQUE'];

const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7');

  useEffect(() => {
    loadReport();
  }, [range]);

  const loadReport = () => {
    setLoading(true);
    const from = new Date();
    from.setDate(from.getDate() - parseInt(range));
    const to = new Date();

    reportsAPI.sales({ 
      from: from.toISOString().split('T')[0], 
      to: to.toISOString().split('T')[0] 
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

  if (!data || !data.summary) return null;

  // Build payment breakdown — handles BOTH backend formats
  const paymentTotals = {};
  PAYMENT_METHODS.forEach(m => paymentTotals[m] = 0);
  
  (data.sales || []).forEach(sale => {
    // Format 1: nested payments array (newer backend)
    if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
      sale.payments.forEach(p => {
        const method = p.method || 'CASH';
        paymentTotals[method] = (paymentTotals[method] || 0) + parseFloat(p.amount || 0);
      });
    }
    // Format 2: single paymentMethod string on sale (older backend)
    else if (sale.paymentMethod) {
      const method = sale.paymentMethod;
      paymentTotals[method] = (paymentTotals[method] || 0) + parseFloat(sale.total || 0);
    }
    // Format 3: no payment info — assume CASH
    else {
      paymentTotals['CASH'] = (paymentTotals['CASH'] || 0) + parseFloat(sale.total || 0);
    }
  });

  const paymentData = PAYMENT_METHODS.map(method => ({
    method,
    amount: paymentTotals[method] || 0,
  }));

  // Build daily sales
  const dailyMap = {};
  (data.sales || []).forEach(sale => {
    const date = new Date(sale.createdAt).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });
    if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, sales: 0 };
    dailyMap[date].revenue += parseFloat(sale.total || 0);
    dailyMap[date].sales += 1;
  });
  const dailyData = Object.values(dailyMap).reverse();

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

      {/* Gradient stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Revenue', 
            value: kes(data.summary.totalRevenue), 
            sub: `${data.summary.totalSales} sales`,
            gradient: 'from-orange-500 to-orange-600',
            icon: '💰'
          },
          { 
            label: 'Gross Profit', 
            value: kes(data.summary.totalRevenue * 0.25), 
            sub: 'Est. 25% margin',
            gradient: 'from-green-500 to-green-600',
            icon: '📈'
          },
          { 
            label: 'VAT Collected', 
            value: kes(data.summary.totalVAT), 
            sub: '16% rate',
            gradient: 'from-blue-500 to-blue-600',
            icon: '🏛️'
          },
          { 
            label: 'Discounts Given', 
            value: kes(data.summary.totalDiscount), 
            sub: 'Promotions',
            gradient: 'from-purple-500 to-purple-600',
            icon: '🏷️'
          },
        ].map((stat, i) => (
          <div key={stat.label} className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">+{i + 2}%</span>
              </div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="font-display text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-white/70 text-xs mt-1">{stat.sub}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full"/>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-brand-charcoal">Revenue Trend</h3>
            <span className="flex items-center gap-1 text-xs text-brand-gray">
              <span className="w-2 h-2 rounded-full bg-brand-orange"/>
              Revenue
            </span>
          </div>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip 
                  formatter={(v) => [kes(v), 'Revenue']} 
                  contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: 'none', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-brand-gray text-sm">No sales data</div>
          )}
        </div>

        {/* Payment methods — Donut chart with ALL methods */}
        <div className="card">
          <h3 className="font-display text-lg font-bold text-brand-charcoal mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie 
                data={paymentData} 
                cx="50%" 
                cy="50%" 
                innerRadius={55} 
                outerRadius={75} 
                paddingAngle={3} 
                dataKey="amount"
                stroke="none"
              >
                {paymentData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={entry.amount > 0 ? 1 : 0.2}/>
                ))}
              </Pie>
              <Tooltip 
                formatter={(v, n) => [kes(v), n]} 
                contentStyle={{ fontFamily: 'DM Sans', fontSize: 13, border: 'none', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Method breakdown list */}
          <div className="space-y-2 mt-2">
            {paymentData.map((d, i) => (
              <div key={d.method} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length], opacity: d.amount > 0 ? 1 : 0.3 }}/>
                  <span className={d.amount > 0 ? 'text-brand-charcoal font-medium' : 'text-brand-gray'}>{d.method}</span>
                </div>
                <span className={`font-mono font-medium ${d.amount > 0 ? 'text-brand-charcoal' : 'text-brand-gray'}`}>
                  {kes(d.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales table */}
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
                <th className="table-header text-left">Payment</th>
                <th className="table-header text-right">Items</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.sales || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-cell text-center text-brand-gray py-8">
                    No sales in this period
                  </td>
                </tr>
              ) : (data.sales || []).slice(0, 15).map(sale => (
                <tr key={sale.id} className="hover:bg-brand-gray-light transition-colors">
                  <td className="table-cell text-sm">
                    {new Date(sale.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="table-cell text-sm font-mono text-brand-gray">
                    #{sale.receiptNumber || sale.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="table-cell">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      sale.paymentMethod === 'CREDIT' ? 'bg-orange-100 text-orange-700' :
                      sale.paymentMethod === 'MPESA' ? 'bg-blue-100 text-blue-700' :
                      sale.paymentMethod === 'BANK' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {sale.paymentMethod || 'CASH'}
                    </span>
                  </td>
                  <td className="table-cell text-right text-sm">{sale.saleItems?.length || 0}</td>
                  <td className="table-cell text-right font-mono text-sm font-semibold text-brand-orange">
                    {kes(sale.total)}
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge-green text-[10px]">✓ Paid</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}