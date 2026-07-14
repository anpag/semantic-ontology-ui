import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OntologyGraphComponent } from '../ontology-graph/ontology-graph.component';
import { OntologyService } from '../../core/services/ontology.service';
import { timer, of } from 'rxjs';
import { exhaustMap, takeWhile, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, OntologyGraphComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  selectedNode: any = null;
  graphData: any[] = [];
  displayMode: 'label' | 'uri' = 'label';
  isLoading = false;
  statusMessage = '';
  currentJobId = '';

  constructor(
    private ontologyService: OntologyService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const jobId = params.get('jobId');
      if (jobId) {
        this.loadOntologyFromRepo(jobId);
      }
    });
  }

  loadOntologyFromRepo(jobId: string) {
    this.isLoading = true;
    this.statusMessage = 'Loading from repository...';
    this.pollGraphData(jobId);
  }

  toggleDisplayMode() {
    this.displayMode = this.displayMode === 'label' ? 'uri' : 'label';
  }

  onNodeSelected(node: any) {
    this.selectedNode = node;
  }



  private pollGraphData(jobId: string) {
    let completed = false;
    this.currentJobId = jobId;
    
    // Poll the status endpoint every 500ms
    timer(0, 500).pipe(
      exhaustMap(() => this.ontologyService.getStatus(jobId).pipe(
        catchError(() => of({ status: 'Connecting to server...' }))
      )),
      takeWhile(res => !completed)
    ).subscribe({
      next: (res) => {
        this.statusMessage = res.status;
        
        if (res.status === 'Completed' || res.status.startsWith('Error')) {
            completed = true;
            if (res.status === 'Completed') {
                // Now fetch the actual graph roots
                this.statusMessage = 'Rendering graph...';
                this.ontologyService.getRoots(jobId).subscribe({
                    next: (rootRes) => {
                        this.graphData = rootRes.elements || [];
                        this.isLoading = false;
                        this.statusMessage = '';
                    },
                    error: (err) => {
                        this.isLoading = false;
                        this.statusMessage = 'Error rendering graph.';
                        console.error(err);
                    }
                });
            } else {
                this.isLoading = false;
            }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.statusMessage = 'Polling error.';
        console.error(err);
      }
    });
  }

  onExpandNodeRequest(nodeUri: string) {
    if (!this.currentJobId) return;

    this.isLoading = true;
    this.statusMessage = 'Fetching node degree...';

    this.ontologyService.getDegree(this.currentJobId, nodeUri).subscribe({
      next: (res) => {
        if (res.count > 50) {
          const proceed = confirm(`This node has ${res.count} connections. Expanding it might clutter the graph. Do you want to proceed?`);
          if (!proceed) {
            this.isLoading = false;
            this.statusMessage = '';
            return;
          }
        }
        
        this.statusMessage = 'Expanding node...';
        this.ontologyService.expandNode(this.currentJobId, nodeUri).subscribe({
          next: (expandRes) => {
            if (expandRes && expandRes.elements) {
              this.graphData = [...this.graphData, ...expandRes.elements];
            }
            this.isLoading = false;
            this.statusMessage = '';
          },
          error: (err) => {
            this.isLoading = false;
            this.statusMessage = 'Error expanding node.';
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.statusMessage = 'Error fetching node degree.';
        console.error(err);
      }
    });
  }
}
