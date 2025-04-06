import { CommandeService } from './../../../services/commande.service';
import { AuthService } from './../../../services/auth.service';
import { FactureService } from './../../../services/facture.service';
import { CommonModule, NgClass, NgFor } from '@angular/common';
import { Component, Input, Output, EventEmitter,ViewChild, ComponentRef, ComponentFactoryResolver, ApplicationRef, Injector, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FactureComponent } from '../../facture/facture.component';
import { switchMap, throwError } from 'rxjs';

interface ArticlePanier {
  produit: {
    id: number;
    nom: string;
    prix: number;
    quantite: number;
    image: string;
  }
}

@Component({
  selector: 'app-commande-detail',
  imports: [NgFor, NgClass,CommonModule],
  templateUrl: './commande-detail.component.html',
  styleUrls: ['./commande-detail.component.css'],
  standalone: true
})
export class CommandeDetailComponent implements OnChanges{

  

  @Input() nom: string = '';
  @Input() prenom: string = '';
  @Input() currentTotal: number = 0;
  @Input() cartTotal: number = 0;
  @Input() cartItems: any = [];
  @Input() status: string = 'Non réglée';
  @Output() close = new EventEmitter<boolean>();
  @Output() editRequest = new EventEmitter<void>(); 

  nombreProduits: number = 0;

  @Input() closed: boolean = true;
  @Output() deleteCommand = new EventEmitter<number>(); 
  @Output() updateCommand = new EventEmitter<number>(); 
  @Output() annulerCommand = new EventEmitter<number>(); 
  @Input() commandeId!: number ;

  isEditMode: boolean = false;
  editableCommande: any = {};

  deleteCommande() {
    this.deleteCommand.emit(this.commandeId); // Vous devez ajouter @Input() commandeId: number
    this.closeOverlay();
  }
  requestEdit() {
    this.editRequest.emit();
    }
    annulerCommande() {
      if (confirm('Êtes-vous sûr de vouloir annuler cette commande? Les quantités de produits seront restituées.')) {
        this.annulerCommand.emit(this.commandeId);
      }
    }
    
    // Méthode pour vérifier si l'annulation est possible
    canCancel(): boolean {
      return this.status !== 'SERVI' && this.status !== 'PRET' && this.status !== 'ANNULEE';
    }

  constructor(
    private resolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector,
    private cdr: ChangeDetectorRef,
    private factureService :FactureService,
    public authService: AuthService,private commandeService:CommandeService
  ) {}
  ngOnChanges() {
    // Reset edit mode when commande changes
    // this.isEditMode = false;
    // // Initialize editable commande with current values
    // this.editableCommande = {
    //   id: this.commandeId,
    //   client: this.nom,
    //   status: this.status,
    //   montantTotal: this.currentTotal,
    //   commandeProduits: [...this.cartItems]
    // };
  }
  
  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      // Reset changes if cancelling
      this.ngOnChanges();
    }
  }
  
  saveChanges() {
    this.updateCommand.emit(this.editableCommande);
    this.isEditMode = false;
  }
  
  // updateCartItemQuantity(item: any, change: number) {
  //   item.quantite += change;
  //   // Recalculer le total ici
  //   this.calculateTotal();
  // }
  reglerFacture(commandeId: number): void {
    console.log('Appel de génération de facture pour commande ID :', commandeId);
    
    this.factureService.genererFacture(commandeId).subscribe({
        next: (url: string) => {
            console.log('URL reçue :', url);
            
            this.factureService.telechargerFacture(url).subscribe({
                next: (blob: Blob) => {
                    // Vérifier que le blob est un PDF
                    if (blob.type === 'application/pdf') {
                        const link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = `facture_${commandeId}.pdf`;
                        link.click();
                        window.URL.revokeObjectURL(link.href);
                    } else {
                        console.error('Le fichier reçu n\'est pas un PDF');
                    }
                },
                error: (err) => {
                    console.error('Erreur lors du téléchargement :', err);
                    // Ajouter une notification utilisateur ici
                }
            });
        },
        error: (err) => {
            console.error('Erreur lors de la génération :', err);
            // Ajouter une notification utilisateur ici
        }
    });
}
  
  
  
  private showError(message: string): void {
    // Implémentez votre système de notification ici
    alert(message); // Solution temporaire
  }
  


  removeFromCart(arg: any) {
    this.currentTotal = 500000;
  }

  handleSubmit() {
    console.log('Commande enregistrée');
  }

  closeOverlay() {
    this.closed = !this.closed;
    this.close.emit(this.closed);
  }
}
