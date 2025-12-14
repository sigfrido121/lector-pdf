import React, { useState, useRef, useEffect } from 'react';
import { Highlight, ChatMessage } from '../types';
import { X, MessageCircle, BookOpen, Send, Loader2, Trash2, Search, ExternalLink, Shield, ShieldAlert } from 'lucide-react';
import { askGemini, checkBackendHealth } from '../services/gemini';
import { BookMetadata } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onDeleteHighlight: (id: string) => void;
  onNavigateToPage: (page: number) => void;
  initialQuery?: string;
  onClearInitialQuery: () => void;
  currentBook: BookMetadata | null; // Nuevo prop para el libro actual
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  highlights,
  onDeleteHighlight,
  onNavigateToPage,
  initialQuery,
  onClearInitialQuery,
  currentBook
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'ai'>('notes');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Hi! I can help you understand this document. Select text to ask specific questions, or just ask me anything here.'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const bookId = currentBook ? currentBook.id : null;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then(setIsBackendConnected);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setActiveTab('ai');
      handleSendMessage(initialQuery);
      onClearInitialQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  useEffect(() => {
    if (activeTab === 'ai') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Call Gemini (Ahora solo usa el backend)
    const { text: responseText, sources, sourceMode } = await askGemini(text, bookId);
    
    // El modo siempre será 'cloud' si la llamada fue exitosa
    setIsBackendConnected(true);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: responseText,
      sources
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex space-x-4">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center gap-2"><BookOpen size={16}/> Notes</span>
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="flex items-center gap-2"><MessageCircle size={16}/> AI Assistant</span>
          </button>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
          <X size={20} />
        </button>
      </div>

      {/* Connection Status Indicator (Visible in AI tab) */}
      {activeTab === 'ai' && (
        <div className={`px-4 py-1 text-xs font-medium flex items-center gap-1.5 ${isBackendConnected ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
          {isBackendConnected ? (
            <>
              <Shield size={12} />
              <span>Secure Cloud Mode</span>
            </>
          ) : (
            <>
              <ShieldAlert size={12} />
              <span>Backend Disconnected</span>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {activeTab === 'notes' ? (
          <div className="space-y-4">
            {highlights.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                <p className="mb-2">No highlights yet.</p>
                <p className="text-sm">Select text in the PDF to add highlights.</p>
              </div>
            ) : (
              highlights.map((h) => (
                <div key={h.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 group transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <span 
                      onClick={() => onNavigateToPage(h.page)}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200"
                    >
                      Page {h.page}
                    </span>
                    <button 
                      onClick={() => onDeleteHighlight(h.id)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <blockquote className="text-gray-800 text-sm border-l-4 border-yellow-400 pl-3 italic mb-2">
                    "{h.text}"
                  </blockquote>
                  <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
             {messages.map((msg) => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                 >
                   <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                   {msg.sources && msg.sources.length > 0 && (
                     <div className="mt-3 pt-3 border-t border-gray-100">
                       <p className="text-xs font-semibold mb-1 opacity-70 flex items-center gap-1">
                         <Search size={10} /> Sources found via Google:
                       </p>
                       <ul className="space-y-1">
                         {msg.sources.map((src, idx) => (
                           <li key={idx}>
                             <a 
                              href={src} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1 truncate max-w-full"
                             >
                               <ExternalLink size={10} /> {new URL(src).hostname}
                             </a>
                           </li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>
             ))}
             {isTyping && (
               <div className="flex justify-start">
                 <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                   <Loader2 size={16} className="animate-spin text-blue-500" />
                 </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input Area (Only for AI tab) */}
      {activeTab === 'ai' && (
        <div className="p-4 bg-white border-t border-gray-200">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(chatInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about the document..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim() || isTyping}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Sidebar;