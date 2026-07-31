/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PosSummary, PosTransaction } from '../../../core/models/pos.model';
import { AuthService } from '../../../core/services/auth.service';
import { PosService } from '../../../core/services/pos.service';
import { Alert } from '../../../shared/ui/alert/alert';

@Component({
  selector: 'app-pos',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, FormsModule, Alert],
  templateUrl: './pos.html',
})
export class Pos {
  private readonly fb = inject(FormBuilder);
  private readonly pos = inject(PosService);
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.roleName() === 'SuperAdmin');

  readonly charging = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly lastResult = signal<PosTransaction | null>(null);

  readonly transactions = signal<PosTransaction[]>([]);
  readonly summary = signal<PosSummary | null>(null);

  // Fee settings (SuperAdmin)
  readonly feePercent = signal(1);
  readonly feeFixed = signal(0.2);
  readonly feeSaving = signal(false);
  readonly feeNotice = signal('');

  readonly form = this.fb.nonNullable.group({
    payerName: ['', [Validators.required]],
    payerEmail: ['', [Validators.email]],
    description: [''],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    cardNumber: ['4242 4242 4242 4242', [Validators.required]],
  });

  constructor() {
    this.loadTransactions();
    this.loadSummary();
    if (this.isSuperAdmin()) this.loadFeeSettings();
  }

  loadTransactions(): void {
    this.pos.transactions().subscribe({
      next: (t) => this.transactions.set(t),
      error: (err: Error) => this.error.set(err.message || 'Could not load transactions.'),
    });
  }

  loadSummary(): void {
    this.pos.summary().subscribe({
      next: (s) => this.summary.set(s),
      error: () => this.summary.set(null),
    });
  }

  loadFeeSettings(): void {
    this.pos.getFeeSettings().subscribe({
      next: (s) => {
        this.feePercent.set(s.feePercent);
        this.feeFixed.set(s.feeFixed);
      },
      error: () => {},
    });
  }

  charge(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.charging.set(true);
    this.error.set('');
    this.notice.set('');
    this.lastResult.set(null);
    const v = this.form.getRawValue();
    const email = (v.payerEmail || '').trim();
    this.pos
      .charge({
        payerName: v.payerName.trim(),
        payerEmail: email.includes('@') ? email : null,
        description: v.description?.trim() || null,
        amount: Number(v.amount),
        cardNumber: v.cardNumber,
      })
      .subscribe({
        next: (txn) => {
          this.charging.set(false);
          this.lastResult.set(txn);
          if (txn.status === 'Approved') {
            this.notice.set(`Approved — platform earned ${txn.platformFee}.`);
            this.form.patchValue({ amount: 0, description: '' });
          } else {
            this.error.set(txn.declineReason || 'Declined.');
          }
          this.loadTransactions();
          this.loadSummary();
        },
        error: (err: Error) => {
          this.charging.set(false);
          this.error.set(err.message || 'Charge failed.');
        },
      });
  }

  saveFeeSettings(): void {
    this.feeSaving.set(true);
    this.feeNotice.set('');
    this.pos.updateFeeSettings(Number(this.feePercent()), Number(this.feeFixed())).subscribe({
      next: () => {
        this.feeSaving.set(false);
        this.feeNotice.set('Fee saved.');
      },
      error: (err: Error) => {
        this.feeSaving.set(false);
        this.error.set(err.message || 'Could not save fee.');
      },
    });
  }

  statusBadge(status: string): string {
    return status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
  }
}
