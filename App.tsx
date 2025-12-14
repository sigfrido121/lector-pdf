import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Highlight, Theme, BookMetadata } from './types';
import { apiService } from './services/apiService';
import Sidebar from './components/Sidebar';
import FloatingMenu from './components/FloatingMenu';
import { 
  ChevronLeft, ChevronRight, Upload, ZoomIn, ZoomOut, 
  Menu, Book, FileText, AlertCircle, Library, 
  Sun, Moon, Coffee, Trash2, Plus, DownloadCloud, ChevronDown
} from 'lucide-react';

// Explicitly set worker to a specific version compatible with react-pdf v9
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

function App() {
  // Navigation State
  const [view, setView] = useState<'library' | 'reader'>('library');
  const [file, setFile] = useState<Blob | null>(null);
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  
  // PDF State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [headerVisible, setHeaderVisible] = useState<boolean>(true); // For immersive reading
  const [aiQuery, setAiQuery] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState<Theme>('light');
  
  // Data State
  const [libraryBooks, setLibraryBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Persistence keys based on current book ID
  const storageKey = currentBookId ? `reader_${currentBookId}` : 'reader_default';
  const [highlights, setHighlights] = useLocalStorage<Highlight[]>(`${storageKey}_highlights`, []);
  // La última página leída ahora se gestiona en el backend.
  // const [lastPage, setLastPage] = useLocalStorage<number>(`${storageKey}_lastPage`, 1);

  // Refs for navigation focus
  const viewerRef = useRef<HTMLDivElement>(null);

  // Load library on start
  useEffect(() => {
    loadLibrary();
  }, []);

  // Sync page number when book changes
  useEffect(() => {
    if (file && currentBookId) {
      // Buscar el libro en la librería para obtener la última página leída
      const book = libraryBooks.find(b => b.id === currentBookId);
      const initialPage = book ? book.lastPageRead : 1;
      setPageNumber(initialPage);
      setHeaderVisible(true); // Always show header when opening a book
    }
  }, [file, currentBookId, libraryBooks]);

  // Ensure scroll to top happens whenever pageNumber changes
  useLayoutEffect(() => {
    if (view === 'reader' && viewerRef.current) {
      viewerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [pageNumber, view]);

  // Keyboard Navigation with Smart Scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'reader') return;
      if (sidebarOpen) return; // Don't navigate if typing in chat

      if (e.key === 'ArrowLeft') {
        changePage(-1);
      } else if (e.key === 'ArrowRight') {
        changePage(1);
      } else if (e.key === 'ArrowUp') {
        // Standard scroll up
      } else if (e.key === 'ArrowDown') {
        // Standard scroll down
      } else if (e.key === ' ') {
        e.preventDefault(); // Prevent default browser scroll
        const viewer = viewerRef.current;
        
        if (viewer) {
          const isAtBottom = viewer.scrollTop + viewer.clientHeight >= viewer.scrollHeight - 20;
          
          if (isAtBottom) {
            // If at bottom, go to next page
            changePage(1);
          } else {
            // Otherwise scroll down by one screen portion
            viewer.scrollBy({ top: viewer.clientHeight * 0.8, behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, numPages, pageNumber, sidebarOpen]);

  const loadLibrary = async () => {
    try {
      const books = await apiService.getBooks();
      setLibraryBooks(books);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  };

  const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files[0]) {
      setIsLoading(true);
      try {
        const metadata = await apiService.uploadBook(files[0]);
        await loadLibrary();
        openBook(metadata.id);
      } catch (e) {
        console.error("Error saving book", e);
        alert("Could not save book to library: " + e.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLoadSample = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf');
      const blob = await response.blob();
      const sampleFile = new File([blob], "Sample Document.pdf", { type: "application/pdf" });
      
      const metadata = await apiService.uploadBook(sampleFile);
      await loadLibrary();
      openBook(metadata.id);
    } catch (e) {
      console.error("Error loading sample", e);
      alert("Failed to download sample PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const openBook = async (id: string) => {
    setIsLoading(true);
    try {
      const book = libraryBooks.find(b => b.id === id);
      if (book && book.filePath) {
        // El archivo ahora se carga directamente desde la URL del servidor
        const response = await fetch(book.filePath);
        const bookBlob = await response.blob();

        setFile(bookBlob);
        setCurrentBookId(id);
        setView('reader');
      } else {
        console.error("Book not found or missing file path.");
      }
    } catch (e) {
      console.error("Error opening book", e);
      alert("Failed to load book from server.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this book from your library?")) {
      // La eliminación del libro y su archivo asociado debe implementarse en el backend.
      // Por ahora, solo eliminamos la referencia local y recargamos.
      // TODO: Implementar endpoint de eliminación en el backend.
      // await apiService.deleteBook(id); 
      loadLibrary();
      if (currentBookId === id) {
        setFile(null);
        setCurrentBookId(null);
        setView('library');
      }
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const changePage = (offset: number) => {
    setDirection(offset > 0 ? 'forward' : 'backward');
    setPageNumber(prevPageNumber => {
      const newPage = Math.min(Math.max(1, prevPageNumber + offset), numPages || 1);
      
      // Guardar el progreso en el servidor
      if (currentBookId) {
        apiService.updateReadingProgress(currentBookId, newPage).catch(console.error);
      }

      return newPage;
    });
  };

  // Improved zone click handler
  const handleZoneClick = (e: React.MouseEvent) => {
    // Check if we are selecting text
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    // Get width of container
    const width = e.currentTarget.getBoundingClientRect().width;
    const clickX = e.nativeEvent.offsetX;

    // Zones: Left 25% | Center 50% | Right 25%
    if (clickX < width * 0.25) {
      changePage(-1);
    } else if (clickX > width * 0.75) {
      changePage(1);
    } else {
      setHeaderVisible(!headerVisible);
    }
  };

  const handleHighlight = (text: string) => {
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      text,
      page: pageNumber,
      createdAt: Date.now(),
      color: 'yellow'
    };
    setHighlights(prev => [...prev, newHighlight]);
    setSidebarOpen(true);
    setHeaderVisible(true);
  };

  const handleAskAI = (text: string) => {
    // Ahora el contexto se envía al backend con el bookId, no con el texto completo
    // El backend se encarga de obtener el texto completo del libro.
    setAiQuery(`I'm reading page ${pageNumber}. Context: "${text}". Can you explain this?`);
    setSidebarOpen(true);
    setHeaderVisible(true);
  };

  const handleDeleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
  };

  // Theme configuration
  const getThemeColors = () => {
    switch(theme) {
      case 'dark': return 'bg-gray-900 text-gray-200';
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-gray-100 text-gray-900';
    }
  };

  const getHeaderColors = () => {
    switch(theme) {
      case 'dark': return 'bg-gray-800 border-gray-700 text-gray-200';
      case 'sepia': return 'bg-[#e8dec0] border-[#d4c5a3] text-[#5b4636]';
      default: return 'bg-white border-gray-200 text-gray-800';
    }
  };

  const getHeaderButtonStyle = () => {
    switch(theme) {
      case 'dark': return 'hover:bg-gray-700 text-gray-300';
      case 'sepia': return 'hover:bg-[#d4c5a3] text-[#5b4636]';
      default: return 'hover:bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 theme-${theme} ${getThemeColors()}`}>
      
      {/* Header Toolbar - Auto hideable */}
      <header 
        className={`fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 sm:px-6 shadow-sm z-30 transition-transform duration-300 border-b ${getHeaderColors()} ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex items-center gap-3">
          {view === 'reader' && (
            <button 
              onClick={() => setView('library')}
              className={`p-2 -ml-2 rounded-lg transition-colors ${getHeaderButtonStyle()}`}
              title="Back to Library"
            >
              <Library size={20} />
            </button>
          )}
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <Book size={20} />
          </div>
          <h1 className="font-merriweather font-bold text-lg hidden sm:block truncate max-w-[200px]">
            {view === 'library' ? 'Library' : libraryBooks.find(b => b.id === currentBookId)?.title || 'LiteReader'}
          </h1>
        </div>

        {view === 'reader' && file && (
          <div className={`flex items-center gap-2 sm:gap-4 rounded-full px-2 py-1 border transition-colors ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : (theme === 'sepia' ? 'bg-[#dacfb0] border-[#c0b490]' : 'bg-gray-50 border-gray-200')}`}>
            <span className="text-sm font-medium min-w-[4rem] text-center">
              Page {pageNumber} of {numPages || '--'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
           {/* Upload Button */}
           <label className={`p-2 rounded-lg cursor-pointer transition-colors ${getHeaderButtonStyle()}`} title="Upload PDF">
            <Upload size={20} />
            <input 
              type="file" 
              onChange={(e) => {
                onFileUpload(e);
                e.target.value = '';
              }} 
              accept="application/pdf" 
              className="hidden" 
            />
          </label>

          {/* Theme Toggles */}
          <div className={`hidden sm:flex items-center rounded-lg p-1 mr-2 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : (theme === 'sepia' ? 'bg-[#dacfb0] border-[#c0b490]' : 'bg-gray-100 border-gray-200')}`}>
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded ${theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`} title="Light Mode">
              <Sun size={16} />
            </button>
            <button onClick={() => setTheme('sepia')} className={`p-1.5 rounded ${theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm text-[#5b4636]' : 'text-gray-400 hover:text-gray-600'}`} title="Sepia Mode">
              <Coffee size={16} />
            </button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded ${theme === 'dark' ? 'bg-gray-600 shadow-sm text-white' : 'text-gray-400 hover:text-gray-600'}`} title="Dark Mode">
              <Moon size={16} />
            </button>
          </div>

          {view === 'reader' && (
            <div className="hidden md:flex items-center gap-1 mr-2">
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className={`p-2 rounded-lg transition-colors ${getHeaderButtonStyle()}`}
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-xs opacity-70 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button 
                onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                className={`p-2 rounded-lg transition-colors ${getHeaderButtonStyle()}`}
              >
                <ZoomIn size={18} />
              </button>
            </div>
          )}

          {view === 'reader' && (
            <button 
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                setHeaderVisible(true);
              }}
              className={`p-2 rounded-lg transition-colors border ${sidebarOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : `border-transparent ${getHeaderButtonStyle()}`}`}
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main 
        className={`flex-1 relative overflow-hidden flex justify-center transition-all duration-300 ${headerVisible ? 'pt-16' : 'pt-0'}`}
        ref={viewerRef}
      >
        {view === 'library' && (
          <div className="w-full max-w-5xl p-6 sm:p-10 overflow-y-auto h-full">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
               <h2 className="text-2xl font-bold">Your Library</h2>
               <div className="flex gap-3">
                 <button 
                  onClick={handleLoadSample}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors shadow-sm font-medium text-sm"
                 >
                   <DownloadCloud size={18} />
                   <span>Load Sample</span>
                 </button>
                 <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm">
                   <Plus size={18} />
                   <span>Add Book</span>
                   <input 
                      type="file" 
                      onChange={(e) => {
                        onFileUpload(e);
                        e.target.value = '';
                      }} 
                      accept="application/pdf" 
                      className="hidden" 
                   />
                 </label>
               </div>
             </div>

             {isLoading ? (
               <div className="flex justify-center p-20">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
               </div>
             ) : libraryBooks.length === 0 ? (
               <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
                 <Book size={48} className="mx-auto mb-4 opacity-20" />
                 <h3 className="text-lg font-medium mb-2">Library is empty</h3>
                 <p className="opacity-60 mb-6">Upload PDF files to start reading.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {libraryBooks.map(book => (
                   <div 
                    key={book.id} 
                    onClick={() => openBook(book.id)}
                    className={`group relative rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : (theme === 'sepia' ? 'bg-[#e8dec0] border-[#d4c5a3]' : 'bg-white border-gray-200 hover:border-blue-200')}`}
                   >
                     <div className={`aspect-[3/4] rounded-lg mb-4 flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                       <FileText size={48} className="opacity-20" />
                     </div>
                     <h3 className="font-semibold truncate mb-1" title={book.title}>{book.title}</h3>
                     <p className="text-xs opacity-60 mb-3">{(book.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(book.lastRead).toLocaleDateString()}</p>
                     
                     <button 
                       onClick={(e) => deleteBook(e, book.id)}
                       className="absolute top-2 right-2 p-2 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                       title="Delete Book"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {view === 'reader' && file && (
          <div className="h-full w-full relative flex justify-center overflow-auto bg-transparent scroll-smooth">
            
            {/* Navigation Buttons (Visible & Clean) */}
            <button
               onClick={(e) => { e.stopPropagation(); changePage(-1); }}
               disabled={pageNumber <= 1}
               className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-md backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-0 ${theme === 'dark' ? 'bg-gray-800/80 text-white hover:bg-gray-700' : 'bg-white/80 text-gray-800 hover:bg-white'}`}
               title="Previous Page"
            >
              <ChevronLeft size={32} />
            </button>
            
            <button
               onClick={(e) => { e.stopPropagation(); changePage(1); }}
               disabled={pageNumber >= (numPages || 1)}
               className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full shadow-md backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-0 ${theme === 'dark' ? 'bg-gray-800/80 text-white hover:bg-gray-700' : 'bg-white/80 text-gray-800 hover:bg-white'}`}
               title="Next Page"
            >
              <ChevronRight size={32} />
            </button>

            {/* Click Zones (Invisible Layer) */}
            <div 
              className="absolute inset-0 z-10 cursor-default"
              onClick={handleZoneClick}
            />

            <div className="py-4 px-2 sm:px-4 z-0 min-h-full flex flex-col items-center">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="h-96 w-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                }
                error={
                  <div className="p-10 text-red-500 flex flex-col items-center">
                    <AlertCircle size={32} className="mb-2"/>
                    <p>Failed to load PDF.</p>
                  </div>
                }
                className="flex flex-col items-center"
              >
                 {/* Visible Page with Directional Animation */}
                <div 
                  key={`page-${pageNumber}`} 
                  className={`shadow-lg transition-transform ${direction === 'forward' ? 'animate-slide-right' : 'animate-slide-left'} ${theme === 'dark' ? 'shadow-black/50' : 'shadow-xl'}`}
                >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={scale} 
                    renderAnnotationLayer={true}
                    renderTextLayer={true}
                    className="bg-white" 
                    width={Math.min(window.innerWidth - 20, 800)}
                    loading=""
                  />
                </div>

                {/* Footer Navigation for fluid reading */}
                <div className="w-full max-w-3xl mt-8 mb-12 flex flex-col items-center gap-2 z-20 relative">
                  {numPages && pageNumber < numPages ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); changePage(1); }}
                      className={`flex flex-col items-center gap-2 px-8 py-4 rounded-xl w-full transition-all group ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                      title="Next Page"
                    >
                      <span className="text-sm font-medium uppercase tracking-widest opacity-60 group-hover:opacity-100">Continue to Page {pageNumber + 1}</span>
                      <ChevronDown className="animate-bounce opacity-50 group-hover:opacity-100" />
                    </button>
                  ) : (
                    <div className="text-gray-400 text-sm mt-4 italic">End of Document</div>
                  )}
                </div>

                {/* Pre-load NEXT page for instant rendering */}
                {numPages && pageNumber < numPages && (
                   <div className="hidden" aria-hidden="true">
                      <Page 
                        pageNumber={pageNumber + 1} 
                        scale={scale}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        width={Math.min(window.innerWidth - 20, 800)}
                      />
                   </div>
                )}
              </Document>
            </div>
          </div>
        )}
        
        {view === 'reader' && file && (
          <>
            <FloatingMenu 
              onHighlight={handleHighlight}
              onAskAI={handleAskAI}
            />
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          highlights={highlights}
          onDeleteHighlight={handleDeleteHighlight}
          onNavigateToPage={(page) => {
            setPageNumber(page);
            setSidebarOpen(false);
          }}
          initialQuery={aiQuery}
          onClearInitialQuery={() => setAiQuery(undefined)}
          currentBook={libraryBooks.find(b => b.id === currentBookId) || null}
        />
          </>
        )}
      </main>
    </div>
  );
}

export default App;