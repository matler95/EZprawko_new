// Art. 51 ust. 2 pkt 1 ustawy o kierujących pojazdami: theory-test targets.
// PT is the bank code for a tram driving permit, not a driving-licence category.
export const drivingCategories = ["AM", "A1", "A2", "A", "B1", "B", "C1", "C", "D1", "D", "T", "PT"] as const;
export type DrivingCategory = typeof drivingCategories[number];
export function isDrivingCategory(value: string): value is DrivingCategory {
  return drivingCategories.some((category) => category === value);
}
export function categoryLabel(value: string) {
  return value === "PT" ? "PT — pozwolenie na kierowanie tramwajem" : `Kategoria ${value}`;
}
export const categoryClause = "EXISTS (SELECT 1 FROM json_each(q.categories) c WHERE c.value = ?)";
