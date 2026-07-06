import React, { useState, useEffect } from "react";
import { ReportSummary, TopProductItem, Transaction } from "../types";
import * as db from "../db";
import {
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Layers,
  Award,
  Clock,
  Printer,
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ThermalReceipt from "./ThermalReceipt";
import { motion, AnimatePresence } from "motion/react";

interface ReportsViewProps {
  onNotification: (message: string, type: "success" | "error") => void;
}

export default function ReportsView({ onNotification }: ReportsViewProps) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date filters
  const [preset, setPreset] = useState<"today" | "yesterday" | "7days" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Transaction Detail Modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Helper date generators
  const getTodayDateStr = () => {
    return new Date().toISOString().substring(0, 10);
  };

  const getYesterdayDateStr = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().substring(0, 10);
  };

  const getOffsetDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().substring(0, 10);
  };

  // Adjust dates based on preset
  useEffect(() => {
    const todayStr = getTodayDateStr();
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const yesStr = getYesterdayDateStr();
      setStartDate(yesStr);
      setEndDate(yesStr);
    } else if (preset === "7days") {
      setStartDate(getOffsetDateStr(7));
      setEndDate(todayStr);
    }
  }, [preset]);

  // Fetch reports data
  const fetchReportsData = async () => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    try {
      // Determine period from preset
      let period: string;
      if (preset === "today") period = "today";
      else if (preset === "yesterday") period = "yesterday";
      else if (preset === "7days") period = "week";
      else period = "all";

      const [summaryData, topData, txData] = await Promise.all([
        db.getReportSummary(period),
        db.getTopProducts(),
        db.getTransactions(),
      ]);

      // Filter transactions by date range client-side
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const filteredTx = txData.filter(t => {
        const d = new Date(t.created_at!);
        return d >= start && d <= end;
      });

      setSummary(summaryData);
      setTopProducts(topData);
      setTransactions(filteredTx as any);
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [startDate, endDate]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Pre-process chart data
  const getChartData = () => {
    if (!summary) return [];
    
    // If it's a multi-day filter, use daily_sales, else use hourly_sales
    const isSingleDay = startDate === endDate;
    if (isSingleDay) {
      // Format hourly sales for nice display
      return summary.hourly_sales.map((h) => ({
        label: h.hour,
        Penjualan: h.sales,
        Keuntungan: h.profit,
      }));
    } else {
      // Format daily sales
      return summary.daily_sales.map((d) => ({
        label: formatDate(d.date),
        Penjualan: d.sales,
        Keuntungan: d.profit,
      }));
    }
  };

  const handleTxRowClick = (tx: Transaction) => {
    setSelectedTx(tx);
    setIsReceiptOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 lg:p-6 overflow-y-auto bg-slate-950">
      {/* Header and Filter Control */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Laporan Penjualan & Dashboard Bisnis
          </h1>
          <p className="text-xs text-slate-400">
            Pantau arus kas, laba bersih, volume transaksi, serta kinerja barang terjual secara berkala.
          </p>
        </div>

        {/* Date presets selection tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800/80 p-1 rounded-xl self-start lg:self-auto">
          <button
            onClick={() => setPreset("today")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              preset === "today"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setPreset("yesterday")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              preset === "yesterday"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Kemarin
          </button>
          <button
            onClick={() => setPreset("7days")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              preset === "7days"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setPreset("custom")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              preset === "custom"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Pilih Tanggal
          </button>
        </div>
      </div>

      {/* Date inputs (only visible when 'custom' is active or for fine-grained adjustments) */}
      {preset === "custom" && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl animate-fade-in"
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Mulai</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-850 bg-slate-950 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Selesai</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-850 bg-slate-950 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Core Summary KPIs Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Sales (Pendapatan Kotor) */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendapatan Kotor</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-bold text-slate-500 text-left">Omset Penjualan</div>
            <div className="text-lg font-extrabold text-slate-100 font-mono tracking-tight text-left">
              {isLoading ? "..." : formatRupiah(summary?.total_sales || 0)}
            </div>
          </div>
        </div>

        {/* Total Profit (Laba Bersih) */}
        <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-500/25 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Laba Bersih</span>
            <div className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-bold text-emerald-300 text-left">Keuntungan Bersih</div>
            <div className="text-lg font-extrabold text-emerald-400 font-mono tracking-tight text-left">
              {isLoading ? "..." : formatRupiah(summary?.total_profit || 0)}
            </div>
          </div>
        </div>

        {/* Transaction count */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaksi</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-bold text-slate-500 text-left">Jumlah Transaksi</div>
            <div className="text-lg font-extrabold text-slate-100 font-mono tracking-tight text-left">
              {isLoading ? "..." : summary?.transaction_count || 0} <span className="text-xs font-medium text-slate-500">trx</span>
            </div>
          </div>
        </div>

        {/* Average transaction amount */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rerata Struk</span>
            <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-bold text-slate-500 text-left">Rata-rata Belanja</div>
            <div className="text-base font-extrabold text-slate-100 font-mono tracking-tight text-left">
              {isLoading ? "..." : formatRupiah(summary?.average_transaction || 0)}
            </div>
          </div>
        </div>

        {/* Total Items Sold */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Barang Terjual</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-bold text-slate-500 text-left">Total Item</div>
            <div className="text-lg font-extrabold text-slate-100 font-mono tracking-tight text-left">
              {isLoading ? "..." : summary?.total_items_sold || 0} <span className="text-xs font-medium text-slate-400">pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytical Charts and Top Products Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Core Sales Graph */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md lg:col-span-8 flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Grafik Fluktuasi Arus Kas ({startDate === endDate ? "Hari Ini" : "Periode Terpilih"})
            </h3>
            <span className="text-[10px] font-semibold text-slate-500">
              {startDate === endDate ? "Sumbu X: Jam Operasional" : "Sumbu X: Tanggal"}
            </span>
          </div>

          <div className="flex-1 min-h-0 text-xs">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-slate-500">Menyusun data grafik...</span>
              </div>
            ) : getChartData().length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                Tidak ada data transaksi untuk grafik di periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Rp${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatRupiah(val), ""]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #1e293b", backgroundColor: "#020617", color: "#f8fafc" }}
                  />
                  <Legend iconSize={8} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="Penjualan"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Keuntungan"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 5 Products Leaderboard */}
        <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800/80 shadow-md lg:col-span-4 flex flex-col h-[320px]">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            Kinerja Produk Terlaris (Top 5)
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-slate-500">Menyaring produk terlaris...</span>
              </div>
            ) : topProducts.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-center gap-1">
                <Layers className="w-8 h-8 text-slate-750 stroke-1" />
                <span>Belum ada barang terjual</span>
              </div>
            ) : (
              topProducts.map((p, index) => {
                // Calculate max width percentage relative to the top seller
                const maxQty = topProducts[0]?.quantity_sold || 1;
                const percentage = Math.round((p.quantity_sold / maxQty) * 100);

                return (
                  <div key={p.sku} className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-bold text-slate-200 truncate max-w-[150px]">
                        {index + 1}. {p.name}
                      </span>
                      <span className="font-mono font-bold text-slate-400">
                        {p.quantity_sold} pcs
                      </span>
                    </div>
                    {/* Progress slider bar representation */}
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Omset: {formatRupiah(p.total_revenue)}</span>
                      <span className="text-emerald-400 font-semibold">
                        Untung: {formatRupiah(p.total_profit)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Logs */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800/80 shadow-lg overflow-hidden flex flex-col flex-1">
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-400" />
            Log Riwayat Transaksi Penjualan
          </h3>
          <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-full font-bold">
            {transactions.length} Transaksi Tercatat
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-850">
                <th className="py-3 px-4 w-[140px]">Waktu Transaksi</th>
                <th className="py-3 px-4 w-[160px]">Nomor Invoice</th>
                <th className="py-3 px-4 text-center w-[120px]">Metode Pembayaran</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right text-red-400">Diskon</th>
                <th className="py-3 px-4 text-right">Pajak</th>
                <th className="py-3 px-4 text-right w-[110px]">Total Akhir</th>
                <th className="py-3 px-4 text-right text-emerald-400 w-[100px]">Laba Bersih</th>
                <th className="py-3 px-4 text-center w-[60px]">Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Memuat logs transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    Tidak ada transaksi tercatat di periode ini.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => handleTxRowClick(tx)}
                    className="hover:bg-slate-950/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-slate-500">
                      <div>{formatDate(tx.created_at)}</div>
                      <div className="text-[10px] text-slate-650 mt-0.5">{formatTime(tx.created_at)}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                      {tx.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 font-bold uppercase text-[9px] rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {formatRupiah(tx.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-red-405">
                      {tx.discount > 0 ? `-${formatRupiah(tx.discount)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {tx.tax > 0 ? `+${formatRupiah(tx.tax)}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      {formatRupiah(tx.final_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatRupiah(tx.profit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTxRowClick(tx);
                        }}
                        id={`btn-receipt-view-${tx.id}`}
                        className="p-1 bg-slate-950 hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400 rounded-lg border border-slate-850 hover:border-emerald-500/30 transition-colors cursor-pointer"
                        title="Tampilkan Struk"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reprint Detailed Receipt Modal */}
      <AnimatePresence>
        {isReceiptOpen && selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <ThermalReceipt
                transaction={selectedTx}
                onClose={() => {
                  setIsReceiptOpen(false);
                  setSelectedTx(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
