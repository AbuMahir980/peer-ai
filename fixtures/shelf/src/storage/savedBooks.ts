import AsyncStorage from "@react-native-async-storage/async-storage";

// 3.4.0 stores saved books with the date each was saved, under a new key.
const KEY = "savedBooks:v2";

export interface SavedBook {
  id: string;
  savedAt: string;
}

export async function loadSaved(): Promise<SavedBook[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === null ? [] : (JSON.parse(raw) as SavedBook[]);
}

export async function save(books: SavedBook[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(books));
}
