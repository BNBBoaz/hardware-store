import { useEffect, useState } from 'react';
import { suppliersAPI } from '../../api';
import toast from 'react-hot-toast';

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    setLoading(true);
    suppliersAPI.getAll()
      .then(res => setSuppliers(res.data))
      .catch(() => toast.error('Failed to load suppliers'))
      .finally(() => setLoading(false));
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await suppliersAPI.create(form);
      setForm(emptyForm);
      setShowForm(false);
      toast.success('Supplier added');
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add supplier');
    } finally {
      setSaving(false);
    }
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
          <h2 className="font-display text-3xl font-bold text-brand-charcoal">Suppliers</h2>
          <p className="text-brand-gray text-sm mt-0.5">{suppliers.length} suppliers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Supplier</button>
      </div>

      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray">🔍</span>
        <input className="input pl-9" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {showForm && (
        <div className="card border-brand-orange/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-brand-charcoal">New Supplier</h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray hover:text-brand-charcoal text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div><label className="label">Company Name *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/></div>
              <div><label className="label">Contact Person</label><input className="input" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})}/></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}/></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/></div>
              <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({...form, address: e.target.value})}/></div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Supplier'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrapper">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left">Supplier</th>
              <th className="table-header text-left">Contact</th>
              <th className="table-header text-right">Balance Owed</th>
              <th className="table-header text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="table-cell text-center text-brand-gray py-12">{search ? 'No matches' : 'No suppliers yet'}</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-brand-gray-light transition-colors">
                <td className="table-cell">
                  <p className="font-medium text-brand-charcoal">{s.name}</p>
                  <p className="text-xs text-brand-gray">{s.address || 'No address'}</p>
                </td>
                <td className="table-cell text-brand-gray text-sm">{s.contactPerson || '—'}<br/>{s.phone || ''}<br/><span className="text-xs">{s.email || ''}</span></td>
                <td className="table-cell text-right font-mono font-semibold text-brand-orange">{kes(s.balanceOwed)}</td>
                <td className="table-cell text-center">
                  <span className={s.balanceOwed > 0 ? 'badge-orange' : 'badge-green'}>
                    {s.balanceOwed > 0 ? 'Payment Due' : 'Paid Up'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}