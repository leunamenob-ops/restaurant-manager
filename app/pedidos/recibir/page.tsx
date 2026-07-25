'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RecibirPedidosPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('pendientes'); // pendientes, todos

  // Login
  async function login() {
    if (!codigo || !pin) {
      setError('Ingresa código y PIN');
      return;
    }

    const { data, error } = await supabase
      .from('usuarios_cocina')
      .select('*')
      .eq('codigo', codigo)
      .eq('pin', pin)
      .eq('activo', true)
      .single();

    if (error || !data) {
      setError('Código o PIN incorrecto');
      return;
    }

    setUsuario(data);
    setError('');
    cargarPedidos();
  }

  // Logout
  function logout() {
    setUsuario(null);
    setCodigo('');
    setPin('');
  }

  // Cargar pedidos
  async function cargarPedidos() {
    let query = supabase
      .from('pedidos')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(50);

    if (filtro === 'pendientes') {
      query = query.eq('estado', 'enviado');
    }

    const { data } = await query;
    if (data) setPedidos(data);
  }

  // Cargar items del pedido
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

  // Actualizar cantidad recibida
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

    if (!error) {
      cargarItems(pedidoSeleccionado);
    }
  }

  // Marcar pedido como recibido
  async function marcarComoRecibido() {
    if (!pedidoSeleccionado) return;

    setLoading(true);

    // Verificar si todos los items están marcados
    const itemsPendientes = items.filter(item => item.estado === 'pendiente');
    
    if (itemsPendientes.length > 0) {
      alert('Hay productos pendientes de verificar. Por favor, marca todos los productos.');
      setLoading(false);
      return;
    }

    // Actualizar estado del pedido
    const { error } = await supabase
      .from('pedidos')
      .update({
        estado: 'recibido'
      })
      .eq('id', pedidoSeleccionado);

    if (!error) {
      alert('Pedido marcado como recibido correctamente');
      setPedidoSeleccionado(null);
      cargarPedidos();
    }

    setLoading(false);
  }

  // Generar reclamación
  async function generarReclamacion() {
    if (!pedidoSeleccionado) return;

    const itemsReclamacion = items.filter(item => 
      item.estado === 'no_entregado' || 
      item.estado === 'parcial' ||
      (item.cantidad_recibida !== item.cantidad_pedida)
    );

    if (itemsReclamacion.length === 0) {
      alert('No hay productos para reclamar');
      return;
    }

    // Crear texto de reclamación
    let texto = `RECLAMACIÓN DE PEDIDO\n\n`;
    texto += `Pedido: ${pedidoSeleccionado}\n`;
    texto += `Fecha: ${new Date().toLocaleString()}\n\n`;
    texto += `Productos a reclamar:\n\n`;

    itemsReclamacion.forEach(item => {
      texto += `• ${item.descripcion}\n`;
      texto += `  - Pedido: ${item.cantidad_pedida} ${item.unidad}\n`;
      texto += `  - Recibido: ${item.cantidad_recibida} ${item.unidad}\n`;
      if (item.estado === 'no_entregado') {
        texto += `  - Estado: NO ENTREGADO\n`;
      } else if (item.estado === 'parcial') {
        texto += `  - Estado: PARCIAL\n`;
      }
      if (item.observaciones) {
        texto += `  - Observaciones: ${item.observaciones}\n`;
      }
      texto += `\n`;
    });

    // Copiar al portapapeles
    navigator.clipboard.writeText(texto);
    alert('Reclamación copiada al portapapeles. Pégala en un email o documento.');
  }

  useEffect(() => {
    if (usuario) {
      cargarPedidos();
    }
  }, [usuario, filtro]);

  // Si no hay usuario, mostrar login
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-700 mb-2">📦 Recepción de Pedidos</h1>
            <p className="text-gray-600">Hotel Bonanza **Playa**</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de usuario
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: A0001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN (4 dígitos)
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {error && (
              <div className="bg-teal-50 text-teal-700 p-3 rounded-lg text-sm border border-teal-200">
                {error}
              </div>
            )}

            <button
              onClick={login}
              className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition shadow-md"
            >
              Ingresar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Página principal
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">📦 Recepción de Pedidos</h1>
              <p className="text-teal-100 text-sm">{usuario.nombre}</p>
            </div>
            <div className="flex gap-3">
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/20 text-white font-semibold border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="pendientes" className="text-gray-800">Pendientes</option>
                <option value="todos" className="text-gray-800">Todos</option>
              </select>
              <button
                onClick={logout}
                className="bg-white/20 text-white px-4 py-2 rounded-lg font-semibold hover:bg-white/30 transition border border-white/30"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {!pedidoSeleccionado ? (
          /* Lista de pedidos */
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-700">
                {filtro === 'pendientes' ? 'Pedidos Pendientes de Recepción' : 'Historial de Pedidos'}
              </h2>
            </div>

            <div className="divide-y">
              {pedidos.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No hay pedidos {filtro === 'pendientes' ? 'pendientes' : ''}</p>
                </div>
              ) : (
                pedidos.map((pedido) => (
                  <div key={pedido.id} className="p-4 hover:bg-teal-50/50 transition">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-800">{pedido.numero_pedido}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            pedido.estado === 'enviado' ? 'bg-amber-100 text-amber-700' :
                            pedido.estado === 'recibido' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {pedido.estado === 'enviado' ? '📤 Enviado' :
                             pedido.estado === 'recibido' ? '✅ Recibido' :
                             pedido.estado}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          📦 <span className="font-medium text-teal-700">{pedido.proveedor_nombre}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          📅 {new Date(pedido.fecha).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          👤 {pedido.usuario_nombre} • 📦 {pedido.total_articulos} artículos
                        </p>
                      </div>

                      {pedido.estado === 'enviado' && (
                        <button
                          onClick={() => cargarItems(pedido.id)}
                          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition shadow-sm"
                        >
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
          /* Detalle del pedido - Verificación */
          <div>
            <div className="mb-6">
              <button
                onClick={() => setPedidoSeleccionado(null)}
                className="text-teal-600 hover:text-teal-800 hover:underline font-semibold flex items-center gap-1 transition"
              >
                ← Volver a pedidos
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">🔍 Verificación de Pedido</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Pedido: <strong className="text-teal-700">{pedidoSeleccionado}</strong></p>
                  <p className="text-gray-600">Proveedor: <strong className="text-teal-700">{items[0]?.proveedor_nombre || '-'}</strong></p>
                </div>
                <div>
                  <p className="text-gray-600">Total items: <strong>{items.length}</strong></p>
                  <p className="text-gray-600">
                    Estado: <strong className="text-emerald-600">{items.filter(i => i.estado === 'recibido').length}/{items.length} verificados</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 border border-gray-100">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-700">Productos del Pedido</h3>
              </div>

              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50/50 transition">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-800">{item.descripcion}</h4>
                        <p className="text-sm text-gray-600">
                          Código: {item.codigo} • Unidad: {item.unidad}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Pedido: <strong className="text-teal-600">{item.cantidad_pedida} {item.unidad}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad recibida:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.cantidad_recibida || 0}
                          onChange={(e) => {
                            const cantidad = parseInt(e.target.value) || 0;
                            let estado = item.estado;
                            
                            if (cantidad === 0) {
                              estado = 'no_entregado';
                            } else if (cantidad < item.cantidad_pedida) {
                              estado = 'parcial';
                            } else if (cantidad >= item.cantidad_pedida) {
                              estado = 'recibido';
                            }

                            actualizarCantidad(item.id, cantidad, estado);
                          }}
                          className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>

                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estado:
                        </label>
                        <select
                          value={item.estado}
                          onChange={(e) => actualizarCantidad(item.id, item.cantidad_recibida || 0, e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg font-semibold border focus:outline-none focus:ring-2 ${
                            item.estado === 'recibido' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500' :
                            item.estado === 'parcial' ? 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500' :
                            item.estado === 'no_entregado' ? 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500' :
                            'bg-gray-50 text-gray-700 border-gray-200 focus:ring-gray-500'
                          }`}
                        >
                          <option value="pendiente">⏳ Pendiente</option>
                          <option value="recibido">✅ Recibido</option>
                          <option value="parcial">⚠️ Parcial</option>
                          <option value="no_entregado">❌ No entregado</option>
                        </select>
                      </div>
                    </div>

                    {item.observaciones && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                        <span>📝</span>
                        <span>{item.observaciones}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={marcarComoRecibido}
                disabled={loading}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition disabled:bg-gray-400 shadow-sm"
              >
                {loading ? 'Procesando...' : '✅ Marcar Pedido como Recibido'}
              </button>
              <button
                onClick={generarReclamacion}
                className="flex-1 py-4 bg-rose-600 text-white rounded-lg font-bold text-lg hover:bg-rose-700 transition shadow-sm"
              >
                📝 Generar Reclamación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}