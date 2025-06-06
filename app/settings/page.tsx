'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../../components/theme-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { addTerritory, getTerritories, deleteTerritory, territoryExists } from '@/lib/territory';
import { isGeolocationEnabled, setGeolocationEnabled } from '@/lib/settings';
import { toast } from 'sonner';

interface Territory {
  id?: number;
  city: string;
  state: string;
  createdAt?: Date;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [newTerritory, setNewTerritory] = useState({ city: '', state: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastAddedTerritory, setLastAddedTerritory] = useState<Territory | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);

  useEffect(() => {
    loadTerritories();
    // Load geolocation setting
    setLocationEnabled(isGeolocationEnabled());
  }, []);

  const loadTerritories = async () => {
    try {
      setIsLoading(true);
      const data = await getTerritories();
      // Sort territories by city name
      const sortedData = [...data].sort((a, b) => 
        a.city.localeCompare(b.city) || a.state.localeCompare(b.state)
      );
      setTerritories(sortedData);
    } catch (error) {
      console.error('Error loading territories:', error);
      toast.error('Failed to load territories');
    } finally {
      setIsLoading(false);
    }
  };

  const toTitleCase = (str: string): string => {
    return str.trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAddTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { city, state } = newTerritory;
    
    if (!city?.trim() || !state?.trim()) {
      toast.error('City and state are required');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Normalize the input
      const normalizedCity = toTitleCase(city.trim());
      const normalizedState = state.trim().toUpperCase();
      
      // Validate input
      if (!normalizedCity || !normalizedState) {
        throw new Error('City and state are required');
      }
      
      // Check if territory already exists (case-insensitive)
      const exists = await territoryExists(normalizedCity, normalizedState);
      if (exists) {
        throw new Error('This city and state combination already exists');
      }

      // Add the new territory with retry logic
      let addedTerritory;
      let lastError: Error | null = null;
      
      // Try up to 3 times
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Exponential backoff
          }
          
          addedTerritory = await addTerritory({ 
            city: normalizedCity, 
            state: normalizedState 
          });
          lastError = null;
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`Attempt ${attempt + 1} failed:`, lastError);
          
          // If it's a validation error, don't retry
          if (lastError.message.includes('already exists') || 
              lastError.message.includes('required')) {
            break;
          }
        }
      }
      
      // If we still have an error after all retries, rethrow it
      if (lastError) {
        throw lastError;
      }
      
      // Ensure addedTerritory is defined
      if (!addedTerritory) {
        throw new Error('Failed to add territory after multiple attempts');
      }
      
      // Store the last added territory for highlighting
      setLastAddedTerritory(addedTerritory);
      
      // Reset the form
      setNewTerritory({ city: '', state: '' });
      
      // Reload the territories list
      await loadTerritories();
      
      // Show success message with the added territory
      toast.success(`Added territory: ${normalizedCity}, ${normalizedState}`, {
        duration: 3000,
      });
      
      // Reset the highlight after 3 seconds
      setTimeout(() => {
        setLastAddedTerritory(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error in handleAddTerritory:', error);
      toast.error('Failed to add territory. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTerritory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this territory?')) return;
    
    try {
      await deleteTerritory(id);
      await loadTerritories();
      toast.success('Territory deleted successfully');
    } catch (error) {
      console.error('Error deleting territory:', error);
      toast.error('Failed to delete territory');
    }
  };

  const handleLocationToggle = (enabled: boolean) => {
    setLocationEnabled(enabled);
    setGeolocationEnabled(enabled);
    toast.success(`Location services ${enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manage Territories</CardTitle>
          <CardDescription>
            Add and manage the cities and states in your territory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTerritory} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city name"
                  value={newTerritory.city}
                  onChange={(e) => setNewTerritory(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="Enter state code (e.g., CA)"
                  value={newTerritory.state}
                  onChange={(e) => setNewTerritory(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  className="uppercase"
                  required
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                      Add Territory
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {isLoading ? (
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-gray-50"></div>
            </div>
          ) : territories.length > 0 ? (
            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-medium">Your Territories</h3>
              <div className="divide-y rounded-md border">
                {territories.map((territory) => (
                  <div 
                    key={territory.id} 
                    className={`flex items-center justify-between p-3 transition-colors ${
                      lastAddedTerritory?.id === territory.id ? 'bg-green-50 dark:bg-green-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="font-medium">{territory.city}</span>
                      <span className="text-muted-foreground">, {territory.state}</span>
                      {lastAddedTerritory?.id === territory.id && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Added
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => territory.id && handleDeleteTerritory(territory.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No territories added yet. Add your first territory above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Location Services</CardTitle>
          <CardDescription>Control how the app uses your location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="location-enabled">Enable Location Services</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the app to use your location for better address suggestions
                </p>
              </div>
              <Button
                variant={locationEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLocationToggle(!locationEnabled)}
                className="w-20"
              >
                {locationEnabled ? 'On' : 'Off'}
              </Button>
            </div>
            {!locationEnabled && (
              <div className="text-sm text-yellow-600 dark:text-yellow-400 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                Location services are disabled. Some features may be limited.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks on your device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred theme
              </p>
            </div>
            <RadioGroup
              value={theme}
              onValueChange={(value: string) => setTheme(value as 'light' | 'dark' | 'system')}
              className="grid gap-4 pt-2 md:grid-cols-3"
            >
              <div>
                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-3 h-6 w-6"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </svg>
                  Light
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-3 h-6 w-6"
                  >
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                  Dark
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-3 h-6 w-6"
                  >
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                  </svg>
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
