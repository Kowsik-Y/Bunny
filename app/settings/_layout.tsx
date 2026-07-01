import { Stack } from "expo-router";
import { View, Text, TouchableOpacity, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/app-theme-context";
import { ChevronLeft } from "lucide-react-native";
import { addAlpha } from "@/constants/theme";

type CustomHeaderProps = {
  options: {
    title?: string;
  };
  route: {
    name: string;
  };
};
function CustomHeader({ options, route }: CustomHeaderProps) {
  const router = useRouter();
  const { colors, fontFamily } = useAppTheme();

  return (
    <View
      style={{
        height: 100,
        paddingTop: 50,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <Pressable
        style={{
          padding: 5,
          borderRadius: 50,
          backgroundColor: addAlpha(colors.text, 0.05),
          borderColor: colors.border,
          borderWidth: 0.8
        }}
        onPress={() => router.back()}>
        <ChevronLeft size={24} color={colors.text} />
      </Pressable>

      <Text
        style={{
          marginLeft: 16,
          fontSize: 20,
          fontFamily,
          color: colors.text,
          fontWeight: "bold",
        }}
      >
        {options.title ?? route.name}
      </Text>
    </View>
  );
}

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        header: (props) => <CustomHeader {...props} />,
      }}
    />
  );
}