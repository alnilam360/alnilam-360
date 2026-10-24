import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import {
  MatrizLegalComponente,
  MatrizLegalRequisito,
  TipoNorma,
  ESTADOS_CUMPLIMIENTO,
  ESTADO_LABEL,
  EstadoCumplimiento,
} from '../../../../core/models/matriz-legal.model';

/**
 * Formulario (modal) de creación/edición de un requisito legal.
 * Presentacional: no accede a la base de datos; emite el payload al contenedor.
 */
@Component({
  selector: 'app-requisito-form',
  standalone: false,
  templateUrl: './requisito-form.component.html',
  styleUrls: ['./requisito-form.component.scss'],
})
export class RequisitoFormComponent implements OnChanges {
  @Input() open = false;
  @Input() empresaId = '';
  @Input() componentes: MatrizLegalComponente[] = [];
  @Input() tiposNorma: TipoNorma[] = [];
  /** null = creación; objeto = edición. */
  @Input() requisito: MatrizLegalRequisito | null = null;
  @Input() guardando = false;

  @Output() guardar = new EventEmitter<MatrizLegalRequisito>();
  @Output() cerrar = new EventEmitter<void>();

  readonly estados = ESTADOS_CUMPLIMIENTO;
  readonly ESTADO_LABEL = ESTADO_LABEL;

  form = signal<MatrizLegalRequisito>(this.vacio());

  get esEdicion(): boolean { return !!this.requisito?.id; }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['open'] && this.open) {
      this.form.set(this.requisito ? { ...this.requisito } : this.vacio());
    }
  }

  private vacio(): MatrizLegalRequisito {
    return {
      empresa_id: this.empresaId,
      componente_id: '',
      tipo_norma_id: null,
      numero: null,
      anio: null,
      fecha_expedicion: null,
      entidad_emisora: null,
      articulos_aplicables: null,
      descripcion_requisito: '',
      aplicacion_empresa: null,
      estado_cumplimiento: 'EN_PROCESO',
      evidencia_cumplimiento: null,
      responsable: null,
      fecha_verificacion: null,
      observaciones: null,
      es_otra_indole: false,
      vigente: true,
      norma_deroga: null,
    };
  }

  patch<K extends keyof MatrizLegalRequisito>(campo: K, valor: MatrizLegalRequisito[K]): void {
    this.form.update(f => ({ ...f, [campo]: valor }));
  }

  setEstado(e: EstadoCumplimiento): void { this.patch('estado_cumplimiento', e); }

  onGuardar(): void {
    const f = this.form();
    if (!f.componente_id) { alert('Seleccione el componente.'); return; }
    if (!f.descripcion_requisito?.trim()) { alert('La descripción del requisito es obligatoria.'); return; }
    this.guardar.emit({ ...f, empresa_id: this.empresaId });
  }

  onCerrar(): void { this.cerrar.emit(); }
}
