import { ApiService } from './api.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  // private apiURL = "http://localhost:8081";
  private endpointCommande = 'commandes';
  private endpointProduit = 'produits';
  private commandesSubject = new BehaviorSubject<any[]>([]);
  commandes$ = this.commandesSubject.asObservable();

  constructor(private http: HttpClient,private apiService: ApiService) {
    this.loadInitialCommandes();
  }

  private loadInitialCommandes(): void {
    this.apiService.get<any[]>(`${this.endpointCommande}`)
      .subscribe(commandes => {
        this.commandesSubject.next(commandes);
      });
  }
  public getCommands(): Observable<any[]>{
    return this.apiService.get<any[]>(`${this.endpointCommande}`);
  }
  public createCommande(commandeData: any): Observable<any> {
    return this.apiService.post(`${this.endpointCommande}`, commandeData)
      .pipe(
        tap(newCommande => {
          const currentCommandes = this.commandesSubject.value;
          this.commandesSubject.next([...currentCommandes, newCommande]);
        })
      );
  }

  public getProduits(): Observable<any[]> {
    return this.apiService.get<any[]>(`${this.endpointProduit}`);
  }
}