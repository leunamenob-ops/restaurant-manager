'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ProveedoresPage() {
  const router = useRouter();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [proveedorEditando, setProveedorEditando] = useState<any>(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    setLoading(true);
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('nombre');

    if (error) {
      console.error('Error cargando proveedores:', error);
    } else {
      setProveedores(data || []);
    }
    setLoading(false);
  }

  async function guardarProveedor() {
    if (!proveedorEditando.nombre || !proveedorEditando.email) {
      alert('Nombre y email son obligatorios');
      return;
    }

    try {
      const { error } = await supabase
        .from('proveedores')
        .update({
          nombre: proveedorEditando.nombre,
          codigo: proveedorEditando.codigo,
          contacto: proveedorEditando.contacto,
          telefono: proveedorEditando.telefono,
          email: proveedorEditando.email,
          hotel_id: proveedorEditando.hotel_id
        })
        .eq('id', proveedorEditando.id);

      if (error) throw error;

      setMostrarModal(false);
      setProveedorEditando(null);
      cargarProveedores();
      alert('✅ Proveedor actualizado correctamente');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function eliminarProveedor(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el proveedor "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      cargarProveedores();
      alert('✅ Proveedor eliminado');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  function abrirEditar(proveedor: any) {
    setProveedorEditando({ ...proveedor });
    setMostrarModal(true);
  }

  const proveedoresFiltrados = proveedores.filter((p) => {
    const busquedaLower = busqueda.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(busquedaLower) ||
      p.email?.toLowerCase().includes(busquedaLower) ||
      p.codigo?.toLowerCase().includes(busquedaLower)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Proveedores</h1>
                <p className="text-sm text-slate-500">{proveedores.length} proveedores registrados</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/productos')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a Productos
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* BUSCADOR */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder=" Buscar por nombre, email o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
        </div>

        {/* TABLA DE PROVEEDORES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hotel ID</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600"></div>
                      <p className="text-slate-600 font-medium mt-3">Cargando proveedores...</p>
                    </td>
                  </tr>
                ) : proveedoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <p className="text-lg font-medium">No se encontraron proveedores</p>
                      <p className="text-sm mt-1">Prueba con otra búsqueda</p>
                    </td>
                  </tr>
                ) : (
                  proveedoresFiltrados.map((prov) => (
                    <tr key={prov.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{prov.nombre}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{prov.codigo || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{prov.contacto || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{prov.telefono || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <a href={`mailto:${prov.email}`} className="text-emerald-600 hover:text-emerald-700 hover:underline">
                          {prov.email || '-'}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono text-xs">{prov.hotel_id || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(prov)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => eliminarProveedor(prov.id, prov.nombre)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL EDITAR PROVEEDOR */}
      {mostrarModal && proveedorEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Editar Proveedor</h2>
              <button onClick={() => { setMostrarModal(false); setProveedorEditando(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={proveedorEditando.nombre || ''}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Código</label>
                <input
                  type="text"
                  value={proveedorEditando.codigo || ''}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, codigo: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Persona de contacto</label>
                  <input
                    type="text"
                    value={proveedorEditando.contacto || ''}
                    onChange={(e) => setProveedorEditando({...proveedorEditando, contacto: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={proveedorEditando.telefono || ''}
                    onChange={(e) => setProveedorEditando({...proveedorEditando, telefono: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={proveedorEditando.email || ''}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, email: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Hotel/Restaurante ID</label>
                <input
                  type="text"
                  value={proveedorEditando.hotel_id || ''}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, hotel_id: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={guardarProveedor}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold text-sm"
              >
                Guardar Cambios
              </button>
              <button
                onClick={() => { setMostrarModal(false); setProveedorEditando(null); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
