'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { addNote } from '@/lib/db';

interface NoteFormProps {
  personId: number;
  onNoteAdded: () => void;
}

export function NoteForm({ personId, onNoteAdded }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  
  const validateForm = () => {
    if (!content.trim()) return 'Note content is required';
    if (content.trim().length < 5) return 'Note must be at least 5 characters long';
    return '';
  };
  
  const formError = validateForm();
  const isFormValid = !formError;
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (error) setError('');
  };
  
  const handleBlur = () => {
    setTouched(true);
    if (content.trim()) {
      setError(validateForm());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    
    if (!isFormValid) {
      setError(formError);
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await addNote({
        personId,
        content: content.trim(),
      });
      
      setContent('');
      setTouched(false);
      onNoteAdded();
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Failed to add note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t pt-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label htmlFor="note" className="block text-sm font-medium">
            Add a Note
          </label>
          {touched && error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>
        <Textarea
          id="note"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Add a note about this person..."
          rows={3}
          className={cn('w-full', {
            'border-destructive': touched && error,
          })}
        />
        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            size="sm" 
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : 'Add Note'}
          </Button>
        </div>
      </div>
    </form>
  );
}
