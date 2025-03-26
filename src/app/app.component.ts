import { AuthService } from './services/auth.service';
import { Component } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./composents/navbar/navbar.component";
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from "./composents/login/login.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavbarComponent, RouterModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'GestionStock';
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Vérification initiale de l'authentification
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }
  }
}
