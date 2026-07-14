import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OntologyGraphComponent } from '../ontology-graph/ontology-graph.component';
import { OntologyService } from '../../core/services/ontology.service';
import { timer, of } from 'rxjs';
import { exhaustMap, takeWhile, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, OntologyGraphComponent],
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

  // Agent State
  chatInputMessage = '';
  chatHistory: any[] = [
    { role: 'model', text: "Hello! I'm your Semantic Agent. I am connected to this ontology and can help you navigate or query it. Try asking me: 'Show subclasses of WorkPiece' or 'What properties are there?'." }
  ];
  isAgentTyping = false;

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

  sendMessageToAgent() {
    if (!this.chatInputMessage.trim() || !this.currentJobId || this.isAgentTyping) return;

    const userText = this.chatInputMessage;
    this.chatInputMessage = '';
    
    // Add user message
    this.chatHistory.push({ role: 'user', text: userText });
    this.isAgentTyping = true;

    // Send to backend Gemini agent
    // Map history to backend-friendly format: role: user|model, text: string
    const historyPayload = this.chatHistory.slice(0, -1).map(h => ({ role: h.role, text: h.text }));

    this.ontologyService.sendChatMessage(this.currentJobId, userText, historyPayload).subscribe({
      next: (res) => {
        this.isAgentTyping = false;
        this.chatHistory.push({ role: 'model', text: res.response });

        // Execute structural action if returned
        if (res.action && res.action.type && res.action.uri) {
          console.log("[Semantic Agent Action Triggered]", res.action);
          if (res.action.type === 'reveal') {
            this.revealNodeInVisualizer(res.action.uri, new Event('agent-trigger'));
          } else if (res.action.type === 'expand') {
            this.onExpandNodeRequest(res.action.uri);
          }
        }
      },
      error: (err) => {
        console.error(err);
        this.isAgentTyping = false;
        this.chatHistory.push({ role: 'model', text: "Sorry, I had trouble contacting my backend reasoning module." });
      }
    });
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
