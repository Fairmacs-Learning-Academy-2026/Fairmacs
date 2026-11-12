package com.fairmacs.lms;

import com.fairmacs.lms.entity.Notification;
import com.fairmacs.lms.entity.NotificationPriority;
import com.fairmacs.lms.entity.NotificationType;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.NotificationRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class FairmacsLmsApplicationStartupTest {

    @Test
    @DisplayName("Verify Spring Boot ApplicationContext boots and NotificationRepository resolves all queries")
    void verifySpringBootApplicationStartupAndNotificationQueries() {
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(FairmacsLmsApplication.class)
                .properties(
                        "server.port=0",
                        "spring.main.banner-mode=off",
                        "app.notifications.scheduler.enabled=false",
                        "app.notifications.email.enabled=false"
                )
                .run("--server.port=0")) {

            assertNotNull(context, "ApplicationContext must not be null");
            assertTrue(context.isRunning(), "ApplicationContext must be active and running");

            NotificationRepository notificationRepository = context.getBean(NotificationRepository.class);
            UserRepository userRepository = context.getBean(UserRepository.class);
            NotificationService notificationService = context.getBean(NotificationService.class);

            assertNotNull(notificationRepository, "NotificationRepository bean must be initialized");
            assertNotNull(notificationService, "NotificationService bean must be initialized");

            System.out.println("=== Spring Boot ApplicationContext successfully started! ===");
            System.out.println("NotificationRepository bean: " + notificationRepository.getClass().getName());

            // 1. Verify query creation for findByIdAndRecipientId
            Optional<Notification> nonExistent = notificationRepository.findByIdAndRecipientId(999999999L, 999999999L);
            assertTrue(nonExistent.isEmpty(), "Non-existent notification must return Optional.empty()");

            // 2. Verify query creation for findByIdAndRecipient_Id
            Optional<Notification> nonExistentUnderscore = notificationRepository.findByIdAndRecipient_Id(999999999L, 999999999L);
            assertTrue(nonExistentUnderscore.isEmpty(), "Non-existent notification must return Optional.empty()");

            // 3. Verify query creation for findByRecipientIdOrderByCreatedAtDesc
            List<Notification> emptyList = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(999999999L);
            assertNotNull(emptyList);
            assertTrue(emptyList.isEmpty());

            // 4. Verify query creation for findByRecipient_IdOrderByCreatedAtDesc
            List<Notification> emptyListUnderscore = notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(999999999L);
            assertNotNull(emptyListUnderscore);
            assertTrue(emptyListUnderscore.isEmpty());

            // 5. Verify query creation for countByRecipientIdAndReadFalse
            long count = notificationRepository.countByRecipientIdAndReadFalse(999999999L);
            assertEquals(0L, count);

            // 6. Test real notification persistence and recipient ownership enforcement
            List<User> existingUsers = userRepository.findAll();
            if (existingUsers.size() >= 2) {
                User user1 = existingUsers.get(0);
                User user2 = existingUsers.get(1);

                String testDedup = "test:startup-verify:" + System.currentTimeMillis();
                Notification n = new Notification(
                        user1,
                        "Startup Verification Test",
                        "Testing findByIdAndRecipientId query with real database",
                        NotificationType.SYSTEM_ALERT
                );
                n.setPriority(NotificationPriority.LOW);
                n.setDeduplicationKey(testDedup);
                final Notification saved = notificationRepository.save(n);
                assertNotNull(saved.getId(), "Persisted notification must have an ID");

                try {
                    // Recipient user1 CAN locate it
                    Optional<Notification> foundByUser1 = notificationRepository.findByIdAndRecipientId(saved.getId(), user1.getId());
                    assertTrue(foundByUser1.isPresent(), "Owner user1 must be able to locate their notification");
                    assertEquals(saved.getId(), foundByUser1.get().getId());

                    // Cross-user access: user2 CANNOT locate user1's notification
                    Optional<Notification> foundByUser2 = notificationRepository.findByIdAndRecipientId(saved.getId(), user2.getId());
                    assertTrue(foundByUser2.isEmpty(), "Cross-user query by user2 must return Optional.empty()");

                    // Also verify findByIdAndRecipient_Id
                    Optional<Notification> foundByUnderscore1 = notificationRepository.findByIdAndRecipient_Id(saved.getId(), user1.getId());
                    assertTrue(foundByUnderscore1.isPresent());

                    Optional<Notification> foundByUnderscore2 = notificationRepository.findByIdAndRecipient_Id(saved.getId(), user2.getId());
                    assertTrue(foundByUnderscore2.isEmpty(), "Cross-user query with property traversal must also reject");

                    // Verify markAsRead via service
                    Notification marked = notificationService.markAsRead(saved.getId(), user1.getId());
                    assertTrue(marked.getRead());

                    // Verify cross-user markAsRead fails
                    assertThrows(Exception.class, () -> notificationService.markAsRead(saved.getId(), user2.getId()));

                    // Verify dismissNotification via service
                    notificationService.dismissNotification(saved.getId(), user1.getId());
                    assertTrue(notificationRepository.findById(saved.getId()).isEmpty(), "Dismissed notification must be deleted");

                    System.out.println("=== All NotificationRepository queries and recipient ownership checks VERIFIED! ===");
                } finally {
                    // Clean up test notification if still present
                    notificationRepository.findById(saved.getId()).ifPresent(notificationRepository::delete);
                }
            }
        }
    }
}
