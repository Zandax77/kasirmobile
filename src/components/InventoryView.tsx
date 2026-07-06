import React, { useState, useEffect } from "react";
import * as db from "../db";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Tag,
  Package,
  Layers,
  CheckCircle,
  HelpCircle,
  QrCode,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InventoryViewProps {
  onNotification: (message: string, type: "success" | "error") => void;
}

export default function InventoryView({ onNotification }: InventoryViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  
  // Form fields
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [buyPrice, setBuyPrice] = useState<number | "">("");
  const [sellPrice, setSellPrice] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">("");
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState("pcs");
  const [image, setImage] = useState("");

  // Fetch Products
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await db.getProducts({
        search: search || undefined,
        category: selectedCategory || undefined,
        low_stock: filterLowStock || undefined,
      });
      setProducts(data as any);
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Categories
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
  }, [search, selectedCategory, filterLowStock]);

  // Open Add Product Modal
  const handleAddClick = () => {
    setIsEditing(false);
    setSelectedProductId(null);
    // Generate simple random SKU/barcode for mock scan if desired
    const randomSku = "899" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setSku(randomSku);
    setName("");
    setCategory(categories[0] || "Sembako");
    setIsCustomCategory(false);
    setCustomCategory("");
    setBuyPrice("");
    setSellPrice("");
    setStock("");
    setMinStock(5);
    setUnit("pcs");
    setImage("");
    setIsModalOpen(true);
  };

  // Open Edit Product Modal
  const handleEditClick = (p: Product) => {
    setIsEditing(true);
    setSelectedProductId(p.id);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setIsCustomCategory(false);
    setCustomCategory("");
    setBuyPrice(p.buy_price);
    setSellPrice(p.sell_price);
    setStock(p.stock);
    setMinStock(p.min_stock);
    setUnit(p.unit);
    setImage(p.image || "");
    setIsModalOpen(true);
  };

  // Delete Product
  const handleDeleteClick = async (id: number, prodName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus produk "${prodName}"?`)) {
      try {
        await db.deleteProduct(id);
        onNotification(`Produk "${prodName}" berhasil dihapus`, "success");
        fetchProducts();
        fetchCategories();
      } catch (err: any) {
        onNotification(err.message, "error");
      }
    }
  };

  // Reset/Seed Database
  const handleResetDatabase = async () => {
    if (confirm("Apakah Anda yakin ingin me-reset database inventaris dan transaksi ke data demo bawaan?")) {
      try {
        await db.resetDatabase();
        onNotification("Database berhasil di-reset ke data demo bawaan", "success");
        fetchProducts();
        fetchCategories();
        setSelectedCategory("");
        setFilterLowStock(false);
        setSearch("");
      } catch (err: any) {
        onNotification(err.message, "error");
      }
    }
  };

  // Save/Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = isCustomCategory ? customCategory.trim() : category;

    if (!sku.trim()) return onNotification("Kode SKU/Barcode wajib diisi", "error");
    if (!name.trim()) return onNotification("Nama produk wajib diisi", "error");
    if (!finalCategory) return onNotification("Kategori wajib dipilih atau diisi", "error");
    if (buyPrice === "" || buyPrice < 0) return onNotification("Harga beli tidak valid", "error");
    if (sellPrice === "" || sellPrice < 0) return onNotification("Harga jual tidak valid", "error");
    if (stock === "" || stock < 0) return onNotification("Stok awal tidak valid", "error");

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      category: finalCategory,
      buy_price: Number(buyPrice),
      sell_price: Number(sellPrice),
      stock: Number(stock),
      min_stock: Number(minStock),
      unit: unit.trim() || "pcs",
      image: image || null,
    };

    try {
      if (isEditing && selectedProductId) {
        await db.updateProduct(selectedProductId, payload);
      } else {
        await db.createProduct(payload);
      }

      onNotification(
        isEditing
          ? `Produk "${payload.name}" berhasil diperbarui`
          : `Produk "${payload.name}" berhasil ditambahkan`,
        "success"
      );

      setIsModalOpen(false);
      fetchProducts();
      fetchCategories();
    } catch (err: any) {
      onNotification(err.message, "error");
    }
  };

  // Helper formatting currency
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate random Barcode
  const regenerateBarcode = () => {
    const randomSku = "899" + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setSku(randomSku);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onNotification("Ukuran gambar maksimal 2MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 lg:p-6 overflow-y-auto bg-slate-950">
      {/* Top action block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-400" />
            Manajemen Inventaris
          </h1>
          <p className="text-xs text-slate-400">
            Kelola stok barang dagangan, harga beli/jual, serta pantau stok menipis secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetDatabase}
            id="btn-reset-db"
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-xl transition-all border border-amber-500/25 cursor-pointer"
            title="Reset ke data demo bawaan"
          >
            <RotateCcw className="w-4 h-4 animate-spin-hover" />
            Reset Demo
          </button>
          <button
            onClick={handleAddClick}
            id="btn-add-product"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-emerald-500 text-slate-950 shadow-lg hover:bg-emerald-400 rounded-xl transition-all shadow-emerald-500/20 cursor-pointer animate-pulse"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Filter and search card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md">
        {/* Search */}
        <div className="relative md:col-span-5">
          <Search className="absolute w-4 h-4 text-slate-500 left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk atau barcode/SKU..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-850 bg-slate-950 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-slate-100 placeholder-slate-600"
          />
        </div>

        {/* Category Filter */}
        <div className="md:col-span-4 relative">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-850 bg-slate-950 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200 appearance-none transition-all cursor-pointer"
          >
            <option value="" className="bg-slate-950 text-slate-200">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-slate-950 text-slate-200">
                {cat}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-3.5 pointer-events-none border-l border-r-0 border-t-4 border-b-0 border-slate-400 border-x-transparent w-0 h-0"></div>
        </div>

        {/* Low Stock filter toggle */}
        <div className="md:col-span-3 flex items-center justify-end">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="w-4 h-4 rounded-sm border-slate-800 text-red-500 focus:ring-red-500 cursor-pointer accent-red-500"
            />
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Stok Menipis Saja
            </span>
          </label>
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800/80 shadow-lg overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-800/80">
                <th className="py-3.5 px-4 w-[160px]">Barcode / SKU</th>
                <th className="py-3.5 px-4">Nama Produk</th>
                <th className="py-3.5 px-4 w-[120px]">Kategori</th>
                <th className="py-3.5 px-4 text-right w-[110px]">Harga Beli</th>
                <th className="py-3.5 px-4 text-right w-[110px]">Harga Jual</th>
                <th className="py-3.5 px-4 text-center w-[100px]">Stok</th>
                <th className="py-3.5 px-4 text-center w-[120px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-500">Memuat data inventaris...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-10 h-10 text-slate-600 stroke-1" />
                      <span className="text-sm font-semibold text-slate-400">Tidak ada produk ditemukan</span>
                      <span className="text-xs text-slate-500">
                        Coba bersihkan pencarian atau tambah produk baru.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock <= p.min_stock;
                  const profit = p.sell_price - p.buy_price;
                  const profitPct = p.buy_price > 0 ? Math.round((profit / p.buy_price) * 100) : 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-950/40 transition-colors ${
                        isLow ? "bg-red-500/5" : ""
                      }`}
                    >
                      {/* Barcode */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{p.sku}</span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-8 h-8 rounded-md object-cover bg-slate-900 border border-slate-800" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-100">{p.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span>Unit: {p.unit}</span>
                              <span className="text-slate-700">•</span>
                              <span className="text-emerald-400 font-semibold" title={`Laba: ${formatRupiah(profit)}`}>
                                Untung {profitPct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-medium text-[10px]">
                          <Tag className="w-2.5 h-2.5 text-slate-600" />
                          {p.category}
                        </span>
                      </td>

                      {/* Buy Price */}
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatRupiah(p.buy_price)}
                      </td>

                      {/* Sell Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatRupiah(p.sell_price)}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              isLow
                                ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {p.stock}
                          </span>
                          {isLow && (
                            <span className="text-[9px] text-red-400 font-bold mt-1 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Limit: {p.min_stock}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(p)}
                            id={`btn-edit-product-${p.id}`}
                            className="p-1.5 bg-slate-950 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors border border-slate-850 hover:border-emerald-500/30 cursor-pointer"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p.id, p.name)}
                            id={`btn-delete-product-${p.id}`}
                            className="p-1.5 bg-slate-950 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-850 hover:border-red-500/30 cursor-pointer"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-850">
                <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-400" />
                  {isEditing ? "Edit Data Barang" : "Tambah Barang Baru"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  id="btn-close-product-modal"
                  className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  <XIcon />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
                {/* SKU / Barcode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Barcode / SKU SKU (Wajib)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <QrCode className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Scan atau ketik kode barcode..."
                        required
                        className="w-full pl-9 pr-4 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={regenerateBarcode}
                      id="btn-gen-barcode"
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 rounded-xl text-[10px] font-semibold border border-slate-800 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Acak Kode SKU"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Acak Kode
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nama Barang (Wajib)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Indomie Goreng Pedas 80g"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-600"
                  />
                </div>

                {/* Category Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Kategori Barang
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={isCustomCategory}
                          onChange={(e) => setIsCustomCategory(e.target.checked)}
                          className="w-3.5 h-3.5 rounded-sm border-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                        />
                        <span className="font-semibold text-[11px] text-slate-400">Tulis Kategori Baru</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    {isCustomCategory ? (
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Kategori baru (cth: Snack)"
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-600"
                      />
                    ) : (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200 cursor-pointer"
                      >
                        {categories.length > 0 ? (
                          categories.map((c) => (
                            <option key={c} value={c} className="bg-slate-950 text-slate-200">
                              {c}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Sembako" className="bg-slate-950 text-slate-200">Sembako</option>
                            <option value="Minuman" className="bg-slate-950 text-slate-200">Minuman</option>
                            <option value="Makanan Instan" className="bg-slate-950 text-slate-200">Makanan Instan</option>
                            <option value="Kebutuhan Rumah" className="bg-slate-950 text-slate-200">Kebutuhan Rumah</option>
                            <option value="Snack" className="bg-slate-950 text-slate-200">Snack</option>
                            <option value="Lain-lain" className="bg-slate-950 text-slate-200">Lain-lain</option>
                          </>
                        )}
                        {!categories.includes("Sembako") && categories.length > 0 && (
                          <option value="Sembako" className="bg-slate-950 text-slate-200">Sembako</option>
                        )}
                      </select>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Gambar Produk
                  </label>
                  <div className="flex items-center gap-3">
                    {image && (
                      <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 shrink-0 overflow-hidden">
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 file:cursor-pointer cursor-pointer focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-500 mt-1">Format JPG/PNG maksimal 2MB.</p>
                    </div>
                  </div>
                </div>

                {/* Financial details (Prices) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Harga Beli (Modal)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 text-xs font-semibold">Rp</span>
                      <input
                        type="number"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="10000"
                        min="0"
                        required
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Harga Jual (Konsumen)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 text-xs font-semibold">Rp</span>
                      <input
                        type="number"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="12500"
                        min="0"
                        required
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit visual calculator indicator */}
                {buyPrice !== "" && sellPrice !== "" && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center text-xs">
                    <span className="text-emerald-400 font-medium">Estimasi Keuntungan Bersih:</span>
                    <span className="font-bold text-emerald-400">
                      {formatRupiah(Number(sellPrice) - Number(buyPrice))} ({Math.round(((Number(sellPrice) - Number(buyPrice)) / Number(buyPrice)) * 100) || 0}%)
                    </span>
                  </div>
                )}

                {/* Stock Management */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Stok Awal
                    </label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="100"
                      min="0"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Min. Stok (Alert)
                    </label>
                    <input
                      type="number"
                      value={minStock}
                      onChange={(e) => setMinStock(Number(e.target.value))}
                      placeholder="5"
                      min="0"
                      required
                      className="w-full px-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-amber-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Satuan Unit
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-850 rounded-xl bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-200 cursor-pointer"
                    >
                      <option value="pcs" className="bg-slate-950 text-slate-200">pcs</option>
                      <option value="kg" className="bg-slate-950 text-slate-200">kg</option>
                      <option value="botol" className="bg-slate-950 text-slate-200">botol</option>
                      <option value="pouch" className="bg-slate-950 text-slate-200">pouch</option>
                      <option value="box" className="bg-slate-950 text-slate-200">box</option>
                      <option value="pack" className="bg-slate-950 text-slate-200">pack</option>
                      <option value="dus" className="bg-slate-950 text-slate-200">dus</option>
                      <option value="sachet" className="bg-slate-950 text-slate-200">sachet</option>
                      <option value="liter" className="bg-slate-950 text-slate-200">liter</option>
                    </select>
                  </div>
                </div>

                {/* Form submit buttons */}
                <div className="flex gap-2.5 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    id="btn-cancel-product-submit"
                    className="flex-1 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-product"
                    className="flex-1 py-2.5 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 rounded-xl transition-all cursor-pointer"
                  >
                    {isEditing ? "Perbarui" : "Simpan Produk"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Minimal icons wrapper for local uses
function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
