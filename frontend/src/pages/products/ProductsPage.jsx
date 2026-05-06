import { useEffect, useState } from 'react';
import { productsAPI, categoriesAPI } from '../../api';
import toast from 'react-hot-toast';

const UNITS = ['PCS', 'KG', 'M', 'L', 'BAG', 'BOX'];

const emptyForm = {
  name: '', sku: '', categoryId: '', unit: 'PCS',
  buyingPrice: '', sellingPrice: '', reorderLevel: '', initialStock: '',
};

export default function ProductsPage() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(emptyForm);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    Promise.all([productsAPI.getAll(), categoriesAPI.getAll()])
      .then(([p, c]) => {
        setProducts(p.data);
        setCategories(c.data);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await productsAPI.create({
        ...form,
        buyingPrice:  parseFloat(form.buyingPrice),
        sellingPrice: parseFloat(form.sellingPrice),
        reorderLevel: parseFloat(form.reorderLevel || 0),
        initialStock: parseFloat(form.initialStock || 0),
        categoryId:   form.categoryId || undefined,
      });
      setProducts(prev => [...prev, res.data]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success(`${res.data.name} added successfully`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  const kes = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;

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
          <h2 className="font-display text-3xl font-bold text-brand-charcoal">Products</h2>
          <p className="text-brand-gray text-sm mt-0.5">{products.length} products in catalogue</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray">⊙</span>
        <input
          className="input pl-9"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Add product form */}
      {showForm && (
        <div className="card border-brand-orange/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-brand-charcoal">New Product</h3>
            <button onClick={() => setShowForm(false)} className="text-brand-gray hover:text-brand-charcoal text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Product Name *</label>
                <input className="input" placeholder="e.g. Portland Cement 50kg"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})} required/>
              </div>
              <div>
                <label className="label">SKU (leave blank to auto-generate)</label>
                <input className="input" placeholder="e.g. HW-00005"
                  value={form.sku} onChange={e => setForm({...form, sku: e.target.value})}/>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.categoryId}
                  onChange={e => setForm({...form, categoryId: e.target.value})}>
                  <option value="">No category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Unit *</label>
                <select className="input" value={form.unit}
                  onChange={e => setForm({...form, unit: e.target.value})}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Buying Price (KES) *</label>
                <input className="input" type="number" placeholder="0"
                  value={form.buyingPrice} onChange={e => setForm({...form, buyingPrice: e.target.value})} required/>
              </div>
              <div>
                <label className="label">Selling Price (KES) *</label>
                <input className="input" type="number" placeholder="0"
                  value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})} required/>
              </div>
              <div>
                <label className="label">Reorder Level</label>
                <input className="input" type="number" placeholder="0"
                  value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: e.target.value})}/>
              </div>
              <div>
                <label className="label">Initial Stock</label>
                <input className="input" type="number" placeholder="0"
                  value={form.initialStock} onChange={e => setForm({...form, initialStock: e.target.value})}/>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products table */}
      <div className="table-wrapper">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left">Product</th>
              <th className="table-header text-left">Category</th>
              <th className="table-header text-left">Unit</th>
              <th className="table-header text-right">Buying</th>
              <th className="table-header text-right">Selling</th>
              <th className="table-header text-right">Stock</th>
              <th className="table-header text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell text-center text-brand-gray py-12">
                  {search ? 'No products match your search' : 'No products yet — add your first product'}
                </td>
              </tr>
            ) : filtered.map(product => {
              const stock = product.inventory?.[0]?.quantity ?? 0;
              const reorder = product.inventory?.[0]?.reorderLevel ?? 0;
              const isLow = parseFloat(stock) <= parseFloat(reorder);
              return (
                <tr key={product.id} className="hover:bg-brand-gray-light transition-colors">
                  <td className="table-cell">
                    <p className="font-medium text-brand-charcoal">{product.name}</p>
                    <p className="text-xs text-brand-gray font-mono">{product.sku}</p>
                  </td>
                  <td className="table-cell text-brand-gray">
                    {product.category?.name || '—'}
                  </td>
                  <td className="table-cell">
                    <span className="badge-gray">{product.unit}</span>
                  </td>
                  <td className="table-cell text-right font-mono text-sm">
                    {kes(product.buyingPrice)}
                  </td>
                  <td className="table-cell text-right font-mono text-sm font-semibold">
                    {kes(product.sellingPrice)}
                  </td>
                  <td className="table-cell text-right">
                    <span className={`font-mono text-sm font-semibold ${isLow ? 'text-red-500' : 'text-brand-charcoal'}`}>
                      {stock}
                    </span>
                    {isLow && <span className="ml-1 text-xs text-red-400">⚠ low</span>}
                  </td>
                  <td className="table-cell text-center">
                    <span className={product.isActive ? 'badge-green' : 'badge-red'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}