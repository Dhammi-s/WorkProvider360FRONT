/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AvailabilitySlot } from '../../../core/models/user-profile.model';

interface DayRow {
  value: number;
  label: string;
}

/**
 * A weekly availability editor. Works as a reactive `formControlName` and as a
 * signal-backed `[(ngModel)]`. Value is an AvailabilitySlot[]; dayOfWeek follows
 * .NET (0 = Sunday ... 6 = Saturday), times are "HH:mm" strings.
 */
@Component({
  selector: 'app-availability-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AvailabilityEditor), multi: true },
  ],
  template: `
    <div class="space-y-2">
      @for (day of days; track day.value) {
        <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-700">{{ day.label }}</span>
            @if (!readonly()) {
              <button
                type="button"
                class="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-50"
                [disabled]="disabled()"
                (click)="add(day.value)"
              >
                + Add range
              </button>
            }
          </div>
          @if (rangesFor(day.value).length === 0) {
            <p class="text-xs text-slate-400">Unavailable</p>
          }
          @for (slot of rangesFor(day.value); track $index) {
            <div class="mb-1.5 flex items-center gap-2">
              <input
                type="time"
                class="wp-input !w-auto !py-1.5"
                [disabled]="disabled() || readonly()"
                [value]="slot.startTime"
                (change)="setTime(day.value, $index, 'start', $event)"
              />
              <span class="text-xs text-slate-400">to</span>
              <input
                type="time"
                class="wp-input !w-auto !py-1.5"
                [disabled]="disabled() || readonly()"
                [value]="slot.endTime"
                (change)="setTime(day.value, $index, 'end', $event)"
              />
              @if (!readonly()) {
                <button
                  type="button"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                  [disabled]="disabled()"
                  aria-label="Remove"
                  (click)="remove(day.value, $index)"
                >
                  &times;
                </button>
              }
              @if (invalid(slot)) {
                <span class="text-xs font-medium text-red-600">End must be after start</span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AvailabilityEditor implements ControlValueAccessor {
  readonly readonly = input(false);

  readonly days: DayRow[] = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
  ];

  readonly slots = signal<AvailabilitySlot[]>([]);
  readonly disabled = signal(false);

  private onChange: (value: AvailabilitySlot[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: AvailabilitySlot[] | null): void {
    this.slots.set(Array.isArray(value) ? [...value] : []);
  }

  registerOnChange(fn: (value: AvailabilitySlot[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  rangesFor(day: number): AvailabilitySlot[] {
    return this.slots().filter((s) => s.dayOfWeek === day);
  }

  invalid(slot: AvailabilitySlot): boolean {
    return !!slot.startTime && !!slot.endTime && slot.endTime <= slot.startTime;
  }

  add(day: number): void {
    const next = [...this.slots(), { dayOfWeek: day, startTime: '09:00', endTime: '17:00' }];
    this.commit(next);
  }

  remove(day: number, index: number): void {
    const ranges = this.rangesFor(day);
    const target = ranges[index];
    const next = this.slots().filter((s) => s !== target);
    this.commit(next);
  }

  setTime(day: number, index: number, which: 'start' | 'end', ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    const ranges = this.rangesFor(day);
    const target = ranges[index];
    const next = this.slots().map((s) => {
      if (s !== target) return s;
      return which === 'start' ? { ...s, startTime: value } : { ...s, endTime: value };
    });
    this.commit(next);
  }

  private commit(next: AvailabilitySlot[]): void {
    const sorted = [...next].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    this.slots.set(sorted);
    this.onChange(sorted);
    this.onTouched();
  }
}
