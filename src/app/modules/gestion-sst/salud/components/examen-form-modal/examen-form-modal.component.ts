import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { NuevoExamen, SaludService } from '../../services/salud.service';
import { SaludAptitud, SaludExamen, SaludExamenClinico, SaludExamenTipo } from '../../../../../core/models/salud.model';
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
  private cdr = inject(ChangeDetectorRef);

  readonly tipos = TIPOS_EXAMEN;
  readonly aptitudes = APTITUDES;
  readonly tipoLabel = TIPO_EXAMEN_LABEL;
  readonly aptitudLabel = APTITUD_LABEL;
  guardando = false;
  errorMsg: string | null = null;
  archivo: File | null = null;
  esMedico = false;
  clinico: SaludExamenClinico | null = null;

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

  async ngOnInit(): Promise<void> {
    const e = this.examen;
    if (e) {
      this.form.patchValue({
        tipo: e.tipo, fecha: e.fecha, fecha_proximo: e.fecha_proximo ?? '', aptitud: e.aptitud ?? '',
        requiere_seguimiento: e.requiere_seguimiento, ips_nombre: e.ips_nombre ?? '',
        medico_licencia: e.medico_licencia ?? '',
      });
    }
    this.esMedico = await this.svc.esMedico();
    if (this.esMedico && e) {
      try {
        this.clinico = await this.svc.getClinico(e.id);
        this.form.patchValue({ observaciones: this.clinico?.observaciones ?? '' });
      } catch (err) { this.errorMsg = this.msg(err); }
    }
    this.cdr.detectChanges();
  }

  async verConcepto(): Promise<void> {
    if (!this.clinico?.concepto_path) return;
    try { window.open(await this.svc.urlConcepto(this.clinico.concepto_path), '_blank', 'noopener'); }
    catch (err) { this.errorMsg = this.msg(err); this.cdr.detectChanges(); }
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error al guardar el examen.';
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
      medico_licencia: v.medico_licencia.trim() || null,
    };
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando) { this.form.markAllAsTouched(); return; }
    this.guardando = true; this.errorMsg = null;
    try {
      const ex = await this.svc.guardarExamen(this.trabajadorId, this.payload(), this.examen?.id ?? null);
      if (this.esMedico) {
        const obs = this.form.getRawValue().observaciones.trim() || null;
        await this.svc.guardarClinico(ex.id, ex.empresa_id, obs, this.archivo, this.clinico?.concepto_path ?? null);
      }
      this.guardado.emit();
    } catch (e) {
      this.errorMsg = this.msg(e);
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
    }
  }
}
