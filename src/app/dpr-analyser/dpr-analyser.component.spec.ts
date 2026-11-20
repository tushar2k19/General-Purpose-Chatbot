import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DprAnalyserComponent } from './dpr-analyser.component';

describe('DprAnalyserComponent', () => {
  let component: DprAnalyserComponent;
  let fixture: ComponentFixture<DprAnalyserComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DprAnalyserComponent]
    });
    fixture = TestBed.createComponent(DprAnalyserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
