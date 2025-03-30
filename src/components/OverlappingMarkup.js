import React from 'react';

// Utility function to merge overlapping intervals.
// Each interval is an object with at least { min, max, style, data }.
const mergeIntervals = (intervals) => {
  if (!intervals.length) return [];
  // Sort intervals by min
  const sorted = intervals.slice().sort((a, b) => a.min - b.min);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    // If current interval overlaps with last, merge them.
    if (current.min <= last.max) {
      last.max = Math.max(last.max, current.max);
      // Optionally: merge styles/data if needed.
      // For now, we'll keep last.style and last.data.
    } else {
      merged.push(current);
    }
  }
  return merged;
};

/**
 * OverlappingMarkup
 * 
 * - Splits `text` according to intervals {min, max}
 * - Wraps the portion [min, max) with a custom highlight component
 * - Adds unique keys for each segment
 * - Returns the result wrapped in a <span>
 */
const OverlappingMarkup = ({ text = '', styling = [] }) => {
  // Return an empty span if text is empty
  if (!text || text.length === 0) {
    return <span />;
  }

  // If styling is not an array or empty, return the raw text
  if (!Array.isArray(styling) || styling.length === 0) {
    return <span>{text}</span>;
  }

  // Filter out any invalid style objects (without proper min and max)
  const validStyles = styling.filter(s => typeof s.min === 'number' && typeof s.max === 'number');

  // Merge overlapping intervals to ensure we work with disjoint selections.
  const mergedStyles = mergeIntervals(validStyles);

  // Sort merged intervals by starting index (if not already sorted)
  const sortedStyles = mergedStyles.sort((a, b) => a.min - b.min);

  const result = [];
  let lastIndex = 0;
  let pieceIndex = 0;

  sortedStyles.forEach((style, i) => {
    // Use the interval as provided (assumed to be non-overlapping after merging)
    const start = Math.max(style.min, lastIndex);
    const end = Math.min(style.max, text.length);

    // Add non-highlighted text before the highlighted segment
    if (start > lastIndex) {
      const rawText = text.substring(lastIndex, start);
      result.push(
        <span key={`raw-${pieceIndex++}`}>{rawText}</span>
      );
    }

    // Extract the content to be highlighted
    const content = text.substring(start, end);
    // Get the highlight component; fallback to 'span' if not valid.
    const HighlightComponent =
      style && style.style && (typeof style.style.content === 'function' || typeof style.style.content === 'string')
        ? style.style.content
        : 'span';

    // Only pass styleData if the HighlightComponent is a custom component.
    const props = {};
    if (typeof HighlightComponent !== 'string') {
      props.styleData = style.data || {};
    }

    result.push(
      <HighlightComponent key={`highlight-${i}`} {...props}>
        {content}
      </HighlightComponent>
    );

    lastIndex = end;
  });

  // Append the remaining text after the last highlighted segment
  if (lastIndex < text.length) {
    const remainder = text.substring(lastIndex);
    result.push(
      <span key={`raw-${pieceIndex++}`}>{remainder}</span>
    );
  }

  return <span>{result}</span>;
};

export default OverlappingMarkup;
