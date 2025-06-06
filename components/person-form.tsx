'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Person, Coordinates } from '@/lib/db';
import { cn } from '@/lib/utils';
import { geocodeAddress } from '@/lib/geocode';
import { getTerritories } from '@/lib/territory';
import { isGeolocationEnabled } from '@/lib/settings';

// Helper function to calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

interface PersonFormProps {
  initialData?: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> & { id?: number };
  onSuccess: () => void;
  onCancel: () => void;
}

export function PersonForm({ initialData, onSuccess, onCancel }: PersonFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    location: initialData?.location || null,
  });
  
  const [noteContent, setNoteContent] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [geolocationEnabled, setGeolocationEnabled] = useState(false);
  const [geolocationDenied, setGeolocationDenied] = useState(false);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout>();
  const addressInputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const [touched, setTouched] = useState({
    name: false,
    address: false,
    phone: false,
    email: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [territories, setTerritories] = useState<Array<{city: string, state: string}>>([]);
  
  // Get user's current location if available
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser');
      setIsGeolocationAvailable(false);
      setGeolocationDenied(false);
      return;
    }
    
    console.log('Requesting geolocation...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('Got geolocation:', { latitude, longitude, accuracy });
        
        setUserLocation({
          latitude,
          longitude
        });
        setIsGeolocationAvailable(true);
        setGeolocationDenied(false);
      },
      (error) => {
        console.warn('Unable to retrieve user location:', error);
        
        if (error.code === error.PERMISSION_DENIED) {
          console.log('Geolocation permission denied by user');
          setGeolocationDenied(true);
          setIsGeolocationAvailable(false);
        } else {
          console.warn('Geolocation error (non-permission):', error);
          setIsGeolocationAvailable(false);
          setGeolocationDenied(false);
          
          // Only auto-retry for non-permission errors
          if (error.code !== error.PERMISSION_DENIED) {
            // Auto-retry after a delay
            setTimeout(getCurrentLocation, 5000);
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000, // Reduced from 10000 to fail faster
        maximumAge: 0 // Force fresh position
      }
    );
  }, []);
  
  // Load settings and territories on mount
  useEffect(() => {
    const loadSettingsAndTerritories = async () => {
      try {
        // Load geolocation setting
        const geolocationEnabled = isGeolocationEnabled();
        setGeolocationEnabled(geolocationEnabled);
        
        // Load territories
        const savedTerritories = await getTerritories();
        setTerritories(savedTerritories);
        
        // Initialize geolocation if enabled
        if (geolocationEnabled && navigator.geolocation) {
          setIsGeolocationAvailable(true);
          getCurrentLocation();
        } else {
          setIsGeolocationAvailable(false);
        }
      } catch (error) {
        console.error('Error loading settings or territories:', error);
      }
    };
    
    loadSettingsAndTerritories();
    
    // Set up periodic refresh of location if geolocation is enabled
    let locationRefreshInterval: NodeJS.Timeout;
    if (geolocationEnabled && isGeolocationAvailable) {
      locationRefreshInterval = setInterval(() => {
        getCurrentLocation();
      }, 5 * 60 * 1000); // Refresh every 5 minutes
    }
    
    return () => {
      if (locationRefreshInterval) {
        clearInterval(locationRefreshInterval);
      }
    };

    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch address suggestions with detailed debug logging
  const fetchAddressSuggestions = async (query: string) => {
    console.log('fetchAddressSuggestions called with query:', query);
    
    if (!query || query.trim().length < 3) {
      console.log('Query is too short (min 3 characters)');
      setAddressSuggestions([]);
      return;
    }

    try {
      console.log('Starting geocoding for query:', query);
      setIsGeocoding(true);
      
      // Ensure we have territories loaded
      const loadedTerritories = await getTerritories();
      console.log('Current territories:', loadedTerritories);
      console.log('User location:', userLocation);
      
      // Start with the user's search query
      let searchQuery = query.trim();
      
      // If we have a territory, we'll use it for context
      const territory = loadedTerritories[0];
      if (territory) {
        console.log('Using territory for context:', territory);
        // Include city and state in the query if they're not already present
        const queryLower = searchQuery.toLowerCase();
        const cityLower = territory.city.toLowerCase();
        const stateLower = territory.state.toLowerCase();
        
        if (!queryLower.includes(cityLower) || !queryLower.includes(stateLower)) {
          searchQuery = `${searchQuery}, ${territory.city}, ${territory.state}`;
        }
      }
      
      // Build the base URL with common parameters
      const params = new URLSearchParams({
        q: searchQuery,  // Main search query
        format: 'json',
        addressdetails: '1',
        limit: '15',  // Increased limit to get more results for filtering
        namedetails: '1',
        countrycodes: 'us',
        'accept-language': 'en-US,en;q=0.9',  // Language for results
        dedupe: '1',
        polygon_threshold: '0.1',
        extratags: '1'  // Additional metadata for better results
      });
      
      console.log('Query parameters:', Object.fromEntries(params));

      // Add proximity bias if we have user location
      if (userLocation) {
        console.log('Adding proximity bias with user location:', userLocation);
        // Create a larger viewbox around the user's location (0.2 degree ~= 22km)
        const viewbox = [
          (userLocation.longitude - 0.2).toFixed(6),
          (userLocation.latitude - 0.2).toFixed(6),
          (userLocation.longitude + 0.2).toFixed(6),
          (userLocation.latitude + 0.2).toFixed(6)
        ].join(',');
        
        // Create a new params object with viewbox and bounded parameters
        const viewboxParams = new URLSearchParams(params);
        viewboxParams.set('viewbox', viewbox);
        viewboxParams.set('bounded', '1');
        
        // Add proximity bias
        viewboxParams.set('lat', userLocation.latitude.toString());
        viewboxParams.set('lon', userLocation.longitude.toString());
        
        // Replace the original params
        params.forEach((_, key) => params.delete(key));
        viewboxParams.forEach((value, key) => params.set(key, value));
        
      } else if (loadedTerritories.length > 0) {
        // If no user location but we have territories, use the first territory's bounds or city/state
        const territory = loadedTerritories[0];
        
        if (territory.bounds) {
          // If we have bounds, use them for the viewbox
          const [minLon, minLat, maxLon, maxLat] = territory.bounds;
          const viewbox = [minLon, maxLat, maxLon, minLat].join(',');
          
          // Create a new params object with viewbox and bounded parameters
          const viewboxParams = new URLSearchParams(params);
          viewboxParams.set('viewbox', viewbox);
          viewboxParams.set('bounded', '1');
          
          // Calculate center for proximity
          const centerLon = (minLon + maxLon) / 2;
          const centerLat = (minLat + maxLat) / 2;
          viewboxParams.set('lat', centerLat.toString());
          viewboxParams.set('lon', centerLon.toString());
          
          // Replace the original params
          params.forEach((_, key) => params.delete(key));
          viewboxParams.forEach((value, key) => params.set(key, value));
          
          console.log('Using territory bounds for geocoding viewbox:', viewbox);
        } else if (territory.city && territory.state) {
          // For city/state, include them in the query string instead of separate params
          const territoryQuery = `${searchQuery}, ${territory.city}, ${territory.state}`;
          params.set('q', territoryQuery);
          console.log('Using territory location in query:', territoryQuery);
        }
      }
      
      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
      console.log('Sending geocoding request to:', url);
      
      const startTime = performance.now();
      const response = await fetch(url, {
        headers: { 
          'User-Agent': 'MinistryTracker/1.0 (your-email@example.com)',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      
      const responseTime = performance.now() - startTime;
      console.log(`Received response in ${responseTime.toFixed(0)}ms`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Geocoding API error:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      let results = await response.json();
      console.log(`Received ${results.length} results from geocoding API`);
      
      if (loadedTerritories.length > 0) {
        console.log('Filtering results by saved territories:', loadedTerritories);
        const filteredResults = results.filter((result: any) => {
          const address = result.address || {};
          
          // Log the full result for debugging
          console.log('Processing result:', {
            display_name: result.display_name,
            address: address,
            lat: result.lat,
            lon: result.lon
          });
          
          // Get and normalize city/state from the result
          const resultCity = (address.city || address.town || address.village || address.hamlet || address.suburb || '').trim().toLowerCase();
          const resultState = (address.state || '').trim().toUpperCase();
          const resultCounty = (address.county || '').toLowerCase();
          const resultPostcode = (address.postcode || '');
          
          // Also check the display name as a fallback
          const displayName = (result.display_name || '').toLowerCase();
          
          const isInTerritory = loadedTerritories.some(t => {
            const territoryCity = t.city.trim().toLowerCase();
            const territoryState = t.state.trim().toUpperCase();
            
            // Normalize city names (remove common suffixes and special characters)
            const normalizeCityName = (city: string) => {
              if (!city) return '';
              return city
                .toLowerCase()
                .replace(/\b(avenue|ave|street|st|road|rd|drive|dr|lane|ln|boulevard|blvd|way|wy|court|ct|parkway|pkwy|highway|hwy)\b/gi, '')
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            };
            
            // Normalize state names (handle abbreviations and full names)
            const normalizeStateName = (state: string) => {
              if (!state) return '';
              // Convert state abbreviations to full names for consistency
              const stateMap: {[key: string]: string} = {
                'tx': 'texas',
                'ca': 'california',
                'ny': 'new york',
                // Add more states as needed
              };
              const normalized = state.toLowerCase().trim();
              return stateMap[normalized] || normalized;
            };
            
            const normalizedResultCity = normalizeCityName(resultCity);
            const normalizedTerritoryCity = normalizeCityName(territoryCity);
            const normalizedResultState = normalizeStateName(resultState);
            const normalizedTerritoryState = normalizeStateName(territoryState);
            
            // Check if the territory city/state appears in the display name
            const displayNameMatch = 
              displayName.includes(normalizedTerritoryCity) && 
              displayName.includes(normalizedTerritoryState);
              
            // Check if the result's city/state matches the territory
            const cityStateMatch = 
              (normalizedResultCity === normalizedTerritoryCity || 
               normalizedResultCity.includes(normalizedTerritoryCity) || 
               normalizedTerritoryCity.includes(normalizedResultCity)) &&
              (normalizedResultState === normalizedTerritoryState);
              
            // Check if the result's county matches the territory city
            const countyMatch = 
              resultCounty && normalizedTerritoryCity && 
              (normalizeCityName(resultCounty).includes(normalizedTerritoryCity) || 
               normalizedTerritoryCity.includes(normalizeCityName(resultCounty)));
               
            // Check if the result's postcode is in the same area (first 3 digits)
            const postcodeMatch = 
              resultPostcode && normalizedTerritoryCity &&
              resultPostcode.slice(0, 3) === normalizedTerritoryCity.slice(0, 3);
            
            // Check if the address is in the same general area as the territory
            const isInSameArea = 
              (resultCity && territoryCity && 
               (resultCity.includes(territoryCity) || territoryCity.includes(resultCity))) ||
              (resultCounty && territoryCity && 
               (resultCounty.includes(territoryCity) || territoryCity.includes(resultCounty)));
            
            const isMatch = displayNameMatch || cityStateMatch || countyMatch || postcodeMatch || isInSameArea;
            
            const matchDebug = {
              resultAddress: result.display_name,
              territory: `${territoryCity}, ${territoryState}`,
              normalized: {
                resultCity: normalizedResultCity,
                territoryCity: normalizedTerritoryCity,
                resultState: normalizedResultState,
                territoryState: normalizedTerritoryState
              },
              matches: {
                displayNameMatch,
                cityStateMatch,
                countyMatch,
                postcodeMatch,
                isInSameArea
              },
              isMatch
            };
            
            console.log('Territory matching result:', matchDebug);
            
            if (isMatch) {
              console.log('✅ Address matches territory:', matchDebug);
            } else {
              console.log('❌ Address does not match territory:', matchDebug);
            }
            
            return isMatch;
          });
          
          if (!isInTerritory) {
            console.log('Filtered out address (not in territories):', {
              displayName: result.display_name,
              resultCity,
              resultState,
              resultCounty,
              resultPostcode,
              territories: loadedTerritories.map(t => `${t.city}, ${t.state}`),
              addressDetails: address
            });
          } else {
            console.log('✅ Address matches territory and will be shown:', {
              displayName: result.display_name,
              resultCity,
              resultState,
              territory: loadedTerritories.find(t => 
                t.city.toLowerCase() === resultCity && 
                t.state.toUpperCase() === resultState
              ) || 'No exact territory match',
              addressDetails: address
            });
          }
          
          return isInTerritory;
        });
        
        console.log(`Filtered from ${results.length} to ${filteredResults.length} results`);
        results = filteredResults;
      }
      
      // Sort by distance if we have user location and results
      if (userLocation && results.length > 1) {
        console.log('Sorting results by distance');
        results = results.map((result: any) => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(result.lat),
            parseFloat(result.lon)
          );
          return { ...result, distance };
        }).sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
      }
      
      console.log('Setting address suggestions:', results);
      setAddressSuggestions(results);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error in fetchAddressSuggestions:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error('Unknown error in fetchAddressSuggestions:', error);
      }
      setAddressSuggestions([]);
    } finally {
      console.log('Finished geocoding, setting isGeocoding to false');
      setIsGeocoding(false);
    }
  };

  // Debounce the fetch function with a longer delay for better performance
  const debouncedFetchSuggestions = useCallback(
    debounce((query: string) => {
      fetchAddressSuggestions(query);
    }, 800), // Increased debounce time to 800ms
    []
  );

  // Update debounced function when dependencies change
  useEffect(() => {
    const debounced = debounce((query: string) => {
      fetchAddressSuggestions(query);
    }, 800); // Increased debounce time to 800ms
    
    return () => {
      debounced.cancel();
    };
  }, [fetchAddressSuggestions]);

  // Debug effect to log when debounced function changes
  useEffect(() => {
    console.log('debouncedFetchSuggestions function updated');
    return () => {
      console.log('Cleaning up previous debounced function');
      debouncedFetchSuggestions.cancel();
    };
  }, [debouncedFetchSuggestions]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [debouncedFetchSuggestions]);

  // Update debounced function when user location changes
  useEffect(() => {
    return () => {
      debouncedFetchSuggestions.cancel();
    };
  }, [userLocation]);

  // Form validation
  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.address.trim()) return 'Address is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      return 'Please enter a valid phone number';
    }
    if (noteContent.trim() && noteContent.trim().length < 5) {
      return 'Note must be at least 5 characters long';
    }
    return '';
  };
  
  const formError = validateForm();
  const isFormValid = !formError;
  const showError = (field: keyof typeof touched) => touched[field] && !formData[field].trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched to show validation errors
    setTouched({
      name: true,
      address: true,
      phone: true,
      email: true,
    });

    if (!isFormValid) {
      setError(formError);
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const { addPerson, updatePerson, addNote } = await import('@/lib/db');
      let finalData = { ...formData };
      
      // Only attempt to geocode if there's an address
      if (formData.address.trim()) {
        try {
          setIsGeocoding(true);
          const result = await geocodeAddress(formData.address, {
            proximity: userLocation || undefined,
            limit: 5
          });
          if (result) {
            // Update the form data with the formatted address and coordinates
            setFormData(prev => ({
              ...prev,
              address: result.formattedAddress,
              location: result.coordinates
            }));
            finalData.address = result.formattedAddress;
            finalData.location = result.coordinates;
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          // Continue with the original data if geocoding fails
        } finally {
          setIsGeocoding(false);
        }
      }
      
      let personId: number;
      if (initialData?.id) {
        await updatePerson(initialData.id, finalData);
        personId = initialData.id;
      } else {
        personId = await addPerson(finalData);
      }
      
      // Add note if content exists
      if (noteContent.trim()) {
        await addNote({
          personId,
          content: noteContent.trim(),
        });
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving person:', error);
      setError('Failed to save person. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove the auto-geocoding effect since we'll do it on form submit

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      address: value,
    }));
    
    if (value.length > 2) {
      debouncedFetchSuggestions(value);
      setShowSuggestions(true);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
    
    if (error) {
      setError('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Handle address input change
    if (name === 'address') {
      const trimmedValue = value.trim();
      
      if (trimmedValue.length >= 3) {
        console.log('Address input changed, length >= 3, fetching suggestions');
        
        // Don't search if the input ends with a space (user is still typing)
        // But do search if it's a street number followed by space (e.g., "123 ")
        if (!value.endsWith(' ') || /^\d+\s*$/.test(value)) {
          debouncedFetchSuggestions(trimmedValue);
        } else {
          console.log('Skipping search - user is likely still typing');
        }
      } else if (trimmedValue.length === 0) {
        console.log('Address input cleared, clearing suggestions');
        setAddressSuggestions([]);
      } else {
        console.log('Address input too short, not fetching yet');
      }
    }
    
    if (error) {
      setError('');
    }
  };
  
  const handleSelectSuggestion = (suggestion: { display_name: string; lat: string; lon: string }) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion.display_name,
      location: {
        latitude: parseFloat(suggestion.lat),
        longitude: parseFloat(suggestion.lon)
      }
    }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({
      ...prev,
      [field]: true,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="name" className="block text-sm font-medium">
            Name <span className="text-destructive">*</span>
          </label>
          {showError('name') && (
            <span className="text-xs text-destructive">Name is required</span>
          )}
        </div>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={() => handleBlur('name')}
          className={cn({
            'border-destructive': showError('name'),
          })}
          placeholder="John Doe"
          autoFocus
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="address" className="block text-sm font-medium">
            Address <span className="text-destructive">*</span>
          </label>
          {showError('address') && (
            <span className="text-xs text-destructive">Address is required</span>
          )}
        </div>
        <div className="relative">
          <div className="text-xs text-muted-foreground mb-1">
            {territories.length > 0 ? (
              <div>Showing addresses in saved territories only</div>
            ) : (
              <div>No territories saved. Add territories in Settings to filter addresses.</div>
            )}
            
            {!geolocationEnabled ? (
              <div className="mt-1 text-yellow-600 dark:text-yellow-400 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Location services are disabled. Enable in Settings for better address suggestions.</span>
              </div>
            ) : geolocationDenied ? (
              <div className="mt-1 text-amber-600 dark:text-amber-400">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Location permission denied. To enable, update your browser settings or click to <button 
                    type="button" 
                    onClick={getCurrentLocation}
                    className="underline hover:text-amber-700 dark:hover:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 rounded"
                  >
                    retry
                  </button>.
                  </span>
                </div>
              </div>
            ) : !isGeolocationAvailable ? (
              <div className="mt-1 text-amber-600 dark:text-amber-400 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Getting your location...</span>
              </div>
            ) : userLocation ? (
              <div className="mt-1 text-green-600 dark:text-green-400 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Using your location for better address suggestions</span>
              </div>
            ) : null}
          </div>
          <Textarea
            ref={addressInputRef}
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            onFocus={() => {
              console.log('Address input focused, current value:', formData.address);
              // Always show suggestions when focusing the input
              setShowSuggestions(true);
              
              // If we have a valid address, refresh suggestions
              if (formData.address.length >= 3) {
                console.log('Refreshing suggestions on focus');
                // Cancel any pending debounced calls to avoid race conditions
                debouncedFetchSuggestions.cancel();
                // Trigger new debounced fetch
                debouncedFetchSuggestions(formData.address);
              }
            }}
            onBlur={() => {
              console.log('Address input blurred');
              handleBlur('address');
              // Small delay to allow click events on suggestions to fire
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            className={cn({
              'border-destructive': showError('address'),
              'rounded-b-none': showSuggestions && addressSuggestions.length > 0
            })}
            placeholder="123 Main St, City, State ZIP"
            rows={3}
          />
          {isGeocoding && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          {showSuggestions && addressSuggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute z-50 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-t-0 border-gray-300 dark:border-gray-600 rounded-b-md shadow-lg max-h-60 overflow-auto"
              style={{
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                {addressSuggestions.length} suggestions found
              </div>
              {addressSuggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.lat},${suggestion.lon}`}
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  onMouseDown={(e) => {
                    console.log('Suggestion selected:', suggestion);
                    e.preventDefault(); // Prevent input blur
                    handleSelectSuggestion(suggestion);
                  }}
                >
                  <div className="font-medium">
                    {suggestion.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {suggestion.display_name.split(',').slice(1).join(',').trim()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            onBlur={() => handleBlur('phone')}
            placeholder="(555) 123-4567"
            className={cn({
              'border-destructive': touched.phone && formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone),
            })}
          />
          {touched.phone && formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone) && (
            <p className="mt-1 text-xs text-destructive">Please enter a valid phone number</p>
          )}
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            placeholder="john@example.com"
            className={cn({
              'border-destructive': touched.email && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
            })}
          />
          {touched.email && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
            <p className="mt-1 text-xs text-destructive">Please enter a valid email address</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="note" className="block text-sm font-medium">
            Add a Note (Optional)
          </label>
          <Textarea
            id="note"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note about this person..."
            rows={3}
            className="w-full"
          />
          {touched && noteContent && noteContent.trim().length < 5 && (
            <p className="text-xs text-destructive">Note must be at least 5 characters long</p>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || !isFormValid || (noteContent.trim() !== '' && noteContent.trim().length < 5)}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {initialData?.id ? 'Saving...' : 'Adding...'}
              </>
            ) : initialData?.id ? 'Save Changes' : 'Add Person'}
          </Button>
        </div>
      </div>
    </form>
  );
}
