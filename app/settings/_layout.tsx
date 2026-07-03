import { Stack } from "expo-router";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/contexts/app-theme-context";
import { ChevronLeft } from "lucide-react-native";
import { addAlpha } from "@/constants/theme";
import { Button } from "@/components/ui/button";

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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        paddingTop: 50,
        paddingHorizontal: 16,
        // Transparent so title content "floats" underneath
        backgroundColor: 'transparent',
        zIndex: 10,
        pointerEvents: 'box-none',
      }}
    >
      {/* Sticky back button — always visible, floats over content */}
      <Button
        style={{
          padding: 5,
          borderRadius: 50,
          backgroundColor: addAlpha(colors.background, 0.85),
          borderColor: colors.border,
          borderWidth: 0.8,
          alignSelf: 'flex-start',
          pointerEvents: 'auto',
        }}
        onPress={() => router.back()}
        variant="secondary" size="icon">
        <ChevronLeft size={20} color={colors.primary} />
      </Button>
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