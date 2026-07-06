import React, { useState, useEffect } from "react";
import CashierView from "./components/CashierView";
import InventoryView from "./components/InventoryView";
import ReportsView from "./components/ReportsView";
import SettingsView from "./components/SettingsView";
import { StoreSettings } from "./types";
import * as db from "./db";
import {
  Smartphone,
  Monitor,
  Store,
  ShoppingCart,
  Package,
  TrendingUp,
  Wifi,
  Battery,
  AlertCircle,
  CheckCircle2,
  Bell,
  HelpCircle,
  ChevronRight,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type MenuTab = "kasir" | "inventaris" | "laporan" | "pengaturan";

interface Notification {
  id: string;
  message: string;
  type: "success" | "error";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MenuTab>("kasir");
  const [isMobileSimulator, setIsMobileSimulator] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemTime, setSystemTime] = useState("");
  const [lowStockAlertCount, setLowStockAlertCount] = useState(0);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const fetchSettings = async () => {
    try {
      const data = await db.getSettings();
      setStoreSettings({
        store_name: data.store_name || "Toko Kasir UMKM",
        store_address: data.store_address || "",
        store_phone: data.store_phone || "",
      });
    } catch (err) {
      console.error("Gagal load pengaturan", err);
    }
  };

  useEffect(() => {
    db.initDB().then(() => fetchSettings());
  }, []);

  // Auto-update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll for low-stock products in background to trigger header notification counts
  const checkLowStockCount = async () => {
    try {
      const products = await db.getProducts();
      const lowCount = products.filter(p => p.stock <= p.min_stock).length;
      setLowStockAlertCount(lowCount);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    checkLowStockCount();
    // poll every 10 seconds
    const interval = setInterval(checkLowStockCount, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Global Notification Trigger
  const triggerNotification = (message: string, type: "success" | "error") => {
    const id = Math.random().toString();
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);

    // Refresh stock alert badge count in the header when catalog changes
    checkLowStockCount();
  };

  const handleManualNotificationClose = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Navigations Config
  const navItems = [
    { id: "kasir" as MenuTab, label: "Kasir (POS)", icon: ShoppingCart, color: "text-emerald-500 bg-emerald-50" },
    { id: "inventaris" as MenuTab, label: "Inventaris", icon: Package, color: "text-blue-500 bg-blue-50" },
    { id: "laporan" as MenuTab, label: "Laporan", icon: TrendingUp, color: "text-purple-500 bg-purple-50" },
    { id: "pengaturan" as MenuTab, label: "Pengaturan", icon: Settings, color: "text-amber-500 bg-amber-50" },
  ];

  // Render current active panel
  const renderActiveView = () => {
    switch (activeTab) {
      case "kasir":
        return <CashierView onNotification={triggerNotification} storeSettings={storeSettings} />;
      case "inventaris":
        return <InventoryView onNotification={triggerNotification} />;
      case "laporan":
        return <ReportsView onNotification={triggerNotification} />;
      case "pengaturan":
        return <SettingsView onNotification={triggerNotification} onSettingsUpdated={fetchSettings} />;
      default:
        return <CashierView onNotification={triggerNotification} storeSettings={storeSettings} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-stretch md:items-center justify-center font-sans relative overflow-hidden text-slate-200">
      {/* Absolute futuristic abstract background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Top Global Control Bar (Sticky overlay) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500 rounded-lg text-slate-950 font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-black text-sm tracking-wide">KASIR UMKM PINTAR</h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest hidden sm:block">
              Android SQLite POS terminal Simulator
            </p>
          </div>
        </div>

        {/* Action Toggle Layout simulator controls */}
        <div className="flex items-center gap-3.5">
          {/* Mode toggle removed for responsive design */}
          {/* Clock */}
          <div className="bg-slate-900/60 border border-slate-700/30 px-3 py-1 rounded-lg text-xs font-mono font-bold text-slate-300">
            {systemTime || "00:00:00"}
          </div>
        </div>
      </div>

      {/* RENDER BODY CONTAINER - CHOOSE SIMULATOR OR STANDARD EXPANDED VIEW */}
      <div className="pt-16 pb-4 flex-1 w-full flex items-center justify-center p-4">
        {isMobileSimulator ? (
          /* ========================================================== */
          /* ANDROID SMARTPHONE SIMULATOR FRAME */
          /* ========================================================== */
          <div className="relative w-[360px] h-[740px] bg-slate-950 rounded-[48px] shadow-2xl border-8 border-slate-800 p-2.5 flex flex-col overflow-hidden ring-12 ring-slate-900 shadow-emerald-500/5">
            {/* Camera speaker notch hole */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-black rounded-full z-50 flex items-center justify-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-slate-800 rounded-full border border-slate-700"></div>
              <div className="w-12 h-1 bg-slate-900 rounded-full"></div>
            </div>

            {/* Simulated Android Screen Content */}
            <div className="flex-1 bg-slate-950 rounded-[38px] overflow-hidden flex flex-col relative border border-slate-800">
              {/* Android Status Bar */}
              <div className="bg-slate-900 text-slate-300 h-7 px-6 pt-1 flex items-center justify-between text-[10px] font-semibold select-none z-30 shrink-0 border-b border-slate-800/30">
                <span className="font-mono text-[9.5px]">
                  {systemTime ? systemTime.substring(0, 5) : "12:00"}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono tracking-wider text-slate-400">LTE</span>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <Battery className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>

              {/* Android App Custom Header inside Simulator */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs tracking-wide">KASIR UMKM</span>
                </div>
                {lowStockAlertCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {lowStockAlertCount} Alert Stok
                  </span>
                )}
              </div>

              {/* Simulated Screen Body View */}
              <div className="flex-1 overflow-hidden relative bg-slate-950 flex flex-col">
                <div className="flex-1 overflow-hidden">
                  {renderActiveView()}
                </div>
              </div>

              {/* Android Bottom Navigation Tabs */}
              <div className="bg-slate-900 border-t border-slate-800 py-1 px-3 flex justify-around items-center shrink-0 z-20">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="flex flex-col items-center py-1 px-3 text-center rounded-xl transition-all"
                    >
                      <div
                        className={`p-1.5 rounded-xl transition-all ${
                          isActive
                            ? "bg-emerald-500 text-slate-950 scale-110 shadow-lg shadow-emerald-500/20"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span
                        className={`text-[9px] font-bold mt-1 transition-colors ${
                          isActive ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {item.id === "kasir" ? "Kasir" : item.id === "inventaris" ? "Stok" : "Laporan"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Simulated Android soft-key navigation bottom bar */}
              <div className="bg-black h-5 w-full flex items-center justify-around pb-1.5 shrink-0 z-20">
                <div className="w-4.5 h-4.5 rounded-xs border border-white/40 flex items-center justify-center rotate-45 scale-75 opacity-70"></div>
                <div className="w-4 h-4 rounded-full border-2 border-white/50 opacity-70"></div>
                <div className="w-4.5 h-3.5 border-t-2 border-b-2 border-x border-white/50 rounded-xs opacity-70"></div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* WIDESCREEN TABLET / DESKTOP FULL-SCREEN INTEGRATED CONTAINER */
          /* ========================================================== */
          <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Desktop Navigation Sidebar */}
            <div className="w-64 bg-slate-950 border-r border-slate-800/80 flex-col justify-between p-5 text-white shrink-0 hidden md:flex">
              <div className="space-y-6">
                {/* Brand / Logo */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold text-lg">
                    {storeSettings?.store_name ? storeSettings.store_name.substring(0, 2).toUpperCase() : "KP"}
                  </div>
                  <div className="text-left">
                    <h2 className="font-extrabold text-sm leading-tight tracking-wider text-white">{storeSettings?.store_name || "Kasir Pintar"}</h2>
                    <p className="text-[10px] text-emerald-400/80 font-medium">Dashboard POS</p>
                  </div>
                </div>

                {/* Navigation Items menu */}
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 block mb-2">
                    Menu Utama
                  </span>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-950" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer stock alerts / admin details */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                {/* Low Stock dynamic quick alert banner */}
                {lowStockAlertCount > 0 ? (
                  <div
                    onClick={() => setActiveTab("inventaris")}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-amber-500/15 transition-all"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
                    <div className="text-left">
                      <p className="text-[10.5px] font-bold leading-tight">Peringatan Stok!</p>
                      <p className="text-[9px] font-medium opacity-80">{lowStockAlertCount} produk hampir habis.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <div className="text-left">
                      <p className="text-[10.5px] font-bold leading-tight">Stok Aman</p>
                      <p className="text-[9px] font-medium opacity-80">Semua produk terpenuhi.</p>
                    </div>
                  </div>
                )}

                {/* Admin info card */}
                <div className="flex items-center gap-2.5 px-1">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 font-extrabold text-xs flex items-center justify-center text-emerald-400 uppercase">
                    SQL
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{storeSettings?.store_name || "Kedai Berkah"}</p>
                    <p className="text-[10px] text-slate-500">Local SQLite V3</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Dashboard Right View Main Panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
              {renderActiveView()}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden bg-slate-950 border-t border-slate-800/80 pt-2 pb-3 px-2 flex justify-around items-center shrink-0 z-20">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex flex-col items-center py-1 px-3 text-center rounded-xl transition-all"
                  >
                    <div
                      className={`p-2 rounded-xl transition-all ${
                        isActive
                          ? "bg-emerald-500 text-slate-950 scale-110 shadow-lg shadow-emerald-500/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-bold mt-1.5 transition-colors ${
                        isActive ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {item.id === "kasir" ? "Kasir" : item.id === "inventaris" ? "Stok" : "Laporan"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING SUCCESS OR ERROR TOAST NOTIFICATION STACK */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ transform: "translateY(50px)", opacity: 0 }}
              animate={{ transform: "translateY(0)", opacity: 1 }}
              exit={{ transform: "translateY(-20px)", opacity: 0 }}
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 shadow-lg border text-xs font-semibold ${
                n.type === "success"
                  ? "bg-slate-900 border-emerald-500/20 text-slate-200 shadow-emerald-500/5"
                  : "bg-red-950 border-red-500/30 text-white"
              }`}
            >
              {n.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
              )}
              <span className="text-left flex-1">{n.message}</span>
              <button
                onClick={() => handleManualNotificationClose(n.id)}
                className={`p-0.5 rounded-md ${
                  n.type === "success" ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800" : "text-white/80 hover:text-white"
                }`}
              >
                <XIconLocal />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Local X Icon
function XIconLocal() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-3.5 h-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
