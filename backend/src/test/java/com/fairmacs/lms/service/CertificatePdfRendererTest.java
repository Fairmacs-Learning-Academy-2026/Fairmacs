package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CertificatePdfRendererTest {

    private Certificate certificate(String learner, String course, String id) {
        User user = new User();
        user.setName(learner);
        Course c = new Course();
        c.setTitle(course);
        Certificate certificate = new Certificate();
        certificate.setUser(user);
        certificate.setCourse(c);
        certificate.setCertificateId(id);
        return certificate;
    }

    private String asText(byte[] pdf) {
        return new String(pdf, StandardCharsets.ISO_8859_1);
    }

    @Test
    @DisplayName("Branded template is drawn with the embedded Open Sans and Lora fonts")
    void rendersBrandedCertificate() throws Exception {
        byte[] pdf = CertificatePdfRenderer.render(
                certificate("Aarav Krishnamurthy", "Port Operations Safety", "OP001"), "Fairmacs");

        assertEquals("%PDF", asText(pdf).substring(0, 4));
        String text = asText(pdf);
        // Proves the branded renderer ran (the plain fallback layout uses only built-in fonts).
        assertTrue(text.contains("OpenSans"), "Open Sans should be embedded");
        assertTrue(text.contains("Lora"), "Lora should be embedded");
        assertTrue(pdf.length > 50_000, "PDF should contain the background artwork");
    }

    @Test
    @DisplayName("A very long course title wraps / shrinks instead of failing")
    void longCourseTitleStillRenders() throws Exception {
        String longTitle = "Information Security Awareness and Data Protection Training for All Employees "
                + "Across Every Department, Branch and Subsidiary of the Group";
        byte[] pdf = CertificatePdfRenderer.render(
                certificate("Priyadharshini Venkataraman", longTitle, "CERT-2026-000457"), "Fairmacs");

        assertTrue(asText(pdf).startsWith("%PDF"));
        assertTrue(asText(pdf).contains("OpenSans"));
    }

    @Test
    @DisplayName("Missing or unsupported characters do not break rendering")
    void unusualInputStillRenders() throws Exception {
        byte[] pdf = CertificatePdfRenderer.render(
                certificate("  ", "Safety \u0928\u092E\u0938\u094D\u0924\u0947 & Compliance", null), null);

        assertTrue(asText(pdf).startsWith("%PDF"));
    }
}
