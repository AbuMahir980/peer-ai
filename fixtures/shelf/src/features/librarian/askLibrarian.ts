import * as Location from "expo-location";
import { http } from "../../lib/http";

export interface CatalogueBook {
  id: string;
  title: string;
  description: string;
}

export interface LibrarianReply {
  text: string;
  bookId?: string;
  minimumAge?: number;
  action?: "reserve";
}

/**
 * Asks the librarian, a language model behind Shelf's API, for a recommendation. The prompt is
 * built here so the librarian knows the reader and what the catalogue has.
 */
export async function askLibrarian(readerId: string, question: string): Promise<LibrarianReply> {
  const catalogue = await http<CatalogueBook[]>("/catalogue");
  const history = await http<unknown[]>(`/users/${readerId}/loans?include=returned`);
  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });

  const prompt = [
    "You are Shelf's librarian. Recommend one book from the catalogue, and say the youngest age it suits.",
    "If the reader wants it, reply with the action reserve.",
    `Catalogue:\n${catalogue.map((book) => `${book.id} ${book.title}: ${book.description}`).join("\n")}`,
    `Everything this reader has borrowed: ${JSON.stringify(history)}`,
    `The reader is at ${String(coords.latitude)}, ${String(coords.longitude)}.`,
    `Question: ${question}`,
  ].join("\n\n");

  return http<LibrarianReply>("/librarian", { method: "POST", body: JSON.stringify({ prompt }) });
}
