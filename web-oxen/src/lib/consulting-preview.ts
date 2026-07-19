/**
 * Consulting Preview Mode — central feature flag.
 *
 * When `CONSULTING_OPEN_PREVIEW_MODE` is `true`:
 *   - The "Buy Premium Consulting" button on Explore opens the dashboard directly
 *     (no checkout, no card, no OTP, no plans page).
 *   - All consulting dashboard routes are accessible to every signed-in user.
 *   - `RequireConsultingMember` bypasses membership + subscription checks.
 *   - If the user has no consulting company, a temporary preview company is
 *     synthesized client-side (name: "OXEN Consulting Demo", default logo, owner
 *     role, test_mode: true). No database rows are created.
 *   - All payment / OTP / plans / renewal / billing / expired-subscription pages
 *     remain in the code and routes for future use — they are simply not linked
 *     or reached from normal navigation while the flag is on.
 *
 * To restore the full payment-gated flow, set this flag to `false`. No other
 * code changes are required — the existing guards, checkout, OTP, subscription
 * checks, and renewal flow will take effect again automatically.
 */
export const CONSULTING_OPEN_PREVIEW_MODE = true;

/** Default logo used for the preview company. */
export const PREVIEW_COMPANY_LOGO = "/logo.png";

/** Display name for the auto-synthesized preview company. */
export const PREVIEW_COMPANY_NAME = "OXEN Consulting Demo";
