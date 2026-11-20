import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { OpenAiService } from '../services/openai.service';

interface SampleImage {
  imagePath: string;
  prompt: string;
}

@Component({
  selector: 'app-image-generation',
  templateUrl: './image-generation.component.html',
  styleUrls: ['./image-generation.component.css']
})
export class ImageGenerationComponent implements OnInit {
  @ViewChild('promptInput') promptInput?: ElementRef;

  // Navigation properties
  isSidebarCollapsed: boolean = false;
  activeMode: 'text' | 'image' | 'ocr' | 'dpr' = 'image';

  // Generation properties
  userPrompt: string = '';
  currentPrompt: string = '';
  isGenerating: boolean = false;
  generatedImage: string | null = null;

  // Sample images data
  samples: SampleImage[] = [
    {
      imagePath: 'assets/images/sample2.png',
      prompt: "A highly detailed, photorealistic close-up of a tiger's face, with individual whiskers visible and intense emerald green eyes, set against a blurred, lush jungle background during golden hour."
    },
    {
      imagePath: 'assets/images/sample3.png',
      prompt: 'An ethereal, fantastical landscape depicting a floating island with ancient ruins, overgrown with bioluminescent flora, under a sky filled with multiple moons and shimmering aurora borealis.'
    },
    {
      imagePath: 'assets/images/sample4.png',
      prompt: 'A cyberpunk city street at night, illuminated by neon signs and holographic advertisements, with rain reflecting the colorful lights. A lone figure in a trench coat walks down a wet alley.'
    },
    {
      imagePath: 'assets/images/sample5.png',
      prompt: 'An astronaut in a retro-futuristic spacesuit riding a majestic, bionic unicorn through a field of glowing crystal flowers on the surface of a vibrant, alien planet with two gas giant moons in the sky.'
    },
    {
      imagePath: 'assets/images/sample6.png',
      prompt: 'A still-life composition of a steaming cup of coffee next to an open book with worn pages, a pair of spectacles, and a small, delicate plant in a terracotta pot, all bathed in soft, natural morning light from a window'
    },
    {
      imagePath: 'assets/images/sample7.png',
      prompt: 'A whimsical, anthropomorphic fox barista meticulously pouring latte art into a mug in a cozy, rustic coffee shop filled with unique wooden furniture and warm lighting'
    }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private openAiService: OpenAiService
  ) {}

  ngOnInit(): void {
    // Check for query parameters (prompt from suggestion cards)
    this.route.queryParams.subscribe(params => {
      if (params['prompt']) {
        this.userPrompt = decodeURIComponent(params['prompt']);
        this.currentPrompt = this.userPrompt;
      }
    });

    // Focus input on load
    setTimeout(() => {
      if (this.promptInput) {
        this.promptInput.nativeElement.focus();
      }
    }, 100);
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  navigateToMode(mode: 'text' | 'image' | 'ocr' | 'dpr') {
    switch (mode) {
      case 'text':
        this.router.navigate(['/']);
        break;
      case 'image':
        // Already on image generation page
        break;
      case 'ocr':
        this.router.navigate(['/ocr']);
        break;
      case 'dpr':
        this.router.navigate(['/dpr']);
        break;
    }
  }

  useSamplePrompt(sample: SampleImage) {
    this.userPrompt = sample.prompt;
    // Focus the input after setting the prompt
    setTimeout(() => {
      if (this.promptInput) {
        this.promptInput.nativeElement.focus();
      }
    }, 0);
  }

  async generateImage() {
    if (!this.userPrompt.trim()) {
      return;
    }

    this.isGenerating = true;
    this.currentPrompt = this.userPrompt.trim();
    const promptToGenerate = this.userPrompt.trim();
    this.userPrompt = ''; // Clear input

    try {
      const imageUrl = await this.openAiService.generateImage(promptToGenerate);
      this.generatedImage = imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  downloadImage() {
    if (this.generatedImage) {
      const link = document.createElement('a');
      link.href = this.generatedImage;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  resetGeneration() {
    this.generatedImage = null;
    this.currentPrompt = '';
    this.userPrompt = '';
    this.isGenerating = false;

    // Focus input after reset
    setTimeout(() => {
      if (this.promptInput) {
        this.promptInput.nativeElement.focus();
      }
    }, 100);
  }
}
