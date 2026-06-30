
import { useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, FileImage, MessageSquareText, Plus, ReceiptIndianRupee, ScanLine, Send, ShoppingBag, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { BillDetection, BillType, Product, SetupMode, SmsBillMessage } from '../../types/domain';
import { formatCurrency } from '../../utils/money';
import { BillLineInput, blankBillLine, ManualItemForm } from './ManualItemForm';

type PaymentState = '' | 'full' | 'partial' | 'due';

export const BillDesk = ({ products, onSaved }: { products: Product[]; onSaved: () => void }) => {
  const [setupMode, setSetupMode] = useState<SetupMode>('ai');
  const [billType, setBillType] = useState<BillType>('selling');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [partyName, setPartyName] = useState('');
  const [phone, setPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [items, setItems] = useState<BillLineInput[]>([]);
  const [taxPercent, setTaxPercent] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentState, setPaymentState] = useState<PaymentState>('');
  const [partialPayment, setPartialPayment] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [provider, setProvider] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [shareMessages, setShareMessages] = useState<SmsBillMessage[]>([]);
  const [message, setMessage] = useState('No bill data entered.');
  const [busy, setBusy] = useState(false);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [saved, setSaved] = useState(false);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0), [items]);
  const taxableAmount = Math.max(subtotal - (billType === 'selling' ? Number(discount || 0) : 0), 0);
  const taxAmount = taxableAmount * Number(taxPercent || 0) / 100;
  const total = taxableAmount + taxAmount;
  const paidAmount = paymentState === 'full' ? total : paymentState === 'due' ? 0 : paymentState === 'partial' ? Number(partialPayment || 0) : 0;

  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview('');
  };

  const clearForm = () => {
    clearImage();
    setPartyName('');
    setPhone('');
    setInvoiceNumber('');
    setBillDate('');
    setItems([]);
    setTaxPercent('');
    setDiscount('');
    setPaymentState('');
    setPartialPayment('');
    setConfidence(null);
    setProvider('');
    setWarnings([]);
    setShareMessages([]);
    setSaved(false);
    setMessage('No bill data entered.');
  };

  const chooseMode = (mode: SetupMode) => {
    if (mode === setupMode) return;
    setSetupMode(mode);
    clearForm();
  };

  const chooseType = (type: BillType) => {
    if (type === billType) return;
    setBillType(type);
    clearForm();
  };

  const chooseFile = (selected: File | null) => {
    clearImage();
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : '');
    setSaved(false);
    setMessage(selected ? 'Image selected. Nothing is entered until Gemini scans it.' : 'No bill data entered.');
  };

  const applyDetection = (detection: BillDetection) => {
    const detectedType: BillType = detection.bill_type === 'buying' ? 'buying' : 'selling';
    setBillType(detectedType);
    setPartyName(detection.party_name || '');
    setInvoiceNumber(detection.invoice_number || '');
    setBillDate(detection.bill_date || '');
    setItems(detection.items.map((item) => ({
      product_id: item.product_id ?? null,
      name: item.name || '',
      category: item.category || '',
      brand: item.brand || '',
      quantity: item.quantity > 0 ? String(item.quantity) : '',
      unit_price: Number(item.unit_price) >= 0 ? String(item.unit_price) : '',
      selling_price: products.find((product) => product.id === item.product_id)?.selling_price ?? '',
      confidence: item.confidence,
    })));
    const detectedSubtotal = Number(detection.subtotal || 0);
    const detectedTax = Number(detection.tax || 0);
    setTaxPercent(detectedSubtotal > 0 && detectedTax > 0 ? ((detectedTax / detectedSubtotal) * 100).toFixed(2).replace(/\.?0+$/, '') : '');
    setDiscount('');
    setPaymentState('');
    setPartialPayment('');
    setConfidence(detection.confidence);
    setWarnings([
      ...detection.warnings,
      ...(detection.items.some((item) => !item.product_id) ? [detectedType === 'buying' ? 'Review new product details. Saving automatically creates or updates stock without manual matching.' : 'Match every detected selling item to existing inventory before saving.'] : []),
    ]);
    setProvider(detection.provider);
  };

  const scanBill = async () => {
    if (!file) {
      setMessage('Capture or upload a bill image first.');
      return;
    }
    setBusy(true);
    setScanSeconds(0);
    setSaved(false);
    setMessage('Gemini is reading only the uploaded bill...');
    const scanTimer = window.setInterval(() => setScanSeconds((seconds) => seconds + 1), 1000);
    try {
      const detection = await apiClient.detectBill(file, billType);
      applyDetection(detection);
      setMessage(`Gemini entered ${detection.items.length} detected product line${detection.items.length === 1 ? '' : 's'}. Review every field before saving.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI bill detection failed');
    } finally {
      window.clearInterval(scanTimer);
      setBusy(false);
    }
  };

  const updateItem = (index: number, patch: Partial<BillLineInput>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const selectProduct = (index: number, value: string) => {
    if (!value) {
      updateItem(index, { product_id: null });
      return;
    }
    const product = products.find((candidate) => candidate.id === Number(value));
    if (!product) return;
    updateItem(index, {
      product_id: product.id,
      name: product.name,
      brand: product.brand,
      unit_price: billType === 'buying' ? product.purchase_price : product.selling_price,
      confidence: undefined,
    });
  };

  const saveBill = async () => {
    if (!billDate) {
      setMessage('Enter the bill date.');
      return;
    }
    if (!partyName.trim()) {
      setMessage(`Enter the ${billType === 'buying' ? 'supplier' : 'customer'} name.`);
      return;
    }
    if (billType === 'buying' && !invoiceNumber.trim()) {
      setMessage('Enter the supplier invoice number.');
      return;
    }
    if (!items.length) {
      setMessage('Add at least one product line or scan a bill.');
      return;
    }
    if (items.some((item) => !item.name.trim() || Number(item.quantity) < 1 || Number(item.unit_price) <= 0)) {
      setMessage('Every line needs a product name, quantity, and valid bill rate.');
      return;
    }
    if (billType === 'selling' && items.some((item) => !item.product_id)) {
      setMessage('Every selling item must be matched to existing stock.');
      return;
    }
    if (billType === 'buying' && items.some((item) => !item.product_id && (!item.category.trim() || !item.brand.trim() || Number(item.selling_price) <= 0))) {
      setMessage('Every new buying item needs category, brand, and retail selling price before it can be created in stock.');
      return;
    }
    if (!paymentState) {
      setMessage('Choose paid, partial, or due before saving.');
      return;
    }
    if (paymentState === 'partial' && (paidAmount <= 0 || paidAmount >= total)) {
      setMessage('Partial payment must be greater than zero and less than the total.');
      return;
    }

    setBusy(true);
    setSaved(false);
    setShareMessages([]);
    setMessage('Saving transaction and permanent stock movement...');
    try {
      if (billType === 'selling') {
        const sale = await apiClient.createSale({
          bill_date: billDate,
          customer_name: partyName.trim(),
          customer_phone: phone.trim() || null,
          discount: String(Number(discount || 0)),
          payment_amount: String(paidAmount),
          tax: taxAmount.toFixed(2),
          items: items.map((item) => ({ product_id: Number(item.product_id), quantity: Number(item.quantity), unit_selling_price: String(item.unit_price), discount: '0' })),
        });
        const bills = await apiClient.saleSmsBills(sale.id);
        setShareMessages([bills.customer_bill, bills.owner_bill]);
      } else {
        const purchase = await apiClient.createPurchase({
          bill_date: billDate,
          supplier_name: partyName.trim(),
          supplier_phone: phone.trim() || null,
          invoice_number: invoiceNumber.trim(),
          payment_amount: String(paidAmount),
          tax: taxAmount.toFixed(2),
          items: items.map((item) => ({ product_id: item.product_id || null, name: item.name.trim(), category_name: item.category.trim() || null, brand: item.brand.trim() || null, selling_price: item.selling_price || null, quantity: Number(item.quantity), unit_cost: String(item.unit_price) })),
        });
        const bill = await apiClient.purchaseSmsBill(purchase.id);
        setShareMessages([bill.owner_bill]);
      }
      setSaved(true);
      setMessage(`${billType === 'selling' ? 'Sale' : 'Purchase'} saved. Stock, analytics, and WhatsApp bill messages are ready.`);
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save bill');
    } finally {
      setBusy(false);
    }
  };

  return <div className="grid gap-5 pb-20 lg:pb-0">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="text-xs font-bold uppercase text-cyan-700">Transaction workspace</p><h1 className="mt-1 text-2xl font-black">AI Bill Desk</h1><p className="mt-1 text-sm text-slate-500">Every field stays blank until Gemini detects it or you enter it manually.</p></div>
      <button className="btn-secondary" onClick={clearForm}><Plus size={16} /> Blank new bill</button>
    </div>

    <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="grid content-start gap-4">
        <section className="panel">
          <p className="field-label">Entry method</p>
          <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1">{(['ai', 'manual'] as SetupMode[]).map((mode) => <button key={mode} className={`flex min-h-10 items-center justify-center gap-2 rounded text-sm font-bold ${setupMode === mode ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`} onClick={() => chooseMode(mode)}>{mode === 'ai' ? <Sparkles size={15} /> : <ReceiptIndianRupee size={15} />}{mode === 'ai' ? 'AI Scan' : 'Manual'}</button>)}</div>
          <p className="field-label mt-5">Transaction</p>
          <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1">{(['selling', 'buying'] as BillType[]).map((type) => <button key={type} className={`flex min-h-10 items-center justify-center gap-2 rounded text-sm font-bold ${billType === type ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500'}`} onClick={() => chooseType(type)}>{type === 'selling' ? <ShoppingBag size={15} /> : <Upload size={15} />}{type === 'selling' ? 'Selling' : 'Buying'}</button>)}</div>
        </section>

        {setupMode === 'ai' ? <section className="panel">
          <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">{preview ? <><img src={preview} alt="Selected bill" className="h-full w-full object-contain" /><button className="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-white text-slate-700 shadow" onClick={() => chooseFile(null)} title="Remove image"><X size={15} /></button></> : <div className="px-5 text-center"><FileImage className="mx-auto text-slate-400" size={30} /><p className="mt-3 text-sm font-bold">No bill selected</p><p className="mt-1 text-xs leading-5 text-slate-500">Upload a clear photo. The form remains empty until scanning finishes.</p></div>}</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><label className="btn-secondary"><Camera size={16} /> Camera<input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></label><label className="btn-secondary"><Upload size={16} /> Upload<input className="hidden" type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></label></div>
          <button className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-600 text-sm font-black text-white hover:bg-cyan-700 disabled:opacity-50" onClick={scanBill} disabled={busy || !file}><ScanLine size={17} /> {busy ? `Reading bill... ${scanSeconds}s` : 'Scan and fill form'}</button>
          {confidence !== null ? <div className="mt-4"><div className="flex justify-between text-xs font-bold"><span>Detection confidence</span><span>{Math.round(confidence * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-cyan-600" style={{ width: `${confidence * 100}%` }} /></div><p className="mt-2 truncate text-[11px] text-slate-500">Provider: {provider}</p></div> : null}
        </section> : <section className="panel"><ReceiptIndianRupee className="text-cyan-700" /><p className="mt-4 text-sm font-bold">Blank manual form</p><p className="mt-2 text-xs leading-5 text-slate-500">Nothing is prefilled. Add a product line and enter only the bill data you have.</p></section>}

        <div className={`rounded-lg border p-4 text-sm ${saved ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : warnings.length ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600'}`}><div className="flex gap-2">{saved ? <CheckCircle2 className="shrink-0" size={18} /> : warnings.length ? <AlertTriangle className="shrink-0" size={18} /> : <ScanLine className="shrink-0" size={18} />}<div><p className="font-bold">{message}</p>{warnings.map((warning) => <p className="mt-2 text-xs leading-5" key={warning}>{warning}</p>)}</div></div></div>
        {shareMessages.length ? <section className="panel">
          <div className="flex items-center gap-2"><MessageSquareText className="text-cyan-700" size={18} /><p className="text-sm font-black">WhatsApp bills</p></div>
          <div className="mt-4 grid gap-3">{shareMessages.map((bill) => {
            const statusClass = bill.whatsapp_url ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900';
            const statusLabel = bill.whatsapp_url ? 'Ready to send free on WhatsApp' : 'Mobile number required';
            return <div key={bill.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{bill.label}</p>
                  <p className="mt-1 text-xs text-slate-500">To: {bill.recipient_name}{bill.phone ? ` (${bill.phone})` : ' (mobile number required)'}</p>
                  <div className={`mt-2 inline-flex max-w-full items-center rounded-md border px-2 py-1 text-[11px] font-bold ${statusClass}`}>
                    <span className="truncate">{statusLabel}</span>
                  </div>
                </div>
                {bill.whatsapp_url ? <a className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700" href={bill.whatsapp_url} target="_blank" rel="noreferrer"><Send size={14} /> WhatsApp</a> : <span className="inline-flex min-h-9 shrink-0 items-center rounded-md bg-slate-200 px-3 text-xs font-bold text-slate-500">No mobile</span>}
              </div>
              {bill.whatsapp_url ? <p className="mt-3 rounded border border-emerald-200 bg-white p-2 text-[11px] font-semibold leading-5 text-emerald-800">WhatsApp will open with the complete bill already typed. Press send there.</p> : null}
              <p className="mt-3 max-h-24 overflow-hidden whitespace-pre-line rounded border border-slate-200 bg-white p-2 text-[11px] leading-5 text-slate-600">{bill.message}</p>
            </div>;
          })}</div>
        </section> : null}
      </aside>

      <section className="panel min-w-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label><span className="field-label">{billType === 'buying' ? 'Supplier' : 'Customer'}</span><input className="field" value={partyName} onChange={(event) => setPartyName(event.target.value)} placeholder={`Enter ${billType === 'buying' ? 'supplier' : 'customer'} name`} /></label>
          <label><span className="field-label">{billType === 'buying' ? 'Supplier invoice' : 'Reference number'}</span><input className="field" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Enter bill number" /></label>
          <label><span className="field-label">Bill date</span><input className="field" type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} required /></label>
          <label><span className="field-label">{billType === 'buying' ? 'Supplier mobile' : 'Mobile number'}</span><input className="field" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={`Enter ${billType === 'buying' ? 'supplier' : 'customer'} mobile if available`} /></label>
        </div>

        {setupMode === 'manual' ? <ManualItemForm products={products} billType={billType} onAdd={(item) => setItems((current) => [...current, item])} /> : null}

        <div className="mt-6 table-wrap"><table className="data-table"><thead><tr><th className="min-w-72">Product details</th>{billType === 'selling' ? <th className="min-w-56">Inventory match</th> : null}<th className="text-right">Stock</th><th className="text-right">Quantity</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th><span className="sr-only">Remove</span></th></tr></thead><tbody>{items.map((item, index) => {
          const product = products.find((candidate) => candidate.id === Number(item.product_id));
          return <tr key={index}>
            <td><input className="field" value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} placeholder="Product name" /><div className={`mt-2 grid gap-2 ${billType === 'buying' ? 'grid-cols-3' : 'grid-cols-2'}`}><input className="field" value={item.brand} onChange={(event) => updateItem(index, { brand: event.target.value })} placeholder="Brand" /><input className="field" value={item.category} onChange={(event) => updateItem(index, { category: event.target.value })} placeholder="Category" />{billType === 'buying' ? <input className="field" type="number" min="0.01" step="0.01" value={item.selling_price} onChange={(event) => updateItem(index, { selling_price: event.target.value })} placeholder="Retail price" /> : null}</div>{item.confidence !== undefined ? <p className={`mt-1 text-[11px] font-bold ${item.confidence >= 0.8 ? 'text-emerald-600' : 'text-amber-600'}`}>AI detection {Math.round(item.confidence * 100)}%</p> : null}</td>
            {billType === 'selling' ? <td><select className="field" value={item.product_id ?? ''} onChange={(event) => selectProduct(index, event.target.value)}><option value="">Choose product from stock</option>{products.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} - {candidate.brand}</option>)}</select>{!item.product_id && item.name ? <p className="mt-1 text-[11px] font-bold text-amber-600">Select the stock product</p> : null}</td> : null}
            <td className="text-right font-bold">{product ? product.current_stock : ''}</td>
            <td className="text-right"><input className="field w-24 text-right" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="Qty" /></td>
            <td className="text-right"><input className="field w-32 text-right" type="number" min="0.01" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, { unit_price: event.target.value })} placeholder="Rate" /></td>
            <td className="whitespace-nowrap text-right font-black">{item.quantity && item.unit_price ? formatCurrency(Number(item.unit_price) * Number(item.quantity)) : ''}</td>
            <td><button className="icon-btn border-0 text-rose-600" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Remove line"><Trash2 size={16} /></button></td>
          </tr>;
        })}</tbody></table>{items.length === 0 ? <div className="grid min-h-44 place-items-center p-6 text-center"><div><ReceiptIndianRupee className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-bold">No product lines</p><p className="mt-1 text-xs text-slate-500">{setupMode === 'ai' ? 'Scan a bill to fill detected products, or add a blank line.' : 'Add a blank line when you are ready to enter a product.'}</p></div></div> : null}</div>
        {setupMode === 'ai' ? <button className="btn-secondary mt-3" onClick={() => setItems((current) => [...current, blankBillLine()])}><Plus size={16} /> Add blank product line</button> : null}

        <div className="mt-6 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div><p className="field-label">Payment status</p><div className="flex w-fit rounded-md bg-slate-100 p-1">{(['full', 'partial', 'due'] as const).map((state) => <button key={state} className={`rounded px-4 py-2 text-xs font-bold capitalize ${paymentState === state ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`} onClick={() => setPaymentState(state)}>{state === 'full' ? 'Paid' : state}</button>)}</div>{paymentState === 'partial' ? <label className="mt-4 block max-w-xs"><span className="field-label">Amount received</span><input className="field" type="number" min="0" max={total} value={partialPayment} onChange={(event) => setPartialPayment(event.target.value)} placeholder="Enter received amount" /></label> : null}<p className="mt-4 text-xs text-slate-500">No payment option is selected automatically.</p></div>
          <div className="rounded-lg bg-slate-950 p-5 text-white"><div className="grid gap-3 text-sm"><div className="flex justify-between text-slate-300"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>{billType === 'selling' ? <label className="flex items-center justify-between gap-4 text-slate-300"><span>Discount</span><input className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-white" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="Enter amount" /></label> : null}<label className="flex items-center justify-between gap-4 text-slate-300"><span>Tax %</span><input className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-white" type="number" min="0" step="0.01" value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)} placeholder="Enter percent" /></label><div className="flex justify-between text-xs text-slate-400"><span>Tax amount</span><span>{formatCurrency(taxAmount)}</span></div><div className="my-1 h-px bg-slate-700" /><div className="flex items-end justify-between"><span className="font-bold">Grand total</span><span className="text-2xl font-black">{formatCurrency(total)}</span></div><div className="flex justify-between text-xs text-slate-400"><span>Payment now</span><span>{paymentState ? formatCurrency(paidAmount) : 'Not selected'}</span></div></div><button className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-50" onClick={saveBill} disabled={busy}>{busy ? 'Saving...' : `Save ${billType === 'selling' ? 'sale' : 'purchase'}`}<CheckCircle2 size={17} /></button></div>
        </div>
      </section>
    </div>
  </div>;
};






