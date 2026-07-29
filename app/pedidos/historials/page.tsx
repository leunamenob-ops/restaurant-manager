'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function HistorialPedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);

  useEffect(() => {
    cargarPedidos();
  }, [filtro]);

  async function cargarPedidos() {
    setLoading(true);
    
    let query = supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtro === 'pendientes') {
      query = query.eq('estado', 'enviado');
    } else if (filtro === 'recibidos') {
      query = query.eq('estado', 'recibido');
    }

    const { data } = await query;
    if (data) {
      setPedidos(data);
    }
    setLoading(false);
  }

  async function verDetalle(pedido: any) {
    // Cargar items del pedido
    const { data: items } = await supabase
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', pedido.id)
      .order('descripcion');
    
    setPedidoSeleccionado({ ...pedido, items: items || [] });
  }

  function imprimirOrdenCompra(pedido: any) {
    const ventana = window.open('', '_blank');
    if (!ventana) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Orden de Compra ${pedido.numero_pedido}</title>
        <style>
          @media print {
            .no-print { display: none; }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px;
            color: #1f2937;
          }
          .header { 
            background: linear-gradient(135deg, #059669 0%, #0891b2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .info { 
            background: #f9fafb; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th { 
            background: #059669; 
            color: white; 
            padding: 12px; 
            text-align: left;
          }
          td { 
            padding: 12px; 
            border-bottom: 1px solid #e5e7eb;
          }
          .total { 
            background: #f0fdf4; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: right; 
            margin-top: 20px;
          }
          .total-amount { 
            font-size: 28px; 
            color: #059669; 
            font-weight: bold;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
          }
          .firma {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          .firma-linea {
            border-top: 1px solid #9ca3af;
            width: 250px;
            padding-top: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin:0;">ORDEN DE COMPRA</h1>
          <p style="margin:5px 0 0;opacity:0.9;">${pedido.numero_pedido}</p>
        </div>
        
        <div class="info">
          <div class="info-row">
            <span><strong>Fecha:</strong> ${new Date(pedido.fecha).toLocaleString('es-ES')}</span>
            <span><strong>Proveedor:</strong> ${pedido.proveedor_nombre}</span>
          </div>
          <div class="info-row">
            <span><strong>Restaurante:</strong> ${pedido.usuario_nombre}</span>
            <span><strong>Estado:</strong> ${pedido.estado.toUpperCase()}</span>
          </div>
        </div>

        <h2>Productos Solicitados:</h2>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style="text-align:center;">Cantidad</th>
              <th style="text-align:center;">Unidad</th>
              <th style="text-align:right;">Precio Unit.</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${pedido.items.map((item: any) => `
              <tr>
                <td><strong>${item.descripcion}</strong></td>
                <td style="text-align:center;">${item.cantidad_pedida}</td>
                <td style="text-align:center;">${item.unidad}</td>
                <td style="text-align:right;">${item.cantidad_pedida > 0 ? (item.cantidad_pedida > 0 ? (parseFloat(item.cantidad_pedida) > 0 ? ((pedido.total_estimado || 0) / pedido.total_articulos / item.cantidad_pedida).toFixed(2) : '0.00') : '0.00') : '0.00'} €</td>
                <td style="text-align:right;font-weight:bold;color:#059669;">${((pedido.total_estimado || 0) / pedido.total_articulos).toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <p style="font-size:14px;color:#059669;margin:0;">TOTAL ESTIMADO</p>
          <p class="total-amount" style="margin:5px 0 0;">${(pedido.total_estimado || 0).toFixed(2)} €</p>
        </div>

        <div class="firma">
          <div class="firma-linea">
            <p>Firma Proveedor</p>
          </div>
          <div class="firma-linea">
            <p>Recibido por KOST Software</p>
          </div>
        </div>

        <div class="footer">
          <p>KOST Software - Restaurant Manager</p>
          <p>kostsoftware.com</p>
        </div>

        <div class="no-print" style="margin-top:30px;text-align:center;">
          <button onclick="window.print()" style="padding:15px 30px;background:#059669;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">🖨️ Imprimir Orden de Compra</button>
        </div>
      </body>
      </html>
    `;

    ventana.document.write(html);
    ventana.document.close();
  }

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
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Historial de Pedidos</h1>
                <p className="text-sm text-slate-500">Consulta y gestión de pedidos enviados</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/pedidos')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Pedido
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!pedidoSeleccionado ? (
          <>
            {/* FILTROS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por número de pedido..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFiltro('todos')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filtro === 'todos' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltro('pendientes')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filtro === 'pendientes' 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => setFiltro('recibidos')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filtro === 'recibidos' 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Recibidos
                  </button>
                </div>
              </div>
            </div>

            {/* LISTA DE PEDIDOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">
                  {filtro === 'todos' ? 'Todos los Pedidos' : 
                   filtro === 'pendientes' ? 'Pedidos Pendientes' : 'Pedidos Recibidos'}
                  <span className="text-sm text-slate-500 ml-2">({pedidos.length})</span>
                </h2>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-12 text-center text-slate-500">
                    <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-emerald-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <p>Cargando pedidos...</p>
                  </div>
                ) : pedidos.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <p className="text-lg font-medium">No hay pedidos</p>
                  </div>
                ) : (
                  pedidos.map((pedido) => (
                    <div 
                      key={pedido.id} 
                      className="p-5 hover:bg-emerald-50/30 transition cursor-pointer group"
                      onClick={() => verDetalle(pedido)}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition">
                              {pedido.numero_pedido}
                            </h3>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              pedido.estado === 'enviado' 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {pedido.estado === 'enviado' ? '📤 Enviado' : '✅ Recibido'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 flex items-center gap-2">
                            <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-medium">{pedido.proveedor_nombre}</span>
                          </p>
                          <p className="text-sm text-slate-500 mt-1">
                            📅 {new Date(pedido.fecha).toLocaleString('es-ES')} • 
                            📦 {pedido.total_articulos} items • 
                            💰 {(pedido.total_estimado || 0).toFixed(2)} €
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition flex items-center gap-2">
                          Ver Detalle
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* DETALLE DEL PEDIDO */
          <div className="space-y-6">
            <button
              onClick={() => setPedidoSeleccionado(null)}
              className="text-slate-600 hover:text-emerald-600 font-medium flex items-center gap-1 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al historial
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{pedidoSeleccionado.numero_pedido}</h2>
                  <p className="text-slate-500 mt-1">
                    {new Date(pedidoSeleccionado.fecha).toLocaleString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={() => imprimirOrdenCompra(pedidoSeleccionado)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir Orden de Compra
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg mb-6">
                <div>
                  <p className="text-sm text-slate-600">Proveedor: <strong className="text-slate-900">{pedidoSeleccionado.proveedor_nombre}</strong></p>
                  <p className="text-sm text-slate-600">Email: <strong className="text-slate-900">{pedidoSeleccionado.proveedor_email || 'N/A'}</strong></p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Estado: <strong className={`
                    ${pedidoSeleccionado.estado === 'enviado' ? 'text-amber-600' : 'text-emerald-600'}
                  `}>{pedidoSeleccionado.estado.toUpperCase()}</strong></p>
                  <p className="text-sm text-slate-600">Total items: <strong className="text-slate-900">{pedidoSeleccionado.total_articulos}</strong></p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-800 mb-4">Productos del Pedido:</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-emerald-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Descripción</th>
                      <th className="px-4 py-3 text-center">Cantidad</th>
                      <th className="px-4 py-3 text-center">Unidad</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pedidoSeleccionado.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.descripcion}</td>
                        <td className="px-4 py-3 text-center">{item.cantidad_pedida}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.unidad}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.estado === 'recibido' ? 'bg-emerald-100 text-emerald-800' :
                            item.estado === 'parcial' ? 'bg-amber-100 text-amber-800' :
                            item.estado === 'no_entregado' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-lg font-semibold text-emerald-800 text-right">
                  Total Estimado: {(pedidoSeleccionado.total_estimado || 0).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
