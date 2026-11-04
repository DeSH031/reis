export type DocKind = "request" | "invoice" | "act" | "ttn";
export type DocStatus = "draft" | "issued" | "signed" | "sent" | "paid";

export interface DocKindConfig {
  key: DocKind;
  label: string;
  prefix: string;
  title: string;
  shortLabel: string;
}

export const DOC_KINDS: Record<DocKind, DocKindConfig> = {
  request: { key: "request", label: "Заявка на перевозку", prefix: "ЗП", title: "Заявка-договор на перевозку груза", shortLabel: "Заявка" },
  invoice: { key: "invoice", label: "Счёт на оплату", prefix: "СЧ", title: "Счёт на оплату", shortLabel: "Счёт" },
  act: { key: "act", label: "Акт выполненных работ", prefix: "АКТ", title: "Акт выполненных работ (оказанных услуг)", shortLabel: "Акт" },
  ttn: { key: "ttn", label: "Товарно-транспортная накладная", prefix: "ТТН", title: "Товарно-транспортная накладная", shortLabel: "ТТН" },
};

export const DOC_STATUSES: Record<DocStatus, { label: string; color: string }> = {
  draft: { label: "Черновик", color: "text-muted" },
  issued: { label: "Выставлен", color: "text-accent" },
  sent: { label: "Отправлен", color: "text-accent" },
  signed: { label: "Подписан", color: "text-positive" },
  paid: { label: "Оплачен", color: "text-positive" },
};

export interface SupplierRequisites {
  name: string;
  bin: string;
  address: string;
  bank: string;
  bik: string;
  iik: string;
  kbe: string;
  director: string;
  accountant: string;
  phone?: string;
}

export interface ClientRequisites {
  id: string;
  name: string;
  bin: string;
  address: string;
  phone: string;
  contactName: string;
  contractNumber: string;
  contractDate: string;
}

export interface TripItem {
  id: string;
  number: string;
  origin_city: string;
  origin_address: string;
  dest_city: string;
  dest_address: string;
  loading_date: string;
  unloading_date: string;
  cargo_type: string;
  cargo_weight_t: string;
  cargo_volume_m3: string;
  cargo_description: string;
  vehicle_plate: string;
  vehicle_model: string;
  trailer_plate: string;
  driver_name: string;
  driver_phone: string;
  freight_price: number;
  vat_mode: "incl" | "excl" | "none";
}

export interface DocumentTotals {
  subtotalTiyn: number;
  vatTiyn: number;
  totalTiyn: number;
  subtotal: number;
  vat: number;
  total: number;
  vatMode: "incl" | "excl" | "none";
  vatPercent: number | null;
  totalInWords: string;
}

export interface DocumentSnapshot {
  document: {
    id: string;
    number: string;
    doc_type: DocKind;
    issue_date: string;
    year: number;
    seq: number;
    status: DocStatus;
  };
  supplier: SupplierRequisites;
  client: ClientRequisites;
  trips: TripItem[];
  totals: DocumentTotals;
}
