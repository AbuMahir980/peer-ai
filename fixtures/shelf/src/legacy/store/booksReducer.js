const initialState = { books: [], loading: false };

export function booksReducer(state = initialState, action) {
  switch (action.type) {
    case "books/loading":
      return { ...state, loading: true };
    case "books/loaded":
      return { ...state, loading: false, books: action.books };
    case "books/added":
      state.books.push(action.book);
      return state;
    default:
      return state;
  }
}
