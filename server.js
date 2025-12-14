import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import fs from 'fs';

// Importaciones de MongoDB
import connectDB from './server/db.js';
import Book from './server/models/Book.js';
import ReadingProgress from './server/models/ReadingProgress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Conectar a la base de datos
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Multer para la subida de archivos
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json());

// Servir archivos estáticos (Frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// Servir los archivos PDF subidos (para que el frontend pueda acceder a ellos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicializar AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'secure-server', db: 'connected' });
});

// --- Endpoints de Libros y Progreso ---

// Endpoint para subir PDF
app.post('/api/books/upload', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
    }

    const tempPath = req.file.path;
    const originalFilename = req.file.originalname;
    const newPath = path.join(__dirname, 'uploads', originalFilename);

    // 1. Parsear el PDF para extraer texto y número de páginas
    const dataBuffer = fs.readFileSync(tempPath);
    const data = await pdfParse(dataBuffer);
    const extractedText = data.text;
    const totalPages = data.numpages;

    // 2. Mover el archivo a la ubicación final
    fs.renameSync(tempPath, newPath);

    // 3. Guardar metadatos del libro en MongoDB
    const newBook = new Book({
      title: originalFilename.replace(/\.pdf$/i, ''),
      filename: originalFilename,
      filePath: `/uploads/${originalFilename}`, // Ruta accesible desde el frontend
      extractedText: extractedText,
      totalPages: totalPages,
    });
    await newBook.save();

    // 4. Inicializar el progreso de lectura
    const newProgress = new ReadingProgress({
      bookId: newBook._id,
      lastPageRead: 1,
    });
    await newProgress.save();

    res.status(201).json({
      message: 'Libro subido y procesado con éxito.',
      book: newBook,
      progress: newProgress,
    });

  } catch (error) {
    console.error('Error al subir o procesar el PDF:', error);
    // Asegurarse de eliminar el archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error interno del servidor al procesar el PDF.', details: error.message });
  }
});

// Endpoint para obtener la lista de libros y su progreso
app.get('/api/books', async (req, res) => {
    try {
        const books = await Book.find({});
        const booksWithProgress = await Promise.all(books.map(async (book) => {
            const progress = await ReadingProgress.findOne({ bookId: book._id });
            return {
                ...book.toObject(),
                lastPageRead: progress ? progress.lastPageRead : 1,
            };
        }));
        res.json(booksWithProgress);
    } catch (error) {
        console.error('Error al obtener libros:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Endpoint para actualizar el progreso de lectura
app.post('/api/progress', async (req, res) => {
    try {
        const { bookId, pageNumber } = req.body;

        if (!bookId || typeof pageNumber !== 'number') {
            return res.status(400).json({ error: 'bookId y pageNumber son requeridos.' });
        }

        const progress = await ReadingProgress.findOneAndUpdate(
            { bookId: bookId },
            { lastPageRead: pageNumber, lastReadAt: new Date() },
            { new: true, upsert: true } // Crea si no existe
        );

        res.json({ message: 'Progreso actualizado con éxito.', progress });
    } catch (error) {
        console.error('Error al actualizar progreso:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- Endpoint de Chat AI (Modificado) ---

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { query, bookId, modelName } = req.body;
    let context = 'No specific context provided.';

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Si se proporciona un bookId, obtener el texto completo del libro como contexto
    if (bookId) {
        const book = await Book.findById(bookId);
        if (book) {
            context = book.extractedText;
        }
    }

    const prompt = `
      Context from book: \"${context}\"\n      \n      User Question: \"${query}\"\n      \n      Please answer the user's question based on the context. If the context is insufficient, use Google Search to find up-to-date or external information. \n      Keep the answer concise and helpful for a reader.\n    `;

    const response = await ai.models.generateContent({
      model: modelName || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: 'You are a helpful reading assistant. You help users understand books, define terms, and find external context.'
      },
    });

    const text = response.text || 'I couldn\'t generate a response.';

    // Extract sources
    const sources = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk) => {
        if (chunk.web?.uri) {
          sources.push(chunk.web.uri);
        }
      });
    }

    res.json({ text, sources });

  } catch (error) {
    console.error('Server AI Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LiteReader Backend running on http://localhost:${PORT}`);
});
