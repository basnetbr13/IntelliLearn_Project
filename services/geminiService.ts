import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentResponse, Part } from "@google/generative-ai";
import { QuizQuestion, Flashcard, Chapter, MangaPanel } from "../types";

// IMPORTANT: Your API key should be in a .env file in the project root.
// Create a file named .env and add this line:
// VITE_API_KEY=your_new_api_key_here
const API_KEY = import.meta.env.VITE_API_KEY;
if (!API_KEY) {
  throw new Error("VITE_API_KEY is not set. Please add it to your .env file.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Helper to safely parse JSON from a model's response
const parseJsonResponse = <T>(response: GenerateContentResponse): T => {
    const text = response.response.text();
    if (!text) {
        console.error("AI response was empty.", response);
        throw new Error("The AI returned an empty response. It might have been blocked due to safety policies.");
    }

    let jsonString = text.trim();
    
    // Clean potential markdown code fences
    if (jsonString.startsWith("```json")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
    }
    
    // Find the first '{' or '[' to start parsing from
    const startIndex = jsonString.search(/[[{]/);
    if (startIndex === -1) {
        console.error("No JSON object/array found in response:", text);
        throw new Error("The AI returned a non-JSON response.");
    }
    
    jsonString = jsonString.substring(startIndex);

    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        console.error("Original model response:", text);
        throw new Error("Could not parse the response from the AI model.");
    }
};

type FileType = Chapter['sourceFile']['type'];

const getFileParts = (fileContent: string, fileType: FileType, mimeType?: string): Part[] => {
  if (fileType === 'image' || fileType === 'file') {
    if (!mimeType) throw new Error(`Mime type must be provided for file type: ${fileType}`);
    return [{
      inlineData: { 
        mimeType: mimeType,
        data: fileContent.substring(fileContent.indexOf(',') + 1),
      },
    }];
  }
  return [{ text: fileContent }];
};


export const generateSummary = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<string> => {
  const parts = getFileParts(fileContent, fileType, mimeType);
  const prompt = "Provide a concise, easy-to-understand summary of the following course material. Use headings and bullet points for clarity.";
  
  const modelName = 'gemini-1.5-flash'; // Using flash for speed as requested.
  const model = genAI.getGenerativeModel({ model: modelName });
  
  const result = await model.generateContent([...parts, prompt]);
  const response = result.response;

  const text = response.text();
  if (!text) {
      console.error("Empty response from summary generation API:", response);
      throw new Error("Summary generation failed. The request may have been blocked or returned no content.");
  }
  return text;
};

export const generateQuiz = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<QuizQuestion[]> => {
  const parts = getFileParts(fileContent, fileType, mimeType);
  const prompt = `You are an extractive question-answering agent. Your task is to create a 5-question multiple-choice quiz from the provided text.
  For each question:
  1. Find a specific, factual statement in the text. This will be the correct answer.
  2. Formulate a question where that statement is the answer.
  3. Create three plausible but incorrect options (distractors).
  4. The 'correctAnswer' field in the JSON must be an *exact, verbatim quote* from the source text.`;

  const modelName = 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const schema = {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: {
        question: { type: "STRING" },
        options: { type: "ARRAY", items: { type: "STRING" } },
        correctAnswer: { type: "STRING" }
      },
      required: ["question", "options", "correctAnswer"]
    }
  };
  const fullPrompt = `${prompt}\n\nReturn the response as a JSON array matching this schema: ${JSON.stringify(schema)}`;
  const result = await model.generateContent([...parts, fullPrompt]);

  return parseJsonResponse<QuizQuestion[]>(result);
};

export const generateFlashcards = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<Flashcard[]> => {
    const parts = getFileParts(fileContent, fileType, mimeType);
    const prompt = `Based on the provided material, create a set of 10 flashcards.
    For each flashcard, provide a 'term' (a key concept or name) and a concise 'definition'.`;

    const modelName = 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          term: { type: "STRING" },
          definition: { type: "STRING" }
        },
        required: ["term", "definition"]
      }
    };
    const fullPrompt = `${prompt}\n\nReturn the response as a JSON array matching this schema: ${JSON.stringify(schema)}`;
    const result = await model.generateContent([...parts, fullPrompt]);

    return parseJsonResponse<Flashcard[]>(result);
};

export const generateMangaScript = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<Omit<MangaPanel, 'imageUrl'>[]> => {
    const parts = getFileParts(fileContent, fileType, mimeType);
    const prompt = `You are a creative manga scriptwriter. Transform the provided material into a compelling 6-panel manga script. For each panel, provide a 'caption' (narration or dialogue) and a 'panelPrompt' (a detailed, visual description for an image generation AI, focusing on action, setting, and character expression).`;
    
    const modelName = 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 1.0, // High creativity as requested
      },
    });

    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          caption: { type: "STRING" },
          panelPrompt: { type: "STRING" }
        },
        required: ["caption", "panelPrompt"]
      }
    };
    const fullPrompt = `${prompt}\n\nReturn the response as a JSON array matching this schema: ${JSON.stringify(schema)}`;
    const result = await model.generateContent([...parts, fullPrompt]);

    return parseJsonResponse<Omit<MangaPanel, 'imageUrl'>[]>(result);
}

export const generateMangaPanelImage = async (panelPrompt: string): Promise<string> => {
  // NOTE: The Gemini 1.5 models do not generate images from text prompts.
  // This function returns a placeholder image. For real image generation,
  // you would need to integrate with a different model/API like Imagen on Vertex AI
  // via a secure backend server, as direct client-side calls are not feasible.
  console.warn(`Image generation is not supported by the Gemini API in this way. Returning a placeholder for prompt: "${panelPrompt}"`);
  
  // Create a placeholder image with the prompt text
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#EEE';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#333';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Image Generation Placeholder', 256, 240);
  ctx.fillText(`Prompt: ${panelPrompt.substring(0, 40)}...`, 256, 270);
  return canvas.toDataURL();
};
