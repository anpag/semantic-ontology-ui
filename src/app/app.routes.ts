import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LibraryComponent } from './features/library/library.component';
import { ClassesComponent } from './features/classes/classes.component';
import { PropertiesComponent } from './features/properties/properties.component';
import { ReasonerComponent } from './features/reasoner/reasoner.component';

export const routes: Routes = [
  { path: '', redirectTo: 'library', pathMatch: 'full' },
  { path: 'library', component: LibraryComponent },
  { 
    path: 'ontology/:jobId',
    children: [
      { path: '', redirectTo: 'visualizer', pathMatch: 'full' },
      { path: 'visualizer', component: DashboardComponent },
      { path: 'classes', component: ClassesComponent },
      { path: 'properties', component: PropertiesComponent },
      { path: 'reasoner', component: ReasonerComponent }
    ]
  }
];
