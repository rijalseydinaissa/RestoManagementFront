import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:8081';

  constructor(private http:HttpClient) {  }


  public getHeaders(){
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`, // Add token to the headers
    });
    return headers;
  }
  
  get<T>(endpoint: string ,params?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`,{params, headers:this.getHeaders()});
  }
  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, data, {headers:this.getHeaders()});
  }
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, data, {headers:this.getHeaders()});
  }
  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${endpoint}`, {headers:this.getHeaders()});
  }
  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${endpoint}`, data, {headers:this.getHeaders()});
  }
  uploadFile<T>(endpoint: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, formData, {headers:this.getHeaders()});
  }

}