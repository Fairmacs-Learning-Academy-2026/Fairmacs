package com.fairmacs.lms.service;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.PdfWriter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Fairmacs Learning Academy Policy & Course PDF Watermark Service Test Suite")
public class PolicyWatermarkServiceTest {

    private final PolicyWatermarkService watermarkService = new PolicyWatermarkService();

    @Test
    @DisplayName("Embed Watermark: Successfully stamps multi-page PDF, preserves page count and dimensions")
    void testEmbedWatermarkMultiPagePdf() throws Exception {
        // 1. Create a 3-page original sample PDF
        ByteArrayOutputStream originalOut = new ByteArrayOutputStream();
        Document doc = new Document();
        PdfWriter.getInstance(doc, originalOut);
        doc.open();
        doc.add(new Paragraph("Policy Document Page 1: Introduction and Scope"));
        doc.newPage();
        doc.add(new Paragraph("Policy Document Page 2: Responsibilities and Code of Conduct"));
        doc.newPage();
        doc.add(new Paragraph("Policy Document Page 3: Compliance and Disciplinary Action"));
        doc.close();

        byte[] originalBytes = originalOut.toByteArray();
        assertTrue(originalBytes.length > 0);

        String originalHash = computeSha256(originalBytes);

        // Verify original PDF page count
        PdfReader originalReader = new PdfReader(originalBytes);
        int originalPages = originalReader.getNumberOfPages();
        float originalWidth = originalReader.getPageSize(1).getWidth();
        float originalHeight = originalReader.getPageSize(1).getHeight();
        originalReader.close();

        assertEquals(3, originalPages);

        // 2. Apply watermark for Employee 1
        String watermarkText1 = "CONFIDENTIAL – PROPERTY OF FAIRMACS | Priya Nair | EMP2002 | Fairmacs Learning Academy | 17/11/2026 12:45:00";
        byte[] watermarkedBytes1 = watermarkService.embedWatermark(originalBytes, watermarkText1);

        assertNotNull(watermarkedBytes1);
        assertTrue(watermarkedBytes1.length > originalBytes.length, "Watermarked PDF must contain additional watermark stream data");

        // 3. Verify original PDF was not modified and hash remains intact
        assertEquals(originalHash, computeSha256(originalBytes), "Original PDF bytes must remain completely unmodified");

        // 4. Verify watermarked PDF structure
        PdfReader watermarkedReader = new PdfReader(watermarkedBytes1);
        assertEquals(3, watermarkedReader.getNumberOfPages(), "Watermarked PDF must preserve exact page count");
        assertEquals(originalWidth, watermarkedReader.getPageSize(1).getWidth(), 0.01, "Page width must be preserved");
        assertEquals(originalHeight, watermarkedReader.getPageSize(1).getHeight(), 0.01, "Page height must be preserved");
        watermarkedReader.close();

        // 5. Watermark for Employee 2 (distinct employee watermark)
        String watermarkText2 = "CONFIDENTIAL – PROPERTY OF FAIRMACS | Karthik Subramanian | EMP2003 | Fairmacs Learning Academy | 17/11/2026 12:45:05";
        byte[] watermarkedBytes2 = watermarkService.embedWatermark(originalBytes, watermarkText2);

        assertNotEquals(computeSha256(watermarkedBytes1), computeSha256(watermarkedBytes2),
                "Different employees must receive distinct watermarked derivatives");

        // 6. Graceful handling of empty or null inputs
        assertNull(watermarkService.embedWatermark(null, watermarkText1));
        assertArrayEquals(new byte[0], watermarkService.embedWatermark(new byte[0], watermarkText1));
        assertArrayEquals(originalBytes, watermarkService.embedWatermark(originalBytes, null));
        assertArrayEquals(originalBytes, watermarkService.embedWatermark(originalBytes, "  "));
    }

    @Test
    @DisplayName("Embed Watermark: Handles Landscape PDF orientation with non-clipping boundaries")
    void testEmbedWatermarkLandscapePdf() throws Exception {
        ByteArrayOutputStream originalOut = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate()); // 842 x 595 landscape
        PdfWriter.getInstance(doc, originalOut);
        doc.open();
        doc.add(new Paragraph("Landscape Training Guide - Fairmacs Logistics Management"));
        doc.close();

        byte[] originalBytes = originalOut.toByteArray();
        String originalHash = computeSha256(originalBytes);

