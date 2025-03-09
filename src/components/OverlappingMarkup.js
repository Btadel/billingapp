import React from 'react';

/**
 * OverlappingMarkup
 * 
 * - Découpe `text` selon les intervalles {min, max} 
 * - Insère le composant custom (HighlightComponent) pour la portion [min..max)
 * - Ajoute des clés (key) sur chaque segment
 * - Retourne un fragment ou un <span> racine
 */
const OverlappingMarkup = ({ text = '', styling = [] }) => {
  // Si le texte est vide, pas de segmentation
  if (!text) {
    return null; 
    // Ou return <span /> si vous voulez un span vide
  }

  // Si aucune règle de style n’est fournie, retournez le texte brut
  if (styling.length === 0) {
    return <span>{text}</span>;
  }

  // On trie les annotations par position de min
  const sortedStyles = [...styling].sort(
    (a, b) => a.min - b.min || b.max - a.max
  );

  const result = [];
  let lastIndex = 0;
  let pieceIndex = 0; // pour générer des clés

  sortedStyles.forEach((style, i) => {
    const start = style.min;
    const end = style.max;

    // Ajoutez le texte "non-surligné" avant la zone
    if (start > lastIndex) {
      const rawText = text.substring(lastIndex, start);
      result.push(
        <span key={`raw-${pieceIndex++}`}>{rawText}</span>
      );
    }

    // La portion annotée
    const content = text.substring(start, end);
    const HighlightComponent = style.style.content;

    result.push(
      <HighlightComponent key={`highlight-${i}`} styleData={style.data}>
        {content}
      </HighlightComponent>
    );

    lastIndex = end;
  });

  // Ajoutez le texte restant après la dernière annotation
  if (lastIndex < text.length) {
    const remainder = text.substring(lastIndex);
    result.push(
      <span key={`raw-${pieceIndex++}`}>{remainder}</span>
    );
  }

  // On enveloppe le tout dans un <span> ou un <React.Fragment>
  return <span>{result}</span>;
};

export default OverlappingMarkup;
