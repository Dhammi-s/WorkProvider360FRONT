/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Content for the "unapproved schedules" popup (app-confirm-dialog). */
export interface ApprovalPrompt {
  title: string;
  message: string;
  details: string[];
  /** Invoice everything, unapproved included; null when the caller's role may not. */
  confirmLabel: string | null;
  /** Invoice the approved schedules only; null when none are approved. */
  altLabel: string | null;
}

/**
 * The same wording and choices on every invoicing screen (client invoices,
 * Billing & Invoice tab, Accounting shift pay). Returns null when everything
 * is approved, so the caller can go straight ahead.
 */
export function buildApprovalPrompt(opts: {
  approved: number;
  unapproved: number;
  canInvoiceUnapproved: boolean;
  approvedAmount: string;
  totalAmount: string;
}): ApprovalPrompt | null {
  const { approved, unapproved, canInvoiceUnapproved, approvedAmount, totalAmount } = opts;
  if (unapproved <= 0) return null;

  const total = approved + unapproved;
  const plural = (n: number) => (n === 1 ? 'schedule is' : 'schedules are');
  const altLabel = approved > 0 ? `Approved only (${approvedAmount})` : null;

  if (canInvoiceUnapproved) {
    return {
      title: 'Unapproved schedules',
      message: `${unapproved} of ${total} ${plural(total)} not approved yet. You can invoice them anyway or only the approved ones.`,
      details: [
        `Approved: ${approved} (${approvedAmount})`,
        `Everything: ${total} (${totalAmount})`,
      ],
      confirmLabel: `Invoice all (${totalAmount})`,
      altLabel,
    };
  }

  return {
    title: 'Only approved schedules can be invoiced',
    message:
      approved > 0
        ? `${unapproved} of ${total} ${plural(total)} not approved, so they will be left out of this invoice.`
        : `None of the ${total} ${total === 1 ? 'schedule is' : 'schedules are'} approved yet, so there is nothing to invoice.`,
    details: [
      'Approve the schedules on the Scheduler, or',
      'enable invoicing unapproved schedules for your role in Settings → Scheduling.',
    ],
    confirmLabel: null,
    altLabel,
  };
}
