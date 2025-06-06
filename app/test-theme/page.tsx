'use client';

import { Button } from '../../components/ui/button';
import { useTheme } from '../../components/theme-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Separator } from '../../components/ui/separator';

export default function TestThemePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold mb-6">Theme Test Page</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Theme Selector</CardTitle>
            <CardDescription>
              Current theme: <span className="font-medium">{theme}</span> • Resolved theme:{' '}
              <span className="font-medium">{resolvedTheme}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-4 mb-4">
                <Button 
                  onClick={() => setTheme('light')} 
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="flex-1 md:flex-none"
                >
                  Light Mode
                </Button>
                <Button 
                  onClick={() => setTheme('dark')} 
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="flex-1 md:flex-none"
                >
                  Dark Mode
                </Button>
                <Button 
                  onClick={() => setTheme('system')} 
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="flex-1 md:flex-none"
                >
                  System Preference
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4">
                <h3 className="font-semibold text-lg">Theme Preview</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 rounded-lg border bg-card text-card-foreground">
                    <h4 className="font-medium mb-2">Card</h4>
                    <p className="text-sm text-muted-foreground">
                      This is a card with some sample content to demonstrate the current theme.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted text-muted-foreground">
                    <h4 className="font-medium mb-2">Muted</h4>
                    <p className="text-sm">
                      This is a muted section with different background and text colors.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                    <h4 className="font-medium text-destructive mb-2">Destructive</h4>
                    <p className="text-sm text-destructive/80">
                      This shows destructive/error state colors.
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4">
                <h3 className="font-semibold text-lg">Form Elements</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="input">Input Field</Label>
                      <input
                        id="input"
                        type="text"
                        placeholder="Type something..."
                        className="w-full p-2 border rounded mt-1 bg-background"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="select">Select</Label>
                      <select
                        id="select"
                        className="w-full p-2 border rounded mt-1 bg-background"
                      >
                        <option value="">Select an option</option>
                        <option value="1">Option 1</option>
                        <option value="2">Option 2</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Radio Group</Label>
                      <RadioGroup defaultValue="option-1" className="mt-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="option-1" id="option-1" />
                          <Label htmlFor="option-1">Option 1</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="option-2" id="option-2" />
                          <Label htmlFor="option-2">Option 2</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
                        Primary Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Theme Information</CardTitle>
            <CardDescription>
              Details about the current theme configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Current Theme State</h4>
                <div className="grid gap-2 text-sm bg-muted p-4 rounded">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Theme:</span>
                    <span className="font-medium">{theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved Theme:</span>
                    <span className="font-medium">{resolvedTheme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">System Preference:</span>
                    <span className="font-medium">
                      {typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">How It Works</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>Theme preference is saved in localStorage</li>
                  <li>System theme follows your OS preference when 'System' is selected</li>
                  <li>Theme changes are applied without page reload</li>
                  <li>All UI components automatically adapt to the current theme</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
