import { NotificationsComponent } from './../notifications/notifications.component';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { NavLinkComponent } from "./nav-link/nav-link.component";
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-navbar',
  imports: [RouterModule, NavLinkComponent,NavLinkComponent,CommonModule,],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {

  constructor(private router: Router,public authService: AuthService ,private notificationService: NotificationService) {}
  unreadNotificationsCount = 0;
  showNotificationsPanel = false;
  private countSubscription: Subscription | null = null;


  ngOnInit(): void {
    this.countSubscription = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotificationsCount = count;
    });
  }

  ngOnDestroy(): void {
    if (this.countSubscription) {
      this.countSubscription.unsubscribe();
    }
  }

  toggleNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }

  disconnect() {
     // Supprimer le token et le rôle stocké
     localStorage.removeItem('token');
     localStorage.removeItem('role');
     this.authService.tokenSubject.next(null);
     this.authService.roleSubject.next(null);
     this.router.navigate(['/login']);
  }
}
