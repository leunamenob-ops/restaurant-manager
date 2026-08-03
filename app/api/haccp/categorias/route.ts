import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('📂 API /api/haccp/categorias - Iniciando carga...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('haccp_categorias')
      .select('id, nombre')
      .order('nombre');

    if (error) {
      console.error('❌ Error en Supabase:', error);
      throw error;
    }

    console.log('✅ Categorías encontradas:', data?.length || 0);
    console.log('📋 Datos:', data);

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('❌ Error en API de categorías:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
