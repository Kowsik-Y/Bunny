import React from 'react';
import { Button, ButtonProps } from './button';

interface IconButtonProps extends Omit<ButtonProps, 'label' | 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
}

export function IconButton({ icon, ...props }: IconButtonProps) {
  return (
    <Button
      size="icon"
      {...props}
    >
      {icon}
    </Button>
  );
}
