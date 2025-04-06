import { CommandeService } from './../../services/commande.service';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { AlertService } from '../../services/alert.service';
import { ProduitService } from '../../services/produit.service';
import { TableService } from '../../services/table.service';

interface Product {
  id: number;
  nom: string;
  prix: number;
  image: string;
}

interface Table {
  id: number;
  numero: number;
  occupee: boolean;
  capacite: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-command-form',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './command-form.component.html',
  styleUrl: './command-form.component.css',
})
export class CommandFormComponent implements OnInit, OnChanges {
  @Output() closed = new EventEmitter<boolean>();
  @Input() editMode: boolean = false;
  @Input() commandeToEdit: any = null;
  @Output() commandeUpdated = new EventEmitter<any>();

  products: any[] = [];
  commandeForm: FormGroup;
  cartItems: CartItem[] = [];
  tables: Table[] = [];
  
  formTitle: string = 'Nouvelle Commande';
  submitButtonText: string = 'Créer Commande';
  
  currentTotal: number = 0;

  constructor(
    private fb: FormBuilder,
    private commandeService: CommandeService,
    private tableService: TableService,
    private produitService: ProduitService,
    private alertService: AlertService
  ) {
    this.commandeForm = this.fb.group({
      tableId: [null, Validators.required],
      productId: [null],
      quantity: [1, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]*$')]],
    });
  }
  
  ngOnInit() {
    this.loadProduits();
    this.loadTables();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['commandeToEdit'] && this.commandeToEdit) {
      this.setupEditMode();
    }
    
    if (changes['editMode']) {
      this.updateFormLabels();
    }
  }
  
  private setupEditMode() {
    if (this.commandeToEdit && this.editMode) {
      // Charger les valeurs du formulaire
      this.commandeForm.patchValue({
        tableId: this.commandeToEdit.tableId || this.commandeToEdit.table?.id,
      });
      
      // Charger les produits dans le panier
      this.cartItems = [];
      if (this.commandeToEdit.commandeProduits && this.commandeToEdit.commandeProduits.length > 0) {
        this.commandeToEdit.commandeProduits.forEach((item: any) => {
          this.cartItems.push({
            product: item.produit,
            quantity: item.quantite
          });
        });
      }
      
      // Assurez-vous que le formulaire est valide après initialisation
      this.commandeForm.updateValueAndValidity();
    }
  }
  
  private updateFormLabels() {
    if (this.editMode) {
      this.formTitle = 'Modifier Commande';
      this.submitButtonText = 'Enregistrer Modifications';
    } else {
      this.formTitle = 'Nouvelle Commande';
      this.submitButtonText = 'Créer Commande';
    }
  }

  private loadProduits() {
    this.produitService.getProducts().subscribe({
      next: (produits) => {
        this.products = produits;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des produits:', err);
      },
    });
  }
