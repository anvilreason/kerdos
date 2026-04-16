export interface DemoAsset {
  ticker: string;
  name: string;
  type: string;
  price: number;
  basePrice: number;
  quantity: number;
  volatility: number;
  change: number;
  changePct: number;
  history: number[];
}

export const INITIAL_ASSETS: {
  ticker: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
  volatility: number;
}[] = [
  { ticker: 'NVDA', name: 'NVIDIA Corp.', type: 'us_stock', price: 875.00, quantity: 50, volatility: 0.004 },
  { ticker: 'AAPL', name: 'Apple Inc.', type: 'us_stock', price: 189.30, quantity: 100, volatility: 0.002 },
  { ticker: 'BTC', name: 'Bitcoin', type: 'crypto', price: 67000, quantity: 0.5, volatility: 0.006 },
  { ticker: 'ETH', name: 'Ethereum', type: 'crypto', price: 3500, quantity: 2.5, volatility: 0.007 },
  { ticker: 'HOME', name: 'Bay Area Home', type: 'manual', price: 1850000, quantity: 1, volatility: 0 },
  { ticker: 'TSLA_CAR', name: 'Tesla Model X', type: 'manual', price: 89990, quantity: 1, volatility: 0 },
];

export const FX_RATES: Record<string, number> = {
  USD: 1.0, CNY: 7.26, EUR: 0.93, GBP: 0.79, JPY: 149.50, HKD: 7.82
};

export const REGIONAL_ASSETS: Record<string, { home: { value: number; label: string; currency: string }; car: { value: number; label: string; currency: string } }> = {
  us: { home: { value: 1850000, label: 'Bay Area Home', currency: 'USD' }, car: { value: 89990, label: 'Tesla Model X', currency: 'USD' } },
  cn: { home: { value: 8500000, label: '上海二环房产', currency: 'CNY' }, car: { value: 899000, label: 'Tesla Model X', currency: 'CNY' } },
  eu: { home: { value: 650000, label: 'Munich Apartment', currency: 'EUR' }, car: { value: 129990, label: 'Tesla Model X', currency: 'EUR' } },
  gb: { home: { value: 520000, label: 'London Flat', currency: 'GBP' }, car: { value: 99990, label: 'Tesla Model X', currency: 'GBP' } },
  jp: { home: { value: 75000000, label: '東京マンション', currency: 'JPY' }, car: { value: 15000000, label: 'Tesla Model X', currency: 'JPY' } },
  hk: { home: { value: 8000000, label: '香港住宅', currency: 'HKD' }, car: { value: 950000, label: 'Tesla Model X', currency: 'HKD' } },
};

export interface Snapshot {
  assets: DemoAsset[];
  netWorth: number;
  netWorthChange: number;
  netWorthChangePct: number;
  netWorthHistory: number[];
}

export class PriceSimulator {
  private assets: DemoAsset[];
  private netWorthHistory: number[];
  private initialNetWorth: number;

  constructor() {
    this.assets = INITIAL_ASSETS.map(a => ({
      ...a,
      basePrice: a.price,
      change: 0,
      changePct: 0,
      history: Array.from({ length: 30 }, (_, i) => {
        // Generate a plausible historical path leading to current price
        const t = (i - 29) / 29; // -1 to 0
        const drift = a.price * 0.03 * t; // slight downward drift going back
        const noise = a.price * a.volatility * 3 * (Math.random() - 0.5);
        return a.price + drift + noise;
      }),
    }));
    // Make last history point = current price
    for (const a of this.assets) {
      a.history[a.history.length - 1] = a.price;
    }
    this.initialNetWorth = this.calcNetWorth();
    this.netWorthHistory = this.assets[0].history.map((_, i) =>
      this.assets.reduce((sum, a) => sum + a.history[i] * a.quantity, 0)
    );
  }

  private calcNetWorth(): number {
    return this.assets.reduce((sum, a) => sum + a.price * a.quantity, 0);
  }

  tick(): Snapshot {
    for (const asset of this.assets) {
      if (asset.volatility === 0) continue;
      const move = asset.price * asset.volatility * (Math.random() - 0.48); // slight upward bias
      asset.price = Math.max(asset.price * 0.9, asset.price + move);
      asset.change = asset.price - asset.basePrice;
      asset.changePct = (asset.change / asset.basePrice) * 100;
      asset.history.push(asset.price);
      if (asset.history.length > 30) asset.history.shift();
    }

    const nw = this.calcNetWorth();
    this.netWorthHistory.push(nw);
    if (this.netWorthHistory.length > 30) this.netWorthHistory.shift();

    return {
      assets: this.assets.map(a => ({ ...a, history: [...a.history] })),
      netWorth: nw,
      netWorthChange: nw - this.initialNetWorth,
      netWorthChangePct: ((nw - this.initialNetWorth) / this.initialNetWorth) * 100,
      netWorthHistory: [...this.netWorthHistory],
    };
  }

  getSnapshot(): Snapshot {
    const nw = this.calcNetWorth();
    return {
      assets: this.assets.map(a => ({ ...a, history: [...a.history] })),
      netWorth: nw,
      netWorthChange: nw - this.initialNetWorth,
      netWorthChangePct: ((nw - this.initialNetWorth) / this.initialNetWorth) * 100,
      netWorthHistory: [...this.netWorthHistory],
    };
  }

  updateManualAssets(homeName: string, homePrice: number, carName: string, carPrice: number): void {
    const home = this.assets.find(a => a.ticker === 'HOME');
    const car = this.assets.find(a => a.ticker === 'TSLA_CAR');
    if (home) {
      home.name = homeName;
      home.price = homePrice;
      home.basePrice = homePrice;
    }
    if (car) {
      car.name = carName;
      car.price = carPrice;
      car.basePrice = carPrice;
    }
    this.initialNetWorth = this.calcNetWorth();
  }
}
