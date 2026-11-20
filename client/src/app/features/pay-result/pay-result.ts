/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BrandingService } from '../../core/services/branding.service';

type PayStatus = 'success' | 'cancelled' | 'paid' | 'unknown';

/**
 * Public page Stripe Checkout returns to (also used by the emailed "Pay online" link
 * when nothing is due): /pay/result?status=success|cancelled|paid&invoice={number}.
 * No sign-in needed; it only shows the outcome and a link back.
 */
@Component({
  selector: 'app-pay-result',
  imports: [RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
        @if (logo()) {
          <img [src]="logo()" [alt]="agencyName()" class="mx-auto mb-6 h-10 w-auto object-contain" />
        }
        <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full" [class]="tone().bg">
          @switch (status()) {
            @case ('cancelled') {
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            }
            @case ('unknown') {
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5m0 3h.01" /></svg>
            }
            @default {
              <svg class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            }
          }
        </span>
        <h1 class="mt-5 text-xl font-extrabold tracking-tight text-slate-900">{{ title() }}</h1>
        <p class="mt-2 text-sm text-slate-600">{{ message() }}</p>
        @if (invoice()) {
          <p class="mt-3 text-xs text-slate-400">Invoice <span class="font-mono font-semibold text-slate-600">{{ invoice() }}</span></p>
        }
        <div class="mt-7 flex flex-col gap-2">
          <a [routerLink]="backLink()" class="wp-btn-primary justify-center">{{ backLabel() }}</a>
        </div>
      </div>
    </div>
  `,
})
export class PayResult {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly branding = inject(BrandingService);

  /** Agency logo from the anonymous login-page payload (no sign-in needed). */
  readonly logo = signal<string | null>(null);
  readonly agencyName = signal('');

  private readonly query = toSignal(this.route.queryParamMap.pipe(map((q) => q)), { initialValue: null });

  readonly status = computed<PayStatus>(() => {
    const s = (this.query()?.get('status') ?? '').toLowerCase();
    if (s === 'success') return 'success';
    if (s === 'cancelled' || s === 'canceled' || s === 'cancel') return 'cancelled';
    if (s === 'paid') return 'paid';
    return 'unknown';
  });

  readonly invoice = computed(() => (this.query()?.get('invoice') ?? '').slice(0, 40));

  readonly title = computed(() => {
    switch (this.status()) {
      case 'success':
        return 'Thank you — payment received';
      case 'paid':
        return 'Nothing is due';
      case 'cancelled':
        return 'Payment cancelled';
      default:
        return 'Payment status unknown';
    }
  });

  readonly message = computed(() => {
    switch (this.status()) {
      case 'success':
        return 'Your payment was submitted. It can take a few minutes to show on your invoice; a receipt is sent by email.';
      case 'paid':
        return 'This invoice is already paid in full. No payment was taken.';
      case 'cancelled':
        return 'No payment was taken. You can pay later from the link in your invoice email or from the client portal.';
      default:
        return 'We could not tell how the payment ended. Check your invoice in the client portal or contact the agency.';
    }
  });

  readonly tone = computed(() =>
    this.status() === 'cancelled'
      ? { bg: 'bg-slate-100 text-slate-500' }
      : this.status() === 'unknown'
        ? { bg: 'bg-amber-50 text-amber-600' }
        : { bg: 'bg-emerald-50 text-emerald-600' },
  );

  /** Signed-in portal clients go back to their invoices; everyone else to the portal sign-in. */
  readonly backLink = computed(() => (this.auth.roleName() === 'Client' ? '/portal/invoices' : '/portal-login'));
  readonly backLabel = computed(() => (this.auth.roleName() === 'Client' ? 'Back to my invoices' : 'Go to the client portal'));

  constructor() {
    this.branding.getLoginPage().subscribe({
      next: (p) => {
        this.logo.set(p?.logo ?? null);
        this.agencyName.set(p?.agencyName ?? '');
      },
      error: () => {},
    });
  }
}
