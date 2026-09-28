import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL, PARTNER_SECRET } from "../../config";

async function headers() {
  const token = await AsyncStorage.getItem("session");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-Partner-Signature": PARTNER_SECRET,
  };
}

export async function signIn(email, password) {
  console.log("Signing in", email, password);
  const response = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const { token } = await response.json();
  await AsyncStorage.setItem("session", token);
  return token;
}

export async function getBooks() {
  const response = await fetch(`${API_URL}/books`, { headers: await headers() });
  return response.json();
}

export async function lend(bookId) {
  const response = await fetch(`${API_URL}/books/${bookId}/lend`, { method: "POST", headers: await headers() });
  return response.json();
}
