import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';



interface UserInfo {
  email: string;
  role: string;
  // Ajoutez d'autres propriétés si nécessaire
}
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8081'; 
  public tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  public roleSubject = new BehaviorSubject<string | null>(localStorage.getItem('role'));

  public token$ = this.tokenSubject.asObservable();
  public role$ = this.roleSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth`, { email, password })
      .pipe(
        tap(response => {
          if (response && response.token) {
            // Stocker le token
            localStorage.setItem('token', response.token);
            this.tokenSubject.next(response.token);

            // Décoder le token et extraire le rôle
            const payload = JSON.parse(atob(response.token.split('.')[1]));
            const role = payload.role; 

            if (role) {
              localStorage.setItem('role', role);
              this.roleSubject.next(role);
            }
          }
        })
      );
  }

  getCurrentUser(): UserInfo | null {
    const token = this.getToken();
    if (!token) return null;
  
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        email: payload.sub || payload.email,
        role: payload.role,
        // Ajoutez d'autres propriétés du payload si nécessaire
      };
    } catch (e) {
      console.error('Error decoding token', e);
      return null;
    }
  }
  
  isAdmin(): boolean {
    return this.getRole() === 'ROLE_ADMIN'; // Adaptez 'admin' selon le rôle utilisé dans votre backend
  }
  isSERVEUR(): boolean {
    return this.getRole() === 'ROLE_SERVEUR'; // Adaptez 'admin' selon le rôle utilisé dans votre backend
  }
  isCUISINIER(): boolean {
    return this.getRole() === 'ROLE_CUISINIER'; // Adaptez 'admin' selon le rôle utilisé dans votre backend
  }

  logout(): void {
    // Supprimer le token et le rôle stocké
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.tokenSubject.next(null);
    this.roleSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.tokenSubject.value;
    if (!token) {
      return false;
    }
    
    try {
      // Vérifier l'expiration du token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp < Date.now() / 1000;
      
      if (isExpired) {
        this.logout();
        return false;
      }

      return true;
    } catch (e) {
      this.logout();
      return false;
    }
  }

  getRole(): string | null {
    return this.roleSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          if (response && response.token) {
            localStorage.setItem('token', response.token);
            this.tokenSubject.next(response.token);

            // Extraire et stocker le rôle après inscription
            const payload = JSON.parse(atob(response.token.split('.')[1]));
            const role = payload.role;
            if (role) {
              localStorage.setItem('role', role);
              this.roleSubject.next(role);
            }
          }
        })
      );
  }
}
