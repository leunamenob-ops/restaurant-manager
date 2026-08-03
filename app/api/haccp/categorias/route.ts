import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('📂 [API CATEGORIAS] Iniciando consulta...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('haccp_categorias')
      .select('id, nombre')
      .order('nombre');

    if (error) {
      console.error('❌ [API CATEGORIAS] Error en Supabase:', error);
      throw error;
    }

    console.log('✅ [API CATEGORIAS] Datos encontrados:', data?.length || 0);
    console.log('📋 [API CATEGORIAS] Data:', JSON.stringify(data, null, 2));

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('❌ [API CATEGORIAS] Error fatal:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
