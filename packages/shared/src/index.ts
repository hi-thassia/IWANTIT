export type ApiStatus = {
  status: 'ok';
  service: 'iwantit-api';
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  onboardingCompleted: boolean;
  theme: 'light' | 'dark' | 'system';
  loginMethods: Array<'password' | 'google'>;
};

export type NotificationPreferences = { priceTargetAlert: boolean; priceDropAlert: boolean; newLowAlert: boolean; stockAlert: boolean };
export type ProfileResponse = { user: AuthUser; notifications: NotificationPreferences };

export type AuthResponse = { user: AuthUser };
export type LoginResponse = AuthResponse | { requiresTwoFactor: true; challengeToken: string };
export type SessionInfo = { id: string; device: string | null; ip: string | null; createdAt: string; expiresAt: string; current: boolean };
export type ApiMessage = { message: string };
export type ApiError = { message: string; fieldErrors?: Record<string, string[]> };

export type MarketplaceOption = { id: string; name: string; slug: string };
export type ImportedVariation = { id: string | null; attributes: Record<string, string> };
export type ProductImportResult = {
  marketplace: 'mercado-livre' | 'shopee' | 'shein';
  marketplaceName: string;
  status: 'imported' | 'manual_required';
  source: 'official_api' | 'unavailable';
  message: string;
  referenceUrl: string;
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  brand: string | null;
  category: string | null;
  seller: string | null;
  color: string | null;
  size: string | null;
  variations: ImportedVariation[];
  attributes: Record<string, string>;
};
export type MarketplaceSlug = 'mercado-livre' | 'shopee' | 'shein';
export type OfferAvailability = 'available' | 'unavailable' | 'unknown';
export type NormalizedOffer = {
  marketplace: MarketplaceSlug;
  externalId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  seller: string | null;
  price: string;
  shippingPrice: string | null;
  totalPrice: string | null;
  availability: OfferAvailability;
  attributes: Record<string, string>;
  checkedAt: string;
};
export type MarketplaceProviderState = 'ok' | 'unavailable' | 'timeout' | 'rate_limited' | 'external_error';
export type MarketplaceProviderResult = {
  marketplace: MarketplaceSlug;
  marketplaceName: string;
  state: MarketplaceProviderState;
  source: 'official_api' | 'unavailable';
  message: string | null;
  offers: NormalizedOffer[];
  discardedResults: number;
  retryAfterSeconds: number | null;
};
export type MarketplaceProviderInfo = Pick<MarketplaceProviderResult, 'marketplace' | 'marketplaceName' | 'source'> & { available: boolean; message: string | null };
export type ProductMatchWish = {
  name: string;
  category: string;
  brand: string | null;
  color: string | null;
  size: string | null;
  exactMatchOnly: boolean;
  referenceUrl: string | null;
  referenceImage: string | null;
  model?: string | null;
  capacity?: string | null;
  attributes?: Record<string, string>;
  identifiers?: string[];
};
export type ProductMatchResult = {
  accepted: boolean;
  matchScore: number;
  classification: 'exact' | 'similar' | 'rejected';
  reasons: string[];
  evidence: { titleSimilarity: number; brand: 'match' | 'mismatch' | 'unknown'; category: 'match' | 'mismatch' | 'unknown'; model: 'match' | 'mismatch' | 'unknown'; size: 'match' | 'mismatch' | 'unknown'; color: 'match' | 'mismatch' | 'unknown'; capacity: 'match' | 'mismatch' | 'unknown'; identifierMatch: boolean; imageMatch: boolean };
};
export type WishStatus = 'active' | 'paused' | 'archived';
export type WishAlertType = 'price_target' | 'price_drop' | 'new_low' | 'back_in_stock';
export type WishView = {
  id: string; name: string; referenceUrl: string | null; referenceImage: string | null;
  targetPrice: string; initialPrice: string | null; category: string; brand: string | null;
  color: string | null; size: string | null; notes: string | null; exactMatchOnly: boolean;
  alertType: WishAlertType; status: WishStatus; marketplaceIds: string[]; marketplaces: MarketplaceOption[];
  lowestPrice: string | null; lowestMarketplace: string | null; lastUpdatedAt: string | null; offerCount: number;
};
export type MonitoredOfferView = NormalizedOffer & { id: string; marketplaceName: string; matchScore: string; effectivePrice: string };
export type PriceHistoryPoint = { recordedAt: string; lowestPrice: string };
export type WishMonitoringView = {
  wishId: string;
  targetPrice: string;
  initialPrice: string | null;
  currentLowestPrice: string | null;
  currentLowestMarketplace: string | null;
  historicalLowestPrice: string | null;
  historicalHighestPrice: string | null;
  lastCheckedAt: string | null;
  offers: MonitoredOfferView[];
  history: PriceHistoryPoint[];
};
export type MonitoringRunResult = { wishId: string; state: 'completed' | 'skipped' | 'not_found'; checkedAt: string | null; acceptedOffers: number; providerStates: MarketplaceProviderResult[] };
export type AlertView = {
  id: string;
  type: WishAlertType;
  title: string;
  message: string;
  wishId: string | null;
  wishName: string | null;
  offerId: string | null;
  offerUrl: string | null;
  metadata: Record<string, string | number | boolean | null>;
  readAt: string | null;
  createdAt: string;
};
