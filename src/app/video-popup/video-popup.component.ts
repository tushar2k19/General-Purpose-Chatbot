// video-popup.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { VideoGenerationService } from '../services/video-generation.service';


@Component({
  selector: 'app-video-popup',
  templateUrl: './video-popup.component.html',
  styleUrls: ['./video-popup.component.css']
})

export class VideoPopupComponent {
  @Output() close = new EventEmitter<void>();
  prompt = '';
  aspectRatio: '16:9' | '9:16' = '16:9';
  isGenerating = false;
  videoUrl = '';
  errorMessage = '';

  constructor(private videoService: VideoGenerationService) {}

  async generateVideo() {
    this.isGenerating = true;
    this.errorMessage = '';
    this.videoUrl = '';

    try {
      this.videoUrl = await this.videoService.generateVideo(this.prompt, this.aspectRatio);
    } catch (err) {
      this.errorMessage = 'Failed to generate video. Please try again.';
      console.error(err);
    } finally {
      this.isGenerating = false;
    }
  }

  async downloadVideo() {
    if (!this.videoUrl) return;

    try {
      const response = await fetch(this.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      this.errorMessage = 'Failed to download video';
    }
  }

  closePopup() {
    this.close.emit();
  }
}
