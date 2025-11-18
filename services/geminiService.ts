
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, Flashcard, MangaPanel } from "../types";

// Add declaration for pdf.js library loaded via script tag
declare const pdfjsLib: any;

// Lazy-loaded instance of the GoogleGenAI client.
let aiInstance: GoogleGenAI | null = null;

/**
 * Gets the singleton instance of the GoogleGenAI client.
 * Initializes the client on first call.
 * @throws {Error} if the API_KEY environment variable is not set.
 */
const getAi = (): GoogleGenAI => {
    if (!aiInstance) {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API key is not configured. Please set the API_KEY environment variable to use AI features.");
        }
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
};


const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const cleanJsonString = (str: string): string => {
    // Remove markdown code fences and trailing commas
    return str.replace(/^```json\s*|```\s*$/g, '').trim();
};

const parseJsonResponse = <T,>(text: string): T => {
    try {
        const cleanedText = cleanJsonString(text);
        return JSON.parse(cleanedText) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", text, e);
        throw new Error("Received an invalid JSON response from the AI.");
    }
};

const pdfToImageParts = async (file: File): Promise<string> => {
    // Set workerSrc for pdf.js. It's needed to process PDFs in a separate thread.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

    const fileBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(fileBuffer).promise;
    const numPages = pdf.numPages;
    const imageParts = [];

    // Use a single canvas element that is resized for each page to save memory.
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error("Could not create canvas context for PDF rendering.");
    }
    
    // Process all pages and convert them to JPEG images.
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Use a consistent scale for good OCR quality.
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const base64ImageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        imageParts.push({
            inlineData: {
                data: base64ImageData,
                mimeType: 'image/jpeg',
            },
        });
    }
    canvas.remove(); // Clean up the off-screen canvas.

    if (imageParts.length === 0) {
        return ""; // Return empty string if PDF was empty.
    }
    
    const ai = getAi();
    // Using strict extractive prompt to simulate BERT-like OCR behavior with Flash model
    const prompt = "Act as a high-precision text extraction model. Analyze all pages and extract the complete text content exactly as it appears. Maintain the original structure (headings, paragraphs). Do not summarize, do not interpret. Simply extract the text.";
    
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, { text: prompt }] },
        config: {
            temperature: 0, // Absolute zero for deterministic (BERT-like) behavior
            systemInstruction: "You are a dedicated OCR engine. You extract text verbatim from images."
        }
    });
    return result.text;
};

export const extractTextFromContent = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
        return file.text();
    }
    
    if (file.type === 'application/pdf') {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error("PDF processing library is not loaded. Please check your internet connection and try again.");
        }
        return pdfToImageParts(file);
    }
    
    if (file.type.startsWith('image/')) {
        const ai = getAi();
        const imagePart = await fileToGenerativePart(file);
        // Using Flash model with temperature 0 for BERT-like extraction
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: "Act as a high-precision text extraction model. Extract the text from this image exactly as it appears. If it is a picture without text, describe it in detail." }] },
            config: {
                temperature: 0, // Deterministic behavior
                systemInstruction: "You are a dedicated OCR engine. You extract text verbatim from images."
            }
        });
        return result.text;
    }
    
    throw new Error("Unsupported file type");
};

export const generateSummary = async (content: string): Promise<string> => {
    const ai = getAi();
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Please provide a concise, easy-to-digest summary of the following material. Use headings and bullet points for maximum clarity and readability.\n\n---\n\n${content}`,
        config: {
            systemInstruction: "You are an expert academic summarizer. Your summaries are clear, structured, and focus on the key takeaways of the provided text.",
        }
    });
    return result.text;
};

export const generateQuiz = async (content: string): Promise<QuizQuestion[]> => {
    const ai = getAi();
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Act as an Extractive Question-Answering model (similar to BERT). Your task is to generate a quiz based strictly on the provided text.

        Instructions:
        1. Scan the text for factual statements.
        2. Select a specific phrase or sentence segment from the text to serve as the Correct Answer. The answer must be verbatim from the text.
        3. Create a question that this specific text segment answers.
        4. Generate 3 distractor options that are contextually relevant but incorrect.
        
        Generate 5 such questions.

        Source Content:
        \n\n---\n\n${content}`,
        config: {
            temperature: 0, // Non-generative / Deterministic extraction
            systemInstruction: "You are an AI that performs extractive question answering. You extract answers directly from the source text without modification/generation.",
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.NUMBER },
                        question: { type: Type.STRING },
                        options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        correctAnswer: { type: Type.STRING }
                    },
                    required: ['id', 'question', 'options', 'correctAnswer']
                }
            }
        }
    });
    return parseJsonResponse<QuizQuestion[]>(result.text);
};


export const generateFlashcards = async (content: string): Promise<Flashcard[]> => {
    const ai = getAi();
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a set of 8 flashcards for the key terms, concepts, and definitions from the provided text.\n\n---\n\n${content}`,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.NUMBER },
                        term: { type: Type.STRING },
                        definition: { type: Type.STRING }
                    },
                    required: ['id', 'term', 'definition']
                }
            }
        }
    });
    return parseJsonResponse<Flashcard[]>(result.text);
};

export const generateMangaScript = async (content: string): Promise<MangaPanel[]> => {
    const ai = getAi();
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Act as a professional manga storyboarder. Your task is to transform the ENTIRETY of the provided educational content into a comprehensive manga script.

        CRITICAL INSTRUCTIONS:
        1.  **Cover ALL Content**: You must cover all resources, facts, concepts, and details provided in the source text. Do not summarize heavily or omit key information.
        2.  **Dynamic Length**: Do NOT limit yourself to a specific number of panels. Create as many panels as required to fully explain and visualize the content based on its length and complexity. If the content is long, generate more panels.
        3.  **Pacing**: Break down dense information into multiple panels to ensure it is digestible.
        4.  **Format**: For each panel, provide a detailed scene description, dialogue, and narration.
        5.  **Style**: Dramatic, engaging, educational Japanese manga style.

        Source Content:
        \n\n---\n\n${content}`,
        config: {
            temperature: 1, // High creativity for storytelling
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.NUMBER },
                        description: { type: Type.STRING, description: "Detailed visual description of the scene for the artist." },
                        dialogue: { type: Type.STRING, description: "Dialogue for characters in the panel. Use 'CHARACTER: text' format." },
                        narration: { type: Type.STRING, description: "Narration box text." }
                    },
                    required: ['id', 'description', 'dialogue', 'narration']
                }
            }
        }
    });
    return parseJsonResponse<MangaPanel[]>(result.text);
};

export const generateMangaImage = async (panelDescription: string): Promise<string> => {
    const ai = getAi();
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Generate a single manga panel image in a dramatic black and white style with high contrast. The scene is: ${panelDescription}`}] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    const firstPart = result.candidates?.[0]?.content?.parts?.[0];
    if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
        return firstPart.inlineData.data;
    }
    throw new Error("No image was generated for the manga panel.");
