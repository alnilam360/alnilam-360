import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-asignar-password',
  templateUrl: './asignar-password.component.html',
  styleUrls: ['./asignar-password.component.scss'],
  standalone: false
})
export class AsignarPasswordComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  isVerifyingToken = true;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  
  hasAccessToken = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly sbService: SupabaseClientService,
    private readonly authService: AuthService
  ) {
    this.form = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordsMatchValidator
    });
  }

  async ngOnInit(): Promise<void> {
    this.isVerifyingToken = true;
    this.errorMessage = '';
    
    // Capturar tokens del fragmento de la URL (hash) o query params
    const accessToken = this.getUrlParameter('access_token');
    const refreshToken = this.getUrlParameter('refresh_token');

    if (accessToken) {
      this.hasAccessToken = true;
      try {
        // Establecer la sesión en Supabase usando el token recibido
        const { data, error } = await this.sbService.client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) {
          throw new Error(`Token inválido o expirado: ${error.message}`);
        }

        console.log('[AsignarPassword] Sesión establecida correctamente.');
      } catch (err: any) {
        this.errorMessage = err?.message || 'El enlace de invitación no es válido o ha expirado. Por favor, solicite una nueva invitación.';
      } finally {
        this.isVerifyingToken = false;
      }
    } else {
      // Si no hay token en la URL, verificamos si ya existe una sesión activa
      // (por si Supabase ya lo procesó o ya inició sesión previamente)
      const session = await this.authService.getSession();
      if (session) {
        this.hasAccessToken = true;
        this.isVerifyingToken = false;
      } else {
        this.isVerifyingToken = false;
        this.errorMessage = 'No se encontró un token de autenticación válido en el enlace.';
      }
    }
  }

  private getUrlParameter(name: string): string | null {
    // Buscar en hash fragment (flujo implícito de Supabase)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      if (params.has(name)) return params.get(name);
    }
    // Buscar en query string
    const search = window.location.search;
    if (search) {
      const params = new URLSearchParams(search);
      if (params.has(name)) return params.get(name);
    }
    return null;
  }

  // Validador estricto de fortaleza de contraseña
  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;
    if (!passwordValid) {
      return {
        strength: {
          hasUpperCase,
          hasLowerCase,
          hasNumeric,
          hasSpecialChar
        }
      };
    }
    return null;
  }

  // Validador de coincidencia de contraseñas
  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const newPassword = this.form.value.password;

      // Actualizar la contraseña del usuario en Supabase Auth
      const { error } = await this.sbService.client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      this.successMessage = '¡Contraseña establecida con éxito! Redirigiendo al sistema...';
      
      // Esperar 2 segundos para mostrar el mensaje de éxito antes de redirigir
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);

    } catch (err: any) {
      this.errorMessage = err?.message || 'Error al actualizar la contraseña. Intente de nuevo.';
      this.isLoading = false;
    }
  }

  get password() { return this.form.get('password'); }
  get confirmPassword() { return this.form.get('confirmPassword'); }

  hasMinLength(): boolean {
    const val = this.password?.value || '';
    return val.length >= 8;
  }

  hasUpperCase(): boolean {
    const val = this.password?.value || '';
    return /[A-Z]/.test(val);
  }

  hasLowerCase(): boolean {
    const val = this.password?.value || '';
    return /[a-z]/.test(val);
  }

  hasNumeric(): boolean {
    const val = this.password?.value || '';
    return /[0-9]/.test(val);
  }

  hasSpecialChar(): boolean {
    const val = this.password?.value || '';
    return /[!@#$%^&*(),.?":{}|<>]/.test(val);
  }
}

