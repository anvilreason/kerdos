export interface PriceCache {
  id: string;
  ticker: string;
  price: number;
  currency: string;
  source: string;
  fetchedAt: Date;
  expiresAt: Date;
}

export interface PriceResult {
  ticker: string;
  price: number;
  currency: string;
  source: string;
  timestamp: Date;
}
