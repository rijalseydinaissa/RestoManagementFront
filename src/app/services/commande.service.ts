import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, Subscription } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ProduitService } from './produit.service';
import { TableService } from './table.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CommandeService implements OnDestroy {
  private endpoint = 'commandes';
  private produitEndpoint = 'produits';
  private commandesSubject = new BehaviorSubject<any[]>([]);
  commandes$ = this.commandesSubject.asObservable();
  
  private subscriptions: Subscription = new Subscription();

  constructor(
    private apiService: ApiService, 
    private tableService: TableService,
    private produitService: ProduitService,
    private authService: AuthService
  ) {
    // S'abonner aux changements de token/rôle
    this.subscriptions.add(
      this.authService.token$.subscribe(token => {
        // Recharger les commandes quand le token change (login/logout)
        if (token) {
          this.loadInitialCommandes();
        } else {
          // Vider les données quand l'utilisateur se déconnecte
          this.commandesSubject.next([]);
        }
      })
    );
    
    // Charger les commandes initiales si l'utilisateur est déjà connecté
    if (this.authService.getToken()) {
      this.loadInitialCommandes();
    }
  }
  
  ngOnDestroy(): void {
    // Nettoyer les souscriptions pour éviter les fuites de mémoire
    this.subscriptions.unsubscribe();
  }
  
  private sortCommandesByDate(commandes: any[]): any[] {
    return commandes.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public reloadCommandes(): void {
    // Méthode publique pour forcer le rechargement des commandes
    this.loadInitialCommandes();
  }

  private loadInitialCommandes(): void {
    this.apiService.get<any[]>(`${this.endpoint}`, { withCredentials: true })
      .subscribe({
        next: commandes => {
          const sortedCommandes = this.sortCommandesByDate(commandes);
          this.commandesSubject.next(sortedCommandes);
        },
        error: error => {
          console.error('Erreur lors du chargement des commandes:', error);
          this.commandesSubject.next([]);
        }
      });
  }

  public getCommandes(): Observable<any> {
    return this.commandes$;
  }

  updateCommandeStatus(id: number, status: string) {
    const url = `${this.endpoint}/${id}/status`;
    return this.apiService.patch(url, { status }).pipe(
      tap(updatedCommande => {
        // Mettre à jour la commande dans le BehaviorSubject
        const currentCommandes = this.commandesSubject.value;
        const updatedCommandes = currentCommandes.map(commande => 
          commande.id === id ? { ...commande, status } : commande
        );
        this.commandesSubject.next(updatedCommandes);
      })
    );
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
        // Mettre à jour le statut de la table seulement si la commande est créée avec succès
        return this.tableService.updateTableStatus(commandeData.tableId, true).pipe(
          map(() => newCommande)
        );
      }),
      tap(newCommande => {
        // Mettre à jour la liste des commandes seulement en cas de succès
        const currentCommandes = this.commandesSubject.value;
        this.commandesSubject.next([newCommande, ...currentCommandes]);
        this.produitService.loadProducts();
      })
    );
  }

  public updateCommande(id: number, commandeData: any): Observable<any> {
    const url = `${this.endpoint}/${id}/complet`;
    return this.apiService.put(url, commandeData).pipe(
      tap(updatedCommande => {
        // Mettre à jour la commande dans le BehaviorSubject
        const currentCommandes = this.commandesSubject.value;
        const updatedCommandes = currentCommandes.map(commande => 
          commande.id === id ? updatedCommande : commande
        );
        this.commandesSubject.next(this.sortCommandesByDate(updatedCommandes));
      }),
      catchError(error => {
        if (error.status === 403) {
          return throwError(() => new Error('Vous n\'avez pas les droits pour modifier cette commande'));
        }
        return throwError(() => new Error('Une erreur est survenue lors de la mise à jour de la commande'));
      })
    );
  }

  public annulerCommande(id: number): Observable<any> {
    const url = `${this.endpoint}/${id}/annuler`;
    return this.apiService.post(url, {}).pipe(
      tap(result => {
        // Appel de loadProducts comme effet secondaire
        this.produitService.loadProducts();
        
        // Mise à jour de la commande dans le BehaviorSubject
        const currentCommandes = this.commandesSubject.value;
        const updatedCommandes = currentCommandes.map(commande => 
          commande.id === id ? { ...commande, status: 'ANNULEE' } : commande
        );
        this.commandesSubject.next(updatedCommandes);
        
        // Libérer la table si nécessaire
        const commande = currentCommandes.find(c => c.id === id);
        if (commande && commande.tableId) {
          this.tableService.updateTableStatus(commande.tableId, false).subscribe();
        }
      }),
      catchError(error => {
        console.error('Erreur lors de l\'annulation de la commande:', error);
        return throwError(() => new Error('Une erreur est survenue lors de l\'annulation de la commande'));
      })
    );
  }

  public getProduits(): Observable<any[]> {
    return this.apiService.get<any[]>(`${this.endpoint}/${this.produitEndpoint}`);
  }
}