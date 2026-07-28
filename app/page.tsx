'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const modulos = [
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: 'Proveedores',
      description: 'Base de proveedores y productos. Centraliza toda tu información de compras.',
      color: 'from-blue-100 to-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" />
        </svg>
      ),
      title: 'Recetas',
      description: 'Gestión de recetas y costes. Fichas técnicas, Food Cost y rentabilidad.',
      color: 'from-green-100 to-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Pedidos',
      description: 'Sistema de aprovisionamiento. Genera y gestiona pedidos a proveedores.',
      color: 'from-pink-100 to-pink-50',
      border: 'border-pink-200',
      iconBg: 'bg-pink-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'HACCP',
      description: 'Seguridad alimentaria. Control de temperaturas, trazabilidad y APPCC.',
      color: 'from-purple-100 to-purple-50',
      border: 'border-purple-200',
      iconBg: 'bg-purple-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Menu Engineering',
      description: 'Análisis de menú. Identifica platos estrella, caballos de batalla y perros.',
      color: 'from-yellow-100 to-yellow-50',
      border: 'border-yellow-200',
      iconBg: 'bg-yellow-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: 'Inventarios',
      description: 'Control de stock. Entradas, salidas, mermas y valoración de inventario.',
      color: 'from-indigo-100 to-indigo-50',
      border: 'border-indigo-200',
      iconBg: 'bg-indigo-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
      title: 'Producciones',
      description: 'Planificación de producción. Organiza la cocina de forma eficiente.',
      color: 'from-rose-100 to-rose-50',
      border: 'border-rose-200',
      iconBg: 'bg-rose-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Análisis de Costes',
      description: 'Reportes financieros. KPIs, márgenes y evolución de costes.',
      color: 'from-emerald-100 to-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-500'
    },
    {
      icon: (
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Informes',
      description: 'Reportes detallados. Exporta datos en PDF, Excel y más formatos.',
      color: 'from-orange-100 to-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-500'
    }
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
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">K</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900 leading-tight">KOST Software</h1>
                <p className="text-xs text-gray-500 leading-tight">Restaurant Manager™</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/login')}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:shadow-lg font-semibold transition text-sm"
              >
                Acceder
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-teal-50 via-blue-50 to-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold mb-6">
                🚀 La plataforma integral para tu restaurante
              </div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                Gestión Inteligente de{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
                  Costes y Recetas
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Optimiza tu restaurante con control total de inventario, proveedores y rentabilidad. 
                La herramienta que necesitabas para tomar decisiones basadas en datos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => router.push('/registro')}
                  className="px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:shadow-xl font-semibold text-lg transition transform hover:scale-105"
                >
                  Comenzar Ahora →
                </button>
                <button
                  onClick={() => router.push('/demo')}
                  className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-lg hover:bg-teal-50 font-semibold text-lg transition"
                >
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
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&h=600&fit=crop"
                  alt="Chef cocinando"
                  className="w-full h-auto"
                />
                <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📈</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rentabilidad</p>
                      <p className="text-xl font-bold text-green-600">+35%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 bg-gradient-to-r from-teal-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center text-white">
                <p className="text-4xl font-bold mb-2">{stat.number}</p>
                <p className="text-teal-100 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULOS */}
      <section className="py-20 bg-white" id="modulos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              9 Módulos Integrados
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Una plataforma completa que cubre todas las necesidades de tu restaurante
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulos.map((modulo, idx) => (
              <div
                key={idx}
                className={`relative p-6 bg-gradient-to-br ${modulo.color} rounded-xl border-2 ${modulo.border} hover:shadow-xl transition-all hover:-translate-y-1 group`}
              >
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
      <section className="py-20 bg-gradient-to-br from-gray-50 to-teal-50">
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
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="text-5xl mb-6">👁️</div>
              <h2 className="text-3xl font-bold mb-4">Nuestra Visión</h2>
              <p className="text-lg leading-relaxed text-teal-100">
                Ser la plataforma líder en gestión de restaurantes a nivel global, 
                empoderando a hosteleros con tecnología que transforma datos en decisiones 
                inteligentes. Soñamos con un sector hostelero más eficiente, rentable y 
                sostenible.
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
              <div className="text-5xl mb-6"></div>
              <h2 className="text-3xl font-bold mb-4">Nuestra Misión</h2>
              <p className="text-lg leading-relaxed text-blue-100">
                Proporcionar herramientas tecnológicas intuitivas y potentes que 
                simplifiquen la gestión de restaurantes. Nos comprometemos a 
                reducir la complejidad operativa, optimizar costes y aumentar 
                la rentabilidad de cada establecimiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir KOST Software?
            </h2>
            <p className="text-xl text-gray-600">Resultados reales que marcan la diferencia</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-4xl mb-4">️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ahorra Tiempo</h3>
              <p className="text-gray-600">
                Automatiza procesos manuales. Reduce hasta un 80% el tiempo dedicado 
                a cálculos de costes y gestión de inventario.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Aumenta Beneficios</h3>
              <p className="text-gray-600">
                Nuestros clientes mejoran su rentabilidad un 35% de media en los 
                primeros 6 meses gracias al control preciso de costes.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Acceso Total</h3>
              <p className="text-gray-600">
                Gestiona tu restaurante desde cualquier lugar, en cualquier momento. 
                Multi-dispositivo y multi-usuario.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para transformar tu restaurante?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Únete a cientos de restaurantes que ya confían en KOST Software
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/registro')}
              className="px-8 py-4 bg-white text-teal-600 rounded-lg hover:shadow-xl font-semibold text-lg transition transform hover:scale-105"
            >
              Comenzar Prueba Gratis
            </button>
            <button
              onClick={() => router.push('/contacto')}
              className="px-8 py-4 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white hover:text-teal-600 font-semibold text-lg transition"
            >
              Contactar Ventas
            </button>
          </div>
          <p className="mt-6 text-teal-100 text-sm">
            Sin compromiso • Configuración inmediata • Soporte incluido
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">K</span>
                </div>
                <div>
                  <h3 className="text-white font-bold">KOST Software</h3>
                  <p className="text-xs text-gray-400">Restaurant Manager™</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Transformando la gestión de restaurantes desde 2024
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-white transition">Características</button></li>
                <li><button className="hover:text-white transition">Precios</button></li>
                <li><button className="hover:text-white transition">Demo</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-white transition">Sobre Nosotros</button></li>
                <li><button className="hover:text-white transition">Contacto</button></li>
                <li><button className="hover:text-white transition">Blog</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-white transition">Privacidad</button></li>
                <li><button className="hover:text-white transition">Términos</button></li>
                <li><button className="hover:text-white transition">Cookies</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>© 2024 KOST Software™. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
