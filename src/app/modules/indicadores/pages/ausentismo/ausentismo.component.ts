import { Component, OnInit, signal } from '@angular/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';
import { Empresa, Sede, Trabajador } from '../../../../core/models/models';
import { SedesService } from '../../../../core/services/sedes.service';
import { TrabajadoresService } from '../../../../core/services/trabajadores.service';
import { IndicadoresExcelService } from '../../../../core/services/indicadores-excel.service';

export interface IncapacidadRegistro {
  id?: string;
  empresa_id: string;
  sede_id?: string | null;
  trabajador_id?: string | null;
  mes: number;
  anio: number;
  fecha_expedicion?: string | null;
  trabajador_documento: string;
  trabajador_nombre: string;
  cargo?: string | null;
  tipo_trabajador?: string | null;
  area_proceso?: string | null;
  tipo_evento: 'A.T.' | 'E.L.' | 'E.G.';
  fecha_inicial: string;
  fecha_final: string;
  dias_incapacidad: number;
  dias_mes_real?: number | null;
  dias_mes_siguiente?: number | null;
  codigo_cie10?: string | null;
  diagnostico?: string | null;
  salario_base?: number | null;
  salario_dia?: number | null;
  costos_asegurados_arl?: number | null;
  costos_asegurados_eps?: number | null;
  costos_asumidos_empresa?: number | null;
  sede?: { id: string; nombre: string } | null;
}

type TabAus = 'indicadores' | 'matriz' | 'analisis';

@Component({
  selector: 'app-ausentismo',
  standalone: false,
  templateUrl: './ausentismo.component.html',
  styleUrls: ['./ausentismo.component.scss']
})
export class AusentismoComponent implements OnInit {
  readonly inicializando = signal(true);
  readonly esAdmin = signal(false);
  readonly empresas = signal<Empresa[]>([]);
  readonly empresaId = signal<string | null>(null);
  readonly anio = signal<number>(new Date().getFullYear());
  readonly tab = signal<TabAus>('indicadores');
  readonly exportandoExcel = signal(false);

  readonly aniosDisponibles: number[] = [];

  incapacidades: IncapacidadRegistro[] = [];
  cargando = false;
  searchQuery = '';

  // Sedes y trabajadores para eliminar redundancias y carga manual
  sedes: Sede[] = [];
  trabajadoresSede: Trabajador[] = [];
  trabajadorSeleccionado: Trabajador | null = null;
  queryTrabajador = '';

  // Parámetros mensuales base
  diasLaboralesMes = 24;
  numTrabajadores = 50;

  showModal = false;
  editingItem: IncapacidadRegistro | null = null;
  form: Partial<IncapacidadRegistro> = this.getEmptyForm();

