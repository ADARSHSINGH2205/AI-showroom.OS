import type { BillDetection, Customer, DashboardSummary, Expense, Product, Purchase, PurchaseSmsBill, ReportSummary, Sale, SaleSmsBills, Supplier, User } from '../types/domain';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8010/api/v1';
const TOKEN_KEY = 'showroom_access_token';
const AUTH_EXPIRED_EVENT = 'showroom-auth-expired';

export type LoginResponse = { access_token: string; token_type: string; user: User };

export class ApiClient {
  private token = sessionStorage.getItem(TOKEN_KEY) || '';

  hasToken() { return Boolean(this.token); }
  setToken(token: string) { this.token = token; sessionStorage.setItem(TOKEN_KEY, token); localStorage.removeItem(TOKEN_KEY); }
  clearToken() { this.token = ''; sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); }
  notifyAuthExpired() { window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)); }

  async download(path: string, filename: string) {
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: this.token ? { Authorization: `Bearer ${this.token}` } : {} });
    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        this.notifyAuthExpired();
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || 'Download failed');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        this.notifyAuthExpired();
      }
      throw new Error(data.detail || 'Request failed');
    }
    return data as T;
  }

  login(username: string, password: string) { return this.request<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }); }
  me() { return this.request<User>('/auth/me'); }
  dashboard() { return this.request<DashboardSummary>('/dashboard'); }
  products() { return this.request<Product[]>('/products'); }
  createProduct(payload: unknown) { return this.request<Product>('/products', { method: 'POST', body: JSON.stringify(payload) }); }
  adjustStock(productId: number, quantity: number, note: string) { return this.request('/inventory/movements', { method: 'POST', body: JSON.stringify({ product_id: productId, movement_type: 'adjustment_out', quantity, note }) }); }
  deleteProduct(productId: number, mode: 'stock_only' | 'purge_all' = 'stock_only', confirmation?: string) {
    const params = new URLSearchParams({ mode });
    if (confirmation) params.set('confirmation', confirmation);
    return this.request(`/products/${productId}?${params}`, { method: 'DELETE' });
  }
  customers() { return this.request<Customer[]>('/customers'); }
  createCustomer(payload: unknown) { return this.request<Customer>('/customers', { method: 'POST', body: JSON.stringify(payload) }); }
  suppliers() { return this.request<Supplier[]>('/suppliers'); }
  createSupplier(payload: unknown) { return this.request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(payload) }); }
  deleteSupplier(supplierId: number, mode: 'range' | 'all', dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams({ mode, confirmation: 'DELETE' });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return this.request<{ supplier_deleted: boolean; purchases_removed: number; message: string }>(`/suppliers/${supplierId}?${params}`, { method: 'DELETE' });
  }
  expenses() { return this.request<Expense[]>('/expenses'); }
  createExpense(payload: unknown) { return this.request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(payload) }); }
  sales() { return this.request<Sale[]>('/sales'); }
  dueSales() { return this.request<Sale[]>('/sales/due'); }
  purchases() { return this.request<Purchase[]>('/purchases'); }
  duePurchases() { return this.request<Purchase[]>('/purchases/due'); }
  reports() { return this.request<ReportSummary>('/reports/summary'); }
  createSale(payload: unknown) { return this.request<Sale>('/sales', { method: 'POST', body: JSON.stringify(payload) }); }
  recordSalePayment(saleId: number, amount: string | number) { return this.request<Sale>(`/sales/${saleId}/payments`, { method: 'POST', body: JSON.stringify({ amount: String(amount) }) }); }
  createPurchase(payload: unknown) { return this.request<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(payload) }); }
  recordPurchasePayment(purchaseId: number, amount: string | number) { return this.request<Purchase>(`/purchases/${purchaseId}/payments`, { method: 'POST', body: JSON.stringify({ amount: String(amount) }) }); }
  saleSmsBills(saleId: number) { return this.request<SaleSmsBills>(`/sales/${saleId}/sms-bills`); }
  purchaseSmsBill(purchaseId: number) { return this.request<PurchaseSmsBill>(`/purchases/${purchaseId}/sms-bill`); }
  askAI(question: string) { return this.request<{ answer: string; used_live_database_context: boolean; provider: string }>('/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }); }
  detectBill(file: File, billType: string) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<BillDetection>(`/ai/bill-detect?bill_type=${billType}`, { method: 'POST', body: formData });
  }
}

export const apiClient = new ApiClient();





