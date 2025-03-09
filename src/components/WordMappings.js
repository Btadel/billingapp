import React from 'react';
import { motion } from 'framer-motion';
import '../font/WordMappings.css'

function CollapsibleWordMappings({ hashMap, isOpen, toggleCollapse }) {
  if (!hashMap) return null;

  const entries = Array.from(hashMap.entries());

  return (
    <div className="mapping-container">
      <button onClick={toggleCollapse} className="collapsible-toggle">
        {isOpen ? 'Hide Word Mappings' : 'Show Word Mappings'}
      </button>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <ul className="mapping-list">
          {entries.map(([src, tgt], index) => (
            <li key={index} className="mapping-item">
              <span className="source-word">{src}</span>
              <span className="arrow"> → </span>
              <span className="target-word">{tgt}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

export default React.memo(CollapsibleWordMappings);
