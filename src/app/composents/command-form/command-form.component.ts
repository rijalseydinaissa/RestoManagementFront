import { CommandeService } from './../../services/commande.service';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
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

interface Table{
  id: number;
  numero: number;
  occupee: boolean;
  capacite:number;
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
export class CommandFormComponent implements OnInit {
  @Output() closed = new EventEmitter<boolean>();

  products: any[] = [];
  commandeForm: FormGroup;
  cartItems: CartItem[] = [];
  tables:Table[]=[];
    
  
  currentTotal: number = 0;

  constructor(
    private fb: FormBuilder,
    private commandeService: CommandeService,
    private tableService: TableService,
    private produitService: ProduitService,
    private alertService: AlertService
  ) {
    this.commandeForm = this.fb.group({
      // clientName: ['', Validators.required],
      tableId: [null, Validators.required],
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1), Validators.pattern('^[0-9]*$')]],
    });
  }
  
  ngOnInit() {
    this.loadProduits();
    this.loadTables();
  }

  private loadProduits() {
    this.produitService.getProducts().subscribe({
      next: (produits) => {
        console.log(produits);
        this.products = produits;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des produits:', err);
      },
    });
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
        date: new Date(),
        status: 'EN_ATTENTE',
        tableId: this.commandeForm.get('tableId')?.value,
        produits: this.cartItems.map((item) => ({
          produitId: item.product.id,
          quantite: item.quantity,
        })),
      };
  
      this.commandeService.createCommande(commande).subscribe({
        next: (response) => {
          this.alertService.closeAlert();
          this.alertService.showSuccess('La commande a été créée avec succès');
          this.resetForm();
        },
        error: (err) => {
          this.alertService.closeAlert();
          
          // Message d'erreur spécifique selon le type d'erreur
          const errorMessage = err.message || 'Impossible de créer la commande';
          
          this.alertService.showError(errorMessage).then((result) => {
            if (result.isConfirmed && !err.message.includes('Accès refusé')) {
              // Ne pas permettre de réessai si c'est une erreur d'autorisation
              this.handleSubmit();
            }
          });
        },
      });
    } else {
      this.showValidationError();
    }
  }
  
  private resetForm(): void {
    this.commandeForm.reset();
    this.cartItems = [];
    this.produitService.loadProducts();
    this.tableService.loadTables();
  }
  
  private showValidationError(): void {
    const message = this.cartItems.length === 0 
      ? 'Votre panier est vide'
      : 'Veuillez remplir tous les champs requis';
    this.alertService.showWarning(message);
    this.commandeForm.markAllAsTouched();
  }


  get clientName() {
    return this.commandeForm.get('clientName')?.value;
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
    if (this.commandeForm.valid) {
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
      }
    }else{
      Object.keys(this.commandeForm.controls).forEach(key => {
        const control = this.commandeForm.get(key);
        control?.markAsTouched();
      });
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
