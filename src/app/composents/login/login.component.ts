// login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  // Pas besoin de styleUrls car nous utilisons Tailwind
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    public router: Router // Passage en public pour utilisation dans le template
  ) {
    // Rediriger si déjà connecté
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/commandes']);
    }

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }
  
    this.loading = true;
    this.error = '';
  
    this.authService.login(this.f['email'].value, this.f['password'].value)
      .subscribe({
        next: () => {
            this.router.navigate(['/commandes']);
        },
        error: error => {
          this.error = 'Email ou mot de passe incorrect';
          this.loading = false;
        }
      });
  }

  // Méthode pour gérer l'oubli de mot de passe
  forgotPassword(): void {
    this.router.navigate(['/reset-password']);
  }
}