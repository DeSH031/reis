import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/core/format";
import { styles } from "./styles";
import type { DocumentSnapshot } from "../types";

export function ActPdf({ data }: { data: DocumentSnapshot }) {
  const { document: doc, supplier, client, trips, totals } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ) № {doc.number}
          </Text>
          <Text style={styles.subtitle}>от {doc.issue_date} г.</Text>
        </View>

        <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 6 }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { width: "20%" }]}>Исполнитель:</Text>
            <Text style={[styles.valueBold, { width: "80%" }]}>
              {supplier.name}, БИН {supplier.bin}, {supplier.address}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: "20%" }]}>Заказчик:</Text>
            <Text style={[styles.valueBold, { width: "80%" }]}>
              {client.name}, БИН/ИИН {client.bin}, {client.address}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: "20%" }]}>Основание:</Text>
            <Text style={[styles.value, { width: "80%" }]}>
              Договор № {client.contractNumber} от {client.contractDate}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { width: "5%" }, styles.textCenter]}>№</Text>
            <Text style={[styles.tableCell, { width: "45%" }]}>Наименование работ (услуг)</Text>
            <Text style={[styles.tableCell, { width: "12%" }, styles.textCenter]}>Дата</Text>
            <Text style={[styles.tableCell, { width: "7%" }, styles.textCenter]}>Кол-во</Text>
            <Text style={[styles.tableCell, { width: "15%" }, styles.textRight]}>Цена</Text>
            <Text style={[styles.tableCellLast, { width: "16%" }, styles.textRight]}>Сумма</Text>
          </View>
          {trips.map((t, idx) => (
            <View key={t.id || idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "5%" }, styles.textCenter]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, { width: "45%" }]}>
                Перевозка груза {t.origin_city} — {t.dest_city} (Рейс {t.number})
              </Text>
              <Text style={[styles.tableCell, { width: "12%" }, styles.textCenter]}>
                {t.unloading_date !== "—" ? t.unloading_date : t.loading_date}
              </Text>
              <Text style={[styles.tableCell, { width: "7%" }, styles.textCenter]}>1</Text>
              <Text style={[styles.tableCell, { width: "15%" }, styles.textRight]}>
                {formatMoney(t.freight_price)}
              </Text>
              <Text style={[styles.tableCellLast, { width: "16%" }, styles.textRight]}>
                {formatMoney(t.freight_price)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.label}>Сумма без НДС:</Text>
            <Text style={styles.valueBold}>{formatMoney(totals.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.label}>
              {totals.vatMode === "none"
                ? "Без НДС"
                : `НДС (${totals.vatPercent ?? 12}%):`}
            </Text>
            <Text style={styles.valueBold}>
              {totals.vatMode === "none" ? "—" : formatMoney(totals.vat)}
            </Text>
          </View>
          <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: "#111827", paddingTop: 4 }]}>
            <Text style={[styles.label, { fontWeight: "bold" }]}>Всего с НДС:</Text>
            <Text style={[styles.valueBold, { fontSize: 9.5 }]}>{formatMoney(totals.total)}</Text>
          </View>
        </View>

        <View style={styles.wordsBox}>
          <Text style={{ fontSize: 7.5, color: "#4b5563", marginBottom: 2 }}>Всего оказано услуг на сумму:</Text>
          <Text style={styles.wordsText}>{totals.totalInWords}</Text>
        </View>

        <View style={{ marginVertical: 8 }}>
          <Text style={{ fontSize: 7.5, color: "#374151" }}>
            Вышеперечисленные услуги оказаны полностью и в срок. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.
          </Text>
        </View>

        <View style={styles.signaturesBox}>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>ИСПОЛНИТЕЛЬ (СДАЛ):</Text>
            <Text style={{ fontSize: 8 }}>{supplier.director}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / М.П.)</Text>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>ЗАКАЗЧИК (ПРИНЯЛ):</Text>
            <Text style={{ fontSize: 8 }}>{client.contactName}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / М.П.)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