  readonly mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

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
      await this.cargarIncapacidades();
    }
  }

  async onEmpresaChange(id: string | null): Promise<void> {
    this.empresaId.set(id);
    await this.cargarSedes();
    await this.cargarIncapacidades();
  }

  async onAnioChange(a: number): Promise<void> {
    this.anio.set(a);
    await this.cargarIncapacidades();
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
    this.form.tipo_trabajador = 'Directo';
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

  async cargarIncapacidades(): Promise<void> {
    if (!this.empresaId()) return;
    this.cargando = true;
    try {
      const { data, error } = await this.sb.client
        .from('indicadores_incapacidades')
        .select('*, sede:sedes(id, nombre)')
        .eq('empresa_id', this.empresaId())
        .eq('anio', this.anio())
        .order('fecha_inicial', { ascending: false });

      if (error) throw error;
      this.incapacidades = (data as IncapacidadRegistro[]) || [];
    } catch (err) {
      console.error('Error cargando incapacidades:', err);
    } finally {
      this.cargando = false;
    }
  }

  get filteredIncapacidades(): IncapacidadRegistro[] {
    if (!this.searchQuery.trim()) return this.incapacidades;
    const q = this.searchQuery.toLowerCase();
    return this.incapacidades.filter(i =>
      i.trabajador_nombre.toLowerCase().includes(q) ||
      i.trabajador_documento.includes(q) ||
      (i.diagnostico?.toLowerCase().includes(q)) ||
      (i.codigo_cie10?.toLowerCase().includes(q)) ||
      (i.sede?.nombre?.toLowerCase().includes(q))
    );
  }

  // Métricas normativas Hoja Ausentismo
  get totalDiasIncapacidad(): number {
    return this.incapacidades.reduce((acc, i) => acc + (i.dias_incapacidad || 0), 0);
  }

  get diasProgramadosAnuales(): number {
    return this.diasLaboralesMes * 12 * this.numTrabajadores;
  }

  get tasaAusentismo(): number {
    if (!this.diasProgramadosAnuales) return 0;
    return Number(((this.totalDiasIncapacidad / this.diasProgramadosAnuales) * 100).toFixed(2));
  }

  get totalCostosEmpresa(): number {
    return this.incapacidades.reduce((acc, i) => acc + (i.costos_asumidos_empresa || 0), 0);
  }

  get totalCostosAsegurados(): number {
    return this.incapacidades.reduce((acc, i) => acc + (i.costos_asegurados_arl || 0) + (i.costos_asegurados_eps || 0), 0);
  }

  async openNuevo(): Promise<void> {
    this.editingItem = null;
    this.form = this.getEmptyForm();
    this.trabajadorSeleccionado = null;
    this.queryTrabajador = '';
    this.trabajadoresSede = [];

    if (this.sedes.length === 1 && this.sedes[0]?.id) {
      await this.onSedeChange(this.sedes[0].id);
    }
    this.showModal = true;
  }

  async openEditar(i: IncapacidadRegistro): Promise<void> {
    this.editingItem = i;
    this.form = { ...i };
    this.showModal = true;
    this.queryTrabajador = '';

    if (i.sede_id) {
      try {
        this.trabajadoresSede = await this.trabajadoresService.getActivosBySede(i.sede_id);
        if (i.trabajador_id) {
          this.trabajadorSeleccionado = this.trabajadoresSede.find(t => t.id === i.trabajador_id) || null;
        } else if (i.trabajador_documento) {
          this.trabajadorSeleccionado = this.trabajadoresSede.find(t => t.documento === i.trabajador_documento) || null;
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
    this.editingItem = null;
    this.trabajadorSeleccionado = null;
    this.queryTrabajador = '';
  }

  onFechasChange(): void {
    if (this.form.fecha_inicial && this.form.fecha_final) {
      const f1 = new Date(this.form.fecha_inicial);
      const f2 = new Date(this.form.fecha_final);
      const diff = Math.round((f2.getTime() - f1.getTime()) / (1000 * 3600 * 24)) + 1;
      this.form.dias_incapacidad = diff > 0 ? diff : 1;
    }
  }

  async guardarIncapacidad(): Promise<void> {
    if (!this.form.sede_id) {
      alert('Debe seleccionar la sede a la que pertenece el trabajador.');
      return;
    }
    if (!this.form.trabajador_id) {
      alert('Debe seleccionar un trabajador registrado en la sede seleccionada. No se permite el registro de personas no censadas en el catálogo de trabajadores.');
      return;
    }
    if (!this.form.fecha_inicial || !this.form.fecha_final) {
      alert('Las fechas de inicio y fin de la incapacidad son obligatorias.');
      return;
    }

    try {
      const payload: Partial<IncapacidadRegistro> = {
        empresa_id: this.empresaId()!,
        sede_id: this.form.sede_id,
        trabajador_id: this.form.trabajador_id,
        mes: Number(this.form.mes) || 1,
        anio: this.anio(),
        fecha_expedicion: this.form.fecha_expedicion || null,
        trabajador_documento: (this.form.trabajador_documento || '').trim(),
        trabajador_nombre: (this.form.trabajador_nombre || '').trim(),
        cargo: this.form.cargo || null,
        tipo_trabajador: this.form.tipo_trabajador || 'Directo',
        area_proceso: this.form.area_proceso || null,
        tipo_evento: this.form.tipo_evento || 'E.G.',
        fecha_inicial: this.form.fecha_inicial,
        fecha_final: this.form.fecha_final,
        dias_incapacidad: Number(this.form.dias_incapacidad) || 1,
        codigo_cie10: this.form.codigo_cie10 || null,
        diagnostico: this.form.diagnostico || null,
        salario_base: Number(this.form.salario_base) || 0,
        costos_asumidos_empresa: Number(this.form.costos_asumidos_empresa) || 0,
        costos_asegurados_arl: Number(this.form.costos_asegurados_arl) || 0,
        costos_asegurados_eps: Number(this.form.costos_asegurados_eps) || 0,
      };

      if (this.editingItem?.id) {
        const { error } = await this.sb.client
          .from('indicadores_incapacidades')
          .update(payload)
          .eq('id', this.editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await this.sb.client
          .from('indicadores_incapacidades')
          .insert([payload]);
        if (error) throw error;
      }

      this.closeModal();
      await this.cargarIncapacidades();
    } catch (err: any) {
      alert('Error guardando incapacidad: ' + (err?.message || 'Error'));
    }
  }

  async eliminar(i: IncapacidadRegistro): Promise<void> {
    if (!i.id) return;
    if (!confirm(`¿Eliminar incapacidad de ${i.trabajador_nombre}?`)) return;
    try {
      const { error } = await this.sb.client
        .from('indicadores_incapacidades')
        .delete()
        .eq('id', i.id);
      if (error) throw error;
      await this.cargarIncapacidades();
    } catch (err: any) {
      alert('Error al eliminar: ' + err?.message);
    }
  }

  private getEmptyForm(): Partial<IncapacidadRegistro> {
    return {
      sede_id: null,
      trabajador_id: null,
      mes: 1,
      trabajador_documento: '',
      trabajador_nombre: '',
      cargo: '',
      tipo_trabajador: 'Directo',
      area_proceso: '',
      tipo_evento: 'E.G.',
      fecha_inicial: '',
      fecha_final: '',
      dias_incapacidad: 1,
      codigo_cie10: '',
      diagnostico: '',
      salario_base: 1423500,
      costos_asumidos_empresa: 0,
      costos_asegurados_eps: 0,
      costos_asegurados_arl: 0
    };
  }

  async exportarExcel(): Promise<void> {
    try {
      this.exportandoExcel.set(true);
      const emp = this.empresas().find(e => e.id === this.empresaId());
      await this.excelSvc.exportarIncapacidadesAusentismo(
        this.filteredIncapacidades,
        emp?.nombre || 'Empresa',
        this.anio()
      );
    } catch (err: any) {
      console.error('Error exportando ausentismo:', err);
      alert('Error al exportar incapacidades a Excel: ' + (err?.message || err));
    } finally {
      this.exportandoExcel.set(false);
    }
  }
}


