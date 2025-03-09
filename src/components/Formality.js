import React from 'react';
import '../font/FormalitySelector.css'; // Import the CSS file

const FormalitySelector = ({ onFormalityChange }) => {
  return (
    <div className="formality-selector">
      <label htmlFor="formality">Choose formality:</label>
      <select id="formality" onChange={onFormalityChange}>
        <option value="informal">Informal</option>
        <option value="formal">Formal</option>
      </select>
    </div>
  );
};

export default FormalitySelector;