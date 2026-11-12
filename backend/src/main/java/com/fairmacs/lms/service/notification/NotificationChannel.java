package com.fairmacs.lms.service.notification;

import com.fairmacs.lms.entity.Notification;

/**
 * Delivery channel abstraction for Fairmacs LMS notifications.
 */
public interface NotificationChannel {

    String getChannelName();

    boolean isEnabled();

    void deliver(Notification notification);
}

