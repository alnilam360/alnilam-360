import { Component, OnInit, signal } from '@angular/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';
import { Empresa, Sede, Trabajador } from '../../../../core/models/models';
import { SedesService } from '../../../../core/services/sedes.service';
import { TrabajadoresService } from '../../../../core/services/trabajadores.service';
import { IndicadoresExcelService } from '../../../../core/services/indicadores-excel.service';

export interface CasoEL {
  id?: string;
  empresa_id: string;
  sede_id?: string | null;
  trabajador_id?: string | null;
  trabajador_documento: string;
  trabajador_nombre: string;
  trabajador_vinculacion?: string | null;
  cargo?: string | null;
  area_proceso?: string | null;
  tiempo_en_cargo?: string | null;
  ciudad?: string | null;
  anio_notificacion: number;
  tipo_caso: 'Nuevo' | 'Antiguo';
  fecha_calificacion?: string | null;
  estado_caso: string;
  entidad_calificacion?: string | null;
  porcentaje_pcl?: number | null;
  codigo_cie10?: string | null;
  diagnostico?: string | null;
  origen_peligro?: string | null;
  investigacion_realizada: boolean;
  sede?: { id: string; nombre: string } | null;
}

type TabEL = 'matriz' | 'indicadores' | 'analisis';

@Component({
  selector: 'app-enfermedad-laboral',
  standalone: false,
  templateUrl: './enfermedad-laboral.component.html',
  styleUrls: ['./enfermedad-laboral.component.scss']
})
export class EnfermedadLaboralComponent implements OnInit {
  readonly inicializando = signal(true);
  readonly esAdmin = signal(false);
  readonly empresas = signal<Empresa[]>([]);
  readonly empresaId = signal<string | null>(null);
  readonly anio = signal<number>(new Date().getFullYear());
  readonly tab = signal<TabEL>('indicadores');

  readonly aniosDisponibles: number[] = [];

  casos: CasoEL[] = [];
  cargando = false;
  searchQuery = '';
  promedioTrabajadores = 100; // configurable

  // Sedes y trabajadores para selección libre de redundancia
  sedes: Sede[] = [];
  trabajadoresSede: Trabajador[] = [];
  trabajadorSeleccionado: Trabajador | null = null;
  queryTrabajador = '';

  // Modal
  showModal = false;
  editingCaso: CasoEL | null = null;
  form: Partial<CasoEL> = this.getEmptyForm();
  readonly exportandoExcel = signal(false);

  constructor(
    private tenant: TenantService,
    private sb: SupabaseClientService,
    private sedesService: SedesService,
    private trabajadoresService: TrabajadoresService,
    private excelSvc: IndicadoresExcelService
  ) {
    const y = new Date().getFullYear();
    for (let a = y; a >= y - 4; a--) this.aniosDisponibles.push(a);
  }

  async ngOnInit(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    this.empresas.set(await this.tenant.listarEmpresasDisponibles());

    if (this.esAdmin()) {
      this.empresaId.set(this.empresas()[0]?.id ?? null);
    } else {
      this.empresaId.set(await this.tenant.getEmpresaTenantId());
    }

    this.inicializando.set(false);
    if (this.empresaId()) {
      await this.cargarSedes();
      await this.cargarCasos();
    }
  }

  async onEmpresaChange(id: string | null): Promise<void> {
    this.empresaId.set(id);
    await this.cargarSedes();
    await this.cargarCasos();
  }

  async onAnioChange(a: number): Promise<void> {
    this.anio.set(a);
    await this.cargarCasos();
  }

  async cargarSedes(): Promise<void> {
    if (!this.empresaId()) {
      this.sedes = [];
      return;
    }
    try {
      this.sedes = await this.sedesService.getSedesByEmpresa(this.empresaId()!);
    } catch (err) {
      console.error('Error cargando sedes:', err);
    }
  }

  async onSedeChange(sedeId: string | null): Promise<void> {
    this.form.sede_id = sedeId;
    this.trabajadoresSede = [];
    this.trabajadorSeleccionado = null;
    this.queryTrabajador = '';
    if (sedeId) {
      const s = this.sedes.find(item => item.id === sedeId);
      if (s?.municipio) {
        this.form.ciudad = s.municipio;
      }
      try {
        this.trabajadoresSede = await this.trabajadoresService.getActivosBySede(sedeId);
      } catch (e) {
        console.error('Error cargando trabajadores de sede:', e);
      }
    }
  }

