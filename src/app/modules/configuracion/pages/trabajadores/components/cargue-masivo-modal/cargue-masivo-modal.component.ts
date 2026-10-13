import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  inject,
  signal,
  computed
} from '@angular/core';
import { CargueTrabajadoresService } from '../../../../../../core/services/cargue-trabajadores.service';
import { TrabajadoresService } from '../../../../../../core/services/trabajadores.service';
import { SedesService } from '../../../../../../core/services/sedes.service';
import { TenantService } from '../../../../../../core/services/tenant.service';
import {
  FilaTrabajadorPlano,
  FilaTrabajadorValidada,
  ModoCargueTrabajadores,
  ResultadoCargueBackend,
  HistorialCargue,
  ResumenValidacionLocal,
  EstadoFilaValidacion
} from '../../../../../../core/models/cargue-trabajadores.model';
import { Empresa, Sede, Trabajador } from '../../../../../../core/models/models';

type TabModal = 'cargue' | 'historial';

@Component({
  selector: 'app-cargue-masivo-modal',
  standalone: false,
  templateUrl: './cargue-masivo-modal.component.html',
  styleUrls: ['./cargue-masivo-modal.component.scss']
})
export class CargueMasivoModalComponent implements OnInit, OnChanges {
  @Input() empresaId!: string;
  @Input() sedeId!: string;
  @Input() sedes: Sede[] = [];
  @Input() empresas: Empresa[] = [];
  @Input() esAdmin = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() cargueCompletado = new EventEmitter<ResultadoCargueBackend>();

  private cargueService = inject(CargueTrabajadoresService);
  private trabajadoresService = inject(TrabajadoresService);
  private sedesService = inject(SedesService);
  private tenantService = inject(TenantService);

  // Estados Reactivos
  tabActiva = signal<TabModal>('cargue');
  modoCargue = signal<ModoCargueTrabajadores>('insertar_actualizar');
  sedeSeleccionadaId = signal<string>('');
  empresaSeleccionadaId = signal<string>('');
  sedesList = signal<Sede[]>([]);
  cargandoSedes = signal<boolean>(false);

  archivoSeleccionado = signal<File | null>(null);
  procesandoArchivo = signal<boolean>(false);
  ejecutandoCargue = signal<boolean>(false);
  simulandoCargue = signal<boolean>(false);
  arrastrandoArchivo = signal<boolean>(false);

  filasPlanas = signal<FilaTrabajadorPlano[]>([]);
  filasValidadas = signal<FilaTrabajadorValidada[]>([]);
  resumen = signal<ResumenValidacionLocal>({
    total: 0,
    validos: 0,
    nuevos: 0,
    actualizaciones: 0,
    traslados: 0,
    rechazados: 0,
    advertencias: 0
  });

  filtroEstado = signal<string>('todos');
  busquedaTexto = signal<string>('');

  resultadoFinal = signal<ResultadoCargueBackend | null>(null);
  errorMensaje = signal<string | null>(null);

  // Historial
  historial = signal<HistorialCargue[]>([]);
  cargandoHistorial = signal<boolean>(false);
  historialDetalleSeleccionado = signal<HistorialCargue | null>(null);

  // Trabajadores de la empresa para cruce y validación
  trabajadoresEmpresa = signal<Trabajador[]>([]);

  // Opciones de modo para selector UI
  readonly opcionesModo = [
    {
      valor: 'insertar_actualizar',
      titulo: 'Actualizar y Agregar (Upsert)',
      desc: 'Inserta trabajadores nuevos y actualiza datos de existentes (trasladándolos a esta sede si venían de otra).'
    },
    {
      valor: 'solo_nuevos',
      titulo: 'Solo Registrar Nuevos',
      desc: 'Inserta únicamente los documentos que no existan previamente en la empresa; los existentes se omiten.'
    }
  ];

  // Filas filtradas reactivamente
  filasFiltradas = computed(() => {
    const list = this.filasValidadas();
    const filtro = this.filtroEstado();
    const q = this.busquedaTexto().trim().toLowerCase();

    return list.filter(f => {
      // Filtro por categoría
      if (filtro === 'validos' && f.estado === 'rechazado') return false;
      if (filtro === 'nuevos' && f.estado !== 'nuevo') return false;
      if (filtro === 'actualizaciones' && f.estado !== 'actualizacion') return false;
      if (filtro === 'traslados' && f.estado !== 'traslado') return false;
      if (filtro === 'rechazados' && f.estado !== 'rechazado') return false;
      if (filtro === 'advertencias' && f.advertencias.length === 0) return false;

      // Filtro por texto
      if (q) {
        const coincide =
          f.documento.toLowerCase().includes(q) ||
          f.nombre.toLowerCase().includes(q) ||
          (f.cargo && f.cargo.toLowerCase().includes(q)) ||
          (f.area_trabajo && f.area_trabajo.toLowerCase().includes(q)) ||
          (f.eps && f.eps.toLowerCase().includes(q)) ||
          (f.arl && f.arl.toLowerCase().includes(q));
        if (!coincide) return false;
      }

      return true;
    });
  });

