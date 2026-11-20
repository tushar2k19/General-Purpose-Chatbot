import { Component, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { OpenAiService } from '../services/openai.service';
import { TextToSpeechService } from '../services/text-to-speech.service';
import { VideoGenerationService } from '../services/video-generation.service';
import { StagedProcessingService, ProcessingState } from '../services/staged-processing.service';
import { Subscription } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-main-chat',
  templateUrl: './main-chat.component.html',
  styleUrls: ['./main-chat.component.css']
})
export class MainChatComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatHistoryContainer') chatHistoryContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileUpload') fileUpload!: ElementRef<HTMLInputElement>;

  // Core chat properties
  isRecording = false;
  chatHistory: ChatMessage[] = [];
  userInput: string = '';
  selectedLanguage: string = 'en';
  responseMode: 'text' | 'image' | 'smart' = 'text';
  selectedImage: string | null = null;
  isImageModalVisible = false;
  isGeneratingResponse = false; // Prevent multiple requests
  
  // Smart scroll management
  private userHasScrolledUp = false;
  private lastScrollTop = 0;
  
  // Voice recording management
  isVoiceRecording = false;
  private recognition: any = null;
  private recognitionSupported = false;
  private initialInputValue = ''; // Store input value before recording
  
  // Bot assistant popup properties
  isChatbotVisible = false;
  
  // Navigation state
  activeMode: 'text' | 'image' | 'ocr' | 'dpr' = 'text';
  isSidebarCollapsed = false;
  
  // Popup visibility states
  isOcrPopupVisible = false;
  isDocumentAnalyserVisible = false;
  isVideoPopupVisible = false;
  
  // Staged processing properties
  processingState: ProcessingState = {
    currentStage: '',
    message: '',
    isComplete: false,
    progress: 0
  };
  private processingSubscription: Subscription = new Subscription();
  
  // Auto-scroll properties
  private shouldScrollToBottom = false;
  private previousChatLength = 0;

  // Keywords and patterns that suggest image generation would be beneficial
  private visualKeywords = [
    'show me', 'visualize', 'create image', 'draw', 'design', 'illustrate',
    'what does', 'look like', 'appearance', 'how does it look',
    'imagine', 'picture', 'concept', 'diagram', 'chart', 'graph',
    'architecture', 'flow', 'process', 'structure', 'layout',
    'example of', 'demonstrate', 'visual example', 'looks like', 'picturize'
  ];

  constructor(
    private router: Router,
    private audioService: AudioService,
    private openAiService: OpenAiService,
    private textToSpeechService: TextToSpeechService,
    private videoGenerationService: VideoGenerationService,
    private elementRef: ElementRef,
    private stagedProcessingService: StagedProcessingService
  ) {
    // Initialize speech recognition
    this.initializeSpeechRecognition();
  }

  ngAfterViewInit(): void {
    if (this.messageTextarea) {
      this.messageTextarea.nativeElement.addEventListener('input', this.handleTextareaInput.bind(this));
      this.messageTextarea.nativeElement.addEventListener('paste', this.handleTextareaInput.bind(this));
    }
    
    // Add scroll listener to detect user scroll
    if (this.chatHistoryContainer) {
      this.chatHistoryContainer.nativeElement.addEventListener('scroll', this.onUserScroll.bind(this));
    }
  }

  ngAfterViewChecked(): void {
    // Check if new messages were added
    if (this.chatHistory.length > this.previousChatLength) {
      this.previousChatLength = this.chatHistory.length;
      this.shouldScrollToBottom = true;
    }
    
    if (this.shouldScrollToBottom && this.chatHistoryContainer) {
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        this.scrollToBottom();
        this.shouldScrollToBottom = false;
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.textToSpeechService.cancel();
    this.processingSubscription.unsubscribe();
    this.stagedProcessingService.stopProcessing();
    
    // Remove scroll listener
    if (this.chatHistoryContainer) {
      this.chatHistoryContainer.nativeElement.removeEventListener('scroll', this.onUserScroll.bind(this));
    }
  }

  // Navigation methods
  setActiveMode(mode: 'text' | 'image' | 'ocr' | 'dpr') {
    this.activeMode = mode;
    
    // Set response mode based on navigation
    switch (mode) {
      case 'text':
        this.responseMode = 'text';
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

  navigateToImageGeneration(prompt: string) {
    // Navigate to image generation page with prompt as query parameter
    this.router.navigate(['/generation'], { 
      queryParams: { prompt: prompt } 
    });
  }

  setResponseMode(mode: 'text' | 'image' | 'smart') {
    this.responseMode = mode;
  }

  // Toggle sidebar collapse
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  // Reset chat functionality
  resetChat() {
    this.chatHistory = [];
  }

  // Toggle bot assistant popup
  toggleChatbot() {
    this.isChatbotVisible = !this.isChatbotVisible;
  }

  // Close bot assistant popup
  closeChatbot() {
    this.isChatbotVisible = false;
  }

  // Popup management methods
  openOcrPopup() {
    this.isOcrPopupVisible = true;
  }

  closeOcrPopup() {
    this.isOcrPopupVisible = false;
  }

  openDprAnalyserPopup() {
    this.isDocumentAnalyserVisible = true;
  }

  closeDprAnalyserPopup() {
    this.isDocumentAnalyserVisible = false;
  }

  openVideoPopup() {
    this.isVideoPopupVisible = true;
  }

  closeVideoPopup() {
    this.isVideoPopupVisible = false;
  }

  // Auto-scroll methods with smart user detection
  private scrollToBottom(): void {
    try {
      const element = this.chatHistoryContainer.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
        this.lastScrollTop = element.scrollTop;
        console.log('Scrolled to bottom, scrollHeight:', element.scrollHeight);
      }
    } catch (error) {
      console.warn('Could not scroll to bottom:', error);
    }
  }

  private triggerScrollToBottom(): void {
    this.shouldScrollToBottom = true;
    setTimeout(() => {
      if (this.chatHistoryContainer) {
        this.scrollToBottom();
      }
    }, 100);
  }

  private forceScrollToBottom(): void {
    setTimeout(() => {
      if (this.chatHistoryContainer) {
        this.scrollToBottom();
      }
    }, 200);
  }

  // Smart scroll: only auto-scroll if user is near bottom
  private smartScrollToBottom(): void {
    if (!this.chatHistoryContainer) return;
    
    const element = this.chatHistoryContainer.nativeElement;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    // Only auto-scroll if user hasn't scrolled up OR is near the bottom
    if (!this.userHasScrolledUp || distanceFromBottom < threshold) {
      element.scrollTop = element.scrollHeight;
      this.lastScrollTop = element.scrollTop;
      this.userHasScrolledUp = false; // Reset flag when at bottom
    }
  }

  // Detect user scroll
  private onUserScroll(): void {
    if (!this.chatHistoryContainer) return;
    
    const element = this.chatHistoryContainer.nativeElement;
    const currentScrollTop = element.scrollTop;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    
    // Check if user scrolled up (not caused by auto-scroll)
    if (currentScrollTop < this.lastScrollTop) {
      // User scrolled up
      this.userHasScrolledUp = true;
    } else if (distanceFromBottom < threshold) {
      // User is near bottom, resume auto-scroll
      this.userHasScrolledUp = false;
    }
    
    this.lastScrollTop = currentScrollTop;
  }

  // Textarea handling
  private handleTextareaInput() {
    setTimeout(() => {
      this.adjustTextareaHeight();
    }, 0);
  }

  private adjustTextareaHeight() {
    if (!this.messageTextarea) return;
    
    const textarea = this.messageTextarea.nativeElement;
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 48;
    const maxHeight = 120;
    
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }

  // Image handling
  handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImage = e.target.result;
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert('Please select a valid image file.');
    }
  }

  removeSelectedImage() {
    this.selectedImage = null;
  }

  openImageModal() {
    this.isImageModalVisible = true;
  }

  closeImageModal() {
    this.isImageModalVisible = false;
  }

  // Audio methods
  async toggleRecording() {
    if (this.isRecording) {
      const audioBlob = await this.audioService.stopRecording();
      this.isRecording = false;
      this.processAudio(audioBlob);
    } else {
      this.audioService.startRecording();
      this.isRecording = true;
    }
  }

  listenToResponse(response: string) {
    this.textToSpeechService.cancel();
    const decodedResponse = this.textToSpeechService.decodeHtmlEntities(response);
    this.textToSpeechService.speak(decodedResponse);
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

  // Speech Recognition Methods
  private initializeSpeechRecognition() {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognitionSupported = true;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition
      this.recognition.continuous = false; // Stop after user finishes speaking
      this.recognition.interimResults = true; // Show interim results while speaking
      this.recognition.lang = 'en-US'; // Set language
      
      // Handle results
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Build the complete transcript from all results
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update the input field
        // For final results, append to the initial value
        if (finalTranscript) {
          this.userInput = (this.initialInputValue + ' ' + finalTranscript).trim();
        } else {
          // For interim results, show what's being said in real-time
          this.userInput = (this.initialInputValue + ' ' + interimTranscript).trim();
        }
      };
      
      // Handle errors
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isVoiceRecording = false;
        
        if (event.error === 'no-speech') {
          console.log('No speech detected. Please try again.');
        } else if (event.error === 'not-allowed') {
          console.error('Microphone access denied. Please allow microphone access.');
        }
      };
      
      // Handle end of recognition
      this.recognition.onend = () => {
        this.isVoiceRecording = false;
        // Update initial value to current input for next recording session
        this.initialInputValue = this.userInput;
      };
      
      // Handle start of recognition
      this.recognition.onstart = () => {
        console.log('Speech recognition started. Speak now...');
      };
    } else {
      console.warn('Speech recognition is not supported in this browser.');
      this.recognitionSupported = false;
    }
  }

  toggleVoiceRecording() {
    if (!this.recognitionSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    if (this.isVoiceRecording) {
      // Stop recording
      this.recognition.stop();
      this.isVoiceRecording = false;
    } else {
      // Start recording
      try {
        // Save current input value before starting recording
        this.initialInputValue = this.userInput;
        this.recognition.start();
        this.isVoiceRecording = true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        this.isVoiceRecording = false;
      }
    }
  }

  async processAudio(audioBlob: Blob) {
    const transcribedText = await this.openAiService.transcribeAudio(
      audioBlob,
      this.selectedLanguage
    );
    await this.getChatResponse(transcribedText);
  }

  // Main chat functionality
  async sendMessage() {
    // Prevent sending if already generating a response
    if (this.isGeneratingResponse) {
      return;
    }

    if (this.userInput.trim() || this.selectedImage) {
      this.isGeneratingResponse = true; // Set loading state
      
      const userMessage: ChatMessage = {
        role: 'user',
        content: this.userInput.trim(),
        imageUrl: this.selectedImage || undefined
      };

      this.chatHistory.push(userMessage);
      this.userHasScrolledUp = false; // Reset scroll flag for new message
      this.forceScrollToBottom();
      
      this.userInput = '';
      const imageCopy = this.selectedImage;
      this.selectedImage = null;

      if (this.fileUpload) {
        this.fileUpload.nativeElement.value = '';
      }
      
      setTimeout(() => {
        if (this.messageTextarea) {
          const textarea = this.messageTextarea.nativeElement;
          textarea.style.height = 'auto';
          textarea.style.height = '48px';
          textarea.style.overflowY = 'hidden';
        }
      }, 0);
      
      this.getChatResponse(userMessage.content, imageCopy);
    }
  }

  async getChatResponse(userMessage: string, imageData: string | null = null) {
    // Start staged processing
    this.processingSubscription = this.stagedProcessingService
      .startChatProcessing()
      .subscribe((state: ProcessingState) => {
        this.processingState = state;
      });

    this.chatHistory.push({
      role: 'assistant',
      content: 'working...'
    });
    this.forceScrollToBottom();

    try {
      let textResponse: string = '';
      let imageUrl: string | undefined;

      if (this.responseMode === 'image') {
        // Pure image mode - only generate image
        imageUrl = await this.openAiService.generateImage(userMessage);
        textResponse = 'Here\'s the generated image:';
        
        this.chatHistory.pop();
        this.streamResponse(textResponse, imageUrl);

      } else if (this.responseMode === 'smart') {
        // Smart mode - generate text, then image if beneficial
        
        // First, generate text response
        if (imageData) {
          textResponse = await this.openAiService.analyzeImage(imageData, userMessage);
        } else {
          textResponse = await this.openAiService.getChatResponse(userMessage, this.chatHistory);
        }

        // Check if image would be beneficial
        const shouldIncludeImage = this.shouldGenerateImage(userMessage);
        
        if (shouldIncludeImage && !imageData) {
          try {
            const imagePrompt = await this.createImagePrompt(userMessage, textResponse);
            imageUrl = await this.openAiService.generateImage(imagePrompt);
          } catch (error) {
            console.warn('Image generation failed in smart mode:', error);
          }
        }

        this.chatHistory.pop();
        
        const [description, tableText, postTableText] = this.splitResponse(textResponse);

        if (description) {
          this.streamResponse(this.formatMessage(description), imageUrl);
        }

        if (tableText) {
          this.chatHistory.push({
            role: 'assistant',
            content: this.generateTableHtml(tableText),
          });
          this.forceScrollToBottom();
        }

        if (postTableText) {
          this.streamResponse(this.formatMessage(postTableText));
        }

        if (!description && imageUrl) {
          this.streamResponse('Here\'s a visual representation:', imageUrl);
        }

      } else {
        // Text mode - only generate text
        if (imageData) {
          textResponse = await this.openAiService.analyzeImage(imageData, userMessage);
        } else {
          textResponse = await this.openAiService.getChatResponse(userMessage, this.chatHistory);
        }

        this.chatHistory.pop();

        const [description, tableText, postTableText] = this.splitResponse(textResponse);

        if (description) {
          this.streamResponse(this.formatMessage(description));
        }

        if (tableText) {
          this.chatHistory.push({
            role: 'assistant',
            content: this.generateTableHtml(tableText),
          });
          this.forceScrollToBottom();
        }

        if (postTableText) {
          this.streamResponse(this.formatMessage(postTableText));
        }
      }

      // Complete staged processing
      this.stagedProcessingService.completeProcessing('Response generated!');
    } catch (error) {
      console.error('Error getting chat response:', error);
      this.stagedProcessingService.stopProcessing();
      this.chatHistory.pop();
      this.chatHistory.push({
        role: 'assistant',
        content: 'An error occurred while processing your request. Please try again.'
      });
      this.forceScrollToBottom();
    } finally {
      this.isGeneratingResponse = false; // Reset loading state
      this.processingSubscription.unsubscribe();
    }
  }

  private streamResponse(text: string, imageUrl?: string) {
    const workingMessageIndex = this.chatHistory.findIndex(msg => 
      msg.role === 'assistant' && msg.content === 'working...'
    );
    
    let messageIndex: number;
    if (workingMessageIndex !== -1) {
      this.chatHistory[workingMessageIndex] = {
        role: 'assistant',
        content: '',
        imageUrl: imageUrl || ''
      };
      messageIndex = workingMessageIndex;
    } else {
      this.chatHistory.push({
        role: 'assistant',
        content: '',
        imageUrl: imageUrl || ''
      });
      messageIndex = this.chatHistory.length - 1;
    }
    
    // Reset user scroll flag for new message
    this.userHasScrolledUp = false;
    this.forceScrollToBottom();

    const words = text.split(' ');
    let currentWordIndex = 0;

    const interval = setInterval(() => {
      if (currentWordIndex < words.length) {
        this.chatHistory[messageIndex].content += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex];
        this.smartScrollToBottom(); // Use smart scroll instead of force
        currentWordIndex++;
      } else {
        if (imageUrl) {
          this.chatHistory[messageIndex].imageUrl = imageUrl;
        }
        clearInterval(interval);
      }
    }, 100);
  }

  private async createImagePrompt(userQuery: string, textResponse: string): Promise<string> {
    const prompt = `Based on this user query: "${userQuery}" and this response: "${textResponse.substring(0, 200)}...", create a simple, clear image prompt for DALL-E that would visually complement the text response. Make it descriptive but concise, focusing on the main concept. Return only the image prompt, nothing else.`;
    
    try {
      const imagePrompt = await this.openAiService.getCompletion(prompt);
      return imagePrompt.trim();
    } catch (error) {
      return userQuery;
    }
  }

  private shouldGenerateImage(userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    
    const hasVisualKeywords = this.visualKeywords.some(keyword => 
      message.includes(keyword.toLowerCase())
    );
    
    const hasCreativeIntent = /\b(create|generate|make|build|design)\b.*\b(something|image|picture|visual)\b/i.test(message);
    const hasDescriptiveIntent = /\b(describe|explain|show)\b.*\b(visually|with picture|with image)\b/i.test(message);
    
    return hasVisualKeywords || hasCreativeIntent || hasDescriptiveIntent;
  }

  splitResponse(response: string): [string, string, string] {
    const tableStartIndex = response.indexOf('|');
    if (tableStartIndex === -1) {
      return [response, '', ''];
    }

    const lines: string[] = response.split('\n');
    const tableLines: string[] = [];
    const descriptionLines: string[] = [];
    const postTableLines: string[] = [];
    let isTable = false;

    lines.forEach(line => {
      if (line.includes('|')) {
        isTable = true;
        tableLines.push(line);
      } else {
        if (isTable) {
          postTableLines.push(line);
        } else {
          descriptionLines.push(line);
        }
      }
    });

    const description = descriptionLines.join('\n').trim();
    const tableText = tableLines.join('\n').trim();
    const postTableText = postTableLines.join('\n').trim();

    return [description, tableText, postTableText];
  }

  generateTableHtml(tableText: string): string {
    const rows = tableText.split('\n').map(row => row.trim());

    let html = '<table class="">';

    rows.forEach(row => {
      if (row !== '') {
        html += '<tr>';
        row.split('|').forEach(cell => {
          html += `<td>${this.escapeHtml(cell.trim())}</td>`;
        });
        html += '</tr>';
      }
    });

    html += '</table>';

    return html;
  }

  escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatMessage(message: string): string {
    const escapedMessage = this.escapeHtml(message);
    return escapedMessage
      .replace(/&#039;/g, "'")
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/#/g, '');
  }
}
