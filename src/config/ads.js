const enabled = import.meta.env.VITE_ADS_ENABLED === "true";
const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID || "";
const homeSlot = import.meta.env.VITE_ADSENSE_SLOT_HOME || "";

export const adsConfig = Object.freeze({
  enabled: enabled && Boolean(clientId),
  provider: "adsense",
  clientId,
  slots: Object.freeze({ home: homeSlot }),
});

/**
 * Ads are not rendered unless the owner explicitly enables them and provides
 * real provider IDs. Never click your own ads or manufacture impressions.
 */
