import { Component, OnInit, inject, signal } from '@angular/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { MatrizLegalService } from '../../../../core/services/matriz-legal.service';
import { Empresa } from '../../../../core/models/models';
import {
  MatrizLegalComponente,
  TipoNorma,
  Dominio,
  DOMINIOS,
  DOMINIO_LABEL,
} from '../../../../core/models/matriz-legal.model';

@Component({
  selector: 'app-catalogos',
  standalone: false,
  templateUrl: './catalogos.component.html',
  styleUrls: ['./catalogos.component.scss'],
})
export class CatalogosComponent implements OnInit {
  private tenant = inject(TenantService);
  private service = inject(MatrizLegalService);

  readonly DOMINIOS = [...DOMINIOS];
  readonly DOMINIO_LABEL = DOMINIO_LABEL;

  cargando = signal<boolean>(true);
  esAdmin = signal<boolean>(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal<string>('');

  componentes = signal<MatrizLegalComponente[]>([]);
  tiposNorma = signal<TipoNorma[]>([]);

  // Alta de componente
  nuevoDominio = signal<Dominio>('SG_SST');
  nuevoNombre = signal<string>('');
  // Alta de tipo de norma
  nuevoTipoNombre = signal<string>('');

  async ngOnInit(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    const lista = await this.tenant.listarEmpresasDisponibles();
    this.empresas.set(lista);
    let empId = (await this.tenant.getEmpresaTenantId()) || '';
    if (!empId && lista.length > 0) empId = lista[0].id || '';
    this.empresaId.set(empId);
    await this.cargar();
  }

  async onEmpresaChange(id: string): Promise<void> {
    this.empresaId.set(id);
    await this.cargar();
  }

  async cargar(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) { this.cargando.set(false); return; }
    this.cargando.set(true);
    try {
      const [comps, tipos] = await Promise.all([
        this.service.getComponentes(empId),
        this.service.getTiposNorma(),
      ]);
      this.componentes.set(comps);
      this.tiposNorma.set(tipos);
    } catch (e) {
      console.error('Error cargando catálogos:', e);
    } finally {
      this.cargando.set(false);
    }
  }

  componentesPorDominio(dom: Dominio): MatrizLegalComponente[] {
    return this.componentes().filter(c => c.dominio === dom);
  }

  esGlobal(c: MatrizLegalComponente): boolean { return c.empresa_id == null; }

  async agregarComponente(): Promise<void> {
    const nombre = this.nuevoNombre().trim();
    if (!nombre) { alert('Indique el nombre del componente.'); return; }
    try {
      const orden = (this.componentesPorDominio(this.nuevoDominio()).reduce((m, c) => Math.max(m, c.orden), 0)) + 10;
      await this.service.crearComponente({
        empresa_id: this.empresaId(),
        dominio: this.nuevoDominio(),
        nombre,
        orden,
        activo: true,
      });
      this.nuevoNombre.set('');
      await this.cargar();
    } catch (e) {
      console.error('Error creando componente:', e);
      alert('No se pudo crear el componente.');
    }
  }

  async toggleActivo(c: MatrizLegalComponente): Promise<void> {
    // Solo componentes propios de la empresa (los globales los gestiona el admin).
    if (this.esGlobal(c) && !this.esAdmin()) {
      alert('Los componentes de la plantilla base solo los puede modificar un administrador.');
      return;
    }
    try {
      await this.service.actualizarComponente(c.id, { activo: !c.activo });
      await this.cargar();
    } catch (e) {
      console.error('Error actualizando componente:', e);
      alert('No se pudo actualizar el componente.');
    }
  }

  async agregarTipoNorma(): Promise<void> {
    const nombre = this.nuevoTipoNombre().trim();
    if (!nombre) { alert('Indique el nombre del tipo de norma.'); return; }
    try {
      const jerarquia = (this.tiposNorma().reduce((m, t) => Math.max(m, t.jerarquia), 0)) + 1;
      await this.service.crearTipoNorma({ nombre, jerarquia, activo: true });
      this.nuevoTipoNombre.set('');
      await this.cargar();
    } catch (e: any) {
      console.error('Error creando tipo de norma:', e);
      alert(e?.message || 'No se pudo crear el tipo de norma (¿requiere rol administrador?).');
    }
  }
}
