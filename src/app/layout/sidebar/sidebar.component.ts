import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService, AuthState } from '../../core/services/auth.service';
import { RolesService } from '../../core/services/roles.service';
import { MenuItem, MENU_ITEMS } from '../../core/models/menu.model';
import { Subscription, filter } from 'rxjs';

interface MenuItemNode extends MenuItem {
  key: string;
  children?: MenuItemNode[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false
})
export class SidebarComponent implements OnInit, OnDestroy {
  menuItems: MenuItemNode[] = [];
  isCollapsed = false;
  isMobile = false;
  isOpen = false;
  expandedState: Record<string, boolean> = {};
  activeRoute = '';

  private allMenuItems: MenuItemNode[] = this.buildMenuTree(MENU_ITEMS);
  private modulosPermitidos: string[] = [];
  private subscription = new Subscription();

  constructor(
    private sidebarService: SidebarService,
    private router: Router,
    private authService: AuthService,
    private rolesService: RolesService
  ) { }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.checkScreenSize();
    this.activeRoute = this.router.url;

    // Mostrar todos los items mientras cargan permisos
    this.menuItems = this.allMenuItems;

    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(collapsed => {
        this.isCollapsed = collapsed;
        if (collapsed && !this.isMobile) {
          this.expandedState = {};
        }
      })
    );

    this.subscription.add(
      this.sidebarService.isMobileOpen$.subscribe(isOpen => {
        this.isOpen = isOpen;
      })
    );

    this.subscription.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.activeRoute = event.urlAfterRedirects;
        this.expandParentsOfActiveRoute();
        if (this.isMobile) {
          this.closeMobileSidebar();
        }
      })
    );

    // Suscribirse al auth state para filtrar menu por permisos del rol
    this.subscription.add(
      this.authService.authState$.subscribe((state: AuthState) => {
        if (state.perfil?.rol_id) {
          this.loadPermisosAndFilter(state.perfil.rol_id);
        } else {
          // Sin rol asignado → mostrar todos los módulos
          this.menuItems = this.allMenuItems;
        }
      })
    );

    this.expandParentsOfActiveRoute();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get mainMenuItems(): MenuItemNode[] {
    return this.menuItems.filter(item => !item.isUtility);
  }

  get utilityItems(): MenuItemNode[] {
    return this.menuItems.filter(item => !!item.isUtility);
  }

  private async loadPermisosAndFilter(rolId: string): Promise<void> {
    try {
      this.modulosPermitidos = await this.rolesService.getModulosPermitidos(rolId);

      if (this.modulosPermitidos.length === 0) {
        this.menuItems = this.allMenuItems;
        return;
      }

      // Backward compat: roles with old IDs (gestion-sst, indicadores, etc.)
      // get all PHVA groups mapped in so the new menu shows correctly.
      const phvaIds = ['planear', 'hacer', 'verificar', 'actuar'];
      const legacyIds = ['gestion-sst', 'indicadores', 'auditorias', 'personal', 'formatos-operativos', 'calendario'];
      const hasNewPhva = phvaIds.some(id => this.modulosPermitidos.includes(id));
      const hasLegacy = legacyIds.some(id => this.modulosPermitidos.includes(id));

      if (hasLegacy && !hasNewPhva) {
        this.modulosPermitidos = [...this.modulosPermitidos, ...phvaIds];
      }

      this.menuItems = this.allMenuItems.filter(item => {
        if (item.isSectionLabel || item.isUtility) return true;
        return this.modulosPermitidos.includes(item.id);
      });
    } catch (error) {
      console.error('Error loading permisos for sidebar:', error);
      this.menuItems = this.allMenuItems;
    }
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isOpen = false;
    }
  }

  toggleSidebar(): void {
    if (this.isMobile) {
      this.sidebarService.toggleMobile();
    } else {
      this.sidebarService.toggle();
    }
  }

  closeMobileSidebar(): void {
    if (this.isMobile) {
      this.sidebarService.closeMobile();
    }
  }

  toggleExpand(item: MenuItemNode, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.isCollapsed && !this.isMobile) {
      this.sidebarService.expand();
    }

    const shouldExpand = !this.isExpanded(item);
    this.setExpandedState(item.key, shouldExpand);

    if (!shouldExpand) {
      this.collapseDescendants(item);
    }
  }

  isExpanded(item: MenuItemNode): boolean {
    return !!this.expandedState[item.key];
  }

  isActive(item: MenuItemNode): boolean {
    if (item.route) {
      return this.activeRoute === item.route || this.activeRoute.startsWith(item.route + '/');
    }
    if (item.children) {
      return this.hasActiveChild(item);
    }
    return false;
  }

  hasActiveChild(item: MenuItemNode): boolean {
    if (!item.children) return false;
    return item.children.some((child: MenuItemNode) => {
      if (child.route && (this.activeRoute === child.route || this.activeRoute.startsWith(child.route + '/'))) {
        return true;
      }
      if (child.children) {
        return this.hasActiveChild(child);
      }
      return false;
    });
  }

  private expandParentsOfActiveRoute(): void {
    const parentKeys = this.findParentKeysByRoute(this.menuItems, this.activeRoute);
    if (!parentKeys.length) {
      return;
    }

    const nextState = { ...this.expandedState };
    parentKeys.forEach(key => {
      nextState[key] = true;
    });
    this.expandedState = nextState;
  }

  navigateTo(item: MenuItemNode): void {
    if (item.route) {
      this.router.navigate([item.route]);
    } else if (item.children && item.children.length > 0) {
      this.toggleExpand(item);
    }
  }

  trackByFn(index: number, item: MenuItemNode): string {
    return item.key;
  }

  private setExpandedState(key: string, value: boolean): void {
    this.expandedState = { ...this.expandedState, [key]: value };
  }

  private collapseDescendants(item: MenuItemNode): void {
    if (!item.children) {
      return;
    }

    item.children.forEach((child: MenuItemNode) => {
      if (this.isExpanded(child)) {
        this.setExpandedState(child.key, false);
        this.collapseDescendants(child);
      }
    });
  }

  private findParentKeysByRoute(items: MenuItemNode[], route: string, parents: string[] = []): string[] {
    for (const item of items) {
      const nextParents = [...parents, item.key];

      if (item.route && this.routeMatches(route, item.route)) {
        return parents;
      }

      if (item.children) {
        const result = this.findParentKeysByRoute(item.children, route, nextParents);
        if (result.length) {
          return result;
        }
      }
    }

    return [];
  }

  private buildMenuTree(items: MenuItem[], parentKey: string | null = null): MenuItemNode[] {
    return items.map(item => {
      const key = parentKey ? `${parentKey}.${item.id}` : item.id;
      return {
        ...item,
        key,
        children: item.children ? this.buildMenuTree(item.children, key) : undefined
      };
    });
  }

  private routeMatches(actual: string, target: string): boolean {
    return actual === target || actual.startsWith(`${target}/`);
  }
}
