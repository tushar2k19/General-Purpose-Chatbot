import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BotAssistantComponent } from './bot-assistant/bot-assistant.component';
import { MainChatComponent } from './main-chat/main-chat.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SafeHtmlPipe } from './safe-html.pipe';
import { OcrPopupComponent } from './ocr-popup/ocr-popup.component';
import { DprAnalyserComponent } from './dpr-analyser/dpr-analyser.component';
import { ParticleBackgroundComponent } from './particle-background/particle-background.component';
import { VideoPopupComponent } from './video-popup/video-popup.component';
import { ImageGenerationComponent } from './image-generation/image-generation.component';
import { HeaderComponent } from './shared/header/header.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppComponent,
    BotAssistantComponent,
    MainChatComponent,
    SafeHtmlPipe,
    OcrPopupComponent,
    DprAnalyserComponent,
    ParticleBackgroundComponent,
    VideoPopupComponent,
    ImageGenerationComponent,
    HeaderComponent,
    SidebarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
