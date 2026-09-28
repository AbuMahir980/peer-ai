import { ScrollView, Text } from "react-native";
import { colours, spacing, type } from "../../theme/tokens";

export function ProfileScreen({ name, bio }: { name: string; bio: string }) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, backgroundColor: colours.surface }}>
      <Text style={{ fontSize: type.title, color: colours.text }}>{name}</Text>
      <Text allowFontScaling={false} style={{ fontSize: 13, color: colours.muted }}>
        {bio}
      </Text>
    </ScrollView>
  );
}
