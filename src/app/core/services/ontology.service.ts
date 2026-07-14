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
  uploadOntology(file: File, format: string = 'turtle', gcsBucket: string = '', bqDataset: string = ''): Observable<IngestResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', format);
    if (gcsBucket) formData.append('gcs_bucket', gcsBucket);
    if (bqDataset) formData.append('bq_dataset', bqDataset);

    return this.http.post<IngestResponse>(`${this.apiUrl}/ingest`, formData);
  }

  getStatus(jobId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/${jobId}`);
  }

  /**
   * Retrieves a list of available ontologies from the backend repository.
   */
  getOntologies(): Observable<{ontologies: any[]}> {
    return this.http.get<{ontologies: any[]}>(`${this.apiUrl}/ontologies`);
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
    return this.http.get<GraphResponse>(`${this.apiUrl}/graph/${jobId}/expand?node_uri=${encodeURIComponent(nodeUri)}`);
  }

  /**
   * Retrieves the degree (number of connections) for a specific node.
   */
  getDegree(jobId: string, nodeUri: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/graph/${jobId}/degree?node_uri=${encodeURIComponent(nodeUri)}`);
  }

  /**
   * Retrieves all properties and annotations for a specific node.
   */
  getNodeDetails(jobId: string, nodeUri: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/graph/${jobId}/node?node_uri=${encodeURIComponent(nodeUri)}`);
  }

  /**
   * Retrieves the raw materialized N-Triples source.
   */
  getGraphSource(jobId: string): Observable<{ source: string, truncated: boolean }> {
    return this.http.get<{ source: string, truncated: boolean }>(`${this.apiUrl}/graph/${jobId}/source`);
  }

  /**
   * Retrieves the inferred triples.
   */
  getInferences(jobId: string): Observable<{ inferences: any[] }> {
    return this.http.get<{ inferences: any[] }>(`${this.apiUrl}/graph/${jobId}/inferences`);
  }

  /**
   * Sends a message to the Semantic Agent.
   */
  sendChatMessage(jobId: string, message: string, history: any[]): Observable<{ response: string, action: any }> {
    return this.http.post<{ response: string, action: any }>(`${this.apiUrl}/graph/${jobId}/chat`, { message, history });
  }
}
