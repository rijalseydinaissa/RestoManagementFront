import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // Supposé existant pour obtenir l'utilisateur actuel
import SockJS from 'sockjs-client';
import * as Stomp from 'webstomp-client';
import { Notification } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient: any;
  private connected = false;

  constructor(private authService: AuthService) {
    this.connect();
  }

  private connect(): void {
    const socket = new SockJS('http://localhost:8081/ws');
    this.stompClient = Stomp.over(socket);

    const user = this.authService.getCurrentUser();
    if (!user || !user.email) {
      console.error('Impossible de se connecter au WebSocket: utilisateur non authentifié');
      return;
    }

    this.stompClient.connect(
      {},
      (frame: any) => {
        this.connected = true;
        console.log('Connected to WebSocket: ' + frame);
      },
      (error: any) => {
        console.error('Erreur de connexion WebSocket:', error);
        this.connected = false;
        // Tentative de reconnexion après un délai
        setTimeout(() => {
          this.connect();
        }, 5000);
      }
    );
  }

  getNotifications(): Observable<Notification> {
    return new Observable(observer => {
      const user = this.authService.getCurrentUser();
      if (!user || !user.email) {
        observer.error('Utilisateur non authentifié');
        return;
      }

      const waitForConnection = () => {
        if (this.connected) {
          // S'abonner au canal des notifications pour cet utilisateur
          this.stompClient.subscribe(`/user/${user.email}/queue/notifications`, 
            (message: any) => {
              const notification = JSON.parse(message.body);
              observer.next(notification);
            }
          );
        } else {
          // Attendre que la connexion soit établie
          setTimeout(waitForConnection, 1000);
        }
      };

      waitForConnection();

      // Retourner la fonction de nettoyage
      return () => {
        if (this.stompClient && this.connected) {
          this.stompClient.disconnect();
        }
      };
    });
  }
}