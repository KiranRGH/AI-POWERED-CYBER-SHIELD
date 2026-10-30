import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from './Button';

interface FilterBarProps {
  onFilterClick: () => void;
  activeFiltersCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onFilterClick, activeFiltersCount = 0 }) => {
  return (
    <Button variant="outline" onClick={onFilterClick} className="flex items-center space-x-2">
      <Filter size={16} />
      <span>Filters</span>
      {activeFiltersCount > 0 && (
        <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">
          {activeFiltersCount}
        </span>
      )}
    </Button>
  );
};
