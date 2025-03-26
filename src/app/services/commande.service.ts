import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ProduitService } from './produit.service';
import { TableService } from './table.service'; 

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  // private apiURL = "http://localhost:8081";
  private endpoint = 'commandes'
  private produitEndpoint = 'produits';
  private commandesSubject = new BehaviorSubject<any[]>([]);
  commandes$ = this.commandesSubject.asObservable();

  constructor(
    private apiService: ApiService, 
    private tableService: TableService,
    private produitService: ProduitService) {
    this.loadInitialCommandes();
  }
  
  private sortCommandesByDate(commandes: any[]): any[] {
    return commandes.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  private loadInitialCommandes(): void {
    this.apiService.get<any[]>(`${this.endpoint}`,{ withCredentials: true })
      .subscribe(commandes => {
        const sortedCommandes = this.sortCommandesByDate(commandes);
        this.commandesSubject.next(sortedCommandes);
      });
  }

  public getCommandes(): Observable<any> {
    return this.commandes$;
  }

   updateCommandeStatus(id: number, status: string) {
    const url = `${this.endpoint}/${id}/status`;
    return this.apiService.patch(url, { status });
  }
  public deleteCommande(id: number): Observable<void> {
    const url = `${this.endpoint}/${id}`;
    return this.apiService.delete<void>(url).pipe(
      tap(() => {
        // Mettre à jour le BehaviorSubject après la suppression
        const currentCommandes = this.commandesSubject.value;
        const updatedCommandes = currentCommandes.filter(commande => commande.id !== id);
        this.commandesSubject.next(updatedCommandes);
      })
    );
  }


  public createCommande(commandeData: any): Observable<any> {
    return this.apiService.post(`${this.endpoint}`, commandeData).pipe(
      switchMap(newCommande => {
        return this.tableService.updateTableStatus(commandeData.tableId, true).pipe(
          map(() => newCommande) // Retourne la commande après la mise à jour de la table
        );
      }),
      tap({
        next: (newCommande) => {
          const currentCommandes = this.commandesSubject.value;
          this.commandesSubject.next([newCommande, ...currentCommandes]);
          this.produitService.loadProducts();
        },
        error: (error) => {
          console.error('Erreur lors de la création de commande:', error);
          // Ne pas afficher l'erreur ici, elle sera gérée dans le composant
        }
      }),
      catchError(error => {
        // Transformez l'erreur pour avoir un message plus clair
        if (error.status === 403) {
          return throwError(() => new Error('Oups! Seuls les serveurs et admin peuvent créer des commandes'));
        }
        return throwError(() => new Error('Une erreur est survenue lors de la création de la commande'));
      })
    );
  }

  public getProduits(): Observable<any[]> {
    return this.apiService.get<any[]>(`${this.endpoint}/${this.produitEndpoint}`);
  }
}