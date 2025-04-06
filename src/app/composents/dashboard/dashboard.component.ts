import { DashboardService } from './../../services/dashboard.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { StatsCardComponent } from './stats-card/stats-card.component';
import { CommandeService } from '../../services/commande.service';
import { ProduitService } from '../../services/produit.service';
import { firstValueFrom } from 'rxjs';

interface Produit {
  id: number;
  nom: string;
  prix: number;
  prixAchat: number;
  quantite: number;
}

interface CommandeProduit {
  id: number;
  produit: Produit;
  quantite: number;
}

interface Commande {
  id: number;
  date: string;
  status: 'SERVI' | 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET';
  commandeProduits: CommandeProduit[];
}

interface DashboardStats {
  title: string;
  value: string;
  icon: string;
}

interface VenteRecente {
  date: string;
  produit: string;
  quantite: number;
  prixUnitaire: string;
}

interface ProduitVendu {
  produit: string;
  quantite: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StatsCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats[] = [];
  ventes: VenteRecente[] = [];
  plusVendues: ProduitVendu[] = [];
  bientotTermine: ProduitVendu[] = [];
  allCommandes: Commande[] = [];
  
  filterForm = new FormGroup({
    filterType: new FormControl('all'),
    dateJour: new FormControl(''),
    dateDebut: new FormControl(''),
    dateFin: new FormControl('')
  });

  constructor(
    private commandeService: CommandeService,
    private produitService: ProduitService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  async loadDashboardData() {
    try {
      // Charger d'abord toutes les commandes
      this.allCommandes = await firstValueFrom(this.dashboardService.getCommands());
      
      // Appliquer les filtres
      this.applyFilters();
      
      // Charger les autres données
      await Promise.all([
        this.loadProduitsPlusVendus(),
        this.loadProduitsBientotTermines(),
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }
  
  applyFilters() {
    const filterType = this.filterForm.get('filterType')?.value;
    const dateJour = this.filterForm.get('dateJour')?.value;
    const dateDebut = this.filterForm.get('dateDebut')?.value;
    const dateFin = this.filterForm.get('dateFin')?.value;
    
    let filteredCommandes = [...this.allCommandes];
    
    if (filterType === 'jour' && dateJour) {
      // Filtrer pour une date spécifique choisie
      const selectedDate = new Date(dateJour).toISOString().split('T')[0];
      filteredCommandes = this.allCommandes.filter(cmd => 
        new Date(cmd.date).toISOString().split('T')[0] === selectedDate
      );
    } else if (filterType === 'semaine') {
      // Filtrer pour la semaine en cours
      const today = new Date();
      const firstDayOfWeek = new Date(today);
      firstDayOfWeek.setDate(today.getDate() - today.getDay());
      
      filteredCommandes = this.allCommandes.filter(cmd => {
        const cmdDate = new Date(cmd.date);
        return cmdDate >= firstDayOfWeek && cmdDate <= today;
      });
    } else if (filterType === 'mois') {
      // Filtrer pour le mois en cours
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      filteredCommandes = this.allCommandes.filter(cmd => {
        const cmdDate = new Date(cmd.date);
        return cmdDate >= firstDayOfMonth && cmdDate <= today;
      });
    } else if (filterType === 'periode' && dateDebut && dateFin) {
      // Filtrer pour une période spécifique
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      
      filteredCommandes = this.allCommandes.filter(cmd => {
        const cmdDate = new Date(cmd.date);
        return cmdDate >= debut && cmdDate <= fin;
      });
    }
    
    // Mettre à jour les statistiques et les ventes récentes avec les commandes filtrées
    this.updateStatsWithFilteredData(filteredCommandes);
    this.updateVentesRecentesWithFilteredData(filteredCommandes);
  }
  
  private updateStatsWithFilteredData(commandes: Commande[]) {
    const totalCommandes = commandes.length;
    const ventesValidees = commandes.filter(cmd => cmd.status === 'SERVI').length;
    let revenus = 0;
    
    for (const cmd of commandes.filter(cmd => cmd.status === 'SERVI')) {
      for (const cp of cmd.commandeProduits) {
        const produit = cp.produit;
        if (produit.prix) {
          // Si vous n'avez plus le prix d'achat, calculez simplement le chiffre d'affaires
          revenus += produit.prix * cp.quantite;
        }
      }
    }

    this.stats = [
      { title: 'Commandes', value: totalCommandes.toString(), icon: 'commandes.png' },
      { title: 'Ventes', value: ventesValidees.toString(), icon: 'ventes.png' },
      { title: 'Revenus', value: `${revenus.toFixed(2)} fr`, icon: 'revenues.png' },
    ];
  }
  
  private updateVentesRecentesWithFilteredData(commandes: Commande[]) {
    this.ventes = commandes
      .filter(cmd => cmd.status === 'SERVI' && cmd.commandeProduits?.length > 0)
      .slice(-8)
      .map(cmd => ({
        date: new Date(cmd.date).toLocaleDateString(),
        produit: cmd.commandeProduits[0]?.produit.nom || 'Produit inconnu',
        quantite: cmd.commandeProduits.reduce((sum, cp) => sum + cp.quantite, 0),
        prixUnitaire: `${cmd.commandeProduits[0]?.produit.prix || 0} fr`,
      }));
  }

  private async loadProduitsPlusVendus() {
    try {
      const ventesParProduit = new Map<number, { nom: string; totalQuantite: number }>();

      this.allCommandes
        .filter(cmd => cmd.status === 'SERVI')
        .forEach(cmd => {
          cmd.commandeProduits.forEach(cp => {
            const produit = cp.produit;
            if (ventesParProduit.has(produit.id)) {
              const existing = ventesParProduit.get(produit.id)!;
              existing.totalQuantite += cp.quantite;
            } else {
              ventesParProduit.set(produit.id, { nom: produit.nom, totalQuantite: cp.quantite });
            }
          });
        });

      this.plusVendues = Array.from(ventesParProduit.values())
        .sort((a, b) => b.totalQuantite - a.totalQuantite)
        .slice(0, 5)
        .map(({ nom, totalQuantite }) => ({
          produit: nom,
          quantite: totalQuantite,
        }));
    } catch (error) {
      console.error('Erreur lors du chargement des produits les plus vendus:', error);
      this.plusVendues = [];
    }
  }

  private async loadProduitsBientotTermines() {
    try {
      const produits = await firstValueFrom(this.dashboardService.getProduits());
      this.bientotTermine = produits
        .filter((p: { quantite: number | null; }) => p.quantite != null && p.quantite <= 5)
        .map((p: { nom: any; quantite: any; }) => ({
          produit: p.nom,
          quantite: p.quantite,
        }))
        .slice(0, 5);
    } catch (error) {
      console.error('Erreur lors du chargement des produits bientôt terminés:', error);
      this.bientotTermine = [];
    }
  }
}