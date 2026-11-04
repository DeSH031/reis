export type Kind = "clients" | "vehicles" | "drivers" | "subcontractors";

export interface Field { name: string; label: string; type?: "text" | "number" | "select" | "checkbox"; options?: [string, string][]; required?: boolean }
export interface KindConfig { table: Kind; title: string; singular: string; columns: { key: string; label: string; fmt?: (v: unknown) => string }[]; fields: Field[]; order: string }

const VEHICLE_TYPES: [string, string][] = [["tent", "Тент"], ["refrigerator", "Рефрижератор"], ["dump", "Самосвал"], ["container", "Контейнеровоз"], ["flatbed", "Борт"]];
const PAY: [string, string][] = [["per_km", "За километр"], ["percent", "Процент от ставки"], ["fixed", "Фикс за рейс"]];
const label = (opts: [string, string][]) => (v: unknown) => opts.find((o) => o[0] === v)?.[1] ?? String(v ?? "");

export const KINDS: Record<Kind, KindConfig> = {
  clients: {
    table: "clients", title: "Клиенты", singular: "клиента", order: "name",
    columns: [{ key: "name", label: "Название" }, { key: "bin", label: "БИН/ИИН" }, { key: "contact_name", label: "Контакт" },
      { key: "payment_terms_days", label: "Отсрочка, дн." }, { key: "vat_payer", label: "НДС", fmt: (v) => (v ? "Да" : "Нет") }],
    fields: [{ name: "name", label: "Название", required: true }, { name: "bin", label: "БИН/ИИН" }, { name: "legal_address", label: "Юр. адрес" },
      { name: "contact_name", label: "Контактное лицо" }, { name: "contact_phone", label: "Телефон" }, { name: "contract_number", label: "Номер договора" },
      { name: "payment_terms_days", label: "Отсрочка оплаты, дней", type: "number" }, { name: "vat_payer", label: "Плательщик НДС", type: "checkbox" }],
  },
  vehicles: {
    table: "vehicles", title: "Транспорт", singular: "машину", order: "plate",
    columns: [{ key: "plate", label: "Номер" }, { key: "make_model", label: "Модель" }, { key: "type", label: "Тип", fmt: label(VEHICLE_TYPES) },
      { key: "capacity_t", label: "Грузоподъёмность, т" }, { key: "fuel_norm_loaded", label: "Норма, л/100 км (груз)" }],
    fields: [{ name: "plate", label: "Гос. номер", required: true }, { name: "make_model", label: "Марка, модель" },
      { name: "type", label: "Тип", type: "select", options: VEHICLE_TYPES }, { name: "capacity_t", label: "Грузоподъёмность, т", type: "number" },
      { name: "fuel_norm_loaded", label: "Норма расхода с грузом, л/100 км", type: "number" }, { name: "fuel_norm_empty", label: "Норма расхода порожняком, л/100 км", type: "number" }],
  },
  drivers: {
    table: "drivers", title: "Водители", singular: "водителя", order: "name",
    columns: [{ key: "name", label: "ФИО" }, { key: "phone", label: "Телефон" }, { key: "pay_scheme", label: "Схема оплаты", fmt: label(PAY) }, { key: "pay_rate", label: "Ставка" }],
    fields: [{ name: "name", label: "ФИО", required: true }, { name: "phone", label: "Телефон" },
      { name: "pay_scheme", label: "Схема оплаты", type: "select", options: PAY }, { name: "pay_rate", label: "Ставка (₸/км или %)", type: "number" },
      { name: "per_diem", label: "Суточные, ₸/сутки", type: "number" }],
  },
  subcontractors: {
    table: "subcontractors", title: "Перевозчики", singular: "перевозчика", order: "name",
    columns: [{ key: "name", label: "Название" }, { key: "bin", label: "БИН/ИИН" }, { key: "phone", label: "Телефон" }],
    fields: [{ name: "name", label: "Название", required: true }, { name: "bin", label: "БИН/ИИН" }, { name: "phone", label: "Телефон" }],
  },
};