        String watermarkText = "CONFIDENTIAL – PROPERTY OF FAIRMACS | Priya Nair | EMP2002 | Fairmacs Learning Academy | 17/11/2026 12:50:00";
        byte[] watermarkedBytes = watermarkService.embedWatermark(originalBytes, watermarkText);

        assertNotNull(watermarkedBytes);
        assertEquals(originalHash, computeSha256(originalBytes), "Original PDF bytes must remain unmodified");

        PdfReader reader = new PdfReader(watermarkedBytes);
        assertEquals(1, reader.getNumberOfPages());
        assertEquals(842.0f, reader.getPageSizeWithRotation(1).getWidth(), 0.1f);
        assertEquals(595.0f, reader.getPageSizeWithRotation(1).getHeight(), 0.1f);
        reader.close();
    }

    @Test
    @DisplayName("Embed Watermark: Handles mixed dimensions across pages in a single document")
    void testEmbedWatermarkMixedDimensionsPdf() throws Exception {
        ByteArrayOutputStream originalOut = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4); // Page 1: Portrait A4 (595 x 842)
        PdfWriter.getInstance(doc, originalOut);
        doc.open();
        doc.add(new Paragraph("Page 1: Standard Portrait A4"));

        doc.setPageSize(PageSize.A4.rotate()); // Page 2: Landscape A4 (842 x 595)
        doc.newPage();
        doc.add(new Paragraph("Page 2: Wide Landscape Chart"));

        doc.setPageSize(PageSize.LETTER); // Page 3: US Letter (612 x 792)
        doc.newPage();
        doc.add(new Paragraph("Page 3: US Letter Appendix"));

        doc.setPageSize(new Rectangle(400, 600)); // Page 4: Custom Compact dimensions
        doc.newPage();
        doc.add(new Paragraph("Page 4: Custom Dimensions"));
        doc.close();

        byte[] originalBytes = originalOut.toByteArray();
        String originalHash = computeSha256(originalBytes);

        String watermarkText = "CONFIDENTIAL – PROPERTY OF FAIRMACS | Karthik Subramanian | EMP2003 | Fairmacs Learning Academy | 17/11/2026 12:55:00";
        byte[] watermarkedBytes = watermarkService.embedWatermark(originalBytes, watermarkText);

        assertNotNull(watermarkedBytes);
        assertEquals(originalHash, computeSha256(originalBytes), "Original PDF bytes must remain unmodified");

        PdfReader reader = new PdfReader(watermarkedBytes);
        assertEquals(4, reader.getNumberOfPages());
        assertEquals(595.0f, reader.getPageSize(1).getWidth(), 0.5f);
        assertEquals(842.0f, reader.getPageSize(1).getHeight(), 0.5f);

        assertEquals(842.0f, reader.getPageSizeWithRotation(2).getWidth(), 0.5f);
        assertEquals(595.0f, reader.getPageSizeWithRotation(2).getHeight(), 0.5f);

        assertEquals(612.0f, reader.getPageSize(3).getWidth(), 0.5f);
        assertEquals(792.0f, reader.getPageSize(3).getHeight(), 0.5f);

        assertEquals(400.0f, reader.getPageSize(4).getWidth(), 0.5f);
        assertEquals(600.0f, reader.getPageSize(4).getHeight(), 0.5f);
        reader.close();
    }

    @Test
    @DisplayName("Embed Watermark: Safely protects document with text close to page edges")
    void testEmbedWatermarkTextCloseToEdges() throws Exception {
        ByteArrayOutputStream originalOut = new ByteArrayOutputStream();
        // Zero margins to place text directly on boundary edges
        Document doc = new Document(PageSize.A4, 0, 0, 0, 0);
        PdfWriter.getInstance(doc, originalOut);
        doc.open();
        doc.add(new Paragraph("Top Edge Header Text positioned at 0 margin"));
        doc.close();

        byte[] originalBytes = originalOut.toByteArray();

        String watermarkText = "CONFIDENTIAL – PROPERTY OF FAIRMACS | Priya Nair | EMP2002 | Fairmacs Learning Academy | 17/11/2026 13:00:00";
        byte[] watermarkedBytes = watermarkService.embedWatermark(originalBytes, watermarkText);

        assertNotNull(watermarkedBytes);
        assertTrue(watermarkedBytes.length > originalBytes.length);

        PdfReader reader = new PdfReader(watermarkedBytes);
        assertEquals(1, reader.getNumberOfPages());
        reader.close();
    }

    private String computeSha256(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(md.digest(data));
    }
}
