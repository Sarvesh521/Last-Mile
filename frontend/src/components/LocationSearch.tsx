import { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { mockDestinations } from '../lib/mockData';

interface LocationSearchProps {
  value: string;
  onChange: (location: string, coordinates?: { latitude: number; longitude: number }) => void;
  label?: string;
  placeholder?: string;
}

export function LocationSearch({ value, onChange, label, placeholder }: LocationSearchProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    
    // Mock Google Maps Places API search
    // In production, use: const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${searchQuery}&key=YOUR_API_KEY`)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock suggestions based on search query
    const mockSuggestions = mockDestinations
      .filter(dest => dest.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((dest, index) => ({
        id: index,
        name: dest,
        address: dest,
        latitude: 28.5 + Math.random() * 0.2,
        longitude: 77.1 + Math.random() * 0.3,
      }));

    setSuggestions(mockSuggestions);
    setShowSuggestions(true);
    setIsSearching(false);
  };

  const handleSelectLocation = (location: any) => {
    setQuery(location.name);
    onChange(location.name, { latitude: location.latitude, longitude: location.longitude });
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2 relative">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder || 'Search for a location...'}
          className="pl-10 pr-10"
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <>
          {/* Backdrop to close suggestions */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowSuggestions(false)}
          />
          
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelectLocation(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm">{suggestion.name}</p>
                    <p className="text-xs text-gray-500">{suggestion.address}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* No results message */}
      {showSuggestions && !isSearching && query.length >= 2 && suggestions.length === 0 && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowSuggestions(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">No locations found</p>
          </div>
        </>
      )}

      <p className="text-xs text-gray-500">
        🗺️ In production, this will use Google Maps Places API for real location search
      </p>
    </div>
  );
}
