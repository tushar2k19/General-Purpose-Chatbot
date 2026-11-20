import { Component, Output, EventEmitter, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { OpenAiService } from '../services/openai.service';
import { StagedProcessingService, ProcessingState } from '../services/staged-processing.service';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-ocr-popup',
  templateUrl: './ocr-popup.component.html',
  styleUrls: ['./ocr-popup.component.css']
})
export class OcrPopupComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() imageProcessed = new EventEmitter<string>();

  selectedImage: string | null = null;
  ocrResult: SafeHtml | null = null;
  isProcessing: boolean = false;
  isDragOver: boolean = false;
  isSidebarCollapsed: boolean = false;
  activeMode: 'text' | 'image' | 'ocr' | 'dpr' = 'ocr';
  
  processingState: ProcessingState = {
    currentStage: '',
    message: '',
    isComplete: false,
    progress: 0
  };

  private processingSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private openAiService: OpenAiService,
    private stagedProcessingService: StagedProcessingService,
    private sanitizer: DomSanitizer
  ) {}

  getPopupTitle(): string {
    if (this.isProcessing) {
      return "Processing your file";
    } else if (this.selectedImage && !this.ocrResult) {
      return "Image uploaded";
    } else if (this.ocrResult) {
      return "";
    } else {
      return "Upload your file";
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.handleFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.handleFile(file);
    }
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
        this.router.navigate(['/generation']);
        break;
      case 'ocr':
        // Already on OCR page
        break;
      case 'dpr':
        this.router.navigate(['/dpr']);
        break;
    }
  }

  copyToClipboard() {
    // Get the text content from ocrResult
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = this.ocrResult as string;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(textContent).then(() => {
      alert('Text copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  handleFile(file: File) {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid JPEG, JPG, or PNG file.');
    }
  }

  removeImage() {
    this.selectedImage = null;
    this.ocrResult = null;
  }

  async processImage() {
    if (this.selectedImage) {
      this.isProcessing = true;
      
      // Start staged processing
      this.processingSubscription = this.stagedProcessingService.startOcrProcessing().subscribe(
        (state: ProcessingState) => {
          this.processingState = state;
        }
      );

      const ocrMessage = {
        content: "Please read the image being uploaded and give the text you understand. Your response should only contain text written in the image and nothing else",
        imageUrl: this.selectedImage
      };

      try {
        await this.getOcrResult(ocrMessage.content, ocrMessage.imageUrl);
        // Complete staged processing
        this.stagedProcessingService.completeProcessing('Analysis complete!');
      } catch (error) {
        // Stop staged processing on error
        this.stagedProcessingService.stopProcessing();
        throw error;
      } finally {
        this.isProcessing = false;
        this.processingSubscription.unsubscribe();
      }
    }
  }

  async getOcrResult(userMessage: string, imageData: string | null = null) {
    if (imageData) {
      try {
        const result = await this.openAiService.analyzeImage(imageData, userMessage);
        this.ocrResult = this.formatMarkdown(result);
      } catch (error) {
        console.error('Error processing image:', error);
        this.ocrResult = this.formatMarkdown("An error occurred while processing the image. Please try again.");
      }
    } else {
      this.ocrResult = this.formatMarkdown("Invalid Results. Please try again after a reload!");
    }
  }

  /**
   * Format markdown text to HTML with support for tables, bold, italic, lists, etc.
   */
  formatMarkdown(text: string): SafeHtml {
    if (!text) return '';

    // Handle tables
    const tableRegex = /\|(.+)\|[\r\n][\s]*\|([-|\s]+)\|[\r\n](([\s]*\|.+\|[\r\n]?)+)/g;
    text = text.replace(tableRegex, (match) => {
      const rows = match.split('\n').filter(row => row.trim());
      
      let table = `<div style="margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-height: 400px;">` +
        `<div style="overflow-y: auto; max-height: 400px;">` +
        `<table style="border-collapse: collapse; background: white; width: 100%;">`;

      // Process header
      const headers = rows[0].split('|').filter(cell => cell.trim()).map(cell => cell.trim());
      table += '<thead><tr style="background: linear-gradient(135deg, #2c8535, #3a9d45);">';
      headers.forEach(header => {
        table += `<th style="padding: 12px; text-align: left; font-weight: 600; color: white; border-bottom: 2px solid rgba(255,255,255,0.1);">${header}</th>`;
      });
      table += '</tr></thead>';

      // Process body
      table += '<tbody>';
      rows.slice(2).forEach((row, rowIndex) => {
        const cells = row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        table += `<tr style="background: ${rowIndex % 2 === 0 ? '#f9f9f9' : 'white'};">`;
        cells.forEach(cell => {
          table += `<td style="padding: 10px 12px; color: #333; border-top: 1px solid #e0e0e0;">${cell}</td>`;
        });
        table += '</tr>';
      });
      table += '</tbody></table></div></div>';
      
      return table;
    });

    // Handle bold text (**text**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle italic text (*text*)
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle code blocks (```code```)
    text = text.replace(/```([\s\S]*?)```/g, '<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto;"><code>$1</code></pre>');
    
    // Handle inline code (`code`)
    text = text.replace(/`(.*?)`/g, '<code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

  closePopup() {
    this.close.emit();
  }

  ngOnDestroy(): void {
    this.processingSubscription.unsubscribe();
    this.stagedProcessingService.stopProcessing();
  }
}
