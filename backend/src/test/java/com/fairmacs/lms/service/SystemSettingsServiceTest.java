package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.SystemSetting;
import com.fairmacs.lms.repository.SystemSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SystemSettingsServiceTest {

    private SystemSettingRepository repository;
    private BCryptPasswordEncoder encoder;
    private SystemSettingsService service;

    @BeforeEach
    void setUp() {
        repository = mock(SystemSettingRepository.class);
        when(repository.findById(anyString())).thenReturn(Optional.empty());
        encoder = new BCryptPasswordEncoder();
        service = new SystemSettingsService(repository, encoder);
    }

    private Map<String, String> change(String key, String value) {
        Map<String, String> changes = new LinkedHashMap<>();
        changes.put(key, value);
        return changes;
    }

    @Test
    @DisplayName("Unsaved settings return their documented defaults")
    void defaults() {
        assertEquals("FAIRMACS", service.getString(SystemSettingsService.ORGANIZATION_NAME));
        assertEquals(5, service.getInt(SystemSettingsService.QUIZ_COOLDOWN_MINUTES));
        assertEquals(0, service.getInt(SystemSettingsService.QUIZ_MAX_ATTEMPTS));
        assertEquals(70, service.getInt(SystemSettingsService.QUIZ_PASSING_SCORE));
        assertFalse(service.isInitialPasswordConfigured());
    }

    @Test
    @DisplayName("Out of range or non-numeric values are rejected and nothing is saved")
    void rejectsInvalidValues() {
        assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(change(SystemSettingsService.QUIZ_PASSING_SCORE, "150")));
        assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(change(SystemSettingsService.QUIZ_MAX_ATTEMPTS, "ten")));
        assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(change(SystemSettingsService.ORGANIZATION_NAME, "x")));
        assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(change("not.a.setting", "1")));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("A valid change is saved with who changed it")
    void savesValidValue() {
        service.updateSettings(change(SystemSettingsService.QUIZ_MAX_ATTEMPTS, "10"));

        ArgumentCaptor<SystemSetting> saved = ArgumentCaptor.forClass(SystemSetting.class);
        verify(repository).save(saved.capture());
        assertEquals(SystemSettingsService.QUIZ_MAX_ATTEMPTS, saved.getValue().getKey());
        assertEquals("10", saved.getValue().getValue());
        assertEquals("system", saved.getValue().getUpdatedBy());
    }

    @Test
    @DisplayName("The shared initial password must be strong and is stored only as a hash")
    void initialPasswordIsHashed() {
        assertThrows(IllegalArgumentException.class,
                () -> service.updateSettings(change(SystemSettingsService.INITIAL_PASSWORD, "weak")));

        service.updateSettings(change(SystemSettingsService.INITIAL_PASSWORD, "Zx9#kLm2Qp"));

        ArgumentCaptor<SystemSetting> saved = ArgumentCaptor.forClass(SystemSetting.class);
        verify(repository).save(saved.capture());
        assertEquals(SystemSettingsService.INITIAL_PASSWORD_HASH, saved.getValue().getKey());
        assertFalse(saved.getValue().getValue().contains("Zx9#kLm2Qp"));
        assertTrue(encoder.matches("Zx9#kLm2Qp", saved.getValue().getValue()));
    }

    @Test
    @DisplayName("A blank password value means no change")
    void blankPasswordMeansNoChange() {
        service.updateSettings(change(SystemSettingsService.INITIAL_PASSWORD, "   "));
        verify(repository, never()).save(any());
    }
}
