import express from "express";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "umkm_kasir.db");

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Initialize SQLite Database
  console.log(`Connecting to SQLite database at ${DB_PATH}...`);
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.run("PRAGMA foreign_keys = ON;");

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      stock INTEGER NOT NULL,
      min_stock INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'pcs',
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      final_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      cash_received REAL DEFAULT 0,
      cash_change REAL DEFAULT 0,
      profit REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Insert seed data if database is empty
  const countSettings = await db.get("SELECT COUNT(*) as count FROM settings");
  if (countSettings.count === 0) {
    await db.run("INSERT INTO settings (key, value) VALUES ('store_name', 'Toko Kasir UMKM')");
    await db.run("INSERT INTO settings (key, value) VALUES ('store_address', 'Jl. Pembangunan Wirausaha No. 88')");
    await db.run("INSERT INTO settings (key, value) VALUES ('store_phone', '0812-3456-7890')");
  }

  const count = await db.get("SELECT COUNT(*) as count FROM products");
  if (count.count === 0) {
    console.log("Database empty. Seeding sample products...");
    const sampleProducts = [
      { sku: "8992345671011", name: "Beras Pandan Wangi premium 1kg", category: "Sembako", buy_price: 13500, sell_price: 16000, stock: 50, min_stock: 10, unit: "kg" },
      { sku: "8992345671022", name: "Minyak Goreng Filma 2 Liter", category: "Sembako", buy_price: 32000, sell_price: 36500, stock: 24, min_stock: 5, unit: "pouch" },
      { sku: "8999999043213", name: "Indomie Goreng Spesial 85g", category: "Makanan Instan", buy_price: 2600, sell_price: 3500, stock: 120, min_stock: 20, unit: "pcs" },
      { sku: "8992345671044", name: "Gula Pasir Gulaku Putih 1kg", category: "Sembako", buy_price: 14500, sell_price: 17000, stock: 40, min_stock: 8, unit: "kg" },
      { sku: "8998009010214", name: "Teh Botol Sosro Sosro 450ml", category: "Minuman", buy_price: 3800, sell_price: 5000, stock: 60, min_stock: 12, unit: "botol" },
      { sku: "8992345671066", name: "Kopi Kapal Api Special 165g", category: "Minuman", buy_price: 12000, sell_price: 14500, stock: 15, min_stock: 4, unit: "pcs" },
      { sku: "8991001120012", name: "Susu UHT Ultra Milk Cokelat 1L", category: "Minuman", buy_price: 15500, sell_price: 19000, stock: 18, min_stock: 5, unit: "kotak" },
      { sku: "8992345671088", name: "Sabun Cuci Piring Mama Lemon 780ml", category: "Kebutuhan Rumah", buy_price: 11000, sell_price: 13500, stock: 3, min_stock: 6, unit: "pouch" }, // low stock
      { sku: "8992345671099", name: "Pepsodent Pencegah Gigi Berlubang 190g", category: "Kebutuhan Rumah", buy_price: 9500, sell_price: 12000, stock: 2, min_stock: 5, unit: "pcs" }, // low stock
      { sku: "8993005110125", name: "Kecap Manis Bango Botol 275ml", category: "Sembako", buy_price: 18000, sell_price: 21500, stock: 12, min_stock: 4, unit: "botol" },
    ];

    for (const p of sampleProducts) {
      await db.run(
        "INSERT INTO products (sku, name, category, buy_price, sell_price, stock, min_stock, unit, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)",
        [p.sku, p.name, p.category, p.buy_price, p.sell_price, p.stock, p.min_stock, p.unit]
      );
    }

    // Seed some mock past transactions for reports dashboard
    console.log("Seeding mock transactions...");
    const today = new Date();
    
    // Helper to format date relative to today
    const getDateOffsetString = (offsetDays: number, hour: number) => {
      const d = new Date(today);
      d.setDate(today.getDate() - offsetDays);
      d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      return d.toISOString().replace('T', ' ').substring(0, 19);
    };

    const mockTransactions = [
      // 2 days ago
      { invoice: "TRX-20260629-001", discount: 0, tax: 0, final: 23000, method: "Tunai", cash_received: 50000, cash_change: 27000, profit: 4500, date: getDateOffsetString(2, 10), items: [
        { product_id: 3, name: "Indomie Goreng Spesial 85g", sku: "8999999043213", qty: 2, buy: 2600, sell: 3500, sub: 7000 },
        { product_id: 1, name: "Beras Pandan Wangi premium 1kg", sku: "8992345671011", qty: 1, buy: 13500, sell: 16000, sub: 16000 }
      ]},
      { invoice: "TRX-20260629-002", discount: 5000, tax: 0, final: 53000, method: "QRIS", cash_received: 53000, cash_change: 0, profit: 8400, date: getDateOffsetString(2, 14), items: [
        { product_id: 2, name: "Minyak Goreng Filma 2 Liter", sku: "8992345671022", qty: 1, buy: 32000, sell: 36500, sub: 36500 },
        { product_id: 7, name: "Susu UHT Ultra Milk Cokelat 1L", sku: "8991001120012", qty: 1, buy: 15500, sell: 19000, sub: 19000 },
        { product_id: 5, name: "Teh Botol Sosro Sosro 450ml", sku: "8998009010214", qty: 1, buy: 3800, sell: 5000, sub: 5000 }
      ]},
      // 1 day ago
      { invoice: "TRX-20260630-001", discount: 0, tax: 0, final: 121000, method: "Transfer Bank", cash_received: 121000, cash_change: 0, profit: 21500, date: getDateOffsetString(1, 11), items: [
        { product_id: 2, name: "Minyak Goreng Filma 2 Liter", sku: "8992345671022", qty: 2, buy: 32000, sell: 36500, sub: 73000 },
        { product_id: 4, name: "Gula Pasir Gulaku Putih 1kg", sku: "8992345671044", qty: 2, buy: 14500, sell: 17000, sub: 34000 },
        { product_id: 6, name: "Kopi Kapal Api Special 165g", sku: "8992345671066", qty: 1, buy: 12000, sell: 14500, sub: 14500 }
      ]},
      { invoice: "TRX-20260630-002", discount: 2000, tax: 1500, final: 23500, method: "Tunai", cash_received: 30000, cash_change: 6500, profit: 4600, date: getDateOffsetString(1, 17), items: [
        { product_id: 3, name: "Indomie Goreng Spesial 85g", sku: "8999999043213", qty: 4, buy: 2600, sell: 3500, sub: 14000 },
        { product_id: 8, name: "Sabun Cuci Piring Mama Lemon 780ml", sku: "8992345671088", qty: 1, buy: 11000, sell: 13500, sub: 13500 }
      ]},
      // Today transactions
      { invoice: "TRX-20260701-001", discount: 0, tax: 2000, final: 40000, method: "QRIS", cash_received: 40000, cash_change: 0, profit: 7000, date: getDateOffsetString(0, 9), items: [
        { product_id: 7, name: "Susu UHT Ultra Milk Cokelat 1L", sku: "8991001120012", qty: 2, buy: 15500, sell: 19000, sub: 38000 }
      ]},
      { invoice: "TRX-20260701-002", discount: 0, tax: 0, final: 31000, method: "Tunai", cash_received: 50000, cash_change: 19000, profit: 5400, date: getDateOffsetString(0, 13), items: [
        { product_id: 5, name: "Teh Botol Sosro Sosro 450ml", sku: "8998009010214", qty: 2, buy: 3800, sell: 5000, sub: 10000 },
        { product_id: 10, name: "Kecap Manis Bango Botol 275ml", sku: "8993005110125", qty: 1, buy: 18000, sell: 21500, sub: 21500 }
      ]},
    ];

    for (const tx of mockTransactions) {
      const result = await db.run(
        "INSERT INTO transactions (invoice_number, total_amount, discount, tax, final_amount, payment_method, cash_received, cash_change, profit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [tx.invoice, tx.final - tx.tax + tx.discount, tx.discount, tx.tax, tx.final, tx.method, tx.cash_received, tx.cash_change, tx.profit, tx.date]
      );
      const txId = result.lastID;

      for (const item of tx.items) {
        await db.run(
          "INSERT INTO transaction_items (transaction_id, product_id, product_name, sku, quantity, buy_price, sell_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [txId, item.product_id, item.name, item.sku, item.qty, item.buy, item.sell, item.sub]
        );
        // Reduce stock in products
        await db.run(
          "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
          [item.qty, item.product_id]
        );
      }
    }
  }

  // ==========================================
  // API ROUTES - SETTINGS
  // ==========================================
  app.get("/api/settings", async (req, res) => {
    try {
      const rows = await db.all("SELECT * FROM settings");
      const settings = rows.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {} as any);
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settings = req.body;
      for (const key of Object.keys(settings)) {
        const val = settings[key];
        await db.run(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
          [key, val]
        );
      }
      res.json({ message: "Settings updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. REST API Endpoints

  // GET Products
  app.get("/api/products", async (req, res) => {
    try {
      const { search, category, low_stock } = req.query;
      let query = "SELECT * FROM products WHERE 1=1";
      const params: any[] = [];

      if (search) {
        query += " AND (name LIKE ? OR sku LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category) {
        query += " AND category = ?";
        params.push(category);
      }

      if (low_stock === "true") {
        query += " AND stock <= min_stock";
      }

      query += " ORDER BY name ASC";
      const products = await db.all(query, params);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Product Categories
  app.get("/api/products/categories", async (req, res) => {
    try {
      const categories = await db.all("SELECT DISTINCT category FROM products WHERE category != '' ORDER BY category ASC");
      res.json(categories.map((c) => c.category));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Single Product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await db.get("SELECT * FROM products WHERE id = ?", [req.params.id]);
      if (!product) {
        return res.status(404).json({ error: "Produk tidak ditemukan" });
      }
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { sku, name, category, buy_price, sell_price, stock, min_stock, unit, image } = req.body;

      if (!sku || !name || !category || buy_price === undefined || sell_price === undefined || stock === undefined) {
        return res.status(400).json({ error: "Kolom sku, nama, kategori, harga beli, harga jual, dan stok wajib diisi" });
      }

      // Check if SKU exists
      const existing = await db.get("SELECT id FROM products WHERE sku = ?", [sku]);
      if (existing) {
        return res.status(400).json({ error: `Kode SKU/Barcode "${sku}" sudah terdaftar` });
      }

      const result = await db.run(
        "INSERT INTO products (sku, name, category, buy_price, sell_price, stock, min_stock, unit, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [sku, name, category, buy_price, sell_price, stock, min_stock || 5, unit || "pcs", image || null]
      );

      const newProduct = await db.get("SELECT * FROM products WHERE id = ?", [result.lastID]);
      res.status(201).json(newProduct);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT Update Product
  app.put("/api/products/:id", async (req, res) => {
    try {
      const { sku, name, category, buy_price, sell_price, stock, min_stock, unit, image } = req.body;

      if (!sku || !name || !category || buy_price === undefined || sell_price === undefined || stock === undefined) {
        return res.status(400).json({ error: "Kolom sku, nama, kategori, harga beli, harga jual, dan stok wajib diisi" });
      }

      // Check SKU duplication for other product
      const existing = await db.get("SELECT id FROM products WHERE sku = ? AND id != ?", [sku, req.params.id]);
      if (existing) {
        return res.status(400).json({ error: `Kode SKU/Barcode "${sku}" sudah digunakan oleh produk lain` });
      }

      await db.run(
        "UPDATE products SET sku = ?, name = ?, category = ?, buy_price = ?, sell_price = ?, stock = ?, min_stock = ?, unit = ?, image = ? WHERE id = ?",
        [sku, name, category, buy_price, sell_price, stock, min_stock, unit, image || null, req.params.id]
      );

      const updatedProduct = await db.get("SELECT * FROM products WHERE id = ?", [req.params.id]);
      res.json(updatedProduct);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE Product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      // Check if product exists
      const existing = await db.get("SELECT id FROM products WHERE id = ?", [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: "Produk tidak ditemukan" });
      }

      await db.run("DELETE FROM products WHERE id = ?", [req.params.id]);
      res.json({ message: "Produk berhasil dihapus" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST Transaction (New Sale)
  app.post("/api/transactions", async (req, res) => {
    try {
      const { items, discount, tax, payment_method, cash_received, cash_change } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Keranjang belanja tidak boleh kosong" });
      }

      if (!payment_method) {
        return res.status(400).json({ error: "Metode pembayaran wajib dipilih" });
      }

      // Generate invoice number: TRX-YYYYMMDD-HHMMSS-RAND
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const invoiceNumber = `TRX-${dateStr}-${timeStr}-${Math.floor(100 + Math.random() * 900)}`;

      // Calculate totals and profit
      let calculatedTotal = 0;
      let calculatedProfit = 0;

      // Validate items and check stock first
      const itemsToInsert = [];
      for (const item of items) {
        const product = await db.get("SELECT * FROM products WHERE id = ?", [item.id]);
        if (!product) {
          return res.status(400).json({ error: `Produk "${item.name}" tidak ditemukan di database` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Stok "${product.name}" tidak mencukupi (Tersedia: ${product.stock} ${product.unit})` });
        }
        const itemSubtotal = product.sell_price * item.quantity;
        const itemProfit = (product.sell_price - product.buy_price) * item.quantity;

        calculatedTotal += itemSubtotal;
        calculatedProfit += itemProfit;

        itemsToInsert.push({
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity: item.quantity,
          buy_price: product.buy_price,
          sell_price: product.sell_price,
          subtotal: itemSubtotal,
        });
      }

      const disc = discount || 0;
      const txTax = tax || 0;
      const finalAmount = calculatedTotal - disc + txTax;

      // Adjust profit: subtract discount (it reduces revenue directly) and add tax if appropriate (usually tax is neutral, but we track simple gross profit = revenue_with_discount_deducted - product_cost)
      // Net Profit = (Final sales revenue - tax if included) - buy cost.
      // Let's do simple: Net Profit = (Total Sell Price - discount) - Total Buy Price
      const totalBuyPrice = itemsToInsert.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
      const finalProfit = Math.max(0, (calculatedTotal - disc) - totalBuyPrice);

      // Save Transaction
      const result = await db.run(
        "INSERT INTO transactions (invoice_number, total_amount, discount, tax, final_amount, payment_method, cash_received, cash_change, profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [invoiceNumber, calculatedTotal, disc, txTax, finalAmount, payment_method, cash_received || 0, cash_change || 0, finalProfit]
      );
      const transactionId = result.lastID;

      // Insert Transaction Items and Update Stock
      for (const item of itemsToInsert) {
        await db.run(
          "INSERT INTO transaction_items (transaction_id, product_id, product_name, sku, quantity, buy_price, sell_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [transactionId, item.product_id, item.product_name, item.sku, item.quantity, item.buy_price, item.sell_price, item.subtotal]
        );

        // Update product stock
        await db.run(
          "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
          [item.quantity, item.product_id]
        );
      }

      const savedTransaction = await db.get("SELECT * FROM transactions WHERE id = ?", [transactionId]);
      const savedItems = await db.all("SELECT * FROM transaction_items WHERE transaction_id = ?", [transactionId]);

      res.status(201).json({
        transaction: savedTransaction,
        items: savedItems,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Transactions History
  app.get("/api/transactions", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      let query = "SELECT * FROM transactions WHERE 1=1";
      const params: any[] = [];

      if (start_date) {
        query += " AND date(created_at) >= date(?)";
        params.push(start_date);
      }
      if (end_date) {
        query += " AND date(created_at) <= date(?)";
        params.push(end_date);
      }

      query += " ORDER BY created_at DESC";
      const transactions = await db.all(query, params);

      // Fetch items for each transaction
      const fullTransactions = [];
      for (const tx of transactions) {
        const items = await db.all("SELECT * FROM transaction_items WHERE transaction_id = ?", [tx.id]);
        fullTransactions.push({
          ...tx,
          items,
        });
      }

      res.json(fullTransactions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Detailed Sales Reports / Metrics
  app.get("/api/reports/summary", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      // Default to today if no date specified
      const dateFilterStr = start_date ? "date(created_at) >= date(?)" : "date(created_at) = date('now', 'localtime')";
      const dateFilterEndStr = end_date ? " AND date(created_at) <= date(?)" : "";
      
      const params: any[] = [];
      if (start_date) params.push(start_date);
      if (end_date) params.push(end_date);

      const whereClause = `WHERE ${dateFilterStr}${dateFilterEndStr}`;

      // Get summary stats
      const summary = await db.get(`
        SELECT 
          COALESCE(SUM(final_amount), 0) as total_sales,
          COALESCE(SUM(profit), 0) as total_profit,
          COUNT(*) as transaction_count,
          COALESCE(AVG(final_amount), 0) as average_transaction
        FROM transactions
        ${whereClause}
      `, params);

      // Get count of total items sold
      const itemsSold = await db.get(`
        SELECT COALESCE(SUM(quantity), 0) as total_items_sold
        FROM transaction_items
        WHERE transaction_id IN (SELECT id FROM transactions ${whereClause})
      `, params);

      // Get hourly distribution of sales (for charting today's sales)
      const hourlySales = await db.all(`
        SELECT 
          strftime('%H:00', created_at) as hour,
          SUM(final_amount) as sales,
          SUM(profit) as profit,
          COUNT(*) as transactions
        FROM transactions
        ${whereClause}
        GROUP BY hour
        ORDER BY hour ASC
      `, params);

      // Get daily distribution of sales (for longer period)
      const dailySales = await db.all(`
        SELECT 
          date(created_at) as date,
          SUM(final_amount) as sales,
          SUM(profit) as profit,
          COUNT(*) as transactions
        FROM transactions
        ${whereClause}
        GROUP BY date
        ORDER BY date ASC
      `, params);

      // Get low stock alert count
      const lowStockAlerts = await db.get(`
        SELECT COUNT(*) as count FROM products WHERE stock <= min_stock
      `);

      res.json({
        total_sales: summary.total_sales,
        total_profit: summary.total_profit,
        transaction_count: summary.transaction_count,
        average_transaction: summary.average_transaction,
        total_items_sold: itemsSold.total_items_sold,
        hourly_sales: hourlySales,
        daily_sales: dailySallesFix(dailySales),
        low_stock_count: lowStockAlerts.count,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to ensure daily sales chart is properly formatted
  function dailySallesFix(dailySales: any[]) {
    return dailySales;
  }

  // GET Top Selling Products
  app.get("/api/reports/top-products", async (req, res) => {
    try {
      const { start_date, end_date } = req.query;
      let dateFilter = "";
      const params: any[] = [];

      if (start_date) {
        dateFilter += " AND date(t.created_at) >= date(?)";
        params.push(start_date);
      }
      if (end_date) {
        dateFilter += " AND date(t.created_at) <= date(?)";
        params.push(end_date);
      }

      const topProducts = await db.all(`
        SELECT 
          ti.product_name as name,
          ti.sku,
          SUM(ti.quantity) as quantity_sold,
          SUM(ti.subtotal) as total_revenue,
          SUM((ti.sell_price - ti.buy_price) * ti.quantity) as total_profit
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE 1=1 ${dateFilter}
        GROUP BY ti.product_id
        ORDER BY quantity_sold DESC
        LIMIT 5
      `, params);

      res.json(topProducts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST Reset/Seed Database
  app.post("/api/reset", async (req, res) => {
    try {
      console.log("Resetting database...");
      await db.exec("DROP TABLE IF EXISTS transaction_items;");
      await db.exec("DROP TABLE IF EXISTS transactions;");
      await db.exec("DROP TABLE IF EXISTS products;");
      
      // Re-run standard creation schema
      await db.exec(`
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          buy_price REAL NOT NULL,
          sell_price REAL NOT NULL,
          stock INTEGER NOT NULL,
          min_stock INTEGER NOT NULL DEFAULT 5,
          unit TEXT NOT NULL DEFAULT 'pcs',
          image TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT UNIQUE NOT NULL,
          total_amount REAL NOT NULL,
          discount REAL NOT NULL DEFAULT 0,
          tax REAL NOT NULL DEFAULT 0,
          final_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          cash_received REAL DEFAULT 0,
          cash_change REAL DEFAULT 0,
          profit REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE transaction_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          sku TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          buy_price REAL NOT NULL,
          sell_price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
        );

        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      await db.run("INSERT INTO settings (key, value) VALUES ('store_name', 'Toko Kasir UMKM')");
      await db.run("INSERT INTO settings (key, value) VALUES ('store_address', 'Jl. Pembangunan Wirausaha No. 88')");
      await db.run("INSERT INTO settings (key, value) VALUES ('store_phone', '0812-3456-7890')");

      // Seed fresh products
      const sampleProducts = [
        { sku: "8992345671011", name: "Beras Pandan Wangi premium 1kg", category: "Sembako", buy_price: 13500, sell_price: 16000, stock: 50, min_stock: 10, unit: "kg" },
        { sku: "8992345671022", name: "Minyak Goreng Filma 2 Liter", category: "Sembako", buy_price: 32000, sell_price: 36500, stock: 24, min_stock: 5, unit: "pouch" },
        { sku: "8999999043213", name: "Indomie Goreng Spesial 85g", category: "Makanan Instan", buy_price: 2600, sell_price: 3500, stock: 120, min_stock: 20, unit: "pcs" },
        { sku: "8992345671044", name: "Gula Pasir Gulaku Putih 1kg", category: "Sembako", buy_price: 14500, sell_price: 17000, stock: 40, min_stock: 8, unit: "kg" },
        { sku: "8998009010214", name: "Teh Botol Sosro Sosro 450ml", category: "Minuman", buy_price: 3800, sell_price: 5000, stock: 60, min_stock: 12, unit: "botol" },
        { sku: "8992345671066", name: "Kopi Kapal Api Special 165g", category: "Minuman", buy_price: 12000, sell_price: 14500, stock: 15, min_stock: 4, unit: "pcs" },
        { sku: "8991001120012", name: "Susu UHT Ultra Milk Cokelat 1L", category: "Minuman", buy_price: 15500, sell_price: 19000, stock: 18, min_stock: 5, unit: "kotak" },
        { sku: "8992345671088", name: "Sabun Cuci Piring Mama Lemon 780ml", category: "Kebutuhan Rumah", buy_price: 11000, sell_price: 13500, stock: 3, min_stock: 6, unit: "pouch" },
        { sku: "8992345671099", name: "Pepsodent Pencegah Gigi Berlubang 190g", category: "Kebutuhan Rumah", buy_price: 9500, sell_price: 12000, stock: 2, min_stock: 5, unit: "pcs" },
        { sku: "8993005110125", name: "Kecap Manis Bango Botol 275ml", category: "Sembako", buy_price: 18000, sell_price: 21500, stock: 12, min_stock: 4, unit: "botol" },
      ];

      for (const p of sampleProducts) {
        await db.run(
          "INSERT INTO products (sku, name, category, buy_price, sell_price, stock, min_stock, unit, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)",
          [p.sku, p.name, p.category, p.buy_price, p.sell_price, p.stock, p.min_stock, p.unit]
        );
      }

      res.json({ message: "Database berhasil di-reset ke data bawaan." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // 3. Serve Vite Assets in production / dev fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
