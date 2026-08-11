const EA_CLUB_CREST_CDN_BY_EDITION = {
  fc26: {
    baseUrl:
      "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026",
  },
  fc25: {
    baseUrl:
      "https://eafc25.content.easports.com/fc/fltOnlineAssets/25E4CDAE-799B-45BE-B257-667FDCDE8044/2025",
  },
} as const;

export function buildEaClubCrestUrl(
  gameEdition: string,
  crestAssetId: string | null | undefined,
): string | null {
  const id = crestAssetId?.trim();
  if (!id) return null;
  const edition = gameEdition.trim().toLowerCase();
  const cdn = EA_CLUB_CREST_CDN_BY_EDITION[edition as keyof typeof EA_CLUB_CREST_CDN_BY_EDITION];
  if (!cdn) return null;
  return `${cdn.baseUrl}/fcweb/crests/256x256/l${id}.png`;
}

export function crestAssetIdFromCustomKit(
  customKit: { readonly crestAssetId?: string } | null | undefined,
): string | null {
  const id = customKit?.crestAssetId?.trim();
  return id && id.length > 0 ? id : null;
}
