import { apiService } from './apiService';

// Configuration
// const BACKEND_URL = 'http://localhost:3001'; // Ya no es necesario, apiService usa /api
// let useBackend = true; // Ya no es necesario, siempre usamos el backend

// Eliminamos el fallback a cliente, ya que el backend maneja la lógica de seguridad y contexto.

/**
 * Checks if the backend is available
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`/api/health`, { method: 'GET', signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Main function to ask Gemini.
 * Now exclusively uses the secure backend.
 */
export const askGemini = async (
  query: string,
  bookId: string | null, // Ahora pasamos el bookId en lugar del contexto
  modelName: string = 'gemini-2.5-flash'
): Promise<{ text: string; sources: string[]; sourceMode: 'cloud' }> => {
  
  try {
    const { text, sources } = await apiService.chatWithAI(query, bookId, modelName);
    return { text, sources, sourceMode: 'cloud' };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
      text: "Sorry, I encountered an error while trying to process your request. The backend may be unavailable or the API key is invalid.", 
      sources: [],
      sourceMode: 'cloud'
    };
  }
};