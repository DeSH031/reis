import { computeDocumentTotals } from "./totals";
import type {
  ClientRequisites,
  DocKind,
  DocStatus,
  DocumentSnapshot,
  SupplierRequisites,
  TripItem,
} from "./types";

export function sanitize(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number" && isNaN(val)) return "—";
  const s = String(val).trim();
  return s === "" ? "—" : s;
}

export interface BuildSnapshotParams {
  document: {
    id: string;
    number: string;
    doc_type: DocKind;
    issue_date: string;
    year: number;
    seq: number;
    status: DocStatus;
  };
  supplierRaw?: Record<string, unknown> | null;
  clientRaw?: Record<string, unknown> | null;
  tripsRaw: Array<{
    id: string;
    number: string;
    origin_city?: string | null;
    origin_address?: string | null;
    dest_city?: string | null;
    dest_address?: string | null;
    loading_date?: string | null;
    unloading_date?: string | null;
    cargo_type?: string | null;
    cargo_weight_t?: number | string | null;
    cargo_volume_m3?: number | string | null;
    cargo_description?: string | null;
    freight_price: number | string;
    vat_mode: "incl" | "excl" | "none";
    vehicle?: { plate?: string | null; make_model?: string | null } | null;
    trailer_plate?: string | null;
    driver?: { name?: string | null; phone?: string | null } | null;
  }>;
  vatPercent: number | null;
}

export function buildDocumentSnapshot(params: BuildSnapshotParams): DocumentSnapshot {
  const s = params.supplierRaw ?? {};
  const c = params.clientRaw ?? {};

  const supplier: SupplierRequisites = {
    name: sanitize(s.name),
    bin: sanitize(s.bin),
    address: sanitize(s.address),
    bank: sanitize(s.bank),
    bik: sanitize(s.bik),
    iik: sanitize(s.iik),
    kbe: sanitize(s.kbe),
    director: sanitize(s.director),
    accountant: sanitize(s.accountant),
    phone: s.phone ? sanitize(s.phone) : undefined,
  };

  const client: ClientRequisites = {
    id: sanitize(c.id),
    name: sanitize(c.name),
    bin: sanitize(c.bin),
    address: sanitize(c.legal_address ?? c.address),
    phone: sanitize(c.contact_phone ?? c.phone),
    contactName: sanitize(c.contact_name ?? c.contactName),
    contractNumber: sanitize(c.contract_number ?? c.contractNumber),
    contractDate: sanitize(c.contract_date ?? c.contractDate),
  };

  const trips: TripItem[] = params.tripsRaw.map((t) => {
    const priceNum = Number(t.freight_price);
    const validPrice = isNaN(priceNum) ? 0 : priceNum;

    return {
      id: sanitize(t.id),
      number: sanitize(t.number),
      origin_city: sanitize(t.origin_city),
      origin_address: sanitize(t.origin_address),
      dest_city: sanitize(t.dest_city),
      dest_address: sanitize(t.dest_address),
      loading_date: sanitize(t.loading_date),
      unloading_date: sanitize(t.unloading_date),
      cargo_type: sanitize(t.cargo_type),
      cargo_weight_t: sanitize(t.cargo_weight_t),
      cargo_volume_m3: sanitize(t.cargo_volume_m3),
      cargo_description: sanitize(t.cargo_description),
      vehicle_plate: sanitize(t.vehicle?.plate),
      vehicle_model: sanitize(t.vehicle?.make_model),
      trailer_plate: sanitize(t.trailer_plate),
      driver_name: sanitize(t.driver?.name),
      driver_phone: sanitize(t.driver?.phone),
      freight_price: validPrice,
      vat_mode: t.vat_mode ?? "none",
    };
  });

  const totals = computeDocumentTotals(
    trips.map((t) => ({ freight_price: t.freight_price, vat_mode: t.vat_mode })),
    params.vatPercent,
  );

  return {
    document: {
      id: sanitize(params.document.id),
      number: sanitize(params.document.number),
      doc_type: params.document.doc_type,
      issue_date: sanitize(params.document.issue_date),
      year: params.document.year,
      seq: params.document.seq,
      status: params.document.status,
    },
    supplier,
    client,
    trips,
    totals,
  };
}
