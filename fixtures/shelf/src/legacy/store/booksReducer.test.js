import { booksReducer } from "./booksReducer";

test("adds a book to the list", () => {
  const state = booksReducer({ books: [], loading: false }, { type: "books/added", book: { id: 1 } });
  expect(state.books).toEqual([{ id: 1 }]);
});
