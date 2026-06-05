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
    pasos = ['Contexto', 'Peligro', 'Controles', 'Criterios de Control', 'Medidas de Intervención', 'Evaluación'];

    opcionesND = OPCIONES_ND;
    opcionesNE = OPCIONES_NE;
    opcionesNC = OPCIONES_NC;

    peligrosAgrupados: { clasificacion: string; items: PeligroCatalogo[] }[] = [];
    peligrosTodos: PeligroCatalogo[] = [];

    // Cálculos reactivos
    np = 0;
    nr = 0;
    interpretacionNp = '';
    nivelIntervencion: NivelIntervencion | '' = '';
    aceptabilidad: Aceptabilidad | '' = '';

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
            // Paso 1: Peligro
            peligro_id: [null, Validators.required],
            efectos_posibles: [''],
            // Paso 2: Controles existentes
            control_fuente: [''],
            control_medio: [''],
            control_individuo: [''],
            // Paso 3: Criterios para establecer controles
            expuestos_directos: [0],
            contratistas: [0],
            requisitos_legales: [false],
            // Paso 4: Medidas de intervención (jerarquía de controles)
            eliminacion: [''],
            sustitucion: [''],
            controles_ingenieria: [''],
            controles_administrativos: [''],
            epp: [''],
            // Paso 5: Evaluación
            nivel_deficiencia: [10, Validators.required],
            nivel_exposicion: [1, Validators.required],
            nivel_consecuencia: [10, Validators.required],
            medidas_intervencion: ['']
        });
    }

    private suscribirCalculos(): void {
        this.subs.add(
            this.form.valueChanges.subscribe(() => this.recalcular())
        );
    }

    recalcular(): void {
        const nd = this.form.get('nivel_deficiencia')?.value as NivelDeficiencia;
        const ne = this.form.get('nivel_exposicion')?.value as NivelExposicion;
        const nc = this.form.get('nivel_consecuencia')?.value as NivelConsecuencia;
        if (nd == null || ne == null || nc == null) return;

        const result = this.svc.evaluarRiesgo(nd, ne, nc);
        this.np = result.np;
        this.nr = result.nr;
        this.interpretacionNp = result.interpretacionNp;
        this.nivelIntervencion = result.nivelIntervencion;
        this.aceptabilidad = result.aceptabilidad;
    }

    private async inicializar(): Promise<void> {
        this.loading = true;
        try {
            await this.auth.waitForReady();
            await this.auth.waitForProfile();

            // Cargar catálogo de peligros
            this.peligrosTodos = await this.svc.listarPeligros();
            this.peligrosAgrupados = this.svc.agruparPeligros(this.peligrosTodos);

            // Determinar empresa
            this.empresaId = this.route.snapshot.queryParamMap.get('empresa')
                ?? await this.svc.getEmpresaTenantId();

            // Modo edición
            this.registroId = this.route.snapshot.paramMap.get('id') ?? null;
            if (this.registroId) {
                this.modoEdicion = true;
                const reg = await this.svc.obtenerPorId(this.registroId);
                if (reg) {
                    this.empresaId = reg.empresa_id;
                    this.form.patchValue({
                        proceso: reg.proceso,
                        zona_lugar: reg.zona_lugar,
                        actividad: reg.actividad,
                        es_rutinaria: reg.es_rutinaria,
                        tareas: reg.tareas,
                        cargo: reg.cargo,
                        peligro_id: reg.peligro_id,
                        efectos_posibles: reg.efectos_posibles,
                        control_fuente: reg.control_fuente,
                        control_medio: reg.control_medio,
                        control_individuo: reg.control_individuo,
                        expuestos_directos: reg.expuestos_directos ?? 0,
                        contratistas: reg.contratistas ?? 0,
                        requisitos_legales: reg.requisitos_legales ?? false,
                        eliminacion: reg.eliminacion,
                        sustitucion: reg.sustitucion,
                        controles_ingenieria: reg.controles_ingenieria,
                        controles_administrativos: reg.controles_administrativos,
                        epp: reg.epp,
                        nivel_deficiencia: reg.nivel_deficiencia,
                        nivel_exposicion: reg.nivel_exposicion,
                        nivel_consecuencia: reg.nivel_consecuencia,
                        medidas_intervencion: reg.medidas_intervencion
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

    // ========================================================================
    // Navegación stepper
    // ========================================================================

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
            case 1: return !!this.form.get('peligro_id')?.value;
            case 2: return true; // controles existentes son opcionales
            case 3: return true; // criterios de control son opcionales
            case 4: return true; // medidas de intervención son opcionales
            case 5: return this.form.get('nivel_deficiencia')?.valid && this.form.get('nivel_exposicion')?.valid && this.form.get('nivel_consecuencia')?.valid ? true : false;
            default: return false;
        }
    }

    // ========================================================================
    // Peligro seleccionado
    // ========================================================================

    onPeligroSeleccionado(peligroId: string): void {
        const peligro = this.peligrosTodos.find(p => p.id === peligroId);
        if (peligro) {
            this.form.patchValue({ efectos_posibles: peligro.efectos_posibles ?? '' });
        }
    }

    // ========================================================================
    // Guardar
    // ========================================================================

    async guardar(): Promise<void> {
        if (!this.empresaId) { this.errorMsg = 'No se pudo determinar la empresa.'; return; }
        this.saving = true;
        this.errorMsg = null;

        const perfil = this.auth.currentPerfil;
        const val = this.form.value;

        const payload: any = {
            empresa_id: this.empresaId,
            proceso: val.proceso,
            zona_lugar: val.zona_lugar || null,
            actividad: val.actividad,
            es_rutinaria: val.es_rutinaria,
            tareas: val.tareas || null,
            cargo: val.cargo || null,
            peligro_id: val.peligro_id,
            peligro_descripcion: this.peligrosTodos.find(p => p.id === val.peligro_id)?.descripcion ?? null,
            efectos_posibles: val.efectos_posibles || null,
            control_fuente: val.control_fuente || null,
            control_medio: val.control_medio || null,
            control_individuo: val.control_individuo || null,
            expuestos_directos: val.expuestos_directos ?? 0,
            contratistas: val.contratistas ?? 0,
            requisitos_legales: val.requisitos_legales ?? false,
            eliminacion: val.eliminacion || null,
            sustitucion: val.sustitucion || null,
            controles_ingenieria: val.controles_ingenieria || null,
            controles_administrativos: val.controles_administrativos || null,
            epp: val.epp || null,
            nivel_deficiencia: Number(val.nivel_deficiencia),
            nivel_exposicion: Number(val.nivel_exposicion),
            nivel_consecuencia: Number(val.nivel_consecuencia),
            interpretacion_np: this.interpretacionNp,
            nivel_intervencion: this.nivelIntervencion || null,
            aceptabilidad: this.aceptabilidad || null,
            medidas_intervencion: val.medidas_intervencion || null,
            creado_por: perfil?.id ?? null
        };

        try {
            if (this.modoEdicion && this.registroId) {
                await this.svc.actualizar(this.registroId, payload);
            } else {
                await this.svc.crear(payload);
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

    // Helpers UI
    colorNivel(nivel: string): string { return this.svc.colorNivel(nivel as NivelIntervencion); }

    semaforoClasses(): string {
        switch (this.nivelIntervencion) {
            case 'I': return 'bg-red-500/15 text-red-400 border-red-500/30';
            case 'II': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
            case 'III': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
            case 'IV': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            default: return 'bg-dark-accent text-dark-text border-dark-border';
        }
    }
}
