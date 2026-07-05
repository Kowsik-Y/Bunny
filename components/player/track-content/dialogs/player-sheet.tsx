import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  const { colors } = useAppTheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      const raf = requestAnimationFrame(() => {
        bottomSheetModalRef.current?.present();
      });
      return () => cancelAnimationFrame(raf);
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (visible) {
      onClose();
    }
  }, [visible, onClose]);

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

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={handleDismiss}
      onChange={(index) => {
        if (index === -1) {
          handleDismiss();
        }
      }}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.content}>
        {title && (
          <View style={styles.header}>
            {showBack && (
              <Pressable onPress={onBack} style={styles.backBtn}>
                <Feather name="chevron-left" size={22} color={colors.text} />
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
