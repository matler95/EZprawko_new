import catalog from "../../assets/data/road-signs.json";

export type SignGroup = "A" | "B" | "C" | "D" | "T";
export type RoadSign = { code: string; name: string; group: SignGroup; source: `https://${string}`; sourcePage: number };
export const roadSigns = catalog.entries as RoadSign[];
export const signGroups: Record<SignGroup, string> = {
  A: "Ostrzegawcze", B: "Zakazu", C: "Nakazu", D: "Informacyjne", T: "Tabliczki",
};
const normalize = (value: string) => value.toLocaleLowerCase("pl-PL").replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function findSigns(query: string, group: SignGroup | null = null): RoadSign[] {
  const tokens = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return roadSigns.filter((sign) => (!group || sign.group === group) && tokens.every((token) =>
    normalize(`${sign.code} ${sign.name}`).includes(token) || sign.code.replace("-", "").toLowerCase() === token.replace("-", ""),
  ));
}
