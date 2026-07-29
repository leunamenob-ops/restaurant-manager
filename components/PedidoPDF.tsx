import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface PedidoPDFProps {
  numeroPedido: string;
  fecha: string;
  restaurante: string;
  total: number;
  items: Array<{
    codigo: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precio: number;
    subtotal: number;
  }>;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#059669', // Emerald 600
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerText: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    color: '#059669',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoSection: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f0fdf4', // Emerald 50
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 10,
    color: '#1f2937',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    color: 'white',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    fontSize: 9,
  },
  tableCol: {
    width: '20%',
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: 2,
    borderTopColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalBox: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 5,
    minWidth: 200,
  },
  totalLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 20,
    color: '#059669',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
});

export const PedidoPDF = ({ numeroPedido, fecha, restaurante, total, items }: PedidoPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          {/* LOGO - Si no tienes logo aún, usa este texto temporal */}
          {/* <Image src="https://kostsoftware.com/logo.png" style={styles.logo} /> */}
          <View style={{ 
            width: 80, 
            height: 80, 
            backgroundColor: '#059669', 
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>K</Text>
          </View>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>PEDIDO</Text>
          <Text style={styles.subtitle}>{numeroPedido}</Text>
        </View>
      </View>

      {/* INFO DEL PEDIDO */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fecha:</Text>
          <Text style={styles.infoValue}>{fecha}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Restaurante:</Text>
          <Text style={styles.infoValue}>{restaurante}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total de productos:</Text>
          <Text style={styles.infoValue}>{items.length} items</Text>
        </View>
      </View>

      {/* TABLA DE PRODUCTOS */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={styles.tableCol}><Text>Código</Text></View>
          <View style={[styles.tableCol, { width: '35%' }]}><Text>Descripción</Text></View>
          <View style={styles.tableCol}><Text>Cantidad</Text></View>
          <View style={styles.tableCol}><Text>Precio</Text></View>
          <View style={styles.tableCol}><Text>Subtotal</Text></View>
        </View>
        
        {items.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.tableCol}><Text>{item.codigo || 'N/A'}</Text></View>
            <View style={[styles.tableCol, { width: '35%' }]}><Text>{item.descripcion}</Text></View>
            <View style={styles.tableCol}><Text>{item.cantidad} {item.unidad}</Text></View>
            <View style={styles.tableCol}><Text>{item.precio.toFixed(2)}€</Text></View>
            <View style={styles.tableCol}><Text>{item.subtotal.toFixed(2)}€</Text></View>
          </View>
        ))}
      </View>

      {/* TOTAL */}
      <View style={styles.totalSection}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text>Este es un documento automático generado por KOST Software</Text>
        <Text>Restaurant Manager - Gestión de Pedidos</Text>
        <Text>kostsoftware.com</Text>
      </View>
    </Page>
  </Document>
);
