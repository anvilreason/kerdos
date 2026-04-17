/**
 * Transaction — account-level cash flow into or out of the tracked portfolio.
 *
 * NOTE: This is NOT a trade record (buying / selling a security). It is a
 * deposit or withdrawal from the portfolio as a whole. These flows are the
 * required input for correctly computing TWR and XIRR — without them, the
 * net-worth curve can't distinguish "I added money" from "I made money".
 *
 * `amount` is always positive; the sign is encoded by `type`:
 *   - deposit : user added cash into the portfolio
 *   - withdraw: user took cash out of the portfolio
 *
 * `currency` is the currency the user recorded the flow in. It may or may
 * not match the app's baseCurrency; converters normalise at consumption time.
 */
export type TransactionType = "deposit" | "withdraw";

export interface Transaction {
  id: string;
  date: string; // "YYYY-MM-DD"
  type: TransactionType;
  amount: number; // positive
  currency: string; // "USD" / "CNY" / ...
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
