import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TenantService } from '../../../../core/services/tenant.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { MatrizIndicadoresService } from '../../../../core/services/matriz-indicadores.service';
import {
  CATALOGO_MATRIZ_INDICADORES,
  FRECUENCIAS_MEDICION_MATRIZ,
  FilaMatrizIndicador,
  FrecuenciaMedicionMatriz,
  MatrizIndicadorRegistroDB,
  ResumenCumplimientoMatriz,
  TIPOS_INDICADOR_MATRIZ,
  TipoIndicadorMatriz,
  calcularCumplimientoMatriz,
  getDefinicionPorNombre,
  getNombresPorTipo,
  getTipoCorto,
  normalizarTipoIndicador
} from '../../../../core/models/matriz-indicadores.model';
import { Empresa, Sede } from '../../../../core/models/models';

@Component({
  selector: 'app-matriz-indicadores',
  standalone: false,
  templateUrl: './matriz-indicadores.component.html',
  styleUrls: ['./matriz-indicadores.component.scss']
})
export class MatrizIndicadoresComponent implements OnInit {
  private tenant = inject(TenantService);
  private sedesService = inject(SedesService);
  private matrizService = inject(MatrizIndicadoresService);
  private router = inject(Router);

  // Estados de carga y operaciones
  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  inicializando = signal<boolean>(false);
  exportando = signal<boolean>(false);
  esAdmin = signal<boolean>(false);

  // Contexto Multitenant y Periodo
  empresas = signal<Empresa[]>([]);
  sedes = signal<Sede[]>([]);
  empresaId = signal<string>('');
  sedeId = signal<string>('');
  anio = signal<number>(new Date().getFullYear());
  mes = signal<number>(0); // 0 = Consolidado Anual

