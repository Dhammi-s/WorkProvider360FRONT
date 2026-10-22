/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-07-31
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { ChatbotService, ChatTurn } from '../../../core/services/chatbot.service';

interface Point {
  x: number;
  y: number;
}

const LAUNCHER = 56; // h-14 / w-14
const EDGE = 12; // min gap to the viewport edge
const GAP = 12; // gap between launcher and panel
const POS_KEY = 'wp-chat-launcher-pos';

/** Floating in-app assistant that answers questions about WorkProvider360. */
@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.html',
})
export class ChatWidget {
  private readonly chatbot = inject(ChatbotService);

  private readonly greeting: ChatTurn = {
    role: 'assistant',
    content: 'Hi! I’m your WorkProvider360 assistant. Ask me how anything in the app works.',
  };

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly historyLoading = signal(false);
  readonly input = signal('');
  readonly error = signal('');
  readonly messages = signal<ChatTurn[]>([this.greeting]);

  readonly suggestions = [
    'How do I clock in and out?',
    'How do I create a meeting?',
    'How do I run an AI analysis?',
    'How do applications get approved?',
  ];

  private loaded = false;

  // ------------------------------------------------------------ scrolling

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  /** True when the user has scrolled up away from the newest message. */
  readonly showJump = signal(false);

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    this.showJump.set(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  }

  scrollToBottom(smooth = true): void {
    // Wait for the new message to render before measuring.
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      this.showJump.set(false);
    });
  }

  // ------------------------------------------------------------ draggable launcher

  private readonly viewport = signal<Point>({ x: window.innerWidth, y: window.innerHeight });

  /** Top-left of the launcher in px. Null = default bottom-right corner. */
  private readonly saved = signal<Point | null>(this.readSaved());

  readonly dragging = signal(false);
  private dragStart: (Point & { px: number; py: number }) | null = null;
  private suppressClick = false;

  readonly launcherPos = computed<Point>(() => {
    const vp = this.viewport();
    const p = this.saved() ?? { x: vp.x - LAUNCHER - 24, y: vp.y - LAUNCHER - 20 };
    return this.clamp(p, LAUNCHER, LAUNCHER);
  });

  /**
   * Panel placement around the launcher, never covering it: above, else below,
   * else beside it (right, then left). Only on very small screens, where none of
   * those fit, it is clamped inside the viewport.
   */
  readonly panelStyle = computed(() => {
    const vp = this.viewport();
    const l = this.launcherPos();
    const w = Math.min(384, vp.x - EDGE * 2);
    const h = Math.min(512, vp.y - EDGE * 2);
    const clampX = (x: number) => Math.max(EDGE, Math.min(x, vp.x - w - EDGE));
    const clampY = (y: number) => Math.max(EDGE, Math.min(y, vp.y - h - EDGE));
    // Right-align with the launcher, or left-align when it sits on the left half.
    const alignedX = clampX(l.x + LAUNCHER / 2 < vp.x / 2 ? l.x : l.x + LAUNCHER - w);
    const centredY = clampY(l.y + LAUNCHER / 2 - h / 2);

    let left: number;
    let top: number;
    if (l.y - GAP - h >= EDGE) {
      [left, top] = [alignedX, l.y - GAP - h];
    } else if (l.y + LAUNCHER + GAP + h <= vp.y - EDGE) {
      [left, top] = [alignedX, l.y + LAUNCHER + GAP];
    } else if (l.x + LAUNCHER + GAP + w <= vp.x - EDGE) {
      [left, top] = [l.x + LAUNCHER + GAP, centredY];
    } else if (l.x - GAP - w >= EDGE) {
      [left, top] = [l.x - GAP - w, centredY];
    } else {
      [left, top] = [alignedX, clampY(l.y - GAP - h)];
    }

    return { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` };
  });

  @HostListener('window:resize')
  onResize(): void {
    this.viewport.set({ x: window.innerWidth, y: window.innerHeight });
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.suppressClick = false;
    const p = this.launcherPos();
    this.dragStart = { x: p.x, y: p.y, px: event.clientX, py: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragStart) return;
    const dx = event.clientX - this.dragStart.px;
    const dy = event.clientY - this.dragStart.py;
    // Small movements still count as a click.
    if (!this.dragging() && Math.hypot(dx, dy) < 5) return;
    this.dragging.set(true);
    this.saved.set(this.clamp({ x: this.dragStart.x + dx, y: this.dragStart.y + dy }, LAUNCHER, LAUNCHER));
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.dragStart) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.dragStart = null;
    if (this.dragging()) {
      this.dragging.set(false);
      // The click that follows a drag must not toggle. Some browsers fire no click
      // after a drag, so drop the guard once this event turn ends.
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false));
      this.persist();
    }
  }

  onLauncherClick(): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.toggle();
  }

  /** Double-click the launcher to send it back to the default corner. */
  resetPosition(): void {
    this.saved.set(null);
    try {
      localStorage.removeItem(POS_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  private clamp(p: Point, w: number, h: number): Point {
    const vp = this.viewport();
    return {
      x: Math.max(EDGE, Math.min(p.x, vp.x - w - EDGE)),
      y: Math.max(EDGE, Math.min(p.y, vp.y - h - EDGE)),
    };
  }

  private readSaved(): Point | null {
    try {
      const raw = localStorage.getItem(POS_KEY);
      const p = raw ? (JSON.parse(raw) as Point) : null;
      return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      const p = this.saved();
      if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {
      /* storage unavailable */
    }
  }

  // ------------------------------------------------------------ chat

  toggle(): void {
    const opening = !this.open();
    this.open.set(opening);
    if (opening && !this.loaded) this.loadHistory();
    else if (opening) this.scrollToBottom(false);
  }

  private loadHistory(): void {
    this.loaded = true;
    this.historyLoading.set(true);
    this.chatbot.history().subscribe({
      next: (turns) => {
        this.historyLoading.set(false);
        this.messages.set(turns.length ? turns : [this.greeting]);
        this.scrollToBottom(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  clearHistory(): void {
    this.chatbot.clear().subscribe({
      next: () => this.messages.set([this.greeting]),
      error: () => {},
    });
  }

  ask(question: string): void {
    const q = question.trim();
    if (!q || this.sending()) return;

    const history: ChatTurn[] = this.messages().slice(-6);
    this.messages.update((m) => [...m, { role: 'user', content: q }]);
    this.input.set('');
    this.error.set('');
    this.sending.set(true);
    this.scrollToBottom();

    this.chatbot.ask(q, history).subscribe({
      next: (answer) => {
        this.sending.set(false);
        this.messages.update((m) => [...m, { role: 'assistant', content: answer }]);
        this.scrollToBottom();
      },
      error: (err: Error) => {
        this.sending.set(false);
        this.error.set(err.message || 'The assistant is unavailable right now.');
        this.scrollToBottom();
      },
    });
  }

  send(): void {
    this.ask(this.input());
  }

  /**
   * Light markdown for assistant replies: **bold**, `code` and "- " / "* " bullets.
   * Text is HTML-escaped first and Angular sanitises [innerHTML] as well.
   */
  format(text: string): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 text-[12px]">$1</code>')
      .replace(/^(\s*)[-*] (?=\S)/gm, '$1• ')
      .replace(/^#{1,6} (.+)$/gm, '<strong class="font-semibold text-slate-900">$1</strong>');
  }
}
