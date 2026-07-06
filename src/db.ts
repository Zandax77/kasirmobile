/**
 * db.ts — Pengganti backend Express+SQLite menggunakan IndexedDB
 * Semua operasi CRUD produk, transaksi, dan pengaturan dijalankan di sisi klien.
 */

const DB_NAME = "kasir_umkm_db";
const DB_VERSION = 1;

export interface Product {
  id?: number;
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

export interface Transaction {
  id?: number;
  invoice_number: string;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  payment_method: string;
  cash_received: number;
  cash_change: number;
  profit: number;
  created_at?: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id?: number;
  transaction_id?: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  buy_price: number;
  sell_price: number;
  subtotal: number;
  unit?: string;
}

export interface Setting {
  key: string;
  value: string;
}

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("products")) {
        const ps = db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
        ps.createIndex("sku", "sku", { unique: true });
        ps.createIndex("category", "category", { unique: false });
      }
      if (!db.objectStoreNames.contains("transactions")) {
        const ts = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
        ts.createIndex("invoice_number", "invoice_number", { unique: true });
        ts.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains("transaction_items")) {
        const ti = db.createObjectStore("transaction_items", { keyPath: "id", autoIncrement: true });
        ti.createIndex("transaction_id", "transaction_id", { unique: false });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => {
      dbInstance = (e.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function tx(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode = "readonly") {
  return db.transaction(stores, mode);
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function getOne<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function put<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function add<T>(store: IDBObjectStore, value: T): Promise<IDBValidKey> {
  return new Promise((resolve, reject) => {
    const req = store.add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function del(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function clearStore(store: IDBObjectStore): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── SEED DATA ──────────────────────────────────────────────────────────────

const sampleProducts: Product[] = [
  { sku: "8992345671011", name: "Beras Pandan Wangi premium 1kg", category: "Sembako", buy_price: 13500, sell_price: 16000, stock: 50, min_stock: 10, unit: "kg" },
  { sku: "8992345671022", name: "Minyak Goreng Filma 2 Liter", category: "Sembako", buy_price: 32000, sell_price: 36500, stock: 24, min_stock: 5, unit: "pouch" },
  { sku: "8999999043213", name: "Indomie Goreng Spesial 85g", category: "Makanan Instan", buy_price: 2600, sell_price: 3500, stock: 120, min_stock: 20, unit: "pcs" },
  { sku: "8992345671044", name: "Gula Pasir Gulaku Putih 1kg", category: "Sembako", buy_price: 14500, sell_price: 17000, stock: 40, min_stock: 8, unit: "kg" },
  { sku: "8998009010214", name: "Teh Botol Sosro 450ml", category: "Minuman", buy_price: 3800, sell_price: 5000, stock: 60, min_stock: 12, unit: "botol" },
  { sku: "8992345671066", name: "Kopi Kapal Api Special 165g", category: "Minuman", buy_price: 12000, sell_price: 14500, stock: 15, min_stock: 4, unit: "pcs" },
  { sku: "8991001120012", name: "Susu UHT Ultra Milk Cokelat 1L", category: "Minuman", buy_price: 15500, sell_price: 19000, stock: 18, min_stock: 5, unit: "kotak" },
  { sku: "8992345671088", name: "Sabun Cuci Piring Mama Lemon 780ml", category: "Kebutuhan Rumah", buy_price: 11000, sell_price: 13500, stock: 3, min_stock: 6, unit: "pouch" },
  { sku: "8992345671099", name: "Pepsodent 190g", category: "Kebutuhan Rumah", buy_price: 9500, sell_price: 12000, stock: 2, min_stock: 5, unit: "pcs" },
  { sku: "8993005110125", name: "Kecap Manis Bango 275ml", category: "Sembako", buy_price: 18000, sell_price: 21500, stock: 12, min_stock: 4, unit: "botol" },
];

async function seedData(db: IDBDatabase): Promise<void> {
  const t = tx(db, ["products", "settings"], "readwrite");
  const productStore = t.objectStore("products");
  const settingStore = t.objectStore("settings");

  const existing = await getAll<Product>(productStore);
  if (existing.length === 0) {
    for (const p of sampleProducts) {
      await add(productStore, { ...p, created_at: new Date().toISOString() });
    }
  }

  // seed default settings if none exist
  const settingsExisting = await getAll<Setting>(settingStore);
  if (settingsExisting.length === 0) {
    await put<Setting>(settingStore, { key: "store_name", value: "Toko Kasir UMKM" });
    await put<Setting>(settingStore, { key: "store_address", value: "Jl. Pembangunan Wirausaha No. 88" });
    await put<Setting>(settingStore, { key: "store_phone", value: "0812-3456-7890" });
  }

  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ── PUBLIC API ─────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  const db = await openDB();
  await seedData(db);
}

// Products
export async function getProducts(opts?: { search?: string; category?: string; low_stock?: boolean }): Promise<Product[]> {
  const db = await openDB();
  let products = await getAll<Product>(tx(db, "products").objectStore("products"));
  if (opts?.category) products = products.filter(p => p.category === opts.category);
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.includes(q));
  }
  if (opts?.low_stock) products = products.filter(p => p.stock <= p.min_stock);
  return products;
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await openDB();
  return getOne<Product>(tx(db, "products").objectStore("products"), id);
}

export async function getProductBySkuForCart(sku: string): Promise<Product | undefined> {
  const db = await openDB();
  const products = await getAll<Product>(tx(db, "products").objectStore("products"));
  return products.find(p => p.sku === sku);
}

export async function createProduct(data: Omit<Product, "id" | "created_at">): Promise<Product> {
  const db = await openDB();
  const products = await getAll<Product>(tx(db, "products").objectStore("products"));
  const skuExists = products.find(p => p.sku === data.sku);
  if (skuExists) throw new Error(`Produk dengan SKU "${data.sku}" sudah ada`);
  const t = tx(db, "products", "readwrite");
  const newId = await add<Product>(t.objectStore("products"), { ...data, created_at: new Date().toISOString() });
  return { ...data, id: newId as number, created_at: new Date().toISOString() };
}

export async function updateProduct(id: number, data: Omit<Product, "id" | "created_at">): Promise<Product> {
  const db = await openDB();
  const existing = await getProductById(id);
  if (!existing) throw new Error("Produk tidak ditemukan");
  const updated = { ...existing, ...data };
  const t = tx(db, "products", "readwrite");
  await put<Product>(t.objectStore("products"), updated);
  return updated;
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await openDB();
  const t = tx(db, "products", "readwrite");
  await del(t.objectStore("products"), id);
}

export async function getCategories(): Promise<string[]> {
  const products = await getProducts();
  const cats = [...new Set(products.map(p => p.category))];
  return cats.sort();
}

// Transactions
export async function createTransaction(data: {
  cart: Array<{ product_id: number; product_name: string; sku: string; quantity: number; buy_price: number; sell_price: number; unit?: string }>;
  discount: number;
  tax: number;
  payment_method: string;
  cash_received: number;
}): Promise<Transaction> {
  const db = await openDB();
  const total = data.cart.reduce((sum, i) => sum + i.sell_price * i.quantity, 0);
  const totalBuy = data.cart.reduce((sum, i) => sum + i.buy_price * i.quantity, 0);
  const finalAmount = total - data.discount + (total * data.tax / 100);
  const profit = total - totalBuy - data.discount;
  const invoiceNumber = `INV-${Date.now()}`;

  const txn: Transaction = {
    invoice_number: invoiceNumber,
    total_amount: total,
    discount: data.discount,
    tax: data.tax,
    final_amount: finalAmount,
    payment_method: data.payment_method,
    cash_received: data.cash_received,
    cash_change: data.cash_received - finalAmount,
    profit,
    created_at: new Date().toISOString(),
  };

  const t = tx(db, ["transactions", "transaction_items", "products"], "readwrite");
  const tStore = t.objectStore("transactions");
  const tiStore = t.objectStore("transaction_items");
  const pStore = t.objectStore("products");

  const txnId = await add<Transaction>(tStore, txn);

  const items: TransactionItem[] = [];
  for (const item of data.cart) {
    const ti: TransactionItem = {
      transaction_id: txnId as number,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      buy_price: item.buy_price,
      sell_price: item.sell_price,
      subtotal: item.sell_price * item.quantity,
      unit: item.unit,
    };
    await add<TransactionItem>(tiStore, ti);
    items.push(ti);

    // Decrement stock
    const prod = await getOne<Product>(pStore, item.product_id);
    if (prod) {
      await put<Product>(pStore, { ...prod, stock: prod.stock - item.quantity });
    }
  }

  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve({ ...txn, id: txnId as number, items });
    t.onerror = () => reject(t.error);
  });
}

export async function getTransactions(): Promise<Transaction[]> {
  const db = await openDB();
  const txns = await getAll<Transaction>(tx(db, "transactions").objectStore("transactions"));
  return txns.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
}

export async function getTransactionById(id: number): Promise<Transaction | undefined> {
  const db = await openDB();
  const txn = await getOne<Transaction>(tx(db, "transactions").objectStore("transactions"), id);
  if (!txn) return undefined;
  const allItems = await getAll<TransactionItem>(tx(db, "transaction_items").objectStore("transaction_items"));
  txn.items = allItems.filter(i => i.transaction_id === id);
  return txn;
}

// Reports
export async function getReportSummary(period: string = "today"): Promise<any> {
  const db = await openDB();
  const txns = await getAll<Transaction>(tx(db, "transactions").objectStore("transactions"));
  const products = await getAll<Product>(tx(db, "products").objectStore("products"));
  const allItems = await getAll<TransactionItem>(tx(db, "transaction_items").objectStore("transaction_items"));

  const now = new Date();
  const filtered = txns.filter(t => {
    const d = new Date(t.created_at!);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const total_sales = filtered.reduce((s, t) => s + t.final_amount, 0);
  const total_profit = filtered.reduce((s, t) => s + t.profit, 0);
  const transaction_count = filtered.length;
  const average_transaction = transaction_count > 0 ? total_sales / transaction_count : 0;
  const total_items_sold = allItems.filter(i => filtered.find(t => t.id === i.transaction_id)).reduce((s, i) => s + i.quantity, 0);
  const low_stock_count = products.filter(p => p.stock <= p.min_stock).length;

  // Hourly
  const hourlyMap: Record<string, { sales: number; profit: number; transactions: number }> = {};
  for (const t of filtered) {
    const h = new Date(t.created_at!).getHours().toString().padStart(2, "0") + ":00";
    if (!hourlyMap[h]) hourlyMap[h] = { sales: 0, profit: 0, transactions: 0 };
    hourlyMap[h].sales += t.final_amount;
    hourlyMap[h].profit += t.profit;
    hourlyMap[h].transactions += 1;
  }
  const hourly_sales = Object.entries(hourlyMap).map(([hour, v]) => ({ hour, ...v })).sort((a, b) => a.hour.localeCompare(b.hour));

  // Daily
  const dailyMap: Record<string, { sales: number; profit: number; transactions: number }> = {};
  for (const t of txns) {
    const d = new Date(t.created_at!).toISOString().slice(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { sales: 0, profit: 0, transactions: 0 };
    dailyMap[d].sales += t.final_amount;
    dailyMap[d].profit += t.profit;
    dailyMap[d].transactions += 1;
  }
  const daily_sales = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  return {
    total_sales,
    total_profit,
    transaction_count,
    average_transaction,
    total_items_sold,
    low_stock_count,
    hourly_sales,
    daily_sales,
  };
}

export async function getTopProducts(): Promise<any[]> {
  const db = await openDB();
  const txns = await getAll<Transaction>(tx(db, "transactions").objectStore("transactions"));
  const allItems = await getAll<TransactionItem>(tx(db, "transaction_items").objectStore("transaction_items"));

  const map: Record<string, { name: string; sku: string; quantity_sold: number; total_revenue: number; total_profit: number }> = {};
  for (const item of allItems) {
    const k = item.sku;
    if (!map[k]) map[k] = { name: item.product_name, sku: item.sku, quantity_sold: 0, total_revenue: 0, total_profit: 0 };
    map[k].quantity_sold += item.quantity;
    map[k].total_revenue += item.subtotal;
    map[k].total_profit += (item.sell_price - item.buy_price) * item.quantity;
  }
  return Object.values(map).sort((a, b) => b.quantity_sold - a.quantity_sold).slice(0, 10);
}

// Settings
export async function getSettings(): Promise<Record<string, string>> {
  const db = await openDB();
  const rows = await getAll<Setting>(tx(db, "settings").objectStore("settings"));
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function saveSettings(data: Record<string, string>): Promise<void> {
  const db = await openDB();
  const t = tx(db, "settings", "readwrite");
  const store = t.objectStore("settings");
  for (const [key, value] of Object.entries(data)) {
    await put<Setting>(store, { key, value });
  }
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// Reset
export async function resetDatabase(): Promise<void> {
  const db = await openDB();
  const t = tx(db, ["products", "transactions", "transaction_items", "settings"], "readwrite");
  await clearStore(t.objectStore("transactions"));
  await clearStore(t.objectStore("transaction_items"));
  await clearStore(t.objectStore("products"));
  await clearStore(t.objectStore("settings"));

  await new Promise<void>((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });

  await seedData(db);
}
