package com.fairmacs.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FairmacsLmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(FairmacsLmsApplication.class, args);
    }
}
