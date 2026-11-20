import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Input() sidebarCollapsed: boolean = false;
  @Input() showNewChatButton: boolean = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() newChat = new EventEmitter<void>();

  constructor(private router: Router) {}

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onNewChat() {
    this.newChat.emit();
  }

  goHome() {
    // Reload the page to reset everything
    window.location.href = '/';
  }
}
