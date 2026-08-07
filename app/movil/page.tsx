'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const MODULOS = [
  { emoji: '🌡️', titulo: 'HACCP Rápido', desc: 'Registro de temperaturas en 10 seg', href: '/movil/haccp', color: 'from-teal-500 to-emerald-600' },
  { emoji: '📦', titulo: 'Inventario Scanner', desc: 'Conteo rápido con cámara', href: '/movil/inventario', color: 'from-blue-500 to-cyan-600' },
  { emoji: '🧾', titulo: 'Escanear Factura', desc: 'Foto → lectura automática', href: '/movil/facturas', color: 'from-pink-500 to-rose-600' },
  { emoji: '🔍', titulo: 'Trazabilidad QR', desc: 'Escanea lotes y da salidas FIFO', href: '/movil/scan', color: 'from-orange-500 to-amber-600' },
  { emoji: '🍳', titulo: 'Producciones', desc: 'Planifica y controla tandas', href: '/producciones', color: 'from-red-500 to-orange-600' },
  { emoji: '📊', titulo: 'Inventario Central', desc: 'Calendario y caducidades', href: '/producciones/inventario', color: 'from-slate-600 to-slate-800' },
];

export default function MovilHome() {
  const router = useRouter();
  const [installEvent, setInstallEvent] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Cabecera */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-600/30">
            <span className="text-white font-bold text-3xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">Kost Software</h1>
          <p className="text-sm text-slate-500 mt-1">Tu cocina central en el bolsillo</p>

          {installEvent && (
            <button
              onClick={() => installEvent.prompt()}
              className="mt-4 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition"
            >
              📲 Instalar app en este dispositivo
            </button>
          )}
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-2 gap-3">
          {MODULOS.map((m) => (
            <button
              key={m.href}
              onClick={() => router.push(m.href)}
              className={`bg-gradient-to-br ${m.color} rounded-2xl p-4 text-left text-white shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-transform`}
            >
              <span className="text-3xl">{m.emoji}</span>
              <p className="font-bold text-sm mt-2 leading-tight">{m.titulo}</p>
              <p className="text-[10px] text-white/80 mt-1 leading-snug">{m.desc}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-8">
          Versión móvil · optimizada para cocina
        </p>
      </div>
    </div>
  );
}
