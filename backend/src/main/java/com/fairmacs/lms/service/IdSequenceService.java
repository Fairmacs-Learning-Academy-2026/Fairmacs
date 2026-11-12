package com.fairmacs.lms.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;

@Service
public class IdSequenceService {

    private final JdbcTemplate jdbcTemplate;

    // Explicit department name to prefix mappings
    private static final Map<String, String> DEPARTMENT_PREFIX_MAP = Map.ofEntries(
            Map.entry("operations", "OP"),
            Map.entry("documentation", "DOC"),
            Map.entry("general / common", "GEN"),
            Map.entry("general", "GEN"),
            Map.entry("common", "GEN"),
            Map.entry("other", "GEN"),
            Map.entry("all", "GEN"),
            Map.entry("corporate", "GEN"),
            Map.entry("human resource", "HR"),
            Map.entry("human resources", "HR"),
            Map.entry("people operations", "HR"),
            Map.entry("accounts", "ACC"),
            Map.entry("finance", "ACC"),
            Map.entry("admin", "ADM"),
            Map.entry("customer service", "CS"),
            Map.entry("pricing", "PRC"),
            Map.entry("sales", "SAL"),
            Map.entry("information technology", "IT"),
            Map.entry("it", "IT"),
            Map.entry("op", "OP"),
            Map.entry("doc", "DOC"),
            Map.entry("gen", "GEN"),
            Map.entry("hr", "HR"),
            Map.entry("acc", "ACC"),
            Map.entry("adm", "ADM"),
            Map.entry("cs", "CS"),
            Map.entry("prc", "PRC"),
            Map.entry("sal", "SAL")
    );

    public IdSequenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Resolves the department prefix for a given department name.
     * Throws IllegalArgumentException if no mapping exists.
     */
    public String resolveDepartmentPrefix(String departmentName) {
        if (departmentName == null || departmentName.isBlank()) {
            return "GEN";
        }
        String normalized = departmentName.trim().toLowerCase(Locale.ROOT);
        String prefix = DEPARTMENT_PREFIX_MAP.get(normalized);
        if (prefix != null) {
            return prefix;
        }

        // 1. Check multi-word or longer keys first (length >= 4) to prioritize semantic phrases
        for (Map.Entry<String, String> entry : DEPARTMENT_PREFIX_MAP.entrySet()) {
            String key = entry.getKey();
            if (key.length() >= 4 && (normalized.contains(key) || key.contains(normalized))) {
                return entry.getValue();
            }
        }

        // 2. For short abbreviation keys (length <= 3), match whole words only to avoid substring collisions (e.g. 'cs' in 'logistics')
        String[] words = normalized.split("[^a-z0-9]+");
        for (String w : words) {
            if (!w.isBlank() && DEPARTMENT_PREFIX_MAP.containsKey(w)) {
                return DEPARTMENT_PREFIX_MAP.get(w);
            }
        }

        // Fallback to "GEN" if no approved mapping exists
        return "GEN";
    }

    /**
     * Concurrency-safe atomic sequence generation using PostgreSQL ON CONFLICT DO UPDATE.
     * Guaranteed to return an incremented number per prefix without duplicates.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long getNextSequence(String sequenceKey) {
        String sql = """
            INSERT INTO id_sequences (prefix, last_value, updated_at)
            VALUES (?, 1, NOW())
            ON CONFLICT (prefix)
            DO UPDATE SET last_value = id_sequences.last_value + 1, updated_at = NOW()
            RETURNING last_value
        """;
        Long nextVal = jdbcTemplate.queryForObject(sql, Long.class, sequenceKey);
        return nextVal != null ? nextVal : 1L;
    }

    /**
     * Generates a unique course ID such as OP001, DOC001, GEN001.
     */
    public String generateCourseId(String departmentName) {
        String prefix = resolveDepartmentPrefix(departmentName);
        long seq = getNextSequence("COURSE_" + prefix);
        return String.format("%s%03d", prefix, seq);
    }

    /**
     * Generates a unique certificate ID such as OP001, DOC001, GEN001.
     */
    public String generateCertificateId(String departmentName) {
        String prefix = resolveDepartmentPrefix(departmentName);
        long seq = getNextSequence("CERT_" + prefix);
        return String.format("%s%03d", prefix, seq);
    }
}
