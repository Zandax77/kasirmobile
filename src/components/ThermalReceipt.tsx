import React from "react";
import { Transaction, StoreSettings } from "../types";
import { Printer, Download, X } from "lucide-react";

interface ThermalReceiptProps {
  transaction: Transaction;
  onClose: () => void;
  showActions?: boolean;
  storeSettings?: StoreSettings | null;
}

export default function ThermalReceipt({
  transaction,
  onClose,
  showActions = true,
  storeSettings,
}: ThermalReceiptProps) {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 max-w-sm mx-auto overflow-hidden">
      {/* Receipt Action Header */}
      {showActions && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-850">
          <span className="font-bold text-sm text-slate-200">Struk Transaksi</span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              id="btn-print-receipt"
              className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/25 cursor-pointer transition-all"
              title="Cetak Struk"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              id="btn-close-receipt"
              className="p-1.5 bg-slate-950 text-slate-400 rounded-lg hover:bg-slate-800 border border-slate-850 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Actual Thermal Receipt Mockup */}
      <div
        id="print-receipt-container"
        className="p-6 font-mono text-[12px] leading-relaxed bg-white text-black relative"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        {/* Jagged paper edge decoration on top */}
        <div className="absolute top-0 left-0 right-0 h-1 flex overflow-hidden opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-black rotate-45 -translate-y-1.5 shrink-0"
            />
          ))}
        </div>

        {/* Store Info */}
        <div className="text-center mt-2 mb-4">
          <h2 className="text-sm font-bold tracking-wider uppercase">{storeSettings?.store_name || "TOKO KASIR UMKM"}</h2>
          <p className="text-[10px] text-gray-600">{storeSettings?.store_address || "Jl. Pembangunan Wirausaha No. 88"}</p>
          <p className="text-[10px] text-gray-600">Telp: {storeSettings?.store_phone || "0812-3456-7890"}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-2"></div>

        {/* Invoice Metadata */}
        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>No. Bukti:</span>
            <span className="font-semibold">{transaction.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{formatDate(transaction.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir:</span>
            <span>Admin Kasir</span>
          </div>
          <div className="flex justify-between">
            <span>Metode:</span>
            <span className="font-semibold uppercase">{transaction.payment_method}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-2"></div>

        {/* Purchase Items list */}
        <div className="space-y-2 text-[11px]">
          {transaction.items && transaction.items.map((item) => (
            <div key={item.id} className="space-y-0.5">
              <div className="font-semibold text-left">{item.product_name}</div>
              <div className="flex justify-between text-gray-600 text-[10px]">
                <span>
                  {item.quantity} {item.unit || "pcs"} x {formatRupiah(item.sell_price).replace("Rp", "").trim()}
                </span>
                <span>{formatRupiah(item.subtotal).replace("Rp", "").trim()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-2"></div>

        {/* Financial Summary */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatRupiah(transaction.total_amount).replace("Rp", "").trim()}</span>
          </div>
          {transaction.discount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon:</span>
              <span>-{formatRupiah(transaction.discount).replace("Rp", "").trim()}</span>
            </div>
          )}
          {transaction.tax > 0 && (
            <div className="flex justify-between">
              <span>Pajak (11%):</span>
              <span>+{formatRupiah(transaction.tax).replace("Rp", "").trim()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-dotted border-gray-400 pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{formatRupiah(transaction.final_amount)}</span>
          </div>
        </div>

        {/* Cash payment details */}
        {transaction.payment_method.toLowerCase() === "tunai" && (
          <div className="space-y-0.5 text-[11px] mt-2 border-t border-dotted border-gray-300 pt-1">
            <div className="flex justify-between">
              <span>Tunai Bayar:</span>
              <span>{formatRupiah(transaction.cash_received || 0).replace("Rp", "").trim()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Kembalian:</span>
              <span>{formatRupiah(transaction.cash_change || 0).replace("Rp", "").trim()}</span>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-dashed border-gray-400 my-3"></div>

        {/* Receipt Footer */}
        <div className="text-center space-y-1 mt-2">
          <p className="font-bold text-[10px]">TERIMA KASIH</p>
          <p className="text-[10px] text-gray-500 italic">Sudah berbelanja di Toko kami.</p>
          <p className="text-[9px] text-gray-400">Powered by SQLite Kasir Android</p>
        </div>

        {/* Jagged paper edge decoration on bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 flex overflow-hidden opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-black rotate-45 translate-y-1 shrink-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
