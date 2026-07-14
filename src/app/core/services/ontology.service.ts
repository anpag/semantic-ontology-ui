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
   * Retrieves the Cytoscape-formatted graph data for a specific job.
   */
  getGraph(jobId: string): Observable<GraphResponse> {
    return this.http.get<GraphResponse>(`${this.apiUrl}/graph/${jobId}`);
  }
}
