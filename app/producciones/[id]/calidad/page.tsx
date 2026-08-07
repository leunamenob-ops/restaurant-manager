'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const CHECKS = [
  { key: 'aspecto_ok' as const, label: 'Aspecto correcto (color, textura)' },
  { key: 'olor_ok' as const, label: 'Olor característico del producto' },
  { key: 'sabor_ok' as const, label: 'Sabor correcto (cata)' },
  { key: 'envasado_ok' as const, label: 'Envasado hermético y limpio' },
  { key: 'etiquetado_ok' as const, label: 'Etiquetado con lote y caducidad' },
  { key: 'conservacion_ok' as const, label: 'Refrigeración / ubicación correcta' },
];

// Límites APPCC de referencia
const LIMITES = {
  coccion_min: 65,
  enfriado_max: 10,
  ph_max: 4.6,
};

export default function CalidadPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [producto, setProducto] = useState('');
  const [lote, setLote] = useState('');
  const [controlId, setControlId] = useState<string | null>(null);
  const [resultadoPrevio, setResultadoPrevio] = useState<string | null>(null);

  const [form, setForm] = useState({
    temperatura_coccion: '',
    temperatura_enfriado: '',
    ph: '',
    aspecto_ok: true,
    olor_ok: true,
    sabor_ok: true,
    envasado_ok: true,
    etiquetado_ok: true,
    conservacion_ok: true,
    observaciones: '',
    responsable: '',
  });

  useEffect(() => {
    if (id) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargar() {
    setLoading(true);

    const { data: prod } = await supabase
      .from('producciones')
      .select('nombre, lote_numero')
      .eq('id_produccion', id)
      .single();

    setProducto(prod?.nombre || '');
    setLote(prod?.lote_numero || '');

    const { data: control } = await supabase
      .from('control_calidad_produccion')
      .select('*')
      .eq('produccion_id', id)
      .maybeSingle();

    if (control) {
      setControlId(control.id);
      setResultadoPrevio(control.resultado);
      setForm({
        temperatura_coccion: control.temperatura_coccion != null ? String(control.temperatura_coccion) : '',
        temperatura_enfriado: control.temperatura_enfriado != null ? String(control.temperatura_enfriado) : '',
        ph: control.ph != null ? String(control.ph) : '',
        aspecto_ok: control.aspecto_ok !== false,
        olor_ok: control.olor_ok !== false,
        sabor_ok: control.sabor_ok !== false,
        envasado_ok: control.envasado_ok !== false,
        etiquetado_ok: control.etiquetado_ok !== false,
        conservacion_ok: control.conservacion_ok !== false,
        observaciones: control.observaciones || '',
        responsable: control.responsable || '',
      });
    }

    setLoading(false);
  }

  // Avisos en vivo según límites APPCC
  const avisos: string[] = [];
  const tc = form.temperatura_coccion === '' ? null : Number(form.temperatura_coccion);
  const te = form.temperatura_enfriado === '' ? null : Number(form.temperatura_enfriado);
  const ph = form.ph === '' ? null : Number(form.ph);

  if (tc !== null && tc < LIMITES.coccion_min) {
    avisos.push(`️ Temp. cocción ${tc}°C < ${LIMITES.coccion_min}°C (límite APPCC)`);
  }
  if (te !== null && te > LIMITES.enfriado_max) {
    avisos.push(`❄️ Temp. enfriado ${te}°C > ${LIMITES.enfriado_max}°C (límite APPCC)`);
  }
  if (ph !== null && ph > LIMITES.ph_max) {
    avisos.push(`🧪 pH ${ph} > ${LIMITES.ph_max} (zona de riesgo)`);
  }
  const checksFallados = CHECKS.filter((c) => !form[c.key]);
  checksFallados.forEach((c) => avisos.push(`❌ ${c.label}`));

  const seraConforme = avisos.length === 0;

  async function guardar() {
    setGuardando(true);

    const resultado = seraConforme ? 'conforme' : 'no_conforme';

    const payload = {
      produccion_id: id,
      temperatura_coccion: tc,
      temperatura_enfriado: te,
      ph,
      aspecto_ok: form.aspecto_ok,
      olor_ok: form.olor_ok,
      sabor_ok: form.sabor_ok,
      envasado_ok: form.envasado_ok,
      etiquetado_ok: form.etiquetado_ok,
      conservacion_ok: form.conservacion_ok,
      observaciones: form.observaciones || null,
      responsable: form.responsable || null,
      resultado,
      updated_at: new Date().toISOString(),
    };

    let error: any = null;

    if (controlId) {
      const res = await supabase
        .from('control_calidad_produccion')
        .update(payload)
        .eq('id', controlId);
      error = res.error;
    } else {
      const res = await supabase.from('control_calidad_produccion').insert(payload);
      error = res.error;
    }

    setGuardando(false);

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    alert(
      resultado === 'conforme'
        ? '✅ Control guardado: CONFORME'
        : `🚫 Control guardado: NO CONFORME\n\n${avisos.join('\n')}`
    );
    cargar();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-200 border-t-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push(`/producciones/${id}`)}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate">
              🧪 Control de calidad · {producto}
            </h1>
            <p className="text-xs text-slate-500 font-mono truncate">{lote}</p>
          </div>
          {resultadoPrevio && (
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
              resultadoPrevio === 'conforme'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {resultadoPrevio === 'conforme' ? '✅ CONFORME' : '🚫 NO CONFORME'}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* LÍMITES DE REFERENCIA */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-800">
          <p className="font-bold uppercase tracking-wider mb-1">Límites críticos APPCC</p>
          <p>
            🌡️ Cocción ≥ {LIMITES.coccion_min}°C · ❄️ Enfriado ≤ {LIMITES.enfriado_max}°C · 🧪 pH ≤ {LIMITES.ph_max} (conservas ácidas)
          </p>
        </div>

        {/* TEMPERATURAS Y PH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
            🌡️ Puntos críticos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Temp. cocción (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperatura_coccion}
                onChange={(e) => setForm({ ...form, temperatura_coccion: e.target.value })}
                placeholder={`≥ ${LIMITES.coccion_min}`}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm font-bold outline-none transition ${
                  tc !== null && tc < LIMITES.coccion_min
                    ? 'border-red-400 ring-2 ring-red-200 text-red-700'
                    : 'border-slate-300 focus:ring-2 focus:ring-teal-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Temp. enfriado (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperatura_enfriado}
                onChange={(e) => setForm({ ...form, temperatura_enfriado: e.target.value })}
                placeholder={`≤ ${LIMITES.enfriado_max}`}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm font-bold outline-none transition ${
                  te !== null && te > LIMITES.enfriado_max
                    ? 'border-red-400 ring-2 ring-red-200 text-red-700'
                    : 'border-slate-300 focus:ring-2 focus:ring-teal-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                pH (opcional)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.ph}
                onChange={(e) => setForm({ ...form, ph: e.target.value })}
                placeholder={`≤ ${LIMITES.ph_max}`}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm font-bold outline-none transition ${
                  ph !== null && ph > LIMITES.ph_max
                    ? 'border-red-400 ring-2 ring-red-200 text-red-700'
                    : 'border-slate-300 focus:ring-2 focus:ring-teal-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* CHECKLIST */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
            ✅ Checklist de control
          </h2>
          <div className="space-y-3">
            {CHECKS.map((c) => (
              <label
                key={c.key}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  form[c.key]
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form[c.key]}
                  onChange={(e) => setForm({ ...form, [c.key]: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className={`text-sm font-medium ${form[c.key] ? 'text-emerald-800' : 'text-red-700'}`}>
                  {c.label}
                </span>
                <span className="ml-auto text-lg">{form[c.key] ? '✅' : '❌'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* AVISOS EN VIVO */}
        {avisos.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
            <p className="font-bold text-red-700 mb-2">🚫 Resultado: NO CONFORME</p>
            <ul className="space-y-1 text-sm text-red-600">
              {avisos.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        )}

        {avisos.length === 0 && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 text-center">
            <p className="font-bold text-emerald-700">✅ Resultado: CONFORME</p>
            <p className="text-xs text-emerald-600 mt-1">
              Todos los puntos críticos dentro de los límites APPCC
            </p>
          </div>
        )}

        {/* RESPONSABLE + OBSERVACIONES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Responsable del control
            </label>
            <input
              type="text"
              value={form.responsable}
              onChange={(e) => setForm({ ...form, responsable: e.target.value })}
              placeholder="Nombre del chef / responsable"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Observaciones
            </label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              rows={3}
              placeholder="Notas del control, acciones correctivas si es no conforme..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition resize-none"
            />
          </div>
        </div>

        {/* GUARDAR */}
        <button
          onClick={guardar}
          disabled={guardando}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white transition shadow-lg disabled:bg-slate-300 disabled:shadow-none ${
            seraConforme
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
          }`}
        >
          {guardando
            ? 'Guardando...'
            : seraConforme
            ? '✅ Guardar control CONFORME'
            : '🚫 Guardar control NO CONFORME'}
        </button>
      </main>
    </div>
  );
}
