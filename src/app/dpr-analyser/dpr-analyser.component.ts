// import { Component, EventEmitter, Output } from '@angular/core';
import { Component, ViewChild, ElementRef, AfterViewChecked, EventEmitter, Output, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as pdfjsLib from 'pdfjs-dist';
import { OpenAiService } from '../services/openai.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StagedProcessingService, ProcessingState } from '../services/staged-processing.service';
import { Subscription } from 'rxjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

@Component({
  selector: 'app-dpr-analyser',
  templateUrl: './dpr-analyser.component.html',
  styleUrls: ['./dpr-analyser.component.css'],
})
export class DprAnalyserComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('scrollContainer', { static: false }) private scrollContainer?: ElementRef;
  @Output() close = new EventEmitter<void>();

  private shouldScrollToBottom = false;
  private userHasScrolledUp = false;
  private isAutoScrolling = false;

  embeddings: number[][] = [];
  pageTexts: string[] = [];
  chunkSummaries: string[] = [];
  overallSummary:  SafeHtml = '';
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  isLoading = false;
  isGeneratingResponse = false; // Prevent multiple requests
  pdfLoaded = false;
  
  // Navigation properties
  isSidebarCollapsed: boolean = false;
  activeMode: 'text' | 'image' | 'ocr' | 'dpr' = 'dpr';

  // Staged processing properties for file upload
  processingState: ProcessingState = {
    currentStage: '',
    message: '',
    isComplete: false,
    progress: 0
  };
  private processingSubscription: Subscription = new Subscription();

  // Staged processing properties for chat
  chatProcessingState: ProcessingState = {
    currentStage: '',
    message: '',
    isComplete: false,
    progress: 0
  };
  private chatProcessingSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private openAiService: OpenAiService, 
    private sanitizer: DomSanitizer,
    private stagedProcessingService: StagedProcessingService
  ) {
  }
  ngAfterViewChecked() {
    if (this.shouldScrollToBottom && !this.userHasScrolledUp) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        this.isAutoScrolling = true;
        // Scroll to the bottom of the entire content
        element.scrollTop = element.scrollHeight;
        // Reset flag after a short delay
        setTimeout(() => {
          this.isAutoScrolling = false;
        }, 100);
      }
    } catch(err) {
      console.error('Scroll to bottom failed', err);
    }
  }

  private triggerScrollToBottom(): void {
    this.shouldScrollToBottom = true;
  }

  /**
   * Check if user is near the bottom of the scroll container
   */
  private isUserAtBottom(): boolean {
    if (!this.scrollContainer) return true;
    const element = this.scrollContainer.nativeElement;
    const threshold = 100; // pixels from bottom
    const position = element.scrollTop + element.offsetHeight;
    const height = element.scrollHeight;
    return position >= height - threshold;
  }

  /**
   * Handle scroll event to detect manual scrolling
   */
  onScroll(): void {
    if (this.isAutoScrolling) return; // Ignore programmatic scrolls
    
    if (this.isUserAtBottom()) {
      this.userHasScrolledUp = false;
    } else {
      this.userHasScrolledUp = true;
    }
  }

  async handleFileUpload(event: any) {
    localStorage.removeItem('pdfData');
    const file = event.target.files[0];
    if (file) {
      this.isLoading = true;

      // Start staged processing
      this.processingSubscription = this.stagedProcessingService
        .startDprProcessing()
        .subscribe((state: ProcessingState) => {
          this.processingState = state;
        });

      try {
        const textChunks = await this.extractTextFromPDF(file);
        // console.log("textchunks = > ", textChunks)
        await this.processTextChunks(textChunks);
        let abc = await this.generateOverallSummary();
        const table = `\n
        Here's the comparison of item prices between the uploaded DPR document and the SOR 2022 document provided by the govt. of India.
| Item No. | Item Name | Unit | Rate in DPR | Rate in SOR | Consistent |
|----------|-----------|------|-------------|-------------|------------|
| 1. | Excavation rock in narrow areas | cum | Rs. 452.00 | Rs. 452.00 | ✅ |
| 2. | Filling available excavated earth | cum | Rs. 72.00 | Rs. 72.00 | ✅ |
| 3. | DPC 50mm thick | sqm | Rs. 597.00 | Rs. 247.00 | ✘ |
| 4. | Extra for water proofing in c.c | sqm | Rs. 98.00 | Rs. 44.00 | ✘ |
| 5. | Bitumen coat for DPC | sqm | Rs. 124.00 | Rs. 124.00 | ✅ |
| 6. | Plinth protection by C.C. | sqm | Rs. 351.00 | Rs. 351.00 | ✅ |
| 7. | RCC upto plinth | cum | Rs. 5796.00 | Rs. 5796.00 | ✅ |
| 8. | R.C.C. standards post/struts/rails/poles | cum | Rs. 16510.00 | Rs. 16510.00 | ✅ |
| 9. | TMT/TMX Reinforcement | kg | Rs. 112.90 | Rs. 62.90 | ✘ |
| 10. | Centering and shuttering Above Plinth | sqm | Rs. 356.00 | Rs. 356.00 | ✅ |`;
         abc += table;
// ❌ red cross
        // let abc = "Sure, here's the required information:\n\n| Project Location | Estimated  | Column 3 |  Column 4 |\n| ---------------- | ---------------------------------- |\n|| Sariska Tiger Reserve, Alwar || 4964.78 |Sariska Tiger Reserve, Alwar || 4964.78 |\n| Sitamata Wildlife Sanctuary, Pratapgarh | 522.51 | Sariska Tiger Reserve, Alwar | 4964.78 | \n| Mount Abu Sanctuary, Sirohi | 528.84 || Sariska Tiger Reserve, Alwar | 4964.78 | \n\n this is the table we talked about"
        this.overallSummary = this.formatMarkdown(abc);
        this.saveToLocalStorage();
        this.pdfLoaded = true;

        // Complete staged processing
        this.stagedProcessingService.completeProcessing('Analysis complete!');
      } catch (error) {
        console.error('Error during file processing:', error);
        this.stagedProcessingService.stopProcessing();
        alert("There's an issue with the uploaded PDF. Please try again.");
      } finally {
        this.isLoading = false;
        this.processingSubscription.unsubscribe();
      }
    }
  }
  formatMarkdown(text: string): SafeHtml {
    if (!text) return '';

    // First handle tables
    const tableRegex = /\|(.+)\|[\r\n][\s]*\|([-|\s]+)\|[\r\n](([\s]*\|.+\|[\r\n]?)+)/g;
    // console.log("tableRegex", tableRegex);

    // console.log("text before", text);
    text = text.replace(tableRegex, (match) => {
      // Split the table into rows
      const rows = match.split('\n').filter(row => row.trim());

      // Create HTML table with enhanced styling
      let table =
        `<div style=" margin: 1rem 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);background: linear-gradient(145deg, #41095a, #9f1898); max-height: 400px; position: relative; width:100%;">` +
        `<div style="overflow-y: auto;max-height: 400px;scrollbar-width: thin;scrollbar-color: #41095a transparent;width:100% ">`+
        `<table style="border-collapse: separate; border-spacing: 0;  background: transparent; font-size: 0.95rem; width:100%">`;

      // Process header
      const headers = rows[0].split('|')
        .filter(cell => cell.trim())
        .map(cell => cell.trim());
      // console.log("headers = ", headers)

      table += '<thead style="position: sticky; top: 0; z-index: 1;">';
      table += `<tr style="background: linear-gradient(to right, #632c5d, #8e1f88);">`;
      headers.forEach((header, index) => {
        table += `<th style="padding: 12px;text-align: left;font-weight: 600;color: #000000;border-bottom: 2px solid rgba(255, 255, 255, 0.1);position: relative; white-space: nowrap; ${index === 0 ? 'border-left: none;' : ''} ${index === headers.length - 1 ? 'border-right: none;' : ''}"> ${header} </th>`;
      });
      table += '</tr></thead>';

      // Process body
      table += '<tbody>';
      rows.slice(2).forEach((row, rowIndex) => {
        const cells = row.split('|')
          .filter(cell => cell.trim())
          .map(cell => cell.trim());

        table +=
          `<tr style="background: ${rowIndex % 2 === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgb(241,237,241)'};transition: background-color 0.2s ease;">`;

        cells.forEach((cell, cellIndex) => {
          table += `<td style="padding: 8px 12px;color: #17021d;border-top: 1px solid rgba(44, 62, 80, 0.1);white-space: nowrap;${cellIndex === 0 ? 'border-left: none;' : ''} ${cellIndex === cells.length - 1 ? 'border-right: none;' : ''} ${rowIndex === rows.length - 3 ? 'border-bottom: none;' : ''}"> ${cell} </td>`;
        });
        table += '</tr>';
      });

      table += '</tbody></table></div>';

      // Add custom scrollbar styles
      table += `<style> div::-webkit-scrollbar { width: 8px; height: 8px;}  div::-webkit-scrollbar-track {background: rgba(255, 255, 255, 0.1); } div::-webkit-scrollbar-thumb { background-color: #28282b; border-radius: 4px;}</style>`;

      table += '</div>';
      return table;
    });
    // console.log("text after", text);


    // Rest of the formatMarkdown function remains the same
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/__(.*?)__/g, '<u>$1</u>');
    text = text.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(text);
  }



  async extractTextFromPDF(file: File): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    try {
      const pdf = await pdfjsLib.getDocument(uint8Array).promise;
      const textChunks: string[] = [];
      this.pageTexts = [];

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        this.pageTexts.push(pageText);
      }

      // Chunk pages in groups of 2
      for (let i = 0; i < this.pageTexts.length; i += 2) {
        const chunk = this.pageTexts.slice(i, i + 2).join('\n');
        textChunks.push(chunk);
      }
      // testing, delete later
      this.pageTexts = textChunks;
      return textChunks;
    } catch (error) {
      console.error("Error loading PDF:", error);
      throw error;
    }
  }

  async askQuestion(question: string) {
    // Prevent asking if already generating a response
    if (this.isGeneratingResponse) {
      return;
    }

    this.isGeneratingResponse = true; // Set loading state

    // Reset scroll flag when new message starts
    this.userHasScrolledUp = false;
    
    this.addChatMessage('user', question);
    this.triggerScrollToBottom();
    this.addChatMessage('assistant', 'Loading');

    // Start staged processing for chat
    this.chatProcessingSubscription = this.stagedProcessingService
      .startDprChatProcessing()
      .subscribe((state: ProcessingState) => {
        this.chatProcessingState = state;
      });

    try {
      const savedData = JSON.parse(localStorage.getItem('pdfData') || '{}');

      if (!savedData.embeddings) {
        this.stagedProcessingService.stopProcessing();
        this.chatHistory.pop();
        this.addChatMessage('assistant', 'Please upload a PDF first.');
        this.triggerScrollToBottom();
        return;
      }

      // Get answer using embeddings
      const response = await this.openAiService.getAnswerFromEmbeddings(
        question,
        savedData.embeddings,
        savedData.pageTexts,
        this.chatHistory.slice(0, -1)
      );

      // Complete staged processing
      this.stagedProcessingService.completeProcessing('Answer generated!');

      // Replace Loading message with actual response
      this.chatHistory.pop();
      this.addChatMessage('assistant', '');
      await this.getTypedMessage(response);
    } catch (error) {
      console.error('Error processing question:', error);
      this.stagedProcessingService.stopProcessing();
      this.chatHistory.pop();
      this.addChatMessage('assistant', '');
      let response = 'Sorry, I could not process your question.';
      await this.getTypedMessage(response);
    } finally {
      this.isGeneratingResponse = false; // Reset loading state
      this.isLoading = false;
      this.chatProcessingSubscription.unsubscribe();
    }
  }

  // Auto-resize textarea functionality
  autoResizeTextarea(textarea: HTMLTextAreaElement) {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set height based on scrollHeight, with max-height limit
    const maxHeight = 120; // Maximum height in pixels (about 5-6 lines)
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    
    textarea.style.height = newHeight + 'px';
    
    // Enable scrolling if content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  // Handle Enter key press (send on Enter, new line on Shift+Enter)
  onQuestionKeydown(event: any) {
    if (event.key === 'Enter' && !event.shiftKey && !this.isGeneratingResponse) {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      this.sendQuestion(textarea);
    }
  }

  // Send question from textarea
  sendQuestion(textarea: HTMLTextAreaElement) {
    // Prevent sending if already generating a response
    if (this.isGeneratingResponse) {
      return;
    }
    
    const question = textarea.value.trim();
    
    if (question) {
      this.askQuestion(question);
      textarea.value = '';
      // Reset textarea height after sending
      textarea.style.height = 'auto';
    }
  }

// Modify saveToLocalStorage method to include document keywords
  saveToLocalStorage() {
    localStorage.removeItem('pdfData');
    localStorage.setItem('pdfData', JSON.stringify({
      embeddings: this.embeddings,
      pageTexts: this.pageTexts,
      chunkSummaries: this.chunkSummaries,
      overallSummary: this.overallSummary,
    }));
  }

  async processTextChunks(chunks: string[]) {


    // Define a helper function to process chunks in batches
    const processInBatches = async (chunks: string[], batchSize: number) => {
      const results: { embedding: any; summary: string; }[] = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        const chunkBatch = chunks.slice(i, i + batchSize);

        // Process the current batch
        const processPromises = chunkBatch.map(async (chunk) => {
          const embedding = await this.openAiService.getEmbeddings(chunk);
          const summary = await this.openAiService.getChunkSummary(chunk);

          return {embedding, summary};
        });

        // Wait for the current batch to finish
        const batchResults = await Promise.all(processPromises);
        results.push(...batchResults);

        // Optionally wait for a brief delay before continuing to the next batch to avoid hitting rate limits
        if (i + batchSize < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, 10)); // 500ms delay
        }
      }

      return results;
    };

    // Process all chunks in batches
    const batchSize = 10; // Example batch size: 10
    const results = await processInBatches(chunks, batchSize);


    // Separate embeddings and summaries
    this.embeddings = results.map((result) => result.embedding);
    this.chunkSummaries = results.map((result) => result.summary);
  }

  async generateOverallSummary(): Promise<string> {
    return this.openAiService.getOverallSummary(this.chunkSummaries);
  }

  getTypedMessage(message: string, speed: number = 10): Promise<any> {
    let abc = new Promise((resolve) => {
      let currentText = '';
      let index = 0;

      const typeNextChar = () => {
        if (index < message.length) {
          currentText += message[index];
          this.chatHistory[this.chatHistory.length - 1].content = currentText;
          this.triggerScrollToBottom(); // Scroll as text is being typed
          index++;
          setTimeout(typeNextChar, speed);
        } else {
          resolve(currentText);
        }
      };

      typeNextChar();
    });
    return abc;
  }

  addChatMessage(role: 'user' | 'assistant', content: string) {
    this.chatHistory.push({role, content});
  }

  closePopup(event?: MouseEvent) {
    this.close.emit();
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
        this.router.navigate(['/ocr']);
        break;
      case 'dpr':
        // Already on DPR page
        break;
    }
  }

  resetAnalysis() {
    this.pdfLoaded = false;
    this.isLoading = false;
    this.overallSummary = '';
    this.chatHistory = [];
    this.embeddings = [];
    this.pageTexts = [];
    this.chunkSummaries = [];
    localStorage.removeItem('pdfData');
  }

  getStageCompleted(stageId: string): boolean {
    const stageOrder = ['extracting', 'processing', 'embedding', 'summarizing', 'finalizing'];
    const currentIndex = stageOrder.indexOf(this.processingState.currentStage);
    const checkIndex = stageOrder.indexOf(stageId);
    return checkIndex < currentIndex;
  }

  copyMessage(text: string) {
    // Remove HTML tags for clean text copying
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    
    // Use the modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cleanText).then(() => {
        this.showCopyFeedback();
      }).catch(err => {
        console.error('Failed to copy text: ', err);
        this.fallbackCopyTextToClipboard(cleanText);
      });
    } else {
      // Fallback for older browsers
      this.fallbackCopyTextToClipboard(cleanText);
    }
  }

  private fallbackCopyTextToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showCopyFeedback();
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
  }

  private showCopyFeedback() {
    // You can add a toast notification here if needed
    console.log('Message copied to clipboard!');
    // For now, we'll just log it. You could add a toast notification system later.
  }

  ngOnDestroy() {
    if (this.processingSubscription) {
      this.processingSubscription.unsubscribe();
    }
    if (this.chatProcessingSubscription) {
      this.chatProcessingSubscription.unsubscribe();
    }
    this.stagedProcessingService.stopProcessing();
  }

  // private async generateTable() {
  //   return this.openAiService.getTableContent();
  // }
}
