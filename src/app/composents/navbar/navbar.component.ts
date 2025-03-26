import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { NavLinkComponent } from "./nav-link/nav-link.component";
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-navbar',
  imports: [RouterModule, NavLinkComponent,NavLinkComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {

  constructor(private router: Router,public authService: AuthService) {}


  disconnect() {
     // Supprimer le token et le rôle stocké
     localStorage.removeItem('token');
     localStorage.removeItem('role');
     this.authService.tokenSubject.next(null);
     this.authService.roleSubject.next(null);
     this.router.navigate(['/login']);
  }
}
