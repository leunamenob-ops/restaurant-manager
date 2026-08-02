import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('haccp_categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('Error obteniendo categorías:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
