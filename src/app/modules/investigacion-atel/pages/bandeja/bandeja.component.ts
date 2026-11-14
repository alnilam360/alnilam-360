import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { InvestigacionAtelService } from '../../../../core/services/investigacion-atel.service';
import { Empresa } from '../../../../core/models/models';
import { InvestigacionPendiente } from '../../../../core/models/matriz-at.model';

type Estado = InvestigacionPendiente['estado_investigar'];
type Filtro = 'todos' | Estado;

const BADGE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ';
const ETIQUETAS: Record<Estado, string> = { en_plazo: 'En plazo', fuera_de_plazo: 'Fuera de plazo', completa: 'Completa' };

@Component({
  selector: 'app-investigacion-atel-bandeja',
  standalone: false,
  templateUrl: './bandeja.component.html',
  styleUrls: ['./bandeja.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class BandejaComponent implements OnInit {
  private service = inject(InvestigacionAtelService);

  readonly trackById = (_: number, c: InvestigacionPendiente) => c.caso_id;
  readonly filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'en_plazo', etiqueta: 'En plazo' },
    { valor: 'fuera_de_plazo', etiqueta: 'Fuera de plazo' },
    { valor: 'completa', etiqueta: 'Completas' },
  ];
  cargando = signal(true);
  error = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  casos = signal<InvestigacionPendiente[]>([]);
  filtro = signal<Filtro>('todos');

  visibles = computed(() => {
    const f = this.filtro();
    return f === 'todos' ? this.casos() : this.casos().filter(c => c.estado_investigar === f);
  });
  conteos = computed(() => {
    const t: Record<Filtro, number> = { todos: 0, en_plazo: 0, fuera_de_plazo: 0, completa: 0 };
    for (const c of this.casos()) { t.todos++; t[c.estado_investigar]++; }
    return t;
  });

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.cargar(ctx.empresaId);
    } catch (e) {
      this.fallar(e);
    }
  }

  async cargar(empresaId: string): Promise<void> {
    this.empresaId.set(empresaId);
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.casos.set(empresaId ? await this.service.getPendientes(empresaId) : []);
      this.cargando.set(false);
    } catch (e) {
      this.fallar(e);
    }
  }

  etiqueta(estado: Estado | null): string { return estado ? ETIQUETAS[estado] : '—'; }

  claseInvestigar(estado: Estado): string {
    const c = { en_plazo: 'bg-emerald-500/20 text-emerald-400', fuera_de_plazo: 'bg-rose-500/20 text-rose-400', completa: 'bg-slate-500/20 text-slate-400' };
    return BADGE + c[estado];
  }

  claseRemitir(estado: Estado | null): string {
    const c = { en_plazo: 'bg-amber-500/20 text-amber-400', fuera_de_plazo: 'bg-rose-500/20 text-rose-400', completa: 'bg-slate-500/20 text-slate-400' };
    return BADGE + (estado ? c[estado] : c.completa);
  }

  gravedad(c: InvestigacionPendiente): { texto: string; clase: string } {
    if (c.causo_muerte) return { texto: 'Mortal', clase: BADGE + 'bg-rose-500/20 text-rose-400' };
    if (c.es_grave_o_mortal) return { texto: 'Grave', clase: BADGE + 'bg-amber-500/20 text-amber-400' };
    return { texto: c.clasificacion_gravedad ?? 'Leve', clase: BADGE + 'bg-slate-500/20 text-slate-400' };
  }

  private fallar(e: unknown): void {
    this.error.set((e as { message?: string })?.message ?? 'No se pudieron cargar los casos');
    this.cargando.set(false);
  }
}
