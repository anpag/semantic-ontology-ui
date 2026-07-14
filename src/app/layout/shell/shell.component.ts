import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { OntologyService } from '../../core/services/ontology.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit {
  activeJobId: string | null = null;
  activeOntologyName: string = '';
  availableOntologies: any[] = [];

  constructor(private router: Router, private ontologyService: OntologyService) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const match = event.urlAfterRedirects.match(/\/ontology\/([^/]+)/);
      if (match) {
        this.activeJobId = match[1];
        this.resolveOntologyName(this.activeJobId);
      } else {
        this.activeJobId = null;
        this.activeOntologyName = '';
      }
    });

    this.fetchOntologies();
  }

  fetchOntologies() {
    this.ontologyService.getOntologies().subscribe({
      next: (res) => {
        this.availableOntologies = res.ontologies;
        if (this.activeJobId) {
          this.resolveOntologyName(this.activeJobId);
        }
      }
    });
  }

  private resolveOntologyName(jobId: string | null) {
    if (!jobId) return;
    const found = this.availableOntologies.find(o => o.job_id === jobId);
    this.activeOntologyName = found ? found.name : jobId;
  }
}
