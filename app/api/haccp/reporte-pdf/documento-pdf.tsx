import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface Props {
  inicio: string;
  fin: string;
  registrosPorCategoria: any;
  totalRegistros: number;
  totalOK: number;
  totalNOK: number;
  porcentajeCumplimiento: number;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff', color: '#334155' },
  header: { marginBottom: 30, textAlign: 'center', borderBottomWidth: 3, borderBottomColor: '#0891b2', paddingBottom: 20 },
  logo: { fontSize: 26, fontWeight: 'bold', color: '#0891b2', marginBottom: 8, letterSpacing: 1 },
  title: { fontSize: 16, color: '#0e7490', marginBottom: 8, fontWeight: 'bold' },
  subtitle: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#0891b2', paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10, borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, minWidth: '22%', padding: 12, backgroundColor: '#f8fafc', borderLeftWidth: 4, borderLeftColor: '#0891b2', borderRadius: 4 },
  statLabel: { fontSize: 9, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottomWidth: 2, borderBottomColor: '#0891b2', paddingVertical: 8, paddingHorizontal: 6 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 6 },
  colFecha: { width: '22%', fontSize: 9 },
  colPCC: { width: '35%', fontSize: 9 },
  colValor: { width: '15%', fontSize: 9 },
  colEstado: { width: '13%', fontSize: 9 },
  colUsuario: { width: '15%', fontSize: 9 },
  headerText: { fontSize: 9, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  accionContainer: { backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: '#dc2626', padding: 8, marginTop: 4, marginBottom: 8, marginLeft: 6, marginRight: 6, borderRadius: 4 },
  accionText: { fontSize: 9, color: '#991b1b', fontStyle: 'italic' },
  incidenciasTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 12, marginBottom: 15, borderRadius: 4, textTransform: 'uppercase' },
  incidenciaItem: { marginBottom: 12, padding: 12, backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#dc2626', borderRadius: 4 },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, textAlign: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15 },
  footerText: { fontSize: 8, color: '#94a3b8', marginBottom: 2 }
});

const ReporteHACCP: React.FC<Props> = ({
  inicio,
  fin,
  registrosPorCategoria,
  totalRegistros,
  totalOK,
  totalNOK,
  porcentajeCumplimiento
}) => {
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
          <Text style={styles.logo}>KOST SOFTWARE</Text>
          <Text style={styles.title}>Reporte de Control de Puntos Críticos (HACCP)</Text>
          <Text style={styles.subtitle}>Período: {formatearFecha(inicio)} al {formatearFecha(fin)}</Text>
          <Text style={styles.subtitle}>Generado: {new Date().toLocaleString('es-ES')}</Text>
        </View>

        {/* ESTADÍSTICAS */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}><Text>Resumen General</Text></View>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Registros</Text>
              <Text style={styles.statValue}>{totalRegistros}</Text>
            </View>
            <View style={{...styles.statBox, borderLeftColor: '#16a34a'}}>
              <Text style={styles.statLabel}>Registros OK</Text>
              <Text style={{...styles.statValue, color: '#16a34a'}}>{totalOK}</Text>
            </View>
            <View style={{...styles.statBox, borderLeftColor: '#dc2626'}}>
              <Text style={styles.statLabel}>Incidencias NO_OK</Text>
              <Text style={{...styles.statValue, color: '#dc2626'}}>{totalNOK}</Text>
            </View>
            <View style={{...styles.statBox, borderLeftColor: porcentajeCumplimiento >= 95 ? '#16a34a' : porcentajeCumplimiento >= 85 ? '#eab308' : '#dc2626'}}>
              <Text style={styles.statLabel}>Cumplimiento</Text>
              <Text style={{...styles.statValue, color: porcentajeCumplimiento >= 95 ? '#16a34a' : porcentajeCumplimiento >= 85 ? '#eab308' : '#dc2626'}}>
                {porcentajeCumplimiento}%
              </Text>
            </View>
          </View>
        </View>

        {/* REGISTROS POR CATEGORÍA */}
        {Object.keys(registrosPorCategoria).map((catNombre) => {
          const catData = registrosPorCategoria[catNombre];
          const regs = catData.items || [];
          
          return (
            <View key={catNombre} style={styles.section} break>
              <View style={styles.sectionTitle}>
                <Text>{catNombre}</Text> {/* ¡Aquí se muestra "Refrigeración", "Cocción", etc. directamente! */}
              </View>
              
              <View style={styles.tableHeader}>
                <Text style={{...styles.headerText, ...styles.colFecha}}>Fecha / Hora</Text>
                <Text style={{...styles.headerText, ...styles.colPCC}}>Punto de Control</Text>
                <Text style={{...styles.headerText, ...styles.colValor}}>Valor</Text>
                <Text style={{...styles.headerText, ...styles.colEstado}}>Estado</Text>
                <Text style={{...styles.headerText, ...styles.colUsuario}}>Usuario</Text>
              </View>

              {regs.map((reg: any, index: number) => (
                <View key={index}>
                  <View style={styles.tableRow}>
                    <Text style={styles.colFecha}>{formatearFechaHora(reg.fecha_hora)}</Text>
                    <Text style={styles.colPCC}>{reg.nombre_pcc}</Text>
                    <Text style={styles.colValor}>{reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}</Text>
                    <Text style={{...styles.colEstado, color: reg.estado === 'OK' ? '#16a34a' : '#dc2626', fontWeight: 'bold'}}>
                      {reg.estado}
                    </Text>
                    <Text style={styles.colUsuario}>{reg.id_usuario}</Text>
                  </View>
                  
                  {reg.accion_correctora && (
                    <View style={styles.accionContainer}>
                      <Text style={styles.accionText}>⚠️ Acción Correctora: {reg.accion_correctora}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        })}

        {/* INCIDENCIAS DESTACADAS */}
        {totalNOK > 0 && (
          <View style={styles.section} break>
            <View style={styles.incidenciasTitle}><Text>Incidencias Detectadas</Text></View>
            
            {Object.values(registrosPorCategoria).flatMap((catData: any) => catData.items)
              .filter((r: any) => r.estado === 'NO_OK')
              .map((inc: any, index: number) => (
                <View key={index} style={styles.incidenciaItem}>
                  <Text style={{fontSize: 11, fontWeight: 'bold', color: '#1e293b', marginBottom: 4}}>
                    {index + 1}. {inc.nombre_pcc}
                  </Text>
                  <Text style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>
                    📅 Fecha: {formatearFechaHora(inc.fecha_hora)}
                  </Text>
                  <Text style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>
                    📊 Valor Registrado: {inc.valor_medido || inc.temp_final || 'N/A'} {inc.unidad || ''}
                  </Text>
                  <Text style={{fontSize: 9, color: '#dc2626', fontWeight: 'bold'}}>
                    🔧 Acción Correctora: {inc.accion_correctora || 'No documentada'}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>________________________________________</Text>
          <Text style={styles.footerText}>Reporte generado automáticamente por KOST Software</Text>
          <Text style={styles.footerText}>Sistema de Gestión HACCP para Hostelería</Text>
          <Text style={{...styles.footerText, marginTop: 4, fontSize: 7}}>© {new Date().getFullYear()} Todos los derechos reservados</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReporteHACCP;
