import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { CommandeService } from './commande.service';
import { Observable, map, switchMap, of, BehaviorSubject, combineLatest, tap } from 'rxjs';

export interface VenteStats {
  periode: string;
  montantTotal: number;
  nombreVentes: number;
  produitsPlusVendus?: {nom: string, quantite: number, montant: number}[];
  ventesParCategorie?: {categorie: string, montant: number, pourcentage: number}[];
}

export interface StatsFiltres {
  debut?: Date;
  fin?: Date;
  categorie?: string;
  client?: string;
  typePeriode: 'jour' | 'semaine' | 'mois' | 'personnalise';
}

@Injectable({
  providedIn: 'root'
})
export class CaisseService {
  private endpoint = 'statistiques';
  private statsSubject = new BehaviorSubject<VenteStats[]>([]);
  public stats$ = this.statsSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private commandeService: CommandeService
  ) {}

  /**
   * Récupère les statistiques de ventes selon les filtres spécifiés
   */
  public getVentesStats(filtres: StatsFiltres): Observable<VenteStats[]> {
    // Si l'API a un endpoint dédié pour les statistiques
    if (this.apiBackendSupportsStats()) {
      return this.apiService.post<VenteStats[]>(`${this.endpoint}/ventes`, filtres)
        .pipe(
          tap(stats => this.statsSubject.next(stats))
        );
    } 
    
    // Sinon, on calcule les statistiques côté client
    return this.commandeService.getCommandes().pipe(
      map(commandes => this.calculerStats(commandes, filtres)),
      tap(stats => this.statsSubject.next(stats))
    );
  }

  /**
   * Vérifie si l'API backend supporte les requêtes de statistiques
   */
  private apiBackendSupportsStats(): boolean {
    // À remplacer par une véritable vérification ou configuration
    return false;
  }

  /**
   * Calcule les statistiques à partir des commandes selon les filtres spécifiés
   */
  private calculerStats(commandes: any[], filtres: StatsFiltres): VenteStats[] {
    // Filtrer les commandes selon les critères
    const commandesFiltrees = this.filtrerCommandes(commandes, filtres);
    
    // Regrouper par période selon le type de période demandé
    const commandesParPeriode = this.grouperParPeriode(commandesFiltrees, filtres.typePeriode);
    
    // Calculer les statistiques pour chaque période
    return Object.entries(commandesParPeriode).map(([periode, cmds]) => {
      const montantTotal = cmds.reduce((sum, cmd) => sum + cmd.montantTotal, 0);
      const nombreVentes = cmds.length;
      
      // Agréger les produits vendus
      const produits = this.aggregerProduits(cmds);
      
      // Calculer les ventes par catégorie
      const categories = this.calculerVentesParCategorie(cmds);
      
      return {
        periode,
        montantTotal,
        nombreVentes,
        produitsPlusVendus: produits.slice(0, 5), // Top 5 des produits
        ventesParCategorie: categories
      };
    });
  }

  /**
   * Filtre les commandes selon les critères spécifiés
   */
  private filtrerCommandes(commandes: any[], filtres: StatsFiltres): any[] {
    return commandes.filter(cmd => {
      const dateCmd = new Date(cmd.date);
      
      // Filtre par date de début
      if (filtres.debut && dateCmd < filtres.debut) {
        return false;
      }
      
      // Filtre par date de fin
      if (filtres.fin && dateCmd > filtres.fin) {
        return false;
      }
      
      // Filtre par client
      if (filtres.client && !cmd.client.toLowerCase().includes(filtres.client.toLowerCase())) {
        return false;
      }
      
      // Filtre par catégorie (nécessite d'avoir la catégorie dans chaque produit de commande)
      if (filtres.categorie && Array.isArray(cmd.commandeProduits)) {
        return cmd.commandeProduits.some(
          (produit: any) => produit.categorie === filtres.categorie
        );
      }
      
      return true;
    });
  }

  /**
   * Regroupe les commandes par période (jour, semaine, mois)
   */
  private grouperParPeriode(commandes: any[], typePeriode: string): Record<string, any[]> {
    const result: Record<string, any[]> = {};
    
    commandes.forEach(cmd => {
      const date = new Date(cmd.date);
      let cle = '';
      
      switch(typePeriode) {
        case 'jour':
          cle = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
          break;
        case 'semaine':
          // Obtenir le début de la semaine (lundi)
          const jour = date.getDay() || 7; // 0 = dimanche, 1-6 = lundi-samedi
          const debutSemaine = new Date(date);
          debutSemaine.setDate(date.getDate() - jour + 1);
          cle = `Semaine ${this.getWeekNumber(date)} - ${debutSemaine.toISOString().split('T')[0]}`;
          break;
        case 'mois':
          cle = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          cle = date.toISOString().split('T')[0];
      }
      
      if (!result[cle]) {
        result[cle] = [];
      }
      result[cle].push(cmd);
    });
    
    return result;
  }

  /**
   * Obtient le numéro de la semaine dans l'année
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Agrège les produits vendus pour obtenir les plus populaires
   */
  private aggregerProduits(commandes: any[]): {nom: string, quantite: number, montant: number}[] {
    const produits: Record<string, {nom: string, quantite: number, montant: number}> = {};
    
    commandes.forEach(cmd => {
      if (Array.isArray(cmd.commandeProduits)) {
        cmd.commandeProduits.forEach((produit: any) => {
          const nom = produit.nom;
          const prix = produit.prix;
          const quantite = produit.quantite || 1;
          
          if (!produits[nom]) {
            produits[nom] = {nom, quantite: 0, montant: 0};
          }
          
          produits[nom].quantite += quantite;
          produits[nom].montant += prix * quantite;
        });
      }
    });
    
    return Object.values(produits).sort((a, b) => b.montant - a.montant);
  }

  /**
   * Calcule les ventes par catégorie
   */
  private calculerVentesParCategorie(commandes: any[]): {categorie: string, montant: number, pourcentage: number}[] {
    const categories: Record<string, {categorie: string, montant: number}> = {};
    let montantTotal = 0;
    
    commandes.forEach(cmd => {
      if (Array.isArray(cmd.commandeProduits)) {
        cmd.commandeProduits.forEach((produit: any) => {
          const categorie = produit.categorie || 'Non catégorisé';
          const prix = produit.prix;
          const quantite = produit.quantite || 1;
          const montant = prix * quantite;
          
          if (!categories[categorie]) {
            categories[categorie] = {categorie, montant: 0};
          }
          
          categories[categorie].montant += montant;
          montantTotal += montant;
        });
      }
    });
    
    // Calculer les pourcentages
    return Object.values(categories).map(cat => ({
      ...cat,
      pourcentage: montantTotal > 0 ? (cat.montant / montantTotal) * 100 : 0
    })).sort((a, b) => b.montant - a.montant);
  }

  /**
   * Télécharge les statistiques au format CSV
   */
  public exporterStatsCSV(stats: VenteStats[]): string {
    const headers = 'Période,Montant Total,Nombre de Ventes\n';
    const rows = stats.map(stat => 
      `"${stat.periode}",${stat.montantTotal},${stat.nombreVentes}`
    ).join('\n');
    
    return headers + rows;
  }

  /**
   * Obtient les ventes du jour courant
   */
  public getVentesJour(): Observable<VenteStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filtres: StatsFiltres = {
      debut: today,
      fin: new Date(), // maintenant
      typePeriode: 'jour'
    };
    
    return this.getVentesStats(filtres).pipe(
      map(stats => stats[0] || { 
        periode: today.toISOString().split('T')[0],
        montantTotal: 0,
        nombreVentes: 0
      })
    );
  }

  /**
   * Obtient les ventes de la semaine courante
   */
  public getVentesSemaine(): Observable<VenteStats> {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 0 = dimanche, 1-6 = lundi-samedi
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const filtres: StatsFiltres = {
      debut: startOfWeek,
      fin: new Date(), // maintenant
      typePeriode: 'semaine'
    };
    
    return this.getVentesStats(filtres).pipe(
      map(stats => stats[0] || { 
        periode: `Semaine ${this.getWeekNumber(today)}`,
        montantTotal: 0,
        nombreVentes: 0
      })
    );
  }

  /**
   * Obtient les ventes du mois courant
   */
  public getVentesMois(): Observable<VenteStats> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const filtres: StatsFiltres = {
      debut: startOfMonth,
      fin: new Date(), // maintenant
      typePeriode: 'mois'
    };
    
    return this.getVentesStats(filtres).pipe(
      map(stats => stats[0] || { 
        periode: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        montantTotal: 0,
        nombreVentes: 0
      })
    );
  }

  /**
   * Obtient le résumé des ventes (jour, semaine, mois)
   */
  public getResumeCaisse(): Observable<{jour: VenteStats, semaine: VenteStats, mois: VenteStats}> {
    return combineLatest([
      this.getVentesJour(),
      this.getVentesSemaine(),
      this.getVentesMois()
    ]).pipe(
      map(([jour, semaine, mois]) => ({ jour, semaine, mois }))
    );
  }
}