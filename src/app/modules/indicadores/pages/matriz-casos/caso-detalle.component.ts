import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { MatrizAtCasoService } from '../../../../core/services/matriz-at-caso.service';
import { MatrizAtCaso, EstadoAccionCalc } from '../../../../core/models/matriz-at.model';

@Component({
  selector: 'app-caso-detalle',
  standalone: false,
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" (click)="cerrar.emit()">
      <div class="bg-dark-primary border border-dark-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" (click)="$event.stopPropagation()">

        <div class="p-4 border-b border-dark-border flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold text-white" [ngClass]="gravedadColor()">
                {{ etiquetaGravedad() }}
              </span>
              <span class="text-[10px] uppercase tracking-wider text-dark-text">{{ caso.tipo_evento === 'accidente_trabajo' ? 'Accidente' : 'Incidente' }}</span>
            </div>
            <h3 class="text-base font-bold text-[rgb(var(--color-heading))] mt-1">{{ caso.trabajador_nombre }}</h3>
            <p class="text-[11px] text-dark-text">{{ caso.fecha_hora_evento | date:'dd MMM y, HH:mm' }}<span *ngIf="caso.area_proceso"> · {{ caso.area_proceso }}</span></p>
          </div>
          <button (click)="cerrar.emit()" class="p-1.5 text-dark-text hover:text-[rgb(var(--color-heading))] rounded-lg hover:bg-dark-accent transition">
            <ion-icon name="close-outline" class="text-lg"></ion-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">

          <!-- Timeline estado -->
          <div class="flex items-center gap-1">
            <ng-container *ngFor="let e of pasos; let i = index; let last = last">
              <div class="flex flex-col items-center">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                     [ngClass]="alcanzado(e.k) ? 'bg-brand-primary text-white' : 'bg-dark-accent text-dark-text'">
                  <ion-icon [name]="e.icon"></ion-icon>
                </div>
                <span class="text-[9px] text-dark-text mt-1">{{ e.l }}</span>
              </div>
              <div *ngIf="!last" class="flex-1 h-0.5 mb-4" [ngClass]="alcanzado(pasos[i+1].k) ? 'bg-brand-primary' : 'bg-dark-accent'"></div>
            </ng-container>
          </div>

          <!-- Alertas de plazo -->
          <div class="flex flex-wrap gap-2">
            <span *ngIf="arlVencido()" class="px-2 py-1 rounded text-[10px] bg-red-500/15 text-red-300 border border-red-500/30">Reporte ARL vencido</span>
            <span *ngIf="investigacionFueraPlazo()" class="px-2 py-1 rounded text-[10px] bg-red-500/15 text-red-300 border border-red-500/30">Investigación fuera de plazo</span>
          </div>

          <!-- Sección Evento -->
          <div class="border border-dark-border rounded-xl overflow-hidden">
            <button (click)="toggle('evento')" class="w-full flex items-center justify-between px-4 py-3 bg-dark-secondary">
              <span class="text-sm font-semibold text-[rgb(var(--color-heading))]">Evento</span>
              <ion-icon [name]="abierto('evento') ? 'chevron-up-outline' : 'chevron-down-outline'" class="text-dark-text"></ion-icon>
            </button>
            <div *ngIf="abierto('evento')" class="p-4 space-y-2 text-sm">
              <p class="text-[rgb(var(--color-heading))]">{{ caso.descripcion_evento || 'Sin descripción.' }}</p>
              <div class="grid grid-cols-2 gap-2 text-xs text-dark-text">
                <span>Cargo: {{ caso.trabajador_cargo || '—' }}</span>
                <span>Vinculación: {{ caso.trabajador_vinculacion || '—' }}</span>
                <span>Actividad: {{ caso.actividad_al_momento || '—' }}</span>
                <span>Tipo de lesión: {{ caso.tipo_lesion?.nombre || '—' }}</span>
                <span>Días incapacidad: {{ caso.dias_incapacidad ?? '—' }}</span>
                <span>Días cargados: {{ caso.dias_cargados ?? '—' }}</span>
                <span>FURAT: {{ caso.furat_radicado || 'sin radicar' }}</span>
              </div>
              <img *ngIf="fotoUrl()" [src]="fotoUrl()" alt="Foto del sitio" class="mt-2 max-h-48 rounded-lg border border-dark-border">
            </div>
          </div>

          <!-- Sección Investigación -->
          <div class="border border-dark-border rounded-xl overflow-hidden">
            <button (click)="toggle('inv')" class="w-full flex items-center justify-between px-4 py-3 bg-dark-secondary">
              <span class="text-sm font-semibold text-[rgb(var(--color-heading))]">Investigación</span>
              <ion-icon [name]="abierto('inv') ? 'chevron-up-outline' : 'chevron-down-outline'" class="text-dark-text"></ion-icon>
            </button>
            <div *ngIf="abierto('inv')" class="p-4 text-sm">
              <div *ngIf="caso.investigacion; else sinInv" class="space-y-2">
                <p class="text-xs text-dark-text">Metodología: <span class="text-[rgb(var(--color-heading))]">{{ caso.investigacion!.metodologia || '—' }}</span></p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><p class="text-dark-text font-semibold mb-1">Actos inseguros</p><p class="text-[rgb(var(--color-heading))]">{{ (caso.investigacion!.causas_inmediatas.actos_inseguros || []).join(', ') || '—' }}</p></div>
                  <div><p class="text-dark-text font-semibold mb-1">Condiciones inseguras</p><p class="text-[rgb(var(--color-heading))]">{{ (caso.investigacion!.causas_inmediatas.condiciones_inseguras || []).join(', ') || '—' }}</p></div>
                  <div><p class="text-dark-text font-semibold mb-1">Factores personales</p><p class="text-[rgb(var(--color-heading))]">{{ (caso.investigacion!.causas_basicas.factores_personales || []).join(', ') || '—' }}</p></div>
                  <div><p class="text-dark-text font-semibold mb-1">Factores del trabajo</p><p class="text-[rgb(var(--color-heading))]">{{ (caso.investigacion!.causas_basicas.factores_trabajo || []).join(', ') || '—' }}</p></div>
                </div>
                <p class="text-xs text-dark-text">Conclusiones: <span class="text-[rgb(var(--color-heading))]">{{ caso.investigacion!.conclusiones || '—' }}</span></p>
                <span *ngIf="caso.investigacion!.fuera_de_plazo" class="inline-block px-2 py-0.5 rounded text-[10px] bg-red-500/15 text-red-300">Registrada fuera de plazo</span>
              </div>
              <ng-template #sinInv>
                <p class="text-xs text-dark-text">Sin investigación registrada.
                  <span *ngIf="limiteInvestigacion()"> Plazo hasta {{ limiteInvestigacion() | date:'dd MMM y' }}.</span>
                </p>
              </ng-template>
            </div>
          </div>

          <!-- Sección Acciones -->
          <div class="border border-dark-border rounded-xl overflow-hidden">
            <button (click)="toggle('acc')" class="w-full flex items-center justify-between px-4 py-3 bg-dark-secondary">
              <span class="text-sm font-semibold text-[rgb(var(--color-heading))]">Acciones correctivas ({{ caso.acciones?.length || 0 }})</span>
              <ion-icon [name]="abierto('acc') ? 'chevron-up-outline' : 'chevron-down-outline'" class="text-dark-text"></ion-icon>
            </button>
            <div *ngIf="abierto('acc')" class="p-4 space-y-2">
              <p *ngIf="!caso.acciones?.length" class="text-xs text-dark-text">Sin acciones registradas.</p>
              <div *ngFor="let a of caso.acciones" class="flex items-start gap-2 p-2 bg-dark-secondary rounded-lg">
                <span class="mt-1 w-2 h-2 rounded-full flex-shrink-0" [ngClass]="accionColor(a.estadoCalculado)"></span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-[rgb(var(--color-heading))]">{{ a.descripcion_accion }}</p>
                  <p class="text-[10px] text-dark-text">{{ a.responsable_texto || '—' }}
                    <span *ngIf="a.fecha_compromiso"> · compromiso {{ a.fecha_compromiso | date:'dd MMM y' }}</span>
                  </p>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-medium" [ngClass]="accionBadge(a.estadoCalculado)">{{ a.estadoCalculado }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CasoDetalleComponent implements OnInit {
  @Input() caso!: MatrizAtCaso;
  @Output() cerrar = new EventEmitter<void>();

  private secciones = new Set<string>(['evento']);
  readonly fotoUrl = signal<string | null>(null);

  readonly pasos = [
    { k: 'reportado', l: 'Reportado', icon: 'create-outline' },
    { k: 'en_investigacion', l: 'Investigación', icon: 'search-outline' },
    { k: 'cerrado', l: 'Cerrado', icon: 'checkmark-done-outline' },
  ];

  constructor(private svc: MatrizAtCasoService) {}

  async ngOnInit(): Promise<void> {
    if (this.caso.foto_sitio_url) {
      this.fotoUrl.set(await this.svc.urlFirmadaEvidencia(this.caso.foto_sitio_url));
    }
  }

  toggle(s: string): void { this.secciones.has(s) ? this.secciones.delete(s) : this.secciones.add(s); }
  abierto(s: string): boolean { return this.secciones.has(s); }

  alcanzado(estado: string): boolean {
    const orden = ['reportado', 'en_investigacion', 'cerrado'];
    return orden.indexOf(this.caso.estado_caso) >= orden.indexOf(estado);
  }

  arlVencido(): boolean { return this.svc.estadoReporteArl(this.caso).vencido; }
  investigacionFueraPlazo(): boolean { return this.svc.estadoInvestigacion(this.caso) === 'fuera_de_plazo'; }
  limiteInvestigacion(): string | null {
    return this.caso.tipo_evento === 'accidente_trabajo'
      ? this.svc.fechaLimiteInvestigacion(this.caso.fecha_hora_evento) : null;
  }

  etiquetaGravedad(): string {
    return this.caso.tipo_evento === 'incidente_casi_accidente' ? 'Incidente'
      : (this.caso.clasificacion_gravedad ?? '—');
  }
  gravedadColor(): string {
    if (this.caso.tipo_evento === 'incidente_casi_accidente') return 'bg-cyan-600';
    switch (this.caso.clasificacion_gravedad) {
      case 'mortal': return 'bg-red-500';
      case 'grave': return 'bg-orange-500';
      case 'leve': return 'bg-amber-400';
      default: return 'bg-dark-accent';
    }
  }
  accionColor(e?: EstadoAccionCalc): string {
    switch (e) { case 'cerrada': return 'bg-emerald-500'; case 'vencida': return 'bg-red-500'; case 'en_progreso': return 'bg-brand-primary'; default: return 'bg-amber-400'; }
  }
  accionBadge(e?: EstadoAccionCalc): string {
    switch (e) {
      case 'cerrada': return 'bg-emerald-500/15 text-emerald-300';
      case 'vencida': return 'bg-red-500/15 text-red-300';
      case 'en_progreso': return 'bg-brand-primary/15 text-brand-primary';
      default: return 'bg-amber-400/15 text-amber-300';
    }
  }
}
