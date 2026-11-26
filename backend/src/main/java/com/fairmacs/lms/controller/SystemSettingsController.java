package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.SystemSettingsService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * HR/Admin system settings. Only HR_ADMIN may read or change them.
 *
 * PUT body: { "values": { "<setting key>": <value>, ... } }
 */
@RestController
@RequestMapping("/api/hr/settings")
public class SystemSettingsController {

    private final SystemSettingsService settingsService;

    public SystemSettingsController(SystemSettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(settingsService.getAllSettings());
    }

    @PutMapping
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> updateSettings(@RequestBody Map<String, Object> body) {
        Object rawValues = body != null ? body.get("values") : null;
        if (!(rawValues instanceof Map<?, ?> valuesMap) || valuesMap.isEmpty()) {
            throw new IllegalArgumentException("No settings were supplied.");
        }

        Map<String, String> changes = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : valuesMap.entrySet()) {
            changes.put(
                    String.valueOf(entry.getKey()),
                    entry.getValue() == null ? null : String.valueOf(entry.getValue())
            );
        }

        Map<String, Object> response = new LinkedHashMap<>(settingsService.updateSettings(changes));
        response.put("success", true);
        response.put("message", "Settings saved.");
        return ResponseEntity.ok(response);
    }
}
