
import React, { useState, useRef, useEffect } from 'react';
import { Scan } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, placeholder = "Scan barcode...", disabled = false }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = inputValue.trim();
      if (barcode) {
        onScan(barcode);
        setInputValue('');
      }
    }
  };

  return (
    <div 
      className={`relative group transition-all ${disabled ? 'opacity-50' : 'opacity-100'}`}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Scan size={18} className="text-zinc-400 group-focus-within:text-amber-600 transition-colors" />
      </div>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className="block w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono shadow-sm"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="absolute inset-y-0 right-3 flex items-center">
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Ready</span>
      </div>
    </div>
  );
};

export default BarcodeScanner;
