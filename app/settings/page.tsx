'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../../components/theme-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Switch } from '../../components/ui/switch';
import { addTerritory, getTerritories, deleteTerritory, territoryExists } from '@/lib/territory';
import { isGeolocationEnabled, setGeolocationEnabled, getMapProvider, setMapProvider } from '@/lib/settings';
type MapProvider = 'google' | 'apple' | 'waze';
import { toast } from 'sonner';
import { getAllPeople, addPerson, deletePerson, Person } from '@/lib/db';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
  const [mapProvider, setMapProviderState] = useState<MapProvider>('google');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTerritories();
    // Load settings
    setLocationEnabled(isGeolocationEnabled());
    setMapProviderState(getMapProvider());
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
          <CardTitle>Contact Management</CardTitle>
          <CardDescription>Import or export your contacts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const people = await getAllPeople();
                  const data = JSON.stringify(people, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ministry-contacts-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Contacts exported successfully');
                } catch (error) {
                  console.error('Error exporting contacts:', error);
                  toast.error('Failed to export contacts');
                }
              }}
            >
              Export Contacts
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  
                  try {
                    const text = await file.text();
                    const contacts = JSON.parse(text) as Person[];
                    
                    if (!Array.isArray(contacts)) {
                      throw new Error('Invalid contacts format');
                    }
                    
                    // Add each contact
                    for (const contact of contacts) {
                      // Remove id to avoid conflicts
                      const { id, ...contactData } = contact;
                      await addPerson(contactData);
                    }
                    
                    toast.success(`Successfully imported ${contacts.length} contacts`);
                  } catch (error) {
                    console.error('Error importing contacts:', error);
                    toast.error('Failed to import contacts. Please check the file format.');
                  }
                };
                input.click();
              }}
            >
              Import Contacts
            </Button>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete All Contacts'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete all your contacts.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
                      try {
                        setIsDeleting(true);
                        // First get count of contacts
                        const people = await getAllPeople();
                        const count = people.length;
                        
                        if (count === 0) {
                          toast.info('No contacts to delete');
                          return;
                        }
                        
                        // Delete all contacts
                        await Promise.all(people.map(person => 
                          person.id !== undefined && deletePerson(person.id)
                        ));
                        
                        toast.success(`Successfully deleted ${count} contact${count !== 1 ? 's' : ''}`);
                      } catch (error) {
                        console.error('Error deleting contacts:', error);
                        toast.error('Failed to delete contacts');
                      } finally {
                        setIsDeleting(false);
                        setIsDeleteDialogOpen(false);
                      }
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : `Delete ${isDeleting ? '' : 'All Contacts'}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Map Settings</CardTitle>
          <CardDescription>Configure your preferred map provider and location settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Location Services</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the app to access your location for territory mapping
                </p>
              </div>
              <Switch
                id="location-enabled"
                checked={locationEnabled}
                onCheckedChange={(checked: boolean) => {
                  setGeolocationEnabled(checked);
                  setLocationEnabled(checked);
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Default Map Provider</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred map service for directions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => {
                  setMapProvider('google');
                  setMapProviderState('google');
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  mapProvider === 'google'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 hover:bg-muted/50'
                }`}
              >
                <div className="h-10 w-10 mb-2 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-8 w-8">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <span className="font-medium">Google Maps</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMapProvider('apple');
                  setMapProviderState('apple');
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  mapProvider === 'apple'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 hover:bg-muted/50'
                }`}
              >
                <div className="h-10 w-10 mb-2 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-8 w-8">
                    <path
                      fill="#000000"
                      d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
                    />
                  </svg>
                </div>
                <span className="font-medium">Apple Maps</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMapProvider('waze');
                  setMapProviderState('waze');
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  mapProvider === 'waze'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 hover:bg-muted/50'
                }`}
              >
                <div className="h-10 w-10 mb-2 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-8 w-8">
                    <path
                      fill="#33CCFF"
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                    />
                    <path
                      fill="#33CCFF"
                      d="M12 4c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"
                    />
                    <path
                      fill="#33CCFF"
                      d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                    />
                    <path
                      fill="#33CCFF"
                      d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
                    />
                    <path
                      fill="#33CCFF"
                      d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                    />
                  </svg>
                </div>
                <span className="font-medium">Waze</span>
              </button>
            </div>
          </div>
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