  async ngOnInit(): Promise<void> {
    await this.inicializarEmpresaYSedes();
    await this.cargarTrabajadoresEmpresa();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['sedes'] && this.sedes && this.sedes.length > 0) {
      this.sedesList.set(this.sedes);
      if (!this.sedeSeleccionadaId() || !this.sedes.some(s => s.id === this.sedeSeleccionadaId())) {
        const match = this.sedeId ? this.sedes.find(s => s.id === this.sedeId) : undefined;
        this.sedeSeleccionadaId.set(match?.id || this.sedes[0]?.id || '');
      }
    }
    if (changes['empresaId'] && this.empresaId && this.empresaId !== this.empresaSeleccionadaId()) {
      this.empresaSeleccionadaId.set(this.empresaId);
      if (this.sedesList().length === 0) {
        await this.cargarSedes(this.empresaId);
      }
    }
  }

  async inicializarEmpresaYSedes(): Promise<void> {
    // 1. Resolver Empresa
    let empId = this.empresaId || (this.empresas && this.empresas.length > 0 ? this.empresas[0].id : '');
    if (!empId) {
      empId = (await this.tenantService.getEmpresaTenantId()) || '';
    }
    if (empId) {
      this.empresaSeleccionadaId.set(empId);
    }

    // 2. Resolver lista de empresas si no venía provista
    if (!this.empresas || this.empresas.length === 0) {
      try {
        this.empresas = await this.tenantService.listarEmpresasDisponibles();
        if (!this.empresaSeleccionadaId() && this.empresas.length > 0) {
          this.empresaSeleccionadaId.set(this.empresas[0].id || '');
        }
      } catch (e) {
        console.error('Error cargando empresas en modal cargue:', e);
      }
    }

    // 3. Resolver Sedes: Si ya vienen pobladas se usan, de lo contrario se cargan de BD
    if (this.sedes && this.sedes.length > 0) {
      this.sedesList.set(this.sedes);
    } else {
      await this.cargarSedes(this.empresaSeleccionadaId());
    }

    // 4. Seleccionar sede activa de forma segura
    const lista = this.sedesList();
    if (lista.length > 0) {
      const match = this.sedeId ? lista.find(s => s.id === this.sedeId) : undefined;
      this.sedeSeleccionadaId.set(match?.id || this.sedeId || lista[0]?.id || '');
    } else {
      this.sedeSeleccionadaId.set(this.sedeId || '');
    }
  }

  async cargarSedes(empresaId?: string): Promise<void> {
    const id = empresaId || this.empresaSeleccionadaId();
    if (!id) return;

    this.cargandoSedes.set(true);
    try {
      const data = await this.sedesService.getSedesByEmpresa(id);
      this.sedesList.set(data || []);
      if (data && data.length > 0) {
        const match = this.sedeId ? data.find(s => s.id === this.sedeId) : undefined;
        const actualValida = this.sedeSeleccionadaId() && data.some(s => s.id === this.sedeSeleccionadaId());
        if (!actualValida) {
          this.sedeSeleccionadaId.set(match?.id || data[0]?.id || '');
        }
      } else {
        this.sedeSeleccionadaId.set('');
      }
    } catch (err) {
      console.error('Error cargando sedes para cargue masivo:', err);
    } finally {
      this.cargandoSedes.set(false);
    }
  }

  async onEmpresaModalChange(nuevaEmpresaId: string): Promise<void> {
    this.empresaSeleccionadaId.set(nuevaEmpresaId);
    this.empresaId = nuevaEmpresaId;
    await this.cargarSedes(nuevaEmpresaId);
    await this.cargarTrabajadoresEmpresa();
    if (this.filasPlanas().length > 0) {
      this.revalidarFilas();
    }
  }

  async cargarTrabajadoresEmpresa(): Promise<void> {
    const empId = this.empresaSeleccionadaId() || this.empresaId;
    if (!empId) return;
    try {
      const data = await this.trabajadoresService.getByEmpresa(empId);
      this.trabajadoresEmpresa.set(data);
    } catch (err) {
      console.error('Error cargando trabajadores para validación de cargue:', err);
    }
  }

  onSedeChange(nuevaSedeId: string): void {
    this.sedeSeleccionadaId.set(nuevaSedeId);
    // Si ya hay archivo cargado, revalidar cruce con la nueva sede
    if (this.filasPlanas().length > 0) {
      this.revalidarFilas();
    }
  }

  setModo(modo: ModoCargueTrabajadores): void {
    this.modoCargue.set(modo);
  }

  setTab(tab: TabModal): void {
    this.tabActiva.set(tab);
    if (tab === 'historial') {
      this.cargarHistorial();
    }
  }

  // ==========================================================================
  // CARGA Y PARSEO DE ARCHIVOS
  // ==========================================================================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrandoArchivo.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrandoArchivo.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrandoArchivo.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.procesarArchivoSeleccionado(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.procesarArchivoSeleccionado(input.files[0]);
      // Reset input para permitir seleccionar el mismo archivo si se corrigió
      input.value = '';
    }
  }

  async procesarArchivoSeleccionado(file: File): Promise<void> {
    this.errorMensaje.set(null);
    this.resultadoFinal.set(null);
    this.archivoSeleccionado.set(file);
    this.procesandoArchivo.set(true);

    try {
      const filas = await this.cargueService.parsearArchivo(file);
      if (filas.length === 0) {
        throw new Error('El archivo está vacío o no contiene filas con datos válidos.');
      }
      this.filasPlanas.set(filas);
      this.revalidarFilas();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al procesar archivo.';
      this.errorMensaje.set(msg);
      this.limpiarArchivo();
    } finally {
      this.procesandoArchivo.set(false);
    }
  }

  revalidarFilas(): void {
    const filas = this.filasPlanas();
    const sedeId = this.sedeSeleccionadaId();
    const trabajadores = this.trabajadoresEmpresa();

    const { validadas, resumen } = this.cargueService.validarLocalmente(
      filas,
      sedeId,
      trabajadores
    );

    this.filasValidadas.set(validadas);
    this.resumen.set(resumen);
  }

  limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.filasPlanas.set([]);
    this.filasValidadas.set([]);
    this.resumen.set({
      total: 0,
      validos: 0,
      nuevos: 0,
      actualizaciones: 0,
      traslados: 0,
      rechazados: 0,
      advertencias: 0
    });
    this.resultadoFinal.set(null);
  }

  // ==========================================================================
  // EJECUCIÓN (SIMULACIÓN Y APLICACIÓN FINAL)
  // ==========================================================================

  async simular(): Promise<void> {
    await this.ejecutarProceso(true);
  }

  async aplicarCargue(): Promise<void> {
    await this.ejecutarProceso(false);
  }

  private async ejecutarProceso(simular: boolean): Promise<void> {
    const sedeId = this.sedeSeleccionadaId();
    if (!sedeId) {
      this.errorMensaje.set('Debe seleccionar una sede destino.');
      return;
    }

    const empId = this.empresaSeleccionadaId() || this.empresaId;
    if (!empId) {
      this.errorMensaje.set('No se pudo identificar la empresa de destino para el cargue.');
      return;
    }

    const archivo = this.archivoSeleccionado();
    const filas = this.filasPlanas();
    if (!archivo || filas.length === 0) {
      this.errorMensaje.set('No hay filas cargadas para procesar.');
      return;
    }

    this.errorMensaje.set(null);
    if (simular) {
      this.simulandoCargue.set(true);
    } else {
      this.ejecutandoCargue.set(true);
    }

    try {
      const resultado = await this.cargueService.ejecutarCargue(
        empId,
        sedeId,
        filas,
        this.modoCargue(),
        archivo.name,
        simular
      );

      this.resultadoFinal.set(resultado);

      if (!simular) {
        // Refrescar listado local de trabajadores de la empresa
        await this.cargarTrabajadoresEmpresa();
        this.cargueCompletado.emit(resultado);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al comunicarse con la base de datos.';
      this.errorMensaje.set('Fallo en cargue masivo: ' + msg);
    } finally {
      this.simulandoCargue.set(false);
      this.ejecutandoCargue.set(false);
    }
  }

  // ==========================================================================
  // HISTORIAL Y AUDITORÍA
  // ==========================================================================

  async cargarHistorial(): Promise<void> {
    const sedeId = this.sedeSeleccionadaId();
    if (!sedeId) return;

    this.cargandoHistorial.set(true);
    try {
      const data = await this.cargueService.obtenerHistorial(sedeId);
      this.historial.set(data);
    } catch (err) {
      console.error('Error cargando historial de cargues:', err);
    } finally {
      this.cargandoHistorial.set(false);
    }
  }

  verDetalleHistorial(item: HistorialCargue): void {
    this.historialDetalleSeleccionado.set(item);
  }

  cerrarDetalleHistorial(): void {
    this.historialDetalleSeleccionado.set(null);
  }

  // ==========================================================================
  // DESCARGAS DE PLANTILLAS
  // ==========================================================================

  descargarPlantilla(formato: 'csv' | 'xlsx'): void {
    this.cargueService.descargarPlantilla(formato);
  }

  // ==========================================================================
  // HELPERS VISUALES
  // ==========================================================================

  getSedeNombre(id: string): string {
    const s = this.sedesList().find(item => item.id === id) || this.sedes.find(item => item.id === id);
    return s ? s.nombre : 'Sede asignada';
  }

  getEstadoSeverity(estado: EstadoFilaValidacion): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (estado) {
      case 'nuevo':
        return 'success';
      case 'actualizacion':
        return 'info';
      case 'traslado':
        return 'warn';
      case 'rechazado':
        return 'danger';
      case 'omitido':
      default:
        return 'secondary';
    }
  }

  getEstadoLabel(estado: EstadoFilaValidacion): string {
    switch (estado) {
      case 'nuevo':
        return 'Nuevo ingreso';
      case 'actualizacion':
        return 'Actualización';
      case 'traslado':
        return 'Traslado de sede';
      case 'rechazado':
        return 'Rechazado';
      case 'omitido':
      default:
        return 'Omitido';
    }
  }
}
