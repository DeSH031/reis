export const ru = {
  "app.name": "Рейс",
  "nav.dashboard": "Обзор",
  "nav.trips": "Рейсы",
  "nav.documents": "Документы",
  "nav.finance": "Финансы",
  "nav.directory": "Справочники",
  "nav.settings": "Настройки",
  "demo.banner": "Демо-данные. Все названия и номера вымышлены.",
  "login.demo": "Войти в демо",
  "login.title": "Вход",
  "data.incomplete": "данные неполные",
} as const;

export type MessageKey = keyof typeof ru;
