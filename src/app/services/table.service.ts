import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { map, Observable, tap } from 'rxjs';




export interface TableResponse {
  id: number;
  numero: number;
  occupee: boolean;
  capacite:number;
}
@Injectable({
  providedIn: 'root'
})
export class TableService {
  private endpoint = 'tables';
  private tablesSubject = new BehaviorSubject<TableResponse[]>([]);
  tables$ = this.tablesSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadTables();
  }

  public loadTables(): void {
    this.apiService.get<TableResponse[]>(this.endpoint).subscribe({
      next: (tables) => this.tablesSubject.next(tables),
      error: (err) => console.error('Error loading tables:', err)
    });
  }

  public getTables(): Observable<TableResponse[]> {
    return this.tables$;
  }

  public getAvailableTables(): Observable<TableResponse[]> {
    return this.tables$.pipe(
      map((tables: any[]) => tables.filter(table => !table.occupee))
    );
  }

  public createTable(tableData: { numero: number }): Observable<TableResponse> {
    return this.apiService.post<TableResponse>(this.endpoint, tableData).pipe(
      tap((newTable: TableResponse) => {
        const currentTables = this.tablesSubject.getValue();
        this.tablesSubject.next([...currentTables, newTable]);
      })
    );
  }

  public updateTableStatus(id: number, occupee: boolean): Observable<TableResponse> {
    return this.apiService.patch<TableResponse>(`${this.endpoint}/${id}/status`, { occupee }).pipe(
      tap(updatedTable => {
        const currentTables = this.tablesSubject.getValue();
        const updatedTables = currentTables.map(table => 
          table.id === id ? updatedTable : table
        );
        this.tablesSubject.next(updatedTables);
      })
    );
  }

  // public deleteTable(id: number): Observable<void> {
  //   return this.apiService.delete(`${this.endpoint}/${id}`).pipe(
  //     tap(() => {
  //       const currentTables = this.tablesSubject.getValue();
  //       this.tablesSubject.next(currentTables.filter(table => table.id !== id));
  //     })
  //   );
  // }
}