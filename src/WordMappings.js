import React from 'react';
import './WordMappings.css'; // Optional, for styling

const WordMappings = ({ mappings }) => {
  return (
    <div className="word-mappings">
      <h4>Word Mappings:</h4>
      {mappings.length > 0 ? (
        mappings.map((mapping, index) => (
          <div key={index} className="mapping">
            <span>
              <strong>{mapping.original}</strong> → {mapping.translated}
            </span>
          </div>
        ))
      ) : (
        <p>No mappings available yet.</p>
      )}
    </div>
  );
};

export default WordMappings;
