/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, DestroyRef, ElementRef, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { RecipientChip, RecipientOption } from '../../../core/models/message.model';
import { MessageService } from '../../../core/services/message.service';

/** A chip in the picker: the API chip plus display-only extras (stripped before sending). */
export interface PickerChip extends RecipientChip {
  subLabel?: string | null;
  memberCount?: number | null;
  avatarUrl?: string | null;
}

/** Display-only fields removed: exactly the contract's Chip shape. */
export function toApiChip(c: PickerChip): RecipientChip {
  const chip: RecipientChip = { type: c.type, label: c.label ?? null };
  if (c.type === 'User' || c.type === 'Client') chip.id = c.id ?? null;
  if (c.type === 'Group') {
    chip.groupType = c.groupType ?? null;
    chip.groupValue = c.groupValue ?? '';
  }
  if (c.type === 'External') chip.email = c.email ?? null;
  return chip;
}

/** Stable identity of a chip (no duplicates inside one field). */
export function chipKey(c: RecipientChip | RecipientOption): string {
  switch (c.type) {
    case 'Group': return `G:${c.groupType}:${c.groupValue ?? ''}`;
    case 'External': return `E:${(c.email ?? '').toLowerCase()}`;
    default: return `${c.type[0]}:${c.id}`;
  }
}

const EMAIL_RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/;

interface Section {
  title: string;
  options: { option: RecipientOption; index: number }[];
}

/**
 * Recipient chips with typeahead (ADR-0006 D2): groups, staff and clients from
 * `GET messages/recipients/search`, plus typed addresses as External chips (Enter / comma),
 * blocked with a hint when external addresses are not allowed. Keyboard: ↑ ↓ Enter Esc Backspace.
 */
@Component({
  selector: 'app-recipient-picker',
  templateUrl: './recipient-picker.html',
})
export class RecipientPicker {
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly chips = model<PickerChip[]>([]);
  readonly placeholder = input('Add people, groups or email addresses…');
  readonly allowExternal = input(true);
  readonly invalid = input(false);
  readonly inputId = input<string | null>(null);
  readonly ariaLabel = input('Recipients');
  /** Emitted when the input loses focus (for "touched" validation). */
  readonly touched = output<void>();

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  readonly query = signal('');
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly results = signal<RecipientOption[]>([]);
  readonly active = signal(0);
  readonly hint = signal('');

  private readonly search$ = new Subject<string>();

  /** Results minus the chips already chosen, flattened in section order (keyboard index). */
  private readonly available = computed(() => {
    const taken = new Set(this.chips().map(chipKey));
    const rs = this.results().filter((r) => !taken.has(chipKey(r)));
    const order = (r: RecipientOption) => (r.type === 'Group' ? 0 : r.type === 'User' ? 1 : 2);
    return [...rs].sort((a, b) => order(a) - order(b));
  });

  readonly sections = computed<Section[]>(() => {
    const list = this.available();
    const make = (title: string, type: RecipientOption['type']): Section => ({
      title,
      options: list.map((option, index) => ({ option, index })).filter((x) => x.option.type === type),
    });
    return [make('Groups', 'Group'), make('Staff', 'User'), make('Clients', 'Client')].filter((s) => s.options.length);
  });

  /** The typed text is an address that can become an External chip. */
  readonly typedEmail = computed(() => {
    const q = this.query().trim();
    return EMAIL_RE.test(q) ? q : null;
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => this.loading.set(true)),
        switchMap((q) => this.messages.searchRecipients(q, 'all').pipe(catchError(() => of([] as RecipientOption[])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rs) => {
        this.results.set(rs);
        this.active.set(0);
        this.loading.set(false);
      });
  }

  focusInput(): void {
    this.inputRef().nativeElement.focus();
  }

  onFocus(): void {
    this.open.set(true);
    this.search$.next(this.query().trim());
  }

  onBlur(): void {
    // Typed address left in the box becomes a chip, so nothing typed is lost.
    if (this.typedEmail()) this.addEmail(this.typedEmail()!);
    this.open.set(false);
    this.touched.emit();
  }

  onInput(value: string): void {
    // Pasted / typed separators: turn complete addresses into chips.
    if (/[,;\n]/.test(value)) {
      const parts = value.split(/[,;\n]+/);
      const rest = parts.pop() ?? '';
      for (const p of parts) this.addText(p);
      value = rest;
      this.inputRef().nativeElement.value = rest;
    }
    this.query.set(value);
    this.hint.set('');
    this.open.set(true);
    this.search$.next(value.trim());
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.available().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        if (count) this.active.set((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.set((this.active() - 1 + count) % count);
        break;
      case 'Enter': {
        event.preventDefault();
        const email = this.typedEmail();
        if (email) this.addEmail(email);
        else if (this.open() && count) this.select(this.available()[Math.min(this.active(), count - 1)]);
        else if (this.query().trim()) this.hint.set('Pick someone from the list or type a full email address.');
        break;
      }
      case ',':
      case ';':
      case 'Tab':
        if (this.typedEmail()) {
          if (event.key !== 'Tab') event.preventDefault();
          this.addEmail(this.typedEmail()!);
        } else if (event.key !== 'Tab' && this.query().trim()) {
          event.preventDefault();
          this.hint.set('That is not a complete email address.');
        }
        break;
      case 'Backspace':
        if (!this.query() && this.chips().length) {
          this.chips.update((c) => c.slice(0, -1));
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.stopPropagation();
          this.open.set(false);
        }
        break;
    }
  }

  select(option: RecipientOption): void {
    const chip: PickerChip = {
      type: option.type,
      id: option.id ?? null,
      groupType: option.groupType ?? null,
      groupValue: option.groupValue ?? null,
      email: option.email ?? null,
      label: option.label,
      subLabel: option.subLabel ?? null,
      memberCount: option.memberCount ?? null,
      avatarUrl: option.avatarUrl ?? null,
    };
    this.add(chip);
    this.clearQuery();
  }

  /** "Add name@example.com" row in the dropdown. */
  addTyped(): void {
    const email = this.typedEmail();
    if (email) this.addEmail(email);
  }

  remove(index: number): void {
    this.chips.update((c) => c.filter((_, i) => i !== index));
    this.focusInput();
  }

  private addText(text: string): void {
    const t = text.trim();
    if (!t) return;
    if (EMAIL_RE.test(t)) this.addEmail(t);
    else this.hint.set(`"${t}" is not a valid email address.`);
  }

  private addEmail(email: string): void {
    if (!this.allowExternal()) {
      // A typed address may still belong to a staff member / client: let the search find them.
      this.hint.set('Typed email addresses are turned off for your agency — pick people or groups from the list.');
      return;
    }
    this.add({ type: 'External', email, label: email });
    this.clearQuery();
  }

  private add(chip: PickerChip): void {
    const key = chipKey(chip);
    if (this.chips().some((c) => chipKey(c) === key)) {
      this.hint.set(`${chip.label ?? chip.email} is already added.`);
      return;
    }
    this.chips.update((c) => [...c, chip]);
    this.hint.set('');
  }

  private clearQuery(): void {
    this.query.set('');
    const el = this.inputRef().nativeElement;
    el.value = '';
    this.active.set(0);
    this.search$.next('');
  }

  initials(label: string | null | undefined): string {
    return (label ?? '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  }
}
