import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function titleCase(str: string): string {
  if (!str) return '';
  
  // Handle special cases like "Mc" and "Mac" prefixes
  const specialPrefixes = ['mc', 'mac', 'o\''];
  const words = str.toLowerCase().split(/\s+/);
  
  return words.map(word => {
    // Skip empty strings from multiple spaces
    if (!word) return '';
    
    // Handle special prefixes
    for (const prefix of specialPrefixes) {
      if (word.startsWith(prefix) && word.length > prefix.length) {
        return prefix + word.charAt(prefix.length).toUpperCase() + word.slice(prefix.length + 1);
      }
    }
    
    // Handle hyphenated names
    if (word.includes('-')) {
      return word.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      ).join('-');
    }
    
    // Default title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}
