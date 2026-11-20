/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, map, of, shareReplay, switchMap } from 'rxjs';
import { Injectable } from '@angular/core';
import { Payer } from '../../../core/models/payer.model';
import { PayerService } from '../../../core/services/payer.service';
import { ClientService } from '../../../core/services/client.service';

export interface PickedClient {
  clientId: number;
  fullName: string;
}

/** Caches the agency payer list for the billing pickers (one call per session). */
@Injectable({ providedIn: 'root' })
export class BillingPayerOptions {
  private readonly payers = inject(PayerService);
  private cache$: Observable<Payer[]> | null = null;

  list(): Observable<Payer[]> {
    if (!this.cache$) {
      this.cache$ = this.payers.list(1, 500).pipe(
        map((r) => [...r.items].sort((a, b) => a.payerName.localeCompare(b.payerName))),
        shareReplay(1),
      );
    }
    return this.cache$;
  }

  refresh(): void {
    this.cache$ = null;
  }
}

/**
 * Client search box (autocomplete). Shows the picked client with a "Change" link.
 * Usage: <app-client-picker [client]="picked()" (clientChange)="picked.set($event)" />
 */
@Component({
  selector: 'app-client-picker',
  imports: [FormsModule],
  template: `
    <div class="relative">
      @if (label()) { <label class="wp-label">{{ label() }}</label> }
      @if (client(); as c) {
        <div class="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
          <span class="truncate text-sm font-semibold text-slate-700">{{ c.fullName }}</span>
          @if (!disabled()) {
            <button type="button" (click)="clear()" class="text-xs font-semibold text-red-600">{{ clearLabel() }}</button>
          }
        </div>
      } @else {
        <input class="wp-input !py-2" [placeholder]="placeholder()" autocomplete="off" [disabled]="disabled()"
          [ngModel]="query()" (ngModelChange)="onQuery($event)" (blur)="closeSoon()" />
        @if (open()) {
          <div class="absolute z-30 mt-1 w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-card">
            @for (c of options(); track c.clientId) {
              <button type="button" (mousedown)="pick(c)" class="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">{{ c.fullName }}</button>
            } @empty {
              <p class="px-3 py-2 text-sm text-slate-400">No matching clients.</p>
            }
          </div>
        }
      }
    </div>
  `,
})
export class ClientPicker {
  private readonly clients = inject(ClientService);

  readonly client = input<PickedClient | null>(null);
  readonly label = input<string>('');
  readonly placeholder = input<string>('Search clients…');
  readonly clearLabel = input<string>('Change');
  readonly disabled = input(false);
  readonly clientChange = output<PickedClient | null>();

  readonly query = signal('');
  readonly options = signal<PickedClient[]>([]);
  readonly open = signal(false);
  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        switchMap((q) =>
          q.trim()
            ? this.clients.list(1, 8, { search: q.trim() }).pipe(
                map((r) => r.items.map((c) => ({ clientId: c.clientId, fullName: c.fullName }))),
              )
            : of([] as PickedClient[]),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe({
        next: (list) => {
          this.options.set(list);
          this.open.set(!!this.query().trim());
        },
        error: () => this.options.set([]),
      });
  }

  onQuery(q: string): void {
    this.query.set(q);
    this.search$.next(q);
  }

  pick(c: PickedClient): void {
    this.query.set('');
    this.options.set([]);
    this.open.set(false);
    this.clientChange.emit(c);
  }

  clear(): void {
    this.clientChange.emit(null);
  }

  closeSoon(): void {
    setTimeout(() => this.open.set(false), 150);
  }
}

/**
 * Payer dropdown fed by the agency payer list.
 * Usage: <app-payer-select [value]="payerId()" (valueChange)="payerId.set($event)" allLabel="All payers" />
 */
@Component({
  selector: 'app-payer-select',
  imports: [FormsModule],
  template: `
    @if (label()) { <label class="wp-label">{{ label() }}</label> }
    <select class="wp-input !py-2" [class.!w-auto]="auto()" [disabled]="disabled()" [ngModel]="value()" (ngModelChange)="valueChange.emit($event)">
      <option [ngValue]="null">{{ allLabel() }}</option>
      @for (p of payers(); track p.payerId) {
        <option [ngValue]="p.payerId">{{ p.payerName }}{{ p.status !== 'Active' ? ' (inactive)' : '' }}</option>
      }
    </select>
  `,
})
export class PayerSelect {
  private readonly options = inject(BillingPayerOptions);

  readonly value = input<number | null>(null);
  readonly label = input<string>('');
  readonly allLabel = input<string>('All payers');
  readonly auto = input(true);
  readonly disabled = input(false);
  readonly valueChange = output<number | null>();

  readonly payers = signal<Payer[]>([]);

  constructor() {
    this.options
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (p) => this.payers.set(p), error: () => this.payers.set([]) });
  }
}
