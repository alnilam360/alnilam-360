import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { IpercService } from '../../../../../core/services/iperc.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
    PeligroCatalogo, MatrizIperc,
    NivelDeficiencia, NivelExposicion, NivelConsecuencia,
    NivelIntervencion, Aceptabilidad,
    OPCIONES_ND, OPCIONES_NE, OPCIONES_NC
} from '../../../../../core/models/iperc.model';

@Component({
    selector: 'app-iperc-form',
    templateUrl: './iperc-form.component.html',
    styleUrls: ['./iperc-form.component.scss'],
    standalone: false
})
export class IpercFormComponent implements OnInit, OnDestroy {

    form!: FormGroup;
    pasoActivo = 0;
    pasos = [
        'Contexto',
        'Peligro',
        'Controles Existentes',
        'Evaluación del Riesgo',
        'Criterios Control',
        'Medidas de Intervención',
        'Evaluación Post-Controles',
        'Actualización'
    ];

    fechaActualizacion = new Date();

    opcionesND = OPCIONES_ND;
    opcionesNE = OPCIONES_NE;
    opcionesNC = OPCIONES_NC;

    // Catálogo con cascada: clasificación → peligro específico
    peligrosTodos: PeligroCatalogo[] = [];
    clasificaciones: string[] = [];
    clasificacionSeleccionada: string | null = null;
    peligrosFiltrados: PeligroCatalogo[] = [];

    // Cálculos reactivos — evaluación inicial (Paso 3)
    np = 0;
    nr = 0;
    interpretacionNp = '';
    nivelIntervencion: NivelIntervencion | '' = '';
    aceptabilidad: Aceptabilidad | '' = '';

    // Cálculos reactivos — evaluación post-controles (Paso 7)
    npPost = 0;
    nrPost = 0;
    interpretacionNpPost = '';
    nivelIntervencionPost: NivelIntervencion | '' = '';
    aceptabilidadPost: Aceptabilidad | '' = '';
    factorReduccion: number | null = null;

    // Derivados de UI
    totalExpuestos = 0;

    loading = true;
    saving = false;
    errorMsg: string | null = null;
    modoEdicion = false;
    registroId: string | null = null;
    empresaId: string | null = null;

    private subs = new Subscription();

    constructor(
        private fb: FormBuilder,
        private svc: IpercService,
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router
    ) { }

