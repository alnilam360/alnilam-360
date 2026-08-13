import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SidebarService } from '../../core/services/sidebar.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { AuthService, AuthState } from '../../core/services/auth.service';
import { MenuItem, MENU_ITEMS } from '../../core/models/menu.model';
import { Subscription, filter } from 'rxjs';

interface Notification {
  id: number;
  title: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  showNotifications = false;
  showUserMenu = false;
  isMobile = false;
  currentTitle = 'Panel de Control';
  currentTheme: ThemeMode = 'dark';
  isLoggingOut = false;
  private routeTitleMap: Record<string, string> = {};

  private subscription = new Subscription();

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  notifications = [
    { id: 1, title: 'Nueva inspección programada', time: 'Hace 5 min', read: false, type: 'info' },
    { id: 2, title: 'Incidente reportado en Área A', time: 'Hace 30 min', read: false, type: 'danger' },
    { id: 3, title: 'Capacitación completada', time: 'Hace 2 horas', read: true, type: 'success' },
    { id: 4, title: 'Documento pendiente de revisión', time: 'Hace 1 día', read: true, type: 'warning' }
  ];

  /** Datos del usuario autenticado */
  userName = '';
  userRole = '';
  userInitials = '';
  empresaName = 'Mi Empresa';

  constructor(
    private sidebarService: SidebarService,
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService
  ) {
    this.routeTitleMap = this.buildRouteTitleMap(MENU_ITEMS);
  }

  ngOnInit(): void {
    this.checkScreenSize();
    this.subscription.add(
      this.sidebarService.isCollapsed$.subscribe(collapsed => {
        this.isCollapsed = collapsed;
      })
    );

    this.subscription.add(
      this.themeService.theme$.subscribe(theme => {
        this.currentTheme = theme;
      })
    );

    this.subscription.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.updateTitle(event.urlAfterRedirects);
      })
    );

    // Suscribirse al estado de autenticación para datos del usuario
    this.subscription.add(
      this.authService.authState$.subscribe((state: AuthState) => {
        if (state.perfil) {
          this.userName = state.perfil.nombre || '';
          this.userRole = state.perfil.rol || '';
          this.userInitials = this.getInitials(this.userName);
          this.empresaName = state.perfil.empresa?.nombre || 'Mi Empresa';
        } else if (state.user) {
          this.userName = state.user.user_metadata?.['nombre'] || state.user.email || '';
          this.userRole = state.user.user_metadata?.['rol'] || 'Usuario';
          this.userInitials = this.getInitials(this.userName);
        }
      })
    );

    this.updateTitle(this.router.url);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleSidebar(): void {
    if (this.isMobile) {
      this.sidebarService.toggleMobile();
    } else {
      this.sidebarService.toggle();
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  closeDropdowns(): void {
    this.showNotifications = false;
    this.showUserMenu = false;
  }

  /** Cierra la sesión y redirige al login */
  async logout(): Promise<void> {
    this.isLoggingOut = true;
    this.closeDropdowns();
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      this.isLoggingOut = false;
    }
  }

  private getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) || '';
    const second = parts[1]?.charAt(0) || '';
    return (first + second).toUpperCase();
  }

  private updateTitle(url: string): void {
    const entry = Object.entries(this.routeTitleMap).find(([route]) => this.routeMatches(url, route));
    this.currentTitle = entry ? entry[1] : 'Panel de Control';
  }

  private buildRouteTitleMap(items: MenuItem[], map: Record<string, string> = {}): Record<string, string> {
    items.forEach(item => {
      if (item.route && item.label) {
        map[item.route] = item.label;
      }
      if (item.children) {
        this.buildRouteTitleMap(item.children, map);
      }
    });
    return map;
  }

  private routeMatches(actual: string, target: string): boolean {
    return actual === target || actual.startsWith(`${target}/`);
  }
}
