import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BotAssistantComponent } from './bot-assistant/bot-assistant.component';
import { MainChatComponent } from './main-chat/main-chat.component';
import { OcrPopupComponent } from './ocr-popup/ocr-popup.component';
import { DprAnalyserComponent } from './dpr-analyser/dpr-analyser.component';
import { ImageGenerationComponent } from './image-generation/image-generation.component';

const routes: Routes = [
  {
    path:'',
    component: MainChatComponent
  },
  {
    path:'generation',
    component: ImageGenerationComponent
  },
  {
    path:'ocr',
    component: OcrPopupComponent
  },
  {
    path:'dpr',
    component: DprAnalyserComponent
  },
  {
    path:'legacy',
    component: BotAssistantComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
