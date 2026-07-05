import { useAppTheme } from '@/contexts/app-theme-context';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!visible) return;
    }

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
