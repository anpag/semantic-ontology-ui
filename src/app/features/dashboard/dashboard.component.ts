import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OntologyGraphComponent } from '../ontology-graph/ontology-graph.component';
import { OntologyService } from '../../core/services/ontology.service';
import { timer, of } from 'rxjs';
import { switchMap, takeWhile, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, OntologyGraphComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  selectedNode: any = null;
  graphData: any[] = [];
  isLoading = false;
  statusMessage = '';

  constructor(private ontologyService: OntologyService) {}

  onNodeSelected(node: any) {
    this.selectedNode = node;
  }

  triggerFileInput() {
    const fileInput = document.getElementById('ontology-file-input') as HTMLInputElement;
    fileInput.click();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isLoading = true;
      this.statusMessage = 'Uploading ontology...';
      const format = file.name.endsWith('.ttl') ? 'turtle' : 'xml';
      
      this.ontologyService.uploadOntology(file, format).subscribe({
        next: (res) => {
          this.statusMessage = 'Ingested. Executing GEB Rust reasoner...';
          this.pollGraphData(res.job_id);
        },
        error: (err) => {
          this.isLoading = false;
          this.statusMessage = 'Upload failed. Check backend connection.';
          console.error(err);
        }
      });
    }
  }

  private pollGraphData(jobId: string) {
    // Poll the graph endpoint every 2 seconds until it resolves successfully
    let completed = false;
    timer(0, 2000).pipe(
      switchMap(() => this.ontologyService.getGraph(jobId).pipe(
        catchError(() => {
          // If backend returns 404 or fails, we keep polling
          return of(null);
        })
      )),
      takeWhile(res => res === null || !completed, true)
    ).subscribe({
      next: (res) => {
        if (res && res.elements) {
          completed = true;
          this.graphData = res.elements;
          this.isLoading = false;
          this.statusMessage = '';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.statusMessage = 'Error during graph compilation.';
        console.error(err);
      }
    });
  }
}
