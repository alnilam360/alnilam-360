import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    CalificacionEvaluacion,
    CicloPHVA,
    EstandarCatalogo,
    SstEvaluacion,
    SstEvaluacionDetalle
} from '../../../../../core/models/res0312.model';
import { ResEvaluacionesService } from '../../../../../core/services/res-evaluaciones.service';

interface GrupoPHVA {
    ciclo: CicloPHVA;
    icon: string;
    color: string;
    indices: number[];
    expanded: boolean;
    saving: boolean;
}

@Component({
    selector: 'app-evaluacion-detalle',
    templateUrl: './evaluacion-detalle.component.html',
    styleUrls: ['./evaluacion-detalle.component.scss'],
    standalone: false
})
export class EvaluacionDetalleComponent implements OnInit {

    readonly CALIFICACIONES: CalificacionEvaluacion[] = [
        'Cumple Totalmente', 'No Cumple', 'No Aplica'
    ];

    loading = true;
    saving = false;
    finalizando = false;
    errorMsg: string | null = null;
    successMsg: string | null = null;

    evaluacion: SstEvaluacion | null = null;
    detalle: SstEvaluacionDetalle[] = [];
    grupos: GrupoPHVA[] = [];

    form: FormGroup = this.fb.group({
        items: this.fb.array([])
    });

