import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CargosService } from '../../../../core/services/cargos.service';
import { Cargo } from '../../../../core/models/models';

@Component({
    selector: 'app-cargos',
    templateUrl: './cargos.component.html',
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class CargosComponent implements OnInit {
    cargos: Cargo[] = [];
    cargando = true;
    errorCarga: string | null = null;
    errorForm: string | null = null;
    guardando = false;
    editando: Cargo | null = null;
    porEliminar: Cargo | null = null;

    form = new FormGroup({
        nombre: new FormControl<string>('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]
        })
    });

    private cargosService = inject(CargosService);
    private cdr = inject(ChangeDetectorRef);

    ngOnInit(): void { void this.cargar(); }

    trackById = (_: number, c: Cargo) => c.id;

    async cargar(): Promise<void> {
        this.cargando = true;
        this.errorCarga = null;
        try {
            this.cargos = await this.cargosService.listar(true);
        } catch (e) {
            this.errorCarga = this.mensaje(e);
        } finally {
            this.cargando = false;
            this.cdr.detectChanges();
        }
    }

    editar(c: Cargo): void {
        this.editando = c;
        this.errorForm = null;
        this.form.setValue({ nombre: c.nombre });
    }

    cancelarEdicion(): void {
        this.editando = null;
        this.errorForm = null;
        this.form.reset({ nombre: '' });
    }

    async guardar(): Promise<void> {
        if (this.form.invalid || this.guardando) return;
        const nombre = this.form.controls.nombre.value.trim();
        this.guardando = true;
        this.errorForm = null;
        try {
            if (this.editando) await this.cargosService.renombrar(this.editando.id, nombre);
            else await this.cargosService.crear(nombre);
            this.cancelarEdicion();
            await this.cargar();
        } catch (e) {
            this.errorForm = this.mensaje(e);
        } finally {
            this.guardando = false;
            this.cdr.detectChanges();
        }
    }

    async alternarActivo(c: Cargo): Promise<void> {
        await this.accion(() => this.cargosService.setActivo(c.id, !c.activo));
    }

    async confirmarEliminar(): Promise<void> {
        const c = this.porEliminar;
        if (!c) return;
        await this.accion(() => this.cargosService.eliminar(c.id));
        this.porEliminar = null;
        this.cdr.detectChanges();
    }

    private async accion(fn: () => Promise<void>): Promise<void> {
        if (this.guardando) return;
        this.guardando = true;
        this.errorForm = null;
        try {
            await fn();
            await this.cargar();
        } catch (e) {
            this.errorForm = this.mensaje(e);
        } finally {
            this.guardando = false;
            this.cdr.detectChanges();
        }
    }

    private mensaje(e: unknown): string {
        return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error inesperado';
    }
}
