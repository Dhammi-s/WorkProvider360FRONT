/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AccountingFailure,
  BillingSettings,
  QboItem,
  QboItemMapRow,
} from '../../../../core/models/billing.model';
import { BillingSettingsService } from '../../../../core/services/billing-settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Paginator } from '../../../../shared/ui/paginator/paginator';

/** Settings ▸ Billing ▸ QuickBooks Online: connection, item map, sync failures. */
@Component({
  selector: 'app-quickbooks-card',
  imports: [FormsModule, DatePipe, ConfirmDialog, Paginator],
  template: `
    <div class="wp-card mt-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900">QuickBooks Online</h2>
          <p class="mt-1 text-sm text-slate-500">
            Pushes customers, invoices, payments, credit memos and refunds to QuickBooks. Every service type must be mapped to a QuickBooks item.
          </p>
        </div>
        @if (connected()) {
          <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Connected</span>
        } @else {
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Not connected</span>
        }
      </div>

      @if (settings(); as s) {
        <div class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          @if (connected()) {
            <span class="text-slate-600">Company (realm) <span class="font-mono text-xs font-semibold text-slate-800">{{ s.qboRealmId }}</span></span>
            @if (s.qboConnectedOn) { <span class="text-slate-500">since {{ s.qboConnectedOn | date: 'MMM d, y' }}</span> }
            <label class="flex items-center gap-2 text-slate-700">
              <input type="checkbox" [disabled]="!canEdit() || busy()" [ngModel]="s.qboEnabled" (ngModelChange)="setEnabled($event)" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
              Sync enabled
            </label>
          }
          @if (canEdit()) {
            <div class="ml-auto flex gap-2">
              @if (connected()) {
                <button type="button" (click)="confirmDisconnect.set(true)" [disabled]="busy()" class="wp-btn-ghost !py-1.5 !text-red-600 text-sm">Disconnect</button>
              } @else {
                <button type="button" (click)="connect()" [disabled]="busy()" class="wp-btn-primary !py-2 text-sm">{{ busy() ? 'Opening…' : 'Connect QuickBooks' }}</button>
              }
            </div>
          }
        </div>
      }

      <!-- Item map -->
      <h3 class="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Item per service type</h3>
      @if (itemsError() && canEdit() && connected()) {
        <p class="mt-1 text-xs text-amber-700">{{ itemsError() }} You can still type the item id and name.</p>
      }
      @if (mapLoading()) {
        <p class="py-4 text-sm text-slate-400">Loading…</p>
      } @else if (map().length === 0) {
        <p class="py-4 text-sm text-slate-400">No service types.</p>
      } @else {
        <div class="mt-2 overflow-x-auto rounded-xl border border-slate-200">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr><th class="px-3 py-2">Service type</th><th class="px-3 py-2">QuickBooks item</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (r of map(); track r.serviceTypeId) {
                <tr [class.opacity-60]="!r.isActive">
                  <td class="px-3 py-2 font-semibold text-slate-800">{{ r.serviceTypeName }}{{ r.isActive ? '' : ' (inactive)' }}</td>
                  <td class="px-3 py-2">
                    @if (!canEdit()) {
                      <span class="text-slate-600">{{ r.qboItemName || '—' }}</span>
                    } @else if (items().length) {
                      <select class="wp-input !py-1.5 text-sm" [ngModel]="r.qboItemId" (ngModelChange)="pickItem(r, $event)">
                        <option [ngValue]="null">— Not mapped —</option>
                        @for (i of items(); track i.id) { <option [ngValue]="i.id">{{ i.name }} ({{ i.type }})</option> }
                        @if (r.qboItemId && !hasItem(r.qboItemId)) { <option [ngValue]="r.qboItemId">{{ r.qboItemName || r.qboItemId }}</option> }
                      </select>
                    } @else {
                      <div class="flex gap-2">
                        <input class="wp-input !w-28 !py-1.5 text-sm" placeholder="Item id" [ngModel]="r.qboItemId" (ngModelChange)="setRow(r, { qboItemId: $event })" />
                        <input class="wp-input !py-1.5 text-sm" placeholder="Item name" [ngModel]="r.qboItemName" (ngModelChange)="setRow(r, { qboItemName: $event })" />
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (canEdit()) {
          <div class="mt-3 flex justify-end">
            <button type="button" (click)="saveMap()" [disabled]="savingMap()" class="wp-btn-primary">{{ savingMap() ? 'Saving…' : 'Save item map' }}</button>
          </div>
        }
      }

      <!-- Failures -->
      <div class="mt-6 flex items-center justify-between">
        <h3 class="text-xs font-bold uppercase tracking-wide text-slate-400">Sync failures</h3>
        <button type="button" (click)="loadFailures()" class="wp-link text-xs">Refresh</button>
      </div>
      @if (failuresLoading()) {
        <p class="py-4 text-sm text-slate-400">Loading…</p>
      } @else if (failures().length === 0) {
        <p class="py-4 text-sm text-slate-400">No sync failures.</p>
      } @else {
        <div class="mt-2 overflow-hidden rounded-xl border border-slate-200">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100 text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="px-3 py-2">Entity</th>
                  <th class="px-3 py-2">Error</th>
                  <th class="px-3 py-2 text-right">Attempts</th>
                  <th class="px-3 py-2">Last try</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (f of failures(); track f.queueId) {
                  <tr>
                    <td class="px-3 py-2 whitespace-nowrap">
                      <div class="font-semibold text-slate-800">{{ f.entityType }} <span class="font-mono text-xs text-slate-500">{{ f.localId }}</span></div>
                      <div class="text-xs text-slate-400">{{ f.operation }} · {{ f.status }}</div>
                    </td>
                    <td class="max-w-md px-3 py-2 text-xs text-red-700">{{ f.lastError || '—' }}</td>
                    <td class="px-3 py-2 text-right text-slate-600">{{ f.attempts }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs text-slate-500">{{ (f.updatedOn || f.createdOn) | date: 'MMM d, h:mm a' }}</td>
                    <td class="px-3 py-2 text-right whitespace-nowrap">
                      @if (canManage()) {
                        <button type="button" (click)="retry(f)" [disabled]="busyId() === f.queueId" class="wp-link text-sm">Retry</button>
                        <button type="button" (click)="resolve(f)" [disabled]="busyId() === f.queueId" class="ml-3 text-sm font-semibold text-slate-500 hover:text-slate-800">Mark resolved</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-paginator [total]="failuresTotal()" [page]="failuresPage()" [pageSize]="failuresPageSize()"
            (pageChange)="failuresPage.set($event); loadFailures()" (pageSizeChange)="failuresPageSize.set($event); failuresPage.set(1); loadFailures()" />
        </div>
      }
    </div>

    @if (confirmDisconnect()) {
      <app-confirm-dialog
        tone="danger"
        title="Disconnect QuickBooks?"
        message="Sync stops and the stored QuickBooks tokens are removed. Records already in QuickBooks stay there."
        confirmLabel="Disconnect"
        (confirmed)="disconnect()"
        (cancelled)="confirmDisconnect.set(false)" />
    }
  `,
})
export class QuickbooksCard {
  private readonly service = inject(BillingSettingsService);
  private readonly toast = inject(ToastService);