    async ngOnInit(): Promise<void> {
        this.buildForm();
        this.suscribirCalculos();
        await this.inicializar();
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    private buildForm(): void {
        this.form = this.fb.group({
            // Paso 0: Contexto
            proceso: ['', Validators.required],
            zona_lugar: [''],
            actividad: ['', Validators.required],
            es_rutinaria: [true],
            tareas: [''],
            cargo: [''],
            // Paso 1: Peligro (clasificacion_peligro es estado del componente, no FormControl)
            peligro_id: [null, Validators.required],
            fuente_peligro: [''],
            efectos_posibles: [''],
            // Paso 2: Controles existentes
            control_fuente: [''],
            control_medio: [''],
            control_individuo: [''],
            // Paso 3: Evaluación del riesgo (inicial)
            nivel_deficiencia: [10, Validators.required],
            nivel_exposicion: [1, Validators.required],
            nivel_consecuencia: [10, Validators.required],
            // Paso 4: Valoración de expuestos
            expuestos_directos: [0],
            expuestos_temporales: [0],
            expuestos_contratistas: [0],
            expuestos_visitantes: [0],
            horas_exposicion: [null],
            peor_consecuencia: [''],
            requisitos_legales: [false],
            // Paso 5: Criterios para establecer controles
            eliminacion: [''],
            sustitucion: [''],
            controles_ingenieria: [''],
            controles_administrativos: [''],
            epp: [''],
            // Paso 6: Evaluación post-controles
            nd_post: [null],
            ne_post: [null],
            nc_post: [null],
            // Paso 7: Actualización
            actualizacion_nota: [''],
        });
    }

    private suscribirCalculos(): void {
        this.subs.add(
            this.form.valueChanges.subscribe(() => this.recalcular())
        );
    }

    recalcular(): void {
        // Evaluación inicial
        const nd = this.form.get('nivel_deficiencia')?.value as NivelDeficiencia;
        const ne = this.form.get('nivel_exposicion')?.value as NivelExposicion;
        const nc = this.form.get('nivel_consecuencia')?.value as NivelConsecuencia;
        if (nd != null && ne != null && nc != null) {
            const r = this.svc.evaluarRiesgo(nd, ne, nc);
            this.np = r.np;
            this.nr = r.nr;
            this.interpretacionNp = r.interpretacionNp;
            this.nivelIntervencion = r.nivelIntervencion;
            this.aceptabilidad = r.aceptabilidad;
        }

        // Evaluación post-controles
        const ndp = this.form.get('nd_post')?.value as NivelDeficiencia | null;
        const nep = this.form.get('ne_post')?.value as NivelExposicion | null;
        const ncp = this.form.get('nc_post')?.value as NivelConsecuencia | null;
        if (ndp != null && nep != null && ncp != null) {
            const rp = this.svc.evaluarRiesgo(ndp, nep, ncp);
            this.npPost = rp.np;
            this.nrPost = rp.nr;
            this.interpretacionNpPost = rp.interpretacionNp;
            this.nivelIntervencionPost = rp.nivelIntervencion;
            this.aceptabilidadPost = rp.aceptabilidad;
            this.factorReduccion = this.nr > 0
                ? ((this.nr - this.nrPost) / this.nr) * 100
                : null;
        } else {
            this.npPost = 0;
            this.nrPost = 0;
            this.interpretacionNpPost = '';
            this.nivelIntervencionPost = '';
            this.aceptabilidadPost = '';
            this.factorReduccion = null;
        }

        // Total expuestos
        const d = +(this.form.get('expuestos_directos')?.value ?? 0);
        const t = +(this.form.get('expuestos_temporales')?.value ?? 0);
        const c = +(this.form.get('expuestos_contratistas')?.value ?? 0);
        const v = +(this.form.get('expuestos_visitantes')?.value ?? 0);
        this.totalExpuestos = d + t + c + v;
    }

    private async inicializar(): Promise<void> {
        this.loading = true;
        try {
            await this.auth.waitForReady();
            await this.auth.waitForProfile();

            this.peligrosTodos = await this.svc.listarPeligros();
            const grupos = this.svc.agruparPeligros(this.peligrosTodos);
            this.clasificaciones = grupos.map(g => g.clasificacion);

            this.empresaId = this.route.snapshot.queryParamMap.get('empresa')
                ?? await this.svc.getEmpresaTenantId();

            this.registroId = this.route.snapshot.paramMap.get('id') ?? null;
            if (this.registroId) {
                this.modoEdicion = true;
                const reg = await this.svc.obtenerPorId(this.registroId);
                if (reg) {
                    this.empresaId = reg.empresa_id;

                    // Restaurar cascada de clasificación
                    const clasi = reg.peligro?.clasificacion
                        ?? this.peligrosTodos.find(p => p.id === reg.peligro_id)?.clasificacion
                        ?? null;
                    if (clasi) {
                        this.clasificacionSeleccionada = clasi;
                        this.peligrosFiltrados = this.peligrosTodos.filter(p => p.clasificacion === clasi);
                    }

                    this.form.patchValue({
                        proceso: reg.proceso,
                        zona_lugar: reg.zona_lugar,
                        actividad: reg.actividad,
                        es_rutinaria: reg.es_rutinaria,
                        tareas: reg.tareas,
                        cargo: reg.cargo,
                        peligro_id: reg.peligro_id,
                        fuente_peligro: reg.fuente_peligro,
                        efectos_posibles: reg.efectos_posibles,
                        control_fuente: reg.control_fuente,
                        control_medio: reg.control_medio,
                        control_individuo: reg.control_individuo,
                        nivel_deficiencia: reg.nivel_deficiencia,
                        nivel_exposicion: reg.nivel_exposicion,
                        nivel_consecuencia: reg.nivel_consecuencia,
                        expuestos_directos: reg.expuestos_directos ?? 0,
                        expuestos_temporales: reg.expuestos_temporales ?? 0,
                        expuestos_contratistas: reg.expuestos_contratistas ?? 0,
                        expuestos_visitantes: reg.expuestos_visitantes ?? 0,
                        horas_exposicion: reg.horas_exposicion ?? null,
                        peor_consecuencia: reg.peor_consecuencia,
                        requisitos_legales: reg.requisitos_legales ?? false,
                        eliminacion: reg.eliminacion,
                        sustitucion: reg.sustitucion,
                        controles_ingenieria: reg.controles_ingenieria,
                        controles_administrativos: reg.controles_administrativos,
                        epp: reg.epp,
                        nd_post: reg.nd_post ?? null,
                        ne_post: reg.ne_post ?? null,
                        nc_post: reg.nc_post ?? null,
                        actualizacion_nota: reg.actualizacion_nota ?? '',
                    });
                }
            }

            this.recalcular();
        } catch (err: any) {
            this.errorMsg = err?.message ?? 'Error inicializando formulario.';
        } finally {
            this.loading = false;
        }
    }

    // ── Navegación stepper ───────────────────────────────────────
    irPaso(paso: number): void {
        if (paso >= 0 && paso < this.pasos.length) this.pasoActivo = paso;
    }
    siguiente(): void {
        if (this.pasoActivo < this.pasos.length - 1) this.pasoActivo++;
    }
    anterior(): void {
        if (this.pasoActivo > 0) this.pasoActivo--;
    }

    pasoValido(paso: number): boolean {
        switch (paso) {
            case 0: return !!(this.form.get('proceso')?.value && this.form.get('actividad')?.value);
            case 1: return !!this.clasificacionSeleccionada && !!this.form.get('peligro_id')?.value;
            case 2: return true;
            case 3: return !!(
                this.form.get('nivel_deficiencia')?.valid &&
                this.form.get('nivel_exposicion')?.valid &&
                this.form.get('nivel_consecuencia')?.valid
            );
            case 4: return true;
            case 5: return true;
            case 6: return true;
            case 7: return true;
            default: return false;
        }
    }

    // ── Cascada clasificación → peligro ─────────────────────────
    onClasificacionCambiada(valor: string): void {
        const clasi = valor || null;
        this.clasificacionSeleccionada = clasi;
        this.peligrosFiltrados = clasi
            ? this.peligrosTodos.filter(p => p.clasificacion === clasi)
            : [];
        this.form.patchValue({ peligro_id: null, efectos_posibles: '' });
    }

    onPeligroSeleccionado(peligroId: string): void {
        const peligro = this.peligrosTodos.find(p => p.id === peligroId);
        if (peligro) {
            this.form.patchValue({ efectos_posibles: peligro.efectos_posibles ?? '' });
        }
    }

    // ── Guardar ─────────────────────────────────────────────────
    async guardar(): Promise<void> {
        if (!this.empresaId) { this.errorMsg = 'No se pudo determinar la empresa.'; return; }
        this.saving = true;
        this.errorMsg = null;

        const perfil = this.auth.currentPerfil;
        const val = this.form.value;
        const peligroDesc = this.peligrosTodos.find(p => p.id === val.peligro_id)?.descripcion ?? null;

        const ndp: NivelDeficiencia | null = val.nd_post ?? null;
        const nep: NivelExposicion | null = val.ne_post ?? null;
        const ncp: NivelConsecuencia | null = val.nc_post ?? null;
        const hayEvalPost = ndp != null && nep != null && ncp != null;

        const payload: any = {
            empresa_id: this.empresaId,
            // Paso 0: Contexto
            proceso: val.proceso,
            zona_lugar: val.zona_lugar || null,
            actividad: val.actividad,
            es_rutinaria: val.es_rutinaria,
            tareas: val.tareas || null,
            cargo: val.cargo || null,
            // Paso 1: Peligro
            peligro_id: val.peligro_id,
            peligro_descripcion: peligroDesc,
            fuente_peligro: val.fuente_peligro || null,
            efectos_posibles: val.efectos_posibles || null,
            // Paso 2: Controles existentes
            control_fuente: val.control_fuente || null,
            control_medio: val.control_medio || null,
            control_individuo: val.control_individuo || null,
            // Paso 3: Evaluación del riesgo
            nivel_deficiencia: Number(val.nivel_deficiencia),
            nivel_exposicion: Number(val.nivel_exposicion),
            nivel_consecuencia: Number(val.nivel_consecuencia),
            interpretacion_np: this.interpretacionNp,
            nivel_intervencion: this.nivelIntervencion || null,
            aceptabilidad: this.aceptabilidad || null,
            // Paso 4: Criterios Control (personal expuesto)
            expuestos_directos: val.expuestos_directos ?? 0,
            expuestos_temporales: val.expuestos_temporales ?? 0,
            expuestos_contratistas: val.expuestos_contratistas ?? 0,
            expuestos_visitantes: val.expuestos_visitantes ?? 0,
            horas_exposicion: val.horas_exposicion ?? null,
            peor_consecuencia: val.peor_consecuencia || null,
            requisitos_legales: val.requisitos_legales ?? false,
            // Paso 5: Medidas de Intervención (jerarquía de controles)
            eliminacion: val.eliminacion || null,
            sustitucion: val.sustitucion || null,
            controles_ingenieria: val.controles_ingenieria || null,
            controles_administrativos: val.controles_administrativos || null,
            epp: val.epp || null,
            // Paso 6: Evaluación post-controles
            nd_post: ndp,
            ne_post: nep,
            nc_post: ncp,
            interpretacion_np_post: hayEvalPost ? this.interpretacionNpPost : null,
            nivel_intervencion_post: hayEvalPost ? (this.nivelIntervencionPost || null) : null,
            aceptabilidad_post: hayEvalPost ? (this.aceptabilidadPost || null) : null,
            factor_reduccion: this.factorReduccion,
            // Paso 7: Actualización
            actualizacion_nota: val.actualizacion_nota || null,
            creado_por: perfil?.id ?? null,
        };

        try {
            const nivelLabel = `Nivel ${this.nivelIntervencion} · NR ${this.nr}`;

            if (this.modoEdicion && this.registroId) {
                await this.svc.actualizar(this.registroId, payload);
                await this.svc.registrarCambio({
                    empresa_id: this.empresaId!,
                    registro_id: this.registroId,
                    descripcion: `Actualizado: [${val.proceso}] ${peligroDesc} · ${nivelLabel}`
                }).catch(() => {});
            } else {
                const nuevo = await this.svc.crear(payload);
                await this.svc.registrarCambio({
                    empresa_id: this.empresaId!,
                    registro_id: nuevo.id ?? null,
                    descripcion: `Creado: [${val.proceso}] ${peligroDesc} · ${nivelLabel}`
                }).catch(() => {});
            }
            this.router.navigate(['/gestion-sst/matriz-iperc']);
        } catch (err: any) {
            this.errorMsg = err?.message ?? 'Error guardando.';
        } finally {
            this.saving = false;
        }
    }

    cancelar(): void {
        this.router.navigate(['/gestion-sst/matriz-iperc']);
    }

    // ── Helpers UI ───────────────────────────────────────────────
    colorNivel(nivel: string): string { return this.svc.colorNivel(nivel as NivelIntervencion); }

    semaforoClasses(nivel?: NivelIntervencion | ''): string {
        const n = nivel !== undefined ? nivel : this.nivelIntervencion;
        switch (n) {
            case 'I':   return 'bg-red-500/15 text-red-400 border-red-500/30';
            case 'II':  return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
            case 'III': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
            case 'IV':  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            default:    return 'bg-dark-accent text-dark-text border-dark-border';
        }
    }

    semaforoClassesPost(): string {
        return this.semaforoClasses(this.nivelIntervencionPost);
    }

    get npPostParcial(): number {
        const nd = this.form.get('nd_post')?.value ?? 0;
        const ne = this.form.get('ne_post')?.value ?? 0;
        return (nd as number) * (ne as number);
    }

    get npPostParcialInterpretacion(): string {
        return this.svc.interpretarNP(this.npPostParcial);
    }

    get mostrarResultadosPost(): boolean {
        const nd = this.form.get('nd_post')?.value;
        const ne = this.form.get('ne_post')?.value;
        const nc = this.form.get('nc_post')?.value;
        return nd !== null && ne !== null && nc !== null;
    }

    get ndNePostSeleccionados(): boolean {
        const nd = this.form.get('nd_post')?.value;
        const ne = this.form.get('ne_post')?.value;
        return nd !== null && ne !== null;
    }
}
