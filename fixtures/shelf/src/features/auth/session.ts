import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "session";

export async function saveSession(token: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, token);
}

export function getSession(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
