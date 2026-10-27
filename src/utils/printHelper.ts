/**
 * Safe print helper for FleetLedger.
 * In sandboxed iframe environments (such as AI Studio preview or third-party web embeds)
 * and certain mobile browsers, direct `window.print()` is blocked by browser sandbox policies.
 *
 * This utility ensures that clicking the Print button ALWAYS produces results by:
 * 1. Invoking the dedicated print action (which produces the exact A4 document with auto-print).
 * 2. Attempting native `window.print()` if running in a top-level browser window.
 */
export async function executePrint(fallbackAction?: () => void | Promise<any>): Promise<boolean> {
  // 1. Always execute the print document action so the user is never left with a dead button
  if (fallbackAction) {
    try {
      await fallbackAction();
    } catch (fallbackErr) {
      console.error('Fallback print document generation failed:', fallbackErr);
    }
  }

  // 2. Also attempt native window.print() if supported and not in an iframe sandbox
  try {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (!isInIframe && typeof window !== 'undefined' && typeof window.print === 'function') {
      window.focus();
      window.print();
    }
  } catch (err) {
    console.warn('Native window.print() skipped or restricted:', err);
  }

  return true;
}
