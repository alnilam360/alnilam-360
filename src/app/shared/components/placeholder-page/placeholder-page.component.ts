import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder-page',
  template: `
    <div class="p-6">
      <div class="bg-dark-secondary border border-dark-border rounded-xl p-8 text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-accent flex items-center justify-center">
          <ion-icon name="construct-outline" class="text-3xl text-brand-primary"></ion-icon>
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">{{ pageTitle }}</h1>
        <p class="text-dark-text mb-4">Este módulo está en desarrollo</p>
        <p class="text-sm text-dark-text/60">Tipo: {{ tipo }}</p>
      </div>
    </div>
  `,
  standalone: false
})
export class PlaceholderPageComponent implements OnInit {
  pageTitle = 'Módulo en Desarrollo';
  tipo = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.tipo = data['tipo'] || 'general';
      this.pageTitle = this.formatTitle(this.tipo);
    });
  }

  private formatTitle(tipo: string): string {
    return tipo
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
