// WordMappings.js
import React from 'react';
import './WordMappings.css'; // <-- We'll create this CSS file

function WordMappings({ hashMap }) {
  if (!hashMap) return null;

  
  const entries = hashMap.entries(); 
  

  return (
    <div className="mapping-container">
      <h3 className="mapping-title">Word Mappings</h3>
      <ul className="mapping-list">
        {entries.map(([src, tgt], index) => (
          <li key={index} className="mapping-item">
            <span className="source-word">{src}</span>
            <span className="arrow"> → </span>
            <span className="target-word">{tgt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default WordMappings;
