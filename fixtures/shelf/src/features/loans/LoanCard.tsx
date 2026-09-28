import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Loan } from "./useLoans";

export function LoanCard({ loan, onReturn }: { loan: Loan; onReturn: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{loan.title}</Text>
      <Text>Due {loan.dueOn}</Text>
      <Pressable onPress={onReturn} style={styles.returnButton}>
        <Text style={styles.icon}>↩</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: "#FFFFFF", borderRadius: 8 },
  title: { fontSize: 18, fontWeight: "600", color: "#1A73E8" },
  returnButton: { position: "absolute", right: 12, top: 12, padding: 4 },
  icon: { fontSize: 18 },
});
