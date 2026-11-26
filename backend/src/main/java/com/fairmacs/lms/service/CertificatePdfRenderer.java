package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Certificate;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Draws the Fairmacs "Certificate of Completion" on top of the artwork in
 * /certificate-template.jpg.
 *
 * The artwork contains NO personal text: the learner name, the course sentence and
 * the certificate id are all drawn here, so a long course title wraps / shrinks
 * instead of colliding with the design. All coordinates are in PDF points,
 * measured from the TOP of the page (converted to PDF's bottom-left origin when drawn).
 */
final class CertificatePdfRenderer {

    // Page = the artwork's aspect ratio (3:2), A4 landscape width.
    static final float PAGE_WIDTH = 842f;
    static final float PAGE_HEIGHT = 561.33f;
    private static final float CENTER_X = PAGE_WIDTH / 2f;

    private static final Color NAVY = new Color(40, 55, 120);

    // Certificate id line ("CERTIFICATE ID : <id>")
    private static final float ID_BASELINE = 247.05f;
    private static final float ID_SIZE = 9.5f;
    private static final float ID_SPACING = 2.03f;

    // Learner name (sits on the printed rule, which is at y = 320.9)
    private static final float NAME_BASELINE = 310.0f;
    private static final float NAME_MAX_WIDTH = 410f;
    private static final float NAME_MAX_SIZE = 30f;
    private static final float NAME_MIN_SIZE = 16f;

    // Body text
    private static final float BODY_SIZE = 11.6f;
    private static final float SPACING_RATIO = 2.36f / 11.6f;
    private static final float[] SENTENCE_SIZES = {11.6f, 10.8f, 10.0f, 9.4f};
    private static final float BODY_MAX_WIDTH = 640f;
    private static final float LINE_PITCH = 15.7f;
    private static final float SENTENCE_BASELINE = 344.5f;
    private static final float SENTENCE_TO_PARAGRAPH = 30.7f;

    private static final String PARAGRAPH_LINE_1 =
            "In recognition of their dedication, commitment to learning, and contribution towards";
    private static final String PARAGRAPH_LINE_2 =
            "continuous professional growth and development.";

    private CertificatePdfRenderer() {
    }

    // ------------------------------------------------------------------
    // Public entry point
    // ------------------------------------------------------------------

    static byte[] render(Certificate certificate, String organisationName)
            throws IOException, DocumentException {

        BaseFont bodyFont = loadFont("OpenSans-Italic.ttf");
        BaseFont bodyBoldFont = loadFont("OpenSans-BoldItalic.ttf");
        BaseFont idFont = loadFont("OpenSans-Bold.ttf");
        BaseFont nameFont = loadFont("Lora-BoldItalic.ttf");

        String learnerName = clean(
                certificate.getUser() != null ? certificate.getUser().getName() : null,
                "Learner");
        String courseTitle = clean(
                certificate.getCourse() != null ? certificate.getCourse().getTitle() : null,
                "the course");
        String certificateId = clean(certificate.getCertificateId(), "");
        String organisation = clean(organisationName, "FAIRMACS").toUpperCase(Locale.ROOT);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(new Rectangle(PAGE_WIDTH, PAGE_HEIGHT), 0, 0, 0, 0);
        PdfWriter writer = PdfWriter.getInstance(document, out);
        document.addTitle("Certificate of Completion");
        document.addAuthor(organisation);
        document.open();

        Image background = Image.getInstance(readResource("/certificate-template.jpg"));
        background.setAbsolutePosition(0, 0);
        background.scaleAbsolute(PAGE_WIDTH, PAGE_HEIGHT);
        writer.getDirectContentUnder().addImage(background);

        PdfContentByte canvas = writer.getDirectContent();

        drawCertificateId(canvas, idFont, certificateId);
        drawLearnerName(canvas, nameFont, learnerName);
        float paragraphTop = drawSentence(canvas, bodyFont, bodyBoldFont, courseTitle, organisation);
        drawParagraph(canvas, bodyFont, paragraphTop);

        document.close();
        return out.toByteArray();
    }

    // ------------------------------------------------------------------
    // Drawing blocks
    // ------------------------------------------------------------------

    private static void drawCertificateId(PdfContentByte canvas, BaseFont font, String certificateId) {
        String text = sanitize("CERTIFICATE ID : " + certificateId, font);
        float width = font.getWidthPoint(text, ID_SIZE) + ID_SPACING * (text.length() - 1);
        drawText(canvas, font, ID_SIZE, ID_SPACING, CENTER_X - width / 2f, ID_BASELINE, text);
    }

    private static void drawLearnerName(PdfContentByte canvas, BaseFont font, String name) {
        String text = sanitize(name, font);
        float size = NAME_MAX_SIZE;
        while (size > NAME_MIN_SIZE && font.getWidthPoint(text, size) > NAME_MAX_WIDTH) {
            size -= 1f;
        }
        float width = font.getWidthPoint(text, size);
        drawText(canvas, font, size, 0f, CENTER_X - width / 2f, NAME_BASELINE, text);
    }

    /**
     * Draws "For successfully completing <b>COURSE</b>, organised and conducted by <b>ORG</b>."
     * on one or two balanced lines. Returns the baseline of the first paragraph line.
     */
    private static float drawSentence(
            PdfContentByte canvas,
            BaseFont regular,
            BaseFont bold,
            String courseTitle,
            String organisation
    ) {
        String title = sanitize(courseTitle, bold);
        String org = sanitize(organisation, bold);

        List<List<Word>> lines = null;
        float size = SENTENCE_SIZES[SENTENCE_SIZES.length - 1];

        // Try the normal sizes first; if the title is still too long, shorten it.
        int guard = 0;
        while (lines == null && guard < 200) {
            for (float candidate : SENTENCE_SIZES) {
                lines = breakIntoLines(buildWords(title, org), regular, bold, candidate);
                if (lines != null) {
                    size = candidate;
                    break;
                }
            }
            if (lines == null) {
                if (title.length() <= 8) {
                    break;
                }
                title = title.substring(0, title.length() - 4).trim() + "\u2026";
            }
            guard++;
        }
        if (lines == null) {
            // Cannot normally happen; keep everything on one line rather than fail.
            lines = new ArrayList<>();
            lines.add(buildWords(title, org));
        }

        float spacing = SPACING_RATIO * size;
        for (int i = 0; i < lines.size(); i++) {
            List<Word> line = lines.get(i);
            float x = CENTER_X - lineWidth(line, regular, bold, size) / 2f;
            float baseline = SENTENCE_BASELINE + i * LINE_PITCH;
            for (int w = 0; w < line.size(); w++) {
                Word word = line.get(w);
                BaseFont font = word.bold ? bold : regular;
                drawText(canvas, font, size, spacing, x, baseline, word.text);
                x += wordWidth(word, regular, bold, size);
                if (hasSpaceAfter(line, w)) {
                    x += spaceWidth(regular, size);
                }
            }
        }
        return SENTENCE_BASELINE + (lines.size() - 1) * LINE_PITCH + SENTENCE_TO_PARAGRAPH;
    }

    private static void drawParagraph(PdfContentByte canvas, BaseFont font, float firstBaseline) {
        float spacing = SPACING_RATIO * BODY_SIZE;
        String[] lines = {PARAGRAPH_LINE_1, PARAGRAPH_LINE_2};
        for (int i = 0; i < lines.length; i++) {
            String text = lines[i];
            float width = font.getWidthPoint(text, BODY_SIZE) + spacing * (text.length() - 1);
            drawText(canvas, font, BODY_SIZE, spacing, CENTER_X - width / 2f,
                    firstBaseline + i * LINE_PITCH, text);
        }
    }

    // ------------------------------------------------------------------
    // Sentence layout helpers
    // ------------------------------------------------------------------

    private static final class Word {
        final String text;
        final boolean bold;

        Word(String text, boolean bold) {
            this.text = text;
            this.bold = bold;
        }
    }

    private static List<Word> buildWords(String title, String organisation) {
        List<Word> words = new ArrayList<>();
        for (String part : "For successfully completing".split(" ")) {
            words.add(new Word(part, false));
        }
        for (String part : title.split("\\s+")) {
            if (!part.isEmpty()) {
                words.add(new Word(part, true));
            }
        }
        words.add(new Word(",", false));
        for (String part : "organised and conducted by".split(" ")) {
            words.add(new Word(part, false));
        }
        words.add(new Word(organisation + ".", true));
        return words;
    }

    /** One line if it fits, otherwise the most balanced two-line split; null if nothing fits. */
    private static List<List<Word>> breakIntoLines(
            List<Word> words, BaseFont regular, BaseFont bold, float size) {

        List<List<Word>> result = new ArrayList<>();
        if (lineWidth(words, regular, bold, size) <= BODY_MAX_WIDTH) {
            result.add(words);
            return result;
        }

        float bestWidest = Float.MAX_VALUE;
        int bestSplit = -1;
        for (int split = 1; split < words.size(); split++) {
            if (",".equals(words.get(split).text)) {
                continue; // never start a line with the comma
            }
            float first = lineWidth(words.subList(0, split), regular, bold, size);
            float second = lineWidth(words.subList(split, words.size()), regular, bold, size);
            float widest = Math.max(first, second);
            if (widest <= BODY_MAX_WIDTH && widest < bestWidest) {
                bestWidest = widest;
                bestSplit = split;
            }
        }
        if (bestSplit < 0) {
            return null;
        }
        result.add(new ArrayList<>(words.subList(0, bestSplit)));
        result.add(new ArrayList<>(words.subList(bestSplit, words.size())));
        return result;
    }

    private static boolean hasSpaceAfter(List<Word> line, int index) {
        return index < line.size() - 1 && !",".equals(line.get(index + 1).text);
    }

    private static float spaceWidth(BaseFont regular, float size) {
        return regular.getWidthPoint(" ", size) + SPACING_RATIO * size;
    }

    private static float wordWidth(Word word, BaseFont regular, BaseFont bold, float size) {
        BaseFont font = word.bold ? bold : regular;
        return font.getWidthPoint(word.text, size) + SPACING_RATIO * size * word.text.length();
    }

    private static float lineWidth(List<Word> line, BaseFont regular, BaseFont bold, float size) {
        float total = 0f;
        for (int i = 0; i < line.size(); i++) {
            total += wordWidth(line.get(i), regular, bold, size);
            if (hasSpaceAfter(line, i)) {
                total += spaceWidth(regular, size);
            }
        }
        return total - SPACING_RATIO * size; // no trailing letter-spacing
    }

    // ------------------------------------------------------------------
    // Low level helpers
    // ------------------------------------------------------------------

    private static void drawText(
            PdfContentByte canvas,
            BaseFont font,
            float size,
            float charSpacing,
            float x,
            float baselineFromTop,
            String text
    ) {
        canvas.beginText();
        canvas.setFontAndSize(font, size);
        canvas.setColorFill(NAVY);
        canvas.setCharacterSpacing(charSpacing);
        canvas.setTextMatrix(x, PAGE_HEIGHT - baselineFromTop);
        canvas.showText(text);
        canvas.endText();
    }

    /** Collapses whitespace; falls back to a default when empty. */
    private static String clean(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String collapsed = value.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
        return collapsed.isEmpty() ? fallback : collapsed;
    }

    /** Replaces characters the embedded font cannot draw, so no empty boxes appear. */
    private static String sanitize(String text, BaseFont font) {
        StringBuilder sb = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            sb.append(font.charExists(c) ? c : '?');
        }
        return sb.toString();
    }

    private static BaseFont loadFont(String file) throws DocumentException, IOException {
        byte[] bytes = readResource("/fonts/" + file);
        return BaseFont.createFont(file, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, false, bytes, null);
    }

    private static byte[] readResource(String path) throws IOException {
        try (InputStream in = CertificatePdfRenderer.class.getResourceAsStream(path)) {
            if (in == null) {
                throw new IOException("Missing certificate resource: " + path);
            }
            return in.readAllBytes();
        }
    }
}
