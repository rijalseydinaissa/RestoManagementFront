import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaiseComponent } from './caise.component';

describe('CaiseComponent', () => {
  let component: CaiseComponent;
  let fixture: ComponentFixture<CaiseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaiseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaiseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
