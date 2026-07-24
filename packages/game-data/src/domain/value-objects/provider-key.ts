export type GameDataProviderKey = "ea-clubs" | "manual" | "screenshot-ocr";

export function isGameDataProviderKey(value: string): value is GameDataProviderKey {
  return value === "ea-clubs" || value === "manual" || value === "screenshot-ocr";
}
