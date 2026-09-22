/**
 * Application Feature Flags
 *
 * Toggle capabilities here with minimal effort and zero architectural regressions.
 */
export const FEATURES = {
  /**
   * Multilingual Language Switcher Flag
   *
   * - false: Locks application to English as the primary language and hides all language switcher UI.
   * - true: Enables full 10-language selector modals, header globe buttons, and vernacular switching.
   *
   * To re-enable multilingual support: Set this value to `true`.
   */
  ENABLE_MULTILINGUAL: true,

  /**
   * 16-Zone Vastu Compass Flag
   *
   * - false: Hides the 16-Zone live compass tool card on Home screen and disables navigation.
   * - true: Enables the 360° live sensor compass and zone explorer tool.
   *
   * To re-enable Vastu Compass: Set this value to `true`.
   */
  ENABLE_VASTU_COMPASS: true,

  /**
   * Report PDF Export & Sharing Flag
   *
   * - false: Hides PDF export certificate card, header share icon, and history PDF download buttons.
   * - true: Enables PDF generation, export, and native system sharing.
   *
   * To re-enable Report Export & Share: Set this value to `true`.
   */
  ENABLE_REPORT_EXPORT_SHARE: true,
};

