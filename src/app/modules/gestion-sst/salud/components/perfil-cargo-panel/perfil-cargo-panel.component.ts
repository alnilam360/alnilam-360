import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { SaludService } from '../../services/salud.service';
import { SaludPerfilCargoRow } from '../../../../../core/models/salud.model';

@Component({
  selector: 'app-perfil-cargo-panel',
  templateUrl: './perfil-cargo-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class PerfilCargoPanelComponent implements OnChanges {
  @Input() cargo = '';

  private svc = inject(SaludService);
  private cdr = inject(ChangeDetectorRef);

  texto = '';
  filas: SaludPerfilCargoRow[] = [];
  loading = false;
  consultado = false;
  errorMsg: string | null = null;

  ngOnChanges(): void {
    this.texto = this.cargo;
    if (this.cargo.trim()) void this.consultar();
  }

  async consultar(): Promise<void> {
    const cargo = this.texto.trim();
    if (!cargo || this.loading) return;
    this.loading = true; this.errorMsg = null;
    try {
      this.filas = await this.svc.getPerfilCargo(cargo);
      this.consultado = true;
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error consultando el perfil del cargo.';
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  trackByPeligro(i: number, f: SaludPerfilCargoRow): string { return f.peligro_id ?? String(i); }
}
