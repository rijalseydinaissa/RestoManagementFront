import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { WebsocketService } from '../../services/websocket.service';
import { CommonModule } from '@angular/common';


interface Notification {
  id: number;
  message: string;
  commandeId: number;
  dateCreation: Date;
  lue: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
  imports: [CommonModule]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  showAll = false;
  private notificationSubscription: Subscription | null = null;
  private countSubscription: Subscription | null = null;

  constructor(
    private notificationService: NotificationService,
    private websocketService: WebsocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // S'abonner au compteur de notifications non lues
    this.countSubscription = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    // Charger les notifications non lues
    this.loadNotifications();

    // S'abonner aux notifications en temps réel
    this.notificationSubscription = this.websocketService.getNotifications().subscribe(
      (notification: Notification) => {
        this.notifications.unshift(notification);
        this.notificationService.updateUnreadCount();
      }
    );
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.countSubscription) {
      this.countSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.notificationService.getNotifications(this.showAll).subscribe(
      (notifications) => {
        this.notifications = notifications;
      }
    );
  }

  toggleShowAll(): void {
    this.showAll = !this.showAll;
    this.loadNotifications();
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (!notification.lue) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.lue = true;
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(notification => {
        notification.lue = true;
      });
    });
  }

  goToCommande(commandeId: number, notification: Notification, event: Event): void {
    this.markAsRead(notification, event);
    this.router.navigate(['/commandes', commandeId]);
  }
}