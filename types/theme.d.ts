// This file contains type declarations for the theme system
declare module 'next-themes' {
  export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: 'system' | 'light' | 'dark';
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    enableColorScheme?: boolean;
    storageKey?: string;
    themes?: string[];
    attribute?: string | 'class';
  }

  export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
  export function useTheme(): {
    theme: string | undefined;
    setTheme: (theme: string) => void;
    systemTheme: 'light' | 'dark' | undefined;
    themes: string[];
  };
}

declare module 'next-themes/dist/types' {
  export * from 'next-themes';
}
