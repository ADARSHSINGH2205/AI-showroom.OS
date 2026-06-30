export type User = {
  id: number;
  username: string;
  role: 'owner' | 'salesman';
};

export type Product = {
  id: number;
  category_id: number;
  supplier_id: number | null;
  brand: string;
  name: string;
  description: string | null;
  purchase_price: string;
  selling_price: string;
  warranty_months: number;
  image_url: string | null;
  barcode: string | null;
  current_stock: number;
  minimum_stock: number;
  status: 'in_stock' | 'reserved' | 'sold_gone_from_store';
};

export type TrendPoint = { date: string; label: string; sales: string; profit: string; orders: number };
export type MonthlyDistributionPoint = { month: string; label: string; sales: string; profit: string; orders: number };
export type DashboardSummary = {
  today_sales: string;
  today_profit: string;
  monthly_sales: string;
  monthly_profit: string;
  monthly_expenses: string;
  gross_margin_percentage: string;
  average_order_value: string;
  low_stock: number;
  dead_stock: number;
  total_skus: number;
  total_stock_units: number;
  total_customers: number;
  pending_payments: string;
  blocked_inventory_value: string;
  top_selling_products: Array<{ name: string; sold_quantity: number }>;
  recent_sales: Array<{ id: number; invoice_number: string; customer_name: string; total: string; profit: string; payment_status: string; bill_date: string; created_at: string }>;
  sales_trend: TrendPoint[];
  monthly_distribution: MonthlyDistributionPoint[];
  category_performance: Array<{ category: string; revenue: string; profit: string; units: number }>;
  expense_breakdown: Array<{ category: string; amount: string }>;
  stock_risk: Array<{ id: number; name: string; brand: string; current_stock: number; minimum_stock: number; reorder_quantity: number }>;
  business_health_summary: string;
};

export type Customer = { id: number; name: string; phone: string | null; address: string | null; total_spending: string };
export type Supplier = { id: number; name: string; phone: string | null; address: string | null; outstanding_amount: string };
export type Expense = { id: number; category: ExpenseCategory; amount: string; expense_date: string; note: string | null };
export type ExpenseCategory = 'rent' | 'electricity' | 'salary' | 'transport' | 'miscellaneous';
export type Sale = { id: number; invoice_number: string; bill_date: string; customer_name: string; customer_phone: string | null; subtotal: string; discount: string; tax: string; total: string; payment_amount: string; payment_status: string; profit_amount: string; created_at: string };
export type Purchase = { id: number; invoice_number: string; bill_date: string; supplier_name: string; supplier_phone: string | null; subtotal: string; tax: string; total: string; payment_amount: string; created_at: string };
export type SmsBillMessage = {
  label: string;
  recipient_name: string;
  phone: string | null;
  message: string;
  sms_url: string | null;
  whatsapp_url: string | null;
  sent: boolean;
  sms_provider: string;
  provider_message_id: string | null;
  send_error: string | null;
};
export type SaleSmsBills = { customer_bill: SmsBillMessage; owner_bill: SmsBillMessage };
export type PurchaseSmsBill = { owner_bill: SmsBillMessage };
export type ReportSummary = {
  daily: { sales: string; profit: string };
  monthly: { sales: string; profit: string };
  inventory: { blocked_value: string; low_stock: number; dead_stock: number };
  exports: { pdf: string; excel: string };
};

export type BillType = 'buying' | 'selling';
export type SetupMode = 'ai' | 'manual';
export type BillItem = { product_id?: number | null; name: string; category: string; brand: string; quantity: number; unit_price: string; confidence?: number };
export type BillDetection = { bill_type: string; party_name: string; invoice_number: string; bill_date: string | null; confidence: number; subtotal: string; tax: string; total: string; warnings: string[]; items: BillItem[]; provider: string };
export type AppView = 'dashboard' | 'billing' | 'inventory' | 'dues' | 'customers' | 'suppliers' | 'expenses' | 'reports' | 'assistant';




