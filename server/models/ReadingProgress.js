import mongoose from 'mongoose';

const ReadingProgressSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    lastPageRead: { type: Number, default: 1 },
    lastReadAt: { type: Date, default: Date.now },
});

// Asegura que solo haya un registro de progreso por libro (asumiendo un solo usuario por ahora)
ReadingProgressSchema.index({ bookId: 1 }, { unique: true });

const ReadingProgress = mongoose.model('ReadingProgress', ReadingProgressSchema);
export default ReadingProgress;
