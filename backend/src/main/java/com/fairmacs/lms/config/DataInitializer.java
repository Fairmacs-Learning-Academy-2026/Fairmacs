package com.fairmacs.lms.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.PasswordSecurityUtil;
import com.fairmacs.lms.service.HrAdminService;

/**
 * Local development role-account seeder.
 *
 * Security & data-safety guarantees:
 * 1. Restricted to the "local" Spring profile (@Profile("local")) AND requires explicit
 *    opt-in via app.seed.sample-users.enabled=true.
 * 2. Refuses to run at runtime if a "prod" or "production" profile is active.
 * 3. Preserves all existing database users: checks each test account individually by
 *    employeeId and email and never deletes users or resets existing passwords.
 * 4. Creates missing local test accounts through HrAdminService + PasswordEncoder so
 *    plaintext passwords are never stored in the database.
 */
@Component
@Profile("local")
@ConditionalOnProperty(name = "app.seed.sample-users.enabled", havingValue = "true", matchIfMissing = false)
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    public record SeedAccountSpec(
            String employeeId,
            String email,
            String name,
            Role role,
            String level,
            String department,
            String designation,
            String branch,
            String joiningDate,
            String avatar
    ) {}

    public static final List<SeedAccountSpec> LOCAL_TEST_ACCOUNTS = List.of(
            new SeedAccountSpec(
                    "DEV-EMP01",
                    "dev.employee@fairmacs.com",
                    "Dev Employee",
                    Role.EMPLOYEE,
                    "P1",
                    "Operations",
                    "Operations Executive",
                    "Corporate HQ",
                    "2025-01-15",
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
            ),
            new SeedAccountSpec(
                    "DEV-MGR01",
                    "dev.manager@fairmacs.com",
                    "Dev Manager",
                    Role.MANAGER,
                    "P3",
                    "Operations",
                    "Operations Manager",
                    "Corporate HQ",
                    "2024-06-01",
                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250"
            ),
            new SeedAccountSpec(
                    "DEV-TRN01",
                    "dev.trainer@fairmacs.com",
                    "Dev Trainer",
                    Role.TRAINER,
                    null,
                    "General",
                    "Senior Trainer",
                    "Corporate HQ",
                    "2024-03-10",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250"
            ),
            new SeedAccountSpec(
                    "DEV-HR01",
                    "dev.hradmin@fairmacs.com",
                    "Dev HR Admin",
                    Role.HR_ADMIN,
                    "P3",
                    "People Operations",
                    "HR Manager",
                    "Corporate HQ",
                    "2023-11-20",
                    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250"
            )
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final HrAdminService hrAdminService;
    private final Environment environment;

    @Value("${app.seed.sample-users.initial-password:}")
    private String configuredInitialPassword = "";

    @Value("${app.seed.sample-users.must-change-password:true}")
    private boolean mustChangePasswordOnSeed = true;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this(
                userRepository,
                passwordEncoder,
                new HrAdminService(userRepository, null, null, passwordEncoder),
                null
        );
    }

    @Autowired
    public DataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            HrAdminService hrAdminService,
            Environment environment
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.hrAdminService = hrAdminService;
        this.environment = environment;
    }

    public void setConfiguredInitialPassword(String configuredInitialPassword) {
        this.configuredInitialPassword = configuredInitialPassword;
    }

    public void setMustChangePasswordOnSeed(boolean mustChangePasswordOnSeed) {
        this.mustChangePasswordOnSeed = mustChangePasswordOnSeed;
    }

    @Override
    public void run(String... args) {
        if (environment != null) {
            if (environment.acceptsProfiles(Profiles.of("prod", "production"))) {
                log.warn("Refusing to run local sample-user seeder because a production profile is active.");
                return;
            }
            if (!environment.acceptsProfiles(Profiles.of("local"))) {
                log.warn("Skipping sample-user seeder because the 'local' profile is not active.");
                return;
            }
        }

        seedMissingLocalTestUsers();
    }

    private void seedMissingLocalTestUsers() {
        String customPassword = configuredInitialPassword != null ? configuredInitialPassword.trim() : "";
        boolean hasCustomPassword = !customPassword.isBlank();
        if (hasCustomPassword) {
            PasswordSecurityUtil.validatePasswordStrength(customPassword);
        }

        int createdCount = 0;
        int preservedCount = 0;

        for (SeedAccountSpec spec : LOCAL_TEST_ACCOUNTS) {
            boolean existsById = userRepository.existsByEmployeeId(spec.employeeId());
            boolean existsByEmail = userRepository.existsByEmail(spec.email());

            if (existsById || existsByEmail) {
                if (!mustChangePasswordOnSeed) {
                    userRepository.findByEmployeeId(spec.employeeId()).ifPresent((User existingDevUser) -> {
                        if (Boolean.TRUE.equals(existingDevUser.getMustChangePassword())) {
                            existingDevUser.setMustChangePassword(false);
                            userRepository.save(existingDevUser);
                        }
                    });
                }
                preservedCount++;
                log.info(
                        "dev account '{}' ({}) already exists in database; preserving existing record without modification.",
                        spec.employeeId(),
                        spec.role()
                );
                continue;
            }

            String initialPassword = hasCustomPassword
                    ? customPassword
                    : PasswordSecurityUtil.generateSecureTemporaryPassword();

            Map<String, Object> createRequest = new LinkedHashMap<>();
            createRequest.put("id", spec.employeeId());
            createRequest.put("name", spec.name());
            createRequest.put("email", spec.email());
            createRequest.put("password", initialPassword);
            createRequest.put("role", spec.role().name());
            if (spec.level() != null) {
                createRequest.put("level", spec.level());
            }
            createRequest.put("department", spec.department());
            createRequest.put("designation", spec.designation());
            createRequest.put("branch", spec.branch());
            createRequest.put("joiningDate", spec.joiningDate());
            createRequest.put("status", "ACTIVE");
            createRequest.put("avatar", spec.avatar());

            hrAdminService.createEmployee(createRequest);

            if (!mustChangePasswordOnSeed) {
                userRepository.findByEmployeeId(spec.employeeId()).ifPresent((User createdUser) -> {
                    createdUser.setMustChangePassword(false);
                    userRepository.save(createdUser);
                });
            }

            createdCount++;
            if (!hasCustomPassword) {
                log.info(
                        "[DEV-ONLY] Created {} test account -> Employee ID: {} | Email: {} | Temp Password: {} | mustChangePassword: {}",
                        spec.role(),
                        spec.employeeId(),
                        spec.email(),
                        initialPassword,
                        mustChangePasswordOnSeed
                );
            } else {
                log.info(
                        "[DEV-ONLY] Created {} test account -> Employee ID: {} | Email: {} | mustChangePassword: {}",
                        spec.role(),
                        spec.employeeId(),
                        spec.email(),
                        mustChangePasswordOnSeed
                );
            }
        }

        log.info(
                "development account seed check complete (created={}, preservedExisting={}).",
                createdCount,
                preservedCount
        );
    }
}
