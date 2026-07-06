import React, { useState, useEffect, useRef } from "react";
import { Product, CartItem, Transaction, StoreSettings } from "../types";
import * as db from "../db";
import {
  Search,
  ShoppingCart,
  QrCode,
  Tag,
  Plus,
  Minus,
  Trash2,
  Percent,
  Receipt,
  X,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Camera,
  AlertCircle,
  Sparkles,
  Package,
} from "lucide-react";
import ThermalReceipt from "./ThermalReceipt";
import { motion, AnimatePresence } from "motion/react";

interface CashierViewProps {
  onNotification: (message: string, type: "success" | "error") => void;
  storeSettings?: StoreSettings | null;
}

export default function CashierView({ onNotification, storeSettings }: CashierViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"nominal" | "percent">("nominal");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxEnabled, setTaxEnabled] = useState(false);

  // Checkout Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"Tunai" | "QRIS" | "Transfer Bank">("Tunai");
  const [cashReceived, setCashReceived] = useState<number | "">("");
  
  // Post-Checkout Success Screen State
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);

  // Mock scan overlay
  const [isScanning, setIsScanning] = useState(false);

  // Fetch products and categories
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await db.getProducts();
      setProducts(data as any);
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await db.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products locally for search & categories
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.includes(search);
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Add Item to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      onNotification(`Stok untuk "${product.name}" habis!`, "error");
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          onNotification(`Mencapai limit stok produk (${product.stock} ${product.unit} tersedia)`, "error");
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          buy_price: product.buy_price,
          sell_price: product.sell_price,
          stock: product.stock,
          unit: product.unit,
          quantity: 1,
        },
      ];
    });
  };

  // Adjust quantity in cart
  const updateQuantity = (id: number, amount: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + amount;
            if (nextQty > item.stock) {
              onNotification(`Mencapai limit stok produk (${item.stock} ${item.unit} tersedia)`, "error");
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Remove item from cart
  const removeFromCart = (id: number, name: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    onNotification(`"${name}" dihapus dari keranjang`, "success");
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.sell_price * item.quantity, 0);
  const discountAmount =
    discountType === "percent" ? (subtotal * discountValue) / 100 : discountValue;
  const taxAmount = taxEnabled ? (subtotal - discountAmount) * 0.11 : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

  // Cash change calculation
  const cashChange =
    paymentMethod === "Tunai" && typeof cashReceived === "number"
      ? Math.max(0, cashReceived - totalAmount)
      : 0;

  // Quick cash buttons
  const quickCashOptions = [
    subtotal,
    5000,
    10000,
    20000,
    50000,
    100000,
    200000,
  ].map((val) => Math.ceil(val / 1000) * 1000); // round to nearest thousand

  // Remove duplicates and filter less than totalAmount
  const uniqueQuickCash = Array.from(new Set([totalAmount, ...quickCashOptions]))
    .filter((val) => val >= totalAmount)
    .slice(0, 5);

  // Virtual Barcode Scan trigger
  const handleVirtualScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      if (products.length === 0) return;
      // Select a random product to scan
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      addToCart(randomProduct);
      onNotification(`Berhasil scan barcode SKU: ${randomProduct.sku} (${randomProduct.name})`, "success");
    }, 1200);
  };

  // Submit checkout transaction to server
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "Tunai" && (cashReceived === "" || cashReceived < totalAmount)) {
      onNotification("Jumlah uang tunai yang diterima kurang!", "error");
      return;
    }

    const cartPayload = cart.map((c) => ({
      product_id: c.id!,
      product_name: c.name,
      sku: c.sku,
      quantity: c.quantity,
      buy_price: c.buy_price,
      sell_price: c.sell_price,
      unit: c.unit,
    }));

    try {
      const txn = await db.createTransaction({
        cart: cartPayload,
        discount: discountAmount,
        tax: taxAmount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === "Tunai" ? Number(cashReceived) : totalAmount,
      });

      setSavedTransaction(txn as any);
      fetchProducts();
      setCheckoutSuccess(true);
      onNotification("Transaksi berhasil disimpan!", "success");
    } catch (err: any) {
      onNotification(err.message, "error");
    }
  };

  // Reset core states after checkout is finished
  const handleCheckoutClose = () => {
    setCart([]);
    setDiscountValue(0);
    setTaxEnabled(false);
    setCashReceived("");
    setPaymentMethod("Tunai");
    setIsCheckoutOpen(false);
    setCheckoutSuccess(false);
    setSavedTransaction(null);
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
      {/* LEFT BLOCK: PRODUCT SEARCH, CATEGORY, GRID */}
      <div className="flex flex-col flex-1 p-4 lg:p-6 gap-4 min-w-0 bg-slate-950">
        {/* Header Block with quick status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Mesin Kasir POS
            </h1>
            <p className="text-xs text-slate-400">
              Pilih barang dari daftar atau scan barcode SKU produk untuk langsung memasukkannya ke keranjang.
            </p>
          </div>
          <button
            onClick={fetchProducts}
            id="btn-refresh-products"
            className="p-1.5 bg-slate-900 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 shadow-md transition-all hover:rotate-180 duration-500 cursor-pointer"
            title="Muat ulang data produk"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar and mock scanner */}
        <div className="flex gap-2">
          {/* Barcode / Name Input search */}
          <div className="relative flex-1">
            <Search className="absolute w-4.5 h-4.5 text-slate-500 left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama barang atau scan kode barcode..."
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-800 bg-slate-900 rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Virtual Barcode Scanner */}
          <button
            onClick={handleVirtualScan}
            id="btn-virtual-scanner"
            className="flex items-center gap-1.5 px-4 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-2xl font-bold text-xs border border-emerald-500/20 transition-all shadow-md shrink-0 cursor-pointer"
            title="Simulasi Scan Barcode"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Simulasi Barcode</span>
          </button>
        </div>

        {/* Categories Tab selector */}
        <div className="flex flex-wrap gap-1.5 pb-1 max-w-full shrink-0">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-4 py-2 text-xs font-bold rounded-2xl border transition-all shrink-0 cursor-pointer ${
              selectedCategory === ""
                ? "bg-emerald-500 border-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-2xl border transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-500 border-emerald-500 text-slate-950 shadow-md"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid display */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 text-xs">Menghubungkan ke SQLite...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center gap-2">
              <AlertCircle className="w-10 h-10 stroke-1 text-slate-600" />
              <span className="text-sm font-semibold text-slate-400">Produk tidak tersedia</span>
              <span className="text-xs text-slate-500">
                {search
                  ? "Coba ganti kata kunci pencarian Anda"
                  : "Tambahkan produk baru terlebih dahulu di menu Inventaris"}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= p.min_stock;
                
                return (
                  <motion.div
                    key={p.id}
                    whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`bg-slate-900 rounded-2xl p-4 border shadow-md flex flex-col justify-between cursor-pointer select-none relative overflow-hidden transition-all duration-200 group ${
                      isOutOfStock
                        ? "opacity-50 bg-slate-950/40 border-slate-950 cursor-not-allowed"
                        : "border-slate-800 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5"
                    }`}
                  >
                    {/* Corner badge for low stock/out of stock */}
                    {isOutOfStock && (
                      <span className="absolute top-3 right-3 bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase z-10">
                        Habis
                      </span>
                    )}
                    {isLowStock && (
                      <span className="absolute top-3 right-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase z-10">
                        Tipis
                      </span>
                    )}

                    {p.image ? (
                      <div className="w-full h-24 mb-2 -mt-1 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div className="w-full h-24 mb-2 -mt-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-700" />
                      </div>
                    )}

                    <div className="space-y-1 text-left">
                      <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wide">
                        {p.category}
                      </span>
                      <h3 className="font-bold text-slate-100 text-xs leading-snug truncate group-hover:text-emerald-400 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-500 truncate">
                        {p.sku}
                      </p>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div className="text-left">
                        <p className="text-[9px] text-slate-500">Harga Jual</p>
                        <p className="font-mono font-bold text-xs text-emerald-400">
                          {formatRupiah(p.sell_price)}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${
                          isOutOfStock
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : isLowStock
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        Stok: {p.stock}
                      </span>
                    </div>

                    {/* Quick Add overlay button effect */}
                    {!isOutOfStock && (
                      <div className="absolute bottom-3 right-3 p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg shadow-emerald-500/20">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT BLOCK: BASKET / SHOPPING CART SIDEBAR */}
      <div className="w-full lg:w-[380px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 shadow-2xl flex flex-col h-[500px] lg:h-full shrink-0">
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm text-white">Keranjang Belanja</span>
          </div>
          <span className="text-[11px] font-bold bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Item
          </span>
        </div>

        {/* Cart Items list scrollable */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-4 space-y-1">
          {cart.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 py-10 gap-2">
              <ShoppingCart className="w-12 h-12 stroke-1" />
              <p className="text-xs font-semibold text-slate-500">Keranjang masih kosong</p>
              <p className="text-[10px] text-slate-500 text-center px-6">
                Klik produk di sebelah kiri atau scan untuk memasukkan belanjaan.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="py-2.5 flex justify-between items-center gap-2">
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="font-bold text-xs text-slate-200 truncate leading-tight">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono font-semibold text-emerald-400">
                      {formatRupiah(item.sell_price)}
                    </span>
                    <span className="text-[10px] text-slate-500">/ {item.unit}</span>
                  </div>
                </div>

                {/* Adjust item quantity controller */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors border border-slate-800 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-xs text-slate-200">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors border border-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id, item.name)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                  title="Hapus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculations Summary Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          {/* Subtotal, Discount & Tax toggles */}
          <div className="space-y-2 text-xs text-slate-400">
            {/* Subtotal */}
            <div className="flex justify-between font-medium">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-slate-300">{formatRupiah(subtotal)}</span>
            </div>

            {/* Discount Form block */}
            <div className="space-y-1.5 pt-1.5 border-t border-dashed border-slate-800">
              <div className="flex justify-between items-center">
                <span className="font-semibold flex items-center gap-1 text-slate-300">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Diskon
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("nominal");
                      setDiscountValue(0);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      discountType === "nominal" ? "bg-emerald-500 text-slate-950" : "bg-slate-850 text-slate-400 border border-slate-800"
                    }`}
                  >
                    Nominal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("percent");
                      setDiscountValue(0);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      discountType === "percent" ? "bg-emerald-500 text-slate-950" : "bg-slate-850 text-slate-400 border border-slate-800"
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <input
                type="number"
                value={discountValue || ""}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === "percent" ? "Diskon % (misal: 10)" : "Nominal Diskon Rupiah"}
                className="w-full px-2.5 py-1 text-xs border border-slate-800 rounded-lg bg-slate-900 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                min="0"
              />
            </div>

            {/* Tax 11% Toggle switch */}
            <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-800">
              <span className="font-semibold text-slate-300">PPN Pajak (11%)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-slate-950 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-900 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* TOTAL INVOICE BILL */}
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-850">
            <span className="font-extrabold text-sm text-slate-200">TOTAL BILL</span>
            <span className="text-lg font-black font-mono text-emerald-400 tracking-tight">
              {formatRupiah(totalAmount)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                if (confirm("Kosongkan keranjang belanja?")) setCart([]);
              }}
              disabled={cart.length === 0}
              className="px-3.5 py-2.5 border border-slate-850 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all disabled:opacity-50 disabled:bg-slate-900 disabled:text-slate-700 disabled:cursor-not-allowed cursor-pointer"
              title="Bersihkan Keranjang"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              id="btn-checkout-cart"
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* SCANNING LOADING FLASH OVERLAY */}
      <AnimatePresence>
        {isScanning && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-4 text-white"
            >
              <div className="relative w-24 h-24 flex items-center justify-center border-4 border-emerald-500/50 rounded-2xl animate-pulse">
                {/* Simulated laser scan bar animation */}
                <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-md shadow-red-500 top-1/2 -translate-y-1/2 animate-bounce"></div>
                <QrCode className="w-12 h-12 text-emerald-400" />
              </div>
              <span className="font-bold text-sm tracking-wide">Membaca Barcode SKU...</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHECKOUT PAYMENT DIALOG MODAL */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-850">
                <span className="font-bold text-slate-100 text-base">Metode Pembayaran Kasir</span>
                {!checkoutSuccess && (
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    id="btn-close-checkout-modal"
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Success checkout step */}
              {checkoutSuccess ? (
                <div className="p-6 flex flex-col items-center text-center space-y-4 bg-slate-900">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>
                  <div className="space-y-1">
                    <h3 className="font-black text-lg text-slate-100">Transaksi Berhasil!</h3>
                    <p className="text-xs text-slate-400">
                      Invoice telah berhasil disimpan ke database SQLite.
                    </p>
                  </div>

                  {/* Embedding thermal receipt mockup */}
                  {savedTransaction && (
                    <div className="w-full max-h-[45vh] overflow-y-auto border border-slate-800 rounded-2xl p-1 bg-slate-950/40">
                      <ThermalReceipt
                        transaction={savedTransaction}
                        onClose={handleCheckoutClose}
                        showActions={false}
                        storeSettings={storeSettings}
                      />
                    </div>
                  )}

                  {/* Print / Done actions */}
                  <div className="flex w-full gap-2 pt-2">
                    <button
                      onClick={() => window.print()}
                      id="btn-print-receipt-final"
                      className="flex-1 py-2.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Cetak Struk
                    </button>
                    <button
                      onClick={handleCheckoutClose}
                      id="btn-done-checkout"
                      className="flex-1 py-2.5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ) : (
                /* Payment form checkout step */
                <div className="p-6 space-y-5 bg-slate-900">
                  {/* Total to pay bill indicator */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex justify-between items-center">
                    <span className="font-semibold text-xs opacity-90">Total Harus Dibayar:</span>
                    <span className="font-black text-lg font-mono">{formatRupiah(totalAmount)}</span>
                  </div>

                  {/* Payment Method selectors tabs */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Tunai", "QRIS", "Transfer Bank"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method);
                            setCashReceived("");
                          }}
                          className={`py-2 px-1 text-[11px] font-bold rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            paymentMethod === method
                              ? "bg-emerald-500 border-emerald-500 text-slate-950 shadow-md"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span>{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional inputs depending on method selection */}
                  {paymentMethod === "Tunai" ? (
                    <div className="space-y-3">
                      {/* Cash Input */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Uang Diterima (Cash)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-2.5 text-slate-500 text-xs font-bold">Rp</span>
                          <input
                            type="number"
                            value={cashReceived}
                            onChange={(e) =>
                              setCashReceived(e.target.value === "" ? "" : Number(e.target.value))
                            }
                            placeholder="Ketik nominal..."
                            required
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-800 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Fast selection cash options buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueQuickCash.map((cash) => (
                          <button
                            key={cash}
                            type="button"
                            onClick={() => setCashReceived(cash)}
                            className="px-2.5 py-1.5 bg-slate-950 hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400 rounded-lg text-[10px] font-bold border border-slate-800 transition-colors font-mono cursor-pointer"
                          >
                            {formatRupiah(cash).replace(",00", "")}
                          </button>
                        ))}
                      </div>

                      {/* Cash change preview card */}
                      {typeof cashReceived === "number" && (
                        <div
                          className={`p-3 rounded-xl border flex justify-between items-center text-xs transition-colors ${
                            cashReceived >= totalAmount
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold"
                              : "bg-red-500/10 border-red-500/20 text-red-400 font-semibold"
                          }`}
                        >
                          <span>{cashReceived >= totalAmount ? "Kembalian:" : "Uang Kurang:"}</span>
                          <span className="font-mono text-sm">
                            {cashReceived >= totalAmount
                              ? formatRupiah(cashChange)
                              : formatRupiah(totalAmount - cashReceived)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : paymentMethod === "QRIS" ? (
                    /* Mock authentic Indonesian QRIS scan code */
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center text-center space-y-3">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-lg flex flex-col items-center">
                        <span className="text-[10px] font-black tracking-widest text-blue-400 border-b-2 border-blue-400 pb-0.5 px-4 mb-2">
                          QRIS
                        </span>
                        {/* A nice mock QR pattern using CSS/SVG */}
                        <div className="w-32 h-32 bg-slate-950 p-2 flex items-center justify-center rounded-sm">
                          {/* Inner clean matrix box */}
                          <div className="w-full h-full bg-white grid grid-cols-5 grid-rows-5 gap-1.5 p-1 relative">
                            {/* Standard QR squares corners */}
                            <div className="bg-black w-4 h-4 col-start-1 row-start-1"></div>
                            <div className="bg-black w-4 h-4 col-start-5 row-start-1"></div>
                            <div className="bg-black w-4 h-4 col-start-1 row-start-5"></div>
                            {/* Scattered random dots for realistic QR look */}
                            <div className="bg-black w-3 h-3 col-start-3 row-start-2"></div>
                            <div className="bg-black w-3.5 h-3 col-start-2 row-start-4"></div>
                            <div className="bg-black w-3 h-3 col-start-4 row-start-3"></div>
                            <div className="bg-black w-2.5 h-2 col-start-4 row-start-5"></div>
                            <div className="bg-black w-2 h-2 col-start-3 row-start-5"></div>
                            {/* Small centered logo mock */}
                            <div className="absolute inset-0 m-auto w-5 h-5 bg-white border border-slate-200 rounded-xs flex items-center justify-center font-bold text-[8px] text-emerald-600">
                              K
                            </div>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold text-slate-500 tracking-wide uppercase mt-2">
                          NMID: ID1020304050607
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal px-4">
                        Tunjukkan kode QRIS di atas kepada pembeli. Sistem akan otomatis memproses pembayaran setelah
                        berhasil di-scan.
                      </p>
                    </div>
                  ) : (
                    /* Mock Bank transfer */
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-2 text-xs">
                      <p className="font-bold text-slate-300">Rekening Transfer Toko:</p>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">Bank:</span>
                          <span className="text-slate-200">BCA (Bank Central Asia)</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">No. Rekening:</span>
                          <span className="text-slate-200 font-mono">8720-1920-19</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-500">Atas Nama:</span>
                          <span className="text-slate-200">TOKO KASIR UMKM</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 italic">
                        Harap lakukan verifikasi bukti transfer manual sebelum mengonfirmasi transaksi ini.
                      </p>
                    </div>
                  )}

                  {/* Confirm actions buttons */}
                  <div className="flex gap-2.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckoutSubmit}
                      disabled={
                        paymentMethod === "Tunai" && (cashReceived === "" || cashReceived < totalAmount)
                      }
                      className="flex-1 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none shadow-lg shadow-emerald-500/25 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Konfirmasi Bayar
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
