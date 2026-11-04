import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/core/format";
import { styles } from "./styles";
import type { DocumentSnapshot } from "../types";

export function TtnPdf({ data }: { data: DocumentSnapshot }) {
  const { document: doc, supplier, client, trips, totals } = data;
  const trip = trips[0] ?? ({} as (typeof trips)[0]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>ТОВАРНО-ТРАНСПОРТНАЯ НАКЛАДНАЯ № {doc.number}</Text>
          <Text style={styles.subtitle}>от {doc.issue_date} г.</Text>
        </View>

        <View style={styles.gridTwo}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>1. УЧАСТНИКИ ПЕРЕВОЗКИ</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Грузоотправитель:</Text>
              <Text style={styles.valueBold}>{client.name}, БИН {client.bin}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Адрес погрузки:</Text>
              <Text style={styles.value}>{trip.origin_city}, {trip.origin_address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Грузополучатель:</Text>
              <Text style={styles.valueBold}>{client.name}, БИН {client.bin}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Адрес выгрузки:</Text>
              <Text style={styles.value}>{trip.dest_city}, {trip.dest_address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Перевозчик:</Text>
              <Text style={styles.value}>{supplier.name}, БИН {supplier.bin}</Text>
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>2. ТРАНСПОРТНЫЕ ДАННЫЕ</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Автомобиль:</Text>
              <Text style={styles.value}>{trip.vehicle_plate} ({trip.vehicle_model})</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Прицеп / п/п:</Text>
              <Text style={styles.value}>{trip.trailer_plate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Водитель:</Text>
              <Text style={styles.value}>{trip.driver_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Телефон:</Text>
              <Text style={styles.value}>{trip.driver_phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Рейс №:</Text>
              <Text style={styles.value}>{trip.number}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. СВЕДЕНИЯ О ГРУЗЕ</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: "6%" }, styles.textCenter]}>№</Text>
              <Text style={[styles.tableCell, { width: "38%" }]}>Наименование груза</Text>
              <Text style={[styles.tableCell, { width: "18%" }]}>Тип перевозки</Text>
              <Text style={[styles.tableCell, { width: "18%" }, styles.textCenter]}>Масса брутто (т)</Text>
              <Text style={[styles.tableCellLast, { width: "20%" }, styles.textCenter]}>Объём (м³)</Text>
            </View>
            {trips.map((t, idx) => (
              <View key={t.id || idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "6%" }, styles.textCenter]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, { width: "38%" }]}>{t.cargo_description || t.cargo_type}</Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{t.cargo_type}</Text>
                <Text style={[styles.tableCell, { width: "18%" }, styles.textCenter]}>{t.cargo_weight_t}</Text>
                <Text style={[styles.tableCellLast, { width: "20%" }, styles.textCenter]}>{t.cargo_volume_m3}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. СТОИМОСТЬ ТРАНСПОРТНЫХ УСЛУГ</Text>
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Сумма без НДС:</Text>
              <Text style={styles.valueBold}>{formatMoney(totals.subtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.label}>
                {totals.vatMode === "none"
                  ? "Без НДС"
                  : `В т.ч. НДС (${totals.vatPercent ?? 12}%):`}
              </Text>
              <Text style={styles.valueBold}>
                {totals.vatMode === "none" ? "—" : formatMoney(totals.vat)}
              </Text>
            </View>
            <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: "#111827", paddingTop: 4 }]}>
              <Text style={[styles.label, { fontWeight: "bold" }]}>Всего к оплате:</Text>
              <Text style={[styles.valueBold, { fontSize: 9.5 }]}>{formatMoney(totals.total)}</Text>
            </View>
          </View>

          <View style={styles.wordsBox}>
            <Text style={{ fontSize: 7.5, color: "#4b5563", marginBottom: 2 }}>Сумма прописью:</Text>
            <Text style={styles.wordsText}>{totals.totalInWords}</Text>
          </View>
        </View>

        <View style={styles.signaturesBox}>
          <View style={{ width: "30%" }}>
            <Text style={styles.sectionTitle}>ОТПУСК ГРУЗА РАЗРЕШИЛ:</Text>
            <Text style={{ fontSize: 8 }}>{client.contactName}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / штамп)</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Text style={styles.sectionTitle}>СДАЛ ВОДИТЕЛЬ:</Text>
            <Text style={{ fontSize: 8 }}>{trip.driver_name}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись водителя)</Text>
          </View>
          <View style={{ width: "30%" }}>
            <Text style={styles.sectionTitle}>ПРИНЯЛ ГРУЗОПОЛУЧАТЕЛЬ:</Text>
            <Text style={{ fontSize: 8 }}>Представитель</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / штамп)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
