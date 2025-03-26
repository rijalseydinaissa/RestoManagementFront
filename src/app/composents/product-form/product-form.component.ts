import { AuthService } from './../../services/auth.service';
import { ProduitService } from './../../services/produit.service';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AlertService } from '../../services/alert.service';

@Component({
 selector: 'app-product-form',
 templateUrl: './product-form.component.html',
 styleUrls: ['./product-form.component.css'],
 imports: [FormsModule, ReactiveFormsModule, CommonModule],
 standalone: true
})
export class ProductFormComponent {
 @Output() closed = new EventEmitter<boolean>();
 @Output() productCreated = new EventEmitter<any>();
 @Output() productUpdated = new EventEmitter<any>();
 @Input() productToEdit: any = null;
  
 close = signal(false);
 productForm: FormGroup;
 errorMessage: string = '';
 imageFile: File | null = null;
 isEditMode = false;

 constructor(private fb: FormBuilder, private produitService: ProduitService,private alertService: AlertService, public authService: AuthService) {
   this.productForm = this.fb.group({
     nom: ['', [Validators.required]],
     description: ['', [Validators.required, Validators.required]],
     quantite: ['', [Validators.required, Validators.min(1)]],
     categorie: ['', [Validators.required]],
     prix: ['', [Validators.required, Validators.min(1)]],
   });
 }

 ngOnInit(){
   if (this.productToEdit) {
     this.isEditMode = true;
     this.productForm.patchValue({
      nom: this.productToEdit.nom,
      description: this.productToEdit.description,
      quantite: this.productToEdit.quantite,
      categorie: this.productToEdit.categorie,
      prix: this.productToEdit.prix,
     });
   }
 }

 handleClose() {
   this.close.set(!this.close());
   this.closed.emit(this.close());
 }

 onFileChange(event: any) {
   const file = event.target.files[0];
   if (file) {
     this.imageFile = file;
   }
 }

 handleSubmit() {
  if (!this.authService.isAdmin()) {
    this.alertService.showError('Action non autorisée. Seuls les administrateurs peuvent effectuer cette action.');
    return;
  }
  if (this.productForm.valid) {
    this.alertService.showLoading();

    const productData = {
      ...this.productForm.value,
      description: String(this.productForm.value.description),
      prix: Number(this.productForm.value.prix),
      quantite: Number(this.productForm.value.quantite)
    };
    if (this.isEditMode) {
      this.updateProduct(productData);
    } else {
      this.createProduct(productData);
    }
  }
   
}

createProduct(productData: any){
  this.produitService.createProductWithImage(productData ,this.imageFile).subscribe({
    next: (response) => {
      this.handleSuccess(response,"crée");
      this.productCreated.emit(response);
    },
    error: (error) => {
      this.handleError(error);
    }
  });
}
private updateProduct(productData: any) {
  if (!this.productToEdit?.id) {
    this.alertService.showError('Produit invalide');
    return;
  }

  const updateData = {
    id: this.productToEdit.id,
    nom: productData.nom,
    description: productData.description,
    prix: parseFloat(productData.prix),
    quantite: parseInt(productData.quantite),
    categorie: productData.categorie,
    image: this.productToEdit.image // Préserver l'image existante
  };

  this.produitService.updateProduct(this.productToEdit.id, updateData, this.imageFile)
    .subscribe({
      next: (response) => {
        // Utiliser les données envoyées si la réponse est null
        const updatedProduct = response || updateData;
        // Émettre la mise à jour
        this.productUpdated.emit(updatedProduct);
        // Forcer le rechargement des données
        this.produitService.loadProducts();
        this.handleSuccess(updatedProduct, 'mis à jour');
      },
      error: (error) => this.handleError(error)
    });
}

private handleSuccess(response: any, action: string) {
  this.alertService.closeAlert();
  this.alertService.showSuccess(`Le produit a été ${action} avec succès`);
  this.productForm.reset();
  this.imageFile = null;
  this.handleClose();
}

private handleError(error: any) {
  this.alertService.closeAlert();
  this.alertService.showError(`Impossible de ${this.isEditMode ? 'mettre à jour' : 'créer'} le produit`)
    .then((result) => {
      if (result.isConfirmed) {
        this.handleSubmit();
      }
    });
  this.errorMessage = `Erreur lors de la ${this.isEditMode ? 'mise à jour' : 'création'} du produit. Veuillez réessayer.`;
}
}






