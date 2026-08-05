'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PCC {
  id_pcc: string;
  nombre_pcc: string;
  categoria_id: string;
  tipo_control: string;
  limite_min: number | null;
  limite_max: number | null;
  unidad: string | null;
  frecuencia: string | null;
  descripcion: string | null;
}

interface Categoria {
  id: string;
  nombre: string;
}

export default function AdminPCCsPage() {
  const router = useRouter();
  const [pccs, setPccs] = useState<PCC[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pccEditando, setPccEditando] = useState<PCC | null>(null);
  const [formData, setFormData] = useState<Partial<PCC>>({
    id_pcc: '',
    nombre_pcc: '',
    categoria_id: '',
    tipo_control: 'NUMERICO',
    limite_min: null,
    limite_max: null,
    unidad: '',
    frecuencia: 'Diaria',
    descripcion: ''
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const res = await fetch('/api/haccp/admin/pcc');
      const data = await res.json();
      setPccs(data.pccs || []);
      setCategorias(data.categorias || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }

  function abrirModalCrear() {
    setPccEditando(null);
    setFormData({
      id_pcc: '',
      nombre_pcc: '',
      categoria_id: categorias[0]?.id || '',
      tipo_control: 'NUMERICO',
      limite_min: null,
      limite_max: null,
      unidad: '',
      frecuencia: 'Diaria',
      descripcion: ''
    });
    setError('');
    setModalAbierto(true);
  }

  function abrirModalEditar(pcc: PCC) {
    setPccEditando(pcc);
    setFormData({
      id_pcc: pcc.id_pcc,
      nombre_pcc: pcc.nombre_pcc,
      categoria_id: pcc.categoria_id,
      tipo_control: pcc.tipo_control,
      limite_min: pcc.limite_min,
      limite_max: pcc.limite_max,
      unidad: pcc.unidad || '',
      frecuencia: pcc.frecuencia || 'Diaria',
      descripcion: pcc.descripcion || ''
    });
    setError('');
    setModalAbierto(true);
  }

  async function guardarPCC() {
    setGuardando(true);
    setError('');

    try {
      const url = pccEditando ? '/api/haccp/admin/pcc' : '/api/haccp/admin/pcc';
      const method = pccEditando ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      setModalAbierto(false);
      await cargarDatos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPCC(id_pcc: string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/haccp/admin/pcc?id_pcc=${id_pcc}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar');
      }

      await cargarDatos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  const pccsFiltrados = pccs.filter(pcc => {
    const matchCategoria = filtroCategoria === 'todas' || pcc.categoria_id === filtroCategoria;
    const matchBusqueda = pcc.nombre_pcc.toLowerCase().includes(busqueda.toLowerCase()) ||
                         pcc.id_pcc.toLowerCase().includes(busqueda.toLowerCase());
    return matchCategoria && matchBusqueda;
  });

  const pccsPorCategoria = categorias.map(cat => ({
    categoria: cat,
    pccs: pccsFiltrados.filter(p => p.categoria_id === cat.id)
  })).filter(g => g.pccs.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando PCCs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/haccp')}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Gestión de PCCs</h1>
                <p className="text-sm text-slate-500">{pccs.length} PCCs configurados</p>
              </div>
            </div>
            <button
              onClick={abrirModalCrear}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-all flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo PCC
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
            />
          </div>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>

        {/* Lista de PCCs por categoría */}
        {pccsPorCategoria.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No se encontraron PCCs con los filtros actuales</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pccsPorCategoria.map(({ categoria, pccs: pccsCat }) => (
              <div key={categoria.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">{categoria.nombre}</h2>
                  <span className="text-sm text-slate-500">{pccsCat.length} PCCs</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {pccsCat.map(pcc => (
                    <div key={pcc.id_pcc} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {pcc.id_pcc}
                          </span>
                          <h3 className="font-semibold text-slate-900 truncate">{pcc.nombre_pcc}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded font-medium ${
                            pcc.tipo_control === 'NUMERICO' ? 'bg-cyan-50 text-cyan-700' :
                            pcc.tipo_control === 'CUALITATIVO' ? 'bg-purple-50 text-purple-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {pcc.tipo_control}
                          </span>
                          {pcc.limite_min !== null && pcc.limite_max !== null && (
                            <span className="text-slate-600">
                              Rango: {pcc.limite_min} - {pcc.limite_max} {pcc.unidad || ''}
                            </span>
                          )}
                          <span className="text-slate-500">
                            🕐 {pcc.frecuencia || 'Diaria'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalEditar(pcc)}
                          className="p-2 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => eliminarPCC(pcc.id_pcc, pcc.nombre_pcc)}
                          className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalAbierto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {pccEditando ? 'Editar PCC' : 'Crear Nuevo PCC'}
              </h2>
              <button onClick={() => setModalAbierto(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className={pccEditando ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ID del PCC {pccEditando ? '(no editable)' : '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.id_pcc || ''}
                    onChange={(e) => setFormData({ ...formData, id_pcc: e.target.value })}
                    disabled={!!pccEditando}
                    placeholder="Ej: PCC_99"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none disabled:bg-slate-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nombre del PCC *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre_pcc || ''}
                    onChange={(e) => setFormData({ ...formData, nombre_pcc: e.target.value })}
                    placeholder="Ej: Temp. Cámara Frío Producción"
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Categoría *
                  </label>
                  <select
                    value={formData.categoria_id || ''}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Tipo de Control *
                  </label>
                  <select
                    value={formData.tipo_control || 'NUMERICO'}
                    onChange={(e) => setFormData({ ...formData, tipo_control: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  >
                    <option value="NUMERICO">Numérico (con rango)</option>
                    <option value="CUALITATIVO">Cualitativo (Sí/No)</option>
                    <option value="PROCESO">Proceso (descripción)</option>
                  </select>
                </div>

                {formData.tipo_control === 'NUMERICO' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Límite Mínimo
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.limite_min ?? ''}
                        onChange={(e) => setFormData({ ...formData, limite_min: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Ej: 0"
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Límite Máximo
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.limite_max ?? ''}
                        onChange={(e) => setFormData({ ...formData, limite_max: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="Ej: 5"
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Unidad
                      </label>
                      <input
                        type="text"
                        value={formData.unidad || ''}
                        onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                        placeholder="Ej: °C, %, PPM"
                        className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Frecuencia
                  </label>
                  <select
                    value={formData.frecuencia || 'Diaria'}
                    onChange={(e) => setFormData({ ...formData, frecuencia: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none"
                  >
                    <option value="Cada hora">Cada hora</option>
                    <option value="Cada 2h">Cada 2h</option>
                    <option value="Cada 4h">Cada 4h</option>
                    <option value="Diaria">Diaria</option>
                    <option value="1 vez/semana">1 vez/semana</option>
                    <option value="Por entrega">Por entrega</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.descripcion || ''}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={2}
                    placeholder="Descripción del punto de control..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPCC}
                disabled={guardando || !formData.id_pcc || !formData.nombre_pcc || !formData.categoria_id}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {guardando ? 'Guardando...' : pccEditando ? 'Guardar Cambios' : 'Crear PCC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
