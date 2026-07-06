import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, BackHandler } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';

interface PlayerSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}

export function PlayerSheet({
  visible,
  onClose,
  title,
  showBack,
  onBack,
  children,
}: PlayerSheetProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (visible) {
      if (!mounted) {
        Promise.resolve().then(() => setMounted(true));
      } else {
        const timer = setTimeout(() => {
          bottomSheetModalRef.current?.present();
        }, 50);
        return () => clearTimeout(timer);
      }
    } else if (mounted) {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, mounted]);

  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleDismiss();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible]);

  const handleDismiss = () => {
    setMounted(false);
    onClose();
  };

  const snapPoints = useMemo(() => ['70%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );

  if (!mounted) {
    return null;
  }

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
      handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.content}>
        {title && (
          <View style={styles.header}>
            {showBack && (
              <Pressable onPress={onBack} style={styles.backBtn}>
                <ChevronLeft size={22} color={colors.text} />
              </Pressable>
            )}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
        )}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    width: '100%',
    paddingVertical: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
