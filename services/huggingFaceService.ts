import { ChatMessage } from "../types";

const HF_API_URL = "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2";

// TODO: Replace this with your actual Hugging Face API key
const HF_API_KEY = "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";

export const askHuggingFace = async (question: string, context: string): Promise<ChatMessage> => {
    const apiKey = HF_API_KEY;

    try {
        console.log("Asking Hugging Face:", question);

        // Hugging Face QnA models have a context limit (usually 512 tokens). 
        // Sending a huge context will likely cause an error or truncation.
        // For a robust solution, we should chunk the context, but for this implementation
        // we will truncate it to a safe limit (approx 3000 chars) to prevent 400 errors.
        const safeContext = context.substring(0, 3000);

        const response = await fetch(HF_API_URL, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: {
                    question: question,
                    context: safeContext,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Hugging Face API Error:", response.status, errorData);

            if (response.status === 503) {
                return {
                    role: 'model',
                    content: "The model is currently loading. Please try again in a few seconds.",
                    isOutOfContext: false
                };
            }
            return {
                role: 'model',
                content: `Error: ${errorData.error || response.statusText}`,
                isOutOfContext: false
            };
        }

        const result = await response.json();
        console.log("Hugging Face Result:", result);

        // The API returns { score: number, start: number, end: number, answer: string }
        if (result && result.answer) {
            return {
                role: 'model',
                content: result.answer,
                isOutOfContext: false
            };
        } else if (result && result.error) {
            return {
                role: 'model',
                content: `Error: ${result.error}`,
                isOutOfContext: false
            };
        } else {
            return {
                role: 'model',
                content: "I couldn't find an answer in the provided text.",
                isOutOfContext: false
            };
        }

    } catch (error) {
        console.error("Error asking Hugging Face:", error);
        return {
            role: 'model',
            content: "Sorry, I encountered an error while connecting to the AI service.",
            isOutOfContext: false
        };
    }
};
