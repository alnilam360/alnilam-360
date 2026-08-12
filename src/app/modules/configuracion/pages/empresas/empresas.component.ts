import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { EmpresasService } from '../../../../core/services/empresas.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { UbicacionService } from '../../../../core/services/ubicacion.service';
import { CiuoService } from '../../../../core/services/ciuo.service';
import { CatalogoCiuoOficio, Empresa, NivelRiesgo, Sede, Departamento, Municipio } from '../../../../core/models/models';

@Component({
  selector: 'app-empresas',
  templateUrl: './empresas.component.html',
  styleUrls: ['./empresas.component.scss'],
  standalone: false
})
export class EmpresasComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  empresas: Empresa[] = [];
  sedes: Sede[] = [];
  loading = true;

  // Ubicación
  departamentos: Departamento[] = [];
  municipiosEmpresa: Municipio[] = [];
  municipiosSede: Municipio[] = [];

  showModal = false;
  showSedesModal = false;
  showSedeFormModal = false;
  showDeleteError = false;
  deleteErrorMessage = '';
  selectedEmpresa: Empresa | null = null;
  selectedSede: Sede | null = null;

  formEmpresa: Partial<Empresa> = this.getEmptyEmpresa();
  formSede: Partial<Sede> = this.getEmptySede();

  // Selección temporal de departamento para los dropdowns
  selectedDepartamentoEmpresa = '';
  selectedDepartamentoSede = '';

  // CIUO-08
  oficioSeleccionado: CatalogoCiuoOficio | null = null;
  sugerenciasOficio: CatalogoCiuoOficio[] = [];

  constructor(
    private empresasService: EmpresasService,
    private sedesService: SedesService,
    private ubicacionService: UbicacionService,
    readonly ciuoService: CiuoService
  ) { }

  ngOnInit(): void {
    this.loadEmpresas();
    this.loadDepartamentos();
    this.ciuoService.cargarCatalogo();
  }

  async loadEmpresas(): Promise<void> {
    this.loading = true;
    try {
      this.empresas = await this.empresasService.getEmpresas();
    } catch (error) {
      console.error('Error loading empresas:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDepartamentos(): Promise<void> {
    try {
      this.departamentos = await this.ubicacionService.getDepartamentos();
    } catch (error) {
      console.error('Error loading departamentos:', error);
    }
  }

  async onDepartamentoEmpresaChange(departamentoId: string): Promise<void> {
    this.selectedDepartamentoEmpresa = departamentoId;
    this.formEmpresa.municipio = '';
    this.municipiosEmpresa = [];
    if (departamentoId) {
      try {
        this.municipiosEmpresa = await this.ubicacionService.getMunicipiosByDepartamento(departamentoId);
        const dep = this.departamentos.find(d => d.id === departamentoId);
        this.formEmpresa.departamento = dep?.nombre || '';
      } catch (error) {
        console.error('Error loading municipios:', error);
      }
    }
  }

  async onDepartamentoSedeChange(departamentoId: string): Promise<void> {
    this.selectedDepartamentoSede = departamentoId;
    this.formSede.municipio = '';
    this.municipiosSede = [];
    if (departamentoId) {
      try {
        this.municipiosSede = await this.ubicacionService.getMunicipiosByDepartamento(departamentoId);
        const dep = this.departamentos.find(d => d.id === departamentoId);
        this.formSede.departamento = dep?.nombre || '';
      } catch (error) {
        console.error('Error loading municipios:', error);
      }
    }
  }

  onMunicipioEmpresaChange(municipioNombre: string): void {
    this.formEmpresa.municipio = municipioNombre;
  }

  onMunicipioSedeChange(municipioNombre: string): void {
    this.formSede.municipio = municipioNombre;
  }

  getEmptyEmpresa(): Partial<Empresa> {
    return {
      nit: '',
      nombre: '',
      departamento: '',
      municipio: '',
      actividad_economica: '',
      direccion: '',
      telefono: '',
      email: '',
      asegurado: false,
      representante_legal: { nombre: '', email: '', telefono: '' },
      encargado_sst: { nombre: '', email: '', telefono: '' },
      trabajadores: {
        directos: 0, directos_hombres: 0, directos_mujeres: 0,
        aprendices: 0, aprendices_hombres: 0, aprendices_mujeres: 0,
        contratistas: 0, contratistas_hombres: 0, contratistas_mujeres: 0,
        brigadistas: 0, brigadistas_hombres: 0, brigadistas_mujeres: 0
      },
      descripcion: '',
      horarios: { manana: false, tarde: false, noche: false, continuo: false },
      numero_empleados: 0,
      nivel_riesgo: null,
      id_oficio_ciuo: null
    };
  }

  get nivelRiesgoDisplay(): string {
    const r = this.oficioSeleccionado?.nivel_riesgo_numeral ?? this.formEmpresa.nivel_riesgo;
    if (!r) return '';
    const labels: Record<string, string> = {
      'I': 'I (Mínimo)', 'II': 'II (Bajo)', 'III': 'III (Medio)', 'IV': 'IV (Alto)', 'V': 'V (Máximo)'
    };
    return labels[r] ?? r;
  }

  buscarOficio(event: { query: string }): void {
    this.sugerenciasOficio = this.ciuoService.buscarOficios(event.query);
  }

  onOficioSeleccionado(oficio: CatalogoCiuoOficio): void {
    this.formEmpresa.id_oficio_ciuo = oficio.id;
    this.formEmpresa.nivel_riesgo = oficio.nivel_riesgo_numeral as NivelRiesgo;
  }

  onOficioClear(): void {
    this.oficioSeleccionado = null;
    this.formEmpresa.id_oficio_ciuo = null;
    this.formEmpresa.nivel_riesgo = null;
  }

  etiquetaOficio(o: CatalogoCiuoOficio): string {
    return this.ciuoService.etiqueta(o);
  }

  /**
   * Recalcula el campo auxiliar `numero_empleados` como la suma de
   * directos + aprendices + contratistas para mantener consistencia
   * con el clasificador de Res. 0312.
   */
  recalcularNumeroEmpleados(): void {
    const t = this.formEmpresa.trabajadores;
    if (!t) return;
    this.formEmpresa.numero_empleados =
      (Number(t.directos) || 0) +
      (Number(t.aprendices) || 0) +
      (Number(t.contratistas) || 0);
  }

  /**
   * Texto informativo para la UI que indica el universo de evaluación
   * Res. 0312 que aplicará a esta empresa (7 / 21 / 60).
   */
  getTipoEvaluacionHint(): string {
    const n = Number(this.formEmpresa.numero_empleados) || 0;
    const r = (this.formEmpresa.nivel_riesgo || '').toString().toUpperCase();
    if (!r) return 'Seleccione el nivel de riesgo para calcular el universo aplicable.';
    if (r === 'IV' || r === 'V') return `Riesgo ${r}: aplica evaluación completa de 60 estándares.`;
    if (n > 50) return `Más de 50 trabajadores: aplica evaluación completa de 60 estándares.`;
    if (n >= 11) return `Entre 11 y 50 trabajadores (riesgo ${r}): aplican 21 estándares.`;
    return `Hasta 10 trabajadores (riesgo ${r}): aplican 7 estándares.`;
  }

  getEmptySede(): Partial<Sede> {
    return {
      nombre: '',
      departamento: '',
      municipio: '',
      direccion: '',
      persona_encargada: '',
      correo: '',
      telefono: '',
      descripcion: '',
      numero_trabajadores: 0
    };
  }

  getTotalTrabajadores(empresa: Empresa): number {
    const t = empresa.trabajadores;
    if (!t) return 0;
    return (t.directos || 0) + (t.aprendices || 0) + (t.contratistas || 0);
  }

  onGlobalFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dt.filterGlobal(input.value, 'contains');
  }

  // ==================== EMPRESA MODAL ====================

  openModal(): void {
    this.selectedEmpresa = null;
    this.formEmpresa = this.getEmptyEmpresa();
    this.selectedDepartamentoEmpresa = '';
    this.municipiosEmpresa = [];
    this.oficioSeleccionado = null;
    this.showModal = true;
  }

  async editEmpresa(empresa: Empresa): Promise<void> {
    this.selectedEmpresa = empresa;
    this.formEmpresa = JSON.parse(JSON.stringify(empresa));
    this.recalcularNumeroEmpleados();
    // Restore oficio selection
    if (empresa.oficio_ciuo?.id) {
      this.oficioSeleccionado = empresa.oficio_ciuo as CatalogoCiuoOficio;
    } else if (empresa.id_oficio_ciuo) {
      this.oficioSeleccionado = this.ciuoService.catalogo().find(o => o.id === empresa.id_oficio_ciuo) ?? null;
    } else {
      this.oficioSeleccionado = null;
    }
    const dep = this.departamentos.find(d => d.nombre === empresa.departamento);
    if (dep) {
      this.selectedDepartamentoEmpresa = dep.id;
      this.municipiosEmpresa = await this.ubicacionService.getMunicipiosByDepartamento(dep.id);
    } else {
      this.selectedDepartamentoEmpresa = '';
      this.municipiosEmpresa = [];
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEmpresa = null;
  }

  async saveEmpresa(): Promise<void> {
    try {
      // Antes de enviar, sincronizar el campo auxiliar `numero_empleados`
      // con el contenido de la sección de Trabajadores.
      this.recalcularNumeroEmpleados();

      // Payload saneado: solo columnas actualizables, sin relaciones anidadas del SELECT.
      const payload: Partial<Empresa> = {
        nit: this.formEmpresa.nit,
        nombre: this.formEmpresa.nombre,
        departamento: this.formEmpresa.departamento,
        municipio: this.formEmpresa.municipio,
        actividad_economica: this.formEmpresa.actividad_economica,
        direccion: this.formEmpresa.direccion,
        telefono: this.formEmpresa.telefono,
        email: this.formEmpresa.email,
        asegurado: this.formEmpresa.asegurado,
        representante_legal: this.formEmpresa.representante_legal,
        encargado_sst: this.formEmpresa.encargado_sst,
        trabajadores: this.formEmpresa.trabajadores,
        descripcion: this.formEmpresa.descripcion,
        horarios: this.formEmpresa.horarios,
        numero_empleados: Number(this.formEmpresa.numero_empleados) || 0,
        id_oficio_ciuo: this.formEmpresa.id_oficio_ciuo ?? null,
        // nivel_riesgo synced by DB trigger from id_oficio_ciuo; send null if no oficio
        nivel_riesgo: this.formEmpresa.id_oficio_ciuo
          ? (this.formEmpresa.nivel_riesgo ?? null)
          : null
      };

      if (this.selectedEmpresa && this.selectedEmpresa.id) {
        await this.empresasService.updateEmpresa(this.selectedEmpresa.id, payload);
      } else {
        await this.empresasService.createEmpresa(payload);
      }
      this.closeModal();
      await this.loadEmpresas();
    } catch (error: any) {
      console.error('Error saving empresa:', error);
      alert('No se pudo guardar la empresa: ' + (error?.message || 'error desconocido'));
    }
  }

  async deleteEmpresa(empresa: Empresa): Promise<void> {
    try {
      const result = await this.empresasService.canDeleteEmpresa(empresa.id!);
      if (!result.canDelete) {
        this.deleteErrorMessage = result.reason || 'No se puede eliminar esta empresa.';
        this.showDeleteError = true;
        setTimeout(() => this.showDeleteError = false, 6000);
        return;
      }
      if (confirm(`¿Está seguro de eliminar la empresa "${empresa.nombre}"? Esta acción no se puede deshacer.`)) {
        await this.empresasService.deleteEmpresa(empresa.id!);
        await this.loadEmpresas();
      }
    } catch (error) {
      console.error('Error deleting empresa:', error);
    }
  }

  dismissDeleteError(): void {
    this.showDeleteError = false;
  }

  // ==================== SEDES MODAL ====================

  async openSedesModal(empresa: Empresa): Promise<void> {
    this.selectedEmpresa = empresa;
    this.showSedesModal = true;
    await this.loadSedes(empresa.id!);
  }

  async loadSedes(empresaId: string): Promise<void> {
    try {
      this.sedes = await this.sedesService.getSedesByEmpresa(empresaId);
    } catch (error) {
      console.error('Error loading sedes:', error);
    }
  }

  closeSedesModal(): void {
    this.showSedesModal = false;
    this.selectedEmpresa = null;
    this.sedes = [];
  }

  // ==================== SEDE FORM MODAL ====================

  async openSedeFormModal(sede?: Sede): Promise<void> {
    this.selectedSede = sede || null;
    this.formSede = sede ? JSON.parse(JSON.stringify(sede)) : this.getEmptySede();
    // Pre-cargar departamento si la sede ya tiene uno
    if (sede) {
      const dep = this.departamentos.find(d => d.nombre === sede.departamento);
      if (dep) {
        this.selectedDepartamentoSede = dep.id;
        this.municipiosSede = await this.ubicacionService.getMunicipiosByDepartamento(dep.id);
      } else {
        this.selectedDepartamentoSede = '';
        this.municipiosSede = [];
      }
    } else {
      this.selectedDepartamentoSede = '';
      this.municipiosSede = [];
    }
    this.showSedeFormModal = true;
  }

  closeSedeFormModal(): void {
    this.showSedeFormModal = false;
    this.selectedSede = null;
  }

  async saveSede(): Promise<void> {
    try {
      if (this.selectedSede && this.selectedSede.id) {
        await this.sedesService.updateSede(this.selectedSede.id, this.formSede);
      } else {
        this.formSede.empresa_id = this.selectedEmpresa?.id;
        await this.sedesService.createSede(this.formSede);
      }
      this.closeSedeFormModal();
      if (this.selectedEmpresa?.id) {
        await this.loadSedes(this.selectedEmpresa.id);
      }
    } catch (error) {
      console.error('Error saving sede:', error);
    }
  }

  async deleteSede(sedeId: string): Promise<void> {
    try {
      await this.sedesService.deleteSede(sedeId);
      if (this.selectedEmpresa?.id) {
        await this.loadSedes(this.selectedEmpresa.id);
      }
    } catch (error) {
      console.error('Error deleting sede:', error);
    }
  }
}
