import { PaginationService } from './../../services/pagination.service';
import { ProduitService } from './../../services/produit.service';
import { Component, ElementRef, Signal, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductFormComponent } from '../product-form/product-form.component';
import { CommonModule } from '@angular/common';
import { OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';

interface Product {
 id: number;
 image: string | null;
 nom: string;
 quantite: number;
 prix: number;
 categorie: string;
 description: string;
 statut: string;
}

@Component({
 selector: 'app-produit',
 standalone: true,
 imports: [CommonModule, FormsModule, ProductFormComponent],
 templateUrl: './produit.component.html',
 styleUrls: ['./produit.component.css'],
})
export class ProduitComponent implements OnInit {
  showProductForm = signal(false);
  searchTerm: string = '';
  selectedFilter: string = 'all';
  selectedProduct: Product | null = null;
  action: boolean = false;
  filteredProducts: Product[] = [];
  products: Product[] = [];
  categories: string[] = [];
  dropdownOpen: boolean = false;

  pageSize = 6;
  currentPage = 1;
  totalPages = 0;
 
  constructor(private produitService: ProduitService, private alertService: AlertService, private paginationService: PaginationService, public authService: AuthService,) {}

  ngOnInit(): void {
    this.produitService.getProducts().subscribe(data => {
      this.products = data;
      this.filteredProducts = this.products;
      this.categories = Array.from(new Set(data.map((product: { categorie: any }) => product.categorie)));
      this.updateTotalPages();
    });
  }

  closeDropdown() {
    this.dropdownOpen = true;
  }
  
//pagination
  updateTotalPages() {
    this.totalPages = this.paginationService.getTotalPages(this.filteredProducts, this.pageSize);
  }

  get paginatedProducts() {
    return this.paginationService.getPaginatedItems(this.filteredProducts, this.currentPage, this.pageSize);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getVisiblePages(): number[] {
    return this.paginationService.getVisiblePages(this.currentPage, this.totalPages);
  }
  //fin pagination

  editProduct(product : Product){
    if (!this.authService.isAdmin()) {
      this.alertService.showError('Action non autorisée. Seuls les administrateurs peuvent effectuer cette action.');
      return;
    }
    this.selectedProduct = product,
    this.showProductForm.set(true);
   }
  filterProducts() {
    if (!this.products) {
      this.filteredProducts = [];
      return;
    }
    const searchLower = (this.searchTerm || '').toLowerCase();
    this.filteredProducts = this.products.filter((product) => {
      if (!product) return false;
      const matchesSearch = product.nom ? 
        product.nom.toLowerCase().includes(searchLower) : false;
      const matchesCategory = this.selectedFilter === 'all' || 
        product.categorie === this.selectedFilter;
      return matchesSearch && matchesCategory;
    });
    this.updateTotalPages();
    this.currentPage = 1;
  }

  deleteProduct(productId: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      this.produitService.deleteProduct(productId).subscribe(
        () => {
          this.products = this.products.filter(p => p.id !== productId);
          this.filterProducts();
        },
        error => {
          console.error('Erreur lors de la suppression du produit:', error);
        }
      );
    }
  }

  handleProductCreated(newProduct: Product) {
    this.filterProducts();
  }

  handleProductUpdated(updatedProduct: Product) {
    if (!updatedProduct) {
      console.error('Updated product is null');
      return;
    }
    const index = this.products.findIndex(p => p.id === updatedProduct.id);
    if (index !== -1) {
      this.products[index] = {
        ...this.products[index],
        ...updatedProduct
      };
      this.filteredProducts = [...this.products];
      this.filterProducts();
    }
    this.selectedProduct = null;
    this.showProductForm.set(false);
  }

  closeForm(event: boolean) {
    this.showProductForm.set(event);
    if (!event) {
      this.selectedProduct = null;
    }
  }
}
