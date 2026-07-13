import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import cytoscape from 'cytoscape';

@Component({
  selector: 'app-ontology-graph',
  standalone: true,
  templateUrl: './ontology-graph.component.html',
  styleUrl: './ontology-graph.component.scss'
})
export class OntologyGraphComponent implements AfterViewInit {
  @ViewChild('cy') cyElement!: ElementRef;
  private cy: cytoscape.Core | undefined;

  ngAfterViewInit(): void {
    this.initGraph();
  }

  private initGraph(): void {
    this.cy = cytoscape({
      container: this.cyElement.nativeElement,
      elements: [
        { data: { id: 'thing', name: 'owl:Thing', type: 'root' } },
        { data: { id: 'person', name: 'geb:Person', type: 'class' } },
        { data: { id: 'org', name: 'geb:Organization', type: 'class' } },
        { data: { id: 'worksFor', name: 'worksFor', type: 'property' } },
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
  }
}
