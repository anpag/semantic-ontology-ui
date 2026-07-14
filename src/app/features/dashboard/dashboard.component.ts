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
  selectedNodeDetails: any = null;
  graphData: any[] = [];
  displayMode: 'label' | 'uri' = 'label';
  isLoading = false;
  statusMessage = '';
  currentJobId = '';
  selectedNodeId: string | null = null;

  // Tab State
  activeTab: 'visual' | 'rdf' | 'inferences' = 'visual';
  rdfSource = '';
  rdfSourceTruncated = false;
  inferredTriples: any[] = [];
  isTabLoading = false;

  constructor(
    private ontologyService: OntologyService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const jobId = params.get('jobId');
      if (jobId) {
        this.currentJobId = jobId;
        this.loadOntologyFromRepo(jobId);
        // Reset tab data when switching ontologies
        this.rdfSource = '';
        this.inferredTriples = [];
        this.activeTab = 'visual';
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
    this.selectedNodeDetails = null;
    if (this.currentJobId && node && node.uri) {
      this.ontologyService.getNodeDetails(this.currentJobId, node.uri).subscribe({
        next: (res) => {
          this.selectedNodeDetails = res.properties;
        },
        error: (err) => console.error("Error fetching node details", err)
      });
    }
  }

  getPropertyKeys(): string[] {
    if (!this.selectedNodeDetails) return [];
    const keys = Object.keys(this.selectedNodeDetails);
    const priority = ['prefLabel', 'altLabel', 'definition', 'comment', 'type'];
    return keys.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  isAbsoluteUri(uri: string): boolean {
    return !!(uri && (uri.startsWith('http://') || uri.startsWith('https://')));
  }

  switchTab(tab: 'visual' | 'rdf' | 'inferences') {
    this.activeTab = tab;
    if (!this.currentJobId) return;

    if (tab === 'rdf' && !this.rdfSource) {
      this.isTabLoading = true;
      this.ontologyService.getGraphSource(this.currentJobId).subscribe({
        next: (res) => {
          this.rdfSource = res.source;
          this.rdfSourceTruncated = res.truncated;
          this.isTabLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isTabLoading = false;
        }
      });
    } else if (tab === 'inferences' && this.inferredTriples.length === 0) {
      this.isTabLoading = true;
      this.ontologyService.getInferences(this.currentJobId).subscribe({
        next: (res) => {
          this.inferredTriples = res.inferences;
          this.isTabLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.isTabLoading = false;
        }
      });
    }
  }

  selectInferenceSubject(subjectUri: string) {
    const shortName = subjectUri.split('#').pop() || subjectUri.split('/').pop() || subjectUri;
    this.onNodeSelected({ id: subjectUri, name: shortName, uri: subjectUri, type: 'class' });
  }

  revealNodeInVisualizer(subjectUri: string, event: Event) {
    event.stopPropagation();
    const shortName = subjectUri.split('#').pop() || subjectUri.split('/').pop() || subjectUri;
    
    const exists = this.graphData.some(ele => ele.data.id === subjectUri);
    if (!exists) {
      this.graphData = [...this.graphData, { data: { id: subjectUri, name: shortName, uri: subjectUri, type: 'class' } }];
    }
    
    this.activeTab = 'visual';
    this.selectedNodeId = subjectUri;
    this.onNodeSelected({ id: subjectUri, name: shortName, uri: subjectUri, type: 'class' });
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
