import Dexie, { type Table } from 'dexie';

export interface Note {
  id?: number;
  personId: number;
  content: string;
  createdAt: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Person {
  id?: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  notes?: Note[];
  location?: Coordinates | null;
  createdAt: Date;
  updatedAt: Date;
}

class MinistryDB extends Dexie {
  people!: Table<Person, number>;
  notes!: Table<Note, number>;

  constructor() {
    super('ministry-tracker');
    
    this.version(1).stores({
      people: '++id, name, createdAt',
      notes: '++id, personId, createdAt'
    });
  }
}

const db = new MinistryDB();

// Helper functions
export async function addPerson(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  return db.people.add({
    ...person,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePerson(id: number, updates: Partial<Omit<Person, 'id' | 'createdAt'>>): Promise<number> {
  return db.people.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deletePerson(id: number): Promise<void> {
  // Delete all notes for this person first
  await db.notes.where('personId').equals(id).delete();
  // Then delete the person
  return db.people.delete(id);
}

export async function addNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<number> {
  return db.notes.add({
    ...note,
    createdAt: new Date(),
  });
}

export async function getPersonWithNotes(personId: number): Promise<(Person & { notes: Note[] }) | null> {
  const person = await db.people.get(personId);
  if (!person) return null;
  
  const notes = await db.notes
    .where('personId')
    .equals(personId)
    .sortBy('createdAt');
    
  return {
    ...person,
    notes,
  };
}

export async function getAllPeople(): Promise<(Person & { notes: Note[] })[]> {
  const people = await db.people.orderBy('name').toArray();
  const peopleWithNotes = await Promise.all(
    people.map(async (person) => {
      const notes = await db.notes
        .where('personId')
        .equals(person.id!)
        .sortBy('createdAt');
      return { ...person, notes };
    })
  );
  return peopleWithNotes;
}

export type { Person as PersonType, Note as NoteType };

export default db;
