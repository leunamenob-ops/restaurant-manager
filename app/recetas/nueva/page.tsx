'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface Ingrediente {
  id: string;
  nombre: string;
  unidad_compra: string;
  precio_compra_actual: number;
  proveedor_nombre: string;
  categoria: string;
}

interface SubReceta {
  id: string;
  nombre: string;
  coste_total: number;
  produccion_gramos: number | null;
  tipo: string;
}

interface ItemSeleccionado {
  tipo: 'ingrediente' | 'subreceta';
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costeUnitario: number;
  coste: number;
}

export default function NuevaReceta() {
  const router = useRouter();
  const [todosIngredientes, setTodosIngredientes] = useState<Ingrediente[]>([]);
  const [ingredientesFiltrados, setIngredientesFiltrados] = useState<Ingrediente[]>([]);
  const [subRecetas, setSubRecetas] = useState<SubReceta[]>([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'plato' | 'sub_receta'>('plato');
  const [porciones, setPorciones] = useState(1);
  const [produccionGramos, setProduccionGramos] = useState<number | ''>('');
  const [precioVenta, setPrecioVenta] = useState(0);
  const [ivaPorcentaje, setIvaPorcentaje] = useState(10);
  const [itemsSeleccionados, setItemsSeleccionados] = useState<ItemSeleccionado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [proveedoresUnicos, setProveedoresUnicos] = useState<string[]>([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>([]);
  const [mostrarFiltroProveedores, setMostrarFiltroProveedores] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<{tipo: 'ingrediente' | 'subreceta', id: string} | null>(null);
  const [cantidadActual, setCantidadActual] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [hotelId, setHotelId] = useState<string>('');
  
  const filtroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    filtrarIngredientes();
  }, [busqueda, proveedoresSeleccionados, todosIngredientes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(event.target as Node)) {
        setMostrarFiltroProveedores(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function cargarDatos() {
    // Obtener hotel_id del sessionStorage
    const storedHotelId = sessionStorage.getItem('hotel_id');
    if (storedHotelId) {
      setHotelId(storedHotelId);
    }

    // Cargar TODOS los ingredientes (no solo 1000)
    const { data: ingredientesData, error: ingredientesError } = await supabase
      .from('ingredientes')
      .select('id, nombre, unidad_compra, precio_compra_actual, proveedor_nombre, categoria')
      .order('nombre')
      .range(0, 10000);
    
    if (ingredientesError) {
      console.error('Error cargando ingredientes:', ingredientesError);
      return;
    }

    if (ingredientesData) {
      setTodosIngredientes(ingredientesData);
      
      // Extraer proveedores únicos (filtrar nulls y vacíos)
      const proveedores = Array.from(
        new Set(
          ingredientesData
            .map(i => i.proveedor_nombre)
            .filter(p => p && p.trim() !== '')
        )
      ) as string[];
      setProveedoresUnicos(proveedores.sort());
    }

    // Cargar sub-recetas existentes
    const { data: subRecetasData } = await supabase
      .from('recetas')
      .select('id, nombre, coste_total, produccion_gramos, tipo')
      .eq('tipo', 'sub_receta')
      .order('nombre');
    
    if (subRecetasData) setSubRecetas(subRecetasData);
  }

  function normalizarUnidad(unidad: string): string {
    // Normalizar unidades a: ud, gr, ml
    const unidadLower = unidad.toLowerCase().trim();
    
    if (unidadLower.includes('ud') || unidadLower.includes('unidad') || unidadLower.includes('pieza')) {
      return 'ud';
    }
    if (unidadLower.includes('kg') || unidadLower.includes('kilo') || unidadLower.includes('gr') || unidadLower.includes('gramo')) {
      return 'gr';
    }
    if (unidadLower.includes('l') || unidadLower.includes('litro') || unidadLower.includes('ml')) {
      return 'ml';
    }
    
    // Por defecto, mantener la original
    return unidad;
  }

  function filtrarIngredientes() {
    let filtrados = [...todosIngredientes];

    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      filtrados = filtrados.filter(i => 
        i.nombre.toLowerCase().includes(busquedaLower) ||
        (i.categoria && i.categoria.toLowerCase().includes(busquedaLower))
      );
    }

    // FILTRO DE PROVEEDORES - Solo filtrar si hay proveedores seleccionados
    if (proveedoresSeleccionados.length > 0) {
      filtrados = filtrados.filter(i => {
        // Si el ingrediente no tiene proveedor, lo incluimos si "Todos" está seleccionado
        if (!i.proveedor_nombre || i.proveedor_nombre.trim() === '') {
          return false; // Solo mostramos ingredientes con proveedor si hay filtro activo
        }
        return proveedoresSeleccionados.includes(i.proveedor_nombre);
      });
    }

    setIngredientesFiltrados(filtrados);
  }

  function toggleProveedor(proveedor: string) {
    setProveedoresSeleccionados(prev => 
      prev.includes(proveedor)
        ? prev.filter(p => p !== proveedor)
        : [...prev, proveedor]
    );
  }

  function toggleTodosProveedores() {
    if (proveedoresSeleccionados.length === proveedoresUnicos.length) {
      setProveedoresSeleccionados([]);
    } else {
      setProveedoresSeleccionados([...proveedoresUnicos]);
    }
  }

  function limpiarFiltros() {
    setBusqueda('');
    setProveedoresSeleccionados([]);
  }

  const todosLosItems = [
    ...ingredientesFiltrados.map(i => ({
      tipo: 'ingrediente' as const,
      id: i.id,
      nombre: i.nombre,
      costeUnitario: i.precio_compra_actual || 0,
      unidad: normalizarUnidad(i.unidad_compra)
    })),
    ...subRecetas.map(s => {
      const gramos = s.produccion_gramos ? parseFloat(s.produccion_gramos as unknown as string) : 0;
      const costePorGramo = gramos > 0 ? s.coste_total / gramos : 0;
      return {
        tipo: 'subreceta' as const,
        id: s.id,
        nombre: s.nombre,
        costeUnitario: costePorGramo,
        unidad: 'gr'
      };
    })
  ];

  function agregarItem() {
    if (!itemSeleccionado || cantidadActual <= 0) {
      setMensaje('⚠️ Selecciona un elemento y una cantidad válida');
      return;
    }

    const item = todosLosItems.find(i => i.id === itemSeleccionado.id && i.tipo === itemSeleccionado.tipo);
    if (!item) return;

    const coste = cantidadActual * item.costeUnitario;

    setItemsSeleccionados([
      ...itemsSeleccionados,
      {
        tipo: item.tipo,
        id: item.id,
        nombre: item.nombre,
        cantidad: cantidadActual,
        unidad: item.unidad,
        costeUnitario: item.costeUnitario,
        coste,
      },
    ]);

    setItemSeleccionado(null);
    setCantidadActual(0);
    setMensaje('');
  }

  function eliminarItem(index: number) {
    setItemsSeleccionados(itemsSeleccionados.filter((_, i) => i !== index));
  }

  function calcularCosteTotal() {
    return itemsSeleccionados.reduce((sum, item) => sum + item.coste, 0);
  }

  function calcularPrecioNeto() {
    if (precioVenta <= 0) return 0;
    return precioVenta / (1 + ivaPorcentaje / 100);
  }

  function calcularFoodCostPorcentaje() {
    const coste = calcularCosteTotal();
    const precioNeto = calcularPrecioNeto();
    if (precioNeto <= 0) return '0';
    return ((coste / precioNeto) * 100).toFixed(2);
  }

  function calcularMargenNeto() {
    const coste = calcularCosteTotal();
    const precioNeto = calcularPrecioNeto();
    if (precioNeto <= 0) return '0';
    return (((precioNeto - coste) / precioNeto) * 100).toFixed(2);
  }

  function calcularCostePorGramo() {
    const coste = calcularCosteTotal();
    const gramos = typeof produccionGramos === 'number' && produccionGramos > 0 ? produccionGramos : 0;
    if (gramos === 0) return 0;
    return coste / gramos;
  }

  async function guardarReceta() {
    if (!nombre.trim()) {
      setMensaje('⚠️ El nombre es obligatorio');
      return;
    }

    if (itemsSeleccionados.length === 0) {
      setMensaje('⚠️ Añade al menos un ingrediente o sub-receta');
      return;
    }

    if (tipo === 'sub_receta' && (!produccionGramos || produccionGramos <= 0)) {
      setMensaje('️ Para sub-recetas, debes especificar la producción en gramos');
      return;
    }

    setGuardando(true);
    setMensaje('');

    try {
      const recetaId = crypto.randomUUID();

      // CORRECCIÓN: Añadir hotel_id a la inserción
      const { error: recetaError } = await supabase
        .from('recetas')
        .insert({
          id: recetaId,
          nombre: nombre.trim(),
          tipo,
          porciones,
          produccion_gramos: tipo === 'sub_receta' ? String(produccionGramos) : null,
          precio_venta: precioVenta,
          coste_total: calcularCosteTotal(),
          hotel_id: hotelId || '00000000-0000-0000-0000-000000000001', // Valor por defecto si no hay
          created_at: new Date().toISOString()
        });

      if (recetaError) throw recetaError;

      const detalles = itemsSeleccionados.map((item) => ({
        id: crypto.randomUUID(),
        receta_id: recetaId,
        ingrediente_id: item.tipo === 'ingrediente' ? item.id : null,
        subreceta_id: item.tipo === 'subreceta' ? item.id : null,
        cantidad_necesaria: item.cantidad,
        coste_linea: item.coste,
        hotel_id: hotelId || '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString()
      }));

      const { error: detalleError } = await supabase
        .from('receta_detalle')
        .insert(detalles);

      if (detalleError) throw detalleError;

      setMensaje('✅ Receta guardada correctamente');

      setTimeout(() => {
        router.push('/recetas');
      }, 1500);

    } catch (error: any) {
      console.error('Error guardando receta:', error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🍳 Nueva Receta</h1>
          <button
            onClick={() => router.push('/recetas')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            ← Volver al listado
          </button>
        </div>

        {mensaje && (
          <div className={`mb-6 p-4 rounded-lg ${
            mensaje.includes('✅') ? 'bg-green-100 text-green-800' :
            mensaje.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {mensaje}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📋 Datos básicos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la receta *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Solomillo al whisky"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as 'plato' | 'sub_receta');
                  if (e.target.value === 'plato') {
                    setProduccionGramos('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="plato">🍽️ Plato Principal</option>
                <option value="sub_receta"> Sub-receta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porciones
              </label>
              <input
                type="number"
                value={porciones}
                onChange={(e) => setPorciones(Number(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {tipo === 'sub_receta' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producción total (gramos) *
                </label>
                <input
                  type="number"
                  value={produccionGramos}
                  onChange={(e) => setProduccionGramos(Number(e.target.value))}
                  min="1"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 1000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ¿Cuántos gramos produces de esta sub-receta?
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de venta (€) - INCLUIDO IVA
              </label>
              <input
                type="number"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA (%)
              </label>
              <select
                value={ivaPorcentaje}
                onChange={(e) => setIvaPorcentaje(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="4">4% - Superreducido</option>
                <option value="10">10% - Reducido (Restauración)</option>
                <option value="21">21% - General</option>
                <option value="0">0% - Sin IVA</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4"> Añadir ingredientes o sub-recetas</h2>
          
          <div className="mb-4">
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar ingrediente
                </label>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Tomate, Pollo, Aceite..."
                />
              </div>

              <div className="relative" ref={filtroRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedores
                </label>
                <button
                  onClick={() => setMostrarFiltroProveedores(!mostrarFiltroProveedores)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium transition flex items-center gap-2 hover:border-blue-300"
                >
                  {proveedoresSeleccionados.length > 0 
                    ? `${proveedoresSeleccionados.length} seleccionado(s)`
                    : 'Todos'
                  }
                  <span>▼</span>
                </button>

                {mostrarFiltroProveedores && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200">
                      <button
                        onClick={toggleTodosProveedores}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {proveedoresSeleccionados.length === proveedoresUnicos.length 
                          ? 'Deseleccionar todos' 
                          : 'Seleccionar todos'}
                      </button>
                    </div>
                    <div className="p-2">
                      {proveedoresUnicos.map((proveedor) => (
                        <label
                          key={proveedor}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={proveedoresSeleccionados.includes(proveedor)}
                            onChange={() => toggleProveedor(proveedor)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{proveedor}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {(busqueda || proveedoresSeleccionados.length > 0) && (
                <div className="pt-6">
                  <button
                    onClick={limpiarFiltros}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {todosLosItems.length > 0 && (
              <div className="border border-gray-200 rounded-lg bg-white max-h-60 overflow-y-auto shadow-lg">
                {todosLosItems.map((item) => (
                  <button
                    key={`${item.tipo}-${item.id}`}
                    onClick={() => {
                      setItemSeleccionado({tipo: item.tipo, id: item.id});
                      setCantidadActual(0);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{item.nombre}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {item.tipo === 'subreceta' ? '🥘 Sub-receta' : `📦 ${item.unidad}`}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {item.costeUnitario.toFixed(6)}€/{item.unidad}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {busqueda && todosLosItems.length === 0 && (
              <div className="mt-2 p-3 text-gray-500 bg-gray-50 rounded-lg text-center">
                No se encontraron ingredientes
              </div>
            )}
          </div>

          {itemSeleccionado && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad ({itemSeleccionado && todosLosItems.find(i => i.id === itemSeleccionado.id && i.tipo === itemSeleccionado.tipo)?.unidad})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cantidadActual}
                  onChange={(e) => setCantidadActual(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={itemSeleccionado.tipo === 'subreceta' ? "Ej: 80" : "Ej: 200"}
                  autoFocus
                />
                <button
                  onClick={agregarItem}
                  disabled={cantidadActual <= 0}
                  className={`px-6 py-2 rounded-lg font-semibold ${
                    cantidadActual > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  + Añadir
                </button>
              </div>
            </div>
          )}

          {itemsSeleccionados.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                Elementos añadidos:
              </h3>
              <ul className="space-y-2">
                {itemsSeleccionados.map((item, index) => (
                  <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <div>
                      <span className="text-gray-800 font-medium">{item.nombre}</span>
                      {item.tipo === 'subreceta' && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                          Sub-receta
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">
                        {item.cantidad} {item.unidad} × {item.costeUnitario.toFixed(4)}€ = {item.coste.toFixed(4)}€
                      </span>
                      <button
                        onClick={() => eliminarItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">💰 Resumen de costes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-600">Precio de venta (IVA {ivaPorcentaje}%)</p>
              <p className="text-2xl font-bold text-gray-900">
                {precioVenta.toFixed(2)}€
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Precio neto: {calcularPrecioNeto().toFixed(2)}€
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Coste total</p>
              <p className="text-2xl font-bold text-blue-900">
                {calcularCosteTotal().toFixed(2)}€
              </p>
            </div>

            {tipo === 'sub_receta' && typeof produccionGramos === 'number' && produccionGramos > 0 && (
              <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                <p className="text-sm text-orange-600">Coste por gramo</p>
                <p className="text-2xl font-bold text-orange-900">
                  {calcularCostePorGramo().toFixed(6)}€
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Producción: {produccionGramos}g
                </p>
              </div>
            )}

            <div className={`${
              parseFloat(calcularFoodCostPorcentaje()) < 25 
                ? 'bg-green-50' 
                : parseFloat(calcularFoodCostPorcentaje()) <= 33 
                ? 'bg-yellow-50' 
                : 'bg-red-50'
            } p-4 rounded-lg`}>
              <p className={`text-sm ${
                parseFloat(calcularFoodCostPorcentaje()) < 25 
                  ? 'text-green-600' 
                  : parseFloat(calcularFoodCostPorcentaje()) <= 33 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                 Food Cost
              </p>
              <p className={`text-2xl font-bold ${
                parseFloat(calcularFoodCostPorcentaje()) < 25 
                  ? 'text-green-900' 
                  : parseFloat(calcularFoodCostPorcentaje()) <= 33 
                  ? 'text-yellow-900' 
                  : 'text-red-900'
              }`}>
                {calcularFoodCostPorcentaje()}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ideal: &lt;25%
              </p>
            </div>

            <div className={`${
              parseFloat(calcularMargenNeto()) >= 60 
                ? 'bg-green-50' 
                : parseFloat(calcularMargenNeto()) >= 50 
                ? 'bg-yellow-50' 
                : 'bg-red-50'
            } p-4 rounded-lg`}>
              <p className={`text-sm ${
                parseFloat(calcularMargenNeto()) >= 60 
                  ? 'text-green-600' 
                  : parseFloat(calcularMargenNeto()) >= 50 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                💵 Margen Neto
              </p>
              <p className={`text-2xl font-bold ${
                parseFloat(calcularMargenNeto()) >= 60 
                  ? 'text-green-900' 
                  : parseFloat(calcularMargenNeto()) >= 50 
                  ? 'text-yellow-900' 
                  : 'text-red-900'
              }`}>
                {calcularMargenNeto()}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Sobre neto (sin IVA)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={guardarReceta}
          disabled={guardando}
          className={`w-full py-4 rounded-lg text-white font-semibold text-lg ${
            guardando ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {guardando ? '⏳ Guardando...' : '💾 Guardar receta'}
        </button>
      </div>
    </div>
  );
}
