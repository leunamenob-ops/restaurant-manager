'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Modulo {
  id: number;
  nombre: string;
  descripcion: string;
  icono: React.ReactNode;
  ruta: string;
  color: string;
  border: string;
  iconBg: string;
  hoverText: string;
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [permisos, setPermisos] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Definición de módulos - Facturas reemplaza Análisis de Costes (posición 8)
  // Análisis de Costes + Informes combinados en posición 9
  const todosLosModulos: Modulo[] = [
    { 
      id: 1, 
      nombre: 'Proveedores', 
      descripcion: 'Centraliza fichas de producto y alerta de subidas de precio.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, 
      ruta: '/productos', 
      color: 'from-cyan-50 to-white', 
      border: 'border-cyan-200',
      iconBg: 'bg-cyan-500',
      hoverText: 'group-hover:text-cyan-700'
    },
    { 
      id: 2, 
      nombre: 'Recetas', 
      descripcion: 'Escandallos vivos, Food Cost y fichas técnicas con fotos.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" /></svg>, 
      ruta: '/recetas', 
      color: 'from-emerald-50 to-white', 
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-500',
      hoverText: 'group-hover:text-emerald-700'
    },
    { 
      id: 3, 
      nombre: 'Pedidos', 
      descripcion: 'Genera y gestiona aprovisionamientos a proveedores.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
      ruta: '/pedidos', 
      color: 'from-pink-50 to-white', 
      border: 'border-pink-200',
      iconBg: 'bg-pink-500',
      hoverText: 'group-hover:text-pink-700'
    },
    { 
      id: 4, 
      nombre: 'HACCP', 
      descripcion: 'Control de temperaturas, trazabilidad y checklists APPCC.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, 
      ruta: '/haccp', 
      color: 'from-purple-50 to-white', 
      border: 'border-purple-200',
      iconBg: 'bg-purple-500',
      hoverText: 'group-hover:text-purple-700'
    },
    { 
      id: 5, 
      nombre: 'Menu Engineering', 
      descripcion: 'Matriz de rentabilidad: Estrellas, Caballos, Puzles y Perros.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
      ruta: '/menu_engineering', 
      color: 'from-amber-50 to-white', 
      border: 'border-amber-200',
      iconBg: 'bg-amber-500',
      hoverText: 'group-hover:text-amber-700'
    },
    { 
      id: 6, 
      nombre: 'Inventarios', 
      descripcion: 'Conteos cíclicos, mermas y valoración de stock en tiempo real.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, 
      ruta: '/inventarios', 
      color: 'from-indigo-50 to-white', 
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-500',
      hoverText: 'group-hover:text-indigo-700'
    },
    { 
      id: 7, 
      nombre: 'Producciones', 
      descripcion: 'Planifica y organiza la cocina para maximizar la eficiencia.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, 
      ruta: '/producciones', 
      color: 'from-rose-50 to-white', 
      border: 'border-rose-200',
      iconBg: 'bg-rose-500',
      hoverText: 'group-hover:text-rose-700'
    },
    { 
      id: 8, 
      nombre: 'Facturas', 
      descripcion: 'Procesa facturas con IA. Extracción automática de datos y líneas de producto.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      ruta: '/facturas', 
      color: 'from-blue-50 to-white', 
      border: 'border-blue-200',
      iconBg: 'bg-blue-600',
      hoverText: 'group-hover:text-blue-700'
    },
    { 
      id: 9, 
      nombre: 'Análisis e Informes', 
      descripcion: 'KPIs financieros, márgenes y exportación de reportes en PDF y Excel.', 
      icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      ruta: '/informes', 
      color: 'from-orange-50 to-white', 
      border: 'border-orange-200',
      iconBg: 'bg-orange-500',
      hoverText: 'group-hover:text-orange-700'
    }
  ];

  useEffect(() => {
    const usuarioData = sessionStorage.getItem('usuario');
    const permisosData = sessionStorage.getItem('permisos');
    
    if (!usuarioData) {
      router.push('/');
      return;
    }
    
    setUsuario(JSON.parse(usuarioData));
    if (permisosData) {
      setPermisos(JSON.parse(permisosData));
    }
    setLoading(false);
  }, []);

  function logout() {
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('permisos');
    sessionStorage.removeItem('hotel_id');
    router.push('/');
  }

  if (loading || !usuario) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <span className="text-white text-3xl font-bold">K</span>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando tu espacio de trabajo...</p>
        </div>
      </div>
    );
  }

  const modulosDisponibles = todosLosModulos.filter(m => {
    const permiso = permisos[m.ruta.substring(1)];
    return permiso?.puede_ver || usuario.rol === 'ADMIN';
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER MODERNO */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
                <p className="text-sm text-slate-500">
                  Bienvenido, <span className="font-semibold text-slate-700">{usuario.nombre}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                {usuario.rol === 'ADMIN' ? '👑 Administrador' : '👤 Operador'}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Módulos Disponibles</h2>
          <p className="text-slate-600 text-lg">Selecciona una herramienta para comenzar a optimizar tu restaurante.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {modulosDisponibles.map((modulo) => (
            <button
              key={modulo.id}
              onClick={() => router.push(modulo.ruta)}
              className={`group relative p-6 bg-gradient-to-br ${modulo.color} rounded-2xl border ${modulo.border} hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden`}
            >
              {/* Efecto de brillo sutil en hover */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/40 transition-colors duration-300"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 ${modulo.iconBg} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    {modulo.icono}
                  </div>
                  <div className="text-slate-400 group-hover:text-slate-600 transition-all duration-300 group-hover:translate-x-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                
                <h3 className={`text-lg font-bold text-slate-900 mb-2 transition-colors duration-300 ${modulo.hoverText}`}>
                  {modulo.nombre}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {modulo.descripcion}
                </p>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
