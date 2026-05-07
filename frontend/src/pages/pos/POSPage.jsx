import { useState, useEffect, useRef, useMemo } from 'react';
import { productsAPI, salesAPI, customersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'CASH',          label: 'Cash',     icon: '💵' },
  { id: 'MPESA',         label: 'M-Pesa',   icon: '📱' },
  { id: 'CREDIT',        label: 'Credit',   icon: '📝' },
  { id: 'BANK_TRANSFER', label: 'Bank',     icon: '🏦' },
];

const kes = (n) =>
  `KES ${Number(n || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ─────────────────────────────────────────────
// Credit Confirmation Component
// Defined OUTSIDE POSPage so it can use useState
// ─────────────────────────────────────────────
function CreditConfirmation({ sale, customers, customerId }) {
  const [dueDate,      setDueDate]      = useState('');
  const [installments, setInstallments] = useState('1');
  const [notes,        setNotes]        = useState('');

  const customer = customers.find(c => c.id === customerId);
  const installmentAmount = sale
    ? (parseFloat(sale.total) / parseInt(installments || 1)).toFixed(2)
    : 0;

  return (
    <div className="p-6 border-b border-brand-gray-mid bg-orange-50">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-3xl">📝</span>
      </div>
      <h2 className="font-display text-2xl font-bold text-orange-700 text-center">
        Credit Sale Recorded
      </h2>
      {customer && (
        <p className="text-orange-600 text-sm mt-1 text-center">
          {customer.name} · {customer.phone || 'No phone'}
        </p>
      )}
      <div className="mt-4 bg-white rounded-lg p-4 border border-orange-200 space-y-3">
        <div>
          <p className="text-xs text-brand-gray mb-1">Amount owed</p>
          <p className="font-display text-2xl font-bold text-brand-orange">
            KES {Number(sale?.total).toLocaleString('en-KE')}
          </p>
        </div>
        <div>
          <label className="label text-xs">Payment due date</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label text-xs">Number of installments</label>
          <select className="input" value={installments}
            onChange={e => setInstallments(e.target.value)}>
            <option value="1">1 — Full payment on due date</option>
            <option value="2">2 installments</option>
            <option value="3">3 installments</option>
            <option value="4">4 installments</option>
          </select>
          {parseInt(installments) > 1 && (
            <p className="text-xs text-brand-gray mt-1">
              Each installment: <strong>KES {Number(installmentAmount).toLocaleString('en-KE')}</strong>
            </p>
          )}
        </div>
        <div>
          <label className="label text-xs">Notes (optional)</label>
          <input
            className="input text-sm"
            placeholder="e.g. Customer promised to pay on salary day"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="p-2 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-xs text-orange-700">
            ⚠ This customer now has an outstanding balance. They will appear
            on the dashboard under "Unpaid Customer Balances".
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Receipt Modal Component
// ─────────────────────────────────────────────
function ReceiptModal({ sale, customers, customerId, amountPaid, onClose }) {
  if (!sale) return null;

  const method = sale.payments?.[0]?.method;
  const changeAmount = Math.max(0, parseFloat(amountPaid || 0) - parseFloat(sale.total));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto animate-fadeIn">

        {/* ── Payment confirmation banner ── */}
        {method === 'CASH' && (
          <div className="p-5 text-center bg-green-50 border-b border-green-100">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="font-display text-xl font-bold text-green-700">Cash Payment Received</h2>
            <p className="text-green-600 text-sm mt-0.5">Payment confirmed successfully</p>
            {changeAmount > 0 && (
              <div className="mt-3 bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs text-brand-gray">Change to give customer</p>
                <p className="font-display text-3xl font-bold text-green-600 mt-1">
                  KES {changeAmount.toLocaleString('en-KE')}
                </p>
              </div>
            )}
          </div>
        )}

        {method === 'MPESA' && (
          <div className="p-5 text-center bg-green-50 border-b border-green-100">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">📱</span>
            </div>
            <h2 className="font-display text-xl font-bold text-green-700">M-Pesa Recorded</h2>
            <p className="text-green-600 text-sm mt-0.5">Reference saved successfully</p>
            {sale.payments?.[0]?.reference && (
              <div className="mt-3 bg-white rounded-lg p-3 border border-green-200">
                <p className="text-xs text-brand-gray">M-Pesa Reference</p>
                <p className="font-mono font-bold text-brand-orange text-lg mt-1">
                  {sale.payments[0].reference}
                </p>
              </div>
            )}
            <div className="mt-2 p-2 bg-blue-50 rounded-lg text-left">
              <p className="text-xs text-blue-600">
                📌 Phase 7: STK Push will auto-confirm via Safaricom Daraja API
              </p>
            </div>
          </div>
        )}

        {method === 'CREDIT' && (
          <CreditConfirmation
            sale={sale}
            customers={customers}
            customerId={customerId}
          />
        )}

        {method === 'BANK_TRANSFER' && (
          <div className="p-5 text-center bg-blue-50 border-b border-blue-100">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-3xl">🏦</span>
            </div>
            <h2 className="font-display text-xl font-bold text-blue-700">Bank Transfer Pending</h2>
            <p className="text-blue-600 text-sm mt-0.5">Awaiting clearance confirmation</p>
            <div className="mt-3 bg-white rounded-lg p-3 border border-blue-200 text-left space-y-2">
              <div>
                <p className="text-xs text-brand-gray">Amount</p>
                <p className="font-bold">KES {Number(sale.total).toLocaleString('en-KE')}</p>
              </div>
              <span className="badge-orange">Pending clearance</span>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-700">
                  ⚠ Bank transfers take 1–3 business days.
                  Accountant must confirm clearance before goods are released.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Receipt body ── */}
        <div className="p-4">
          <div className="text-center mb-4">
            <h1 className="font-display text-xl font-bold text-brand-charcoal">
              HARDWARE<span className="text-brand-orange">OS</span>
            </h1>
            <p className="text-xs text-brand-gray">{sale.branch?.name}</p>
            <p className="text-xs text-brand-gray">
              {new Date(sale.createdAt).toLocaleString('en-KE')}
            </p>
            <p className="text-xs font-mono text-brand-gray">
              Receipt #{sale.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Items table */}
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b border-brand-gray-mid">
                <th className="text-left py-1.5 text-brand-gray">Item</th>
                <th className="text-right py-1.5 text-brand-gray">Qty</th>
                <th className="text-right py-1.5 text-brand-gray">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.saleItems?.map((item, i) => (
                <tr key={i} className="border-b border-brand-gray-mid/50">
                  <td className="py-1.5 text-brand-charcoal">{item.product?.name}</td>
                  <td className="py-1.5 text-right font-mono">{item.quantity}</td>
                  <td className="py-1.5 text-right font-mono">
                    KES {Number(item.total).toLocaleString('en-KE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-brand-gray">Subtotal</span>
              <span className="font-mono">KES {Number(sale.subtotal).toLocaleString('en-KE')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray">VAT (16%)</span>
              <span className="font-mono">KES {Number(sale.vatAmount).toLocaleString('en-KE')}</span>
            </div>
            {parseFloat(sale.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-brand-gray">Discount</span>
                <span className="font-mono text-green-600">
                  -KES {Number(sale.discount).toLocaleString('en-KE')}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-brand-gray-mid pt-2 mt-1">
              <span className="font-display">TOTAL</span>
              <span className="font-display text-brand-orange">
                KES {Number(sale.total).toLocaleString('en-KE')}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-brand-gray">Payment</span>
              <span>{method?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-gray">Served by</span>
              <span>{sale.cashier?.name}</span>
            </div>
          </div>

          <p className="text-center text-xs text-brand-gray mt-4">
            Thank you for your business!
          </p>
        </div>

        {/* Buttons */}
        <div className="p-4 flex gap-3 border-t border-brand-gray-mid">
          <button onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
          <button onClick={() => window.print()} className="btn-primary flex-1">
            🖨 Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main POS Page
// ─────────────────────────────────────────────
export default function POSPage() {
  const { user } = useAuth();
  const [products,       setProducts]       = useState([]);
  const [customers,      setCustomers]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [cart,           setCart]           = useState([]);
  const [customerId,     setCustomerId]     = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState('CASH');
  const [amountPaid,     setAmountPaid]     = useState('');
  const [processing,     setProcessing]     = useState(false);
  const [showReceipt,    setShowReceipt]    = useState(false);
  const [lastSale,       setLastSale]       = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const searchRef = useRef(null);

  const branchId = user?.branches?.[0]?.id;

  useEffect(() => {
    Promise.all([
      productsAPI.getAll({ limit: 500 }),
      customersAPI.getAll({ limit: 200 }),
    ])
      .then(([p, c]) => {
        setProducts(p.data);
        setCustomers(c.data);
      })
      .catch(() => toast.error('Failed to load POS data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setSearch('');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    return ['ALL', ...cats];
  }, [products]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== 'ALL') {
      result = result.filter(p => p.category?.name === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, activeCategory, search]);

  // ── Cart operations ───────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, {
        id:    product.id,
        name:  product.name,
        sku:   product.sku,
        price: parseFloat(product.sellingPrice),
        unit:  product.unit,
        qty:   1,
      }];
    });
    toast.success(`${product.name} added`, { duration: 1200 });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, item.qty + delta);
      return { ...item, qty: newQty };
    }));
  };

  const setQtyDirect = (id, val) => {
    const n = parseInt(val) || 1;
    setCart(prev => prev.map(i =>
      i.id === id ? { ...i, qty: Math.max(1, n) } : i
    ));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // ── Calculations ──────────────────────────────
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const vat      = subtotal * 0.16;
  const total    = subtotal + vat;
  const change   = Math.max(0, parseFloat(amountPaid || 0) - total);
  const balance  = Math.max(0, total - parseFloat(amountPaid || 0));

  const quickAmount = (mult) => {
    setAmountPaid(Math.ceil(total * mult).toString());
  };

  // ── Checkout ──────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!branchId) {
      toast.error('No branch assigned to your account');
      return;
    }
    if (paymentMethod === 'CREDIT' && !customerId) {
      toast.error('Select a customer for credit sale');
      return;
    }
    if (paymentMethod !== 'CREDIT' && parseFloat(amountPaid || 0) < total) {
      toast.error(`Amount paid must be at least ${kes(total)}`);
      return;
    }

    setProcessing(true);
    try {
      const res = await salesAPI.create({
        branchId,
        customerId: customerId || null,
        items: cart.map(item => ({
          productId: item.id,
          quantity:  item.qty,
        })),
        payments: [{
          method: paymentMethod,
          amount: total,
        }],
      });

      setLastSale(res.data);
      setShowReceipt(true);
      setCart([]);
      setAmountPaid('');
      setCustomerId('');
      setPaymentMethod('CASH');
      toast.success('Sale completed ✅');

      // Refresh products stock levels
      productsAPI.getAll({ limit: 500 }).then(r => setProducts(r.data));

    } catch (err) {
      console.error('Sale error:', err.response?.data);
      toast.error(err.response?.data?.error || 'Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <>
      <div
        className="flex gap-4 animate-fadeIn -m-6 p-6"
        style={{ height: 'calc(100vh - 48px)' }}
      >
        {/* ── LEFT: Product catalog ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="mb-4 flex-shrink-0">
            <h2 className="font-display text-3xl font-bold text-brand-charcoal">
              Point of Sale
            </h2>
            <p className="text-brand-gray text-sm mt-0.5">
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-brand-gray-light rounded text-xs font-mono border">
                /
              </kbd>{' '}
              to search · Click product to add
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-3 flex-shrink-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray">🔍</span>
            <input
              ref={searchRef}
              className="input pl-10 py-3 text-base"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-charcoal"
              >✕</button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-brand-orange text-white shadow-sm'
                    : 'bg-white text-brand-gray border border-brand-gray-mid hover:border-brand-orange hover:text-brand-orange'
                }`}
              >
                {cat === 'ALL' ? 'All Products' : cat}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-brand-gray">
                <span className="text-4xl mb-3">📦</span>
                <p className="text-sm">
                  {search || activeCategory !== 'ALL'
                    ? 'No products found'
                    : 'All products shown below'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
                {filtered.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="card p-4 text-left hover:border-brand-orange hover:shadow-md transition-all duration-150 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-brand-orange/5 rounded-bl-full -mr-8 -mt-8 group-hover:bg-brand-orange/10 transition-all"/>
                    <div className="flex items-start justify-between mb-2 relative">
                      <span className="badge-gray text-xs">{product.unit}</span>
                      <span className="font-display font-bold text-brand-orange text-sm">
                        {kes(product.sellingPrice)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-brand-charcoal line-clamp-2 group-hover:text-brand-orange transition-colors relative">
                      {product.name}
                    </p>
                    <p className="text-xs text-brand-gray font-mono mt-1 relative">{product.sku}</p>
                    {product.category?.name && (
                      <p className="text-[10px] text-brand-gray mt-1.5 uppercase tracking-wider">
                        {product.category.name}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart & checkout ── */}
        <div
          className="w-[420px] flex flex-col bg-white rounded-xl border border-brand-gray-mid shadow-sm overflow-hidden flex-shrink-0"
          style={{ maxHeight: 'calc(100vh - 48px)' }}
        >
          {/* Cart header */}
          <div className="px-5 py-4 border-b border-brand-gray-mid flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-brand-charcoal">
                Current Sale{' '}
                {cart.length > 0 && (
                  <span className="text-brand-orange">({cart.length})</span>
                )}
              </h3>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-brand-gray">
                <span className="text-4xl mb-3">🛒</span>
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-1">Click a product to add it</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-brand-gray-light rounded-lg group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-charcoal truncate">{item.name}</p>
                      <p className="text-xs text-brand-gray font-mono">
                        {kes(item.price)} / {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 rounded-md bg-white border border-brand-gray-mid flex items-center justify-center hover:bg-brand-gray-mid transition-colors text-sm"
                      >−</button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e => setQtyDirect(item.id, e.target.value)}
                        className="w-10 text-center text-sm font-semibold font-mono bg-white border border-brand-gray-mid rounded-md py-1 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 rounded-md bg-white border border-brand-gray-mid flex items-center justify-center hover:bg-brand-gray-mid transition-colors text-sm"
                      >+</button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-semibold font-mono text-brand-charcoal">
                        {kes(item.price * item.qty)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-brand-gray hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="px-5 py-3 border-t border-brand-gray-mid space-y-1.5 bg-brand-gray-light/50 flex-shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray">Subtotal</span>
              <span className="font-mono">{kes(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-gray">VAT (16%)</span>
              <span className="font-mono">{kes(vat)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-brand-gray-mid pt-2 mt-1">
              <span className="font-display text-brand-charcoal">TOTAL</span>
              <span className="font-display text-brand-orange">{kes(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="px-5 py-3 border-t border-brand-gray-mid flex-shrink-0">
            <p className="text-xs font-medium text-brand-gray uppercase tracking-wider mb-2">
              Payment Method
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all ${
                    paymentMethod === m.id
                      ? 'bg-brand-orange text-white shadow-sm ring-2 ring-brand-orange ring-offset-1'
                      : 'bg-brand-gray-light text-brand-gray hover:bg-brand-gray-mid'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer select — credit only */}
          {paymentMethod === 'CREDIT' && (
            <div className="px-5 py-3 border-t border-brand-gray-mid flex-shrink-0 animate-fadeIn">
              <label className="label text-xs">Select Customer *</label>
              <select
                className="input"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                <option value="">Choose customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone || 'No phone'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount paid — non-credit only */}
          {paymentMethod !== 'CREDIT' && (
            <div className="px-5 py-3 border-t border-brand-gray-mid flex-shrink-0">
              <label className="label text-xs">Amount Paid (KES)</label>
              <input
                type="number"
                className="input font-mono text-lg"
                placeholder="0.00"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                {[
                  { label: 'Exact', fn: () => quickAmount(1) },
                  { label: '1.5x',  fn: () => quickAmount(1.5) },
                  { label: '2x',    fn: () => quickAmount(2) },
                  { label: 'Round ↑', fn: () => setAmountPaid((Math.ceil(total / 100) * 100).toString()) },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.fn}
                    className="flex-1 py-1.5 text-xs font-medium bg-brand-gray-light rounded-md hover:bg-brand-orange hover:text-white transition-colors"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              {parseFloat(amountPaid || 0) > 0 && (
                <div className="flex justify-between mt-2 text-sm">
                  {change > 0 ? (
                    <>
                      <span className="text-green-600 font-medium">Change</span>
                      <span className="font-mono text-green-600 font-bold">{kes(change)}</span>
                    </>
                  ) : balance > 0 ? (
                    <>
                      <span className="text-red-500 font-medium">Balance due</span>
                      <span className="font-mono text-red-500 font-bold">{kes(balance)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-600 font-medium">Exact amount ✓</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Checkout button */}
          <div className="p-5 border-t border-brand-gray-mid flex-shrink-0">
            <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  Processing...
                </>
              ) : (
                <>Complete Sale — {kes(total)}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Receipt Modal — rendered outside the flex layout ── */}
      {showReceipt && lastSale && (
        <ReceiptModal
          sale={lastSale}
          customers={customers}
          customerId={customerId}
          amountPaid={amountPaid}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}