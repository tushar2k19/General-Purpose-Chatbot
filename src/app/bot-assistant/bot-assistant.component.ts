import { Component, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, HostListener, OnDestroy } from '@angular/core';
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
  selector: 'app-bot-assistant',
  templateUrl: './bot-assistant.component.html',
  styleUrls: ['./bot-assistant.component.css'],
})

export class BotAssistantComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageTextarea') messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatHistoryContainer') chatHistoryContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileUpload') fileUpload!: ElementRef<HTMLInputElement>;

  // Click outside to close
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isChatbotVisible && this.chatContainer && !this.chatContainer.nativeElement.contains(event.target as Node)) {
      // Check if the click was on the toggler itself
      const toggler = document.querySelector('.chatbot-toggler');
      if (!toggler || !toggler.contains(event.target as Node)) {
        this.closeChatbot();
      }
    }
  }
  
  isRecording = false;
  // chatHistory: { role: string; content: string }[] = [];
  chatHistory: ChatMessage[] = [];
  userInput: string = '';
  selectedLanguage: string = 'en';
  isChatbotVisible = false;
  responseMode: 'text' | 'image' | 'smart' = 'text';
  selectedImage: string | null = null;
  isOcrPopupVisible = false;
  isDocumentAnalyserVisible = false;
  isVideoPopupVisible = false;
  isImageModalVisible = false;
  
  // Staged processing properties
  processingState: ProcessingState = {
    currentStage: '',
    message: '',
    isComplete: false,
    progress: 0
  };
  private processingSubscription: Subscription = new Subscription();
  
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
    private audioService: AudioService,
    private openAiService: OpenAiService,
    private textToSpeechService: TextToSpeechService,
    private videoGenerationService: VideoGenerationService,
    private elementRef: ElementRef,
    private stagedProcessingService: StagedProcessingService
  ) {}

  resetChat() {
    this.chatHistory = [];
    // Optionally, you could add a new welcome message here
    // this.chatHistory.push({ role: 'assistant', content: 'New chat started!' });
  }

  ngAfterViewInit(): void {
    if (this.messageTextarea) {
      this.messageTextarea.nativeElement.addEventListener('input', this.handleTextareaInput.bind(this));
      this.messageTextarea.nativeElement.addEventListener('paste', this.handleTextareaInput.bind(this));
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


  private scrollToBottom(): void {
    try {
      const element = this.chatHistoryContainer.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
        console.log('Scrolled to bottom, scrollHeight:', element.scrollHeight);
      }
    } catch (error) {
      console.warn('Could not scroll to bottom:', error);
    }
  }

  private triggerScrollToBottom(): void {
    this.shouldScrollToBottom = true;
    // Also trigger immediately for better responsiveness
    setTimeout(() => {
      if (this.chatHistoryContainer) {
        this.scrollToBottom();
      }
    }, 100);
  }

  // Method to force scroll to bottom (useful for async operations)
  private forceScrollToBottom(): void {
    setTimeout(() => {
      if (this.chatHistoryContainer) {
        this.scrollToBottom();
      }
    }, 200);
  }

  private handleTextareaInput() {
    // Small delay to ensure content is rendered
    setTimeout(() => {
      this.adjustTextareaHeight();
    }, 0);
  }

  private adjustTextareaHeight() {
    if (!this.messageTextarea) return;
    
    const textarea = this.messageTextarea.nativeElement;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate the new height based on content
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 48; // Minimum height in pixels
    const maxHeight = 120; // Maximum height in pixels
    
    // Set the new height within bounds
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Show/hide scrollbar based on content
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  }

  // Analyze if user query would benefit from visual content
  private shouldGenerateImage(userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    
    // Check for explicit visual keywords
    const hasVisualKeywords = this.visualKeywords.some(keyword => 
      message.includes(keyword.toLowerCase())
    );
    
    // Check for creative/descriptive patterns
    const hasCreativeIntent = /\b(create|generate|make|build|design)\b.*\b(something|image|picture|visual)\b/i.test(message);
    const hasDescriptiveIntent = /\b(describe|explain|show)\b.*\b(visually|with picture|with image)\b/i.test(message);
    
    return hasVisualKeywords || hasCreativeIntent || hasDescriptiveIntent;
  }

  toggleChatbot() {
    this.isChatbotVisible = !this.isChatbotVisible;
    document.body.classList.toggle('show-chatbot');
  }

  closeChatbot() {
    this.isChatbotVisible = false;
    document.body.classList.remove('show-chatbot');
  }

  openOcrPopup() {
    this.isOcrPopupVisible = true;
    this.isChatbotVisible = !this.isChatbotVisible;
  }
  openVideoPopup() {
    this.isVideoPopupVisible = true;
    this.isChatbotVisible = false;
  }

  closeVideoPopup() {
    this.isVideoPopupVisible = false;
    this.isChatbotVisible = true;
  }

  closeOcrPopup() {
    this.isOcrPopupVisible = false;
    this.isChatbotVisible = !this.isChatbotVisible;
  }
  openDprAnalyserPopup() {
    this.isDocumentAnalyserVisible = true;
    this.isChatbotVisible = !this.isChatbotVisible;
  }

  closeDprAnalyserPopup() {
    this.isDocumentAnalyserVisible = false;
    this.isChatbotVisible = !this.isChatbotVisible;
  }

  setResponseMode(mode: 'text' | 'image' | 'smart') {
    this.responseMode = mode;
  }

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

  async processAudio(audioBlob: Blob) {
    const transcribedText = await this.openAiService.transcribeAudio(
      audioBlob,
      this.selectedLanguage
    );
    await this.getChatResponse(transcribedText);
  }
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

  async sendMessage() {
    if (this.userInput.trim() || this.selectedImage) {
      const userMessage: ChatMessage = {
        role: 'user',
        content: this.userInput.trim(),
        imageUrl: this.selectedImage || undefined
      };

      this.chatHistory.push(userMessage);
      this.forceScrollToBottom(); // Use force scroll for immediate response
      
      this.userInput = '';
      const imageCopy = this.selectedImage;
      this.selectedImage = null;

      // Reset the file input so the same image can be re-uploaded
      if (this.fileUpload) {
        this.fileUpload.nativeElement.value = '';
      }
      
      // Reset textarea height after clearing content
      setTimeout(() => {
        if (this.messageTextarea) {
          const textarea = this.messageTextarea.nativeElement;
          textarea.style.height = 'auto';
          textarea.style.height = '48px'; // Reset to minimum height
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
        // Keep the working message as 'working...' to maintain our UI condition
        // The actual stage message will be displayed via processingState.message
      });

    this.chatHistory.push({
      role: 'assistant',
      content: 'working...'
    });
    this.forceScrollToBottom(); // Use force scroll for "working..." message

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
        
        if (shouldIncludeImage && !imageData) { // Don't generate image if user already uploaded one
          try {
            // Generate contextual image prompt from the text response
            const imagePrompt = await this.createImagePrompt(userMessage, textResponse);
            imageUrl = await this.openAiService.generateImage(imagePrompt);
          } catch (error) {
            console.warn('Image generation failed in smart mode:', error);
            // Continue without image if generation fails
          }
        }

        this.chatHistory.pop();
        
        // Handle text response formatting (tables, etc.)
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

        // If no description but we have an image, create a message for it
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
      this.chatHistory.pop(); // Remove 'working...' message
      this.chatHistory.push({
        role: 'assistant',
        content: 'An error occurred while processing your request. Please try again.'
      });
      this.forceScrollToBottom(); // Use force scroll for error message
    } finally {
      this.processingSubscription.unsubscribe();
    }
  }

  private streamResponse(text: string, imageUrl?: string) {
    // 1. Find and replace the working message with a placeholder
    const workingMessageIndex = this.chatHistory.findIndex(msg => 
      msg.role === 'assistant' && msg.content === 'working...'
    );
    
    let messageIndex: number;
    if (workingMessageIndex !== -1) {
      // Replace the working message
      this.chatHistory[workingMessageIndex] = {
        role: 'assistant',
        content: '',
        imageUrl: imageUrl || ''
      };
      messageIndex = workingMessageIndex;
    } else {
      // Create new message if no working message found
      this.chatHistory.push({
        role: 'assistant',
        content: '',
        imageUrl: imageUrl || ''
      });
      messageIndex = this.chatHistory.length - 1;
    }
    this.forceScrollToBottom();

    const words = text.split(' ');
    let currentWordIndex = 0;

    const interval = setInterval(() => {
      if (currentWordIndex < words.length) {
        // 2. Append one word at a time
        this.chatHistory[messageIndex].content += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex];
        this.forceScrollToBottom();
        currentWordIndex++;
      } else {
        // 3. Once complete, add image (if any) and stop
        if (imageUrl) {
          this.chatHistory[messageIndex].imageUrl = imageUrl;
        }
        clearInterval(interval);
      }
    }, 100); // Adjust the speed of typing here
  }

  // Create a contextual image prompt based on user query and text response
  private async createImagePrompt(userQuery: string, textResponse: string): Promise<string> {
    // Extract key concepts for image generation
    const prompt = `Based on this user query: "${userQuery}" and this response: "${textResponse.substring(0, 200)}...", create a simple, clear image prompt for DALL-E that would visually complement the text response. Make it descriptive but concise, focusing on the main concept. Return only the image prompt, nothing else.`;
    
    try {
      const imagePrompt = await this.openAiService.getCompletion(prompt);
      return imagePrompt.trim();
    } catch (error) {
      // Fallback to user query if prompt generation fails
      return userQuery;
    }
  }

  addImageToChat(imageUrl: string) {
    this.chatHistory.push({
      role: 'user',
      content: `<img src="${imageUrl}" alt="Uploaded Image" style="max-width: 100%; height: auto;" />`,
    });
    // You can add logic here to send the image to OpenAI for analysis if needed
    // For example:
    // this.analyzeImage(imageUrl);
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

  ngOnDestroy(): void {
    this.textToSpeechService.cancel();
    this.processingSubscription.unsubscribe();
    this.stagedProcessingService.stopProcessing();
  }

  escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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




