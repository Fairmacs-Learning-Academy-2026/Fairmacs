package com.fairmacs.lms.service;

import com.lowagie.text.Element;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfGState;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfStamper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

@Service
public class PolicyWatermarkService {

    private static final Logger log = LoggerFactory.getLogger(PolicyWatermarkService.class);

    private static final float DEFAULT_FONT_SIZE = 10.5f;
    private static final float DEFAULT_ROTATION_ANGLE = 45.0f;
    private static final float WATERMARK_OPACITY = 0.26f;
    private static final Color WATERMARK_COLOR = new Color(15, 23, 42); // Slate-900
    private static final float SAFE_MARGIN = 24.0f; // Safe margin from page boundaries to prevent clipping

    /**
     * Stamped watermarked copy of a policy or course PDF.
     * The original PDF bytes and WorkDrive file are never modified.
     *
     * @param originalPdfBytes Raw bytes of the original PDF document
     * @param watermarkText    Full watermark string (CONFIDENTIAL – PROPERTY OF FAIRMACS | Name | ID | KMS | Timestamp)
     * @return New byte array with embedded watermarks across every page
     */
    public byte[] embedWatermark(byte[] originalPdfBytes, String watermarkText) {
        return embedWatermark(originalPdfBytes, watermarkText, DEFAULT_ROTATION_ANGLE);
    }

