import Dexie, { type Table } from "dexie";

export interface Plant {
  id?: number;
  name: string;
  room: string;
  species?: string;
  wateredOn?: string;
  photo?: Blob;
  position: number;
}

export interface JournalEntry {
  id?: number;
  plantId: number;
  at: string;
  note: string;
}

class SproutDb extends Dexie {
  plants!: Table<Plant, number>;
  journal!: Table<JournalEntry, number>;

  constructor() {
    super("sprout");
    this.version(1).stores({ plants: "++id, name", entries: "++id, plantId, at" });
    // 2.0 sorts plants by room, and renames entries to journal.
    this.version(2).stores({ plants: "++id, name, room, position", entries: null, journal: "++id, plantId, at" });
  }
}

export const db = new SproutDb();
