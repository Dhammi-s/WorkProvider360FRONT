/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewEncapsulation,
  forwardRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type QuillType from 'quill';

/** Quill's snow theme CSS is a separate, non-injected global bundle (angular.json → `quill-snow`)
 *  so it only loads with the editor and stays out of the main bundle. */
const SNOW_CSS_HREF = 'quill-snow.css';
const IMAGE_TYPES = ['image/png', 'image/jpeg'];

let quillPromise: Promise<typeof QuillType> | null = null;

/** Loads Quill once (lazy chunk) and registers the inline-style align attributor so alignment
 *  survives in email clients (style="text-align:…" instead of ql-align-* classes). */
function loadQuill(): Promise<typeof QuillType> {
  if (!quillPromise) {
    if (typeof document !== 'undefined' && !document.querySelector(`link[data-wp-quill]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = SNOW_CSS_HREF;
      link.setAttribute('data-wp-quill', '');
      document.head.appendChild(link);
    }
    quillPromise = import('quill').then((m) => {
      const Quill = m.default;
      Quill.register(Quill.import('attributors/style/align') as never, true);
      return Quill;
    });
  }
  return quillPromise;
}

/**
 * Rich-text editor (ADR-0006 D6): a thin standalone wrapper around Quill 2 with the composer
 * toolbar (heading, B I U S, align, lists, link, image, table, HTML source, fullscreen),
 * {{FirstName}} / {{FullName}} placeholders and a character count. ControlValueAccessor → HTML.
 * Images are embedded as data URIs (PNG / JPEG); the server turns them into inline attachments.
 */
@Component({
  selector: 'app-rich-text-editor',
  encapsulation: ViewEncapsulation.None,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RichTextEditor), multi: true }],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.css',
})
export class RichTextEditor implements AfterViewInit, OnDestroy, ControlValueAccessor {
  readonly placeholder = input('Write your message…');
  /** Shows the {{FirstName}} / {{FullName}} buttons. */
  readonly personalization = input(true);
  /** Largest inline image (bytes). */
  readonly maxImageBytes = input(5 * 1024 * 1024);
  /** Shows a red border (invalid + touched). */
  readonly invalid = input(false);
  /** User-facing problems (e.g. an image that is too large or of the wrong type). */
  readonly notice = output<string>();

  private readonly toolbarRef = viewChild.required<ElementRef<HTMLElement>>('toolbar');
  private readonly editorRef = viewChild.required<ElementRef<HTMLElement>>('editor');
  private readonly fileRef = viewChild.required<ElementRef<HTMLInputElement>>('imageInput');

  readonly ready = signal(false);
  readonly loadError = signal('');
  readonly htmlMode = signal(false);
  readonly htmlSource = signal('');
  readonly fullscreen = signal(false);
  readonly charCount = signal(0);
  readonly inTable = signal(false);
  readonly disabled = signal(false);

  private quill: QuillType | null = null;
  private pendingValue: string | null = null;
  private destroyed = false;
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  async ngAfterViewInit(): Promise<void> {
    let Quill: typeof QuillType;
    try {
      Quill = await loadQuill();
    } catch {
      this.loadError.set('The editor could not be loaded. Check your connection and reload the page.');
      return;
    }
    if (this.destroyed) return;

    const quill = new Quill(this.editorRef().nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: {
        table: true,
        toolbar: {
          container: this.toolbarRef().nativeElement,
          handlers: {
            image: () => this.pickImage(),
            table: () => this.insertTable(),
          },
        },
        uploader: {
          mimetypes: IMAGE_TYPES,
          handler: (range: { index: number }, files: File[]) => this.insertImages(range.index, files),
        },
      },
    });
    this.quill = quill;

    quill.on('text-change', () => {
      this.updateCount();
      this.onChange(this.currentHtml());
    });
    quill.on('selection-change', (range) => {
      if (!range) this.onTouched();
    });
    quill.on('editor-change', () => this.updateTableState());

    if (this.pendingValue != null) this.setHtml(this.pendingValue);
    this.pendingValue = null;
    quill.enable(!this.disabled());
    this.updateCount();
    this.ready.set(true);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.quill = null;
    if (this.fullscreen()) document.body.classList.remove('overflow-hidden');
  }

  // ------------------------------------------------------------------ ControlValueAccessor

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (this.htmlMode()) this.htmlSource.set(html);
    if (!this.quill) {
      this.pendingValue = html;
      return;
    }
    this.setHtml(html);
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    this.quill?.enable(!isDisabled);
  }

  // ------------------------------------------------------------------ Toolbar actions

  /** Inserts {{FirstName}} / {{FullName}} at the cursor. */
  insertPlaceholder(token: 'FirstName' | 'FullName'): void {
    if (this.htmlMode()) {
      this.onHtmlInput(this.htmlSource() + `{{${token}}}`);
      return;
    }
    const q = this.quill;
    if (!q) return;
    const range = q.getSelection(true);
    const text = `{{${token}}}`;
    q.insertText(range.index, text, 'user');
    q.setSelection(range.index + text.length, 0, 'user');
  }

  insertTable(): void {
    const q = this.quill;
    if (!q) return;
    q.focus();
    this.tableModule()?.insertTable(3, 3);
  }

  tableAction(action: 'rowBelow' | 'columnRight' | 'deleteRow' | 'deleteColumn' | 'deleteTable'): void {
    const t = this.tableModule();
    if (!t) return;
    switch (action) {
      case 'rowBelow': t.insertRowBelow(); break;
      case 'columnRight': t.insertColumnRight(); break;
      case 'deleteRow': t.deleteRow(); break;
      case 'deleteColumn': t.deleteColumn(); break;
      case 'deleteTable': t.deleteTable(); break;
    }
    this.updateTableState();
  }

  /** HTML source view: edit the raw HTML; switching back re-parses it through Quill. */
  toggleHtml(): void {
    if (!this.quill) return;
    if (!this.htmlMode()) {
      this.htmlSource.set(formatHtml(this.currentHtml()));
      this.htmlMode.set(true);
    } else {
      this.setHtml(this.htmlSource());
      this.htmlMode.set(false);
      this.onChange(this.currentHtml());
      this.quill.focus();
    }
  }

  onHtmlInput(value: string): void {
    this.htmlSource.set(value);
    this.charCount.set(textLength(value));
    this.onChange(value.trim() ? value : '');
  }

  toggleFullscreen(): void {
    const next = !this.fullscreen();
    this.fullscreen.set(next);
    document.body.classList.toggle('overflow-hidden', next);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.fullscreen()) this.toggleFullscreen();
  }

  pickImage(): void {
    const input = this.fileRef().nativeElement;
    input.value = '';
    input.click();
  }

  onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || !this.quill) return;
    const range = this.quill.getSelection(true);
    this.insertImages(range.index, files);
  }

  // ------------------------------------------------------------------ Internals

  private insertImages(index: number, files: File[]): void {
    const q = this.quill;
    if (!q) return;
    const ok: File[] = [];
    for (const f of files) {
      if (!IMAGE_TYPES.includes(f.type)) {
        this.notice.emit(`"${f.name}" was not inserted: only PNG and JPEG images can be placed in the message.`);
      } else if (f.size > this.maxImageBytes()) {
        this.notice.emit(`"${f.name}" was not inserted: images in the message can be at most ${Math.round(this.maxImageBytes() / (1024 * 1024))} MB.`);
      } else {
        ok.push(f);
      }
    }
    let at = index;
    for (const f of ok) {
      const reader = new FileReader();
      const pos = at++;
      reader.onload = () => {
        if (!this.quill) return;
        this.quill.insertEmbed(pos, 'image', reader.result as string, 'user');
        this.quill.setSelection(pos + 1, 0, 'silent');
      };
      reader.readAsDataURL(f);
    }
  }

  private tableModule(): TableModule | null {
    return (this.quill?.getModule('table') as TableModule | undefined) ?? null;
  }

  private updateTableState(): void {
    const q = this.quill;
    const t = this.tableModule();
    if (!q || !t) return;
    const range = q.getSelection();
    const inTable = !!range && t.getTable(range)[0] != null;
    if (inTable !== this.inTable()) this.inTable.set(inTable);
  }

  private setHtml(html: string): void {
    const q = this.quill;
    if (!q) return;
    const delta = q.clipboard.convert({ html: html ?? '' });
    q.setContents(delta, 'silent');
    this.updateCount();
  }

  private updateCount(): void {
    const q = this.quill;
    if (!q) return;
    this.charCount.set(Math.max(0, q.getLength() - 1));
  }

  /** Semantic HTML of the editor ('' when empty), cleaned up for email clients. */
  private currentHtml(): string {
    const q = this.quill;
    if (!q) return this.pendingValue ?? '';
    const html = q.getSemanticHTML();
    const hasEmbed = /<(img|table)\b/i.test(html);
    if (!hasEmbed && q.getText().trim() === '') return '';
    return emailFriendly(html);
  }
}

/** The subset of Quill's table module API used here. */
interface TableModule {
  insertTable(rows: number, columns: number): void;
  insertRowBelow(): void;
  insertColumnRight(): void;
  deleteRow(): void;
  deleteColumn(): void;
  deleteTable(): void;
  getTable(range?: unknown): [unknown, unknown, unknown, number];
}

/**
 * Quill 2.0.x `getSemanticHTML()` writes every space as `&nbsp;` (no wrapping in email clients):
 * turn single ones back into spaces and keep only the extra ones of a run. Tables get borders.
 */
export function emailFriendly(html: string): string {
  return html
    .replace(/(?:&nbsp;)+/g, (run) => {
      const n = run.length / 6;
      return n === 1 ? ' ' : ' ' + '&nbsp;'.repeat(n - 1);
    })
    .replace(/<table(?![^>]*\bcellpadding)/g, '<table border="1" cellpadding="6" cellspacing="0"');
}

/** Line breaks between block tags so the HTML source view is readable. */
function formatHtml(html: string): string {
  return html.replace(/(<\/(p|h[1-6]|ol|ul|li|table|tr|pre|blockquote)>)(?!\n)/g, '$1\n').trim();
}

/** Visible text length of an HTML string (DOMParser: inert, runs no scripts, loads no images). */
function textLength(html: string): number {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').length;
}
