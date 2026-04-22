import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isCollapsed = new BehaviorSubject<boolean>(false);
  private isMobileOpen = new BehaviorSubject<boolean>(false);
  
  isCollapsed$ = this.isCollapsed.asObservable();
  isMobileOpen$ = this.isMobileOpen.asObservable();

  toggle(): void {
    this.isCollapsed.next(!this.isCollapsed.value);
  }

  collapse(): void {
    this.isCollapsed.next(true);
  }

  expand(): void {
    this.isCollapsed.next(false);
  }

  toggleMobile(): void {
    this.isMobileOpen.next(!this.isMobileOpen.value);
  }

  openMobile(): void {
    this.isMobileOpen.next(true);
  }

  closeMobile(): void {
    this.isMobileOpen.next(false);
  }

  get collapsed(): boolean {
    return this.isCollapsed.value;
  }

  get mobileOpen(): boolean {
    return this.isMobileOpen.value;
  }
}
