import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Registrar fuente personalizada si es necesario
Font.register({
  family: 'Helvetica',
  src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff'
});

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
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 30,
    textAlign: 'center',
    borderBottom: 3,
    borderBottomColor: '#0891b2',
    paddingBottom: 20
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0891b2',
    marginBottom: 8
  },
  title: {
    fontSize: 16,
    color: '#0e7490',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 3
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#0891b2',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderLeft: 4,
    borderLeftColor: '#0891b2',
    borderRadius: 4
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 2,
    borderBottomColor: '#0891b2',
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  colFecha: { width: '22%', fontSize: 9 },
  colPCC: { width: '33%', fontSize: 9 },
  colValor: { width: '15%', fontSize: 9 },
  colEstado: { width: '15%', fontSize: 9 },
  colUsuario: { width: '15%', fontSize: 9 },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase'
  },
  accionContainer: {
    backgroundColor: '#fef2f2',
    borderLeft: 3,
    borderLeftColor: '#dc2626',
    padding: 8,
    marginTop: 4,
    marginLeft: 4,
    marginRight: 4,
    marginBottom: 8
  },
  accionText: {
    fontSize: 9,
    color: '#dc2626',
    fontStyle: 'italic'
  },
  incidenciasTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#dc2626',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4
  },
  incidenciaItem: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderLeft: 3,
    borderLeftColor: '#dc2626',
    borderRadius: 4
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
    fontSize: 8,
    color: '#94a3b8'
  }
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
  // Crear mapa de categorías ID -> Nombre
  const categoriasMap: Record<string, string> = {};
  if (categorias && Array.isArray(categorias)) {
    categorias.forEach(cat => {
      if (cat.id && cat.nombre) {
        categoriasMap[cat.id] = cat.nombre;
      }
    });
  }

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
          <Text style={styles.title}>Reporte HACCP - Control de Puntos Críticos</Text>
          <Text style={styles.subtitle}>
            Período: {formatearFecha(inicio)} al {formatearFecha(fin)}
          </Text>
          <Text style={styles.subtitle}>
            Generado: {new Date().toLocaleString('es-ES')}
          </Text>
        </View>

        {/* ESTADÍSTICAS */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <Text>RESUMEN GENERAL</Text>
          </View>
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
        {Object.keys(registrosPorCategoria).map((catId) => {
          const catNombre = categoriasMap[catId] || catId;
          const regs = registrosPorCategoria[catId];
          
          return (
            <View key={catId} style={styles.section} break>
              <View style={styles.sectionTitle}>
                <Text>{catNombre}</Text>
              </View>
              
              {/* Encabezados de tabla */}
              <View style={styles.tableHeader}>
                <Text style={{...styles.headerText, ...styles.colFecha}}>Fecha/Hora</Text>
                <Text style={{...styles.headerText, ...styles.colPCC}}>PCC</Text>
                <Text style={{...styles.headerText, ...styles.colValor}}>Valor</Text>
                <Text style={{...styles.headerText, ...styles.colEstado}}>Estado</Text>
                <Text style={{...styles.headerText, ...styles.colUsuario}}>Usuario</Text>
              </View>

              {/* Registros */}
              {regs.map((reg: any, index: number) => (
                <View key={index}>
                  <View style={styles.tableRow}>
                    <Text style={styles.colFecha}>{formatearFechaHora(reg.fecha_hora)}</Text>
                    <Text style={styles.colPCC}>{reg.nombre_pcc}</Text>
                    <Text style={styles.colValor}>
                      {reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}
                    </Text>
                    <Text style={{
                      ...styles.colEstado,
                      color: reg.estado === 'OK' ? '#16a34a' : '#dc2626',
                      fontWeight: 'bold'
                    }}>
                      {reg.estado}
                    </Text>
                    <Text style={styles.colUsuario}>{reg.id_usuario}</Text>
                  </View>
                  
                  {/* Acción correctora si existe */}
                  {reg.accion_correctora && (
                    <View style={styles.accionContainer}>
                      <Text style={styles.accionText}>
                        ⚠ Acción: {reg.accion_correctora}
                      </Text>
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
            <View style={styles.incidenciasTitle}>
              <Text>INCIDENCIAS DETECTADAS</Text>
            </View>
            
            {Object.values(registrosPorCategoria).flat()
              .filter((r: any) => r.estado === 'NO_OK')
              .map((inc: any, index: number) => {
                const pcc = inc.nombre_pcc || 'PCC desconocido';
                return (
                  <View key={index} style={styles.incidenciaItem}>
                    <Text style={{fontSize: 10, fontWeight: 'bold', color: '#1e293b', marginBottom: 4}}>
                      {index + 1}. {pcc}
                    </Text>
                    <Text style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>
                       Fecha: {formatearFechaHora(inc.fecha_hora)}
                    </Text>
                    <Text style={{fontSize: 9, color: '#64748b', marginBottom: 2}}>
                      📊 Valor: {inc.valor_medido || inc.temp_final || 'N/A'} {inc.unidad || ''}
                    </Text>
                    <Text style={{fontSize: 9, color: '#dc2626', fontWeight: 'semibold'}}>
                      🔧 Acción: {inc.accion_correctora || 'No documentada'}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>Reporte generado automáticamente por KOST Software</Text>
          <Text>Sistema de Gestión HACCP para Hostelería</Text>
          <Text style={{marginTop: 4, fontSize: 7}}>© {new Date().getFullYear()} Todos los derechos reservados</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReporteHACCP;
