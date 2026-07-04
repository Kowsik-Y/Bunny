import React from 'react';
import { Modal, StyleSheet, View, TouchableWithoutFeedback, Platform } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';
import { Button } from './button';

export type AlertVariant = 'default' | 'destructive';

export interface AlertProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: AlertVariant;
}

export function Alert({
  visible,
  onClose,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
}: AlertProps) {
  const { colors, semiBoldFontFamily } = useAppTheme();
  const isDestructive = variant === 'destructive';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[
              styles.dialog,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              }
            ]}>
              <Typography style={[
                styles.title,
                {
                  color: colors.text,
                  fontFamily: semiBoldFontFamily,
                }
              ]}>
                {title}
              </Typography>

              <Typography style={[
                styles.description,
                {
                  color: colors.mutedForeground,
                }
              ]}>
                {description}
              </Typography>

              <View style={styles.actions}>
                <Button
                  variant="ghost"
                  size='sm'
                  onPress={onClose}
                  label={cancelText}
                  style={styles.button}
                />
                <Button
                  variant={isDestructive ? 'destructive' : 'default'}
                  size='sm'
                  onPress={async () => {
                    onClose();
                    await onConfirm();
                  }}
                  label={confirmText}
                  style={styles.button}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
