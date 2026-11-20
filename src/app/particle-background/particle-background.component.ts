import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;
}

@Component({
  selector: 'app-particle-background',
  template: `
    <canvas #canvas class="particle-canvas"></canvas>

    <div class="welcome-container">
      <h1 class="welcome-text">{{ displayText }}</h1>
    </div>
  `,
  styles: [`
    .particle-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      background-color: #000000;
    }

    .welcome-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;
      text-align: center;
      width: 100%;
    }

    .welcome-text {
      color: #349e53;
      font-family: 'Montserrat', sans-serif;
      font-size: 3.3rem;
      font-weight: 700;
      margin: 0;
      padding: 20px;
      letter-spacing: 3px;
      /* Added a subtle text glow using multiple shadows with decreasing intensity */
      text-shadow: 0 0 5px rgba(135, 206, 235, 0.4),
      0 0 10px rgba(135, 206, 235, 0.2);
    }


  `]
})
export class ParticleBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrameId: number = 0;

  private mouse = {
    x: null as number | null,
    y: null as number | null,
    radius: 150
  };

  private welcomeText: string = 'Welcome to Our Agricultural Technology Demo Suite';
  displayText: string = '';

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  ngAfterViewInit() {
    this.initCanvas();
    this.animate();
    this.animateText();

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy() {
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private async animateText() {
    const chars = this.welcomeText.split('');
    this.displayText = '';

    for (let char of chars) {
      await new Promise(resolve => setTimeout(resolve, 100));
      this.displayText += char;
    }
  }

  private initCanvas(): void {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createParticles();
  }

  private createParticles(): void {
    this.particles = [];
    // Adjusted particle density for better balance
    const numberOfParticles = (this.canvas.width * this.canvas.height) / 4500;

    for (let i = 0; i < numberOfParticles; i++) {
      // Increased particle size range but kept it moderate
      const size = Math.random() * 3 + 1.5; // Particles between 1 and 4 pixels
      const x = Math.random() * (this.canvas.width - size * 2);
      const y = Math.random() * (this.canvas.height - size * 2);
      const directionX = Math.random() * 2 - 1;
      const directionY = Math.random() * 2 - 1;
      // Slightly increased base opacity for better visibility
      const opacity = Math.random() * 0.5 + 0.3;
      const color = `rgba(255, 255, 255, ${opacity})`;

      this.particles.push({
        x,
        y,
        directionX,
        directionY,
        size,
        color
      });
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const particle of this.particles) {
      particle.x += particle.directionX * 0.5;
      particle.y += particle.directionY * 0.5;

      if (particle.x > this.canvas.width || particle.x < 0) {
        particle.directionX *= -1;
      }
      if (particle.y > this.canvas.height || particle.y < 0) {
        particle.directionY *= -1;
      }

      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (this.mouse.radius - distance) / this.mouse.radius;

          particle.x -= forceDirectionX * force * 5;
          particle.y -= forceDirectionY * force * 5;
        }
      }

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();

      this.connectParticles(particle);
    }
  }

  private connectParticles(particle1: Particle): void {
    for (const particle2 of this.particles) {
      const dx = particle1.x - particle2.x;
      const dy = particle1.y - particle2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Adjusted connection distance and opacity for better visibility
      if (distance < 120) {
        // Enhanced the connection line opacity while keeping it subtle
        const opacity = 0.15 - distance/1000;
        this.ctx.beginPath();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.lineWidth = 0.3; // Slightly thicker lines
        this.ctx.moveTo(particle1.x, particle1.y);
        this.ctx.lineTo(particle2.x, particle2.y);
        this.ctx.stroke();
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouse.x = event.x;
    this.mouse.y = event.y;
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createParticles();
  }
}
