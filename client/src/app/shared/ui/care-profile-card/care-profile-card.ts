/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CareAttribute } from '../../../core/models/compatibility.model';
import { CompatibilityService } from '../../../core/services/compatibility.service';
import { Alert } from '../alert/alert';

/**
 * "Care profile" card (team member profile and My profile): the caregiver's care attributes and
 * home location (latitude / longitude) used by compatibility checks and distance in suggestions.
 */
@Component({
  selector: 'app-care-profile-card',
  imports: [FormsModule, Alert],
  template: `
    <div class="rounded-xl border border-slate-200 p-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">Care profile</h3>
          <p class="text-xs text-slate-500">Attributes and home location used to match {{ own() ? 'you' : 'this caregiver' }} with clients.</p>
        </div>
        @if (canEdit() && !loading()) {
          <button type="button" (click)="save()" [disabled]="saving()" class="wp-btn-primary !py-1.5 !px-3 text-xs">{{ saving() ? 'Saving…' : 'Save' }}</button>
        }
      </div>
      <app-alert type="error" [message]="error()" />
      <app-alert type="success" [message]="notice()" />

      @if (loading()) {
        <p class="py-6 text-center text-sm text-slate-400">Loading…</p>
      } @else {
        @if (!attributes().length) {
          <p class="mt-3 text-sm text-slate-400">The agency has no care attributes yet (Settings → Care attributes).</p>
        }
        @for (g of grouped(); track g.category) {
          <p class="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{{ g.category }}</p>
          <div class="mt-1 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            @for (a of g.items; track a.attributeId) {
              <label class="flex items-center gap-2 text-sm text-slate-700" [class.opacity-60]="!a.isActive">
                <input type="checkbox" [checked]="selected().has(a.attributeId)" (change)="toggle(a.attributeId)" [disabled]="!canEdit()"
                  class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                {{ a.name }}
              </label>
            }
          </div>
        }

        <div class="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div>
            <label class="wp-label">Home latitude</label>
            <input type="number" step="0.000001" min="-90" max="90" class="wp-input" placeholder="e.g. 40.712800" [disabled]="!canEdit()"
              [ngModel]="lat()" (ngModelChange)="lat.set($event == null ? '' : String($event))" />
          </div>
          <div>
            <label class="wp-label">Home longitude</label>
            <input type="number" step="0.000001" min="-180" max="180" class="wp-input" placeholder="e.g. -74.006000" [disabled]="!canEdit()"
              [ngModel]="lng()" (ngModelChange)="lng.set($event == null ? '' : String($event))" />
          </div>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">
          Used only to rank caregivers by distance to the client. Enter both or leave both empty. Tip: right-click the address in Google Maps
          and copy the coordinates (latitude first).
          @if (own() && canEdit()) { <button type="button" (click)="useMyLocation()" class="wp-link ml-1">Use my current location</button> }
        </p>
      }
    </div>
  `,
})
export class CareProfileCard {
  private readonly service = inject(CompatibilityService);

  readonly userId = input.required<number>();
  readonly canEdit = input(false);
  /** The signed-in user's own profile (wording + "use my location"). */
  readonly own = input(false);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly attributes = signal<CareAttribute[]>([]);
  readonly selected = signal<Set<number>>(new Set());
  readonly lat = signal('');
  readonly lng = signal('');
  readonly String = String;

  readonly grouped = computed(() => {
    const map = new Map<string, CareAttribute[]>();
    for (const a of this.attributes()) {
      const key = a.category || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  });

  constructor() {
    effect(() => {
      const id = this.userId();
      untracked(() => this.load(id));
    });
  }

  private load(userId: number): void {
    this.loading.set(true);
    this.error.set('');
    this.service.attributes(true).subscribe({
      next: (all) => {
        this.service.careProfile(userId).subscribe({
          next: (p) => {
            const mine = new Set(p.attributeIds ?? []);
            this.attributes.set(all.filter((a) => a.isActive || mine.has(a.attributeId)));
            this.selected.set(mine);
            this.lat.set(p.latitude == null ? '' : String(p.latitude));
            this.lng.set(p.longitude == null ? '' : String(p.longitude));
            this.loading.set(false);
          },
          error: (err: Error) => {
            this.error.set(err.message || 'Could not load the care profile.');
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

  toggle(id: number): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.error.set('This browser cannot share its location.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.lat.set(pos.coords.latitude.toFixed(6));
        this.lng.set(pos.coords.longitude.toFixed(6));
      },
      () => this.error.set('Could not read your location.'),
    );
  }

  save(): void {
    this.error.set('');
    this.notice.set('');
    const latText = this.lat().trim();
    const lngText = this.lng().trim();
    if (!!latText !== !!lngText) {
      this.error.set('Enter both latitude and longitude, or leave both empty.');
      return;
    }
    const latitude = latText ? Number(latText) : null;
    const longitude = lngText ? Number(lngText) : null;
    if (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
      this.error.set('Latitude must be between -90 and 90.');
      return;
    }
    if (longitude != null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
      this.error.set('Longitude must be between -180 and 180.');
      return;
    }
    this.saving.set(true);
    this.service.saveCareProfile(this.userId(), { attributeIds: [...this.selected()], latitude, longitude }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set('Care profile saved.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save the care profile.');
      },
    });
  }
}
