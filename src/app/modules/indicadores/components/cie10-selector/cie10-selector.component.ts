import { Component, EventEmitter, Input, OnInit, Output, forwardRef } from '@angular/core';
import { Cie10Service } from '../../../../core/services/cie10.service';
import { CatalogoCie10 } from '../../../../core/models/models';

@Component({
  selector: 'app-cie10-selector',
  standalone: false,
  templateUrl: './cie10-selector.component.html',
  styleUrls: ['./cie10-selector.component.scss']
})
export class Cie10SelectorComponent implements OnInit {

  @Input() codigo: string | null | undefined = '';
  @Output() codigoChange = new EventEmitter<string | null | undefined>();

  @Input() diagnostico: string | null | undefined = '';
  @Output() diagnosticoChange = new EventEmitter<string | null | undefined>();

  @Input() label: string = 'Diagnóstico CIE-10';
  @Input() required: boolean = false;

  query = '';
  resultados: CatalogoCie10[] = [];
  frecuentes: CatalogoCie10[] = [];
  buscando = false;
  mostrarDropdown = false;
  modoManual = false;

  private searchDebounce: any;

  constructor(private cie10Service: Cie10Service) {}

  async ngOnInit(): Promise<void> {
    this.frecuentes = await this.cie10Service.getFrecuentes();
    this.resultados = this.frecuentes;
  }

  onFocus(): void {
    this.mostrarDropdown = true;
    if (!this.query.trim()) {
      this.resultados = this.frecuentes;
    }
  }

  onBlur(): void {
    // Retardo para permitir el clic en los elementos del dropdown
    setTimeout(() => {
      this.mostrarDropdown = false;
    }, 250);
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.mostrarDropdown = true;
    this.buscando = true;

    this.searchDebounce = setTimeout(async () => {
      try {
        if (!this.query.trim()) {
          this.resultados = this.frecuentes;
        } else {
          this.resultados = await this.cie10Service.buscar(this.query, 25);
        }
      } finally {
        this.buscando = false;
      }
    }, 200);
  }

  seleccionar(item: CatalogoCie10): void {
    this.codigo = item.codigo;
    this.diagnostico = item.descripcion;
    this.codigoChange.emit(this.codigo);
    this.diagnosticoChange.emit(this.diagnostico);
    this.query = '';
    this.mostrarDropdown = false;
  }

  limpiar(): void {
    this.codigo = null;
    this.diagnostico = null;
    this.codigoChange.emit(null);
    this.diagnosticoChange.emit(null);
    this.query = '';
    this.mostrarDropdown = false;
  }

  toggleModoManual(): void {
    this.modoManual = !this.modoManual;
  }

  onManualCodigoChange(val: string): void {
    this.codigo = val ? val.trim().toUpperCase() : null;
    this.codigoChange.emit(this.codigo);
  }

  onManualDiagnosticoChange(val: string): void {
    this.diagnostico = val || null;
    this.diagnosticoChange.emit(this.diagnostico);
  }
}
