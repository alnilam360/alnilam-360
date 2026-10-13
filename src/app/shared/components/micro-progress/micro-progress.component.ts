import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-micro-progress',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1 w-full" [style.max-width]="maxWidth()">
      @if (showText()) {
        <div class="flex items-center justify-between text-xs font-medium">
          <span class="text-slate-400">
            @if (resultado() !== null && resultado() !== undefined) {
              {{ resultado() }}{{ unidad() ? ' ' + unidad() : '' }}
              @if (meta() !== null && meta() !== undefined) {
                <span class="text-slate-500"> / {{ meta() }}{{ unidad() ? ' ' + unidad() : '' }}</span>
              }
            } @else {
              <span class="text-slate-500 italic">Sin datos</span>
            }
          </span>
          <span class="font-bold {{ textClass() }}">
            {{ displayPercent() }}
          </span>
        </div>
      }

      <div class="mini-progress-track">
        <div
          class="mini-progress-fill {{ fillClass() }}"
          [style.width.%]="clampedPercent()"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    .mini-progress-track {
      width: 100%;
      height: 0.35rem;
      border-radius: 9999px;
      background-color: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      position: relative;
    }
    .mini-progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class MicroProgressComponent {
  readonly value = input<number | null | undefined>(null);
  readonly meta = input<number | null | undefined>(null);
  readonly resultado = input<number | null | undefined>(null);
  readonly unidad = input<string | null | undefined>('');
  readonly showText = input<boolean>(true);
  readonly criterio = input<'mayor_igual' | 'menor_igual'>('mayor_igual');
  readonly maxWidth = input<string>('100%');

  readonly clampedPercent = computed(() => {
    const v = this.value();
    if (v === null || v === undefined || isNaN(v)) return 0;
    return Math.max(0, Math.min(100, Math.round(v)));
  });

  readonly displayPercent = computed(() => {
    const v = this.value();
    if (v === null || v === undefined || isNaN(v)) return '—';
    return `${Math.round(v)}%`;
  });

  readonly isCumplido = computed(() => {
    const v = this.value();
    if (v === null || v === undefined) return false;
    return v >= 100;
  });

  readonly fillClass = computed(() => {
    const v = this.value();
    if (v === null || v === undefined) return 'bg-slate-600';
    if (v >= 100) return 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
    if (v >= 60) return 'bg-amber-500 shadow-sm shadow-amber-500/50';
    return 'bg-rose-500 shadow-sm shadow-rose-500/50';
  });

  readonly textClass = computed(() => {
    const v = this.value();
    if (v === null || v === undefined) return 'text-slate-400';
    if (v >= 100) return 'text-emerald-400';
    if (v >= 60) return 'text-amber-400';
    return 'text-rose-400';
  });
}
