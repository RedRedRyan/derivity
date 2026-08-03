import React from 'react';
import { SettingsIcon } from '@/components/shared_ui/figma-icons/Settings';

type SettingsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const SettingsButton: React.FC<SettingsButtonProps> = ({ className = '', type = 'button', ...props }) => {
    return (
        <button {...props} type={type} className={className}>
            <SettingsIcon />
        </button>
    );
};

export default SettingsButton;
