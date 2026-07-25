import { supabase } from '../lib/supabaseClient';

const cargarProductos = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    const { data, error } = await supabase
      .from('ingredientes')
      .select(`
        *,
        proveedores:proveedor_id (
          nombre
        )
      `)
      .order('nombre');

    if (error) throw error;

    const productosTransformados = data?.map((item: any) => ({
      ...item,
      proveedor_nombre: item.proveedores?.nombre || item.proveedor_nombre || 'Sin proveedor'
    })) || [];

    setTodosProductos(productosTransformados);
    
    const proveedores = Array.from(
      new Set(
        productosTransformados
          .map((p: any) => p.proveedor_nombre)
          .filter(Boolean)
      )
    ) as string[];
    
    setProveedoresUnicos(proveedores.sort());
    setProductosFiltrados(productosTransformados);
    
  } catch (err: any) {
    console.error('Error cargando productos:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);
