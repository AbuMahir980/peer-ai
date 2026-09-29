import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { http } from "../../lib/http";
import { askLibrarian, type LibrarianReply } from "./askLibrarian";

export function LibrarianScreen({ readerId }: { readerId: string }) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<LibrarianReply>();

  async function ask() {
    const answer = await askLibrarian(readerId, question);
    if (answer.action === "reserve" && answer.bookId !== undefined) {
      await http(`/books/${answer.bookId}/reservations`, { method: "POST" });
    }
    setReply(answer);
  }

  return (
    <View style={styles.screen}>
      <TextInput value={question} onChangeText={setQuestion} placeholder="What should I read next?" />
      <Pressable onPress={() => void ask()}>
        <Text>Ask the librarian</Text>
      </Pressable>
      {reply && (
        <View>
          <Text>{reply.text}</Text>
          {reply.minimumAge !== undefined && <Text style={styles.badge}>Suitable for ages {reply.minimumAge}+</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  badge: { fontWeight: "600", color: "#188038" },
});
