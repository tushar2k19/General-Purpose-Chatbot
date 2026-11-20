// import { Injectable } from '@angular/core';
// import axios from 'axios';
//
// interface EmbeddingResponse {
//   data: { embedding: number[] }[];
// }
//
// interface CompletionResponse {
//   choices: { text: string }[];
// }
//
// @Injectable({
//   providedIn: 'root'
// })
// export class OpenAiService {
//   public apiKey = '';
//
//   async transcribeAudio(audioBlob: Blob, language: string): Promise<string> {
//     const formData = new FormData();
//     formData.append('file', audioBlob, 'audio.wav');
//     formData.append('model', 'whisper-1');
//     formData.append('response_format', 'text');
//     formData.append('language', language);
//
//     const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
//       headers: {
//         'Authorization': `Bearer ${this.apiKey}`,
//         'Content-Type': 'multipart/form-data',
//       },
//     });
//
//     return response.data;
//   }
//
//   async getChatResponse(transcribedText: string, chatHistory: any[]): Promise<string> {
//     const messages = [
//       {
//         role: 'system',
//         content: '',
//       },
//       ...chatHistory,
//       { role: 'user', content: transcribedText },
//     ];
//
//     const response = await axios.post('https://api.openai.com/v1/chat/completions', {
//       model: 'gpt-4o',
//       messages: messages,
//     }, {
//       headers: {
//         'Authorization': `Bearer ${this.apiKey}`,
//       },
//     });
//
//     return response.data.choices[0].message.content;
//   }
//   async analyzeImage(imageData: string, prompt: string): Promise<string> {
//     try {
//       console.log('Analyzing image with prompt:', prompt);
//       const response = await axios.post('https://api.openai.com/v1/chat/completions', {
//         model: 'gpt-4o',  //'gpt-4-vision-preview'
//         messages: [
//           {
//             role: 'user',
//             content: [
//               { type: 'text', text: prompt },
//               {
//                 type: 'image_url',
//                 image_url: {
//                   url: imageData,
//                 },
//               },
//             ],
//           },
//         ],
//         max_tokens: 300,
//       }, {
//         headers: {
//           'Authorization': `Bearer ${this.apiKey}`,
//           'Content-Type': 'application/json',
//         },
//       });
//
//       console.log('API Response:', response.data);
//       return response.data.choices[0].message.content;
//     }catch (error) {
//       // @ts-ignore
//       console.error('Error in analyzeImage:', error.response ? error.response.data : error.message);
//       // @ts-ignore
//       throw new Error('Failed to analyze image: ' + (error.response ? error.response.data.error.message : error.message));
//     }
//   }
//
//   async generateImage(prompt: string): Promise<string> {
//     const response = await axios.post('https://api.openai.com/v1/images/generations', {
//       model: 'dall-e-3',
//       prompt: prompt,
//     }, {
//       headers: {
//         'Authorization': `Bearer ${this.apiKey}`,
//       },
//     });
//     return response.data.data[0].url;
//   }
//
//   async getEmbeddings(text: string): Promise<number[]> {
//     const url = 'https://api.openai.com/v1/embeddings';
//     const headers = { Authorization: `Bearer ${this.apiKey}` };
//     const body = { model: 'text-embedding-ada-002', input: text };
//     try {
//       const response = await axios.post(url, body, { headers });
//       return response.data.data[0].embedding;
//     } catch (error) {
//       console.error('Error fetching embeddings:', error);
//       throw error;
//     }
//   }
//
//   async getSummary(embeddings: number[][]): Promise<string> {
//     const prompt = `Summarize following text using the embeddings ahead: ${JSON.stringify(embeddings)}`;
//     return this.getCompletion(prompt);
//   }
//
//   async getAnswerFromEmbeddings(question: string, embeddings: number[][]): Promise<string> {
//     let a;
//     // const prompt = `Answer the question "${question}" based on the following text embeddings: ${JSON.stringify(
//     //   embeddings
//     // )}`;
//     // return this.getCompletion(prompt);
//     // const questionEmbedding = await this.getEmbedding(question);
//     // const similarities = pdfEmbeddings.map((embedding, index) => ({
//     //   similarity: cosineSimilarity(questionEmbedding, embedding),
//     //   chunk: textChunks[index],
//     // }));
//   }
//
//   private async getCompletion(prompt: string): Promise<string> {
//     const url = 'https://api.openai.com/v1/chat/completions';
//     const headers = { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
//     const body = {
//       model: 'gpt-4',
//       messages: [
//         { role: 'system', content: 'You are a smart and helpful assistant.' },
//         { role: 'user', content: prompt }
//       ],
//       max_tokens: 600,
//     };
//
//     try {
//       const response = await axios.post(url, body, { headers });
//       return response.data.choices[0].message.content.trim();
//     } catch (error) {
//       console.error('Error fetching completion:', error);
//       throw error;
//     }
//   }
//
// }

