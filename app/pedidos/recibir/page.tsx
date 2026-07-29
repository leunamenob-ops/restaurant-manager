'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RecibirPedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('pendientes');

  // Cargar pedidos (Sin login, acceso directo)
  async function cargarPedidos() {
    let query = supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false }) // CORRECCIÓN: Usar created_at es más seguro en Supabase
      .limit(50);

    if (filtro === 'pendientes') {
      query = query.eq('estado', 'enviado');
    }

    const { data } = await query;
    if (data) setPedidos(data);
  }

  async function cargarItems(pedidoId: string) {
    const { data } = await supabase
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('descripcion');

    if (data) {
      setItems(data);
      setPedidoSeleccionado(pedidoId);
    }
  }

  async function actualizarCantidad(itemId: string, cantidad: number, estado: string) {
    const { error } = await supabase
      .from('pedido_items')
      .update({
        cantidad_recibida: cantidad,
        estado: estado,
        observaciones: estado === 'no_entregado' ? 'Producto no entregado' : 
                      estado === 'parcial' ? 'Cantidad parcial recibida' : null
      })
      .eq('id', itemId);

    if (!error) cargarItems(pedidoSeleccionado);
  }

  async function marcarComoRecibido() {
    if (!pedidoSeleccionado) return;
    setLoading(true);

    const itemsPendientes = items.filter(item => item.estado === 'pendiente');
    if (itemsPendientes.length > 0) {
      alert('⚠️ Hay productos pendientes de verificar. Por favor, revisa todos los artículos.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'recibido' })
      .eq('id', pedidoSeleccionado);

    if (!error) {
      alert('✅ Pedido marcado como recibido correctamente');
      setPedidoSeleccionado(null);
      cargarPedidos();
    }
    setLoading(false);
  }

  function generarReclamacion() {
    if (!pedidoSeleccionado) return;

    const itemsReclamacion = items.filter(item => 
      item.estado === 'no_entregado' || 
      item.estado === 'parcial' ||
      (item.cantidad_recibida !== item.cantidad_pedida)
    );

    if (itemsReclamacion.length === 0) {
      alert('No hay productos con incidencias para reclamar.');
      return;
    }

    const pedido = pedidos.find(p => p.id === pedidoSeleccionado);
    let texto = `RECLAMACIÓN DE PEDIDO\n\n`;
    texto += `Pedido: ${pedido?.numero_pedido || pedidoSeleccionado}\n`;
    texto += `Proveedor: ${pedido?.proveedor_nombre || 'N/A'}\n`;
    texto += `Fecha: ${new Date().toLocaleString('es-ES')}\n\n`;
    texto += `Productos a reclamar:\n\n`;

    itemsReclamacion.forEach(item => {
      texto += `• ${item.descripcion}\n`;
      texto += `  - Pedido: ${item.cantidad_pedida} ${item.unidad}\n`;
      texto += `  - Recibido: ${item.cantidad_recibida || 0} ${item.unidad}\n`;
      if (item.estado === 'no_entregado') texto += `  - Estado: NO ENTREGADO\n`;
      else if (item.estado === 'parcial') texto += `  - Estado: PARCIAL\n`;
      if (item.observaciones) texto += `  - Obs: ${item.observaciones}\n`;
      texto += `\n`;
    });

    navigator.clipboard.writeText(texto);
    alert('📋 Reclamación copiada al portapapeles. Pégala en un email o WhatsApp.');
  }

  useEffect(() => {
    cargarPedidos();
  }, [filtro]);

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
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Recepción de Pedidos</h1>
                <p className="text-sm text-slate-500">Control de calidad y albaranes</p>
              </div>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              >
                <option value="pendientes">Pendientes</option>
                <option value="todos">Historial Completo</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!pedidoSeleccionado ? (
          /* LISTA DE PEDIDOS */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">
                {filtro === 'pendientes' ? 'Pedidos Pendientes de Recepción' : 'Historial de Pedidos'}
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {pedidos.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  <p className="text-lg font-medium">No hay pedidos {filtro === 'pendientes' ? 'pendientes' : 'registrados'}</p>
                </div>
              ) : (
                pedidos.map((pedido) => (
                  <div key={pedido.id} className="p-5 hover:bg-emerald-50/30 transition group">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-slate-900">{pedido.numero_pedido}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            pedido.estado === 'enviado' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            pedido.estado === 'recibido' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {pedido.estado === 'enviado' ? '📤 Enviado' : pedido.estado === 'recibido' ? '✅ Recibido' : pedido.estado}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 flex items-center gap-2">
                          <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          <span className="font-medium text-slate-900">{pedido.proveedor_nombre}</span>
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          📅 {new Date(pedido.created_at || pedido.fecha).toLocaleString('es-ES')} • 👤 {pedido.usuario_nombre}
                        </p>
                      </div>

                      {pedido.estado === 'enviado' && (
                        <button
                          onClick={() => cargarItems(pedido.id)}
                          className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" /></svg>
                          Verificar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* DETALLE DEL PEDIDO - VERIFICACIÓN */
          <div className="space-y-6">
            <button
              onClick={() => { setPedidoSeleccionado(null); setItems([]); }}
              className="text-slate-600 hover:text-emerald-600 font-medium flex items-center gap-1 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Volver al listado
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold mb-4 text-slate-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Verificación de Pedido
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <p className="text-slate-600">Pedido: <strong className="text-slate-900">{pedidoSeleccionado}</strong></p>
                  <p className="text-slate-600">Proveedor: <strong className="text-cyan-700">{items[0]?.proveedor_nombre || '-'}</strong></p>
                </div>
                <div>
                  <p className="text-slate-600">Total items: <strong className="text-slate-900">{items.length}</strong></p>
                  <p className="text-slate-600">
                    Verificados: <strong className="text-emerald-600">{items.filter(i => i.estado === 'recibido').length} / {items.length}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">Productos a Verificar</h3>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="p-5 hover:bg-slate-50/50 transition">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-slate-900">{item.descripcion}</h4>
                        <p className="text-sm text-slate-500 mt-1">
                          Código: <span className="font-mono text-slate-700">{item.codigo || 'N/A'}</span> • Unidad: {item.unidad}
                        </p>
                      </div>
                      <div className="text-right bg-slate-100 px-4 py-2 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Solicitado</p>
                        <p className="text-xl font-bold text-cyan-700">{item.cantidad_pedida} <span className="text-sm font-normal text-slate-600">{item.unidad}</span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cantidad recibida:</label>
                        <input
                          type="number"
                          min="0"
                          value={item.cantidad_recibida || 0}
                          onChange={(e) => {
                            const cantidad = parseInt(e.target.value) || 0;
                            let estado = item.estado;
                            if (cantidad === 0) estado = 'no_entregado';
                            else if (cantidad < item.cantidad_pedida) estado = 'parcial';
                            else if (cantidad >= item.cantidad_pedida) estado = 'recibido';
                            actualizarCantidad(item.id, cantidad, estado);
                          }}
                          className="w-full sm:w-40 px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado:</label>
                        <select
                          value={item.estado}
                          onChange={(e) => actualizarCantidad(item.id, item.cantidad_recibida || 0, e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-lg font-semibold border outline-none focus:ring-2 transition ${
                            item.estado === 'recibido' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500' :
                            item.estado === 'parcial' ? 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500' :
                            item.estado === 'no_entregado' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500' :
                            'bg-slate-50 text-slate-700 border-slate-300 focus:ring-slate-500'
                          }`}
                        >
                          <option value="pendiente">⏳ Pendiente de revisar</option>
                          <option value="recibido">✅ Recibido conforme</option>
                          <option value="parcial">⚠️ Parcial</option>
                          <option value="no_entregado">❌ No entregado</option>
                        </select>
                      </div>
                    </div>

                    {item.observaciones && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span>{item.observaciones}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={marcarComoRecibido}
                disabled={loading}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {loading ? 'Procesando...' : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Marcar Pedido como Recibido
                  </>
                )}
              </button>
              <button
                onClick={generarReclamacion}
                className="flex-1 py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold text-lg hover:bg-red-50 hover:border-red-300 transition shadow-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Generar Reclamación
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
