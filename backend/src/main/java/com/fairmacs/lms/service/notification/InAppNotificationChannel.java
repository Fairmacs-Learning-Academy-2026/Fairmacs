package com.fairmacs.lms.service.notification;

import com.fairmacs.lms.entity.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Primary active delivery channel: In-App Notification Centre.
 * Persistence is coordinated by NotificationService; this channel confirms in-app delivery.
 */
@Component
public class InAppNotificationChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(InAppNotificationChannel.class);

    @Override
    public String getChannelName() {
        return "IN_APP";
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public void deliver(Notification notification) {
        if (notification == null) {
            return;
        }
        log.debug(
                "In-app notification delivered [id={}, type={}, priority={}, recipientUserId={}]",
                notification.getId(),
                notification.getType(),
                notification.getPriority(),
                notification.getRecipientUserId()
        );
    }
}

