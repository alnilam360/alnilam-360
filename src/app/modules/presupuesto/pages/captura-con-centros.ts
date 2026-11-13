import { computed, inject, signal } from '@angular/core';
import { PresupuestoCentroCosto } from '../../../core/models/presupuesto.model';
import { PresupuestoCentroService } from '../../../core/services/presupuesto-centro.service';
import { CapturaBase } from './captura-base';

/** Captura con selector opcional de centro de costo (se carga una vez por empresa). */
export abstract class CapturaConCentros<T extends { id: string }> extends CapturaBase<T> {
  private centroService = inject(PresupuestoCentroService);

  centros = signal<PresupuestoCentroCosto[]>([]);
  nombresCentro = computed(() => new Map(this.centros().map(c => [c.id, c.nombre])));

  override async elegirEmpresa(empresaId: string): Promise<void> {
    try {
      this.centros.set(empresaId ? await this.centroService.listarCentros(empresaId) : []);
    } catch {
      this.centros.set([]); // el selector queda vacío; no bloquea la captura
    }
    await super.elegirEmpresa(empresaId);
  }
}
