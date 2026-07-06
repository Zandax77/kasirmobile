import React, { useState, useEffect } from "react";
import { Settings, Save, Store, MapPin, Phone } from "lucide-react";
import * as db from "../db";

interface SettingsViewProps {
  onNotification: (message: string, type: "success" | "error") => void;
  onSettingsUpdated: () => void;
}

export default function SettingsView({ onNotification, onSettingsUpdated }: SettingsViewProps) {
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await db.getSettings();
      setStoreName(data.store_name || "");
      setStoreAddress(data.store_address || "");
      setStorePhone(data.store_phone || "");
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        store_phone: storePhone.trim(),
      };

      await db.saveSettings(payload);
      onNotification("Pengaturan berhasil disimpan", "success");
      onSettingsUpdated();
    } catch (err: any) {
      onNotification(err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-6 p-4 lg:p-8 overflow-y-auto bg-slate-950">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-emerald-400" />
          Pengaturan Aplikasi
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Sesuaikan profil toko dan preferensi aplikasi Anda di sini.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 max-w-2xl">
        <h2 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">Profil Toko</h2>
        
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Nama Toko
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">
                <Store className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Toko Kasir UMKM"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Alamat Toko
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-500">
                <MapPin className="w-5 h-5" />
              </span>
              <textarea
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Contoh: Jl. Pembangunan Wirausaha No. 88"
                required
                rows={3}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-medium transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Nomor Telepon
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">
                <Phone className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-100 font-medium transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
