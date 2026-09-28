import React from "react";
import { ScrollView, Text, View } from "react-native";
import { connect } from "react-redux";
import { getBooks } from "../api/client";
import { POLL_EVERY_MS } from "../../config";

class BookListScreen extends React.Component {
  componentDidMount() {
    this.load();
    this.poll = setInterval(() => this.load(), POLL_EVERY_MS);
  }

  async load() {
    this.props.dispatch({ type: "books/loading" });
    const books = await getBooks();
    this.props.dispatch({ type: "books/loaded", books });
  }

  render() {
    return (
      <ScrollView>
        {this.props.books.map((book) => (
          <View key={book.id} style={{ padding: 16 }}>
            <Text style={{ fontSize: 18 }}>{book.title}</Text>
            <Text>{book.author}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }
}

export default connect((state) => ({ books: state.books.books }))(BookListScreen);
