/**
 * OnboardingFlow — first-run empty-state wizard for `/app/*`.
 *
 * Rendered by Dashboard when `useAssets().assets.length === 0`. It walks
 * the user through a 3-step path to their first real asset:
 *
 *   Step 1 — Pick a common asset type (6 tiles)
 *   Step 2 — Enter core fields (name/ticker + quantity + cost or manual price)
 *   Step 3 — Preview + confirm; writes to IndexedDB via `useAddAsset`
 *
 * A secondary "explore sample data" affordance lets the user bypass the
 * wizard by entering Demo Mode (`enterDemoMode()` wipes+loads 20 demos).
 *
 * This component is self-contained and does NOT modify the stable
 * AssetForm / TickerSearch / Demo-Mode service. It orchestrates them as a
 * black box so the W2/W4-01 contracts stay intact.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useNavigate } from "react-router-dom";
import {
  Bitcoin,
  Gem,
  House,
  TrendingUp,
  Wallet,
  Ellipsis,
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import type { AssetType } from "@/types/asset";
import { useAddAsset } from "@/hooks/useAssets";
import { enterDemoMode } from "@/services/demoMode";
import TickerSearch, {
  type TickerResult,
} from "@/components/assets/TickerSearch";
import AssetTypeCard from "./AssetTypeCard";
import OnboardingStepper from "./OnboardingStepper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Which onboarding tiles map to which canonical AssetType. */
interface TypeTile {
  key:
    | "usStock"
    | "crypto"
    | "cash"
    | "realEstate"
    | "gold"
    | "other";
  assetType: AssetType;
  /** Default quote currency when picking this tile. User can override. */
  defaultCurrency: string;
  Icon: typeof TrendingUp;
}

const TYPE_TILES: TypeTile[] = [
  { key: "usStock", assetType: "us_stock", defaultCurrency: "USD", Icon: TrendingUp },
  { key: "crypto", assetType: "crypto", defaultCurrency: "USD", Icon: Bitcoin },
  { key: "cash", assetType: "cash", defaultCurrency: "USD", Icon: Wallet },
  { key: "realEstate", assetType: "real_estate", defaultCurrency: "USD", Icon: House },
  { key: "gold", assetType: "gold", defaultCurrency: "USD", Icon: Gem },
  { key: "other", assetType: "other", defaultCurrency: "USD", Icon: Ellipsis },
];

/** Types that use TickerSearch (live + dict lookup) instead of freeform name. */
const TICKER_TYPES = new Set<AssetType>([
  "us_stock",
  "cn_stock",
  "etf",
  "crypto",
  "forex",
  "gold",
]);

/** Types that store a user-supplied price rather than a ticker feed. */
const MANUAL_TYPES = new Set<AssetType>([
  "real_estate",
  "vehicle",
  "cash",
  "other",
]);

const CURRENCIES = ["USD", "CNY", "EUR", "GBP", "JPY", "HKD"];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  background: "var(--color-base-00, #0d0d0d)",
  border: "1px solid var(--color-base-20, #2a2d35)",
  borderRadius: 14,
  padding: "32px 32px 28px",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.28)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--color-text-muted, #9ca3af)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--color-base-20, #2a2d35)",
  background: "var(--color-base-05, #1a1d23)",
  color: "var(--color-text-normal, #dcddde)",
  fontSize: 14,
  fontFamily: "var(--font-interface)",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  height: 38,
  padding: "0 20px",
  borderRadius: 8,
  border: "1px solid var(--kerdos-accent, #c9972a)",
  background: "var(--kerdos-accent, #c9972a)",
  color: "#0a0d12",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "filter 0.15s ease",
};

