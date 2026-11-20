# ConceptAI — General-Purpose Chatbot

ConceptAI is a working Angular prototype of a multi-tool AI workspace. One sidebar switches between conversational assistance, image generation, document OCR, and long-form project-report analysis. The product is built for teams that still do this work by hand: answering repeated domain questions, drafting visuals, typing text out of photos, and reading hundred-page Detailed Project Reports (DPRs) to check scope, numbers, and government schedule-of-rates.

The interface is branded **ConceptAI — Intelligent Solutions**.

## Problems this platform addresses

| Problem | What people do today | What ConceptAI does |
| --- | --- | --- |
| Expertise is locked in people and documents | Staff answer the same policy, product, or domain questions over chat and phone | A conversational assistant answers from the ongoing thread, and can be pointed at a specific domain |
| Visuals take a designer or a stock-image search | Training decks, diagrams, and concept art are produced one image at a time | A prompt produces an image, with sample prompts to start from |
| Photos of bills, receipts, and forms are retyped | Clerks read market bills and handwritten slips and enter them into a system | OCR reads a JPEG or PNG and returns the text on the page, including tables |
| DPRs are too long to review line by line | Reviewers spend days finding sections, totals, and rate mismatches against a Schedule of Rates (SOR) | The analyser reads the PDF, summarises it page by page, then answers questions against the document and a built-in SOR |

## Offerings

### 1. Text chat — `/`

The home screen is a general-purpose assistant.

- Multi-turn conversation with history sent on each request
- Answers rendered with markdown, including tables
- Copy a reply, or listen to it with text-to-speech
- Attach an image and ask a question about it (vision)
- Voice input through the browser speech API, with Whisper transcription available for recorded audio
- A staged progress indicator while a reply is prepared (analyse → generate → finalise)
- New Chat resets the thread

This is the offering for internal knowledge, customer support, and domain Q&A (agriculture, operations, product policy, and similar). The model behind chat and vision is GPT-4o.

### 2. Image generation — `/generation`

A dedicated studio for turning a text description into an image.

- Prompt box with sample scenes that fill the prompt when selected
- Generation through GPT Image, with DALL·E 3 as the fallback
- The chat screen can also answer in image mode, or in a smart mode that writes the text first and adds an image when the question is visual (“show me”, “diagram”, “draw”, “what does it look like”)

Used for training material, concept art, diagrams, and presentation visuals without a separate design pass for every draft.

### 3. OCR — `/ocr`

Upload or drop a JPEG, JPG, or PNG. The image is read with a vision model and the text on it is returned, formatted when the source contains a table. The result can be copied.

Aimed at market bills, invoices, receipts, and other photographed documents where the bottleneck is manual data entry.

### 4. DPR analyser — `/dpr`

Upload a PDF Detailed Project Report.

1. Text is extracted page by page.
2. Each page is summarised.
3. Page embeddings are stored so later questions can retrieve the most relevant pages (cosine similarity over the top matches).
4. A structured overall summary is produced from those page summaries, keeping costs, quantities, and measurements that actually appear in the file.
5. The user can then ask questions in a chat tied to that document.

Rate questions are answered against both the uploaded DPR and a built-in Schedule of Rates (excavation, filling, DPC, waterproofing, bitumen coat, plinth protection, RCC, reinforcement, centering and shuttering). The summary view includes a comparison of DPR item rates against those SOR rates, marking each line consistent or not.

This is the offering for government and infrastructure review: finding a section, checking whether a mandatory topic is covered, and spotting rate differences without reading the full PDF.

### Legacy assistant — `/legacy`

The earlier chat UI is still available. It is kept as a reference; the current product surface is the four modes above.

## How the app is put together

| Area | Role |
| --- | --- |
| `src/app/main-chat` | Home chat: text, attached images, voice, smart image replies |
| `src/app/image-generation` | Image studio |
| `src/app/ocr-popup` | Image upload and text extraction |
| `src/app/dpr-analyser` | PDF extraction, summaries, embeddings, Q&A |
| `src/app/shared` | Header and sidebar shared by every mode |
| `src/app/services/openai.service.ts` | Chat, vision, image generation, embeddings, DPR prompts |
| `src/app/services/staged-processing.service.ts` | Step-by-step progress messages for chat, OCR, and DPR |
| `src/app/bot-assistant` | Previous chat UI, routed at `/legacy` |

Stack: Angular 16, Angular Material, Bootstrap 5, RxJS, Axios, PDF.js, pdf-lib. Chat, vision, transcription, embeddings, and images go to the OpenAI API. Speech playback uses ResponsiveVoice.

A video-generation service (Google Veo and a small model list) is in the codebase. It is not on the sidebar and is not a live offering until a Google API key is configured.

## Run it locally

Requirements: Node.js and npm.

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

| Command | What it does |
| --- | --- |
| `npm start` | Dev server with reload |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests (Karma) |

Chat, OCR, image generation, and DPR analysis call OpenAI. Set your key in `apiKey` inside `src/app/services/openai.service.ts` before running those features. That value is left blank in the repository. Rotate any key that was previously stored in source.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Text chat |
| `/generation` | Image generation |
| `/ocr` | OCR |
| `/dpr` | DPR analyser |
| `/legacy` | Previous assistant UI |
