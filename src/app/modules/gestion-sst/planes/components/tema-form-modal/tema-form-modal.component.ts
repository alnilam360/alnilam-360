import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { CapacitacionService, NuevoTema } from '../../services/capacitacion.service';
import { CapFuente, CapTema } from '../../../../../core/models/capacitacion.model';
import { CatalogItem } from '../../../../../core/models/plan-anual.model';

type TemaForm = FormGroup<{
  nombre: FormControl<string>;
  descripcion: FormControl<string>;
  grupo_objetivo_id: FormControl<string>;
  fuente: FormControl<CapFuente>;
  obligatorio: FormControl<boolean>;
  horas_min: FormControl<number | null>;
  activo: FormControl<boolean>;
}>;

@Component({
  selector: 'app-tema-form-modal',
  templateUrl: './tema-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class TemaFormModalComponent implements OnInit {
  @Input() tema: CapTema | null = null;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private svc = inject(CapacitacionService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(NonNullableFormBuilder);

  grupos: CatalogItem[] = [];
  guardando = false;
  errorMsg: string | null = null;
  readonly fuentes: CapFuente[] = ['manual', 'iperc', 'hallazgo'];
  form: TemaForm = this.fb.group({
    nombre: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    descripcion: this.fb.control(''),
    grupo_objetivo_id: this.fb.control(''),
    fuente: this.fb.control<CapFuente>('manual'),
    obligatorio: this.fb.control(false),
    horas_min: new FormControl<number | null>(null, [Validators.min(0)]),
    activo: this.fb.control(true),
  });

  async ngOnInit(): Promise<void> {
    if (this.tema) this.form.patchValue(this.aForm(this.tema));
    try { this.grupos = await this.svc.getGruposObjetivo(); }
    catch (e) { this.errorMsg = this.msg(e); }
    this.cdr.markForCheck();
  }

  private aForm(t: CapTema) {
    return {
      nombre: t.nombre, descripcion: t.descripcion ?? '', grupo_objetivo_id: t.grupo_objetivo_id ?? '',
      fuente: t.fuente, obligatorio: !!t.obligatorio, horas_min: t.horas_min ?? null, activo: t.activo !== false,
    };
  }

  private payload(): NuevoTema {
    const v = this.form.getRawValue();
    return {
      nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null,
      grupo_objetivo_id: v.grupo_objetivo_id || null, fuente: v.fuente,
      iperc_id: this.tema?.iperc_id ?? null,
      obligatorio: v.obligatorio, horas_min: v.horas_min, activo: v.activo,
    };
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando) { this.form.markAllAsTouched(); return; }
    this.guardando = true; this.errorMsg = null;
    try {
      if (this.tema?.id) await this.svc.actualizarTema(this.tema.id, this.payload());
      else await this.svc.crearTema(this.payload());
      this.guardado.emit();
    } catch (e) {
      this.errorMsg = this.msg(e);
    } finally {
      this.guardando = false;
    }
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error al guardar el tema.';
  }
}
