export type Theme = 'light' | 'dark' | 'sepia';

export interface Highlight {
  id: string;
  text: string;
  page: number;
  note?: string; // Campo opcional de la versión original
  createdAt: number;
  color: 'yellow' | 'green' | 'blue' | 'red';
}

export interface BookMetadata {
  id: string; // MongoDB _id
  title: string;
  fileName: string;
  fileSize: number; // Mantenido por compatibilidad
  totalPages: number;
  lastPageRead: number; // Reemplaza a 'lastRead' para el progreso
  filePath: string; // URL del PDF en el servidor (e.g., /uploads/mi_libro.pdf)
  coverPageData?: string; // Mantenido por compatibilidad
}

export interface PDFMetadata {
  fileName: string;
  totalPages: number;
  lastPage: number;
  fileSize: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  sources?: string[];
  isThinking?: boolean;
}
