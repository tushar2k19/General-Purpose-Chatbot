import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ProcessingStage {
  id: string;
  message: string;
  duration: number;
  icon?: string;
}

export interface ProcessingState {
  currentStage: string;
  message: string;
  isComplete: boolean;
  progress: number;
}

@Injectable({
  providedIn: 'root'
})
export class StagedProcessingService {
  private processingStateSubject = new BehaviorSubject<ProcessingState>({
    currentStage: '',
    message: '',
    isComplete: false,
    progress: 0
  });

  public processingState$ = this.processingStateSubject.asObservable();

  // Default stages for different types of processing
  private readonly defaultStages: ProcessingStage[] = [
    { id: 'initiating', message: 'Initiating query...', duration: 500 },
    { id: 'processing', message: 'Processing content...', duration: 1000 },
    { id: 'arranging', message: 'Arranging the result...', duration: 800 }
  ];

  private readonly ocrStages: ProcessingStage[] = [
    { id: 'initiating', message: 'Initializing image analysis...', duration: 2000 },
    { id: 'processing', message: 'Extracting text content...', duration: 3000 },
    { id: 'arranging', message: 'Formatting results...', duration: 3000 }
  ];

  private readonly chatStages: ProcessingStage[] = [
    { id: 'initiating', message: 'Analyzing your request...', duration: 1500 },
    { id: 'processing', message: 'Generating response...', duration: 2500 },
    { id: 'arranging', message: 'Finalizing answer...', duration: 1800 }
  ];

  private readonly dprStages: ProcessingStage[] = [
    { id: 'extracting', message: 'Extracting text from PDF...', duration: 3000 },
    { id: 'processing', message: 'Processing document content...', duration: 4000 },
    { id: 'embedding', message: 'Generating document embeddings...', duration: 5000 },
    { id: 'summarizing', message: 'Creating comprehensive summary...', duration: 6000 },
    { id: 'finalizing', message: 'Finalizing analysis...', duration: 3000 }
  ];

  private readonly dprChatStages: ProcessingStage[] = [
    { id: 'pre-processing', message: 'Pre Procesing the document...', duration: 2500 },
    { id: 'searching', message: 'Searching document...', duration: 3500 },
    { id: 'analyzing', message: 'Analyzing relevant content...', duration: 4500 },
    { id: 'generating', message: 'Generating answer...', duration: 3500 }
  ];

  private currentTimeout: any = null;
  private currentStages: ProcessingStage[] = [];
  private currentStageIndex = 0;

  /**
   * Start staged processing with custom stages
   */
  startProcessing(stages: ProcessingStage[] = this.defaultStages): Observable<ProcessingState> {
    this.reset();
    this.currentStages = stages;
    this.currentStageIndex = 0;
    
    this.progressToNextStage();
    return this.processingState$;
  }

  /**
   * Start OCR-specific staged processing
   */
  startOcrProcessing(): Observable<ProcessingState> {
    return this.startProcessing(this.ocrStages);
  }

  /**
   * Start chat-specific staged processing
   */
  startChatProcessing(): Observable<ProcessingState> {
    return this.startProcessing(this.chatStages);
  }

  /**
   * Start DPR-specific staged processing
   */
  startDprProcessing(): Observable<ProcessingState> {
    return this.startProcessing(this.dprStages);
  }

  /**
   * Start DPR chat-specific staged processing
   */
  startDprChatProcessing(): Observable<ProcessingState> {
    return this.startProcessing(this.dprChatStages);
  }

  /**
   * Complete processing and show final result
   */
  completeProcessing(finalMessage: string = 'Processing complete!'): void {
    this.clearTimeout();
    
    this.processingStateSubject.next({
      currentStage: 'complete',
      message: finalMessage,
      isComplete: true,
      progress: 100
    });
  }

  /**
   * Stop processing (for errors or cancellation)
   */
  stopProcessing(): void {
    this.clearTimeout();
    this.reset();
  }

  /**
   * Get current processing state
   */
  getCurrentState(): ProcessingState {
    return this.processingStateSubject.value;
  }

  private progressToNextStage(): void {
    if (this.currentStageIndex >= this.currentStages.length) {
      // All stages completed, but API hasn't responded yet
      // Keep showing the last stage with a pulsing effect
      const lastStage = this.currentStages[this.currentStages.length - 1];
      this.processingStateSubject.next({
        currentStage: lastStage.id,
        message: lastStage.message + ' (almost done...)',
        isComplete: false,
        progress: 90
      });
      return;
    }

    const currentStage = this.currentStages[this.currentStageIndex];
    const progress = ((this.currentStageIndex + 1) / this.currentStages.length) * 80; // Max 80% until complete

    this.processingStateSubject.next({
      currentStage: currentStage.id,
      message: currentStage.message,
      isComplete: false,
      progress: progress
    });

    this.currentTimeout = setTimeout(() => {
      this.currentStageIndex++;
      this.progressToNextStage();
    }, currentStage.duration);
  }

  private clearTimeout(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  private reset(): void {
    this.clearTimeout();
    this.currentStages = [];
    this.currentStageIndex = 0;
    this.processingStateSubject.next({
      currentStage: '',
      message: '',
      isComplete: false,
      progress: 0
    });
  }
}