    /**
     * Stamped watermarked copy of a PDF with custom diagonal rotation angle.
     * Mathematically calculates rotated bounding dimensions and positions watermarks
     * strictly within safe page boundaries to eliminate text clipping at page edges.
     *
     * @param originalPdfBytes Raw bytes of the original PDF document
     * @param watermarkText    Full watermark string
     * @param rotationAngle    Diagonal angle (degrees, typically 45.0f)
     * @return New byte array with embedded watermarks across every page
     */
    public byte[] embedWatermark(byte[] originalPdfBytes, String watermarkText, float rotationAngle) {
        if (originalPdfBytes == null || originalPdfBytes.length == 0 || watermarkText == null || watermarkText.isBlank()) {
            return originalPdfBytes;
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfReader reader = new PdfReader(originalPdfBytes);
            PdfStamper stamper = new PdfStamper(reader, out);

            BaseFont baseFont = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);

            PdfGState gstate = new PdfGState();
            gstate.setFillOpacity(WATERMARK_OPACITY);
            gstate.setStrokeOpacity(WATERMARK_OPACITY);

            int totalPages = reader.getNumberOfPages();

            for (int pageNum = 1; pageNum <= totalPages; pageNum++) {
                Rectangle pageSize = reader.getPageSizeWithRotation(pageNum);
                PdfContentByte over = stamper.getOverContent(pageNum);

                float width = pageSize.getWidth();
                float height = pageSize.getHeight();

                float fontSize = DEFAULT_FONT_SIZE;
                float textWidth = baseFont.getWidthPoint(watermarkText, fontSize);
                float fontAscent = baseFont.getAscentPoint(watermarkText, fontSize);
                float fontDescent = baseFont.getDescentPoint(watermarkText, fontSize);
                float textHeight = fontAscent - fontDescent;
                if (textHeight <= 0) {
                    textHeight = fontSize * 1.25f;
                }

                double rad = Math.toRadians(Math.abs(rotationAngle));
                float cos = (float) Math.abs(Math.cos(rad));
                float sin = (float) Math.abs(Math.sin(rad));

                float rotatedW = textWidth * cos + textHeight * sin;
                float rotatedH = textWidth * sin + textHeight * cos;

                // Scale font size down if rotated text exceeds available page width or height
                float availW = width - 2.0f * SAFE_MARGIN;
                float availH = height - 2.0f * SAFE_MARGIN;
                if (availW > 0 && availH > 0 && (rotatedW > availW || rotatedH > availH)) {
                    float scaleFactor = Math.min(availW / rotatedW, availH / rotatedH);
                    if (scaleFactor < 1.0f) {
                        fontSize = Math.max(7.5f, fontSize * scaleFactor);
                        textWidth = baseFont.getWidthPoint(watermarkText, fontSize);
                        fontAscent = baseFont.getAscentPoint(watermarkText, fontSize);
                        fontDescent = baseFont.getDescentPoint(watermarkText, fontSize);
                        textHeight = Math.max(fontSize * 1.25f, fontAscent - fontDescent);
                        rotatedW = textWidth * cos + textHeight * sin;
                        rotatedH = textWidth * sin + textHeight * cos;
                    }
                }

                float halfW = rotatedW / 2.0f;
                float halfH = rotatedH / 2.0f;

                float minX = SAFE_MARGIN + halfW;
                float maxX = width - SAFE_MARGIN - halfW;
                float minY = SAFE_MARGIN + halfH;
                float maxY = height - SAFE_MARGIN - halfH;

                over.saveState();
                over.setGState(gstate);
                over.setColorFill(WATERMARK_COLOR);
                over.beginText();
                over.setFontAndSize(baseFont, fontSize);

                int placedCount = 0;

                if (minX > maxX || minY > maxY) {
                    // Page cannot fit multiple instances with margins; place single centered instance if it fits inside page
                    float cx = width / 2.0f;
                    float cy = height / 2.0f;
                    if (cx - halfW >= 0 && cx + halfW <= width && cy - halfH >= 0 && cy + halfH <= height) {
                        over.showTextAligned(Element.ALIGN_CENTER, watermarkText, cx, cy, rotationAngle);
                        placedCount++;
                    }
                } else {
                    float safeSpanX = maxX - minX;
                    float safeSpanY = maxY - minY;

                    float stepX = rotatedW * 0.9f;
                    float stepY = rotatedH * 0.75f;

                    int cols = Math.max(1, (int) Math.floor(safeSpanX / stepX) + 1);
                    int rows = Math.max(1, (int) Math.floor(safeSpanY / stepY) + 1);

                    float actualStepX = (cols > 1) ? (safeSpanX / (cols - 1)) : 0;
                    float actualStepY = (rows > 1) ? (safeSpanY / (rows - 1)) : 0;

                    for (int r = 0; r < rows; r++) {
                        float candY = (rows == 1) ? (height / 2.0f) : (minY + r * actualStepY);

                        for (int c = 0; c < cols; c++) {
                            float candX = (cols == 1) ? (width / 2.0f) : (minX + c * actualStepX);

                            if (r % 2 == 1 && cols > 1) {
                                candX += actualStepX / 2.0f;
                                if (candX > maxX) {
                                    candX -= actualStepX;
                                }
                            }

                            // Strict boundary safety check using rotated bounding dimensions
                            float left = candX - halfW;
                            float right = candX + halfW;
                            float bottom = candY - halfH;
                            float top = candY + halfH;

                            if (left >= SAFE_MARGIN && right <= (width - SAFE_MARGIN) &&
                                bottom >= SAFE_MARGIN && top <= (height - SAFE_MARGIN)) {
                                over.showTextAligned(Element.ALIGN_CENTER, watermarkText, candX, candY, rotationAngle);
                                placedCount++;
                            }
                        }
                    }

                    // Fallback to center if staggering caused 0 placements
                    if (placedCount == 0) {
                        float cx = width / 2.0f;
                        float cy = height / 2.0f;
                        over.showTextAligned(Element.ALIGN_CENTER, watermarkText, cx, cy, rotationAngle);
                        placedCount++;
                    }
                }

                over.endText();
                over.restoreState();
            }

            stamper.close();
            reader.close();
            return out.toByteArray();
        } catch (Exception ex) {
            log.error("Failed to embed watermark into PDF document: {}", ex.getMessage(), ex);
            return originalPdfBytes;
        }
    }
}
