import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import cytoscape from 'cytoscape';

@Component({
  selector: 'app-ontology-graph',
  standalone: true,
  templateUrl: './ontology-graph.component.html',
  styleUrl: './ontology-graph.component.scss'
})
export class OntologyGraphComponent implements AfterViewInit, OnChanges {
  @ViewChild('cy') cyElement!: ElementRef;
  @Input() graphData: any[] = [];
  @Output() nodeSelected = new EventEmitter<any>();
  @Output() expandNodeRequest = new EventEmitter<string>();
  
  private cy: cytoscape.Core | undefined;

  ngAfterViewInit(): void {
    this.initGraph();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['graphData'] && this.cy) {
      this.cy.batch(() => {
        if (this.graphData && this.graphData.length > 0) {
          const newDataIds = new Set();
          this.graphData.forEach(ele => {
            if (ele.data.source && ele.data.target && !ele.data.id) {
              ele.data.id = `${ele.data.source}-${ele.data.target}-${ele.data.label}`;
            }
            newDataIds.add(ele.data.id);
          });

          // Remove elements not in new graphData
          this.cy!.elements().forEach(ele => {
            if (!newDataIds.has(ele.id())) {
              this.cy!.remove(ele);
            }
          });

          const existingIds = new Set(this.cy!.elements().map(ele => ele.id()));
          const newEles = this.graphData.filter(ele => !existingIds.has(ele.data.id));

          if (newEles.length > 0) {
            this.cy!.add(newEles);
            this.cy!.layout({
              name: 'breadthfirst',
              directed: true,
              padding: 50,
              spacingFactor: 1.5,
              animate: true,
              fit: false,
              randomize: false
            }).run();
          }
        } else {
          this.cy!.elements().remove();
        }
      });
    }
  }

  private initGraph(): void {
    this.cy = cytoscape({
      container: this.cyElement.nativeElement,
      elements: this.graphData.length > 0 ? this.graphData : [
        { data: { id: 'thing', name: 'owl:Thing', type: 'root', uri: 'http://www.w3.org/2002/07/owl#Thing' } },
        { data: { id: 'person', name: 'geb:Person', type: 'class', uri: 'http://geb.engine/onto#Person' } },
        { data: { id: 'org', name: 'geb:Organization', type: 'class', uri: 'http://geb.engine/onto#Organization' } },
        { data: { id: 'worksFor', name: 'worksFor', type: 'property', uri: 'http://geb.engine/onto#worksFor' } },
        { data: { source: 'person', target: 'thing', label: 'subClassOf' } },
        { data: { source: 'org', target: 'thing', label: 'subClassOf' } },
        { data: { source: 'person', target: 'worksFor', label: 'domain' } },
        { data: { source: 'worksFor', target: 'org', label: 'range' } }
      ],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(name)',
            'shape': 'round-rectangle',
            'background-color': '#ffffff',
            'border-color': '#e5e7eb',
            'border-width': 1,
            'color': '#111827',
            'font-family': 'Menlo, Monaco, monospace',
            'font-size': '11px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 'label',
            'padding': '10px'
          }
        },
        {
          selector: 'node[type="root"]',
          style: {
            'border-color': '#2563eb',
            'border-width': 2,
            'color': '#2563eb',
            'font-weight': 'bold'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#d1d5db',
            'target-arrow-color': '#d1d5db',
            'target-arrow-shape': 'triangle',
            'curve-style': 'taxi', // Orthogonal routing for architecture feel
            'taxi-direction': 'downward',
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#6b7280',
            'text-background-opacity': 1,
            'text-background-color': '#ffffff',
            'text-background-padding': '2px',
            'font-family': 'Inter, sans-serif'
          }
        }
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 50,
        spacingFactor: 1.5
      }
    });

    // Handle node selection
    this.cy.on('tap', 'node', (evt) => {
      const nodeData = evt.target.data();
      this.nodeSelected.emit(nodeData);
    });

    // Handle expand request (right-click / context tap)
    this.cy.on('cxttap', 'node', (evt) => {
      const nodeData = evt.target.data();
      if (nodeData.uri) {
        this.expandNodeRequest.emit(nodeData.uri);
      }
    });
    
    // Deselect when clicking background
    this.cy.on('tap', (evt) => {
      if (evt.target === this.cy) {
        this.nodeSelected.emit(null);
      }
    });
  }
}
