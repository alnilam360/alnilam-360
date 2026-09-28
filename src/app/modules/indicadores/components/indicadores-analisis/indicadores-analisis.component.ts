import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { IndicadoresPlanesService, IndicadorPlanAccion, TipoIndicador, EstadoPlanAccion } from '../../../../core/services/indicadores-planes.service';

type SubTab = 'analisis' | 'planes';

@Component({
  selector: 'app-indicadores-analisis-planes',
  standalone: false,
  templateUrl: './indicadores-analisis.component.html',
  styleUrls: ['./indicadores-analisis.component.scss']
})
export class IndicadoresAnalisisComponent implements OnInit, OnChanges {
  @Input() empresaId!: string;
  @Input() anio!: number;
  @Input() tipoIndicador: TipoIndicador = 'AT';
  @Input() tituloIndicador = 'Accidentalidad (AT)';

  private planesService = inject(IndicadoresPlanesService);

  readonly subTab = signal<SubTab>('planes');
  readonly planes = this.planesService.planes;
  readonly cargando = this.planesService.cargando;

  // Estado del modal de acción
  showModal = false;
  editingPlan: IndicadorPlanAccion | null = null;
  form: Partial<IndicadorPlanAccion> = this.getEmptyForm();

  // Opciones de periodos
  readonly periodos = [
    'Anual', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    'Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Trimestre 4'
  ];

  readonly estados: EstadoPlanAccion[] = ['Pendiente', 'En Ejecución', 'Completado', 'Cancelado'];

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['empresaId'] || changes['anio'] || changes['tipoIndicador']) {
      if (this.empresaId && this.anio) {
        this.cargarDatos();
      }
    }
  }

  cargarDatos(): void {
    if (!this.empresaId) return;
    this.planesService.listar(this.empresaId, this.tipoIndicador, this.anio);
  }

  // Contadores
  get totalPlanes(): number {
    return this.planes().length;
  }

  get completados(): number {
    return this.planes().filter(p => p.estado === 'Completado').length;
  }

  get enEjecucion(): number {
    return this.planes().filter(p => p.estado === 'En Ejecución').length;
  }

  get pendientes(): number {
    return this.planes().filter(p => p.estado === 'Pendiente').length;
  }

  openNuevoModal(): void {
    this.editingPlan = null;
    this.form = this.getEmptyForm();
    this.showModal = true;
  }

  openEditarModal(plan: IndicadorPlanAccion): void {
    this.editingPlan = plan;
    this.form = { ...plan };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingPlan = null;
  }

  async guardarAccion(): Promise<void> {
    if (!this.form.actividad?.trim() || !this.form.responsable?.trim() || !this.form.area_responsable?.trim()) {
      alert('Por favor complete Actividad, Responsable y Área Responsable.');
      return;
    }

    try {
      const payload: Partial<IndicadorPlanAccion> = {
        empresa_id: this.empresaId,
        tipo_indicador: this.tipoIndicador,
        anio: this.anio,
        periodo: this.form.periodo || 'Anual',
        actividad: this.form.actividad.trim(),
        responsable: this.form.responsable.trim(),
        area_responsable: this.form.area_responsable.trim(),
        fecha_programada: this.form.fecha_programada || null,
        fecha_ejecucion: this.form.fecha_ejecucion || null,
        estado: this.form.estado || 'Pendiente',
        observaciones: this.form.observaciones || null,
        analisis_texto: this.form.analisis_texto || null,
      };

      if (this.editingPlan?.id) {
        await this.planesService.actualizar(this.editingPlan.id, payload);
      } else {
        await this.planesService.crear(payload);
      }
      this.closeModal();
    } catch (err: any) {
      alert('Error guardando plan de acción: ' + (err?.message || 'Error desconocido'));
    }
  }

  async eliminar(plan: IndicadorPlanAccion): Promise<void> {
    if (!plan.id) return;
    if (!confirm(`¿Eliminar la acción "${plan.actividad}"?`)) return;
    try {
      await this.planesService.eliminar(plan.id);
    } catch (err: any) {
      alert('Error al eliminar: ' + err?.message);
    }
  }

  private getEmptyForm(): Partial<IndicadorPlanAccion> {
    return {
      periodo: 'Anual',
      actividad: '',
      responsable: '',
      area_responsable: '',
      fecha_programada: '',
      fecha_ejecucion: '',
      estado: 'Pendiente',
      observaciones: '',
      analisis_texto: ''
    };
  }
}
