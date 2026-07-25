'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    // TEMPORAL: Login sin validación para pruebas
    // Cuando esté en producción, activaremos la validación real
    
    const usuarioTemp = {
      id: 'B0001',
      nombre: 'Admin Temporal',
      cargo: 'Administrador',
      rol: 'ADMIN',
      hotel_id: '00000000-0000-0000-0000-000000000001'
    };
  
    const permisosTemp = {
      'proveedores': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'recetas': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'pedidos': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'haccp': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'menu-engineering': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'inventarios': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'producciones': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'analisis-costes': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'informes': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
    };
  
    // Guardar en sessionStorage
    sessionStorage.setItem('usuario', JSON.stringify(usuarioTemp));
    sessionStorage.setItem('permisos', JSON.stringify(permisosTemp));
    sessionStorage.setItem('hotel_id', usuarioTemp.hotel_id);
  
    // Redirigir al dashboard
    router.push('/dashboard');
    
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cyan-50">
      {/* NAVIGATION */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">R</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Restaurant Manager
              </span>
            </div>
            <button
              onClick={() => setShowLogin(true)}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-semibold shadow-lg transition-all transform hover:scale-105"
            >
              🔐 Acceder
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-teal-600/10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Gestión Inteligente de{' '}
                <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Costes y Recetas
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Optimiza tu restaurante con control total de inventario, 
                proveedores y rentabilidad. La herramienta que necesitabas 
                para tomar decisiones basadas en datos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  Comenzar Ahora →
                </button>
                <button className="px-8 py-4 bg-white text-cyan-600 border-2 border-cyan-600 rounded-xl font-semibold text-lg hover:bg-cyan-50 transition-all">
                  Ver Demo
                </button>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop"
                alt="Restaurant Management"
                className="rounded-2xl shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rentabilidad</p>
                    <p className="text-2xl font-bold text-green-600">+35%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Iniciar Sesión</h3>
              <button
                onClick={() => setShowLogin(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de usuario
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: B0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="****"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-teal-700 disabled:bg-gray-400"
              >
                {loading ? 'Entrando...' : 'Acceder'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-500 text-center">
                Usuarios de prueba: B0001-B0005 | PIN: 4321 (ADMIN) o 1234 (USER)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}