const secondaryBtnStyle: React.CSSProperties = {
  height: 38,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid var(--color-base-20, #2a2d35)",
  background: "transparent",
  color: "var(--color-text-normal, #dcddde)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "background 0.15s ease",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3;

export default function OnboardingFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addAsset = useAddAsset();

  const [step, setStep] = useState<Step>(1);
  const [assetType, setAssetType] = useState<AssetType>("us_stock");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [region, setRegion] = useState<string | undefined>(undefined);
  const [addAnother, setAddAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [demoBusy, setDemoBusy] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  // Fade-in key bumps when step changes to re-trigger the CSS animation.
  const [animKey, setAnimKey] = useState(0);

  // Reset transient form fields when the user picks a new type or re-enters
  // Step 1 to add another. Keeps Step 2 from showing stale values.
  const resetFormFields = () => {
    setName("");
    setTicker("");
    setQuantity("");
    setCostPrice("");
    setManualPrice("");
    setRegion(undefined);
    setErrors({});
  };

  // Bump the anim key whenever `step` changes so each step gets a new fade-in.
  const prevStepRef = useRef<Step>(step);
  useEffect(() => {
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      setAnimKey((k) => k + 1);
    }
  }, [step]);

  // -------------------------------------------------------------------------
  // Step 1 — type selection
  // -------------------------------------------------------------------------
  const handlePickType = (tile: TypeTile) => {
    setAssetType(tile.assetType);
    setCostCurrency(tile.defaultCurrency);
    resetFormFields();
    setStep(2);
  };

  // -------------------------------------------------------------------------
  // Step 2 — TickerSearch integration (only when type is ticker-based)
  // -------------------------------------------------------------------------
  const handleTickerSelect = (r: TickerResult) => {
    setTicker(r.symbol);
    setName(r.name);
    setCostCurrency(r.currency);
    // Map the search result's asset type onto our tile-level assetType if
    // the tile was a broad bucket (e.g. user clicked "US Stock" but typed an
    // ETF ticker — we honour the dictionary's more specific type).
    if (r.type === "etf" && assetType === "us_stock") {
      setAssetType("etf");
    }
    // Rough region inference from exchange — mirrors AssetForm's approach
    // at a coarser level. Real AssetForm has a longer list; we keep it
    // minimal here because onboarding only needs "enough".
    const exch = (r.exchange ?? "").toUpperCase();
    if (
      exch.includes("NASDAQ") ||
      exch.includes("NYSE") ||
      exch.includes("ARCA")
    ) {
      setRegion("US");
    } else if (
      exch.includes("SHANGHAI") ||
      exch.includes("SHENZHEN") ||
      exch === "SSE" ||
      exch === "SZSE"
    ) {
      setRegion("CN");
    }
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t("onboarding.errors.nameRequired");
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      e.quantity = t("onboarding.errors.quantityInvalid");
    }
    if (MANUAL_TYPES.has(assetType)) {
      if (
        manualPrice.trim() &&
        (isNaN(Number(manualPrice)) || Number(manualPrice) < 0)
      ) {
        e.manualPrice = t("onboarding.errors.priceInvalid");
      }
    } else if (costPrice.trim() && isNaN(Number(costPrice))) {
      e.costPrice = t("onboarding.errors.priceInvalid");
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // -------------------------------------------------------------------------
  // Step 3 — submit
  // -------------------------------------------------------------------------
  const handleCreate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const isManual = MANUAL_TYPES.has(assetType);
      const isTickerType = TICKER_TYPES.has(assetType);

      await addAsset({
        name: name.trim(),
        type: assetType,
        ticker:
          isTickerType && ticker.trim() ? ticker.trim().toUpperCase() : undefined,
        quantity: Number(quantity),
        costPrice:
          !isManual && costPrice.trim() ? Number(costPrice) : undefined,
        costCurrency,
        manualPrice:
          isManual && manualPrice.trim() ? Number(manualPrice) : undefined,
        manualPriceUpdatedAt:
          isManual && manualPrice.trim() ? new Date() : undefined,
        region,
      });

      if (addAnother) {
        // Reset to Step 1 so the user can pick another type.
        resetFormFields();
        setAddAnother(false);
        setStep(1);
      } else {
        // The wizard unmounts on its own: as soon as db.assets has >0 rows,
        // Dashboard's empty-state branch stops rendering us and falls
        // through to the real dashboard.
        navigate("/app/", { replace: true });
      }
    } catch (err) {
      console.error("[OnboardingFlow] addAsset failed:", err);
      setErrors({ submit: t("onboarding.errors.submitFailed") });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Demo-mode bypass
  // -------------------------------------------------------------------------
  const handleTryDemo = async () => {
    if (demoBusy) return;
    setDemoBusy(true);
    try {
      await enterDemoMode(90);
      navigate("/app/", { replace: true });
    } catch (err) {
      console.error("[OnboardingFlow] enterDemoMode failed:", err);
      setDemoBusy(false);
      setShowDemoConfirm(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const isTickerType = TICKER_TYPES.has(assetType);
  const isManualType = MANUAL_TYPES.has(assetType);
  const typeLabel = t(`assetTypes.${assetType}`);

  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        background: "var(--color-base-05, #1a1d23)",
        padding: "48px 24px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes kerdos-onboarding-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(201,151,42,0.15)",
              color: "var(--kerdos-accent, #c9972a)",
              marginBottom: 12,
            }}
          >
            <Sparkles width={22} height={22} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "var(--color-text-normal, #dcddde)",
            }}
          >
            {t("onboarding.welcome")}
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--color-text-muted, #9ca3af)",
              lineHeight: 1.5,
            }}
          >
            {t("onboarding.subtitle")}
          </p>
        </div>

        <OnboardingStepper current={step} total={3} />

        {/* Step content — re-mounted on step change for fade animation. */}
        <div
          key={animKey}
          style={{
            animation: "kerdos-onboarding-fade 0.25s ease-out",
          }}
        >
          {step === 1 && (
            <Step1
              onPick={handlePickType}
              t={t}
            />
          )}

          {step === 2 && (
            <Step2
              t={t}
              assetType={assetType}
              typeLabel={typeLabel}
              isTickerType={isTickerType}
              isManualType={isManualType}
              name={name}
              setName={setName}
              ticker={ticker}
              setTicker={setTicker}
              onTickerSelect={handleTickerSelect}
              quantity={quantity}
              setQuantity={setQuantity}
              costPrice={costPrice}
              setCostPrice={setCostPrice}
              manualPrice={manualPrice}
              setManualPrice={setManualPrice}
              costCurrency={costCurrency}
              setCostCurrency={setCostCurrency}
              errors={errors}
            />
          )}

          {step === 3 && (
            <Step3
              t={t}
              typeLabel={typeLabel}
              name={name}
              ticker={ticker}
              quantity={quantity}
              costPrice={costPrice}
              manualPrice={manualPrice}
              costCurrency={costCurrency}
              isManualType={isManualType}
              isTickerType={isTickerType}
              addAnother={addAnother}
              setAddAnother={setAddAnother}
              submitError={errors.submit}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              step === 1 ? "center" : "space-between",
            marginTop: 28,
            gap: 12,
          }}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              style={secondaryBtnStyle}
            >
              <ArrowLeft width={14} height={14} />
              {t("onboarding.back")}
            </button>
          )}

          {step === 1 && (
            // Step 1 has no forward button — tile click advances automatically.
            // Provide the demo bypass inline as a text link centered below.
            <button
              type="button"
              onClick={() => setShowDemoConfirm(true)}
              style={{
                background: "transparent",
                border: "none",
                padding: "6px 10px",
                color: "var(--color-text-muted, #9ca3af)",
                fontSize: 12,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                cursor: "pointer",
              }}
            >
              {t("onboarding.tryDemo")}
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
              style={primaryBtnStyle}
            >
              {t("onboarding.next")}
              <ArrowRight width={14} height={14} />
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              style={{
                ...primaryBtnStyle,
                opacity: submitting ? 0.65 : 1,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              <Check width={14} height={14} />
              {submitting ? t("common.loading") : t("onboarding.create")}
            </button>
          )}
        </div>

        {/* Bottom demo link on Step 2/3 too (smaller, less prominent) */}
        {step !== 1 && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setShowDemoConfirm(true)}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px 8px",
                color: "var(--color-text-faint, #6b7280)",
                fontSize: 11,
                textDecoration: "underline",
                textUnderlineOffset: 3,
                cursor: "pointer",
              }}
            >
              {t("onboarding.tryDemo")}
            </button>
          </div>
        )}
      </div>

      {/* Demo confirm modal — simple inline overlay, no external Dialog dep. */}
      {showDemoConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !demoBusy && setShowDemoConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              width: "100%",
              background: "var(--color-base-00, #0d0d0d)",
              border: "1px solid var(--color-base-20, #2a2d35)",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5)",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--color-text-normal, #dcddde)",
              }}
            >
              {t("onboarding.tryDemoTitle")}
            </h3>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--color-text-muted, #9ca3af)",
              }}
            >
              {t("onboarding.tryDemoConfirm")}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setShowDemoConfirm(false)}
                disabled={demoBusy}
                style={secondaryBtnStyle}
              >
                {t("assetForm.cancel")}
              </button>
              <button
                type="button"
                onClick={handleTryDemo}
                disabled={demoBusy}
                style={{
                  ...primaryBtnStyle,
                  opacity: demoBusy ? 0.65 : 1,
                  cursor: demoBusy ? "default" : "pointer",
                }}
              >
                {demoBusy
                  ? t("demoMode.entering")
                  : t("onboarding.tryDemoConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — pick a type
// ---------------------------------------------------------------------------

interface Step1Props {
  onPick: (tile: TypeTile) => void;
  t: TFunction;
}

function Step1({ onPick, t }: Step1Props) {
  return (
    <div>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--color-text-normal, #dcddde)",
        }}
      >
        {t("onboarding.step1.title")}
      </h2>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 12,
          color: "var(--color-text-muted, #9ca3af)",
        }}
      >
        {t("onboarding.step1.subtitle")}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {TYPE_TILES.map((tile) => (
          <AssetTypeCard
            key={tile.key}
            type={tile.assetType}
            icon={<tile.Icon width={20} height={20} />}
            label={t(`onboarding.types.${tile.key}`)}
            hint={t(`onboarding.types.${tile.key}Hint`)}
            onClick={() => onPick(tile)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — core fields
// ---------------------------------------------------------------------------

interface Step2Props {
  t: TFunction;
  assetType: AssetType;
  typeLabel: string;
  isTickerType: boolean;
  isManualType: boolean;
  name: string;
  setName: (v: string) => void;
  ticker: string;
  setTicker: (v: string) => void;
  onTickerSelect: (r: TickerResult) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  costPrice: string;
  setCostPrice: (v: string) => void;
  manualPrice: string;
  setManualPrice: (v: string) => void;
  costCurrency: string;
  setCostCurrency: (v: string) => void;
  errors: Record<string, string>;
}

function Step2(props: Step2Props) {
  const {
    t,
    typeLabel,
    isTickerType,
    isManualType,
    name,
    setName,
    ticker,
    setTicker,
    onTickerSelect,
    quantity,
    setQuantity,
    costPrice,
    setCostPrice,
    manualPrice,
    setManualPrice,
    costCurrency,
    setCostCurrency,
    errors,
  } = props;

  return (
    <div>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--color-text-normal, #dcddde)",
        }}
      >
        {t("onboarding.step2.title")}
      </h2>
      <p
        style={{
          margin: "0 0 18px",
          fontSize: 12,
          color: "var(--color-text-muted, #9ca3af)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 4,
            background: "rgba(201,151,42,0.12)",
            color: "var(--kerdos-accent, #c9972a)",
            fontSize: 11,
            fontWeight: 600,
            marginRight: 8,
          }}
        >
          {typeLabel}
        </span>
      </p>

      {/* Ticker or Name */}
      {isTickerType ? (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="onboarding-ticker">
            {t("onboarding.step2.tickerPrompt")}
          </label>
          <TickerSearch
            id="onboarding-ticker"
            value={ticker}
            onChange={setTicker}
            onSelect={onTickerSelect}
            placeholder={t("assetForm.tickerPlaceholder")}
          />
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle} htmlFor="onboarding-name">
              {t("onboarding.step2.nameLabel")}
            </label>
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("assetForm.namePlaceholder")}
              style={{
                ...inputStyle,
                borderColor: errors.name
                  ? "var(--color-loss, #dc2626)"
                  : inputStyle.border?.toString().includes("loss")
                    ? inputStyle.borderColor
                    : "var(--color-base-20, #2a2d35)",
              }}
            />
            {errors.name && <ErrorText text={errors.name} />}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="onboarding-name">
            {t("onboarding.step2.nameLabel")}
          </label>
          <input
            id="onboarding-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding.step2.namePlaceholder")}
            style={{
              ...inputStyle,
              borderColor: errors.name
                ? "var(--color-loss, #dc2626)"
                : "var(--color-base-20, #2a2d35)",
            }}
          />
          {errors.name && <ErrorText text={errors.name} />}
        </div>
      )}

      {/* Quantity */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="onboarding-qty">
          {t("onboarding.step2.quantityLabel")}
        </label>
        <input
          id="onboarding-qty"
          type="number"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t("assetForm.quantityPlaceholder")}
          style={{
            ...inputStyle,
            borderColor: errors.quantity
              ? "var(--color-loss, #dc2626)"
              : "var(--color-base-20, #2a2d35)",
          }}
        />
        {errors.quantity && <ErrorText text={errors.quantity} />}
      </div>

      {/* Price: either costPrice (ticker types) or manualPrice (manual types) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px",
          gap: 10,
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="onboarding-price">
            {isManualType
              ? t("onboarding.step2.manualPriceLabel")
              : t("onboarding.step2.priceLabel")}
          </label>
          <input
            id="onboarding-price"
            type="number"
            step="any"
            value={isManualType ? manualPrice : costPrice}
            onChange={(e) =>
              isManualType
                ? setManualPrice(e.target.value)
                : setCostPrice(e.target.value)
            }
            placeholder={t("assetForm.optional")}
            style={{
              ...inputStyle,
              borderColor:
                errors.manualPrice || errors.costPrice
                  ? "var(--color-loss, #dc2626)"
                  : "var(--color-base-20, #2a2d35)",
            }}
          />
          {(errors.manualPrice || errors.costPrice) && (
            <ErrorText text={errors.manualPrice ?? errors.costPrice!} />
          )}
        </div>
        <div>
          <label style={labelStyle} htmlFor="onboarding-currency">
            {t("assetForm.costCurrency")}
          </label>
          <select
            id="onboarding-currency"
            value={costCurrency}
            onChange={(e) => setCostCurrency(e.target.value)}
            style={{
              ...inputStyle,
              appearance: "none",
              cursor: "pointer",
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <p
      style={{
        margin: "4px 0 0",
        fontSize: 11,
        color: "var(--color-loss, #dc2626)",
      }}
    >
      {text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — preview + confirm
// ---------------------------------------------------------------------------

interface Step3Props {
  t: TFunction;
  typeLabel: string;
  name: string;
  ticker: string;
  quantity: string;
  costPrice: string;
  manualPrice: string;
  costCurrency: string;
  isManualType: boolean;
  isTickerType: boolean;
  addAnother: boolean;
  setAddAnother: (v: boolean) => void;
  submitError?: string;
}

function Step3(props: Step3Props) {
  const {
    t,
    typeLabel,
    name,
    ticker,
    quantity,
    costPrice,
    manualPrice,
    costCurrency,
    isManualType,
    isTickerType,
    addAnother,
    setAddAnother,
    submitError,
  } = props;

  const qtyNum = Number(quantity);
  const priceNum = Number(isManualType ? manualPrice : costPrice);
  const totalVisible =
    !isNaN(qtyNum) && qtyNum > 0 && !isNaN(priceNum) && priceNum > 0;

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid var(--color-base-10, #1e2128)",
    fontSize: 13,
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--color-text-normal, #dcddde)",
        }}
      >
        {t("onboarding.step3.title")}
      </h2>
      <p
        style={{
          margin: "0 0 18px",
          fontSize: 12,
          color: "var(--color-text-muted, #9ca3af)",
        }}
      >
        {t("onboarding.step3.subtitle")}
      </p>

      <div
        style={{
          padding: "4px 16px 12px",
          borderRadius: 10,
          border: "1px solid var(--color-base-20, #2a2d35)",
          background: "var(--color-base-05, #1a1d23)",
        }}
      >
        <Row label={t("assetForm.type")} value={typeLabel} rowStyle={rowStyle} />
        <Row label={t("assetForm.name")} value={name || "—"} rowStyle={rowStyle} />
        {isTickerType && (
          <Row
            label={t("assetForm.ticker")}
            value={ticker ? ticker.toUpperCase() : "—"}
            rowStyle={rowStyle}
            mono
          />
        )}
        <Row
          label={t("assetForm.quantity")}
          value={quantity || "—"}
          rowStyle={rowStyle}
          mono
        />
        <Row
          label={
            isManualType
              ? t("onboarding.step2.manualPriceLabel")
              : t("onboarding.step2.priceLabel")
          }
          value={
            (isManualType ? manualPrice : costPrice)
              ? `${isManualType ? manualPrice : costPrice} ${costCurrency}`
              : "—"
          }
          rowStyle={{ ...rowStyle, borderBottom: "none" }}
          mono
        />
        {totalVisible && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(201,151,42,0.08)",
              border: "1px solid rgba(201,151,42,0.25)",
              fontSize: 12,
              color: "var(--color-text-muted, #9ca3af)",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span>{t("onboarding.step3.approxValue")}</span>
            <span
              style={{
                fontFamily: "var(--font-monospace)",
                fontFeatureSettings: '"tnum"',
                fontWeight: 600,
                color: "var(--color-text-normal, #dcddde)",
              }}
            >
              {(qtyNum * priceNum).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              {costCurrency}
            </span>
          </div>
        )}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 16,
          cursor: "pointer",
          fontSize: 12,
          color: "var(--color-text-muted, #9ca3af)",
        }}
      >
        <input
          type="checkbox"
          checked={addAnother}
          onChange={(e) => setAddAnother(e.target.checked)}
          style={{ accentColor: "var(--kerdos-accent, #c9972a)" }}
        />
        {t("onboarding.step3.addAnother")}
      </label>

      {submitError && (
        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--color-loss, #dc2626)",
          }}
        >
          {submitError}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  rowStyle,
  mono,
}: {
  label: string;
  value: string;
  rowStyle: React.CSSProperties;
  mono?: boolean;
}) {
  return (
    <div style={rowStyle}>
      <span style={{ color: "var(--color-text-muted, #9ca3af)" }}>{label}</span>
      <span
        style={{
          color: "var(--color-text-normal, #dcddde)",
          fontFamily: mono ? "var(--font-monospace)" : undefined,
          fontFeatureSettings: mono ? '"tnum"' : undefined,
          fontWeight: 500,
          maxWidth: "60%",
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}
