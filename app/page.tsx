/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Person, Note } from '@/lib/db'; 
import { PersonForm } from '@/components/person-form';
import { 
  FiSearch, 
  FiPlus, 
  FiPhone, 
  FiMail, 
  FiUser, 
  FiMapPin, 
  FiNavigation,
  FiX,
  FiAlertTriangle 
} from 'react-icons/fi';
import { titleCase } from '@/lib/utils';

interface PersonWithNotes extends Omit<Person, 'notes'> {
  notes?: Note[];
  distance?: number; 
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

export default function Home() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonWithNotes[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<PersonWithNotes[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortByLocation, setSortByLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [showWithin20Miles, setShowWithin20Miles] = useState(false);

  const loadPeople = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await import('@/lib/db');
      const allPeople = await db.getAllPeople();
      const safePeople = Array.isArray(allPeople) 
        ? allPeople.map(p => ({...p, notes: Array.isArray(p.notes) ? p.notes : []})) 
        : [];
      setPeople(safePeople);
    } catch (error) {
      console.error('Error loading people:', error);
      setPeople([]);
      setLocationError('Failed to load contacts. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    setIsRequestingLocation(true);
    setLocationError(null);
    
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setSortByLocation(false);
      setIsRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position?.coords) {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setSortByLocation(true); 
        } else {
          setLocationError('Could not retrieve location coordinates.');
          setSortByLocation(false);
        }
        setIsRequestingLocation(false);
      },
      (error: GeolocationPositionError) => {
        console.error(`Error getting location: Code ${error.code}, Message: ${error.message}`, error);
        let message = 'Error getting location: ';
        switch(error.code) {
          case error.PERMISSION_DENIED: message += 'Permission denied.'; break;
          case error.POSITION_UNAVAILABLE: message += 'Location unavailable.'; break;
          case error.TIMEOUT: message += 'Request timed out.'; break;
          default: message += error.message || 'An unknown error occurred.'; break;
        }
        setLocationError(message);
        setSortByLocation(false);
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  useEffect(() => {
    let currentPeople = [...people];

    if (userLocation) {
      currentPeople = currentPeople.map(person => ({
        ...person,
        distance: person.location?.latitude && person.location?.longitude
          ? calculateDistance(userLocation.latitude, userLocation.longitude, person.location.latitude, person.location.longitude)
          : Infinity 
      }));
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentPeople = currentPeople.filter(person =>
        person.name?.toLowerCase().includes(lowerSearchTerm) ||
        person.phone?.toLowerCase().includes(lowerSearchTerm) ||
        person.email?.toLowerCase().includes(lowerSearchTerm) ||
        person.address?.toLowerCase().includes(lowerSearchTerm) ||
        (person.notes && person.notes.some(note => note.content.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (sortByLocation && userLocation && showWithin20Miles) {
      const twentyMilesInKm = 32.1869;
      currentPeople = currentPeople.filter(person => person.distance !== undefined && person.distance <= twentyMilesInKm);
    }
    
    if (sortByLocation && userLocation) {
      currentPeople.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    } else {
      currentPeople.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    setFilteredPeople(currentPeople);
  }, [people, searchTerm, sortByLocation, userLocation, showWithin20Miles]);

  const handleAddSuccess = () => {
    setShowAddForm(false);
    loadPeople(); 
  };

  const toggleLocationSort = () => {
    if (!sortByLocation) {
      if (!userLocation) {
        requestLocation(); 
      } else {
        setSortByLocation(true); 
      }
    } else {
      setSortByLocation(false); 
      setShowWithin20Miles(false); 
    }
  };

  const toggle20MileFilter = () => {
    setShowWithin20Miles(prev => !prev);
  };

  const handleViewDetails = (id: string | number | undefined) => {
    if (id === undefined) {
        console.error("Attempted to view details for person with undefined ID.");
        return;
    }
    router.push(`/person/${id}`);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Ministry Tracker</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 p-4 bg-card rounded-lg shadow flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full sm:w-auto">
            <FiSearch className="absolute inset-y-0 left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search contacts..."
              className="pl-10 w-full h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
            <Button
              variant={sortByLocation ? 'secondary' : 'outline'}
              onClick={toggleLocationSort}
              disabled={isRequestingLocation}
              className="flex items-center h-10"
            >
              {isRequestingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-foreground mr-2"></div>
                  Locating...
                </>
              ) : (
                <>
                  <FiMapPin className="mr-2 h-4 w-4" />
                  {sortByLocation ? 'Sorted by Distance' : 'Sort by Distance'}
                </>
              )}
            </Button>
            
            {sortByLocation && userLocation && (
              <Button
                variant={showWithin20Miles ? 'warning' : 'outline'}
                onClick={toggle20MileFilter}
                className="flex items-center h-10"
              >
                <FiNavigation className="mr-2 h-4 w-4" />
                {showWithin20Miles ? 'Radius: < 20 mi' : 'Filter < 20 mi'}
              </Button>
            )}
            
            <Button 
              variant="default"
              onClick={() => setShowAddForm(true)} 
              className="ml-auto flex items-center h-10"
            >
              <FiPlus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        </div>

        {locationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
            <FiAlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            <p>{locationError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {filteredPeople.length} {filteredPeople.length === 1 ? 'contact' : 'contacts'} found
              {searchTerm && ` for "${searchTerm}"`}
              {sortByLocation && userLocation && ' • Sorted by distance'}
              {showWithin20Miles && userLocation && ' • Within 20 miles'}
            </div>

            {filteredPeople.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <FiUser className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <h3 className="mt-3 text-xl font-semibold text-foreground">No Contacts Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchTerm
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by adding your first contact.'}
                </p>
                {!searchTerm && (
                    <div className="mt-6">
                        <Button 
                          variant="default" 
                          onClick={() => setShowAddForm(true)}
                        >
                        <FiPlus className="mr-2 h-4 w-4" />
                        Add New Contact
                        </Button>
                    </div>
                )}
              </div>
            )}
{filteredPeople.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPeople.map((person) => {
                  const distance = userLocation && person.location?.latitude && person.location?.longitude
                    ? calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        person.location.latitude,
                        person.location.longitude
                      ).toFixed(1)
                    : null;

                  return (
                    <Card key={person.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{titleCase(person.name || '')}</CardTitle>
                            <CardDescription className="space-y-1">
                              {person.address && (
                                <div className="whitespace-pre-line">
                                  {person.address.split(',').map((part, index, parts) => (
                                    <span key={index}>
                                      {part.trim()}
                                      {index === 0 && parts.length > 1 ? '\n' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </CardDescription>
                          </div>
                          {distance !== null && (
                            <div className="flex items-center text-sm text-gray-500">
                              <FiMapPin className="mr-1 h-4 w-4" />
                              {distance} km
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {person.phone && (
                          <div className="flex items-center">
                            <FiPhone className="mr-2 h-4 w-4 text-gray-500" />
                            <a href={`tel:${person.phone}`} className="hover:underline">
                              {person.phone}
                            </a>
                          </div>
                        )}
                        {person.email && (
                          <div className="flex items-center">
                            <FiMail className="mr-2 h-4 w-4 text-gray-500" />
                            <a href={`mailto:${person.email}`} className="hover:underline">
                              {person.email}
                            </a>
                          </div>
                        )}
                        {person.notes && person.notes.length > 0 && person.notes[0]?.content && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {person.notes[0].content}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        {person.location?.latitude && person.location?.longitude && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (person.location?.latitude && person.location?.longitude) {
                                // Encode the address for URL if it exists, otherwise use coordinates
                                const address = person.address 
                                  ? encodeURIComponent(person.address)
                                  : `${person.location.latitude},${person.location.longitude}`;
                                const url = `https://www.google.com/maps?q=${address}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            title={person.address ? `View ${person.name}'s location on Google Maps` : 'View on map'}
                          >
                            <FiMapPin className="h-3.5 w-3.5" />
                            <span>Map</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 hover:bg-gray-50 text-gray-700"
                          onClick={() => router.push(`/person/${person.id}`)}
                        >
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}

          </>
        )}
      </main>

      {/* Add Person Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Contact</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <span className="sr-only">Close</span>
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              <PersonForm onSuccess={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
