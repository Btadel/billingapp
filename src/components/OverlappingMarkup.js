const OverlappingMarkup = ({ text, styling }) => {
  // If there's no styling, just render the raw text:
  if (!styling.length) return <span>{text}</span>;

  // Sort rules by startIndex
  const sortedStyles = [...styling].sort(
    (a, b) => a.min - b.min || b.max - a.max
  );

  let result = [];
  let lastIndex = 0;

  sortedStyles.forEach((style, i) => {
    // Push any plain text before the highlight
    if (style.min > lastIndex) {
      result.push(text.substring(lastIndex, style.min));
    }
    // The chunk we want to highlight
    const content = text.substring(style.min, style.max);

    // Insert the custom highlight component
    const HighlightComponent = style.style.content;
    result.push(
      <HighlightComponent key={i} styleData={style.data}>
        {content}
      </HighlightComponent>
    );

    lastIndex = style.max;
  });

  // Add any remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return <span>{result}</span>;
};

export default OverlappingMarkup;