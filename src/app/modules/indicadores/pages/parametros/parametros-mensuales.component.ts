import { Component, Input, OnInit, signal } from '@angular/core';
import { MatrizAtCasoService } from '../../../../core/services/matriz-at-caso.service';
import { ParametrosMensuales, MESES_LABELS } from '../../../../core/models/matriz-at.model';

@Component({
  selector: 'app-parametros-mensuales',
  standalone: false,
  templateUrl: './parametros-mensuales.component.html',
})
export class ParametrosMensualesComponent implements OnInit {
  private _empresaId: string | null = null;
  @Input() set empresaId(id: string | null) { this._empresaId = id; if (this.iniciado) this.cargar(); }
  get empresaId() { return this._empresaId; }

  private _anio = new Date().getFullYear();
  @Input() set anio(a: number) { this._anio = a; if (this.iniciado) this.cargar(); }
  get anio() { return this._anio; }

  readonly meses = MESES_LABELS;
  readonly loading = signal(false);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly ok = signal(false);

  filas: ParametrosMensuales[] = [];
  private iniciado = false;

  constructor(private svc: MatrizAtCasoService) {}

  async ngOnInit(): Promise<void> {
    this.iniciado = true;
    await this.cargar();
  }

  async cargar(): Promise<void> {
    if (!this._empresaId) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const existentes = await this.svc.getParametros(this._empresaId, this._anio);
      this.filas = Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1;
        return existentes.find((e) => e.mes === mes) ?? {
          empresa_id: this._empresaId!, anio: this._anio, mes,
          numero_trabajadores: 0, horas_hombre: null,
          meta_if: null, meta_is: null, meta_severidad: null, meta_tasa_accidentalidad: null,
        };
      });
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudieron cargar los parámetros.');
    } finally {
      this.loading.set(false);
    }
  }

  copiarTrabajadoresATodos(): void {
    const v = this.filas[0]?.numero_trabajadores ?? 0;
    this.filas.forEach((f) => (f.numero_trabajadores = v));
  }

  copiarMetasATodos(): void {
    const m = this.filas[0];
    if (!m) return;
    this.filas.forEach((f) => {
      f.meta_if = m.meta_if; f.meta_is = m.meta_is;
      f.meta_severidad = m.meta_severidad; f.meta_tasa_accidentalidad = m.meta_tasa_accidentalidad;
    });
  }

  async guardar(): Promise<void> {
    if (!this._empresaId) return;
    this.guardando.set(true);
    this.error.set(null);
    this.ok.set(false);
    try {
      for (const f of this.filas) await this.svc.upsertParametro(f);
      this.ok.set(true);
      setTimeout(() => this.ok.set(false), 2500);
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudieron guardar los parámetros.');
    } finally {
      this.guardando.set(false);
    }
  }
}
