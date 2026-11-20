/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AttributeRequirement,
  CareAttribute,
  CaregiverGender,
  CaregiverPreference,
} from '../../../../core/models/compatibility.model';
import { UserDto } from '../../../../core/models/user.model';
import { CompatibilityService } from '../../../../core/services/compatibility.service';
import { SchedulerService } from '../../../../core/services/scheduler.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Alert } from '../../../../shared/ui/alert/alert';

interface CaregiverRow {
  userId: number;
  fullName: string;
  preference: CaregiverPreference;
  note: string;
}

const REQUIREMENTS: { value: AttributeRequirement; label: string; hint: string; on: string }[] = [
  { value: 'Required', label: 'Required', hint: 'Only caregivers with these', on: 'bg-brand-600 text-white' },
  { value: 'Preferred', label: 'Preferred', hint: 'Ranked higher in suggestions', on: 'bg-emerald-600 text-white' },
  { value: 'Avoid', label: 'Avoid', hint: 'Caregivers with these are flagged', on: 'bg-red-600 text-white' },
];

/** Client profile → Compatibility: attribute rules, preferred caregiver gender, preferred / blocked caregivers. */
@Component({
  selector: 'app-client-compatibility',
  imports: [FormsModule, Alert],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Compatibility</h2>
          <p class="text-sm text-slate-500">Who fits this client. Used by caregiver suggestions, open shift offers and the scheduler's conflict check.</p>
        </div>
        @if (canManage()) {
          <button type="button" (click)="save()" [disabled]="saving() || loading()" class="wp-btn-primary">{{ saving() ? 'Saving…' : 'Save compatibility' }}</button>
        }
      </div>
      <app-alert type="error" [message]="error()" />

      @if (loading()) {
        <div class="wp-card py-10 text-center text-sm text-slate-400">Loading…</div>
      } @else {
        <!-- Attributes -->
        <div class="wp-card">
          <h3 class="text-base font-bold text-slate-900">Care attributes</h3>
          <p class="mt-0.5 text-xs text-slate-500">Click an attribute to cycle it: none → Required → Preferred → Avoid. Manage the list in Settings → Care attributes.</p>
          <div class="mt-3 flex flex-wrap gap-3 text-xs">
            @for (r of requirements; track r.value) {
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" [class]="r.on"></span><strong class="text-slate-700">{{ r.label }}</strong><span class="text-slate-400">{{ r.hint }}</span></span>
            }
          </div>
          @if (!attributes().length) {
            <p class="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No care attributes yet. Add them in Settings → Care attributes.</p>
          } @else {
            @for (g of grouped(); track g.category) {
              <p class="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">{{ g.category }}</p>
              <div class="mt-1.5 flex flex-wrap gap-2">
                @for (a of g.items; track a.attributeId) {
                  <button type="button" (click)="cycle(a.attributeId)" [disabled]="!canManage()"
                    class="rounded-full px-3 py-1.5 text-sm font-semibold transition disabled:cursor-default"
                    [class]="chipClass(a.attributeId)" [class.opacity-60]="!a.isActive">
                    {{ a.name }}
                    @if (rules().get(a.attributeId); as req) { <span class="ml-1 text-[10px] uppercase opacity-80">{{ req }}</span> }
                  </button>
                }
              </div>
            }
          }
        </div>

        <!-- Gender -->
        <div class="wp-card">
          <h3 class="text-base font-bold text-slate-900">Preferred caregiver gender</h3>
          <div class="mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-sm font-semibold">
            @for (g of ['Any', 'Female', 'Male']; track g) {
              <button type="button" (click)="gender.set($any(g))" [disabled]="!canManage()" class="rounded-lg px-4 py-1.5 transition"
                [class]="gender() === g ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-800'">{{ g }}</button>
            }
          </div>
        </div>

        <!-- Caregivers -->
        <div class="wp-card">
          <h3 class="text-base font-bold text-slate-900">Preferred &amp; blocked caregivers</h3>
          <p class="mt-0.5 text-xs text-slate-500">Preferred caregivers rank higher; blocked caregivers are never suggested or offered this client's shifts.</p>
          @if (canManage()) {
            <div class="mt-3 flex flex-wrap items-end gap-2">
              <div class="min-w-[200px] flex-1">
                <label class="wp-label">Caregiver</label>
                <select class="wp-input" [ngModel]="pickUser()" (ngModelChange)="pickUser.set($event)">
                  <option [ngValue]="null">Select…</option>
                  @for (u of availableUsers(); track u.userId) { <option [ngValue]="u.userId">{{ u.fullName }}</option> }
                </select>
              </div>
              <div>
                <label class="wp-label">As</label>
                <select class="wp-input !w-auto" [ngModel]="pickPref()" (ngModelChange)="pickPref.set($event)">
                  <option value="Preferred">Preferred</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
              <button type="button" (click)="addCaregiver()" [disabled]="pickUser() == null" class="wp-btn-ghost">Add</button>
            </div>
          }
          <ul class="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            @for (c of caregivers(); track c.userId) {
              <li class="flex flex-wrap items-center gap-3 px-3 py-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [class]="c.preference === 'Blocked' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'">{{ c.preference }}</span>
                <span class="min-w-[140px] font-semibold text-slate-800">{{ c.fullName }}</span>
                <input class="wp-input !py-1.5 min-w-[160px] flex-1" maxlength="500" placeholder="Note (optional)" [disabled]="!canManage()"
                  [ngModel]="c.note" (ngModelChange)="setNote(c.userId, $event)" />
                @if (canManage()) {
                  <button type="button" (click)="removeCaregiver(c.userId)" class="text-sm font-semibold text-red-600 hover:text-red-700">Remove</button>
                }
              </li>
            } @empty {
              <li class="px-3 py-4 text-center text-sm text-slate-400">No preferred or blocked caregivers.</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class ClientCompatibilityTab {
  private readonly service = inject(CompatibilityService);
  private readonly scheduler = inject(SchedulerService);
  private readonly toast = inject(ToastService);

  readonly clientId = input.required<number>();
  readonly canManage = input(false);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly attributes = signal<CareAttribute[]>([]);
  readonly rules = signal<Map<number, AttributeRequirement>>(new Map());
  readonly gender = signal<'Any' | CaregiverGender>('Any');
  readonly caregivers = signal<CaregiverRow[]>([]);
  readonly users = signal<UserDto[]>([]);
  readonly pickUser = signal<number | null>(null);
  readonly pickPref = signal<CaregiverPreference>('Preferred');

  readonly requirements = REQUIREMENTS;

  readonly grouped = computed(() => {
    const map = new Map<string, CareAttribute[]>();
    for (const a of this.attributes()) {
      const key = a.category || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  });

  readonly availableUsers = computed(() => {
    const taken = new Set(this.caregivers().map((c) => c.userId));
    return this.users().filter((u) => !taken.has(u.userId));
  });

  constructor() {
    this.scheduler.assignableUsers().subscribe({ next: (u) => this.users.set(u), error: () => {} });
    effect(() => {
      const id = this.clientId();
      untracked(() => this.load(id));
    });
  }

  private load(clientId: number): void {
    this.loading.set(true);
    this.error.set('');
    this.service.attributes(true).subscribe({
      next: (all) => {
        this.service.clientCompatibility(clientId).subscribe({
          next: (c) => {
            const used = new Set(c.attributes.map((a) => a.attributeId));
            // Inactive attributes stay visible only when the client already uses them.
            this.attributes.set(all.filter((a) => a.isActive || used.has(a.attributeId)));
            this.rules.set(new Map(c.attributes.map((a) => [a.attributeId, a.requirement])));
            this.gender.set(c.preferredCaregiverGender === 'Female' || c.preferredCaregiverGender === 'Male' ? c.preferredCaregiverGender : 'Any');
            this.caregivers.set(
              c.caregivers.map((x) => ({ userId: x.userId, fullName: x.fullName ?? `#${x.userId}`, preference: x.preference, note: x.note ?? '' })),
            );
            this.loading.set(false);
          },
          error: (err: Error) => {
            this.error.set(err.message || 'Could not load the compatibility rules.');
            this.loading.set(false);
          },
        });
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Could not load the care attributes.');
        this.loading.set(false);
      },
    });
  }

  cycle(attributeId: number): void {
    const order: (AttributeRequirement | undefined)[] = [undefined, 'Required', 'Preferred', 'Avoid'];
    this.rules.update((m) => {
      const next = new Map(m);
      const cur = next.get(attributeId);
      const to = order[(order.indexOf(cur) + 1) % order.length];
      if (to) next.set(attributeId, to);
      else next.delete(attributeId);
      return next;
    });
  }

  chipClass(attributeId: number): string {
    const req = this.rules().get(attributeId);
    return REQUIREMENTS.find((r) => r.value === req)?.on ?? 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50';
  }

  addCaregiver(): void {
    const id = this.pickUser();
    if (id == null) return;
    const u = this.users().find((x) => x.userId === id);
    this.caregivers.update((list) => [...list, { userId: id, fullName: u?.fullName ?? `#${id}`, preference: this.pickPref(), note: '' }]);
    this.pickUser.set(null);
  }

  removeCaregiver(userId: number): void {
    this.caregivers.update((list) => list.filter((c) => c.userId !== userId));
  }

  setNote(userId: number, note: string): void {
    this.caregivers.update((list) => list.map((c) => (c.userId === userId ? { ...c, note } : c)));
  }

  save(): void {
    this.saving.set(true);
    this.error.set('');
    const g = this.gender();
    this.service
      .saveClientCompatibility(this.clientId(), {
        preferredCaregiverGender: g === 'Any' ? null : g,
        attributes: [...this.rules().entries()].map(([attributeId, requirement]) => ({ attributeId, requirement })),
        caregivers: this.caregivers().map((c) => ({ userId: c.userId, preference: c.preference, note: c.note.trim() || null })),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Compatibility saved.');
          this.load(this.clientId());
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message || 'Could not save the compatibility rules.');
        },
      });
  }
}
