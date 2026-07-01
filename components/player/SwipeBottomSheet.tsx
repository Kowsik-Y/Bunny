import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/app-theme-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SwipeBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor?: string;
};

export function SwipeBottomSheet({
  visible,
  onClose,
  children,
  backgroundColor = '#1e1e1e',
}: SwipeBottomSheetProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [activeVisible, setActiveVisible] = useState(visible);
  const { colorScheme } = useAppTheme();

  // Sync visibility with animation
  useEffect(() => {
    if (visible) {
      setActiveVisible(true);
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
      backdropOpacity.value = withTiming(0.4, { duration: 220 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
        runOnJS(setActiveVisible)(false);
      });
    }
  }, [visible]);

  const handleDismiss = () => {
    backdropOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
      runOnJS(onClose)();
      runOnJS(setActiveVisible)(false);
    });
  };

  const context = useSharedValue({ y: 0 });
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, context.value.y + event.translationY);
      const progress = 1 - (translateY.value / SCREEN_HEIGHT);
      backdropOpacity.value = 0.4 * Math.max(0, Math.min(1, progress));
    })
    .onEnd((event) => {
      if (translateY.value > SCREEN_HEIGHT * 0.22 || event.velocityY > 450) {
        runOnJS(handleDismiss)();
      } else {
        translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
        backdropOpacity.value = withTiming(0.4, { duration: 180 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const dragHandleBg = 'rgba(255,255,255,0.15)';

  return (
    <Modal
      transparent
      visible={activeVisible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <View 
          style={StyleSheet.absoluteFill} 
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {/* Backdrop */}
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
          </Animated.View>

          {/* Sheet Container */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.sheetContainer}
            pointerEvents="box-none"
          >
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.sheet, animatedStyle, { backgroundColor }]}>
                {/* Drag Handle */}
                <View style={[styles.dragHandle, { backgroundColor: dragHandleBg }]} />
                {children}
              </Animated.View>
            </GestureDetector>
          </KeyboardAvoidingView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#00000',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
