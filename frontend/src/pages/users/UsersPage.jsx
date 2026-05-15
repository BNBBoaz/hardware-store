import { useEffect, useState } from 'react';
import { usersAPI } from '../../api';
import api from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { id: 'MANAGER',     label: 'Manager',     desc: 'Manages daily operations, can edit products and view reports' },
  { id: 'CASHIER',     label: 'Cashier',     desc: 'Processes sales and receives payments at the till' },
  { id: 'STOREKEEPER', label: 'Storekeeper', desc: 'Manages stock, receives supplier deliveries' },
  { id: 'ACCOUNTANT',  label: 'Accountant',  desc: 'Views all financial data, records payments, exports reports' },
];

const ROLE_COLORS = {
  OWNER:       'badge-red',
  MANAGER:     'badge-orange',
  CASHIER:     'badge-green',
  STOREKEEPER: 'badge-blue',
  ACCOUNTANT:  'badge-gray',
};

const emptyForm = { name: '', email: '', password: '', role: 'CASHIER', branchIds: [] };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users,    setUsers]    = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(emptyForm);
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState(null);

  useEffect(() => {
    Promise.all([
      usersAPI.getAll(),
      api.get('/branches').catch(() => ({ data: [] })),
    ])
      .then(([u, b]) => {
        setUsers(u.data);
        // Fallback: use branches from current user if /branches endpoint not available
        setBranches(b.data?.length ? b.data : currentUser?.branches || []);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.branchIds.length === 0) {
      toast.error('Assign at least one branch');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await usersAPI.update(editing.id, {
          name:      form.name,
          role:      form.role,
          branchIds: form.branchIds,
          ...(form.password && { password: form.password }),
        });
        setUsers(prev => prev.map(u => u.id === editing.id ? res.data : u));
        toast.success(`${res.data.name} updated`);
      } else {
        const res = await usersAPI.create(form);
        setUsers(prev => [...prev, res.data]);
        toast.success(`${res.data.name} enrolled as ${res.data.role}`);
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditing(user);
    setForm({
      name:      user.name,
      email:     user.email,
      password:  '',
      role:      user.role,
      branchIds: user.branches?.map(b => b.id) || [],
    });
    setShowForm(true);
  };

  const handleDeactivate = async (user) => {
    if (!confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return;
    try {
      await usersAPI.deactivate(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: false } : u));
      toast.success(`${user.name} deactivated`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate');
    }
  };

  const handleReactivate = async (user) => {
    try {
      const res = await usersAPI.update(user.id, { isActive: true });
      setUsers(prev => prev.map(u => u.id === user.id ? res.data : u));
      toast.success(`${user.name} reactivated`);
    } catch (err) {
      toast.error('Failed to reactivate');
    }
  };

  const toggleBranch = (id) => {
    setForm(prev => ({
      ...prev,
      branchIds: prev.branchIds.includes(id)
        ? prev.branchIds.filter(b => b !== id)
        : [...prev.branchIds, id],
    }));
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
          <h2 className="font-display text-3xl font-bold text-brand-charcoal">Staff Management</h2>
          <p className="text-brand-gray text-sm mt-0.5">
            {users.length} users · Enroll staff and control their access
          </p>
        </div>
        <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary">
          + Enroll Staff
        </button>
      </div>

      {/* Role permission guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r.id} className="card py-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`${ROLE_COLORS[r.id]} text-xs`}>{r.label}</span>
            </div>
            <p className="text-xs text-brand-gray">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Enroll / Edit form */}
      {showForm && (
        <div className="card border-brand-orange/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-bold text-brand-charcoal">
              {editing ? `Edit — ${editing.name}` : 'Enroll New Staff Member'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-brand-gray text-xl">✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.name} required
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Mary Wanjiku"/>
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input className="input" type="email" value={form.email} required
                  disabled={!!editing}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="mary@yourstore.com"/>
                {editing && <p className="text-xs text-brand-gray mt-1">Email cannot be changed</p>}
              </div>
              <div>
                <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input className="input" type="password" value={form.password}
                  required={!editing}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder={editing ? 'Leave blank to keep current' : 'Minimum 6 characters'}
                  minLength={form.password ? 6 : undefined}/>
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}>
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branch assignment */}
            <div className="mb-5">
              <label className="label">Assign to Branches *</label>
              <p className="text-xs text-brand-gray mb-2">
                Staff can only see data for branches they are assigned to
              </p>
              {branches.length === 0 ? (
                <p className="text-sm text-brand-gray">No branches found</p>
              ) : (
                <div className="flex gap-3 flex-wrap">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBranch(b.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.branchIds.includes(b.id)
                          ? 'bg-brand-orange text-white border-brand-orange'
                          : 'bg-white text-brand-gray border-brand-gray-mid hover:border-brand-orange'
                      }`}
                    >
                      {form.branchIds.includes(b.id) ? '✓ ' : ''}{b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Enroll Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="table-wrapper">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left">Staff Member</th>
              <th className="table-header text-left">Role</th>
              <th className="table-header text-left">Branches</th>
              <th className="table-header text-left">Joined</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-cell text-center text-brand-gray py-12">
                  No staff enrolled yet — click "Enroll Staff" to add your first team member
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} className={`transition-colors ${u.isActive ? 'hover:bg-brand-gray-light' : 'opacity-50 bg-gray-50'}`}>
                <td className="table-cell">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-brand-charcoal">
                        {u.name}
                        {u.id === currentUser?.id && <span className="ml-2 text-xs text-brand-gray">(you)</span>}
                      </p>
                      <p className="text-xs text-brand-gray">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <span className={ROLE_COLORS[u.role] || 'badge-gray'}>{u.role}</span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {u.branches?.length > 0
                      ? u.branches.map(b => (
                          <span key={b.id} className="badge-gray text-xs">{b.name}</span>
                        ))
                      : <span className="text-xs text-brand-gray">No branch</span>
                    }
                  </div>
                </td>
                <td className="table-cell text-sm text-brand-gray">
                  {new Date(u.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="table-cell text-center">
                  {u.isActive
                    ? <span className="badge-green">Active</span>
                    : <span className="badge-red">Deactivated</span>
                  }
                </td>
                <td className="table-cell text-right">
                  {u.id !== currentUser?.id && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(u)}
                        className="text-xs text-brand-orange hover:text-brand-orange-dark font-medium"
                      >
                        Edit
                      </button>
                      {u.isActive ? (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(u)}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}