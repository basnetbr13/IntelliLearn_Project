import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { QuizQuestion, Flashcard, Chapter, MangaPanel } from "../types";

// FIX: API key must be retrieved from environment variables, not hardcoded.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to safely parse JSON from a model's response
const parseJsonResponse = <T>(response: GenerateContentResponse): T => {
    const text = response.text;
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

const getFileParts = (fileContent: string, fileType: FileType, mimeType?: string) => {
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
  
  const model = fileType === 'text' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [...parts, { text: prompt }] },
  });

  if (!response.text) {
      console.error("Empty response from summary generation API:", response);
      throw new Error("Summary generation failed. The request may have been blocked or returned no content.");
  }
  return response.text;
};

export const generateQuiz = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<QuizQuestion[]> => {
  const parts = getFileParts(fileContent, fileType, mimeType);
  const prompt = `Based on the provided material, create a multiple-choice quiz with 5 questions.
  For each question, provide 4 options and clearly indicate the correct answer.`;

  const model = fileType === 'text' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [...parts, { text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer"]
        }
      }
    }
  });

  return parseJsonResponse<QuizQuestion[]>(response);
};

export const generateFlashcards = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<Flashcard[]> => {
    const parts = getFileParts(fileContent, fileType, mimeType);
    const prompt = `Based on the provided material, create a set of 10 flashcards.
    For each flashcard, provide a 'term' (a key concept or name) and a concise 'definition'.`;

    const model = fileType === 'text' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [...parts, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        term: { type: Type.STRING },
                        definition: { type: Type.STRING }
                    },
                    required: ["term", "definition"]
                }
            }
        }
    });

    return parseJsonResponse<Flashcard[]>(response);
};

export const generateMangaScript = async (fileContent: string, fileType: FileType, mimeType?: string): Promise<Omit<MangaPanel, 'imageUrl'>[]> => {
    const parts = getFileParts(fileContent, fileType, mimeType);
    const prompt = `You are a creative manga scriptwriter. Transform the provided material into a compelling 6-panel manga script. For each panel, provide a 'caption' (narration or dialogue) and a 'panelPrompt' (a detailed, visual description for an image generation AI, focusing on action, setting, and character expression).`;
    
    const model = fileType === 'text' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [...parts, { text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        caption: { type: Type.STRING },
                        panelPrompt: { type: Type.STRING }
                    },
                    required: ["caption", "panelPrompt"]
                }
            }
        }
    });

    return parseJsonResponse<Omit<MangaPanel, 'imageUrl'>[]>(response);
}

export const generateMangaPanelImage = async (panelPrompt: string): Promise<string> => {
    const fullPrompt = `Create a professional black and white manga panel with clean line art, dynamic composition, and screentones for shading. The scene is: ${panelPrompt}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: fullPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const firstPart = response.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && firstPart.inlineData) {
        return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
    }
    
    throw new Error("Image generation failed or returned an invalid format.");
};