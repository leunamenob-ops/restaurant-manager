'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function UbicacionesPage() {
  const router = useRouter();
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [ubicacionEditando, setUbicacionEditando] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  
  // Modal de productos y QRs
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<any>(null);
  const [productosUbicacion, setProductosUbicacion] = useState<any[]>([]);
  const [qrUbicacion, setQrUbicacion] = useState<string>('');
  const [qrsProductos, setQrsProductos] = useState<{[key: string]: string}>({});
  const [generandoQRs, setGenerandoQRs] = useState(false);
  
  const [formulario, setFormulario] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'almacenamiento',
    orden: 0
  });

  const HOTEL_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  async function cargarUbicaciones() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('ubicaciones')
      .select('*')
      .eq('hotel_id', HOTEL_ID)
      .order('orden');
    
    if (error) {
      console.error('Error cargando ubicaciones:', error);
      alert('Error al cargar: ' + error.message);
    } else {
      console.log('Ubicaciones cargadas:', data?.length);
      setUbicaciones(data || []);
    }
    setLoading(false);
  }

  async function abrirCrear() {
    setUbicacionEditando(null);
    setFormulario({ 
      nombre: '', 
      descripcion: '', 
      tipo: 'estanteria', 
      orden: ubicaciones.length + 1 
    });
    setMostrarModal(true);
  }

  function abrirEditar(ubicacion: any) {
    setUbicacionEditando(ubicacion);
    setFormulario({
      nombre: ubicacion.nombre,
      descripcion: ubicacion.descripcion || '',
      tipo: ubicacion.tipo || 'estanteria',
      orden: ubicacion.orden || 0
    });
    setMostrarModal(true);
  }

  async function abrirProductosYQRs(ubicacion: any) {
    setUbicacionSeleccionada(ubicacion);
    setGenerandoQRs(true);
    
    // 1. Cargar productos asignados a esta ubicación
    const { data } = await supabase
      .from('productos_ubicacion')
      .select(`
        ingrediente_id,
        ingredientes:ingrediente_id (
          id,
          nombre,
          categoria,
          unidad_compra,
          proveedor_nombre
        )
      `)
      .eq('ubicacion_id', ubicacion.id);
    
    const productos = data?.map((d: any) => d.ingredientes) || [];
    setProductosUbicacion(productos);
    
    // 2. Generar QR de la ubicación
    const qrDataUbicacion = JSON.stringify({
      tipo: 'ubicacion',
      id: ubicacion.id,
      nombre: ubicacion.nombre
    });
    const qrCodeUbicacion = await QRCode.toDataURL(qrDataUbicacion, { 
      width: 300,
      margin: 2
    });
    setQrUbicacion(qrCodeUbicacion);
    
    // 3. Generar QRs de cada producto
    const qrs: {[key: string]: string} = {};
    for (const prod of productos) {
      const qrDataProducto = JSON.stringify({
        tipo: 'producto',
        id: prod.id,
        nombre: prod.nombre,
        ubicacion: ubicacion.nombre
      });
      qrs[prod.id] = await QRCode.toDataURL(qrDataProducto, { 
        width: 200,
        margin: 2
      });
    }
    setQrsProductos(qrs);
    setGenerandoQRs(false);
    setMostrarModal(true);
  }

  async function guardarUbicacion() {
    if (!formulario.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    let error;
    
    if (ubicacionEditando) {
      const result = await supabase
        .from('ubicaciones')
        .update({
          nombre: formulario.nombre,
          descripcion: formulario.descripcion,
          tipo: formulario.tipo,
          orden: formulario.orden
        })
        .eq('id', ubicacionEditando.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('ubicaciones')
        .insert([{
          nombre: formulario.nombre,
          descripcion: formulario.descripcion,
          tipo: formulario.tipo,
          orden: formulario.orden,
          hotel_id: HOTEL_ID
        }]);
      error = result.error;
    }

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setMostrarModal(false);
    await cargarUbicaciones();
  }

  async function eliminarUbicacion(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la ubicación "${nombre}"?\n\nLos productos asignados quedarán sin ubicación.`)) {
      return;
    }

    const { error } = await supabase
      .from('ubicaciones')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    await cargarUbicaciones();
  }

  function imprimirQRUbicacion() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${ubicacionSeleccionada?.nombre}</title>
        <style>
          @media print {
            @page { size: A4; margin: 20mm; }
            body { margin: 0; font-family: Arial, sans-serif; }
          }
          body { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
          }
          .qr-container {
            text-align: center;
            border: 3px solid #333;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
          }
          h1 { 
            margin: 0 0 10px 0; 
            font-size: 24px;
            color: #1e293b;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
          }
          img {
            width: 300px;
            height: 300px;
            margin: 20px 0;
          }
          .info {
            margin-top: 20px;
            font-size: 12px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <h1>${ubicacionSeleccionada?.nombre || ''}</h1>
          <div class="subtitle">${ubicacionSeleccionada?.descripcion || ''}</div>
          <img src="${qrUbicacion}" alt="QR Ubicación" />
          <div class="info">
            <p><strong>ID:</strong> ${ubicacionSeleccionada?.id.substring(0, 8)}...</p>
            <p>Escanea para ver productos y hacer inventario</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function imprimirQRsProductos() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir');
      return;
    }
    
    const productosHTML = productosUbicacion.map(prod => `
      <div class="producto-card">
        <h3>${prod.nombre}</h3>
        <div class="producto-info">
          <span class="badge">${prod.categoria || 'Sin categoría'}</span>
          <span class="badge">${prod.unidad_compra || '-'}</span>
        </div>
        <img src="${qrsProductos[prod.id]}" alt="QR ${prod.nombre}" />
        <div class="producto-id">ID: ${prod.id.substring(0, 8)}...</div>
      </div>
    `).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QRs Productos - ${ubicacionSeleccionada?.nombre}</title>
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
            body { margin: 0; }
          }
          body { 
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #1e293b;
            margin-bottom: 30px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .producto-card {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .producto-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #0f172a;
          }
          .producto-info {
            margin-bottom: 10px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            background: #e0f2fe;
            color: #0369a1;
            border-radius: 4px;
            font-size: 10px;
            margin: 0 2px;
          }
          .producto-card img {
            width: 150px;
            height: 150px;
            margin: 10px 0;
          }
          .producto-id {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <h1>📦 QRs de Productos - ${ubicacionSeleccionada?.nombre}</h1>
        <div class="grid">
          ${productosHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function imprimirQRProductoIndividual(producto: any) {
    const qrCode = qrsProductos[producto.id];
    if (!qrCode) {
      alert('QR no disponible para este producto');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${producto.nombre}</title>
        <style>
          @media print {
            @page { size: A6; margin: 10mm; }
            body { margin: 0; }
          }
          body { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .qr-container {
            text-align: center;
            border: 2px solid #333;
            padding: 20px;
            border-radius: 8px;
            max-width: 300px;
          }
          h1 { 
            margin: 0 0 8px 0; 
            font-size: 18px;
            color: #1e293b;
          }
          .info {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 15px;
          }
          img {
            width: 200px;
            height: 200px;
            margin: 15px 0;
          }
          .badges {
            display: flex;
            gap: 5px;
            justify-content: center;
            margin-top: 10px;
          }
          .badge {
            padding: 3px 8px;
            background: #e0f2fe;
            color: #0369a1;
            border-radius: 4px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <h1>${producto.nombre}</h1>
          <div class="info">${ubicacionSeleccionada?.nombre || ''}</div>
          <img src="${qrCode}" alt="QR ${producto.nombre}" />
          <div class="badges">
            <span class="badge">${producto.categoria || 'Sin categoría'}</span>
            <span class="badge">${producto.unidad_compra || '-'}</span>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  const tipoIcono = (tipo: string) => {
    switch (tipo) {
      case 'camara': return '🏪';
      case 'nevera': return '❄️';
      case 'congelador': return '🥶';
      case 'estanteria': return '📦';
      case 'otro': return '';
      default: return '📍';
    }
  };

  const colorTipo = (tipo: string) => {
    switch (tipo) {
      case 'camara': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'nevera': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'congelador': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'estanteria': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'otro': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const ubicacionesFiltradas = ubicaciones
    .filter(u => filtroTipo === 'todos' ? true : u.tipo === filtroTipo)
    .filter(u => u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                 u.descripcion?.toLowerCase().includes(busqueda.toLowerCase()));

  const conteoPorTipo = {
    camara: ubicaciones.filter(u => u.tipo === 'camara').length,
    nevera: ubicaciones.filter(u => u.tipo === 'nevera').length,
    congelador: ubicaciones.filter(u => u.tipo === 'congelador').length,
    estanteria: ubicaciones.filter(u => u.tipo === 'estanteria').length,
    otro: ubicaciones.filter(u => u.tipo === 'otro').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Ubicaciones</h1>
                <p className="text-sm text-slate-500">{ubicaciones.length} ubicaciones registradas</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/inventarios')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a Inventarios
              </button>
              
              <button
                onClick={() => router.push('/inventarios/asignar-productos')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition text-sm flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Asignar Productos
              </button>

              <button
                onClick={abrirCrear}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition text-sm flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Ubicación
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* RESUMEN POR TIPO */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{ubicaciones.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">🏪 Cámaras</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{conteoPorTipo.camara}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4">
            <p className="text-xs font-semibold text-cyan-600 uppercase">❄️ Neveras</p>
            <p className="text-2xl font-bold text-cyan-900 mt-1">{conteoPorTipo.nevera}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-4">
            <p className="text-xs font-semibold text-indigo-600 uppercase">🥶 Congeladores</p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{conteoPorTipo.congelador}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase">📦 Estanterías</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{conteoPorTipo.estanteria}</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Buscar ubicación
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-sm"
                />
              </div>
            </div>

            <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Filtrar por tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 border border-slate-300 rounded-lg font-medium transition-all hover:border-amber-400 hover:bg-slate-50 text-sm text-slate-700 bg-white"
              >
                <option value="todos">Todos los tipos ({ubicaciones.length})</option>
                <option value="camara">🏪 Cámaras ({conteoPorTipo.camara})</option>
                <option value="nevera">❄️ Neveras ({conteoPorTipo.nevera})</option>
                <option value="congelador"> Congeladores ({conteoPorTipo.congelador})</option>
                <option value="estanteria">📦 Estanterías ({conteoPorTipo.estanteria})</option>
                <option value="otro">📍 Otros ({conteoPorTipo.otro})</option>
              </select>
            </div>
          </div>
        </div>

        {/* LISTA DE UBICACIONES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ubicaciones ({ubicacionesFiltradas.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-200 border-t-amber-600 mb-3"></div>
                <p className="font-medium">Cargando ubicaciones...</p>
              </div>
            ) : ubicacionesFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="text-lg font-medium">No se encontraron ubicaciones</p>
                <p className="text-sm mt-1">Prueba con otra búsqueda o crea una nueva</p>
              </div>
            ) : (
              ubicacionesFiltradas.map((ub) => (
                <div key={ub.id} className="p-5 hover:bg-amber-50/30 transition group">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div className="flex-1 flex items-start gap-4">
                      <div className="text-3xl">{tipoIcono(ub.tipo)}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-lg">{ub.nombre}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorTipo(ub.tipo)}`}>
                            {ub.tipo}
                          </span>
                          <span className="text-xs text-slate-400">Orden: {ub.orden}</span>
                        </div>
                        {ub.descripcion && (
                          <p className="text-sm text-slate-600 mt-1">{ub.descripcion}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => abrirProductosYQRs(ub)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm font-medium shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                         Ver Productos e Imprimir QRs
                      </button>
                      
                      <button
                        onClick={() => abrirEditar(ub)}
                        className="px-3 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarUbicacion(ub.id, ub.nombre)}
                        className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL CREAR/EDITAR */}
      {mostrarModal && !ubicacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {ubicacionEditando ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </h2>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre * <span className="text-slate-400 text-xs">(puedes usar emojis)</span>
                </label>
                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({...formulario, nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Ej: ❄️ Nevera 1 - Estante Superior"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <input
                  type="text"
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario({...formulario, descripcion: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Ej: Temperatura 2-4°C, productos listos para usar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                  <select
                    value={formulario.tipo}
                    onChange={(e) => setFormulario({...formulario, tipo: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition bg-white"
                  >
                    <option value="camara">🏪 Cámara Fría</option>
                    <option value="nevera">️ Nevera</option>
                    <option value="congelador">🥶 Congelador</option>
                    <option value="estanteria">📦 Estantería</option>
                    <option value="otro">📍 Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Orden</label>
                  <input
                    type="number"
                    value={formulario.orden}
                    onChange={(e) => setFormulario({...formulario, orden: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">Orden de aparición</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardarUbicacion}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold text-sm"
              >
                {ubicacionEditando ? 'Guardar Cambios' : 'Crear Ubicación'}
              </button>
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTOS Y QRS */}
      {mostrarModal && ubicacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="text-3xl">{tipoIcono(ubicacionSeleccionada.tipo)}</span>
                  {ubicacionSeleccionada.nombre}
                </h2>
                {ubicacionSeleccionada.descripcion && (
                  <p className="text-sm text-slate-600 mt-1">{ubicacionSeleccionada.descripcion}</p>
                )}
              </div>
              <button onClick={() => { setMostrarModal(false); setUbicacionSeleccionada(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {generandoQRs ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-3"></div>
                <p className="text-slate-600 font-medium">Generando códigos QR...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Botones de impresión */}
                <div className="flex flex-wrap gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <button
                    onClick={imprimirQRUbicacion}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    📍 Imprimir QR de Ubicación
                  </button>
                  <button
                    onClick={imprimirQRsProductos}
                    disabled={productosUbicacion.length === 0}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm flex items-center gap-2 shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    📦 Imprimir QRs de {productosUbicacion.length} Productos
                  </button>
                </div>

                {/* QR de la ubicación */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 text-center">📍 Código QR de Ubicación</h3>
                  <div className="flex justify-center">
                    <img src={qrUbicacion} alt="QR Ubicación" className="w-48 h-48 rounded-lg border-2 border-white shadow-md" />
                  </div>
                  <p className="text-center text-sm text-slate-600 mt-3">
                    Escanea para ver todos los productos de esta ubicación
                  </p>
                </div>

                {/* Lista de productos */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Productos Asignados ({productosUbicacion.length})
                  </h3>
                  
                  {productosUbicacion.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-500">No hay productos asignados a esta ubicación</p>
                      <button
                        onClick={() => {
                          setMostrarModal(false);
                          setUbicacionSeleccionada(null);
                          router.push('/inventarios/asignar-productos');
                        }}
                        className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium"
                      >
                        Asignar Productos
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {productosUbicacion.map((prod) => (
                        <div key={prod.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm truncate">{prod.nombre}</p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {prod.categoria || 'Sin categoría'}
                                </span>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {prod.unidad_compra || '-'}
                                </span>
                              </div>
                            </div>
                            {qrsProductos[prod.id] && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={qrsProductos[prod.id]} 
                                  alt={`QR ${prod.nombre}`}
                                  className="w-16 h-16 rounded border border-slate-200"
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Botón Imprimir QR individual */}
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => imprimirQRProductoIndividual(prod)}
                              className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium flex items-center justify-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              🖨️ Imprimir QR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => { setMostrarModal(false); setUbicacionSeleccionada(null); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
