import { BookMetadata } from '../types';

const API_BASE_URL = '/api'; // Asumimos que el frontend y el backend corren en el mismo host/puerto

export const apiService = {
    // --- Libros ---

    async uploadBook(file: File): Promise<BookMetadata> {
        const formData = new FormData();
        formData.append('pdfFile', file);

        const response = await fetch(`${API_BASE_URL}/books/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al subir el libro.');
        }

        const data = await response.json();
        // Adaptar la respuesta del backend al formato BookMetadata del frontend
        return {
            id: data.book._id,
            title: data.book.title,
            fileName: data.book.filename,
            fileSize: 0, // El frontend ya no necesita el tamaño exacto del blob
            totalPages: data.book.totalPages,
            lastPageRead: data.progress.lastPageRead,
            filePath: data.book.filePath, // Nueva propiedad para la URL del PDF
        };
    },

    async getBooks(): Promise<BookMetadata[]> {
        const response = await fetch(`${API_BASE_URL}/books`);
        if (!response.ok) {
            throw new Error('Error al obtener la lista de libros.');
        }
        const data = await response.json();
        
        return data.map((book: any) => ({
            id: book._id,
            title: book.title,
            fileName: book.filename,
            fileSize: 0,
            totalPages: book.totalPages,
            lastPageRead: book.lastPageRead,
            filePath: book.filePath,
        }));
    },

    // --- Progreso de Lectura ---

    async updateReadingProgress(bookId: string, pageNumber: number): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ bookId, pageNumber }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar el progreso de lectura.');
        }
    },

    // --- Chat AI ---

    async chatWithAI(query: string, bookId: string | null, modelName?: string): Promise<{ text: string, sources: string[] }> {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, bookId, modelName }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error en la comunicación con la IA.');
        }

        return response.json();
    }
};
