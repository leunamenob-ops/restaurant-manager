import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { codigo, pin } = await request.json();

    console.log('🔍 Intento de login:', { codigo, pin });

    // Buscar usuario en la tabla 'usuarios' (NO haccp_usuarios)
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id_usuario, nombre, email, rol, hotel_id, activo, password')
      .eq('id_usuario', codigo)
      .eq('password', String(pin))
      .eq('activo', true)
      .single();

    console.log('📊 Resultado DB:', { usuario, error });

    if (error || !usuario) {
      console.error('❌ Usuario no encontrado o inactivo');
      return NextResponse.json({ 
        error: 'Código o PIN incorrecto, o usuario inactivo' 
      }, { status: 401 });
    }

    // Obtener permisos
    const { data: permisos } = await supabase
      .from('usuario_permisos')
      .select('*')
      .eq('id_usuario', codigo);

    const permisosMap: Record<string, any> = {};
    permisos?.forEach((p: any) => {
      permisosMap[p.modulo] = {
        puede_ver: p.puede_ver,
        puede_crear: p.puede_crear,
        puede_editar: p.puede_editar,
        puede_eliminar: p.puede_eliminar,
        puede_exportar: p.puede_exportar
      };
    });

    console.log('✅ Login exitoso:', usuario.nombre);

    return NextResponse.json({ 
      success: true, 
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        cargo: usuario.email || usuario.nombre,
        rol: usuario.rol,
        hotel_id: usuario.hotel_id
      },
      permisos: permisosMap
    });

  } catch (error: any) {
    console.error('💥 Error crítico:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}