getProductAvailability(productId: number): { available: boolean, message?: string } {
  const product = this.products.find(p => p.id === productId);
  if (!product) return { available: false, message: 'Produit introuvable' };
  if (!product.disponible) return { available: false, message: 'Produit indisponible' };
  return { available: true };
}
  
  private loadTables() {
    this.tableService.getAvailableTables().subscribe({
      next: (tables) => this.tables = tables,
      error: (err) => console.error('Erreur chargement tables:', err)
    });
  }

  handleSubmit() {
    if (this.commandeForm.valid && this.cartItems.length > 0) {
      this.alertService.showLoading();
      
      const commande = {
        id: this.editMode ? this.commandeToEdit.id : undefined,
        date: new Date(),
        status: this.editMode ? this.commandeToEdit.status : 'EN_ATTENTE',
        tableId: this.commandeForm.get('tableId')?.value,
        produits: this.cartItems.map((item) => ({
          produitId: item.product.id,
          quantite: item.quantity,
        })),
      };
      
      if (this.editMode) {
        this.updateExistingCommande(commande);
      } else {
        this.createNewCommande(commande);
      }
    } else {
      this.showValidationError();
    }
  }
  
  // private createNewCommande(commande: any) {
  //   this.commandeService.createCommande(commande).subscribe({
  //     next: (response) => {
  //       this.alertService.closeAlert();
  //       // Afficher le message de succès SEULEMENT si le backend a répondu avec succès
  //       this.alertService.showSuccess('La commande a été créée avec succès');
  //       this.resetForm();
  //     },
  //     error: (err) => {
  //       this.alertService.closeAlert();
  //       // Afficher le message d'erreur exact du backend
  //       console.error("Erreur détectée:", err);
  //       this.alertService.showError(err.message || 'Erreur lors de la création de la commande');
        
  //       // Recharger les produits pour avoir les stocks à jour
  //       this.produitService.loadProducts();
  //     }
  //   });
  // }
  
  private createNewCommande(commande: any) {
    this.commandeService.createCommande(commande).subscribe({
      next: (response) => {
        this.alertService.closeAlert();
        // Afficher le message de succès SEULEMENT si le backend a répondu avec succès
        this.alertService.showSuccess('La commande a été créée avec succès');
        this.resetForm();
      },
      error: (err) => {
        this.alertService.closeAlert();
        // Afficher le message d'erreur exact du backend
        console.error("Erreur détectée:", err);
        this.alertService.showError(err.message || 'Erreur lors de la création de la commande');
        
        // Recharger les produits pour avoir les stocks à jour
        this.produitService.loadProducts();
      }
    });
  }
  private updateExistingCommande(commande: any) {
    this.commandeService.updateCommande(commande.id, commande).subscribe({
      next: (response) => {
        this.alertService.closeAlert();
        this.alertService.showSuccess('La commande a été mise à jour avec succès');
        this.commandeUpdated.emit(response);
        this.resetForm();
        this.close();
      },
      error: (err) => {
        this.handleError(err);
      },
    });
  }
  
  private handleError(err: any) {
    this.alertService.closeAlert();
    // Si le backend renvoie un message clair, on l'affiche
    if (err.error && typeof err.error === 'string') {
        this.alertService.showError(err.error);
    } 
    // Sinon, message par défaut
    else {
        this.alertService.showError('Erreur lors du traitement de la commande');
    }
}
  
  private resetForm(): void {
    this.commandeForm.reset();
    this.cartItems = [];
    this.produitService.loadProducts();
    this.tableService.loadTables();
    this.editMode = false;
    this.commandeToEdit = null;
    this.updateFormLabels();
  }
  
  private showValidationError(): void {
    const message = this.cartItems.length === 0 
      ? 'Votre panier est vide'
      : 'Veuillez remplir tous les champs requis';
    this.alertService.showWarning(message);
    this.commandeForm.markAllAsTouched();
  }

  get cartTotal() {
    return this.cartItems.reduce(
      (total, item) => total + item.product.prix * item.quantity,
      0
    );
  }
  
  updateTotalPrice() {
    const productId = this.commandeForm.get('productId')?.value;
    const quantity = this.commandeForm.get('quantity')?.value;

    if (productId && quantity) {
      const product = this.products.find((p) => p.id === Number(productId));
      if (product) {
        this.currentTotal = product.prix * quantity;
      }
    } else {
      this.currentTotal = 0;
    }
  }

  addToCart() {
    if (this.commandeForm.get('productId')?.valid && this.commandeForm.get('quantity')?.valid) {
      const productId = Number(this.commandeForm.get('productId')?.value);
      const quantity = Number(this.commandeForm.get('quantity')?.value);
      const product = this.products.find((p) => p.id === productId);

      if (product) {
        const existingItem = this.cartItems.find(
          (item) => item.product.id === product.id
        );

        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          this.cartItems.push({ product, quantity });
        }

        this.currentTotal = 0;
        this.commandeForm.get('productId')?.reset();
        this.commandeForm.get('quantity')?.setValue(1);
      }
    } else {
      this.commandeForm.get('productId')?.markAsTouched();
      this.commandeForm.get('quantity')?.markAsTouched();
    }
  }

  updateCartItemQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      item.quantity = newQuantity;
    }
  }

  removeFromCart(item: CartItem) {
    const index = this.cartItems.indexOf(item);
    if (index > -1) {
      this.cartItems.splice(index, 1);
    }
  }
  
  close() {
    this.closed.emit(false);
  }
}