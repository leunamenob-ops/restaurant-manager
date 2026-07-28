'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    // TEMPORAL: Login sin validación para pruebas
    const usuarioTemp = {
      id: codigo || 'B0001',
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
  
    sessionStorage.setItem('usuario', JSON.stringify(usuarioTemp));
    sessionStorage.setItem('permisos', JSON.stringify(permisosTemp));
    sessionStorage.setItem('hotel_id', usuarioTemp.hotel_id);
  
    router.push('/dashboard');
    setLoading(false);
  }

  const modulos = [
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, title: 'Proveedores', description: 'Base de proveedores y productos. Centraliza toda tu información de compras.', color: 'from-cyan-100 to-cyan-50', border: 'border-cyan-200', iconBg: 'bg-cyan-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" /></svg>, title: 'Recetas', description: 'Gestión de recetas y costes. Fichas técnicas, Food Cost y rentabilidad.', color: 'from-teal-100 to-teal-50', border: 'border-teal-200', iconBg: 'bg-teal-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, title: 'Pedidos', description: 'Sistema de aprovisionamiento. Genera y gestiona pedidos a proveedores.', color: 'from-pink-100 to-pink-50', border: 'border-pink-200', iconBg: 'bg-pink-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: 'HACCP', description: 'Seguridad alimentaria. Control de temperaturas, trazabilidad y APPCC.', color: 'from-purple-100 to-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, title: 'Menu Engineering', description: 'Análisis de menú. Identifica platos estrella, caballos de batalla y perros.', color: 'from-yellow-100 to-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, title: 'Inventarios', description: 'Control de stock. Entradas, salidas, mermas y valoración de inventario.', color: 'from-indigo-100 to-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>, title: 'Producciones', description: 'Planificación de producción. Organiza la cocina de forma eficiente.', color: 'from-rose-100 to-rose-50', border: 'border-rose-200', iconBg: 'bg-rose-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Análisis de Costes', description: 'Reportes financieros. KPIs, márgenes y evolución de costes.', color: 'from-emerald-100 to-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-500' },
    { icon: <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, title: 'Informes', description: 'Reportes detallados. Exporta datos en PDF, Excel y más formatos.', color: 'from-orange-100 to-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-500' }
  ];

  const valores = [
    { icon: '🎯', title: 'Precisión', description: 'Cada céntimo cuenta. Datos exactos para decisiones inteligentes.' },
    { icon: '💡', title: 'Innovación', description: 'Tecnología de vanguardia adaptada a la hostelería real.' },
    { icon: '🤝', title: 'Compromiso', description: 'Tu éxito es nuestro éxito. Acompañamiento continuo.' },
    { icon: '🌱', title: 'Sostenibilidad', description: 'Reducimos el desperdicio alimentario optimizando recursos.' }
  ];

  const stats = [
    { number: '+500', label: 'Restaurantes' },
    { number: '35%', label: 'Más Rentabilidad' },
    { number: '99.9%', label: 'Disponibilidad' },
    { number: '24/7', label: 'Soporte' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-bold">R</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent hidden sm:block">
                KOST Software™ Restaurant Manager
              </span>
            </div>
            <button
              onClick={() => setShowLogin(true)}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg hover:from-cyan-700 hover:to-teal-700 font-semibold shadow-lg transition-all transform hover:scale-105 text-sm"
            >
              🔐 Acceder
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-cyan-50 via-teal-50 to-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-cyan-100 text-cyan-800 rounded-full text-sm font-semibold mb-6">
                🚀 La plataforma integral para tu restaurante
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Gestión Inteligente de{' '}
                <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Costes y Recetas
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Optimiza tu restaurante con control total de inventario, proveedores y rentabilidad. 
                La herramienta que necesitabas para tomar decisiones basadas en datos.
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
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">✅ Sin tarjeta de crédito</span>
                <span className="flex items-center gap-2">✅ 14 días gratis</span>
                <span className="flex items-center gap-2">✅ Cancela cuando quieras</span>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop"
                alt="Restaurant Management"
                className="rounded-2xl shadow-2xl w-full"
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

      {/* STATS */}
      <section className="py-12 bg-gradient-to-r from-cyan-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center text-white">
                <p className="text-4xl font-bold mb-2">{stat.number}</p>
                <p className="text-cyan-100 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULOS */}
      <section className="py-20 bg-white" id="modulos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">9 Módulos Integrados</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Una plataforma completa que cubre todas las necesidades de tu restaurante</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((modulo, idx) => (
              <div key={idx} className={`relative p-6 bg-gradient-to-br ${modulo.color} rounded-xl border-2 ${modulo.border} hover:shadow-xl transition-all hover:-translate-y-1 group`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${modulo.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                    {modulo.icon}
                  </div>
                  <span className="text-2xl text-gray-400 group-hover:text-gray-600 transition">→</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{modulo.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{modulo.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Nuestros Valores</h2>
            <p className="text-xl text-gray-600">Lo que nos define y nos impulsa cada día</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {valores.map((valor, idx) => (
              <div key={idx} className="text-center bg-white p-6 rounded-xl shadow-md">
                <div className="text-5xl mb-4">{valor.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{valor.title}</h3>
                <p className="text-gray-600 text-sm">{valor.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VISION Y MISION */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="text-5xl mb-6">👁️</div>
              <h2 className="text-3xl font-bold mb-4">Nuestra Visión</h2>
              <p className="text-lg leading-relaxed text-cyan-100">
                Ser la plataforma líder en gestión de restaurantes a nivel global, 
                empoderando a hosteleros con tecnología que transforma datos en decisiones 
                inteligentes. Soñamos con un sector hostelero más eficiente, rentable y 
                sostenible.
              </p>
            </div>
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="text-5xl mb-6">🎯</div>
              <h2 className="text-3xl font-bold mb-4">Nuestra Misión</h2>
              <p className="text-lg leading-relaxed text-teal-100">
                Proporcionar herramientas tecnológicas intuitivas y potentes que 
                simplifiquen la gestión de restaurantes. Nos comprometemos a 
                reducir la complejidad operativa, optimizar costes y aumentar 
                la rentabilidad de cada establecimiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">¿Listo para transformar tu restaurante?</h2>
          <p className="text-xl text-cyan-100 mb-8">Únete a cientos de restaurantes que ya confían en nosotros</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowLogin(true)}
              className="px-8 py-4 bg-white text-cyan-600 rounded-xl hover:shadow-xl font-semibold text-lg transition transform hover:scale-105"
            >
              Comenzar Prueba Gratis
            </button>
            <button className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl hover:bg-white hover:text-cyan-600 font-semibold text-lg transition">
              Contactar Ventas
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="text-white font-bold text-lg">KOST Software™ Restaurant Manager</span>
          </div>
          <p className="text-sm text-gray-400 mb-8">Transformando la gestión de restaurantes desde 2026</p>
          <div className="border-t border-gray-800 pt-8 text-sm text-gray-500">
            <p>© 2026 KOST Software™ Restaurant Manager. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* MODAL LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => { setShowLogin(false); setError(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-3xl font-bold">R</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Iniciar Sesión</h3>
              <p className="text-gray-500 text-sm mt-1">Accede a tu panel de control</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código de usuario</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: B0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="****"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {loading ? 'Entrando...' : 'Acceder al Sistema'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded-lg">
                💡 <strong>Usuarios de prueba:</strong> B0001 a B0005 <br/>
                🔑 <strong>PIN:</strong> 4321 (ADMIN) o 1234 (USER)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
