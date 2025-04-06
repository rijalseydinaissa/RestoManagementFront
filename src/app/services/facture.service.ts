import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';


@Injectable({
  providedIn: 'root'
})
export class FactureService {
  // private baseUrl = 'http://localhost:8081';
  private apiUrl = 'http://localhost:8081';
  private endpoint = 'factures';

  constructor(private http: HttpClient, private apiService: ApiService) {
  }
  genererFacture(commandeId: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/${this.endpoint}/generer/${commandeId}`, {
      responseType: 'text', // Indique que la réponse est en texte brut
    });
  }
  
  
  telechargerFacture(urlUnique: string): Observable<any> {
    // Extraire uniquement l'identifiant unique de l'URL complète
    const id = urlUnique.split('/').pop();
    return this.http.get(`${this.apiUrl}/${this.endpoint}/telecharger-facture/${id}`, {
        responseType: 'blob' as 'json',
    });
}
  
}