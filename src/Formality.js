import React from 'react';

const FormalitySelector = ({ onFormalityChange }) => {
  return (
    <div>
      <label htmlFor="formality">Choose formality:</label>
      <select id="formality" onChange={onFormalityChange}>
        <option value="informal">Informal</option>
        <option value="formal">Formal</option>
      </select>
    </div>
  );
};

export default FormalitySelector;
