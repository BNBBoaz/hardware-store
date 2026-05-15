import { useEffect, useState } from 'react';
import { customersAPI } from '../../api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', phone: '', email: '', address: '', creditLimit: '' };

const PAYMENT_METHODS = [
  { id: 'CASH',          label: 'Cash',          icon: '💵' },
  { id: 'MPESA',         label: 'M-Pesa',        icon: '📱' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
  { id: 'CHEQUE',        label: 'Cheque',        icon: '📄' },
];

const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

export default function CustomersPage() {
  const [customers,        setCustomers]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showForm,         setShowForm]         = useState(false);
  const [editingCustomer,  setEditingCustomer]  = useState(null);
  const [form,             setForm]             = useState(emptyForm);
  const [saving,           setSaving]           = useState(false);
  const [search,           setSearch]           = useState('');
  const [paymentCustomer,  setPaymentCustomer]  = useState(null);
  const [paymentAmount,    setPaymentAmount]    = useState('');
  const [paymentMethod,    setPaymentMethod]    = useState('CASH');
  const [paymentRef,       setPaymentRef]       = useState('');
  const [processingPayment,setProcessingPayment]= useState(false);

  useEffect(() => { loadCustomers(); }, []);

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

  // ── Open add form ─────────────────────────────
  const openAdd = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  // ── Open edit form ────────────────────────────
  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name:        customer.name,
      phone:       customer.phone || '',
      email:       customer.email || '',
      address:     customer.address || '',
      creditLimit: customer.creditLimit || '',
    });
    setShowForm(true);
  };

  // ── Save (add or edit) ────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCustomer) {
        // EDIT existing customer
        const res = await customersAPI.update(editingCustomer.id, {
          ...form,
          creditLimit: parseFloat(form.creditLimit || 0),
        });
        setCustomers(prev => prev.map(c =>
          c.id === editingCustomer.id ? res.data : c
        ));
        toast.success(`${res.data.name} updated`);
      } else {
        // ADD new customer
        const res = await customersAPI.create({
          ...form,
          creditLimit: parseFloat(form.creditLimit || 0),
        });
        setCustomers(prev => [...prev, res.data]);
        toast.success(`${res.data.name} added`);
      }
      setShowForm(false);
      setEditingCustomer(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete customer ───────────────────────────
  const handleDelete = async (customer) => {
    if (parseFloat(customer.creditBalance) > 0) {
      toast.error('Cannot delete customer with outstanding balance');
      return;
    }
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    try {
      await customersAPI.delete(customer.id);
      setCustomers(prev => prev.filter(c => c.id !== customer.id));
      toast.success('Customer deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete customer');
    }
  };

  // ── Record credit payment ─────────────────────
  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (paymentMethod !== 'CASH' && !paymentRef) {
      toast.error('Enter a reference number for this payment method');
      return;
    }
    setProcessingPayment(true);
    try {
      await customersAPI.recordPayment(paymentCustomer.id, {
        amount:    parseFloat(paymentAmount),
        method:    paymentMethod,
        reference: paymentRef || null,
      });
      toast.success('Payment recorded');
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
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-brand-charcoal">Customers</h2>
          <p className="text-brand-gray text-sm mt-0.5">{customers.length} customers</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add Customer</button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray">🔍</span>
        <input className="input pl-9" placeholder="Search by name or phone..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card border-brand-orange/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-brand-charcoal">
              {editingCustomer ? `Edit — ${editingCustomer.name}` : 'New Customer'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingCustomer(null); }}
              className="text-brand-gray hover:text-brand-charcoal text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.name} required
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. John Kamau"/>
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="07XXXXXXXX"/>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="optional"/>
              </div>
              <div>
                <label className="label">Credit Limit (KES)</label>
                <input className="input" type="number" value={form.creditLimit}
                  onChange={e => setForm({...form, creditLimit: e.target.value})}
                  placeholder="0 = no credit"/>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address</label>
                <input className="input" value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  placeholder="e.g. Mombasa Road, Nairobi"/>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button"
                onClick={() => { setShowForm(false); setEditingCustomer(null); }}
                className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers table */}
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
              <tr>
                <td colSpan={6} className="table-cell text-center text-brand-gray py-12">
                  {search ? 'No matches found' : 'No customers yet — add your first customer'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-brand-gray-light transition-colors">
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-sm flex-shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-brand-charcoal">{c.name}</p>
                      <p className="text-xs text-brand-gray">{c.address || 'No address'}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell text-sm text-brand-gray">
                  {c.phone || '—'}
                  {c.email && <><br/><span className="text-xs">{c.email}</span></>}
                </td>
                <td className="table-cell text-right font-mono text-sm">{kes(c.creditLimit)}</td>
                <td className="table-cell text-right font-mono text-sm font-semibold text-red-500">
                  {kes(c.creditBalance)}
                </td>
                <td className="table-cell text-center">
                  <span className={
                    parseFloat(c.creditBalance) > parseFloat(c.creditLimit) ? 'badge-red' :
                    parseFloat(c.creditBalance) > 0 ? 'badge-orange' : 'badge-green'
                  }>
                    {parseFloat(c.creditBalance) > parseFloat(c.creditLimit) ? 'Over Limit' :
                     parseFloat(c.creditBalance) > 0 ? 'Has Balance' : 'Paid Up'}
                  </span>
                </td>
                <td className="table-cell text-right">
                  <div className="flex gap-2 justify-end">
                    {parseFloat(c.creditBalance) > 0 && (
                      <button
                        onClick={() => setPaymentCustomer(c)}
                        className="text-xs text-brand-orange hover:text-brand-orange-dark font-medium"
                      >
                        Pay
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(c)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-fadeIn">
            <h3 className="font-display text-xl font-bold text-brand-charcoal mb-1">
              Record Payment
            </h3>
            <p className="text-brand-gray text-sm mb-4">
              {paymentCustomer.name} — Outstanding: {kes(paymentCustomer.creditBalance)}
            </p>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="label">Amount (KES)</label>
                <input type="number" className="input font-mono text-lg"
                  placeholder="0.00" value={paymentAmount} autoFocus
                  onChange={e => setPaymentAmount(e.target.value)}/>
              </div>

              {/* Method */}
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { setPaymentMethod(m.id); setPaymentRef(''); }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-all ${
                        paymentMethod === m.id
                          ? 'bg-brand-orange text-white border-brand-orange'
                          : 'bg-white text-brand-gray border-brand-gray-mid hover:border-brand-orange'
                      }`}>
                      <span className="text-base">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference — not needed for cash */}
              {paymentMethod !== 'CASH' && (
                <div className="animate-fadeIn">
                  <label className="label">
                    {paymentMethod === 'MPESA' ? 'M-Pesa Reference *' :
                     paymentMethod === 'BANK_TRANSFER' ? 'Bank Reference *' :
                     'Cheque Number *'}
                  </label>
                  <input className="input font-mono"
                    placeholder={
                      paymentMethod === 'MPESA' ? 'e.g. QGH7YT3KPL' :
                      paymentMethod === 'BANK_TRANSFER' ? 'e.g. TRF/2026/001234' :
                      'e.g. 000123'
                    }
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}/>
                </div>
              )}

              {/* Info notes */}
              {paymentMethod === 'MPESA' && (
                <div className="p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    📱 Phase 7: STK Push will auto-prompt the customer's phone via Safaricom Daraja API
                  </p>
                </div>
              )}
              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    🏦 Verify against bank statement before marking as received
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={resetPaymentModal} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handlePayment}
                disabled={processingPayment}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {processingPayment
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Processing...</>
                  : 'Record Payment'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}