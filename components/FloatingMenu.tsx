import React, { useEffect, useState, useRef } from 'react';
import { Highlighter, MessageSquarePlus, Copy } from 'lucide-react';

interface FloatingMenuProps {
  onHighlight: (text: string) => void;
  onAskAI: (text: string) => void;
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({ onHighlight, onAskAI }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      
      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setPosition(null);
        setSelectedText('');
        return;
      }

      const text = selection.toString();
      setSelectedText(text);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Calculate relative position to viewport
      setPosition({
        top: rect.top - 50, // Position above the text
        left: rect.left + (rect.width / 2) - 100, // Center horizontally
      });
    };

    // Use mouseup for better reliability than selectionchange on some browsers
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  if (!position) return null;

  const handleAction = (action: 'highlight' | 'ask' | 'copy') => {
    if (action === 'highlight') {
      onHighlight(selectedText);
    } else if (action === 'ask') {
      onAskAI(selectedText);
    } else if (action === 'copy') {
      navigator.clipboard.writeText(selectedText);
    }
    // Clear selection after action
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-gray-900 text-white shadow-xl rounded-lg flex items-center p-1 space-x-1 animate-in fade-in zoom-in duration-200"
      style={{ top: Math.max(10, position.top), left: Math.max(10, position.left) }}
    >
      <button 
        onClick={() => handleAction('highlight')}
        className="flex items-center space-x-1 px-3 py-2 hover:bg-gray-700 rounded transition-colors text-sm font-medium"
      >
        <Highlighter size={16} className="text-yellow-400" />
        <span>Save</span>
      </button>
      <div className="w-px h-4 bg-gray-700 mx-1"></div>
      <button 
        onClick={() => handleAction('ask')}
        className="flex items-center space-x-1 px-3 py-2 hover:bg-gray-700 rounded transition-colors text-sm font-medium"
      >
        <MessageSquarePlus size={16} className="text-blue-400" />
        <span>Ask AI</span>
      </button>
      <div className="w-px h-4 bg-gray-700 mx-1"></div>
      <button 
        onClick={() => handleAction('copy')}
        className="p-2 hover:bg-gray-700 rounded transition-colors"
        title="Copy"
      >
        <Copy size={16} />
      </button>
    </div>
  );
};

export default FloatingMenu;