  readonly aniosDisponibles: number[] = [];
  readonly mesesNombres = [
    { valor: 0, nombre: 'Consolidado Anual (Todo el año)' },
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Listas maestras para el módulo
  readonly tiposDisponibles = TIPOS_INDICADOR_MATRIZ;
  readonly frecuenciasDisponibles = FRECUENCIAS_MEDICION_MATRIZ;

  // Filtros de Consulta en Cascada (Barra Superior)
  tipoSeleccionado = signal<string>('todos');
  indicadorSeleccionadoNombre = signal<string>('todos');
  busquedaTexto = signal<string>('');

  // Filas en BD y Resumen de Cumplimiento
  filas = signal<FilaMatrizIndicador[]>([]);
  resumen = signal<ResumenCumplimientoMatriz>({
    total: 0,
    cumplen: 0,
    noCumplen: 0,
    porcentajeCumplimiento: 0
  });

  // Modal de Registro / Edición
  modalVisible = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  idRegistroActual = signal<string | null>(null);

  // ==========================================================================
  // SIGNALS REACTIVOS DEL FORMULARIO MODAL (Garantizan cascada reactiva)
  // ==========================================================================
  tipoModal = signal<TipoIndicadorMatriz>('Accidente de Trabajo (AT)');
  nombreModal = signal<string>('');
  formulaModal = signal<string>('');
  responsableModal = signal<string>('Responsable SST');
  frecuenciaModal = signal<FrecuenciaMedicionMatriz>('Mensual');
  metaModal = signal<number>(0);
  resultadoModal = signal<number>(0);
  personalConocimientoModal = signal<string>('Gerencia y trabajadores');

  /**
   * Cascada Reactiva: Nombres de indicador dependientes del Tipo en el Modal.
   * Se recalcula instantáneamente al mutar tipoModal().
   */
  nombresDisponiblesModal = computed<string[]>(() => {
    return getNombresPorTipo(this.tipoModal());
  });

  /**
   * Evaluación reactiva automática de Cumplimiento:
   * Si resultado >= Meta entonces 'CUMPLE', si no 'NO CUMPLE'
   */
  cumplimientoModal = computed<'CUMPLE' | 'NO CUMPLE'>(() => {
    return calcularCumplimientoMatriz(this.resultadoModal(), this.metaModal());
  });

  constructor() {
    const y = new Date().getFullYear();
    for (let a = y; a >= y - 4; a--) {
      this.aniosDisponibles.push(a);
    }
  }

  async ngOnInit(): Promise<void> {
    await this.inicializarTenant();
    await this.cargarMatriz();
  }

  async inicializarTenant(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    const listaEmpresas = await this.tenant.listarEmpresasDisponibles();
    this.empresas.set(listaEmpresas);

    let empId = (await this.tenant.getEmpresaTenantId()) || '';
    if (!empId && listaEmpresas.length > 0) {
      empId = listaEmpresas[0].id || '';
    }
    this.empresaId.set(empId);

    if (empId) {
      await this.cargarSedes(empId);
    }
  }

  async cargarSedes(empresaId: string): Promise<void> {
    try {
      const listaSedes = await this.sedesService.getSedesByEmpresa(empresaId);
      this.sedes.set(listaSedes || []);
    } catch (e) {
      console.error('Error cargando sedes para matriz:', e);
      this.sedes.set([]);
    }
  }

  async onEmpresaChange(nuevaEmpresaId: string): Promise<void> {
    this.empresaId.set(nuevaEmpresaId);
    this.sedeId.set('');
    await this.cargarSedes(nuevaEmpresaId);
    await this.cargarMatriz();
  }

  async onSedeChange(nuevaSedeId: string): Promise<void> {
    this.sedeId.set(nuevaSedeId);
    await this.cargarMatriz();
  }

  async onAnioChange(nuevoAnio: number): Promise<void> {
    this.anio.set(nuevoAnio);
    await this.cargarMatriz();
  }

  async onMesChange(nuevoMes: number): Promise<void> {
    this.mes.set(nuevoMes);
    await this.cargarMatriz();
  }

  // ==========================================================================
  // FILTROS EN CASCADA EN LA BARRA DE CONSULTA
  // ==========================================================================

  indicadoresCascada = computed<{ id: string; nombre: string }[]>(() => {
    const tipo = this.tipoSeleccionado();
    if (tipo === 'todos') {
      const map = new Map<string, string>();
      this.filas().forEach(f => map.set(f.nombre, f.nombre));
      if (map.size === 0) {
        CATALOGO_MATRIZ_INDICADORES.forEach(c => map.set(c.nombre, c.nombre));
      }
      return Array.from(map.values()).map(n => ({ id: n, nombre: n }));
    }

    const nombres = getNombresPorTipo(tipo);
    return nombres.map(n => ({ id: n, nombre: n }));
  });

  onTipoChange(nuevoTipo: string): void {
    this.tipoSeleccionado.set(nuevoTipo);
    this.indicadorSeleccionadoNombre.set('todos');
  }

  onIndicadorChange(nuevoNombre: string): void {
    this.indicadorSeleccionadoNombre.set(nuevoNombre);
  }

  filasFiltradas = computed<FilaMatrizIndicador[]>(() => {
    const list = this.filas();
    const tipo = this.tipoSeleccionado();
    const indNombre = this.indicadorSeleccionadoNombre();
    const q = this.busquedaTexto().trim().toLowerCase();

    return list.filter(f => {
      if (tipo !== 'todos' && normalizarTipoIndicador(f.tipo) !== normalizarTipoIndicador(tipo)) {
        return false;
      }

      if (indNombre !== 'todos' && f.nombre.trim().toLowerCase() !== indNombre.trim().toLowerCase()) {
        return false;
      }

      if (q) {
        const match =
          f.nombre.toLowerCase().includes(q) ||
          f.formula.toLowerCase().includes(q) ||
          f.responsable.toLowerCase().includes(q) ||
          f.tipo.toLowerCase().includes(q) ||
          f.cumplimiento.toLowerCase().includes(q) ||
          f.personalConocimiento.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  });

  // ==========================================================================
  // CARGA DE MATRIZ
  // ==========================================================================

  async cargarMatriz(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    try {
      const sede = this.sedeId() || null;
      const mesNum = this.mes();
      const data = await this.matrizService.obtenerRegistrosMatriz(
        empId,
        this.anio(),
        sede,
        mesNum
      );
      this.filas.set(data.filas);
      this.resumen.set(data.resumen);
    } catch (err) {
      console.error('Error cargando matriz de indicadores:', err);
    } finally {
      this.cargando.set(false);
    }
  }

  async inicializarPlantilla(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) return;

    const conf = confirm(
      '¿Desea cargar la plantilla estándar con los 9 indicadores normativos del SG-SST? Se registrarán en la base de datos sin duplicar indicadores ya existentes.'
    );
    if (!conf) return;

    this.inicializando.set(true);
    try {
      const sede = this.sedeId() || null;
      const count = await this.matrizService.inicializarPlantillaEstandar(
        empId,
        this.anio(),
        sede,
        this.mes()
      );
      if (count > 0) {
        alert(`Se registraron ${count} indicadores estándar correctamente.`);
      } else {
        alert('Todos los indicadores estándar ya se encuentran registrados en este periodo.');
      }
      await this.cargarMatriz();
    } catch (err) {
      console.error('Error inicializando plantilla estándar:', err);
      alert('Error al inicializar indicadores en la base de datos.');
    } finally {
      this.inicializando.set(false);
    }
  }

  // ==========================================================================
  // MANEJO DEL MODAL Y CASCADA REACTIVA
  // ==========================================================================

  abrirNuevoIndicador(): void {
    this.modoEdicion.set(false);
    this.idRegistroActual.set(null);
    this.resultadoModal.set(0);
    this.alCambiarTipoEnModal('Accidente de Trabajo (AT)');
    this.modalVisible.set(true);
  }

  abrirEdicionFila(fila: FilaMatrizIndicador): void {
    this.modoEdicion.set(true);
    this.idRegistroActual.set(fila.id);
    this.tipoModal.set(fila.tipo);
    this.nombreModal.set(fila.nombre);
    this.formulaModal.set(fila.formula);
    this.responsableModal.set(fila.responsable);
    this.frecuenciaModal.set(fila.frecuencia === 'Anual' ? 'Anual' : 'Mensual');
    this.metaModal.set(fila.meta);
    this.resultadoModal.set(fila.resultado);
    this.personalConocimientoModal.set(fila.personalConocimiento);
    this.modalVisible.set(true);
  }

  cerrarModal(): void {
    this.modalVisible.set(false);
    this.idRegistroActual.set(null);
  }

  /**
   * Se ejecuta al seleccionar un nuevo Tipo en el Modal.
   * Actualiza el signal tipoModal(), lo cual dispara inmediatamente
   * el cálculo del computed nombresDisponiblesModal().
   */
  alCambiarTipoEnModal(tipo: TipoIndicadorMatriz | string): void {
    const tipoNorm = normalizarTipoIndicador(tipo);
    this.tipoModal.set(tipoNorm);

    const nombres = getNombresPorTipo(tipoNorm);
    if (nombres.length > 0) {
      this.alCambiarNombreEnModal(nombres[0]);
    } else {
      this.nombreModal.set('');
    }
  }

  /**
   * Se ejecuta al seleccionar un Nombre de Indicador en el Modal.
   * Autocompleta los parámetros recomendados del catálogo si aplica.
   */
  alCambiarNombreEnModal(nombre: string): void {
    this.nombreModal.set(nombre);
    const def = getDefinicionPorNombre(nombre);
    if (def) {
      this.formulaModal.set(def.formula);
      this.responsableModal.set(def.responsableDefault);
      this.frecuenciaModal.set(def.frecuencia);
      this.metaModal.set(def.metaDefault);
      this.personalConocimientoModal.set(def.personalConocimiento);
    }
  }

  async guardarIndicador(): Promise<void> {
    const nombreLimpio = this.nombreModal().trim();
    if (!nombreLimpio) {
      alert('Debe seleccionar o indicar el nombre del indicador.');
      return;
    }
    if (!this.formulaModal().trim()) {
      alert('La fórmula o método de cálculo es obligatoria.');
      return;
    }

    // ── ADVERTENCIA Y VALIDACIÓN DE UNICIDAD ─────────────────────────────────
    // Validar que por empresa no puedan haber dos indicadores del mismo nombre
    const duplicado = this.filas().some(f =>
      f.id !== this.idRegistroActual() &&
      f.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()
    );

    if (duplicado) {
      alert(`Advertencia: Ya existe un indicador con el nombre "${nombreLimpio}" registrado para esta empresa. No se permiten indicadores duplicados.`);
      return;
    }

    this.guardando.set(true);
    try {
      const payload: Partial<MatrizIndicadorRegistroDB> = {
        id: this.idRegistroActual() || undefined,
        empresa_id: this.empresaId(),
        sede_id: this.sedeId() || null,
        anio: this.anio(),
        mes: this.mes(),
        tipo: this.tipoModal(),
        nombre: nombreLimpio,
        formula: this.formulaModal().trim(),
        frecuencia: this.frecuenciaModal(),
        meta: Number(this.metaModal()) || 0,
        resultado: Number(this.resultadoModal()) || 0,
        responsable: this.responsableModal().trim(),
        personal_conocimiento: this.personalConocimientoModal().trim(),
        cumplimiento: this.cumplimientoModal()
      };

      await this.matrizService.guardarRegistro(payload);
      this.cerrarModal();
      await this.cargarMatriz();
    } catch (err: any) {
      console.error('Error guardando indicador en la matriz:', err);
      const msg = err?.message || 'Error guardando el indicador en base de datos.';
      alert(msg);
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarFila(fila: FilaMatrizIndicador): Promise<void> {
    const conf = confirm(`¿Está seguro de eliminar el indicador "${fila.nombre}" de la matriz?`);
    if (!conf) return;

    try {
      await this.matrizService.eliminarRegistro(fila.id);
      await this.cargarMatriz();
    } catch (e) {
      console.error('Error eliminando indicador:', e);
      alert('Error al eliminar el indicador.');
    }
  }

  irAModulo(ruta?: string): void {
    if (ruta) {
      this.router.navigateByUrl(ruta);
    }
  }

  async exportarExcel(): Promise<void> {
    this.exportando.set(true);
    try {
      const empNombre = this.empresas().find(e => e.id === this.empresaId())?.nombre || 'Empresa';
      const mesLabel = this.mes() > 0 ? this.mesesNombres.find(m => m.valor === this.mes())?.nombre : undefined;
      await this.matrizService.exportarMatrizExcel(
        this.filas(),
        empNombre,
        this.anio(),
        mesLabel
      );
    } catch (err) {
      console.error('Error exportando matriz a Excel:', err);
      alert('Error generando archivo Excel de la matriz.');
    } finally {
      this.exportando.set(false);
    }
  }

  getTipoBadgeConfig(tipo: TipoIndicadorMatriz | string): {
    icon: string;
    badgeClass: string;
    dotClass: string;
    label: string;
  } {
    const norm = normalizarTipoIndicador(tipo);
    switch (norm) {
      case 'Accidente de Trabajo (AT)':
        return {
          icon: 'bandage-outline',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dotClass: 'bg-rose-400',
          label: 'Accidente de Trabajo (AT)'
        };
      case 'Enfermedad Laboral (EL)':
        return {
          icon: 'medkit-outline',
          badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dotClass: 'bg-purple-400',
          label: 'Enfermedad Laboral (EL)'
        };
      case 'Ausentismo':
        return {
          icon: 'calendar-outline',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dotClass: 'bg-amber-400',
          label: 'Ausentismo'
        };
      case 'Estructura - proceso - Resultado (E-P-R) del SG-SST':
      default:
        return {
          icon: 'shield-checkmark-outline',
          badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          dotClass: 'bg-sky-400',
          label: 'E-P-R del SG-SST'
        };
    }
  }

  getTipoColorClass(tipo: TipoIndicadorMatriz | string): string {
    const norm = normalizarTipoIndicador(tipo);
    switch (norm) {
      case 'Accidente de Trabajo (AT)':
        return 'tipo-at';
      case 'Enfermedad Laboral (EL)':
        return 'tipo-el';
      case 'Ausentismo':
        return 'tipo-aus';
      case 'Estructura - proceso - Resultado (E-P-R) del SG-SST':
      default:
        return 'tipo-epr';
    }
  }

  /**
   * Calcula la diferencia entre resultado y meta para visualización ejecutiva.
   */
  getDeltaResultado(fila: FilaMatrizIndicador): {
    diferencia: number;
    esFavorable: boolean;
    texto: string;
    claseTexto: string;
    claseBadge: string;
    icono: string;
  } {
    const diff = Number((fila.resultado - fila.meta).toFixed(1));
    const esFavorable = diff >= 0;
    const texto = `${diff > 0 ? '+' : ''}${diff}%`;
    return {
      diferencia: diff,
      esFavorable,
      texto,
      claseTexto: esFavorable ? 'text-emerald-400' : 'text-rose-400',
      claseBadge: esFavorable
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icono: esFavorable ? 'trending-up-outline' : 'trending-down-outline'
    };
  }

  /**
   * Calcula el porcentaje visual de la barra de desempeño (0 a 100%).
   */
  getBarraProgreso(fila: FilaMatrizIndicador): number {
    if (fila.meta <= 0) {
      return Math.min(100, Math.max(0, fila.resultado));
    }
    const ratio = (fila.resultado / fila.meta) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  }

  /**
   * Obtiene las iniciales estilizadas del responsable (1 o 2 letras).
   */
  getInicialesResponsable(responsable: string): string {
    if (!responsable || !responsable.trim()) return 'R';
    const partes = responsable.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  /**
   * Configuración de badge de frecuencia de medición.
   */
  getFrecuenciaBadgeConfig(frecuencia: string): {
    icono: string;
    clase: string;
    etiqueta: string;
  } {
    const esMensual = frecuencia === 'Mensual';
    return {
      icono: esMensual ? 'calendar-outline' : 'calendar-number-outline',
      clase: esMensual
        ? 'bg-sky-500/10 text-sky-400 border-sky-500/25 ring-1 ring-sky-500/10'
        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25 ring-1 ring-indigo-500/10',
      etiqueta: frecuencia
    };
  }
}