  readonly settings = input<BillingSettings | null>(null);
  readonly canEdit = input(false);
  /** Retry / resolve need billing Write. */
  readonly canManage = input(false);
  readonly settingsChange = output<BillingSettings>();

  readonly busy = signal(false);
  readonly confirmDisconnect = signal(false);

  readonly map = signal<QboItemMapRow[]>([]);
  readonly mapLoading = signal(true);
  readonly savingMap = signal(false);
  readonly items = signal<QboItem[]>([]);
  readonly itemsError = signal('');

  readonly failures = signal<AccountingFailure[]>([]);
  readonly failuresTotal = signal(0);
  readonly failuresPage = signal(1);
  readonly failuresPageSize = signal(10);
  readonly failuresLoading = signal(true);
  readonly busyId = signal<number | null>(null);

  connected(): boolean {
    const s = this.settings();
    return !!s && !!s.qboRealmId && (s.hasQboRefreshToken || !!s.qboConnectedOn);
  }

  constructor() {
    this.loadMap();
    this.loadFailures();
    let itemsRequested = false;
    effect(() => {
      // Live items only for SuperAdmin once connected.
      if (this.canEdit() && this.settings() && this.connected() && !itemsRequested) {
        itemsRequested = true;
        untracked(() => this.loadItems());
      }
    });
  }

