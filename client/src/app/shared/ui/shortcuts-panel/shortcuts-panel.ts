/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, computed, effect, inject, signal } from '@angular/core';
import { ShortcutService } from '../../../core/services/shortcut.service';
import { Shortcut } from '../../../core/models/shortcut.model';
import { Alert } from '../alert/alert';

interface Row {
  keyCombo: string;
  actionKey: string;
}

/**
 * Lets the current user manage their own keyboard shortcuts: pick an action,
 * capture a key combo, and save. Reused in the staff and portal profile pages.
 */
@Component({
  selector: 'app-shortcuts-panel',
  standalone: true,
  imports: [Alert],
  template: `
    <div class="space-y-3">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900">Keyboard shortcuts</h3>
          <p class="mt-1 text-sm text-slate-500">
            Jump around fast. Click a key box, hold your modifiers (e.g. Ctrl + Alt) and press a key.
          </p>
        </div>
        <button type="button" (click)="addRow()" class="wp-link text-sm">+ Add shortcut</button>
      </div>

      <app-alert type="success" [message]="notice()" />
      <app-alert type="error" [message]="error()" />

      @if (rows().length === 0) {
        <p class="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">
          No shortcuts yet. Add one to jump straight to a page.
        </p>
      }

      @for (row of rows(); track $index) {
        <div class="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2 sm:flex-row sm:items-center">
          <select
            class="wp-input !py-2 sm:flex-1"
            [value]="row.actionKey"
            (change)="setAction($index, $event)"
          >
            <option value="" disabled>Choose where to go…</option>
            @for (a of actions(); track a.actionKey) {
              <option [value]="a.actionKey">{{ a.label }}</option>
            }
          </select>

          <input
            type="text"
            readonly
            class="wp-input !py-2 sm:w-48 cursor-pointer text-center font-mono"
            [class.ring-2]="capturing() === $index"
            [value]="row.keyCombo || ''"
            placeholder="Click, then press keys"
            (focus)="capturing.set($index)"
            (blur)="capturing.set(null)"
            (keydown)="captureKey($index, $event)"
          />

          <button
            type="button"
            (click)="removeRow($index)"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-red-600"
            aria-label="Remove"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 6.3a1 1 0 011.4 0L10 8.6l2.3-2.3a1 1 0 111.4 1.4L11.4 10l2.3 2.3a1 1 0 01-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 01-1.4-1.4L8.6 10 6.3 7.7a1 1 0 010-1.4z" /></svg>
          </button>
        </div>
      }

      @if (duplicate()) {
        <p class="text-xs font-medium text-amber-600">Two shortcuts use the same keys — only the first will run.</p>
      }

      <div class="flex justify-end">
        <button type="button" (click)="save()" [disabled]="saving()" class="wp-btn-primary">
          @if (saving()) { Saving… } @else { Save shortcuts }
        </button>
      </div>
    </div>
  `,
})
export class ShortcutsPanel {
  private readonly service = inject(ShortcutService);

  readonly actions = this.service.availableActions;
  readonly rows = signal<Row[]>([]);
  readonly capturing = signal<number | null>(null);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');

  readonly duplicate = computed(() => {
    const combos = this.rows().map((r) => r.keyCombo).filter((c) => !!c);
    return new Set(combos).size !== combos.length;
  });

  constructor() {
    this.service.load();
    // Seed the editor from the loaded shortcuts (once they arrive).
    effect(() => {
      const loaded = this.service.shortcuts();
      if (this.rows().length === 0 && loaded.length) {
        this.rows.set(loaded.map((s) => ({ keyCombo: s.keyCombo, actionKey: s.actionKey })));
      }
    });
  }

  addRow(): void {
    this.rows.update((rows) => [...rows, { keyCombo: '', actionKey: '' }]);
  }

  removeRow(index: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
  }

  setAction(index: number, ev: Event): void {
    const value = (ev.target as HTMLSelectElement).value;
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, actionKey: value } : r)));
  }

  captureKey(index: number, ev: KeyboardEvent): void {
    const combo = this.service.comboFromEvent(ev);
    if (!combo) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.rows.update((rows) => rows.map((r, i) => (i === index ? { ...r, keyCombo: combo } : r)));
  }

  save(): void {
    this.saving.set(true);
    this.notice.set('');
    this.error.set('');
    const payload: Shortcut[] = this.rows()
      .filter((r) => r.keyCombo && r.actionKey)
      .map((r) => ({ keyCombo: r.keyCombo, actionKey: r.actionKey }));
    this.service.save(payload).subscribe({
      next: (saved) => {
        this.rows.set(saved.map((s) => ({ keyCombo: s.keyCombo, actionKey: s.actionKey })));
        this.saving.set(false);
        this.notice.set('Shortcuts saved.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Could not save your shortcuts.');
      },
    });
  }
}
