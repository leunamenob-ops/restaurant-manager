import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface Props {
  inicio: string;
  fin: string;
  registrosPorCategoria: any;
  categorias: any[];
  totalRegistros: number;
  totalOK: number;
  totalNOK: number;
  porcentajeCumplimiento: number;
}

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, textAlign: 'center' },
  title: { fontSize: 20, marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 5 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, backgroundColor: '#0891b2', color: 'white', padding: 5 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 4 },
  col1: { width: '25%', fontSize: 9 },
  col2: { width: '35%', fontSize: 9 },
  col3: { width: '15%', fontSize: 9 },
  col4: { width: '15%', fontSize: 9, color: 'green' },
  col5: { width: '10%', fontSize: 9 },
  statsBox: { marginBottom: 10, padding: 10, border: '1 solid #ddd' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
});

const ReporteHACCP: React.FC<Props> = ({
  inicio,
  fin,
  registrosPorCategoria,
  categorias,
  totalRegistros,
  totalOK,
  totalNOK,
  porcentajeCumplimiento
}) => {
  const categoriasMap: any = {};
  categorias.forEach(cat => {
    categoriasMap[cat.id] = cat.nombre;
  });

  const formatearFecha = (fechaStr: string) => {
    const [year, month, day] = fechaStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatearFechaHora = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>KOST SOFTWARE</Text>
          <Text style={styles.subtitle}>Reporte HACCP - Control de Puntos Críticos</Text>
          <Text style={styles.subtitle}>Período: {formatearFecha(inicio)} al {formatearFecha(fin)}</Text>
          <Text style={styles.subtitle}>Generado: {new Date().toLocaleString('es-ES')}</Text>
        </View>

        {/* ESTADÍSTICAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESUMEN GENERAL</Text>
          <View style={styles.statsBox}>
            <View style={styles.statRow}>
              <Text>Total Registros: {totalRegistros}</Text>
              <Text>Registros OK: {totalOK}</Text>
            </View>
            <View style={styles.statRow}>
              <Text>Incidencias NO_OK: {totalNOK}</Text>
              <Text>Cumplimiento: {porcentajeCumplimiento}%</Text>
            </View>
          </View>
        </View>

        {/* REGISTROS POR CATEGORÍA */}
        {Object.keys(registrosPorCategoria).map((catId) => {
          const catNombre = categoriasMap[catId] || catId;
          const regs = registrosPorCategoria[catId];
          
          return (
            <View key={catId} style={styles.section} break>
              <Text style={styles.sectionTitle}>{catNombre}</Text>
              
              {/* Encabezados de tabla */}
              <View style={styles.row}>
                <Text style={styles.col1}>Fecha/Hora</Text>
                <Text style={styles.col2}>PCC</Text>
                <Text style={styles.col3}>Valor</Text>
                <Text style={styles.col4}>Estado</Text>
                <Text style={styles.col5}>Usuario</Text>
              </View>

              {/* Registros */}
              {regs.map((reg: any, index: number) => (
                <View key={index} style={styles.row}>
                  <Text style={styles.col1}>{formatearFechaHora(reg.fecha_hora)}</Text>
                  <Text style={styles.col2}>{reg.nombre_pcc}</Text>
                  <Text style={styles.col3}>{reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}</Text>
                  <Text style={{...styles.col4, color: reg.estado === 'OK' ? 'green' : 'red'}}>
                    {reg.estado}
                  </Text>
                  <Text style={styles.col5}>{reg.id_usuario}</Text>
                </View>
              ))}

              {/* Acciones correctoras */}
              {regs.filter((r: any) => r.accion_correctora).map((reg: any, idx: number) => (
                <View key={`acc-${idx}`} style={{...styles.row, backgroundColor: '#fff5f5'}}>
                  <Text style={{...styles.col2, width: '100%'}}>
                    ⚠️ Acción: {reg.accion_correctora}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* INCIDENCIAS */}
        {totalNOK > 0 && (
          <View style={styles.section} break>
            <Text style={{...styles.sectionTitle, backgroundColor: '#dc2626'}}>
              INCIDENCIAS DETECTADAS
            </Text>
            
            {Object.values(registrosPorCategoria).flat()
              .filter((r: any) => r.estado === 'NO_OK')
              .map((inc: any, index: number) => (
                <View key={index} style={{...styles.section, marginTop: 10}}>
                  <Text style={{fontSize: 11, fontWeight: 'bold'}}>
                    {index + 1}. {inc.nombre_pcc}
                  </Text>
                  <Text style={{fontSize: 9, marginLeft: 10}}>
                    Fecha: {formatearFechaHora(inc.fecha_hora)}
                  </Text>
                  <Text style={{fontSize: 9, marginLeft: 10}}>
                    Valor: {inc.valor_medido || inc.temp_final} {inc.unidad || ''}
                  </Text>
                  <Text style={{fontSize: 9, marginLeft: 10, color: '#dc2626'}}>
                    Acción correctora: {inc.accion_correctora || 'No documentada'}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* FOOTER */}
        <View style={{position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center'}}>
          <Text style={{fontSize: 8, color: '#999'}}>
            ________________________________________
          </Text>
          <Text style={{fontSize: 8, color: '#999'}}>
            Reporte generado automáticamente por KOST Software
          </Text>
          <Text style={{fontSize: 8, color: '#999'}}>
            Sistema de Gestión HACCP para Hostelería
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReporteHACCP; 
