import { useAppTheme } from '@/contexts/app-theme-context';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

// Keep BottomSheetContext legacy export just in case
export const BottomSheetContext = React.createContext({ scrollEnabled: true });

// Export BottomSheetScrollView from gorhom for native scrolling integration
export { BottomSheetScrollView };

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor?: string;
  contentKey?: string;
};

export function SwipeBottomSheet({
  visible,
  onClose,
  children,
  backgroundColor,
}: Props) {
  const { colors } = useAppTheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        setMounted(true);
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

  const handleDismiss = () => {
    setMounted(false);
    onClose();
  };

  const bg = backgroundColor || colors.card;
  const snapPoints = useMemo(() => ['80%'], []);

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
      backgroundStyle={{ backgroundColor: bg }}
      handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.content}>
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
});
