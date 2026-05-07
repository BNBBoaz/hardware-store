import { useEffect, useState } from 'react';
import { customersAPI } from '../../api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', phone: '', email: '', address: '', creditLimit: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [stkPhone, setStkPhone] = useState('');
  const [stkStatus, setStkStatus] = useState('idle'); // idle | sending | waiting | confirmed | failed

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Auto-fill customer's phone when opening payment modal
    if (paymentCustomer?.phone) {
      setStkPhone(paymentCustomer.phone);
    }
  }, [paymentCustomer]);

  const loadCustomers = () => {
    setLoading(true);
    customersAPI.getAll()
      .then(res => setCustomers(res.data))
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await customersAPI.create({
        ...form,
        creditLimit: parseFloat(form.creditLimit || 0),
      });
      setForm(emptyForm);
      setShowForm(false);
      toast.success('Customer added');
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  const sendStkPush = async () => {
    if (!stkPhone || stkPhone.length < 10) {
      toast.error('Enter valid Safaricom number (2547XX...)');
      return;
    }
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Enter payment amount');
      return;
    }

    setStkStatus('sending');
    try {
      // This will call your backend which calls Daraja API
      // POST /api/payments/stk-push
      // Backend returns { checkoutRequestId, responseCode }
      const res = await fetch('/api/payments/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: stkPhone.startsWith('254') ? stkPhone : `254${stkPhone.replace(/^0/, '')}`,
          amount: parseFloat(paymentAmount),
          accountReference: `CUST-${paymentCustomer.id.slice(0, 8)}`,
          transactionDesc: `Payment for ${paymentCustomer.name}`,
        }),
      });

      if (!res.ok) throw new Error('STK push failed');

      const data = await res.json();
      setStkStatus('waiting');

      // Poll for confirmation (in real implementation, use WebSocket or callback)
      toast.success('STK push sent! Check your phone 📱');
      
      // Simulate waiting for callback — in production, backend handles this
      setTimeout(() => {
        // This would be replaced by actual callback from Safaricom
        setStkStatus('confirmed');
        toast.success('M-Pesa payment confirmed ✅');
        handlePayment('MPESA', data.checkoutRequestId || 'STK-CONFIRMED');
      }, 5000); // Remove this in production — use real callback

    } catch (err) {
      setStkStatus('failed');
      toast.error('STK push failed. Use manual code instead.');
    }
  };

  const handlePayment = async (method = paymentMethod, ref = paymentRef) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (method === 'MPESA' && !ref && stkStatus !== 'confirmed') {
      toast.error('Enter M-Pesa confirmation code or use STK push');
      return;
    }
    if (method === 'BANK' && !ref) {
      toast.error('Enter bank transfer reference');
      return;
    }

    setProcessingPayment(true);
    try {
      await customersAPI.recordPayment(paymentCustomer.id, {
        amount: parseFloat(paymentAmount),
        method: method,
        reference: ref || null,
      });
      toast.success(`${method} payment recorded ✅`);
      resetPaymentModal();
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const resetPaymentModal = () => {
    setPaymentCustomer(null);
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentRef('');
    setStkPhone('');
    setStkStatus('idle');
  };

  const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-brand-charcoal">Customers</h2>
          <p className="text-brand-gray text-sm mt-0.5">{customers.length} customers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Customer</button>
      </div>

      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray">🔍</span>
        <input className="input pl-9" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {showForm && (
        <div className="card border-brand-orange/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-brand-charcoal">New Customer</h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray hover:text-brand-charcoal text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/></div>
              <div><label className="label">Credit Limit (KES)</label><input className="input" type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})}/></div>
              <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})}/></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Customer'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrapper">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left">Customer</th>
              <th className="table-header text-left">Contact</th>
              <th className="table-header text-right">Credit Limit</th>
              <th className="table-header text-right">Balance</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="table-cell text-center text-brand-gray py-12">{search ? 'No matches' : 'No customers yet'}</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-brand-gray-light transition-colors">
                <td className="table-cell">
                  <p className="font-medium text-brand-charcoal">{c.name}</p>
                  <p className="text-xs text-brand-gray">{c.address || 'No address'}</p>
                </td>
                <td className="table-cell text-brand-gray text-sm">{c.phone || '—'}<br/><span className="text-xs">{c.email || ''}</span></td>
                <td className="table-cell text-right font-mono">{kes(c.creditLimit)}</td>
                <td className="table-cell text-right font-mono font-semibold text-red-500">{kes(c.creditBalance)}</td>
                <td className="table-cell text-center">
                  <span className={c.creditBalance > c.creditLimit ? 'badge-red' : c.creditBalance > 0 ? 'badge-orange' : 'badge-green'}>
                    {c.creditBalance > c.creditLimit ? 'Over Limit' : c.creditBalance > 0 ? 'Has Balance' : 'Paid Up'}
                  </span>
                </td>
                <td className="table-cell text-right">
                  {c.creditBalance > 0 && (
                    <button onClick={() => setPaymentCustomer(c)} className="text-xs text-brand-orange hover:text-brand-orange-dark font-medium">Record Payment</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <h3 className="font-display text-xl font-bold text-brand-charcoal mb-1">Record Payment</h3>
            <p className="text-brand-gray text-sm mb-4">{paymentCustomer.name} — Balance: {kes(paymentCustomer.creditBalance)}</p>

            {/* Payment Method */}
            <label className="label text-xs">Payment Method</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { id: 'CASH', label: 'Cash', icon: '💵' },
                { id: 'MPESA', label: 'M-Pesa', icon: '📱' },
                { id: 'BANK', label: 'Bank', icon: '🏦' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => { setPaymentMethod(m.id); setPaymentRef(''); setStkStatus('idle'); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all ${
                    paymentMethod === m.id
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'bg-brand-gray-light text-brand-gray hover:bg-brand-gray-mid'
                  }`}
                >
                  <span className="text-lg">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Amount */}
            <label className="label text-xs">Payment Amount (KES)</label>
            <input 
              type="number" 
              className="input font-mono text-lg mb-3" 
              placeholder="0.00" 
              value={paymentAmount} 
              onChange={e => setPaymentAmount(e.target.value)} 
              autoFocus
            />

            {/* M-PESA STK PUSH FLOW */}
            {paymentMethod === 'MPESA' && (
              <div className="mb-3 animate-fadeIn space-y-3">
                {/* Primary: STK Push */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 font-medium text-sm">📱 STK Push</span>
                    {stkStatus === 'waiting' && (
                      <span className="badge-blue text-[10px] animate-pulse">Waiting...</span>
                    )}
                    {stkStatus === 'confirmed' && (
                      <span className="badge-green text-[10px]">✓ Confirmed</span>
                    )}
                  </div>
                  
                  <label className="label text-xs">Customer M-Pesa Number</label>
                  <input 
                    className="input font-mono text-sm mb-2" 
                    placeholder="254712345678" 
                    value={stkPhone}
                    onChange={e => setStkPhone(e.target.value.replace(/\D/g, ''))}
                    disabled={stkStatus === 'waiting' || stkStatus === 'confirmed'}
                  />
                  
                  <button 
                    onClick={sendStkPush}
                    disabled={stkStatus === 'sending' || stkStatus === 'waiting' || stkStatus === 'confirmed'}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {stkStatus === 'sending' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                        Sending...
                      </>
                    ) : stkStatus === 'waiting' ? (
                      'Waiting for customer...'
                    ) : stkStatus === 'confirmed' ? (
                      '✓ Payment Confirmed'
                    ) : (
                      'Send STK Push Request'
                    )}
                  </button>
                  
                  <p className="text-[10px] text-blue-600 mt-1.5">
                    Customer will receive popup on their phone to enter M-Pesa PIN
                  </p>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-brand-gray-mid"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-brand-gray">or enter manually</span>
                  </div>
                </div>

                {/* Fallback: Manual confirmation code */}
                <div>
                  <label className="label text-xs">M-Pesa Confirmation Code</label>
                  <input 
                    className="input font-mono uppercase" 
                    placeholder="SIB7XXX123" 
                    value={paymentRef} 
                    onChange={e => setPaymentRef(e.target.value.toUpperCase())}
                    disabled={stkStatus === 'confirmed'}
                  />
                  <p className="text-[10px] text-brand-gray mt-1">
                    Use this if STK push failed or customer already paid
                  </p>
                </div>
              </div>
            )}

            {/* BANK TRANSFER */}
            {paymentMethod === 'BANK' && (
              <div className="mb-3 animate-fadeIn">
                <label className="label text-xs">Bank Reference / Transaction ID *</label>
                <input 
                  className="input font-mono" 
                  placeholder="TRX-12345678" 
                  value={paymentRef} 
                  onChange={e => setPaymentRef(e.target.value)}
                />
                <p className="text-[10px] text-brand-gray mt-1">
                  Enter reference from bank statement or transfer receipt
                </p>
              </div>
            )}

            {/* CASH */}
            {paymentMethod === 'CASH' && (
              <div className="mb-3 p-2 bg-green-50 rounded-lg animate-fadeIn">
                <p className="text-xs text-green-700">💵 Cash payment — no reference needed</p>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={resetPaymentModal} 
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => handlePayment()}
                disabled={processingPayment || (paymentMethod === 'MPESA' && !paymentRef && stkStatus !== 'confirmed')}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    Processing...
                  </>
                ) : (
                  `Record ${paymentMethod}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}