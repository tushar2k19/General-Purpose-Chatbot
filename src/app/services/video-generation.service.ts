// video-generation.service.ts
import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { HttpClient } from '@angular/common/http';
import { VIDEO_MODELS } from '../config/video-models.config';

@Injectable({
  providedIn: 'root'
})
export class VideoGenerationService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: '' });
  }

  async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> {
    try {
      let operation = await this.ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        config: {
          personGeneration: "allow_adult",
          aspectRatio: aspectRatio,
        },
      });

      // Poll for completion every 10 seconds
      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        operation = await this.ai.operations.getVideosOperation({
          operation: operation,
        });
      }

      // Return the first video URL
      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        return `${operation.response.generatedVideos[0].video.uri}&key=YOUR_GOOGLE_API_KEY`;
      }

      throw new Error('Video generation failed');
    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  }
}
