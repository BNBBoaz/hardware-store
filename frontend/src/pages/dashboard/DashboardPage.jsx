import { useEffect, useState } from 'react';
import { reportsAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Payment method colors — same as ReportsPage for consistency
const METHOD_COLORS = {
  CASH:          '#10B981',
  MPESA:         '#3B82F6',
  CREDIT:        '#F97316',
  BANK_TRANSFER: '#8B5CF6',
  CHEQUE:        '#EF4444',
};

const METHOD_LABELS = {
  CASH:          'Cash',
  MPESA:         'M-Pesa',
  CREDIT:        'Credit',
  BANK_TRANSFER: 'Bank',
  CHEQUE:        'Cheque',
};

const StatCard = ({ label, value, sub, color = 'orange', icon }) => (
  <div className="card flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
      color === 'orange' ? 'bg-orange-100 text-brand-orange' :
      color === 'green'  ? 'bg-green-100 text-green-600' :
      color === 'red'    ? 'bg-red-100 text-red-600' :
      color === 'blue'   ? 'bg-blue-100 text-blue-600' :
      'bg-gray-100 text-gray-600'
    }`}>
      <span className="text-xl">{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-brand-gray uppercase tracking-wider">{label}</p>
      <p className="font-display text-2xl font-bold text-brand-charcoal mt-0.5">{value}</p>
      {sub && <p className="text-xs text-brand-gray mt-0.5">{sub}</p>}
    </div>
  </div>
);

const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})}`;

// Custom bar that colors each bar by payment method
const ColoredBar = (props) => {
  const { x, y, width, height, method } = props;
  const fill = METHOD_COLORS[method] || '#6B7280';
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4}/>;
};

export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsAPI.dashboard()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!data) return null;

  // Build payment data with method label and color for each bar
  const paymentData = Object.entries(data.today.payments)
    .filter(([, amount]) => amount > 0)
    .map(([method, amount]) => ({
      method,
      label:  METHOD_LABELS[method] || method,
      amount,
      color:  METHOD_COLORS[method] || '#6B7280',
    }));

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-brand-charcoal">Dashboard</h2>
        <p className="text-brand-gray text-sm mt-1">
          {new Date().toLocaleDateString('en-KE', {
            weekday: 'long', year: 'numeric',
            month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={kes(data.today.revenue)}
          sub={`${data.today.salesCount} transaction${data.today.salesCount !== 1 ? 's' : ''}`}
          color="orange" icon="⊙"
        />
        <StatCard
          label="VAT Collected"
          value={kes(data.today.vat)}
          sub="16% rate"
          color="blue" icon="⊘"
        />
        <StatCard
          label="Gross Profit"
          value={kes(data.profitSummary.grossProfit)}
          sub={`${data.profitSummary.margin}% margin`}
          color="green" icon="⊕"
        />
        <StatCard
          label="Low Stock Alerts"
          value={data.lowStock.count}
          sub={data.lowStock.count > 0 ? 'Needs attention' : 'All stock levels healthy'}
          color={data.lowStock.count > 0 ? 'red' : 'green'} icon="⊟"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Payment methods bar chart — each method a different color */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-brand-charcoal">
              Today's Payment Methods
            </h3>
            {/* Color legend */}
            <div className="flex gap-3 flex-wrap">
              {paymentData.map(p => (
                <div key={p.method} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}/>
                  <span className="text-brand-gray">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6"/>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [kes(value), 'Amount']}
                  contentStyle={{
                    fontFamily:   'DM Sans, sans-serif',
                    fontSize:     13,
                    border:       '1px solid #E5E7EB',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {paymentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-brand-gray text-sm">
              No sales recorded today yet
            </div>
          )}
        </div>

        {/* Profit summary */}
        <div className="card">
          <h3 className="font-display text-lg font-bold text-brand-charcoal mb-4">
            Profit Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total Revenue', value: kes(data.profitSummary.totalRevenue), color: 'text-brand-charcoal' },
              { label: 'Cost of Goods', value: kes(data.profitSummary.totalCOGS),    color: 'text-red-500' },
              { label: 'Gross Profit',  value: kes(data.profitSummary.grossProfit),  color: 'text-green-600' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-brand-gray-mid last:border-0">
                <span className="text-sm text-brand-gray">{row.label}</span>
                <span className={`text-sm font-semibold font-mono ${row.color}`}>{row.value}</span>
              </div>
            ))}
            <div className="pt-1">
              <div className="flex justify-between text-xs text-brand-gray mb-1.5">
                <span>Profit margin</span>
                <span className="font-semibold text-brand-charcoal">{data.profitSummary.margin}%</span>
              </div>
              <div className="w-full bg-brand-gray-mid rounded-full h-2">
                <div
                  className="bg-brand-orange h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data.profitSummary.margin, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Outstanding customer balances */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-brand-charcoal">
              Outstanding Customer Balances
            </h3>
            {data.outstandingCustomers.count > 0 && (
              <span className="badge-red">{data.outstandingCustomers.count} accounts</span>
            )}
          </div>
          {data.outstandingCustomers.customers.length > 0 ? (
            <div className="space-y-2">
              {data.outstandingCustomers.customers.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-brand-gray-mid last:border-0">
                  <div>
                    <p className="text-sm font-medium text-brand-charcoal">{c.name}</p>
                    <p className="text-xs text-brand-gray">{c.phone || 'No phone'}</p>
                  </div>
                  <span className="text-sm font-semibold font-mono text-red-500">
                    {kes(c.creditBalance)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <span className="text-xs font-medium text-brand-gray">Total outstanding</span>
                <span className="text-xs font-bold font-mono text-red-500">
                  {kes(data.outstandingCustomers.total)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-brand-gray text-sm">
              ✓ No outstanding customer balances
            </div>
          )}
        </div>

        {/* Supplier payments due */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-brand-charcoal">
              Supplier Payments Due
            </h3>
            {data.suppliersOwed.count > 0 && (
              <span className="badge-orange">{data.suppliersOwed.count} suppliers</span>
            )}
          </div>
          {data.suppliersOwed.suppliers.length > 0 ? (
            <div className="space-y-2">
              {data.suppliersOwed.suppliers.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-brand-gray-mid last:border-0">
                  <p className="text-sm font-medium text-brand-charcoal">{s.name}</p>
                  <span className="text-sm font-semibold font-mono text-brand-orange">
                    {kes(s.balanceOwed)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <span className="text-xs font-medium text-brand-gray">Total owed</span>
                <span className="text-xs font-bold font-mono text-brand-orange">
                  {kes(data.suppliersOwed.total)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-brand-gray text-sm">
              ✓ No supplier payments due
            </div>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {data.lowStock.count > 0 && (
        <div className="card border-red-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-red-500 text-lg">⚠</span>
            <h3 className="font-display text-lg font-bold text-brand-charcoal">Low Stock Alerts</h3>
            <span className="badge-red">{data.lowStock.count} items</span>
          </div>
          <div className="table-wrapper">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Product</th>
                  <th className="table-header text-left">Branch</th>
                  <th className="table-header text-right">In Stock</th>
                  <th className="table-header text-right">Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock.items.map(item => (
                  <tr key={item.id}>
                    <td className="table-cell font-medium">{item.product.name}</td>
                    <td className="table-cell text-brand-gray">{item.branch.name}</td>
                    <td className="table-cell text-right font-mono text-red-500 font-semibold">
                      {item.quantity} {item.product.unit}
                    </td>
                    <td className="table-cell text-right font-mono text-brand-gray">
                      {item.reorderLevel} {item.product.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}