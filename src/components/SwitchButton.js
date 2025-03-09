import React, { useState } from 'react';
import '../font/SwitchButton.css';

const SwitchButton = ({ title, onToggle }) => {
  const [isOn, setIsOn] = useState(false);

  const handleToggle = () => {
    setIsOn((prev) => !prev);
    if (onToggle) {
      onToggle(!isOn);
    }
  };

  return (
    <div className="switch-container">
      {title && <span className="switch-title">{title}</span>}
      <div className={`switch-button ${isOn ? 'on' : 'off'}`} onClick={handleToggle}>
        <div className="switch-knob"></div>
      </div>
    </div>
  );
};

export default SwitchButton;
