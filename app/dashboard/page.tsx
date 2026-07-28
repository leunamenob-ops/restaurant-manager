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
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [permisos, setPermisos] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const todosLosModulos: Modulo[] = [
    { 
      id: 1, 
      nombre: 'Proveedores', 
      descripcion: 'Base de proveedores y productos. Centraliza toda tu información de compras.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, 
      ruta: '/productos', 
      color: 'from-cyan-100 to-cyan-50', 
      border: 'border-cyan-200',
      iconBg: 'bg-cyan-500'
    },
    { 
      id: 2, 
      nombre: 'Recetas', 
      descripcion: 'Gestión de recetas y costes. Fichas técnicas, Food Cost y rentabilidad.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" /></svg>, 
      ruta: '/recetas', 
      color: 'from-teal-100 to-teal-50', 
      border: 'border-teal-200',
      iconBg: 'bg-teal-500'
    },
    { 
      id: 3, 
      nombre: 'Pedidos', 
      descripcion: 'Sistema de aprovisionamiento. Genera y gestiona pedidos a proveedores.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, 
      ruta: '/pedidos', 
      color: 'from-pink-100 to-pink-50', 
      border: 'border-pink-200',
      iconBg: 'bg-pink-500'
    },
    { 
      id: 4, 
      nombre: 'HACCP', 
      descripcion: 'Seguridad alimentaria. Control de temperaturas, trazabilidad y APPCC.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, 
      ruta: '/haccp', 
      color: 'from-purple-100 to-purple-50', 
      border: 'border-purple-200',
      iconBg: 'bg-purple-500'
    },
    { 
      id: 5, 
      nombre: 'Menu Engineering', 
      descripcion: 'Análisis de menú. Identifica platos estrella, caballos de batalla y perros.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
      ruta: '/menu_engineering', 
      color: 'from-yellow-100 to-yellow-50', 
      border: 'border-yellow-200',
      iconBg: 'bg-yellow-500'
    },
    { 
      id: 6, 
      nombre: 'Inventarios', 
      descripcion: 'Control de stock. Entradas, salidas, mermas y valoración de inventario.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, 
      ruta: '/inventarios', 
      color: 'from-indigo-100 to-indigo-50', 
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-500'
    },
    { 
      id: 7, 
      nombre: 'Producciones', 
      descripcion: 'Planificación de producción. Organiza la cocina de forma eficiente.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, 
      ruta: '/producciones', 
      color: 'from-rose-100 to-rose-50', 
      border: 'border-rose-200',
      iconBg: 'bg-rose-500'
    },
    { 
      id: 8, 
      nombre: 'Análisis de Costes', 
      descripcion: 'Reportes financieros. KPIs, márgenes y evolución de costes.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, 
      ruta: '/costes', 
      color: 'from-emerald-100 to-emerald-50', 
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-500'
    },
    { 
      id: 9, 
      nombre: 'Informes', 
      descripcion: 'Reportes detallados. Exporta datos en PDF, Excel y más formatos.', 
      icono: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
      ruta: '/informes', 
      color: 'from-orange-100 to-orange-50', 
      border: 'border-orange-200',
      iconBg: 'bg-orange-500'
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
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-3xl font-bold">R</span>
          </div>
          <p className="text-gray-600 font-medium">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const modulosDisponibles = todosLosModulos.filter(m => {
    const permiso = permisos[m.ruta.substring(1)];
    return permiso?.puede_ver || usuario.rol === 'ADMIN';
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-white">
      {/* Header mejorado */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-md">
                <span className="text-2xl">🏠</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Dashboard Principal</h1>
                <p className="text-sm text-cyan-100">
                  Bienvenido, <span className="font-semibold">{usuario.nombre}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-medium shadow-sm">
                {usuario.rol === 'ADMIN' ? '👑 Administrador' : '👤 Operador'}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 text-sm font-medium transition shadow-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Módulos Disponibles</h2>
          <p className="text-gray-600">Selecciona un módulo para comenzar a trabajar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {modulosDisponibles.map((modulo) => (
            <button
              key={modulo.id}
              onClick={() => router.push(modulo.ruta)}
              className={`group relative p-6 bg-gradient-to-br ${modulo.color} rounded-xl border-2 ${modulo.border} hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 text-left`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 ${modulo.iconBg} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {modulo.icono}
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors text-2xl group-hover:translate-x-1 duration-300">
                  →
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-cyan-700 transition-colors">
                {modulo.nombre}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {modulo.descripcion}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
