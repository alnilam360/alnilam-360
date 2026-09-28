import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'alnilam-theme';
  private themeSubject = new BehaviorSubject<ThemeMode>('dark');
  theme$ = this.themeSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    const savedTheme = (localStorage.getItem(this.storageKey) as ThemeMode) || 'dark';
    this.setTheme(savedTheme);
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  private setTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.storageKey, theme);

    const root = this.document.documentElement;
    const body = this.document.body;

    root.classList.remove('theme-dark', 'theme-light', 'ion-palette-dark');
    body.classList.remove('theme-dark', 'theme-light', 'ion-palette-dark');

    const themeClass = theme === 'dark' ? 'theme-dark' : 'theme-light';
    root.classList.add(themeClass);
    body.classList.add(themeClass);

    if (theme === 'dark') {
      root.classList.add('ion-palette-dark');
      body.classList.add('ion-palette-dark');
    }

    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);
  }
}
