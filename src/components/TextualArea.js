import React, { useEffect, useState } from 'react';
import { useModelStore } from '../model/Model';
import OverlappingMarkup from './OverlappingMarkup';

const SelectedText = ({ children, id, style, className }) => {
  const selectedElements = useModelStore((state) => state.selectedElements);
  const startDragging = useModelStore((state) => state.startDragging);
  const dragging = useModelStore((state) => state.dragging);
  const [isClicked, setIsClicked] = useState(false);

  return (
    <span
      className={className}
      id={id}
      style={{
        borderRadius: 2,
        cursor: 'pointer',
        backgroundColor: '#ffff99', // Surlignage jaune pour indiquer la sélection
        ...style,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        if (e.button === 0) setIsClicked(true);
      }}
      onMouseUp={(e) => {
        if (e.button === 0) setIsClicked(false);
      }}
      onMouseMove={(e) => {
        if (isClicked && !dragging && e.buttons === 1) {
          const draggingParameters = selectedElements.map((element, i) => {
            const span = document.getElementById('selection' + i);
            if (span) {
              const rect = span.getBoundingClientRect();
              const offsetX = e.clientX - rect.left;
              const offsetY = e.clientY - rect.top;
              return {
                elementId: span.id,
                initialX: e.clientX,
                initialY: e.clientY,
                cloned: true,
                offsetX,
                offsetY,
                entities: [element],
              };
            }
            return null;
          }).filter(Boolean);

          if (draggingParameters.length > 0) {
            startDragging(draggingParameters);
          }
        }
      }}
    >
      {children}
    </span>
  );
};

const TextualArea = ({ text, onChange, placeholder, style, language }) => {
  const selectedElements = useModelStore((state) => state.selectedElements);
  const setSelectedElements = useModelStore((state) => state.setSelectedElements);
  const inMultipleSelectionMode = useModelStore((state) => state.inMultipleSelectionMode);

  const annotations = selectedElements.map((element, i) => ({
    min: element.customData.startIndex,
    max: element.customData.endIndex,
    style: {
      content: ({ children }) => (
        <SelectedText
          id={'selection' + i}
          style={{ paddingTop: 2.5, paddingBottom: 2.5 }}
          className="selectedText"
        >
          {children}
        </SelectedText>
      ),
    },
    data: { element, index: i, isLoading: false },
  }));

  useEffect(() => {
    const handleMouseUp = (e) => {
  const selection = window.getSelection();
  const selectionLength = selection?.toString().length || 0;

  if (selectionLength > 0) {
    const tmpElements = inMultipleSelectionMode ? [...selectedElements] : [];
    const range = selection.getRangeAt(0);

    // Normalize offsets so we always get the correct substring direction
    const startIndex = Math.min(range.startOffset, range.endOffset);
    const endIndex   = Math.max(range.startOffset, range.endOffset);

    const selectedText = text.substring(startIndex, endIndex);

    tmpElements.push({
      customData: {
        startIndex,
        endIndex,
        text: selectedText,
      },
      htmlRepresentation: <>{selectedText}</>,
      textRepresentation: selectedText,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

    setSelectedElements(tmpElements);

    const editableElement = document.getElementById('selectableText');
    if (editableElement) {
      editableElement.focus();
    }
  }
};

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [text, selectedElements, setSelectedElements, inMultipleSelectionMode]);

  return (
    <div style={{ display: 'flex', justifyContent: 'left', width: '100%' }}>
      <div
        id="selectableText"
        className="trans-textarea"
        style={{
          textAlign: 'left',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5rem',
          minHeight: '200px',
          width: '100%',
          maxWidth: 600,
          margin: 0,
          padding: '8px',
          border: '1px solid #ccc',
          overflow: 'auto',
          boxSizing: 'border-box',
          ...style,
        }}
        contentEditable
        onInput={(e) => onChange(e.target.textContent)}
        suppressContentEditableWarning
      >
        <OverlappingMarkup text={text || placeholder} styling={annotations} />
      </div>
    </div>
  );
};

export default TextualArea;