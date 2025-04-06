import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CardlineComponent } from "./cardline/cardline.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-commande-card',
  imports: [CardlineComponent,CommonModule],
  templateUrl: './commande-card.component.html',
  styleUrl: './commande-card.component.css'
})
export class CommandeCardComponent {
  @Input() id!: number;
  @Input() client!: string;
  @Input() date!: string;
  @Input() nombreProduits!: number;
  @Input() total!: number;
  @Input() status!: string;
  @Output() openDetail = new EventEmitter();
  @Output() statusChange = new EventEmitter<{id: number, status: string}>();
  @Output() annulerCommande = new EventEmitter<number>();
  
  private statusProgression: { [key: string]: string } = {
    'EN_ATTENTE': 'EN_PREPARATION',
    'EN_PREPARATION': 'PRET',
    'PRET': 'SERVI',
  };
  
  private statusColors: { [key: string]: string } = {
    'EN_ATTENTE': 'bg-yellow-100 text-yellow-800',
    'EN_PREPARATION': 'bg-blue-100 text-blue-800',
    'PRET': 'bg-orange-100 text-green-800',
    'SERVI': 'bg-green text-gray-800',
    'ANNULEE': 'bg-red text-red-800',
  };
  
  open() {
    this.openDetail.emit(true);
  }
  
  updateStatus() {
    const nextStatus = this.statusProgression[this.status];
    if (nextStatus) {
        // Pour les cuisiniers, confirmation avant prise en charge
        if (this.status === 'EN_ATTENTE' && nextStatus === 'EN_PREPARATION') {
            if (confirm('Prendre en charge cette commande ?')) {
                this.statusChange.emit({ id: this.id, status: nextStatus });
            }
        } else {
            this.statusChange.emit({ id: this.id, status: nextStatus });
        }
    }
  }
  
  annuler() {
    this.annulerCommande.emit(this.id);
  }
  
  getStatusColor(): string {
    return this.statusColors[this.status] || 'bg-gray-100 text-gray-800';
  }
  
  canCancel(): boolean {
    // On peut annuler une commande si elle n'est pas déjà pret servie ou annulée
    return this.status !== 'SERVI' && this.status !== 'PRET' && this.status !== 'ANNULEE';
  }
}