import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReasonerComponent } from './reasoner.component';

describe('ReasonerComponent', () => {
  let component: ReasonerComponent;
  let fixture: ComponentFixture<ReasonerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReasonerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReasonerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
