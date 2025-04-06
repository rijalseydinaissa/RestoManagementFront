import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Notification {
  id: number;
  message: string;
  commandeId: number;
  dateCreation: Date;
  lue: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private endpoint = 'api/notifications';
  private unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCount.asObservable();

  constructor(private apiService: ApiService) {
    this.updateUnreadCount();
  }

  getNotifications(includeRead: boolean = false): Observable<Notification[]> {
    return this.apiService.get<Notification[]>(
      this.endpoint, 
      { includeRead: includeRead.toString() }
    );
  }

  updateUnreadCount(): void {
    this.apiService.get<{ count: number }>(`${this.endpoint}/count`)
      .subscribe({
        next: (response) => this.unreadCount.next(response.count),
        error: (err) => console.error('Failed to update unread count', err)
      });
  }

  markAsRead(id: number): Observable<void> {
    return this.apiService.patch<void>(
      `${this.endpoint}/${id}/mark-read`, 
      {}
    ).pipe(
      tap(() => this.updateUnreadCount())
    );
  }

  markAllAsRead(): Observable<void> {
    return this.apiService.patch<void>(
      `${this.endpoint}/mark-all-read`, 
      {}
    ).pipe(
      tap(() => this.unreadCount.next(0))
    );
  }
}