import { FormEvent, useState } from 'react';
import { Plus } from 'lucide-react';
import type { BillType, Product } from '../../types/domain';

export type BillLineInput = {
  product_id: number | null;
  name: string;
  category: string;
  brand: string;
  quantity: string;
  unit_price: string;
  selling_price: string;
  confidence?: number;
};

export const blankBillLine = (): BillLineInput => ({ product_id: null, name: '', category: '', brand: '', quantity: '', unit_price: '', selling_price: '' });

export const ManualItemForm = ({ products, billType, onAdd }: { products: Product[]; billType: BillType; onAdd: (item: BillLineInput) => void }) => {
  const [item, setItem] = useState<BillLineInput>(blankBillLine());
  const [message, setMessage] = useState('');

  const selectSellingProduct = (value: string) => {
    if (!value) { setItem(blankBillLine()); return; }
    const product = products.find((candidate) => candidate.id === Number(value));
    if (!product) return;
    setItem({ product_id: product.id, name: product.name, category: '', brand: product.brand, quantity: '', unit_price: product.selling_price, selling_price: product.selling_price });
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!item.name.trim() || Number(item.quantity) < 1 || Number(item.unit_price) <= 0) { setMessage('Enter product name, quantity, and rate.'); return; }
    if (billType === 'selling' && !item.product_id) { setMessage('Choose the existing stock product being sold.'); return; }
    if (billType === 'buying' && (!item.category.trim() || !item.brand.trim() || Number(item.selling_price) <= 0)) { setMessage('Enter category, brand, and retail selling price for the purchased item.'); return; }
    onAdd(item); setItem(blankBillLine()); setMessage('Item added. The entry form is blank for the next item.');
  };

  return <form className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50/40 p-4" onSubmit={add}>
    <div className="mb-4"><h3 className="text-sm font-black text-slate-950">Enter one {billType === 'buying' ? 'purchased' : 'selling'} item</h3><p className="mt-1 text-xs text-slate-500">Complete the fields, then add it to the bill. The next item starts blank.</p></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {billType === 'selling' ? <label><span className="field-label">Product from stock</span><select className="field" value={item.product_id ?? ''} onChange={(event) => selectSellingProduct(event.target.value)}><option value="">Choose product being sold</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} - {product.brand} ({product.current_stock})</option>)}</select></label> : null}
      <label><span className="field-label">Product name</span><input className="field" value={item.name} onChange={(event) => setItem({ ...item, name: event.target.value })} placeholder="Enter product name" /></label>
      <label><span className="field-label">Brand</span><input className="field" value={item.brand} onChange={(event) => setItem({ ...item, brand: event.target.value })} placeholder="Enter brand" /></label>
      <label><span className="field-label">Category</span><input className="field" value={item.category} onChange={(event) => setItem({ ...item, category: event.target.value })} placeholder="Furniture or Electronics" /></label>
      <label><span className="field-label">Quantity</span><input className="field" type="number" min="1" value={item.quantity} onChange={(event) => setItem({ ...item, quantity: event.target.value })} placeholder="Enter quantity" /></label>
      <label><span className="field-label">{billType === 'buying' ? 'Purchase rate' : 'Selling rate'}</span><input className="field" type="number" min="0.01" step="0.01" value={item.unit_price} onChange={(event) => setItem({ ...item, unit_price: event.target.value })} placeholder="Enter bill rate" /></label>
      {billType === 'buying' ? <label><span className="field-label">Retail selling price</span><input className="field" type="number" min="0.01" step="0.01" value={item.selling_price} onChange={(event) => setItem({ ...item, selling_price: event.target.value })} placeholder="Enter showroom price" /></label> : null}
      <div className="flex items-end"><button className="btn-primary w-full" type="submit"><Plus size={16} /> Add item to bill</button></div>
    </div>
    {billType === 'buying' ? <p className="mt-3 text-xs text-slate-500">No inventory matching is required. Saving automatically updates the same name/brand or creates a new stock product.</p> : null}
    {message ? <p className="mt-3 text-xs font-bold text-slate-600">{message}</p> : null}
  </form>;
};
