/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import {
  Authorization,
  AuthorizationSummary,
  DISPLAY_STATUSES,
  DisplayStatus,
  allowedDaysLabel,
  displayStatusClass,
  displayStatusLabel,
  formatDateOnly,
  formatHours,
} from '../../../core/models/authorization.model';
import { ServiceType } from '../../../core/models/service-type.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { ClientPayerService } from '../../../core/services/ClientPayerService';
import { PayerService } from '../../../core/services/payer.service';
import { ServiceTypeService } from '../../../core/services/service-type.service';
import { ToastService } from '../../../core/services/toast.service';
import { Alert } from '../../../shared/ui/alert/alert';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { Paginator } from '../../../shared/ui/paginator/paginator';
import { AuthorizationEditor } from './authorization-editor/authorization-editor';
import { AuthorizationUsagePanel } from './authorization-usage/authorization-usage';

interface PayerOption {
  payerId: number;
  payerName: string;
}

/**
 * Payer authorizations: KPIs, search + filters, table with view / edit / status /
 * delete actions. Used as the /dashboard/authorizations page and embedded in the
 * payer profile ([fixedPayerId]) and the client profile ([fixedClientId]).
 */
@Component({
  selector: 'app-authorizations',
  imports: [
    FormsModule,
    RouterLink,
    Alert,
    ConfirmDialog,
    Paginator,
    AuthorizationEditor,
    AuthorizationUsagePanel,
  ],
  templateUrl: './authorizations.html',
})
export class Authorizations {
  private readonly service = inject(AuthorizationService);
  private readonly payerService = inject(PayerService);
  private readonly clientPayers = inject(ClientPayerService);
  private readonly serviceTypeService = inject(ServiceTypeService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Show only this payer's authorizations (payer profile); hides the payer filter / column. */
  readonly fixedPayerId = input<number | null>(null);
  /** Show only this client's authorizations (client profile); hides the client column. */
  readonly fixedClientId = input<number | null>(null);

  readonly embedded = computed(() => this.fixedPayerId() != null || this.fixedClientId() != null);

  readonly access = this.service.access;
  readonly canManage = computed(() => !!this.access()?.canManage);
  /** True once the access call finished (an error leaves access null and lets the server decide). */
  readonly accessReady = signal(false);
  readonly noAccess = computed(() => {
    const a = this.access();
    return this.accessReady() && !!a && (a.accessLevel === 'None' || !a.canView);
  });

  readonly items = signal<Authorization[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly summary = signal<AuthorizationSummary | null>(null);

  readonly search = signal('');
  readonly payerFilter = signal<number | null>(null);
  readonly serviceTypeFilter = signal<number | null>(null);
  readonly statusFilter = signal<DisplayStatus | ''>('');
  readonly payerOptions = signal<PayerOption[]>([]);
  readonly serviceTypes = signal<ServiceType[]>([]);
  private readonly search$ = new Subject<string>();

  // Overlays
  readonly editorOpen = signal(false);
  readonly editing = signal<Authorization | null>(null);
  readonly usageId = signal<number | null>(null);
  readonly menuFor = signal<number | null>(null);
  readonly confirmDelete = signal<Authorization | null>(null);
  readonly deleteBlocked = signal<{ auth: Authorization; message: string } | null>(null);
  readonly busy = signal(false);

  readonly statuses = DISPLAY_STATUSES;
  readonly statusClass = displayStatusClass;
  readonly statusLabel = displayStatusLabel;
  readonly fmtDate = formatDateOnly;
  readonly fmtHours = formatHours;
  readonly daysLabel = allowedDaysLabel;

  private readonly menuPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  /** The open row menu: its authorization and fixed screen position. */
  readonly menuTarget = computed(() => {
    const id = this.menuFor();
    const auth = id == null ? undefined : this.items().find((a) => a.authorizationId === id);
    return auth ? { auth, ...this.menuPos() } : null;
  });

  constructor() {
    this.service
      .loadAccess()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.accessReady.set(true));
    this.serviceTypeService
      .list()
      .subscribe({ next: (s) => this.serviceTypes.set(s), error: () => {} });
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.applyFilters());

    // (Re)load once the access is known, and whenever the host fixes a different payer / client.
    effect(() => {
      this.fixedPayerId();
      const clientId = this.fixedClientId();
      if (!this.accessReady() || this.noAccess()) return;
      untracked(() => {
        this.page.set(1);
        this.loadPayerOptions(clientId);
        this.reload();
      });
    });
  }

