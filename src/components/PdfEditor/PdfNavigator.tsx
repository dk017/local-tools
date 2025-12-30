import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PdfNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function PdfNavigator({
  currentPage,
  totalPages,
  onPageChange,
  onPrevPage,
  onNextPage
}: PdfNavigatorProps) {
  const [inputValue, setInputValue] = useState(currentPage.toString());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const page = parseInt(inputValue);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page);
      } else {
        setInputValue(currentPage.toString());
      }
    }
  };

  const handleInputBlur = () => {
    setInputValue(currentPage.toString());
  };

  // Update input value when currentPage changes
  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={onPrevPage}
        disabled={currentPage <= 1}
        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Previous Page"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Page</span>
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          className="w-16 px-2 py-1 bg-black/20 border border-white/10 rounded text-center text-sm focus:border-primary outline-none"
          min={1}
          max={totalPages}
        />
        <span className="text-sm text-muted-foreground">
          of {totalPages}
        </span>
      </div>

      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Next Page"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
