import { Component, OnInit } from '@angular/core';
import { AuthService } from './../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-authorized',
  imports: [CommonModule],
  templateUrl: './not-authorized.component.html',
  styleUrl: './not-authorized.component.css'
})
export class NotAuthorizedComponent implements OnInit {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('NotAuthorizedComponent initialized');
    console.log('Current Role:', this.authService.getRole());
  }

  returnToPreviousPage() {
    // Rediriger vers une page par défaut si nécessaire
    this.router.navigate(['/commandes']);
  }
}