'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Person, getPersonWithNotes, deletePerson } from '@/lib/db';
import { PersonForm } from '@/components/person-form';
import { NoteForm } from '@/components/note-form';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn, titleCase } from '@/lib/utils';
import { getMapProvider } from '@/lib/settings';
import { FiArrowLeft, FiEdit2, FiTrash2, FiPhone, FiMail, FiMapPin, FiCalendar, FiClock, FiUser, FiX } from 'react-icons/fi';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function PersonDetail() {
  const params = useParams();
  const router = useRouter();
  const [person, setPerson] = useState<Person & { notes?: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadPerson = async () => {
    try {
      const personData = await getPersonWithNotes(Number(params.id));
      if (!personData) {
        router.push('/');
        return;
      }
      setPerson(personData);
    } catch (error) {
      console.error('Error loading person:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadPerson();
    }
  }, [params.id]);

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      await deletePerson(Number(params.id));
      router.push('/');
    } catch (error) {
      console.error('Error deleting person:', error);
      toast.error('Failed to delete person. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleUpdateSuccess = () => {
    setIsEditing(false);
    loadPerson();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <FiUser className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Person not found</h2>
        <p className="text-muted-foreground mb-6">The person you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => router.push('/')}>
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 -ml-2"
        size="sm"
      >
        <FiArrowLeft className="mr-2 h-4 w-4" />
        Back to list
      </Button>

      {isEditing ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Edit Person</CardTitle>
            <CardDescription>Update the person's information</CardDescription>
          </CardHeader>
          <CardContent>
            <PersonForm
              initialData={person}
              onSuccess={() => {
                setIsEditing(false);
                loadPerson();
              }}
              onCancel={() => setIsEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 h-2 w-full"></div>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary rounded-full p-3">
                    <FiUser className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{titleCase(person.name || '')}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <FiCalendar className="h-3.5 w-3.5 mr-1.5" />
                      <span>
                        Added{' '}
                        {person.createdAt
                          ? format(
                              typeof person.createdAt === 'string'
                                ? new Date(person.createdAt)
                                : person.createdAt,
                              'MMMM d, yyyy'
                            )
                          : 'recently'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={isDeleting}
                      className="w-full sm:w-auto"
                    >
                      <FiTrash2 className="mr-2 h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete Person'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Contact</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete {person.name}? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowDeleteDialog(false)}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        <FiTrash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Deleting...' : 'Delete Contact'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(person.address || person.phone || person.email) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {person.address && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FiMapPin className="h-4 w-4 text-primary" />
                      <span>Address</span>
                    </div>
                    <div className="pl-6 space-y-2">
                      <p className="whitespace-pre-line">{person.address}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs justify-start"
                        onClick={() => {
                          const encodedAddress = encodeURIComponent(person.address || '');
                          const mapProvider = getMapProvider();
                          let url = '';
                          
                          switch (mapProvider) {
                            case 'apple':
                              url = `https://maps.apple.com/?q=${encodedAddress}`;
                              break;
                            case 'waze':
                              url = `https://www.waze.com/ul?q=${encodedAddress}&navigate=yes`;
                              break;
                            case 'google':
                            default:
                              url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                              break;
                          }
                          
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <FiMapPin className="h-3 w-3 mr-1" />
                        View on {getMapProvider() === 'apple' ? 'Apple Maps' : getMapProvider().charAt(0).toUpperCase() + getMapProvider().slice(1)}
                      </Button>
                    </div>
                  </div>
                )}
                {person.phone && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FiPhone className="h-4 w-4 text-primary" />
                      <span>Phone</span>
                    </div>
                    <a 
                      href={`tel:${person.phone.replace(/[^0-9+]/g, '')}`}
                      className="hover:underline flex items-center pl-6"
                    >
                      {person.phone}
                    </a>
                  </div>
                )}
                {person.email && (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FiMail className="h-4 w-4 text-primary" />
                      <span>Email</span>
                    </div>
                    <a 
                      href={`mailto:${person.email}`} 
                      className="hover:underline flex items-center pl-6"
                    >
                      {person.email}
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <span className="bg-primary/10 text-primary rounded-full p-2 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </span>
          Notes
        </h2>
        <NoteForm personId={Number(params.id)} onNoteAdded={loadPerson} />
      </div>

      <div className="space-y-4">
        {person.notes && person.notes.length > 0 ? (
          person.notes.map((note) => (
            <Card key={note.id} className="overflow-hidden group">
              <div className="bg-muted/50 h-1 w-full"></div>
              <CardHeader className="pb-2 pt-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="bg-primary/10 text-primary rounded-full p-1.5 mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-text">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <path d="M8 9h8"></path>
                        <path d="M8 13h6"></path>
                      </svg>
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium">
                        {note.createdAt
                          ? format(
                              typeof note.createdAt === 'string'
                                ? new Date(note.createdAt)
                                : note.createdAt,
                              'MMMM d, yyyy'
                            )
                          : 'Note'}
                      </CardTitle>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <FiClock className="h-3 w-3 mr-1" />
                        <span>
                          {note.createdAt
                            ? format(
                                typeof note.createdAt === 'string'
                                  ? new Date(note.createdAt)
                                  : note.createdAt,
                                'h:mm a'
                              )
                            : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-16">
                <p className="whitespace-pre-line text-muted-foreground">{note.content}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" x2="8" y1="13" y2="13"></line>
                  <line x1="16" x2="8" y1="17" y2="17"></line>
                  <line x1="10" x2="8" y1="9" y2="9"></line>
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-medium">No notes yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding your first note.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
