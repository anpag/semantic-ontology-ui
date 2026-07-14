import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IngestResponse {
  status: string;
  message: string;
  job_id: string;
}

export interface GraphResponse {
  elements: any[];
}

@Injectable({
  providedIn: 'root'
})
export class OntologyService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  /**
   * Uploads an ontology file to the GEB engine for background reasoning.
   */
  uploadOntology(file: File, format: string = 'turtle'): Observable<IngestResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);

    return this.http.post<IngestResponse>(`${this.apiUrl}/ingest`, formData);
  }

  /**
   * Retrieves the root nodes for a specific job.
   */
  getRoots(jobId: string): Observable<GraphResponse> {
    return this.http.get<GraphResponse>(`${this.apiUrl}/graph/${jobId}/roots`);
  }

  /**
   * Retrieves the expanded subgraph around a specific node.
   */
  expandNode(jobId: string, nodeUri: string): Observable<GraphResponse> {
    return this.http.get<GraphResponse>(`${this.apiUrl}/graph/${jobId}/expand?uri=${encodeURIComponent(nodeUri)}`);
  }

  /**
   * Retrieves the degree (number of connections) for a specific node.
   */
  getDegree(jobId: string, nodeUri: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/graph/${jobId}/degree?uri=${encodeURIComponent(nodeUri)}`);
  }
}
