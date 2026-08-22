import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { PlanAnualService } from '../../../../../core/services/plan-anual.service';
import {
  CatalogItem,
  PlanTrabajoActividad,
  PlanTrabajoAnual,
} from '../../../../../core/models/plan-anual.model';

@Component({
  selector: 'app-actividad-form-modal',
  templateUrl: './actividad-form-modal.component.html',
  styleUrls: ['./actividad-form-modal.component.scss'],
  standalone: false,
})
export class ActividadFormModalComponent implements OnInit, OnChanges {

  @Input() plan: PlanTrabajoAnual | null = null;
  @Input() actividad: PlanTrabajoActividad | null = null;
  @Input() fases: CatalogItem[] = [];
  @Input() programas: CatalogItem[] = [];
  @Input() gruposObjetivo: CatalogItem[] = [];
  @Input() responsables: CatalogItem[] = [];
  @Input() sedes: { id: string; nombre: string; municipio: string }[] = [];

  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  form = {
    fases: [] as string[],
    programa_id: '' as string | undefined,
    actividad: '',
    ciudad: '',
    grupo_objetivo_id: '' as string | undefined,
    grupo_objetivo_custom: '' as string | undefined,
    responsable_id: '' as string | undefined,
    evidencia: '',
  };

  guardando = false;
  errorMsg: string | null = null;

  constructor(private svc: PlanAnualService) {}

  ngOnInit(): void { this.resetForm(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['actividad']) this.resetForm();
  }

  private resetForm(): void {
    if (this.actividad) {
      this.form = {
        fases: [...(this.actividad.fases ?? [])],
        programa_id: this.actividad.programa_id,
        actividad: this.actividad.actividad ?? '',
        ciudad: this.actividad.ciudad ?? '',
        grupo_objetivo_id: this.actividad.grupo_objetivo_id,
        grupo_objetivo_custom: this.actividad.grupo_objetivo_custom,
        responsable_id: this.actividad.responsable_id,
        evidencia: this.actividad.evidencia ?? '',
      };
    } else {
      this.form = {
        fases: [],
        programa_id: undefined,
        actividad: '',
        ciudad: '',
        grupo_objetivo_id: undefined,
        grupo_objetivo_custom: undefined,
        responsable_id: undefined,
        evidencia: '',
      };
    }
    this.errorMsg = null;
  }

  toggleFase(nombre: string): void {
    const idx = this.form.fases.indexOf(nombre);
    if (idx >= 0) this.form.fases.splice(idx, 1);
    else this.form.fases.push(nombre);
  }

  fasSeleccionada(nombre: string): boolean {
    return this.form.fases.includes(nombre);
  }

  onGrupoChange(id: string | undefined): void {
    this.form.grupo_objetivo_id = id;
    // Si el ítem seleccionado es __empresa__, guardarlo como custom
    if (id === '__empresa__') {
      const item = this.gruposObjetivo.find(g => g.id === '__empresa__');
      this.form.grupo_objetivo_custom = item?.nombre;
      this.form.grupo_objetivo_id = undefined;
    } else {
      this.form.grupo_objetivo_custom = undefined;
    }
  }

  get grupoSeleccionadoId(): string {
    if (this.form.grupo_objetivo_custom) return '__empresa__';
    return this.form.grupo_objetivo_id ?? '';
  }

  get ciudadesDisponibles(): string[] {
    return this.sedes.map(s => s.municipio).filter(Boolean);
  }

  validar(): string | null {
    if (!this.form.actividad.trim()) return 'La actividad es obligatoria.';
    if (!this.form.programa_id) return 'El programa es obligatorio.';
    if (this.form.fases.length === 0) return 'Selecciona al menos una fase PHVA.';
    if (!this.form.responsable_id) return 'El responsable es obligatorio.';
    if (!this.form.grupo_objetivo_id && !this.form.grupo_objetivo_custom) return 'El grupo objetivo es obligatorio.';
    return null;
  }

  async guardar(): Promise<void> {
    this.errorMsg = this.validar();
    if (this.errorMsg) return;
    if (!this.plan?.id) return;

    this.guardando = true;
    try {
      const payload = {
        plan_id: this.plan.id,
        fases: this.form.fases,
        programa_id: this.form.programa_id || undefined,
        actividad: this.form.actividad.trim(),
        ciudad: this.form.ciudad || undefined,
        grupo_objetivo_id: this.form.grupo_objetivo_id || undefined,
        grupo_objetivo_custom: this.form.grupo_objetivo_custom || undefined,
        responsable_id: this.form.responsable_id || undefined,
        evidencia: this.form.evidencia || undefined,
      };

      if (this.actividad?.id) {
        await this.svc.actualizarActividad(this.actividad.id, payload);
      } else {
        await this.svc.crearActividad(payload);
      }
      this.guardado.emit();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'No se pudo guardar la actividad.';
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void { this.cancelado.emit(); }
}
