import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnChanges {
  @Input() collapsed: boolean = false;
  @Input() activeMode: 'text' | 'image' | 'ocr' | 'dpr' = 'text';
  @Output() toggleCollapse = new EventEmitter<void>();

  constructor(private router: Router) {}

  ngOnInit() {
    this.updateGlobalCSSVariables();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['collapsed']) {
      this.updateGlobalCSSVariables();
    }
  }

  private updateGlobalCSSVariables() {
    const root = document.documentElement;
    if (this.collapsed) {
      root.style.setProperty('--sidebar-width', '80px');
    } else {
      root.style.setProperty('--sidebar-width', '280px');
    }
  }

  onToggle() {
    this.toggleCollapse.emit();
  }

  navigateToMode(mode: 'text' | 'image' | 'ocr' | 'dpr') {
    switch (mode) {
      case 'text':
        this.router.navigate(['/']);
        break;
      case 'image':
        this.router.navigate(['/generation']);
        break;
      case 'ocr':
        this.router.navigate(['/ocr']);
        break;
      case 'dpr':
        this.router.navigate(['/dpr']);
        break;
    }
  }
}
