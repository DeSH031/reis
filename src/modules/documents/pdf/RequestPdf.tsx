import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney } from "@/core/format";
import { styles } from "./styles";
import type { DocumentSnapshot } from "../types";

export function RequestPdf({ data }: { data: DocumentSnapshot }) {
  const { document: doc, supplier, client, trips, totals } = data;
  const trip = trips[0] ?? ({} as (typeof trips)[0]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            ЗАЯВКА-ДОГОВОР НА ПЕРЕВОЗКУ ГРУЗА № {doc.number}
          </Text>
          <Text style={styles.subtitle}>от {doc.issue_date} г.</Text>
        </View>

        <View style={styles.gridTwo}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>1. ПЕРЕВОЗЧИК</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Наименование:</Text>
              <Text style={styles.valueBold}>{supplier.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>БИН/ИИН:</Text>
              <Text style={styles.value}>{supplier.bin}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Адрес:</Text>
              <Text style={styles.value}>{supplier.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Банк:</Text>
              <Text style={styles.value}>{supplier.bank}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ИИК:</Text>
              <Text style={styles.value}>{supplier.iik}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>БИК / КБЕ:</Text>
              <Text style={styles.value}>{supplier.bik} / {supplier.kbe}</Text>
            </View>
            {supplier.phone && (
              <View style={styles.row}>
                <Text style={styles.label}>Телефон:</Text>
                <Text style={styles.value}>{supplier.phone}</Text>
              </View>
            )}
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>2. ЗАКАЗЧИК</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Наименование:</Text>
              <Text style={styles.valueBold}>{client.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>БИН/ИИН:</Text>
              <Text style={styles.value}>{client.bin}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Адрес:</Text>
              <Text style={styles.value}>{client.address}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Телефон:</Text>
              <Text style={styles.value}>{client.phone}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Контакт:</Text>
              <Text style={styles.value}>{client.contactName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Договор:</Text>
              <Text style={styles.value}>№ {client.contractNumber} от {client.contractDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. УСЛОВИЯ ПЕРЕВОЗКИ И МАРШРУТ</Text>
          <View style={styles.gridTwo}>
            <View style={styles.col}>
              <View style={styles.row}>
                <Text style={styles.label}>Пункт погрузки:</Text>
                <Text style={styles.value}>{trip.origin_city}, {trip.origin_address}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Дата погрузки:</Text>
                <Text style={styles.value}>{trip.loading_date}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Груз / описание:</Text>
                <Text style={styles.value}>{trip.cargo_description} ({trip.cargo_type})</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Вес / объём:</Text>
                <Text style={styles.value}>{trip.cargo_weight_t} т / {trip.cargo_volume_m3} м³</Text>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.row}>
                <Text style={styles.label}>Пункт выгрузки:</Text>
                <Text style={styles.value}>{trip.dest_city}, {trip.dest_address}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Дата выгрузки:</Text>
                <Text style={styles.value}>{trip.unloading_date}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Автомобиль / прицеп:</Text>
                <Text style={styles.value}>{trip.vehicle_plate} ({trip.vehicle_model}) / {trip.trailer_plate}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Водитель / тел.:</Text>
                <Text style={styles.value}>{trip.driver_name} / {trip.driver_phone}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. РАСЧЁТ СТОИМОСТИ ПЕРЕВОЗКИ</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { width: "6%" }, styles.textCenter]}>№</Text>
              <Text style={[styles.tableCell, { width: "24%" }]}>Номер рейса</Text>
              <Text style={[styles.tableCell, { width: "36%" }]}>Маршрут / Характер груза</Text>
              <Text style={[styles.tableCell, { width: "16%" }, styles.textRight]}>Ставка</Text>
              <Text style={[styles.tableCellLast, { width: "18%" }, styles.textRight]}>Сумма</Text>
            </View>
            {trips.map((t, idx) => (
              <View key={t.id || idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "6%" }, styles.textCenter]}>{idx + 1}</Text>
                <Text style={[styles.tableCell, { width: "24%" }]}>{t.number}</Text>
                <Text style={[styles.tableCell, { width: "36%" }]}>{t.origin_city} → {t.dest_city} ({t.cargo_description})</Text>
                <Text style={[styles.tableCell, { width: "16%" }, styles.textRight]}>{formatMoney(t.freight_price)}</Text>
                <Text style={[styles.tableCellLast, { width: "18%" }, styles.textRight]}>{formatMoney(t.freight_price)}</Text>
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
              <Text style={[styles.label, { fontWeight: "bold" }]}>Всего к оплате:</Text>
              <Text style={[styles.valueBold, { fontSize: 9.5 }]}>{formatMoney(totals.total)}</Text>
            </View>
          </View>

          <View style={styles.wordsBox}>
            <Text style={{ fontSize: 7.5, color: "#4b5563", marginBottom: 2 }}>Всего к оплате прописью:</Text>
            <Text style={styles.wordsText}>{totals.totalInWords}</Text>
          </View>
        </View>

        <View style={styles.signaturesBox}>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>ОТ ПЕРЕВОЗЧИКА:</Text>
            <Text style={{ fontSize: 8 }}>{supplier.director}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / М.П.)</Text>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.sectionTitle}>ОТ ЗАКАЗЧИКА:</Text>
            <Text style={{ fontSize: 8 }}>{client.contactName}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureHint}>(подпись / М.П.)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