  loadMap(): void {
    this.mapLoading.set(true);
    this.service.qboItemMap().subscribe({
      next: (m) => {
        this.map.set(m);
        this.mapLoading.set(false);
      },
      error: () => this.mapLoading.set(false),
    });
  }

  loadItems(): void {
    this.service.qboItems().subscribe({
      next: (i) => {
        this.items.set(i);
        this.itemsError.set('');
      },
      error: (err: Error) => this.itemsError.set(err.message || 'Could not load the QuickBooks items.'),
    });
  }

  hasItem(id: string): boolean {
    return this.items().some((i) => i.id === id);
  }

  pickItem(r: QboItemMapRow, id: string | null): void {
    const item = this.items().find((i) => i.id === id);
    this.setRow(r, { qboItemId: id, qboItemName: item?.name ?? null });
  }

  setRow(r: QboItemMapRow, p: Partial<QboItemMapRow>): void {
    this.map.update((list) => list.map((x) => (x.serviceTypeId === r.serviceTypeId ? { ...x, ...p } : x)));
  }

  saveMap(): void {
    this.savingMap.set(true);
    const items = this.map().map((r) => ({
      serviceTypeId: r.serviceTypeId,
      qboItemId: (r.qboItemId ?? '').trim() || null,
      qboItemName: (r.qboItemName ?? '').trim() || null,
    }));
    this.service.saveQboItemMap(items).subscribe({
      next: (m) => {
        this.savingMap.set(false);
        this.map.set(m);
        this.toast.success('QuickBooks item map saved.');
      },
      error: (err: Error) => {
        this.savingMap.set(false);
        this.toast.error(err.message || 'Could not save the item map.');
      },
    });
  }

  loadFailures(): void {
    this.failuresLoading.set(true);
    this.service.qboFailures(this.failuresPage(), this.failuresPageSize()).subscribe({
      next: (p) => {
        this.failures.set(p.items);
        this.failuresTotal.set(p.total);
        this.failuresLoading.set(false);
      },
      error: () => {
        this.failures.set([]);
        this.failuresLoading.set(false);
      },
    });
  }

  retry(f: AccountingFailure): void {
    this.busyId.set(f.queueId);
    this.service.retryQboFailure(f.queueId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Queued for another try.');
        this.loadFailures();
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error(err.message || 'Could not retry.');
      },
    });
  }

  resolve(f: AccountingFailure): void {
    this.busyId.set(f.queueId);
    this.service.resolveQboFailure(f.queueId).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Marked resolved.');
        this.loadFailures();
      },
      error: (err: Error) => {
        this.busyId.set(null);
        this.toast.error(err.message || 'Could not mark it resolved.');
      },
    });
  }

  connect(): void {
    this.busy.set(true);
    this.service.qboConnectUrl(`${location.origin}/dashboard/settings?tab=billing`).subscribe({
      next: (r) => {
        window.location.href = r.url;
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not start the QuickBooks connection.');
      },
    });
  }

  disconnect(): void {
    this.confirmDisconnect.set(false);
    this.busy.set(true);
    this.service.qboDisconnect().subscribe({
      next: (s) => {
        this.busy.set(false);
        this.settingsChange.emit(s);
        this.toast.success('QuickBooks disconnected.');
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not disconnect QuickBooks.');
      },
    });
  }

  setEnabled(enabled: boolean): void {
    this.busy.set(true);
    this.service.qboEnabled(enabled).subscribe({
      next: (s) => {
        this.busy.set(false);
        this.settingsChange.emit(s);
        this.toast.success(enabled ? 'QuickBooks sync enabled.' : 'QuickBooks sync paused.');
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.toast.error(err.message || 'Could not change the QuickBooks sync.');
        // Re-emit the unchanged settings so the checkbox snaps back.
        const s = this.settings();
        if (s) this.settingsChange.emit({ ...s });
      },
    });
  }
}