  get trabajadoresFiltrados(): Trabajador[] {
    if (!this.queryTrabajador.trim()) return this.trabajadoresSede;
    const q = this.queryTrabajador.toLowerCase();
    return this.trabajadoresSede.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.documento.toLowerCase().includes(q)
    );
  }

  onTrabajadorSelect(t: Trabajador): void {
    this.trabajadorSeleccionado = t;
    this.form.trabajador_id = t.id;
    this.form.trabajador_nombre = t.nombre;
    this.form.trabajador_documento = t.documento;
    this.form.cargo = t.cargo || null;
    this.form.area_proceso = t.area_trabajo || null;
    this.form.trabajador_vinculacion = 'Directo';
    if (t.fecha_ingreso) {
      const ingreso = new Date(t.fecha_ingreso);
      const hoy = new Date();
      const difAnios = hoy.getFullYear() - ingreso.getFullYear();
      this.form.tiempo_en_cargo = difAnios > 0 ? `${difAnios} año(s)` : 'Menos de 1 año';
    }
    this.queryTrabajador = '';
  }

  clearTrabajadorSelection(): void {
    this.trabajadorSeleccionado = null;
    this.form.trabajador_id = null;
    this.form.trabajador_nombre = '';
    this.form.trabajador_documento = '';
    this.form.cargo = '';
    this.form.area_proceso = '';
  }

  async cargarCasos(): Promise<void> {
    if (!this.empresaId()) return;
    this.cargando = true;
    try {
      const { data, error } = await this.sb.client
        .from('indicadores_el_casos')
        .select('*, sede:sedes(id, nombre)')
        .eq('empresa_id', this.empresaId())
        .eq('anio_notificacion', this.anio())
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.casos = (data as CasoEL[]) || [];
    } catch (err) {
      console.error('Error cargando casos EL:', err);
    } finally {
      this.cargando = false;
    }
  }

  get filteredCasos(): CasoEL[] {
    if (!this.searchQuery.trim()) return this.casos;
    const q = this.searchQuery.toLowerCase();
    return this.casos.filter(c =>
      c.trabajador_nombre.toLowerCase().includes(q) ||
      c.trabajador_documento.includes(q) ||
      (c.diagnostico?.toLowerCase().includes(q)) ||
      (c.codigo_cie10?.toLowerCase().includes(q)) ||
      (c.sede?.nombre?.toLowerCase().includes(q))
    );
  }

  // Cálculos normativos Hoja EL
  get totalCasos(): number { return this.casos.length; }
  get casosNuevos(): number { return this.casos.filter(c => c.tipo_caso === 'Nuevo').length; }
  get casosAntiguos(): number { return this.casos.filter(c => c.tipo_caso === 'Antiguo').length; }

  get tasaPrevalencia(): number {
    if (!this.promedioTrabajadores) return 0;
    return Number(((this.totalCasos / this.promedioTrabajadores) * 100000).toFixed(1));
  }

  get tasaIncidencia(): number {
    if (!this.promedioTrabajadores) return 0;
    return Number(((this.casosNuevos / this.promedioTrabajadores) * 100000).toFixed(1));
  }

  async exportarExcel(): Promise<void> {
    if (this.exportandoExcel() || this.filteredCasos.length === 0) return;
    this.exportandoExcel.set(true);
    try {
      const emp = this.empresas().find(e => e.id === this.empresaId());
      await this.excelSvc.exportarCasosEnfermedadLaboral(
        this.filteredCasos,
        emp?.nombre || 'EMPRESA',
        this.anio()
      );
    } catch (err) {
      console.error('Error al exportar casos de enfermedad laboral:', err);
    } finally {
      this.exportandoExcel.set(false);
    }
  }

  async openNuevo(): Promise<void> {
    this.editingCaso = null;
    this.form = this.getEmptyForm();
    this.trabajadorSeleccionado = null;
    this.queryTrabajador = '';
    this.trabajadoresSede = [];

    if (this.sedes.length === 1 && this.sedes[0]?.id) {
      await this.onSedeChange(this.sedes[0].id);
    }
    this.showModal = true;
  }

  async openEditar(c: CasoEL): Promise<void> {
    this.editingCaso = c;
    this.form = { ...c };
    this.showModal = true;
    this.queryTrabajador = '';

    if (c.sede_id) {
      try {
        this.trabajadoresSede = await this.trabajadoresService.getActivosBySede(c.sede_id);
        if (c.trabajador_id) {
          this.trabajadorSeleccionado = this.trabajadoresSede.find(t => t.id === c.trabajador_id) || null;
        } else if (c.trabajador_documento) {
          this.trabajadorSeleccionado = this.trabajadoresSede.find(t => t.documento === c.trabajador_documento) || null;
          if (this.trabajadorSeleccionado) {
            this.form.trabajador_id = this.trabajadorSeleccionado.id;
          }
        }
      } catch (err) {
        console.error('Error precargando trabajadores al editar:', err);
      }
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCaso = null;
    this.trabajadorSeleccionado = null;
    this.queryTrabajador = '';
  }

  async guardarCaso(): Promise<void> {
    if (!this.form.sede_id) {
      alert('Debe seleccionar la sede a la que pertenece el caso.');
      return;
    }
    if (!this.form.trabajador_id) {
      alert('Debe seleccionar un trabajador registrado en la sede seleccionada. No se permite el registro de personas no censadas en el catálogo de trabajadores.');
      return;
    }

    try {
      const payload: Partial<CasoEL> = {
        empresa_id: this.empresaId()!,
        sede_id: this.form.sede_id,
        trabajador_id: this.form.trabajador_id,
        trabajador_documento: (this.form.trabajador_documento || '').trim(),
        trabajador_nombre: (this.form.trabajador_nombre || '').trim(),
        trabajador_vinculacion: this.form.trabajador_vinculacion || 'Directo',
        cargo: this.form.cargo || null,
        area_proceso: this.form.area_proceso || null,
        tiempo_en_cargo: this.form.tiempo_en_cargo || null,
        ciudad: this.form.ciudad || null,
        anio_notificacion: this.anio(),
        tipo_caso: this.form.tipo_caso || 'Nuevo',
        fecha_calificacion: this.form.fecha_calificacion || null,
        estado_caso: this.form.estado_caso || 'En estudio',
        entidad_calificacion: this.form.entidad_calificacion || null,
        porcentaje_pcl: this.form.porcentaje_pcl != null ? Number(this.form.porcentaje_pcl) : null,
        codigo_cie10: this.form.codigo_cie10 || null,
        diagnostico: this.form.diagnostico || null,
        origen_peligro: this.form.origen_peligro || null,
        investigacion_realizada: !!this.form.investigacion_realizada
      };

      if (this.editingCaso?.id) {
        const { error } = await this.sb.client
          .from('indicadores_el_casos')
          .update(payload)
          .eq('id', this.editingCaso.id);
        if (error) throw error;
      } else {
        const { error } = await this.sb.client
          .from('indicadores_el_casos')
          .insert([payload]);
        if (error) throw error;
      }

      this.closeModal();
      await this.cargarCasos();
    } catch (err: any) {
      alert('Error guardando caso EL: ' + (err?.message || 'Error'));
    }
  }

  async eliminar(c: CasoEL): Promise<void> {
    if (!c.id) return;
    if (!confirm(`¿Eliminar caso de ${c.trabajador_nombre}?`)) return;
    try {
      const { error } = await this.sb.client
        .from('indicadores_el_casos')
        .delete()
        .eq('id', c.id);
      if (error) throw error;
      await this.cargarCasos();
    } catch (err: any) {
      alert('Error al eliminar: ' + err?.message);
    }
  }

  private getEmptyForm(): Partial<CasoEL> {
    return {
      sede_id: null,
      trabajador_id: null,
      trabajador_documento: '',
      trabajador_nombre: '',
      trabajador_vinculacion: 'Directo',
      cargo: '',
      area_proceso: '',
      tiempo_en_cargo: '',
      ciudad: '',
      tipo_caso: 'Nuevo',
      estado_caso: 'En estudio',
      entidad_calificacion: 'ARL',
      porcentaje_pcl: null,
      codigo_cie10: '',
      diagnostico: '',
      origen_peligro: 'Biomecánico / Ergonómico',
      investigacion_realizada: false
    };
  }
}
