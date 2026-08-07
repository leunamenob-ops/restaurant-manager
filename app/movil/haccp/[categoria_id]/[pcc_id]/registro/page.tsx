'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function MovilRegistroPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;
  const pccId = params.pcc_id as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [pcc, setPcc] = useState<any>(null);
  const [pccsCategoria, setPccsCategoria] = useState<any[]>([]);
  const [hechos, setHechos] = useState<Set<string>>(new Set());

  const [valorMedido, setValorMedido] = useState('');
  const [cumpleSiNo, setCumpleSiNo] = useState('SÍ');
  const [accionCorrectora, setAccionCorrectora] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset del formulario al cambiar de PCC
    setValorMedido('');
    setCumpleSiNo('SÍ');
    setAccionCorrectora('');
    setFotoFile(null);
    setMensaje('');
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pccId, categoriaId]);

  async function cargarTodo() {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];

      const [resPcc, resReg] = await Promise.all([
        fetch(`/api/haccp/pcc?categoria=${categoriaId}`),
        fetch(`/api/haccp/registros?inicio=${hoy}&fin=${hoy}`),
      ]);

      const pccData = (await resPcc.json()) || [];
      const regData = (await resReg.json()) || [];

      const encontrado = pccData.find((p: any) => p.id_pcc === pccId);
      setPcc(encontrado || null);
      setPccsCategoria(pccData);
      setHechos(new Set(regData.map((r: any) => r.id_pcc)));
    } catch (e) {
      console.error(e);
      setMensaje('❌ Error al cargar el PCC');
    }
    setLoading(false);
  }

  const esNumerico = pcc?.tipo_control === 'NUMERICO';

  const fueraRango =
    esNumerico && valorMedido !== ''
      ? parseFloat(valorMedido) < (pcc?.limite_min ?? -Infinity) ||
        parseFloat(valorMedido) > (pcc?.limite_max ?? Infinity)
      : false;

  const requiereAccion = fueraRango || (!esNumerico && cumpleSiNo === 'NO');

  async function subirFoto(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${pccId}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('haccp-fotos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from('haccp-fotos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function guardar() {
    if (!pcc) return;

    if (esNumerico && valorMedido === '') {
      setMensaje('❌ Introduce el valor medido');
      return;
    }
    if (requiereAccion && !accionCorrectora.trim()) {
      setMensaje('❌ Acción correctora obligatoria');
      return;
    }
    if (requiereAccion && !fotoFile) {
      setMensaje('❌ Sube foto de evidencia');
      return;
    }

    setGuardando(true);
    setMensaje('');

    try {
      let fotoURL: string | null = null;
      if (fotoFile) {
        setMensaje('📸 Subiendo foto...');
        fotoURL = await subirFoto(fotoFile);
      }

      const usuarioData = sessionStorage.getItem('usuario');
      const user = usuarioData ? JSON.parse(usuarioData) : null;
      const userId = user?.id_usuario || 'B0003';
      const hotelId = sessionStorage.getItem('hotel_id') || '00000000-0000-0000-0000-000000000001';

      const estado = requiereAccion ? 'NO_OK' : 'OK';

      const res = await fetch('/api/haccp/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pcc: pcc.id_pcc,
          id_usuario: userId,
          hotel_id: hotelId,
          valor_medido: esNumerico && valorMedido !== '' ? parseFloat(valorMedido) : null,
          unidad: pcc.unidad || null,
          cumple_si_no: requiereAccion ? 'NO' : 'SÍ',
          accion_correctora: requiereAccion ? accionCorrectora : null,
          foto_evidencia: requiereAccion ? fotoURL : null,
          estado,
          notificado: estado === 'NO_OK',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setMensaje(`❌ Error: ${data.error}`);
        setGuardando(false);
        return;
      }

      // ✅ Guardado → siguiente PCC pendiente de la categoría
      const nuevosHechos = new Set(hechos);
      nuevosHechos.add(pcc.id_pcc);
      setHechos(nuevosHechos);

      const siguiente = pccsCategoria.find(
        (p) => p.id_pcc !== pcc.id_pcc && !nuevosHechos.has(p.id_pcc)
      );

      if (siguiente) {
        setMensaje('✅ Guardado → siguiente...');
        setTimeout(() => {
          router.replace(`/movil/haccp/${categoriaId}/${siguiente.id_pcc}/registro`);
        }, 800);
      } else {
        setMensaje('✅ ¡Categoría completada!');
        setTimeout(() => {
          router.push(`/movil/haccp/${categoriaId}`);
        }, 1200);
      }
    } catch (error: any) {
      setMensaje('❌ Error: ' + error.message);
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-200 border-t-teal-600"></div>
      </div>
    );
  }

  if (!pcc) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-slate-600 mb-4">{mensaje || 'PCC no encontrado'}</p>
          <button
            onClick={() => router.push(`/movil/haccp/${categoriaId}`)}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-bold"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-6 pb-10">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push(`/movil/haccp/${categoriaId}`)}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center active:scale-95 transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/movil')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-xl active:scale-95 transition"
          >
            🏠
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
              {pcc.nombre_pcc}
            </h1>
            <p className="text-[11px] text-slate-500">
              {esNumerico
                ? `Rango: ${pcc.limite_min} – ${pcc.limite_max} ${pcc.unidad}`
                : `Frecuencia: ${pcc.frecuencia || 'Diaria'}`}
            </p>
          </div>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div className={`p-3 rounded-xl mb-4 text-center text-sm font-bold ${
            mensaje.includes('✅') ? 'bg-emerald-500 text-white' :
            mensaje.includes('📸') ? 'bg-blue-500 text-white' :
            'bg-red-500 text-white'
          }`}>
            {mensaje}
          </div>
        )}

        {/* VALOR NUMÉRICO gigante */}
        {esNumerico ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 text-center">
              Temperatura / valor ({pcc.unidad})
            </label>
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={valorMedido}
              onChange={(e) => { setValorMedido(e.target.value); setMensaje(''); }}
              placeholder="0.0"
              autoFocus
              className={`w-full px-4 py-6 text-6xl font-bold text-center border-4 rounded-2xl outline-none transition ${
                fueraRango
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-teal-200 bg-teal-50 text-teal-900 focus:border-teal-500'
              }`}
            />
            {fueraRango && (
              <p className="text-red-600 text-sm font-bold text-center mt-3">
                🚨 ¡Fuera de rango! ({pcc.limite_min} – {pcc.limite_max} {pcc.unidad})
              </p>
            )}
          </div>
        ) : (
          /* SÍ / NO gigante */
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { setCumpleSiNo('SÍ'); setMensaje(''); }}
              className={`py-6 rounded-2xl font-bold text-xl border-4 transition active:scale-[0.97] ${
                cumpleSiNo === 'SÍ'
                  ? 'bg-emerald-500 border-emerald-600 text-white'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              ✅ SÍ
            </button>
            <button
              onClick={() => { setCumpleSiNo('NO'); setMensaje(''); }}
              className={`py-6 rounded-2xl font-bold text-xl border-4 transition active:scale-[0.97] ${
                cumpleSiNo === 'NO'
                  ? 'bg-red-500 border-red-600 text-white'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              🚫 NO
            </button>
          </div>
        )}

        {/* INCIDENCIA */}
        {requiereAccion && (
          <div className="bg-red-50 rounded-2xl border-2 border-red-300 p-4 mb-4 space-y-3">
            <p className="font-bold text-red-700 text-sm">🚨 Incidencia — acción obligatoria</p>
            <textarea
              value={accionCorrectora}
              onChange={(e) => { setAccionCorrectora(e.target.value); setMensaje(''); }}
              rows={2}
              placeholder="Acción correctora aplicada..."
              className="w-full p-3 border-2 border-red-200 rounded-xl text-sm outline-none focus:border-red-400 bg-white"
            />
            <label className="block w-full p-4 border-2 border-dashed border-red-300 rounded-xl bg-white text-center cursor-pointer active:scale-[0.98] transition">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFotoFile(f); setMensaje(''); }
                }}
              />
              {fotoFile ? (
                <span className="text-sm font-bold text-emerald-600">📸 {fotoFile.name}</span>
              ) : (
                <span className="text-sm font-bold text-red-600">📸 Toca para hacer foto</span>
              )}
            </label>
          </div>
        )}

        {/* GUARDAR */}
        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full py-5 bg-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition disabled:bg-slate-300 active:scale-[0.98]"
        >
          {guardando ? 'Guardando...' : '💾 Guardar y siguiente'}
        </button>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Al guardar salta automático al siguiente PCC pendiente
        </p>
      </div>
    </div>
  );
}
