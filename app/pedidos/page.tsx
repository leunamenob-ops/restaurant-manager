'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function PedidosPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [buscando, setBuscando] = useState(false);

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
  }

  function logout() {
    setUsuario(null);
    setCodigo('');
    setPin('');
    setCarrito([]);
  }

  // Cargar proveedores al iniciar
  useEffect(() => {
    if (!usuario) return;

    async function cargarProveedores() {
      const { data } = await supabase
        .from('proveedores')
        .select('id, nombre')
        .order('nombre');
      
      if (data) setProveedores(data);
    }

    cargarProveedores();
  }, [usuario]);

  // Búsqueda combinada (texto + proveedor)
  useEffect(() => {
    if (!usuario) return;

    async function buscarProductos() {
      setBuscando(true);
      
      let query = supabase
        .from('ingredientes')
        .select(`
          id,
          nombre,
          categoria,
          unidad_compra,
          precio_compra_actual,
          proveedor_id,
          proveedores (nombre)
        `)
        .order('nombre')
        .limit(100);

      // Filtro por proveedor (si está seleccionado)
      if (filtroProveedor) {
        query = query.eq('proveedor_id', filtroProveedor);
      }

      // Filtro por texto (si hay búsqueda)
      if (busqueda && busqueda.length >= 2) {
        query = query.or(
          `nombre.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%`
        );
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error en búsqueda:', error);
      }
      
      if (data) {
        // Filtrar duplicados y productos sin nombre
        const filtrados = data.filter((p, index, self) => 
          p.nombre && p.nombre.trim() !== '' &&
          self.findIndex(item => item.id === p.id) === index
        );
        setProductos(filtrados);
      }
      
      setBuscando(false);
    }

    const timer = setTimeout(buscarProductos, 300);
    return () => clearTimeout(timer);
  }, [usuario, busqueda, filtroProveedor]);

  // Añadir al carrito
  async function añadirAlCarrito(producto: any, cantidad: number) {
    const existente = carrito.find(item => item.id === producto.id);
    
    if (existente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + cantidad }
          : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad }]);
    }
  }

  function eliminarDelCarrito(id: string) {
    setCarrito(carrito.filter(item => item.id !== id));
  }

  function actualizarCantidad(id: string, cantidad: number) {
    if (cantidad <= 0) {
      eliminarDelCarrito(id);
      return;
    }
    setCarrito(carrito.map(item =>
      item.id === id ? { ...item, cantidad: Math.max(1, cantidad) } : item
    ));
  }

  // Calcular totales por proveedor
  function calcularTotalesPorProveedor() {
    const porProveedor: any = {};
    
    carrito.forEach(item => {
      const provNombre = item.proveedores?.nombre || 'Sin proveedor';
      if (!porProveedor[provNombre]) {
        porProveedor[provNombre] = {
          items: [],
          total: 0,
          totalUnidades: 0
        };
      }
      
      const precioUnitario = parseFloat(item.precio_compra_actual) || 0;
      const subtotal = precioUnitario * item.cantidad;
      
      porProveedor[provNombre].items.push({
        ...item,
        precioUnitario,
        subtotal
      });
      
      porProveedor[provNombre].total += subtotal;
      porProveedor[provNombre].totalUnidades += item.cantidad;
    });
    
    return porProveedor;
  }

  const totalGeneral = carrito.reduce((sum, item) => {
    const precio = parseFloat(item.precio_compra_actual) || 0;
    return sum + (precio * item.cantidad);
  }, 0);

  const totalUnidades = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  async function enviarPedido() {
    if (carrito.length === 0) return;
  
    setEnviando(true);
  
    try {
      const porProveedor = calcularTotalesPorProveedor();
      const numeroPedido = `PED-${Date.now()}`;
      const fecha = new Date().toLocaleString('es-ES');
  
      for (const [provNombre, data] of Object.entries(porProveedor) as any[]) {
        const { data: provData } = await supabase
          .from('proveedores')
          .select('id, email')
          .eq('nombre', provNombre)
          .single();
  
        const { data: pedidoData, error: pedidoError } = await supabase
          .from('pedidos')
          .insert({
            numero_pedido: numeroPedido,
            proveedor_id: provData?.id,
            proveedor_nombre: provNombre,
            proveedor_email: provData?.email,
            usuario_nombre: usuario.nombre,
            total_articulos: data.items.length,
            estado: 'enviado'
          })
          .select()
          .single();
  
        if (pedidoError) {
          console.error('Error guardando pedido:', pedidoError);
          continue;
        }
  
        if (pedidoData) {
          for (const item of data.items) {
            await supabase.from('pedido_items').insert({
              pedido_id: pedidoData.id,
              ingrediente_id: item.id,
              codigo: item.codigo || '',
              descripcion: item.nombre,
              cantidad_pedida: item.cantidad,
              cantidad_recibida: 0,
              unidad: item.unidad_compra,
              estado: 'pendiente'
            });
          }
  
          // Intentar enviar email (sin bloquear si falla)
          if (provData?.email) {
            fetch('/api/enviar-pedido', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                proveedor: provNombre,
                email: provData.email,
                numeroPedido,
                fecha,
                items: data.items.map((i: any) => ({
                  codigo: i.codigo || '',
                  descripcion: i.nombre,
                  cantidad: i.cantidad,
                  unidad: i.unidad_compra,
                  precio: i.precioUnitario,
                  subtotal: i.subtotal
                })),
                usuario: usuario.nombre,
                total: data.total
              })
            }).catch(err => console.error('Error enviando email:', err));
          }
        }
      }
  
      alert(`✅ Pedido ${numeroPedido} guardado correctamente`);
      setCarrito([]);
      setMostrarCarrito(false);
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al enviar el pedido');
    } finally {
      setEnviando(false);
    }
  }

  // LOGIN
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
              <span className="text-3xl">🛒</span>
            </div>
            <h1 className="text-3xl font-bold text-teal-700 mb-2">Gestión de Pedidos</h1>
            <p className="text-gray-500 text-sm">Sistema profesional de aprovisionamiento</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Código de usuario</label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: A0001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PIN (4 dígitos)</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-200">
                {error}
              </div>
            )}

            <button
              onClick={login}
              className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition shadow-md hover:shadow-lg"
            >
              Ingresar al Sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalesPorProveedor = calcularTotalesPorProveedor();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span>🛒</span>
                <span>Gestión de Pedidos</span>
              </h1>
              <p className="text-teal-100 text-sm">{usuario.nombre}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarCarrito(true)}
                className="relative bg-white text-teal-700 px-4 py-2 rounded-lg font-semibold hover:bg-teal-50 transition shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <span>🛒</span>
                  <span className="hidden sm:inline">Carrito</span>
                </span>
                {carrito.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold shadow-md animate-pulse">
                    {carrito.length}
                  </span>
                )}
              </button>
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

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* BUSCADORES - Texto + Proveedor */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Buscador de texto */}
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar producto o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>
            </div>

            {/* Filtro de proveedor */}
            <div className="w-full sm:w-72">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></span>
                <select
                  value={filtroProveedor}
                  onChange={(e) => setFiltroProveedor(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                >
                  <option value="">Todos los proveedores</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              {buscando ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Buscando...
                </span>
              ) : (
                <span className="font-medium">{productos.length} productos encontrados</span>
              )}
            </p>
            {(busqueda || filtroProveedor) && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setFiltroProveedor('');
                }}
                className="text-sm text-teal-600 hover:text-teal-800 font-medium hover:underline transition"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Resultados */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>📋</span>
              <span>{busqueda || filtroProveedor ? 'Resultados filtrados' : 'Todos los productos'}</span>
            </h2>
            {filtroProveedor && (
              <p className="text-sm text-teal-700 mt-1 font-medium">
                🏭 {proveedores.find(p => p.id === filtroProveedor)?.nombre}
              </p>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {buscando ? (
              <div className="p-12 text-center text-gray-500">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p>Cargando productos...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <div className="text-6xl mb-4"></div>
                <p className="text-lg">No se encontraron productos</p>
                {busqueda && <p className="text-sm mt-2">Prueba con otra búsqueda o limpia los filtros</p>}
              </div>
            ) : (
              productos.map((producto) => (
                <div key={producto.id} className="p-4 hover:bg-teal-50/30 transition group">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg group-hover:text-teal-700 transition">
                        {producto.nombre}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          {producto.categoria}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {producto.unidad_compra}
                        </span>
                      </div>
                      {producto.proveedores?.nombre && (
                        <p className="text-sm text-teal-700 font-medium mt-2 flex items-center gap-1">
                          <span>📦</span>
                          {producto.proveedores.nombre}
                        </p>
                      )}
                      {producto.precio_compra_actual && (
                        <p className="text-base text-emerald-600 font-bold mt-1">
                          💰 {parseFloat(producto.precio_compra_actual).toFixed(2)}€ / {producto.unidad_compra}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none">
                        <input
                          type="number"
                          min="1"
                          defaultValue="1"
                          id={`qty-${producto.id}`}
                          className="w-full sm:w-20 px-3 py-2.5 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const qty = parseInt((document.getElementById(`qty-${producto.id}`) as HTMLInputElement)?.value || '1');
                          añadirAlCarrito(producto, qty);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition shadow-sm hover:shadow-md"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Carrito */}
      {mostrarCarrito && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-md">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>🛒</span>
                <span>Mi Pedido</span>
              </h2>
              <button
                onClick={() => setMostrarCarrito(false)}
                className="text-white hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center transition"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {carrito.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="text-7xl mb-4">🛒</div>
                  <p className="text-lg font-medium">El carrito está vacío</p>
                  <p className="text-sm mt-2">Añade productos para comenzar tu pedido</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(totalesPorProveedor).map(([provNombre, data]: [string, any]) => (
                    <div key={provNombre} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 border-b">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span>📦</span>
                            {provNombre}
                          </h3>
                          <span className="text-sm text-gray-600 font-medium">
                            {data.items.length} productos • {data.totalUnidades} und.
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {data.items.map((item: any) => (
                          <div key={item.id} className="p-3 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm text-gray-900">{item.nombre}</h4>
                                <p className="text-xs text-gray-600 mt-0.5">
                                  {item.unidad_compra} • {item.precioUnitario.toFixed(2)}€/ud
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold flex items-center justify-center transition"
                                >
                                  −
                                </button>
                                <span className="w-12 text-center font-semibold text-sm py-1">{item.cantidad}</span>
                                <button
                                  onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold flex items-center justify-center transition"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => eliminarDelCarrito(item.id)}
                                  className="ml-2 text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition"
                                  title="Eliminar producto"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="text-right mt-2">
                              <p className="text-sm font-bold text-emerald-600">
                                Subtotal: {item.subtotal.toFixed(2)}€
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-emerald-50 p-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-700">Total {provNombre}:</span>
                          <span className="font-bold text-emerald-700 text-lg">{data.total.toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-700 text-lg">Total General:</span>
                      <p className="text-sm text-gray-600 mt-1">{totalUnidades} unidades • {carrito.length} productos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700 text-2xl">{totalGeneral.toFixed(2)}€</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={enviarPedido}
                  disabled={enviando}
                  className="w-full py-4 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition disabled:bg-gray-400 shadow-lg hover:shadow-xl"
                >
                  {enviando ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Enviando pedido...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>📤</span>
                      Enviar Pedido a Proveedores
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}