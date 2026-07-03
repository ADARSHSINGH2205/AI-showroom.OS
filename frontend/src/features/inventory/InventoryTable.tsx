import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, IndianRupee, Minus, PackagePlus, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import { Panel } from '../../components/Panel';
import type { Product } from '../../types/domain';
import { formatCurrency } from '../../utils/money';

const initialForm = { category_name: '', supplier_name: '', brand: '', name: '', description: '', purchase_price: '', selling_price: '', warranty_months: '', barcode: '', minimum_stock: '', opening_stock: '' };

export const InventoryTable = ({ products, onChanged }: { products: Product[]; onChanged: () => void }) => {
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [stockAction, setStockAction] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [removeQuantity, setRemoveQuantity] = useState('');
  const [removeNote, setRemoveNote] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const filtered = useMemo(() => products.filter((product) => {
    const matches = `${product.name} ${product.brand} ${product.barcode ?? ''}`.toLowerCase().includes(query.toLowerCase());
    return matches && (stockFilter === 'all' || (stockFilter === 'low' && product.current_stock <= product.minimum_stock) || (stockFilter === 'out' && product.current_stock === 0));
  }), [products, query, stockFilter]);

  const inventoryValue = products.reduce((sum, product) => sum + Number(product.purchase_price) * product.current_stock, 0);
  const sellingValue = products.reduce((sum, product) => sum + Number(product.selling_price) * product.current_stock, 0);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('Saving product and opening stock history...');
    try {
      await apiClient.createProduct({
        ...form,
        supplier_name: form.supplier_name || null,
        description: form.description || null,
        barcode: form.barcode || null,
        warranty_months: Number(form.warranty_months || 0),
        minimum_stock: Number(form.minimum_stock || 0),
        opening_stock: Number(form.opening_stock || 0),
      });
      setForm(initialForm);
      setShowForm(false);
      setMessage('Product created successfully.');
      await onChanged();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Could not create product';
      setMessage(text.toLowerCase().includes('not authenticated') || text.toLowerCase().includes('could not validate credentials') ? 'Your login session expired. Sign in again, then create the product.' : text);
    } finally {
      setBusy(false);
    }
  };

  const reduceStock = async (event: FormEvent) => {
    event.preventDefault();
    if (!stockAction) return;
    const quantity = Number(removeQuantity);
    if (quantity < 1 || quantity > stockAction.current_stock) {
      setMessage(`Enter a quantity from 1 to ${stockAction.current_stock}.`);
      return;
    }

    setBusy(true);
    try {
      await apiClient.adjustStock(stockAction.id, quantity, removeNote.trim() || 'Manual stock reduction');
      setMessage(`${quantity} unit(s) removed from ${stockAction.name}.`);
      setStockAction(null);
      setRemoveQuantity('');
      setRemoveNote('');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not reduce stock');
    } finally {
      setBusy(false);
    }
  };

  const removeStockOnly = async (product: Product) => {
    setBusy(true);
    try {
      await apiClient.deleteProduct(product.id, 'stock_only');
      setMessage(`${product.name} stock is now zero. Product stays in the register because bill, revenue, and profit history were kept.`);
      setDeleteTarget(null);
      setDeleteConfirmation('');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not set stock to zero');
    } finally {
      setBusy(false);
    }
  };

  const purgeProduct = async (product: Product) => {
    if (deleteConfirmation !== 'PURGE') {
      setMessage('Type PURGE to confirm the complete delete.');
      return;
    }

    setBusy(true);
    try {
      await apiClient.deleteProduct(product.id, 'purge_all', 'PURGE');
      setMessage(`${product.name} was deleted completely. Stock, sale, purchase, profit, and revenue traces were removed.`);
      setDeleteTarget(null);
      setDeleteConfirmation('');
      setStockAction(null);
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete product completely');
    } finally {
      setBusy(false);
    }
  };

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase text-cyan-700">Stock control</p><h1 className="mt-1 text-2xl font-black">Products & inventory</h1><p className="mt-1 text-sm text-slate-500">Product master, pricing, warranty, stock level, and reorder risk.</p></div><button className="btn-primary" onClick={() => setShowForm(true)}><PackagePlus size={17} /> New product</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="panel"><Boxes className="text-cyan-700" size={19} /><p className="mt-5 text-2xl font-black">{products.reduce((sum, p) => sum + p.current_stock, 0)}</p><p className="text-xs font-bold uppercase text-slate-500">Units in store</p></div><div className="panel"><IndianRupee className="text-emerald-600" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(inventoryValue)}</p><p className="text-xs font-bold uppercase text-slate-500">Cost value</p></div><div className="panel"><ShieldCheck className="text-slate-700" size={19} /><p className="mt-5 text-2xl font-black">{formatCurrency(sellingValue)}</p><p className="text-xs font-bold uppercase text-slate-500">Retail value</p></div><div className="panel"><AlertTriangle className="text-amber-600" size={19} /><p className="mt-5 text-2xl font-black">{products.filter((p) => p.current_stock <= p.minimum_stock).length}</p><p className="text-xs font-bold uppercase text-slate-500">Need attention</p></div></div>
    {message ? <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</div> : null}
    {showForm ? <Panel title="Create product" subtitle="Opening stock creates the first immutable inventory movement." action={<button type="button" className="icon-btn" onClick={() => setShowForm(false)} title="Close"><X size={17} /></button>}><form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={create}><label><span className="field-label">Product name</span><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label><span className="field-label">Brand</span><input className="field" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required /></label><label><span className="field-label">Category</span><input className="field" list="category-options" value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} required /><datalist id="category-options"><option value="Furniture" /><option value="Electronics" /></datalist></label><label><span className="field-label">Supplier</span><input className="field" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} /></label><label><span className="field-label">Purchase price</span><input className="field" type="number" min="0.01" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} required /></label><label><span className="field-label">Selling price</span><input className="field" type="number" min="0.01" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required /></label><label><span className="field-label">Opening stock</span><input className="field" type="number" min="0" value={form.opening_stock} onChange={(e) => setForm({ ...form, opening_stock: e.target.value })} /></label><label><span className="field-label">Minimum stock</span><input className="field" type="number" min="0" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} /></label><label><span className="field-label">Warranty months</span><input className="field" type="number" min="0" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} /></label><label><span className="field-label">Barcode</span><input className="field" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></label><label className="md:col-span-2"><span className="field-label">Description</span><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="flex items-center gap-3 md:col-span-2 xl:col-span-4"><button className="btn-primary" disabled={busy}><Plus size={16} /> Create product</button>{message ? <p className="text-sm text-slate-600">{message}</p> : null}</div></form></Panel> : null}
    {stockAction ? <Panel title={`Reduce stock: ${stockAction.name}`} subtitle={`Current stock: ${stockAction.current_stock}. This creates a permanent adjustment record.`} action={<button type="button" className="icon-btn" onClick={() => setStockAction(null)} title="Close"><X size={17} /></button>}><form className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end" onSubmit={reduceStock}><label><span className="field-label">Quantity to remove</span><input className="field" type="number" min="1" max={stockAction.current_stock} value={removeQuantity} onChange={(event) => setRemoveQuantity(event.target.value)} placeholder="Enter quantity" required /></label><label><span className="field-label">Reason</span><input className="field" value={removeNote} onChange={(event) => setRemoveNote(event.target.value)} placeholder="Damage, correction, showroom use..." /></label><button className="btn-primary bg-rose-700 hover:bg-rose-600" disabled={busy}><Minus size={16} /> Remove stock</button></form></Panel> : null}
    {deleteTarget ? <Panel title={`Delete stock: ${deleteTarget.name}`} subtitle="Choose whether to keep old business history or delete the product completely." action={<button type="button" className="icon-btn" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(''); }} title="Close"><X size={17} /></button>}>
      <div className="grid gap-3 lg:grid-cols-2">
        <button type="button" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50" disabled={busy} onClick={() => removeStockOnly(deleteTarget)}>
          <span className="flex items-center gap-2 text-sm font-black text-amber-900"><Minus size={16} /> Set stock to zero</span>
          <span className="mt-2 block text-xs leading-5 text-amber-800">Only removes the available stock count. The product row stays visible because old bills, revenue, and profit history are kept.</span>
        </button>
        <button type="button" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-left transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50" disabled={busy || deleteConfirmation !== 'PURGE'} onClick={() => purgeProduct(deleteTarget)}>
          <span className="flex items-center gap-2 text-sm font-black text-rose-900"><Trash2 size={16} /> Delete product completely</span>
          <span className="mt-2 block text-xs leading-5 text-rose-800">Removes the row from stock and deletes stock movements, sale lines, purchase lines, revenue, and profit generated from this product.</span>
        </button>
      </div>
      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-black text-rose-900">Type PURGE to confirm</p>
        <p className="mt-1 text-xs leading-5 text-rose-700">This action cannot be undone. It removes the product and rewrites affected invoices and purchase records.</p>
        <input className="field mt-3 border-rose-200" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="PURGE" />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Current stock: {deleteTarget.current_stock}. Complete deletion recalculates affected invoices; invoices with no remaining products are removed.</p>
    </Panel> : null}

    <Panel title="Inventory register" subtitle={`${filtered.length} of ${products.length} products`} action={<div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input className="field h-10 w-52 pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stock" /></div><select className="field h-10 w-32" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select></div>}>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Product</th><th>Stock</th><th className="text-right">Cost</th><th className="text-right">Selling</th><th className="text-right">Margin</th><th>Warranty</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((product) => { const margin = ((Number(product.selling_price) - Number(product.purchase_price)) / Number(product.selling_price)) * 100; const low = product.current_stock <= product.minimum_stock; return <tr key={product.id}><td><p className="font-bold">{product.name}</p><p className="text-xs text-slate-500">{product.brand}{product.barcode ? ` - ${product.barcode}` : ''}</p></td><td><span className={`font-black ${low ? 'text-amber-700' : 'text-slate-950'}`}>{product.current_stock}</span><span className="text-xs text-slate-400"> / min {product.minimum_stock}</span></td><td className="text-right tabular-nums">{formatCurrency(product.purchase_price)}</td><td className="text-right font-bold tabular-nums">{formatCurrency(product.selling_price)}</td><td className="text-right font-bold text-emerald-700">{Number.isFinite(margin) ? `${margin.toFixed(1)}%` : '0%'}</td><td>{product.warranty_months} mo</td><td><span className={`status-pill ${product.current_stock === 0 ? 'bg-rose-50 text-rose-700' : low ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{product.current_stock === 0 ? 'Out' : low ? 'Low' : 'In stock'}</span></td><td><div className="flex gap-1"><button type="button" className="icon-btn" disabled={product.current_stock === 0} onClick={() => { setStockAction(product); setRemoveQuantity(''); setRemoveNote(''); }} title="Reduce stock"><Minus size={15} /></button><button type="button" className="icon-btn text-rose-600" onClick={() => { setDeleteTarget(product); setStockAction(null); setDeleteConfirmation(''); }} title="Remove stock or purge all traces"><Trash2 size={15} /></button></div></td></tr>; })}</tbody></table>{!filtered.length ? <p className="py-14 text-center text-sm text-slate-500">No products match this filter.</p> : null}</div>
    </Panel>
  </div>;
};