    // Side-panel modo_verificacion
    showInfoPanel = false;
    infoEstandar: EstandarCatalogo | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder,
        private resSvc: ResEvaluacionesService
    ) { }

    get items(): FormArray<FormGroup> {
        return this.form.get('items') as FormArray<FormGroup>;
    }

    async ngOnInit(): Promise<void> {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.errorMsg = 'Identificador de evaluación inválido.';
            this.loading = false;
            return;
        }
        await this.cargar(id);
    }

    async cargar(id: string): Promise<void> {
        this.loading = true;
        this.errorMsg = null;
        try {
            const { evaluacion, detalle } = await this.resSvc.obtenerEvaluacionConDetalle(id);
            this.evaluacion = evaluacion;
            this.detalle = detalle;
            this.construirForm();
        } catch (error: any) {
            console.error('Error cargando evaluación:', error);
            this.errorMsg = error?.message || 'No fue posible cargar la evaluación.';
        } finally {
            this.loading = false;
        }
    }

    private construirForm(): void {
        const arr = this.fb.array<FormGroup>([]);
        const readOnly = this.evaluacion?.estado === 'Finalizado';

        this.detalle.forEach(d => {
            const fg = this.fb.group({
                id: [d.id],
                estandar_id: [d.estandar_id],
                calificacion: [
                    { value: d.calificacion, disabled: readOnly },
                    Validators.required
                ],
                justificacion_no_aplica: [
                    { value: d.justificacion_no_aplica ?? '', disabled: readOnly }
                ],
                evidencia_url: [
                    { value: d.evidencia_url ?? '', disabled: readOnly }
                ],
                observaciones: [
                    { value: d.observaciones ?? '', disabled: readOnly }
                ]
            });
            // Validación condicional: justificacion requerida si "No Aplica"
            fg.get('calificacion')!.valueChanges.subscribe(val => this.sincronizarValidadores(fg, val));
            this.sincronizarValidadores(fg, fg.get('calificacion')!.value as CalificacionEvaluacion | null);
            arr.push(fg);
        });
        this.form.setControl('items', arr);

        // Construye grupos PHVA manteniendo orden canónico
        const orden: CicloPHVA[] = ['Planear', 'Hacer', 'Verificar', 'Actuar'];
        const mapa = new Map<CicloPHVA, number[]>();
        orden.forEach(c => mapa.set(c, []));
        this.detalle.forEach((d, idx) => {
            const ciclo = (d.estandar?.ciclo_phva as CicloPHVA) ?? 'Planear';
            mapa.get(ciclo)!.push(idx);
        });

        const iconosPorCiclo: Record<CicloPHVA, { icon: string; color: string }> = {
            Planear:   { icon: 'compass-outline',      color: 'text-sky-400' },
            Hacer:     { icon: 'construct-outline',    color: 'text-emerald-400' },
            Verificar: { icon: 'checkmark-done-outline', color: 'text-amber-400' },
            Actuar:    { icon: 'refresh-outline',      color: 'text-fuchsia-400' }
        };

        this.grupos = orden
            .map((ciclo, i) => ({
                ciclo,
                icon: iconosPorCiclo[ciclo].icon,
                color: iconosPorCiclo[ciclo].color,
                indices: mapa.get(ciclo)!,
                expanded: i === 0,
                saving: false
            }))
            .filter(g => g.indices.length > 0);
    }

    private sincronizarValidadores(fg: FormGroup, calificacion: CalificacionEvaluacion | null): void {
        const just = fg.get('justificacion_no_aplica');
        if (!just) return;
        if (calificacion === 'No Aplica') {
            just.setValidators([Validators.required, Validators.minLength(5)]);
        } else {
            just.clearValidators();
        }
        just.updateValueAndValidity({ emitEvent: false });
    }

    estandarPorIndice(i: number): EstandarCatalogo | undefined {
        return this.detalle[i]?.estandar;
    }

    toggleGrupo(g: GrupoPHVA): void {
        g.expanded = !g.expanded;
    }

    /** Guarda todos los items de un ciclo PHVA (autoguardado parcial). */
    async guardarGrupo(g: GrupoPHVA): Promise<void> {
        if (this.evaluacion?.estado === 'Finalizado' || g.saving) return;
        g.saving = true;
        this.errorMsg = null;
        try {
            const filas = g.indices.map(i => {
                const v = this.items.at(i).getRawValue();
                return {
                    id: v.id!,
                    calificacion: v.calificacion as CalificacionEvaluacion,
                    justificacion_no_aplica: v.justificacion_no_aplica || null,
                    evidencia_url: v.evidencia_url || null,
                    observaciones: v.observaciones || null
                };
            });
            await this.resSvc.guardarDetalleLote(filas);
            this.successMsg = `Ciclo "${g.ciclo}" guardado (${filas.length} estándares).`;
            setTimeout(() => this.successMsg = null, 3500);
        } catch (error: any) {
            console.error('Error guardando grupo:', error);
            this.errorMsg = error?.message || 'No fue posible guardar el ciclo.';
        } finally {
            g.saving = false;
        }
    }

    /** Guarda todos los ciclos de una vez (usa upsert por id en paralelo). */
    async guardarTodo(): Promise<void> {
        if (this.evaluacion?.estado === 'Finalizado' || this.saving) return;
        this.saving = true;
        this.errorMsg = null;
        try {
            const filas = this.items.controls.map(fg => {
                const v = fg.getRawValue();
                return {
                    id: v.id!,
                    calificacion: v.calificacion as CalificacionEvaluacion,
                    justificacion_no_aplica: v.justificacion_no_aplica || null,
                    evidencia_url: v.evidencia_url || null,
                    observaciones: v.observaciones || null
                };
            });
            await this.resSvc.guardarDetalleLote(filas);
            this.successMsg = 'Borrador guardado correctamente.';
            setTimeout(() => this.successMsg = null, 3500);
        } catch (error: any) {
            console.error('Error guardando todo:', error);
            this.errorMsg = error?.message || 'No fue posible guardar la evaluación.';
        } finally {
            this.saving = false;
        }
    }

    async finalizar(): Promise<void> {
        if (!this.evaluacion || this.finalizando) return;
        if (this.form.invalid) {
            this.errorMsg = 'Complete la calificación de todos los estándares (y justifique los "No Aplica") antes de finalizar.';
            this.form.markAllAsTouched();
            return;
        }
        if (!confirm('Al finalizar la evaluación ya no podrá editarla. ¿Desea continuar?')) return;

        this.finalizando = true;
        this.errorMsg = null;
        try {
            await this.guardarTodo();
            const cab = await this.resSvc.finalizarEvaluacion(this.evaluacion.id!);
            this.evaluacion = { ...this.evaluacion, ...cab };
            this.construirForm();
            this.successMsg = `Evaluación finalizada. Puntaje: ${cab.puntaje_total}%`;
            setTimeout(() => this.successMsg = null, 4000);
        } catch (error: any) {
            console.error('Error finalizando evaluación:', error);
            this.errorMsg = error?.message || 'No fue posible finalizar la evaluación.';
        } finally {
            this.finalizando = false;
        }
    }

    abrirInfo(i: number): void {
        this.infoEstandar = this.detalle[i]?.estandar ?? null;
        this.showInfoPanel = !!this.infoEstandar;
    }

    cerrarInfo(): void {
        this.showInfoPanel = false;
        this.infoEstandar = null;
    }

    volver(): void {
        this.router.navigate(['/gestion-sst/evaluaciones']);
    }

    // Progreso del ciclo: cuántos ya tienen calificación
    progresoGrupo(g: GrupoPHVA): { completos: number; total: number } {
        const total = g.indices.length;
        const completos = g.indices.filter(i => !!this.items.at(i)?.get('calificacion')?.value).length;
        return { completos, total };
    }

    isReadOnly(): boolean {
        return this.evaluacion?.estado === 'Finalizado';
    }
}
