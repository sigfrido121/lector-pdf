import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    filename: { type: String, required: true, unique: true },
    filePath: { type: String, required: true }, // Path on the server's filesystem
    extractedText: { type: String, default: '' }, // Text content for AI context
    uploadDate: { type: Date, default: Date.now },
    totalPages: { type: Number, default: 0 },
});

const Book = mongoose.model('Book', BookSchema);
export default Book;