  private loadPayerOptions(clientId: number | null): void {
    if (this.fixedPayerId() != null) {
      this.payerOptions.set([]);
      return;
    }
    if (clientId != null) {
      this.clientPayers.getPayersByClient(clientId).subscribe({
        next: (list) =>
          this.payerOptions.set(list.map((p) => ({ payerId: p.payerId, payerName: p.payerName }))),
        error: () => this.payerOptions.set([]),
      });
    } else {
      this.payerService.list(1, 200).subscribe({
        next: (r) =>
          this.payerOptions.set(
            r.items.map((p) => ({ payerId: p.payerId, payerName: p.payerName })),
          ),
        error: () => this.payerOptions.set([]),
      });
    }
  }

  /** List + KPIs. */
  reload(): void {
    this.load();
    this.loadSummary();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        search: this.search().trim() || undefined,
        clientId: this.fixedClientId(),
        payerId: this.fixedPayerId() ?? this.payerFilter(),
        serviceTypeId: this.serviceTypeFilter(),
        status: this.statusFilter() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.items.set(r.items);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Could not load authorizations.');
          this.loading.set(false);
        },
      });
  }

  private loadSummary(): void {
    this.service
      .summary(this.fixedClientId(), this.fixedPayerId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.summary.set(s), error: () => this.summary.set(null) });
  }

  onSearch(q: string): void {
    this.search.set(q);
    this.search$.next(q);
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  resetFilters(): void {
    this.search.set('');
    this.payerFilter.set(null);
    this.serviceTypeFilter.set(null);
    this.statusFilter.set('');
    this.applyFilters();
  }

  onPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  onPageSize(n: number): void {
    this.pageSize.set(n);
    this.applyFilters();
  }

  // ------------------------------------------------------------- Actions

  openCreate(): void {
    this.editing.set(null);
    this.editorOpen.set(true);
  }

  openEdit(a: Authorization): void {
    this.menuFor.set(null);
    this.editing.set(a);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editing.set(null);
  }

  onSaved(): void {
    this.closeEditor();
    this.reload();
  }

  openUsage(a: Authorization): void {
    this.menuFor.set(null);
    this.usageId.set(a.authorizationId);
  }

  toggleMenu(a: Authorization, event: MouseEvent): void {
    if (this.menuFor() === a.authorizationId) {
      this.menuFor.set(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = 84;
    const below = rect.bottom + 4 + menuHeight <= window.innerHeight;
    this.menuPos.set({
      top: below ? rect.bottom + 4 : Math.max(8, rect.top - 4 - menuHeight),
      left: Math.max(8, rect.right - menuWidth),
    });
    this.menuFor.set(a.authorizationId);
  }

  setStatus(a: Authorization, status: 'Active' | 'Inactive'): void {
    this.menuFor.set(null);
    this.deleteBlocked.set(null);
    this.busy.set(true);
    this.service.setStatus(a.authorizationId, status).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(
          status === 'Active'
            ? `${a.authorizationName} activated.`
            : `${a.authorizationName} deactivated.`,
        );
        this.reload();
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not change the status.');
      },
    });
  }

  askDelete(a: Authorization): void {
    this.menuFor.set(null);
    this.confirmDelete.set(a);
  }

  doDelete(): void {
    const a = this.confirmDelete();
    if (!a) return;
    this.confirmDelete.set(null);
    this.busy.set(true);
    this.service.remove(a.authorizationId).subscribe({
      next: (msg) => {
        this.busy.set(false);
        this.toast.success(msg || 'Authorization deleted.');
        if (this.items().length === 1 && this.page() > 1) this.page.update((p) => p - 1);
        this.reload();
      },
      error: (err: Error) => {
        this.busy.set(false);
        // Usually a 409: visits already use it. Offer to deactivate instead.
        this.deleteBlocked.set({
          auth: a,
          message: err.message || 'Could not delete the authorization.',
        });
      },
    });
  }

  usedLabel(a: Authorization): string {
    const used = (a.usedHours ?? 0).toFixed(2);
    return a.totalAuthorizedHours == null
      ? `${used} h`
      : `${used} / ${a.totalAuthorizedHours.toFixed(2)} h`;
  }

  usedPercent(a: Authorization): number {
    if (!a.totalAuthorizedHours) return 0;
    return Math.min(100, Math.round(((a.usedHours ?? 0) / a.totalAuthorizedHours) * 100));
  }
}
