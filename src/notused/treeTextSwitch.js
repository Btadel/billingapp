import React from 'react';

const HashMapLength = ({ onHashMapLength }) => {
  return (
    <div>
      <label htmlFor="HashMapLength">Choose length:</label>
      <select id="length" onChange={onHashMapLength}>
        <option value="10">10</option>
        <option value="40">40</option>
        <option value="100">100</option>
      </select>
    </div>
  );
};

export default HashMapLength;
