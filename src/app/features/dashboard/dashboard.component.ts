import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OntologyGraphComponent } from '../ontology-graph/ontology-graph.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, OntologyGraphComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {

}
