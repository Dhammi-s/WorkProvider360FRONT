/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Office } from '../../../core/models/office.model';
import { PAYER_TYPES, Payer, PayerSourceType, PayerType, SavePayerRequest } from '../../../core/models/payer.model';
import { Alert } from '../alert/alert';

interface PayerFormState {
  officeId: string | null;
  payerSourceType: PayerSourceType;
  payerType: PayerType;
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string;
  website: string;
  notes: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  billRate: string;
  payRate: string;
}

function fromPayer(p: Payer | null): PayerFormState {
  return {
    officeId: p?.officeId ?? null,
    payerSourceType: p?.payerSourceType ?? 'Individual',
    payerType: p?.payerType ?? 'Private',
    firstName: p?.firstName ?? '',
    lastName: p?.lastName ?? '',
    companyName: p?.companyName ?? '',
    jobTitle: p?.jobTitle ?? '',
    website: p?.website ?? '',
    notes: p?.notes ?? '',
    email: p?.email ?? '',
    phone: p?.phone ?? '',
    addressLine1: p?.addressLine1 ?? '',
    addressLine2: p?.addressLine2 ?? '',
    city: p?.city ?? '',
    state: p?.state ?? '',
    postalCode: p?.postalCode ?? '',
    country: p?.country ?? '',
    billRate: p?.billRatePerHour != null ? String(p.billRatePerHour) : '',
    payRate: p?.payRatePerHour != null ? String(p.payRatePerHour) : '',
  };
}

const text = (v: string) => v.trim() || null;
const rate = (v: string) => {
  const n = Number(v);
  return v !== '' && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

/**
 * Add / edit an agency payer: Individual (first + last name) or Company
 * (company name + contact person), type, contact details, address, notes and
 * default bill / pay rates. Emits the request; the parent saves it.
 */
@Component({
  selector: 'app-payer-form',
  standalone: true,
  imports: [FormsModule, Alert],
  templateUrl: './payer-form.html',
})
export class PayerForm {
  readonly payer = input<Payer | null>(null);
  /** Offices to pick from (SuperAdmin); empty hides the office field. */
  readonly offices = input<Office[]>([]);
  readonly busy = input(false);
  readonly readOnly = input(false);
  readonly submitLabel = input('Save payer');
  readonly showCancel = input(false);
  /** Compact: no address, notes or rates (quick add from a client). */
  readonly compact = input(false);

  readonly submitted = output<SavePayerRequest>();
  readonly cancelled = output<void>();

  readonly form = signal<PayerFormState>(fromPayer(null));
  readonly error = signal('');
  readonly payerTypes = PAYER_TYPES;

  constructor() {
    effect(() => this.form.set(fromPayer(this.payer())));
  }

  patch(p: Partial<PayerFormState>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  submit(): void {
    const f = this.form();
    if (f.payerSourceType === 'Individual' && (!f.firstName.trim() || !f.lastName.trim())) {
      this.error.set('First and last name are required for an individual payer.');
      return;
    }
    if (f.payerSourceType === 'Company' && !f.companyName.trim()) {
      this.error.set('Company name is required for a company payer.');
      return;
    }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      this.error.set('Enter a valid email address.');
      return;
    }
    if (Number(f.billRate) < 0 || Number(f.payRate) < 0) {
      this.error.set('Rates cannot be negative.');
      return;
    }
    this.error.set('');
    this.submitted.emit({
      officeId: f.officeId,
      payerSourceType: f.payerSourceType,
      payerType: f.payerType,
      firstName: text(f.firstName),
      lastName: text(f.lastName),
      companyName: f.payerSourceType === 'Company' ? text(f.companyName) : null,
      jobTitle: text(f.jobTitle),
      website: text(f.website),
      notes: text(f.notes),
      email: text(f.email),
      phone: text(f.phone),
      addressLine1: text(f.addressLine1),
      addressLine2: text(f.addressLine2),
      city: text(f.city),
      state: text(f.state),
      postalCode: text(f.postalCode),
      country: text(f.country),
      billRatePerHour: rate(f.billRate),
      payRatePerHour: rate(f.payRate),
    });
  }
}
