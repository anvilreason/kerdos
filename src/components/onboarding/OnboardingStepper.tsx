/**
 * OnboardingStepper — minimal 3-step progress indicator.
 *
 * Three dots connected by a hairline; the current (and all prior) dots
 * are filled with the Kerdos accent colour, upcoming dots stay muted.
 *
 * Kept intentionally presentational — no animation, no state. The parent
 * owns the step index.
 */
interface OnboardingStepperProps {
  /** 1-based index of the active step. */
  current: 1 | 2 | 3;
  /** Total number of steps. Defaults to 3 to match the Onboarding flow. */
  total?: number;
}

export default function OnboardingStepper({
  current,
  total = 3,
}: OnboardingStepperProps) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginBottom: 24,
      }}
    >
      {steps.map((step, idx) => {
        const isActive = step === current;
        const isDone = step < current;
        const dotColor =
          isActive || isDone
            ? "var(--kerdos-accent, #c9972a)"
            : "var(--color-base-20, #2a2d35)";
        const labelColor = isActive
          ? "var(--color-text-normal)"
          : "var(--color-text-faint)";

        return (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 28,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: isActive ? 12 : 10,
                  height: isActive ? 12 : 10,
                  borderRadius: "50%",
                  background: dotColor,
                  boxShadow: isActive
                    ? "0 0 0 3px rgba(201,151,42,0.18)"
                    : "none",
                  transition: "all 0.18s ease",
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                  color: labelColor,
                  transition: "color 0.18s ease",
                }}
              >
                {step}/{total}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                aria-hidden
                style={{
                  width: 44,
                  height: 1,
                  margin: "0 8px",
                  marginBottom: 14,
                  background:
                    step < current
                      ? "var(--kerdos-accent, #c9972a)"
                      : "var(--color-base-20, #2a2d35)",
                  transition: "background 0.18s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
