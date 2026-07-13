import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShellComponent } from './layout/shell/shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ShellComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'semantic-ontology-ui';
}
