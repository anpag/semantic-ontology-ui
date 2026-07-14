import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OntologyService } from '../../core/services/ontology.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss'
})
export class LibraryComponent implements OnInit {
  availableOntologies: any[] = [];
  selectedFile: File | null = null;
  gcsBucket: string = 'gs://semantic-ontologies-raw';
  bqDataset: string = 'semantic_platform.materialized_graphs';
  isUploading = false;
  uploadStatus = '';

  constructor(private ontologyService: OntologyService, private router: Router) {}

  ngOnInit() {
    this.fetchOntologies();
  }

  fetchOntologies() {
    this.ontologyService.getOntologies().subscribe({
      next: (res) => {
        this.availableOntologies = res.ontologies;
      },
      error: (err) => console.error("Could not fetch ontology repository", err)
    });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  uploadOntology() {
    if (!this.selectedFile) return;
    this.isUploading = true;
    this.uploadStatus = 'Uploading to Google Cloud Storage...';
    const format = this.selectedFile.name.endsWith('.ttl') ? 'turtle' : 'xml';
    
    // Pass the GCS and BQ params to the backend
    this.ontologyService.uploadOntology(this.selectedFile, format, this.gcsBucket, this.bqDataset).subscribe({
      next: (res) => {
        this.uploadStatus = 'Materializing graph into BigQuery...';
        // Wait 2 seconds for visual effect before redirecting
        setTimeout(() => {
          this.router.navigate(['/ontology', res.job_id]);
        }, 1500);
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadStatus = 'Upload failed. Check backend connection.';
        console.error(err);
      }
    });
  }

  openOntology(jobId: string) {
    this.router.navigate(['/ontology', jobId]);
  }
}
