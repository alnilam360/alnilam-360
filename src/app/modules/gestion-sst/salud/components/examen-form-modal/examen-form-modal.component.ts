import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { NuevoExamen, SaludService } from '../../services/salud.service';
import { SaludAptitud, SaludExamen, SaludExamenTipo } from '../../../../../core/models/salud.model';
import { APTITUDES, APTITUD_LABEL, TIPOS_EXAMEN, TIPO_EXAMEN_LABEL } from '../../funciones/etiquetas.funcion';

type ExamenForm = FormGroup<{
  tipo: FormControl<SaludExamenTipo>;
  fecha: FormControl<string>;
  fecha_proximo: FormControl<string>;
  aptitud: FormControl<SaludAptitud | ''>;
  requiere_seguimiento: FormControl<boolean>;
  ips_nombre: FormControl<string>;
  medico_licencia: FormControl<string>;
  observaciones: FormControl<string>;
}>;

@Component({
  selector: 'app-examen-form-modal',
  templateUrl: './examen-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class ExamenFormModalComponent implements OnInit {
  @Input({ required: true }) trabajadorId = '';
  @Input() examen: SaludExamen | null = null;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private svc = inject(SaludService);
  private fb = inject(NonNullableFormBuilder);

  readonly tipos = TIPOS_EXAMEN;
  readonly aptitudes = APTITUDES;
  readonly tipoLabel = TIPO_EXAMEN_LABEL;
  readonly aptitudLabel = APTITUD_LABEL;
  guardando = false;
  errorMsg: string | null = null;
  archivo: File | null = null;

  form: ExamenForm = this.fb.group({
    tipo: this.fb.control<SaludExamenTipo>('periodica_programada'),
    fecha: this.fb.control('', Validators.required),
    fecha_proximo: this.fb.control(''),
    aptitud: this.fb.control<SaludAptitud | ''>(''),
    requiere_seguimiento: this.fb.control(false),
    ips_nombre: this.fb.control(''),
    medico_licencia: this.fb.control(''),
    observaciones: this.fb.control(''),
  });

  ngOnInit(): void {
    const e = this.examen;
    if (!e) return;
    this.form.patchValue({
      tipo: e.tipo, fecha: e.fecha, fecha_proximo: e.fecha_proximo ?? '', aptitud: e.aptitud ?? '',
      requiere_seguimiento: e.requiere_seguimiento, ips_nombre: e.ips_nombre ?? '',
      medico_licencia: e.medico_licencia ?? '', observaciones: e.observaciones ?? '',
    });
  }

  onArchivo(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.errorMsg = f ? this.svc.validarConcepto(f) : null;
    this.archivo = this.errorMsg ? null : f;
  }

  private payload(): NuevoExamen {
    const v = this.form.getRawValue();
    return {
      tipo: v.tipo, fecha: v.fecha, fecha_proximo: v.fecha_proximo || null, aptitud: v.aptitud || null,
      requiere_seguimiento: v.requiere_seguimiento, ips_nombre: v.ips_nombre.trim() || null,
      medico_licencia: v.medico_licencia.trim() || null, observaciones: v.observaciones.trim() || null,
      concepto_path: this.examen?.concepto_path ?? null,
    };
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando) { this.form.markAllAsTouched(); return; }
    this.guardando = true; this.errorMsg = null;
    try {
      await this.svc.guardarExamen(this.trabajadorId, this.payload(), this.archivo, this.examen?.id ?? null);
      this.guardado.emit();
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error al guardar el examen.';
    } finally {
      this.guardando = false;
    }
  }
}
