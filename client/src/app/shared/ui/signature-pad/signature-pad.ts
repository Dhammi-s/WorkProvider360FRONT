/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-09-03
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

type Point = { x: number; y: number };

/**
 * A canvas signature pad. Works with mouse, touch and pen via Pointer Events.
 * Emits a PNG data URL through `changed` after each completed stroke, or null
 * when cleared. HiDPI-aware: strokes are stored in CSS pixels and replayed on
 * resize so a device-pixel-ratio change never wipes the drawing.
 */
@Component({
  selector: 'app-signature-pad',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative rounded-xl border-2 border-dashed border-slate-300 bg-white"
      [class.opacity-60]="disabled()"
    >
      @if (empty()) {
        <span
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-300"
          >Sign here</span
        >
      }
      <canvas
        #canvas
        class="block w-full touch-none select-none rounded-xl"
        role="img"
        aria-label="Signature pad"
        [style.height.px]="height()"
        (pointerdown)="onDown($event)"
        (pointermove)="onMove($event)"
        (pointerup)="onUp()"
        (pointercancel)="onUp()"
        (pointerleave)="onUp()"
      ></canvas>
      <button
        type="button"
        class="absolute right-2 top-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-50"
        [disabled]="disabled() || empty()"
        (click)="clear()"
      >
        Clear
      </button>
    </div>
  `,
})
export class SignaturePad {
  readonly disabled = input(false);
  readonly height = input(180);
  readonly penColor = input('#0f172a');
  readonly lineWidth = input(2.2);
  readonly changed = output<string | null>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  readonly empty = signal(true);
  readonly emptyState = computed(() => this.empty());

  private ctx: CanvasRenderingContext2D | null = null;
  private strokes: Point[][] = [];
  private current: Point[] | null = null;
  private drawing = false;

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx = canvas.getContext('2d');
      this.resize();
      const observer = new ResizeObserver(() => this.resize());
      observer.observe(canvas);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  clear(): void {
    this.strokes = [];
    this.current = null;
    this.empty.set(true);
    this.redraw();
    this.changed.emit(null);
  }

  onDown(ev: PointerEvent): void {
    if (this.disabled()) return;
    const canvas = this.canvasRef().nativeElement;
    canvas.setPointerCapture(ev.pointerId);
    this.drawing = true;
    this.current = [this.pointFrom(ev)];
    this.strokes.push(this.current);
  }

  onMove(ev: PointerEvent): void {
    if (!this.drawing || this.disabled() || !this.current) return;
    this.current.push(this.pointFrom(ev));
    this.redraw();
  }

  onUp(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.current = null;
    if (this.strokes.some((s) => s.length > 0)) {
      this.empty.set(false);
      this.changed.emit(this.canvasRef().nativeElement.toDataURL('image/png'));
    }
  }

  private pointFrom(ev: PointerEvent): Point {
    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    if (!this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 300;
    const cssHeight = this.height();
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  private redraw(): void {
    const canvas = this.canvasRef().nativeElement;
    if (!this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    this.ctx.strokeStyle = this.penColor();
    this.ctx.lineWidth = this.lineWidth();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    for (const stroke of this.strokes) {
      if (stroke.length === 0) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        this.ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      this.ctx.stroke();
    }
  }
}
