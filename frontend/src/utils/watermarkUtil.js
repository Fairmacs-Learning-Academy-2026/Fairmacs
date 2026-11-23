/**
 * Fairmacs KMS Safe PDF Watermark Placement Utility
 *
 * Calculates the rotated bounding box of watermark text and positions
 * watermark instances strictly within safe page boundaries (with safe margin).
 * Completely eliminates watermark clipping at top, bottom, left, and right page edges.
 */

export function calculateRotatedBoundingBox(textLength, fontSize, rotationAngle = 45) {
  // Approximate character width for system semi-bold sans-serif font
  const charWidth = fontSize * 0.58;
  const textWidth = textLength * charWidth;
  const textHeight = fontSize * 1.25;

  const rad = Math.abs(rotationAngle) * (Math.PI / 180);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const rotatedWidth = textWidth * cos + textHeight * sin;
  const rotatedHeight = textWidth * sin + textHeight * cos;

  return {
    textWidth,
    textHeight,
    rotatedWidth,
    rotatedHeight,
    halfWidth: rotatedWidth / 2,
    halfHeight: rotatedHeight / 2
  };
}

export function generateSafeWatermarkSvg(pageWidth, pageHeight, watermarkText, rotationAngle = 45) {
  if (!pageWidth || !pageHeight || !watermarkText) return '';

  const safeMargin = 24;
  let fontSize = 11;
  const escapedText = String(watermarkText)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  let bounds = calculateRotatedBoundingBox(watermarkText.length, fontSize, rotationAngle);

  // Auto-scale font size down if page is too compact for rotated text with margins
  const availW = pageWidth - 2 * safeMargin;
  const availH = pageHeight - 2 * safeMargin;
  if (availW > 0 && availH > 0 && (bounds.rotatedWidth > availW || bounds.rotatedHeight > availH)) {
    const scale = Math.min(availW / bounds.rotatedWidth, availH / bounds.rotatedHeight);
    if (scale < 1.0) {
      fontSize = Math.max(7.5, fontSize * scale);
      bounds = calculateRotatedBoundingBox(watermarkText.length, fontSize, rotationAngle);
    }
  }

  const { halfWidth, halfHeight, rotatedWidth, rotatedHeight } = bounds;

  const minX = safeMargin + halfWidth;
  const maxX = pageWidth - safeMargin - halfWidth;
  const minY = safeMargin + halfHeight;
  const maxY = pageHeight - safeMargin - halfHeight;

  const textNodes = [];

  if (minX > maxX || minY > maxY) {
    // Single centered watermark if page fits it within boundaries
    const cx = pageWidth / 2;
    const cy = pageHeight / 2;
    if (cx - halfWidth >= 0 && cx + halfWidth <= pageWidth && cy - halfHeight >= 0 && cy + halfHeight <= pageHeight) {
      textNodes.push(
        `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" transform="rotate(-${rotationAngle} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="rgba(15, 23, 42, 0.26)" font-size="${fontSize.toFixed(1)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing="0.5" xml:space="preserve">${escapedText}</text>`
      );
    }
  } else {
    const safeSpanX = maxX - minX;
    const safeSpanY = maxY - minY;

    const stepX = rotatedWidth * 0.9;
    const stepY = rotatedHeight * 0.75;

    const cols = Math.max(1, Math.floor(safeSpanX / stepX) + 1);
    const rows = Math.max(1, Math.floor(safeSpanY / stepY) + 1);

    const actualStepX = cols > 1 ? safeSpanX / (cols - 1) : 0;
    const actualStepY = rows > 1 ? safeSpanY / (rows - 1) : 0;

    for (let r = 0; r < rows; r++) {
      const candY = rows === 1 ? pageHeight / 2 : minY + r * actualStepY;

      for (let c = 0; c < cols; c++) {
        let candX = cols === 1 ? pageWidth / 2 : minX + c * actualStepX;

        // Diagonal stagger on alternating rows
        if (r % 2 === 1 && cols > 1) {
          candX += actualStepX / 2;
          if (candX > maxX) {
            candX -= actualStepX;
          }
        }

        // Strict non-clipping boundary check
        const left = candX - halfWidth;
        const right = candX + halfWidth;
        const bottom = candY - halfHeight;
        const top = candY + halfHeight;

        if (
          left >= safeMargin &&
          right <= pageWidth - safeMargin &&
          bottom >= safeMargin &&
          top <= pageHeight - safeMargin
        ) {
          textNodes.push(
            `<text x="${candX.toFixed(1)}" y="${candY.toFixed(1)}" text-anchor="middle" dominant-baseline="central" transform="rotate(-${rotationAngle} ${candX.toFixed(1)} ${candY.toFixed(1)})" fill="rgba(15, 23, 42, 0.26)" font-size="${fontSize.toFixed(1)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing="0.5" xml:space="preserve">${escapedText}</text>`
          );
        }
      }
    }

    if (textNodes.length === 0) {
      const cx = pageWidth / 2;
      const cy = pageHeight / 2;
      textNodes.push(
        `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" transform="rotate(-${rotationAngle} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="rgba(15, 23, 42, 0.26)" font-size="${fontSize.toFixed(1)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="600" letter-spacing="0.5" xml:space="preserve">${escapedText}</text>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.floor(pageWidth)}" height="${Math.floor(pageHeight)}" viewBox="0 0 ${Math.floor(pageWidth)} ${Math.floor(pageHeight)}" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; user-select: none; mix-blend-mode: multiply;">${textNodes.join('')}</svg>`;
}
