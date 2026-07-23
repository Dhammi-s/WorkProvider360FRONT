import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Invoice, PayInvoiceRequest } from '../../../core/models/accounting.model';
import { ScheduleReportRow } from '../../../core/models/scheduler.model';
import { UserDto } from '../../../core/models/user.model';
import { AccountingService } from '../../../core/services/accounting.service';
import { SchedulerService } from '../../../core/services/scheduler.service';
import { UserService } from '../../../core/services/user.service';
import { Alert } from '../../../shared/ui/alert/alert';
import {
  InvoicePdfModel,
  downloadPdfDataUri,
  generateInvoicePdfBase64,
} from '../../../shared/util/invoice-pdf.util';

type Tab = 'salaries' | 'shift' | 'invoices';

@Component({
  selector: 'app-accounting',
  imports: [CurrencyPipe, DatePipe, FormsModule, Alert],
  templateUrl: './accounting.html',
})
export class Accounting {
  private readonly accounting = inject(AccountingService);
  private readonly users = inject(UserService);
  private readonly scheduler = inject(SchedulerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private static readonly PENDING_KEY = 'wp360.pendingInvoice';

  readonly tab = signal<Tab>('salaries');

  readonly notice = signal('');
  readonly error = signal('');
  readonly payingKey = signal<string | null>(null); // which row is being paid

  // Salaries
  readonly allUsers = signal<UserDto[]>([]);
  readonly staff = computed(() =>
    this.allUsers().filter((u) => (u.roleName === 'Admin' || u.roleName === 'Manager') && u.isActive),
  );

  // Shift pay
  readonly from = signal(this.startOfMonth());
  readonly to = signal(this.today());
  readonly shiftRows = signal<ScheduleReportRow[]>([]);
  readonly shiftLoading = signal(false);

  // Invoices
  readonly invoices = signal<Invoice[]>([]);
  readonly invoicesLoading = signal(false);

  constructor() {
    this.loadUsers();
    this.loadInvoices();
    this.handleStripeReturn();
  }

  /** After returning from Stripe Checkout, finalize (record + email) the payment. */
  private handleStripeReturn(): void {
    const qp = this.route.snapshot.queryParamMap;
    const pay = qp.get('pay');
    if (pay === 'online' && qp.get('session_id')) {
      const raw = sessionStorage.getItem(Accounting.PENDING_KEY);
      sessionStorage.removeItem(Accounting.PENDING_KEY);
      this.tab.set('invoices');
      if (raw) {
        const request = JSON.parse(raw) as PayInvoiceRequest;
        request.stripeSessionId = qp.get('session_id');
        request.paymentMethod = 'Online';
        this.payingKey.set('online-return');
        this.accounting.pay(request).subscribe({
          next: (inv) => {
            this.payingKey.set(null);
            this.notice.set(`Online payment received — invoice ${inv.invoiceNumber} emailed.`);
            this.loadInvoices();
          },
          error: (err: Error) => {
            this.payingKey.set(null);
            this.error.set(err.message || 'Could not finalize the payment.');
          },
        });
      }
      this.clearQuery();
    } else if (pay === 'cancel') {
      this.error.set('Payment was cancelled.');
      this.clearQuery();
    }
  }

  private clearQuery(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    if (t === 'invoices') this.loadInvoices();
  }

  // ---- data ----
  loadUsers(): void {
    this.users.getUsers().subscribe({
      next: (list) => this.allUsers.set(list),
      error: (err: Error) => this.error.set(err.message || 'Could not load staff.'),
    });
  }

  loadShift(): void {
    this.shiftLoading.set(true);
    this.error.set('');
    const fromUtc = new Date(this.from()).toISOString();
    const toUtc = new Date(this.to() + 'T23:59:59').toISOString();
    this.scheduler.report(fromUtc, toUtc).subscribe({
      next: (report) => {
        this.shiftRows.set(report.rows ?? []);
        this.shiftLoading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load shift report.');
        this.shiftLoading.set(false);
      },
    });
  }

  loadInvoices(): void {
    this.invoicesLoading.set(true);
    this.accounting.list().subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.invoicesLoading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load invoices.');
        this.invoicesLoading.set(false);
      },
    });
  }

  // ---- pay actions ----
  paySalary(user: UserDto): Promise<void> {
    return this.runCash(`salary-${user.userId}`, this.salaryPayload(user, 'Cash'));
  }

  paySalaryOnline(user: UserDto): Promise<void> {
    return this.startOnline(`salary-${user.userId}`, this.salaryPayload(user, 'Online'));
  }

  payShift(row: ScheduleReportRow): Promise<void> {
    return this.runCash(`shift-${row.userId}`, this.shiftPayload(row, 'Cash'));
  }

  payShiftOnline(row: ScheduleReportRow): Promise<void> {
    return this.startOnline(`shift-${row.userId}`, this.shiftPayload(row, 'Online'));
  }

  private salaryPayload(user: UserDto, method: 'Cash' | 'Online'): { model: InvoicePdfModel; request: PayInvoiceRequest } | null {
    if (user.salary == null) {
      this.error.set(`No salary set for ${user.fullName}.`);
      return null;
    }
    const number = this.newInvoiceNumber();
    return {
      model: {
        invoiceNumber: number,
        dateStr: this.nowDateStr(),
        recipientName: user.fullName,
        recipientEmail: user.email,
        recipientRoleName: user.roleName,
        invoiceType: 'Salary',
        amount: user.salary,
        paymentMethod: method,
      },
      request: {
        invoiceNumber: number,
        recipientUserId: user.userId,
        recipientName: user.fullName,
        recipientEmail: user.email,
        recipientRoleName: user.roleName,
        invoiceType: 'Salary',
        amount: user.salary,
        paymentMethod: method,
        pdfBase64: '',
      },
    };
  }

  private shiftPayload(row: ScheduleReportRow, method: 'Cash' | 'Online'): { model: InvoicePdfModel; request: PayInvoiceRequest } | null {
    const user = this.allUsers().find((u) => u.userId === row.userId);
    if (!user?.email) {
      this.error.set(`No email on file for ${row.userName}; cannot send the invoice.`);
      return null;
    }
    const number = this.newInvoiceNumber();
    const periodFrom = new Date(this.from()).toISOString();
    const periodTo = new Date(this.to() + 'T23:59:59').toISOString();
    return {
      model: {
        invoiceNumber: number,
        dateStr: this.nowDateStr(),
        recipientName: row.userName,
        recipientEmail: user.email,
        recipientRoleName: user.roleName,
        invoiceType: 'ShiftPay',
        amount: row.totalPay,
        regularHours: row.regularHours,
        overtimeHours: row.overtimeHours,
        totalHours: row.totalHours,
        periodFrom,
        periodTo,
        paymentMethod: method,
      },
      request: {
        invoiceNumber: number,
        recipientUserId: row.userId,
        recipientName: row.userName,
        recipientEmail: user.email,
        recipientRoleName: user.roleName,
        invoiceType: 'ShiftPay',
        amount: row.totalPay,
        regularHours: row.regularHours,
        overtimeHours: row.overtimeHours,
        totalHours: row.totalHours,
        periodFrom,
        periodTo,
        details: `Regular ${row.regularHours}h + Overtime ${row.overtimeHours}h over ${row.scheduleCount} shift(s)`,
        paymentMethod: method,
        pdfBase64: '',
      },
    };
  }

  private async runCash(key: string, payload: { model: InvoicePdfModel; request: PayInvoiceRequest } | null): Promise<void> {
    if (!payload) return;
    this.payingKey.set(key);
    this.notice.set('');
    this.error.set('');
    try {
      payload.request.pdfBase64 = await generateInvoicePdfBase64(payload.model);
    } catch {
      this.payingKey.set(null);
      this.error.set('Could not generate the invoice PDF.');
      return;
    }
    this.accounting.pay(payload.request).subscribe({
      next: (inv) => {
        this.payingKey.set(null);
        this.notice.set(`Paid ${inv.recipientName} — invoice ${inv.invoiceNumber} emailed.`);
        this.loadInvoices();
      },
      error: (err: Error) => {
        this.payingKey.set(null);
        this.error.set(err.message || 'Payment failed.');
      },
    });
  }

  /** Generate the (online) PDF, stash the request, create a Stripe session, redirect. */
  private async startOnline(key: string, payload: { model: InvoicePdfModel; request: PayInvoiceRequest } | null): Promise<void> {
    if (!payload) return;
    this.payingKey.set(key);
    this.notice.set('');
    this.error.set('');
    try {
      payload.request.pdfBase64 = await generateInvoicePdfBase64(payload.model);
    } catch {
      this.payingKey.set(null);
      this.error.set('Could not generate the invoice PDF.');
      return;
    }
    const origin = window.location.origin;
    this.accounting
      .createCheckoutSession({
        amount: payload.request.amount,
        description: `${payload.request.invoiceType === 'ShiftPay' ? 'Shift pay' : 'Salary'} — ${payload.request.recipientName}`,
        successUrl: `${origin}/dashboard/accounting?pay=online&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/dashboard/accounting?pay=cancel`,
      })
      .subscribe({
        next: (session) => {
          sessionStorage.setItem(Accounting.PENDING_KEY, JSON.stringify(payload.request));
          window.location.href = session.url;
        },
        error: (err: Error) => {
          this.payingKey.set(null);
          this.error.set(err.message || 'Could not start the online payment.');
        },
      });
  }

  downloadInvoice(inv: Invoice): void {
    this.accounting.pdf(inv.invoiceId).subscribe({
      next: (dataUri) => downloadPdfDataUri(dataUri, `invoice-${inv.invoiceNumber}.pdf`),
      error: (err: Error) => this.error.set(err.message || 'Could not download the PDF.'),
    });
  }

  // ---- helpers ----
  private newInvoiceNumber(): string {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${stamp}-${rand}`;
  }

  private nowDateStr(): string {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private startOfMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
