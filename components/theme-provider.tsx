'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'light',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ministry-tracker-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  
  // Initialize theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(storageKey) as Theme | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, [storageKey]);
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get the root HTML element
    const root = window.document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');
    
    // Determine the theme to apply
    let themeToApply = theme;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
      themeToApply = systemTheme;
      setResolvedTheme(systemTheme);
    } else {
      setResolvedTheme(theme === 'dark' ? 'dark' : 'light');
    }
    
    // Apply the theme class to the root element
    root.classList.add(themeToApply);
    
    // Also set the data-theme attribute for additional CSS targeting
    root.setAttribute('data-theme', themeToApply);
    
    // Ensure the theme is saved to localStorage if not system
    if (theme !== 'system') {
      localStorage.setItem(storageKey, theme);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [theme, storageKey]);

  // Handle system theme changes and initial theme application
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (themeToApply: Theme) => {
      const root = document.documentElement;
      
      // Remove any existing theme classes
      root.classList.remove('light', 'dark');
      
      // Determine the actual theme to apply
      let actualTheme = themeToApply;
      if (themeToApply === 'system') {
        actualTheme = mediaQuery.matches ? 'dark' : 'light';
      }
      
      // Apply the theme class to the root element
      root.classList.add(actualTheme);
      
      // Set data-theme attribute for additional CSS targeting
      root.setAttribute('data-theme', actualTheme);
      
      // Update the resolved theme state
      setResolvedTheme(actualTheme === 'dark' ? 'dark' : 'light');
    };
    
    // Apply the current theme
    applyTheme(theme);
    
    // Handle system theme changes
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    // Add event listener for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    resolvedTheme,
  }), [theme, resolvedTheme, storageKey]);

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
