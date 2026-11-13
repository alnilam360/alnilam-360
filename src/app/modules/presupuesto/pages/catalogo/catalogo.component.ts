import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PresupuestoService } from '../../../../core/services/presupuesto.service';
import { PresupuestoRubro, PresupuestoSubrubro } from '../../../../core/models/presupuesto.model';

interface RubroConHijos extends PresupuestoRubro { subrubros: PresupuestoSubrubro[]; }

@Component({
  selector: 'app-presupuesto-catalogo',
  standalone: false,
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CatalogoComponent implements OnInit {
  private service = inject(PresupuestoService);

  cargando = signal(true);
  error = signal<string | null>(null);
  arbol = signal<RubroConHijos[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const [rubros, subs] = await Promise.all([this.service.getRubros(), this.service.getSubrubros()]);
      this.arbol.set(rubros.map(r => ({ ...r, subrubros: subs.filter(s => s.rubro_codigo === r.codigo) })));
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo cargar el catálogo');
    }
    this.cargando.set(false);
  }
}
