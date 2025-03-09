import React, { useEffect, useRef, useState } from 'react';
import { useModelStore } from '../model/Model';
import OverlappingMarkup from './OverlappingMarkup';

/* ---- Sauvegarde / Restauration du caret ---- */
function saveCaretOffset(rootElement) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  // Vérifie que le caret est bien dans rootElement
  if (!rootElement.contains(range.commonAncestorContainer)) return null;

  // On clone la range pour mesurer la longueur avant le caret
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(rootElement);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  // Nombre de caractères entre le début du rootElement et le caret
  const caretOffset = preCaretRange.toString().length;
  return caretOffset;
}

function restoreCaretOffset(rootElement, offset) {
  if (offset == null) return;
  // Si pas de texte, inutile de placer le caret
  const totalLength = rootElement.textContent.length;
  if (totalLength === 0) return;

  // On borne offset
  if (offset > totalLength) offset = totalLength;

  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();

  const range = document.createRange();
  range.selectNodeContents(rootElement);
  range.collapse(true);

  // Parcourt tous les TextNodes pour trouver la position précise
  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let currentOffset = 0;
  let node;
  while ((node = walker.nextNode())) {
    const nodeLength = node.nodeValue.length;
    const nextOffset = currentOffset + nodeLength;
    if (offset <= nextOffset) {
      const offsetInNode = offset - currentOffset;
      range.setStart(node, offsetInNode);
      range.collapse(true);
      break;
    }
    currentOffset = nextOffset;
  }
  selection.addRange(range);
}

/* ---- Surlignage draggable ---- */
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
        backgroundColor: '#ffff99',
        ...style,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        if (e.button === 0) {
          setIsClicked(true);
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 0) {
          setIsClicked(false);
        }
      }}
      onMouseMove={(e) => {
        if (isClicked && !dragging && e.buttons === 1) {
          const draggingParameters = selectedElements
            .map((element, i) => {
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
            })
            .filter(Boolean);

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

  const editableRef = useRef(null);
  const caretOffsetRef = useRef(null);
  const [showPlaceholder, setShowPlaceholder] = useState(!text);

  /* ---- Construit les "annotations" pour OverlappingMarkup ---- */
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

  /* ---- Sélection sur mouseUp ---- */
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const selectionLength = selection?.toString().length || 0;
      if (selectionLength > 0) {
        const tmpElements = inMultipleSelectionMode ? [...selectedElements] : [];
        const range = selection.getRangeAt(0);

        const startIndex = Math.min(range.startOffset, range.endOffset);
        const endIndex = Math.max(range.startOffset, range.endOffset);
        const selectedText = text.substring(startIndex, endIndex);

        tmpElements.push({
          customData: { startIndex, endIndex, text: selectedText },
          htmlRepresentation: <>{selectedText}</>,
          textRepresentation: selectedText,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        });

        setSelectedElements(tmpElements);

        if (editableRef.current) {
          editableRef.current.focus();
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [text, selectedElements, setSelectedElements, inMultipleSelectionMode]);

  /* ---- handleInput : user tape dans contentEditable ---- */
  const handleInput = (e) => {
    // Sauvegarder la position du caret avant de changer le texte
    caretOffsetRef.current = saveCaretOffset(editableRef.current);

    // Récupérer le nouveau texte
    const newText = e.target.textContent || '';
    setShowPlaceholder(!newText);

    // Mettre à jour l’état parent
    onChange(newText);
  };

  /* ---- Restaurer le caret après chaque re-render ---- */
  useEffect(() => {
    // Si pas en mode placeholder et qu'il y a un offset
    if (!showPlaceholder && editableRef.current) {
      restoreCaretOffset(editableRef.current, caretOffsetRef.current);
    }
  }, [text, showPlaceholder]);

  return (
    <div style={{ display: 'flex', justifyContent: 'left', width: '100%' }}>
      <div
        ref={editableRef}
        id="selectableText"
        className="trans-textarea"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dir="ltr" // Force LTR
        style={{
          textAlign: 'left',
          direction: 'ltr',
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
      >
        {showPlaceholder ? (
          // Affiche le placeholder si text est vide
          <span key="placeholder" style={{ color: '#aaa' }}>
            {placeholder}
          </span>
        ) : (
          // Sinon, affiche OverlappingMarkup
          <OverlappingMarkup
            key="text"
            text={text}
            styling={annotations}
          />
        )}
      </div>
    </div>
  );
};

export default TextualArea;
