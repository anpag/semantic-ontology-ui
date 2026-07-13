import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../../features/dashboard/dashboard.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, DashboardComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {

}
