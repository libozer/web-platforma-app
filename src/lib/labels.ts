import type { BudgetLevel, TravelPace } from "../types";

export const categoryLabels: Record<string, string> = {
  history: "История",
  culture: "Культура",
  nature: "Природа",
  architecture: "Архитектура",
  food: "Кафе и гастрономия",
  family: "Для семьи"
};

export const budgetLabels: Record<BudgetLevel, string> = {
  free: "Бесплатно",
  low: "Низкий",
  mid: "Средний",
  high: "Высокий"
};

export const paceLabels: Record<TravelPace, string> = {
  calm: "Спокойный",
  balanced: "Сбалансированный",
  active: "Активный"
};

export const categoryOptions = Object.entries(categoryLabels).map(
  ([value, label]) => ({ value, label })
);
