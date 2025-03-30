// SwitchButton.js
import React from 'react';
import '../font/SwitchButton.css';
import { useModelStore } from './store';

const SwitchButton = ({ title, onToggle }) => {
  const { isSwitchOn, toggleSwitch } = useModelStore();

  const handleToggle = () => {
    toggleSwitch();
    if (onToggle) {
      onToggle(!isSwitchOn);
    }
  };

  return (
    <div className="switch-container">
      {title && <span className="switch-title">{title}</span>}
      <div className={`switch-button ${isSwitchOn ? 'on' : 'off'}`} onClick={handleToggle}>
        <div className="switch-knob"></div>
      </div>
    </div>
  );
};

export default SwitchButton;