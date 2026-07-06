export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image?: string;
  created_at?: string;
}

export interface CartItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  stock: number; // current available stock
  unit: string;
  image?: string;
  quantity: number;
}

export interface Transaction {
  id: number;
  invoice_number: string;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  cash_received: number;
  cash_change: number;
  profit: number;
  created_at: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: number;
  transaction_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  subtotal: number;
  unit?: string;
}

export interface HourlySalesItem {
  hour: string;
  sales: number;
  profit: number;
  transactions: number;
}

export interface DailySalesItem {
  date: string;
  sales: number;
  profit: number;
  transactions: number;
}

export interface ReportSummary {
  total_sales: number;
  total_profit: number;
  transaction_count: number;
  average_transaction: number;
  total_items_sold: number;
  hourly_sales: HourlySalesItem[];
  daily_sales: DailySalesItem[];
  low_stock_count: number;
}

export interface TopProductItem {
  name: string;
  sku: string;
  quantity_sold: number;
  total_revenue: number;
  total_profit: number;
}

export interface StoreSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
}
