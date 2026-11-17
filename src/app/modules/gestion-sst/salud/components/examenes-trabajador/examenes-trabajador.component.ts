import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { SaludService } from '../../services/salud.service';
import { SaludExamen } from '../../../../../core/models/salud.model';
import { APTITUD_LABEL, TIPO_EXAMEN_LABEL } from '../../funciones/etiquetas.funcion';

@Component({
  selector: 'app-examenes-trabajador',
  templateUrl: './examenes-trabajador.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class ExamenesTrabajadorComponent implements OnChanges {
  @Input({ required: true }) trabajadorId = '';
  @Input() nombre = '';
  @Output() cambio = new EventEmitter<void>();
  @Output() cerrado = new EventEmitter<void>();

  private svc = inject(SaludService);
  private cdr = inject(ChangeDetectorRef);

  readonly tipoLabel = TIPO_EXAMEN_LABEL;
  readonly aptitudLabel = APTITUD_LABEL;
  examenes: SaludExamen[] = [];
  loading = true;
  errorMsg: string | null = null;
  formAbierto = false;
  editando: SaludExamen | null = null;
  restriccionesDe: SaludExamen | null = null;
  confirmandoId: string | null = null;
  ocupado = false;

  ngOnChanges(): Promise<void> { return this.cargar(); }

  async cargar(): Promise<void> {
    this.loading = true;
    try {
      this.examenes = await this.svc.getExamenes(this.trabajadorId);
      this.errorMsg = null;
    } catch (e) { this.errorMsg = this.msg(e); }
    this.loading = false;
    this.cdr.detectChanges();
  }

  abrirForm(e: SaludExamen | null): void { this.editando = e; this.formAbierto = true; }

  async alGuardar(): Promise<void> {
    this.formAbierto = false;
    this.cambio.emit();
    await this.cargar();
  }

  async verConcepto(e: SaludExamen): Promise<void> {
    if (!e.concepto_path) return;
    try { window.open(await this.svc.urlConcepto(e.concepto_path), '_blank', 'noopener'); }
    catch (err) { this.errorMsg = this.msg(err); this.cdr.detectChanges(); }
  }

  async eliminar(e: SaludExamen): Promise<void> {
    if (this.ocupado) return;
    this.ocupado = true;
    try {
      await this.svc.eliminarExamen(e);
      this.confirmandoId = null;
      this.cambio.emit();
      await this.cargar();
    } catch (err) { this.errorMsg = this.msg(err); }
    this.ocupado = false;
    this.cdr.detectChanges();
  }

  trackById(_: number, e: SaludExamen): string { return e.id; }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error con los exámenes.';
  }
}
