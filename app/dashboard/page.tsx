'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Modulo {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  ruta: string;
  color: string;
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [permisos, setPermisos] = useState<Record<string, any>>({});
  const router = useRouter();

  const todosLosModulos: Modulo[] = [
    { id: 1, nombre: 'Proveedores', descripcion: 'Base de proveedores y productos', icono: '📦', ruta: '/productos', color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
    { id: 2, nombre: 'Recetas', descripcion: 'Gestión de recetas y costes', icono: '🍳', ruta: '/recetas', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
    { id: 3, nombre: 'Pedidos', descripcion: 'Sistema de aprovisionamiento', icono: '🛒', ruta: '/pedidos', color: 'bg-red-100 border-red-300 hover:bg-red-200' },
    { id: 4, nombre: 'HACCP', descripcion: 'Seguridad alimentaria', icono: '🛡️', ruta: '/haccp', color: 'bg-purple-100 border-purple-300 hover:bg-purple-200' },
    { id: 5, nombre: 'Menu Engineering', descripcion: 'Análisis de menú', icono: '📊', ruta: '/menu_engineering', color: 'bg-amber-100 border-amber-300 hover:bg-amber-200' },
    { id: 6, nombre: 'Inventarios', descripcion: 'Control de stock', icono: '📋', ruta: '/inventarios', color: 'bg-indigo-100 border-indigo-300 hover:bg-indigo-200' },
    { id: 7, nombre: 'Producciones', descripcion: 'Planificación de producción', icono: '🏭', ruta: '/producciones', color: 'bg-pink-100 border-pink-300 hover:bg-pink-200' },
    { id: 8, nombre: 'Análisis de Costes', descripcion: 'Reportes financieros', icono: '💰', ruta: '/costes', color: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200' },
    { id: 9, nombre: 'Informes', descripcion: 'Reportes detallados', icono: '📄', ruta: '/informes', color: 'bg-orange-100 border-orange-300 hover:bg-orange-200' }
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
  }, []);

  function logout() {
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('permisos');
    sessionStorage.removeItem('hotel_id');
    router.push('/');
  }

  if (!usuario) return null;

  const modulosDisponibles = todosLosModulos.filter(m => {
    const permiso = permisos[m.ruta.substring(1)];
    return permiso?.puede_ver || usuario.rol === 'ADMIN';
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header con color de la landing page */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-xl">🏠</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Dashboard Principal</h1>
                <p className="text-sm text-cyan-100">
                  Bienvenido, {usuario.nombre}
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <span className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium">
                {usuario.rol === 'ADMIN' ? '👑 Administrador' : '👤 Operador'}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 text-sm font-medium transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Módulos Disponibles</h2>
          <p className="text-slate-500 mt-1">Selecciona un módulo para comenzar</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulosDisponibles.map((modulo) => (
            <button
              key={modulo.id}
              onClick={() => router.push(modulo.ruta)}
              className={`group ${modulo.color} border rounded-xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                  {modulo.icono}
                </div>
                <div className="text-slate-400 group-hover:text-slate-600 transition-colors text-xl">
                  →
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {modulo.nombre}
              </h3>
              <p className="text-sm text-slate-600">
                {modulo.descripcion}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}