import { Injectable } from '@angular/core';
import axios from 'axios';
import * as mathjs from 'mathjs';

interface EmbeddingResponse {
  data: { embedding: number[] }[];
}

interface CompletionResponse {
  choices: { text: string }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  public apiKey = '';

  async transcribeAudio(audioBlob: Blob, language: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', language);

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getChatResponse(transcribedText: string, chatHistory: any[]): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: '',
      },
      ...chatHistory,
      {role: 'user', content: transcribedText},
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: messages,
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    return response.data.choices[0].message.content;
  }

  async analyzeImage(imageData: string, prompt: string): Promise<string> {
    try {
      // console.log('Analyzing image with prompt:', prompt);
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',  //'gpt-4-vision-preview'
        messages: [
          {
            role: 'user',
            content: [
              {type: 'text', text: prompt},
              {
                type: 'image_url',
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // console.log('API Response:', response.data);
      return response.data.choices[0].message.content;
    } catch (error) {
      // @ts-ignore
      console.error('Error in analyzeImage:', error.response ? error.response.data : error.message);
      // @ts-ignore
      throw new Error('Failed to analyze image: ' + (error.response ? error.response.data.error.message : error.message));
    }
  }

  async generateImage(prompt: string): Promise<string> {
    // Try GPT-Image-1 first (if available in your OpenAI account)
    // Falls back to DALL-E 3 HD if GPT-Image-1 is not accessible
    try {
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'gpt-image-1',
        prompt: prompt,
        quality: 'high',         // GPT-Image-1 uses 'low', 'medium', 'high'
        size: '1536x1024',       // GPT-Image-1 optimal size
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('✨ Using GPT-Image-1 (latest model)');
      return response.data.data[0].url;
    } catch (error: any) {
      // If GPT-Image-1 is not available, fall back to DALL-E 3 HD
      console.log('📸 GPT-Image-1 not available, using DALL-E 3 HD (still excellent quality)');
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3',
        prompt: prompt,
        quality: 'hd',           // DALL-E 3: 'standard' or 'hd'
        size: '1792x1024',       // DALL-E 3 max landscape size
        style: 'vivid'           // DALL-E 3: 'vivid' or 'natural'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.data.data[0].url;
    }
  }

  async getEmbeddings(text: string): Promise<number[]> {
    const url = 'https://api.openai.com/v1/embeddings';
    const headers = {Authorization: `Bearer ${this.apiKey}`};
    const body = {model: 'text-embedding-ada-002', input: text};
    try {
      const response = await axios.post(url, body, {headers});
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error fetching embeddings:', error);
      throw error;
    }
  }

  async getChunkSummary(text: string): Promise<string> {
    const prompt = `i have to provide the overall summary of a large pdf. but since it was big, i am uploading the pagewise text for you such that you give me the summary for this page and i can combine the summaries to generate an overall summary.
    the text for the current page looks like: """\n${text}\n"""

    the important thing to note is that:
    1) the response should contain only the summary of the page(none of your part). it should not be like "the summary of the page is as follows:". instead just give me the summary.
    2) focus on all aspects which can be added in the overall summary
    `;
    return this.getCompletion(prompt);
  }

  // async getOverallSummary(chunkSummaries: string[]): Promise<string> {
  //   const summariesText = chunkSummaries.map((summary, index) =>
  //     `Chunk ${index + 1} Summary: ${summary}`).join('\n\n');
  //
  //   const prompt = `i have to summaries the overall gist of a pdf called DPR. but the pdf is too large. so i can't provide the full text of the pdf. rather i am giving individual summaries of each page.
  //    The combined summary of the pages is as follows:
  //
  //    summary = """ ${summariesText} """
  //
  //     Provide me the overall summary with the key components (facts, numbers, etc). do not make any tables in the response. and the response should only contain the "summary" and no other response from you.
  //    `
  //   return this.getCompletion(prompt);
  // }

  async getOverallSummary(chunkSummaries: string[]): Promise<string> {
    const summariesText = chunkSummaries.map((summary, index) =>
      `Chunk ${index + 1} Summary: ${summary}`).join('\n\n');

    const prompt = `Create a structured summary of this DPR (Detailed Project Report) based on these page summaries:

Summary Content: """
${summariesText}
"""

Instructions:
1. Extract ONLY the information that's actually present in the summaries
2. Create relevant section headings based on what information you find(heading should be bold)
3. Write 2-3 lines under each heading
4. Include all numerical values (costs, measurements, quantities)
5. Format with capital headings and line breaks between sections
6. Skip any standard sections (like Timeline, Specifications etc.) if no related information exists
7. Only include headings and content for information that's explicitly found in the summaries

The headings should be based on the actual content present, not forced into predefined categories. Each section should follow this format:

[HEADING BASED ON AVAILABLE CONTENT] (in **BOLD**)
[2-3 lines of information that's present in the summaries]

[Next heading and content only if relevant information exists]

Only provide the formatted summary. Do not add any explanations or notes about missing information.`;

    return this.getCompletion(prompt);
  }

//
//   async getAnswerFromEmbeddings(
//     question: string,
//     embeddings: number[][],
//     pageTexts: string[],
//     chatHistory: { role: "user" | "assistant"; content: string }[]
//   ): Promise<string> {
//     // Get question embedding
//     const questionEmbedding = await this.getEmbeddings(question);
//
//     // Calculate similarities with advanced cosine approach
//     const similarities = embeddings.map((pageEmbedding, index) => ({
//       similarity: this.advancedCosineSimilarity(questionEmbedding, pageEmbedding),
//       index,
//       text: pageTexts[index]
//     }));
//
//     const sortedSimilarities = similarities.sort((a, b) => b.similarity - a.similarity);
//     const topContexts = sortedSimilarities.slice(0, 3);
//
//     const combinedContext = topContexts.map(context =>
//       `Page ${context.index + 1} (Similarity: ${context.similarity.toFixed(4)}): ${context.text}`
//     ).join('\n\n');
//
//     let prompt = `I will be asking a question and providing some relevant information. you need to answer using the information.\n
//                          Question: ${question} \n This is a chat system asking questions from the document. the last 5 conversations of the chat are given below("assistant" means you generated the response. "user" means that i'm asking the question.
//                          `
//     const lastFiveMessages = chatHistory.slice(0, -1).slice(Math.max(0, chatHistory.length - 6));
//     for (const message of lastFiveMessages) {
//       prompt += `[${message.role}]->${message.content}\n`;
//     }
//     prompt = `Context from most relevant PDF pages:
//   ${combinedContext}\n\n`;
//
//     prompt += `
//     The Rates of all the items as per the Manipur State Government's Schedule of Rates (SOR) are given below:
// """
// Item No.  Item Name            Description             Unit   Rate (In Rs.)
//
// 1.     Excavation      Earth work in excavation by
//        rock in         mechanical means (Hydraulic
//        narrow          Excavator)/ manual means in
//        areas           foundation trenches or drains
//                        (not exceeding 1.5 m in width
//                        or 10 sqm on plan) including     cum    Rs. 452.00
//                        dressing of sides and ramming
//                        of bottoms, lift up to 1.5 m,
//                        including getting out the
//                        excavated soil and disposal of
//                        surplus excavated soil as
//                        directed, within a lead of 50 m.
//
// 2.     Filling     Filling available excavated earth
//        available   (excluding hard rock/Ordinary rock)
//        excavated   in trenches, plinth, sides of
//        earth       foundations etc. in layers not     cum    Rs. 72.00
//                    exceeding 20cm in depth,
//                    consolidating each deposited
//                    layer by ramming and watering,
//                    lead up to 50 m and lift upto 1.5m.
//
// 3.     DPC 50mm    Providing and laying damp-proof
//        thick       course 50mm thick with cement
//                    concrete 1:2:4 (1 cement : 2 sand    sqm   Rs. 247.00
//                    : 4 graded stone aggregate 20mm
//                    nominal size).
//
// 4.    Extra for    Extra for providing and mixing
//       water        water proofing material as per
//       proofing     IS standard in cement concrete       sqm    Rs. 44.00
//       in c.c       work quantity as prescribed by
//                    the manufacturer
//
// 5.    Bitumen      Applying a coat of residual
//       coat for     petroleum bitumen of penetration
//       DPC          80/100 of approved quality using
//                    1.7kg per square metre on damp       sqm    Rs. 124.00
//                    proof course after cleaning the
//                    surface with brushes and finally
//                    with a piece of cloth lightly
//                    soaked in kerosene oil.
//
// 6.    Plinth        Making plinth protection 50mm thick
//      protection     of cement concrete grade M10 over
//       by C.C.       75mm bed of dry metal ballast 40mm
//                     nominal size well rammed and         sqm    Rs. 351.00
//                     consolidated and filled with sand
//                     including finishing the top smooth
//                     (with 20mm nominal size graded
//                     stone aggregate.)
//
// 7.    RCC upto     Providing and laying in position
//       plinth       specified grade of reinforced
//                    cement concrete (with 20mm nominal
//                    size graded stone aggregate)         cum     Rs. 5796.00
//                    excluding the cost of centering,
//                    shuttering, finishing and
//                    reinforcement - All work up to
//                    plinth level : M-20 Grade Concrete
//
// 8.   R.C.C.         R.C.C. Standards post/struts/rails
//     Standards       /poles of mix 1:1.5:3 (1 cement :1.5
//   post/struts/      sand :3 graded stone aggregate12.5mm
//   rails/poles       nominal size) with woodenplugs or
//                     6mm bar nibs wherever required        cum    Rs. 16510.00
//                     as per direction of Engineer-in
//                     -charge including fixing (cost of
//                     earth works in excavation, concrete
//                     works in foundation to be paid
//                     separately).
//
// 9.                  Reinforcement for R.C.C. work
//     TMT/TMX         including straightening, cutting,
//   Reinforce-        bending, placing in position and
//   -ment             binding including cost of binding
//                     wire all wastages and overlaps,         kg     Rs. 62.90
//                     couplers (overlaps shall be provided
//                     as per requirement of IS 13920 for
//                     ductile detaling IS 456 RCC Design &
//                     SP 34 Reinforcement detailing ) etc.
//                     complete.
//                     Thermo-Mechanically Treated bars.
//
// 10.  Centering     Centering and shuttering including
//        and         strutting, propping etc. and
//     shuttering     removal of form work for :               sqm    Rs. 356.00
//       Above        Above plinth: Columns, pillars, posts
//      Plinth        and struts.
// """
//
// Focus on both the "item name" and "description".
//     `
//
//     prompt += `Please provide a precise answer based on the given context.
//   If the exact answer is not clearly present, search it from internet and then answer. do not respond like "you can't answer" or any negative response.`;
//     return this.getCompletion(prompt);
//   }
  async getAnswerFromEmbeddings(
    question: string,
    embeddings: number[][],
    pageTexts: string[],
    chatHistory: ChatMessage[]
  ): Promise<string> {
    // Get relevant context from DPR as before
    const questionEmbedding = await this.getEmbeddings(question);
    const similarities = embeddings.map((pageEmbedding, index) => ({
      similarity: this.advancedCosineSimilarity(questionEmbedding, pageEmbedding),
      index,
      text: pageTexts[index]
    }));

    const sortedSimilarities = similarities.sort((a, b) => b.similarity - a.similarity);
    const topContexts = sortedSimilarities.slice(0, 3);
    const dprContext = topContexts.map(context => context.text).join('\n\n');

    // Full SOR data with detailed descriptions
    const sorData = `
Item 1: Excavation rock in narrow areas
Earth work in excavation by mechanical means (Hydraulic Excavator)/ manual means in foundation trenches or drains (not exceeding 1.5 m in width or 10 sqm on plan) including dressing of sides and ramming of bottoms, lift up to 1.5 m, including getting out the excavated soil and disposal of surplus excavated soil as directed, within a lead of 50 m.
Unit: cum, Rate: Rs.452.00

Item 2: Filling available excavated earth
Filling available excavated earth (excluding hard rock/Ordinary rock) in trenches, plinth, sides of foundations etc. in layers not exceeding 20cm in depth, consolidating each deposited layer by ramming and watering, lead up to 50 m and lift upto 1.5m.
Unit: cum, Rate: Rs.72.00

Item 3: DPC 50mm thick
Providing and laying damp-proof course 50mm thick with cement concrete 1:2:4 (1 cement : 2 sand : 4 graded stone aggregate 20mm nominal size).
Unit: sqm, Rate: Rs.247.00

Item 4: Extra for water proofing in cement concrete
Extra for providing and mixing water proofing material as per IS standard in cement concrete work quantity as prescribed by the manufacturer.
Unit: sqm, Rate: Rs.44.00

Item 5: Bitumen coat for DPC
Applying a coat of residual petroleum bitumen of penetration 80/100 of approved quality using 1.7kg per square metre on damp proof course after cleaning the surface with brushes and finally with a piece of cloth lightly soaked in kerosene oil.
Unit: sqm, Rate: Rs.124.00

Item 6: Plinth protection by cement concrete
Making plinth protection 50mm thick of cement concrete grade M10 over 75mm bed of dry metal ballast 40mm nominal size well rammed and consolidated and filled with sand including finishing the top smooth (with 20mm nominal size graded stone aggregate.)
Unit: sqm, Rate: Rs.351.00

Item 7: RCC up to plinth
Providing and laying in position specified grade of reinforced cement concrete (with 20mm nominal size graded stone aggregate) excluding the cost of centering, shuttering, finishing and reinforcement - All work up to plinth level : M-20 Grade Concrete
Unit: cum, Rate: Rs.5796.00

Item 8: RCC Standards post/struts/rails/poles
R.C.C. Standards post/struts/rails/poles of mix 1:1.5:3 (1 cement :1.5 sand :3 graded stone aggregate 12.5mm nominal size) with wooden plugs or 6mm bar nibs wherever required as per direction of Engineer-in-charge including fixing (cost of earth works in excavation, concrete works in foundation to be paid separately).
Unit: cum, Rate: Rs.16510.00

Item 9: TMT/TMX Reinforcement
Reinforcement for R.C.C. work including straightening, cutting, bending, placing in position and binding including cost of binding wire all wastages and overlaps, couplers (overlaps shall be provided as per requirement of IS 13920 for ductile detaling IS 456 RCC Design & SP 34 Reinforcement detailing) etc. complete. Thermo-Mechanically Treated bars.
Unit: kg, Rate: Rs.62.90

Item 10: Centering and shuttering Above Plinth
Centering and shuttering including strutting, propping etc. and removal of form work for Columns, pillars, posts and struts Above plinth.
Unit: sqm, Rate: Rs.356.00`;

    // Simple, clear prompt structure
    const prompt = `
Question: ${question}

Knowledge Material:

1. Content from DPR (Detailed Project Report):
${dprContext}

2. Official Schedule of Rates (SOR) for Manipur State:
${sorData}

Please provide a precise answer based on the above knowledge material. If comparing prices between DPR and SOR, consider the full descriptions to find matching items. If asked about SOR rates, provide the exact rates along with their units.`;

    return this.getCompletion(prompt);
  }
  private advancedCosineSimilarity(vec1: number[], vec2: number[]): number {
    const minLength = Math.min(vec1.length, vec2.length);
    vec1 = vec1.slice(0, minLength);
    vec2 = vec2.slice(0, minLength);
    const dotProduct = vec1.reduce((sum, val1, i) => sum + val1 * vec2[i], 0);

    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  async getCompletion(prompt: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    const body = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: "You are a precise and analytical assistant specializing in document analysis. But you can answer from internet too if you don't find the answer in the document. also, don't answer like a regular bot. try to give the best possible and satisfactory response to the user. your response includes only that part which the user should see. not something like 'here's the detailed answer and then you give response. you must directly give the expected response'"
        },
        {role: 'user', content: prompt}
      ],
      max_tokens: 800,
      temperature: 0.2,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    };

    try {
      const response = await axios.post(url, body, {headers});
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error fetching completion:', error);
      throw error;
    }
  }

//   async getTableContent(): Promise<string> {
//     const prompt = `
//     Generate a response that includes the following:
// 1. A string at the top: "Here's the comparison of item prices between the uploaded DPR document and the SOR 2022 document provided by the govt. of India."
// 2. Below the string, an HTML table containing all 10 items from the provided data. The table should be structured with proper \`<table>\`, \`<thead>\`, and \`<tbody>\` tags. Each row should represent one item, with columns for:
//    - Item No.
//    - Item Name
//    - Unit
//    - Rate in DPR(In Rs.)
//    - Rate in SOR (In Rs.)
//    - DPR vs. SOR Match
//
//
// Style specifications:
// - Include inline CSS for the table:
//   - \`table\`: \`border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;\`
//   - \`thead th\`: \`background: linear-gradient(to right, #632c5d, #8e1f88); color: #ffffff; padding: 12px; text-align: left;\`
//   - \`tbody td\`: \`padding: 8px 12px; border: 1px solid rgba(0, 0, 0, 0.1);\`
//   - Rows in \`tbody\`: Alternate background colors (\`rgba(255, 255, 255, 0.9)\` for even rows, \`rgb(241,237,241)\` for odd rows).
// - Set the color of the ticks (✅) as green and the crosses (✘) as red using \`style="color:green"\` and \`style="color:red"\`.
//
// Return only the HTML content, without additional explanations or \`\\n\` characters between lines. Ensure the output does not contain Markdown, only valid HTML.
// Here is the data to convert into the HTML table:
//
// """
// **Item No.  Item Name    Unit    Rate in DPR    Rate in SOR    Consistent**
//
// 1.     Excavation
//        rock in         cum     Rs. 452.00      Rs. 452.00       ✅
//        narrow
//        areas
//
//
//
// 2.     Filling
//        available       cum     Rs. 72.00       Rs. 72.00        ✅
//        excavated
//        earth
//
//
// 3.     DPC 50mm
//        thick           sqm     Rs. 597.00      Rs. 247.00       ✘
//
//
// 4.    Extra for
//       water
//       proofing         sqm     Rs. 98.00       Rs. 44.00        ✘
//       in c.c
//
// 5.    Bitumen
//       coat for         sqm     Rs. 124.00      Rs. 124.00       ✅
//       DPC
//
// 6.    Plinth
//      protection        sqm     Rs. 351.00      Rs. 351.00       ✅
//       by C.C.
//
//
// 7.    RCC upto         cum     Rs. 5796.00     Rs. 5796.00      ✅
//       plinth
//
// 8.   R.C.C.
//    standards          cum     Rs. 16510.00     Rs. 16510.00      ✅
//    post/struts/
//    rails/poles
//
// 9.    TMT/TMX          kg      Rs. 112.90       Rs. 62.90        ✘
//    Reinforcement
//
//
// 10.  Centering
//        and
//     shuttering        sqm      Rs. 356.00      Rs. 356.00        ✅
//       Above
//      Plinth
// """
//     `;
//     return this.getCompletion(prompt);
//   }
// }
//   async getTableContent(): Promise<string> {
//     const prompt = `
// Generate a response that includes the following:
// 1. A string at the top: "Here's the comparison of item prices between the uploaded DPR document and the SOR 2022 document provided by the govt. of India."
// 2. Below the string, an HTML table containing all 10 items from the provided data. The table should be structured with proper \`<table>\`, \`<thead>\`, and \`<tbody>\` tags. Each row should represent one item, with columns for:
//    - Item No.
//    - Item Name
//    - Unit
//    - Rate in DPR(In Rs.)
//    - Rate in SOR (In Rs.)
//    - DPR vs. SOR Match
//
// Return only the HTML content, without any additional explanations or newlines. Ensure the output does not contain Markdown, only valid HTML.
// Here is the data to convert into the HTML table:
//
// **Item No. | Item Name | Unit | Rate in DPR | Rate in SOR | Consistent**
//
// 1. Excavation rock in narrow areas | cum | Rs. 452.00 | Rs. 452.00 | ✅
// 2. Filling available excavated earth | cum | Rs. 72.00 | Rs. 72.00 | ✅
// 3. DPC 50mm thick | sqm | Rs. 597.00 | Rs. 247.00 | ✘
// 4. Extra for water proofing in c.c | sqm | Rs. 98.00 | Rs. 44.00 | ✘
// 5. Bitumen coat for DPC | sqm | Rs. 124.00 | Rs. 124.00 | ✅
// 6. Plinth protection by C.C. | sqm | Rs. 351.00 | Rs. 351.00 | ✅
// 7. RCC upto plinth | cum | Rs. 5796.00 | Rs. 5796.00 | ✅
// 8. R.C.C. standards post/struts/rails/poles | cum | Rs. 16510.00 | Rs. 16510.00 | ✅
// 9. TMT/TMX Reinforcement | kg | Rs. 112.90 | Rs. 62.90 | ✘
// 10. Centering and shuttering Above Plinth | sqm | Rs. 356.00 | Rs. 356.00 | ✅
// `;
//
//     return this.getCompletion(prompt);
//   }
}
