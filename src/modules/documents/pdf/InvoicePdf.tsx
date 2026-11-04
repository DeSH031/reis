import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/core/format";
import { styles } from "./styles";
import type { DocumentSnapshot } from "../types";

export function InvoicePdf({ data }: { data: DocumentSnapshot }) {
  const { document: doc, supplier, client, trips, totals } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ marginBottom: 10, borderWidth: 1, borderColor: "#111827" }}>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111827" }}>
            <View style={{ width: "65%", padding: 4, borderRightWidth: 1, borderRightColor: "#111827" }}>
              <Text style={{ fontSize: 7, color: "#4b5563" }}>Банк получателя:</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold" }}>{supplier.bank}</Text>
            </View>
            <View style={{ width: "35%", padding: 4 }}>
              <Text style={{ fontSize: 7, color: "#4b5563" }}>БИК:</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold" }}>{supplier.bik}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111827" }}>
            <View style={{ width: "65%", padding: 4, borderRightWidth: 1, borderRightColor: "#111827" }}>
              <Text style={{ fontSize: 7, color: "#4b5563" }}>Получатель:</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold" }}>{supplier.name}</Text>
              <Text style={{ fontSize: 7.5 }}>БИН: {supplier.bin}</Text>
            </View>
            <View style={{ width: "35%", padding: 4 }}>
              <Text style={{ fontSize: 7, color: "#4b5563" }}>ИИК:</Text>
              <Text style={{ fontSize: 8, fontWeight: "bold" }}>{supplier.iik}</Text>
              <Text style={{ fontSize: 7, color: "#4b5563", marginTop: 2 }}>КБЕ: {supplier.kbe}</Text>
            </View>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>СЧЁТ НА ОПЛАТУ № {doc.number}</Text>
          <Text style={styles.subtitle}>от {doc.issue_date} г.</Text>
        </View>

        <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 6 }]}>
          <View style={styles.row}>
            <Text style={[styles.label, { width: "20%" }]}>Поставщик:</Text>
            <Text style={[styles.valueBold, { width: "80%" }]}>
              {supplier.name}, БИН {supplier.bin}, {supplier.address}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: "20%" }]}>Покупатель:</Text>
            <Text style={[styles.valueBold, { width: "80%" }]}>
              {client.name}, БИН/ИИН {client.bin}, {client.address}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { width: "20%" }]}>Договор:</Text>
            <Text style={[styles.value, { width: "80%" }]}>
              № {client.contractNumber} от {client.contractDate}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableCell, { width: "6%" }, styles.textCenter]}>№</Text>
            <Text style={[styles.tableCell, { width: "50%" }]}>Товары (работы, услуги)</Text>
            <Text style={[styles.tableCell, { width: "10%" }, styles.textCenter]}>Кол-во</Text>
            <Text style={[styles.tableCell, { width: "8%" }, styles.textCenter]}>Ед.</Text>
            <Text style={[styles.tableCell, { width: "13%" }, styles.textRight]}>Цена</Text>
            <Text style={[styles.tableCellLast, { width: "13%" }, styles.textRight]}>Сумма</Text>
          </View>
          {trips.map((t, idx) => (
            <View key={t.id || idx} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: "6%" }, styles.textCenter]}>{idx + 1}</Text>
              <Text style={[styles.tableCell, { width: "50%" }]}>
                Транспортно-экспедиторские услуги по маршруту {t.origin_city} — {t.dest_city} (Рейс {t.number})
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }, styles.textCenter]}>1</Text>
              <Text style={[styles.tableCell, { width: "8%" }, styles.textCenter]}>рейс</Text>
              <Text style={[styles.tableCell, { width: "13%" }, styles.textRight]}>
                {formatMoney(t.freight_price)}
              </Text>
              <Text style={[styles.tableCellLast, { width: "13%" }, styles.textRight]}>
                {formatMoney(t.freight_price)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.label}>Итого:</Text>
            <Text style={styles.valueBold}>{formatMoney(totals.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.label}>
              {totals.vatMode === "none"
                ? "Без НДС"
                : `В том числе НДС (${totals.vatPercent ?? 12}%):`}
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

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 8 }}>
            Всего наименований {trips.length}, на сумму {formatMoney(totals.total)}
          </Text>
        </View>

        <View style={styles.wordsBox}>
          <Text style={{ fontSize: 7.5, color: "#4b5563", marginBottom: 2 }}>Сумма прописью:</Text>
          <Text style={styles.wordsText}>{totals.totalInWords}</Text>
        </View>

        <View style={styles.signaturesBox}>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>Руководитель предприятия</Text>
            <Text style={{ fontSize: 8 }}>{supplier.director}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / М.П.)</Text>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>Главный бухгалтер</Text>
            <Text style={{ fontSize: 8 }}>{supplier.accountant}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
