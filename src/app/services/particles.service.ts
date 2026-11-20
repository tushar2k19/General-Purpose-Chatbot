import { Injectable } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  element: HTMLDivElement;
}

@Injectable({
  providedIn: 'root'
})
export class ParticlesService {
  private particles: Particle[] = [];
  private animationFrame: number | null = null;
  private container: HTMLElement | null = null;

  initialize(container: HTMLElement, particleCount: number = 50) {
    this.container = container;
    this.createParticles(particleCount);
    this.animate();
  }

  private createParticles(count: number) {
    if (!this.container) return;

    // Clear existing particles
    this.particles.forEach(p => p.element.remove());
    this.particles = [];

    const containerRect = this.container.getBoundingClientRect();

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';

      const size = Math.random() * 3 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.opacity = (Math.random() * 0.5 + 0.2).toString();

      this.container.appendChild(particle);

      this.particles.push({
        x: Math.random() * containerRect.width,
        y: Math.random() * containerRect.height,
        size,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        element: particle
      });
    }
  }

  private animate() {
    if (!this.container) return;

    const containerRect = this.container.getBoundingClientRect();

    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      // Bounce off walls
      if (particle.x < 0 || particle.x > containerRect.width) {
        particle.speedX *= -1;
      }
      if (particle.y < 0 || particle.y > containerRect.height) {
        particle.speedY *= -1;
      }

      // Update DOM element position
      particle.element.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
    });

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  cleanup() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.particles.forEach(p => p.element.remove());
    this.particles = [];
    this.container = null;
  }
}
