const EA_CLUB_CREST_CDN_BY_EDITION: ReadonlyMap<string, string> = new Map([
  [
    "fc27",
    "https://eafc27.content.easports.com/fc/fltOnlineAssets/27A3C9F1-6B2E-4D7A-8C1F-2E9B5A4D6C7E/2027",
  ],
  [
    "fc26",
    "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026",
  ],
  [
    "fc25",
    "https://eafc25.content.easports.com/fc/fltOnlineAssets/25E4CDAE-799B-45BE-B257-667FDCDE8044/2025",
  ],
]);

export function buildEaClubCrestUrl(
  gameEdition: string,
  crestAssetId: string | null | undefined,
): string | null {
  const id = crestAssetId?.trim();
  if (!id) return null;
  const baseUrl = EA_CLUB_CREST_CDN_BY_EDITION.get(gameEdition.trim().toLowerCase());
  if (!baseUrl) return null;
  return `${baseUrl}/fcweb/crests/256x256/l${id}.png`;
}

export function crestAssetIdFromCustomKit(
  customKit: { readonly crestAssetId?: string } | null | undefined,
): string | null {
  const id = customKit?.crestAssetId?.trim();
  return id && id.length > 0 ? id : null;
}
