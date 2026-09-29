package com.fairmacs.lms.config;

import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            initializeUsers();
        }
    }

    private void initializeUsers() {

        User employee = new User();
        employee.setEmployeeId("EMP1001");
        employee.setEmail("arjun.kumar@fairmacs.com");
        employee.setPassword(passwordEncoder.encode("Employee@123"));
        employee.setName("Arjun Kumar");
        employee.setRole(Role.EMPLOYEE);
        employee.setRoleLabel("Employee");
        employee.setDesignation("Executive");
        employee.setDepartment("Operations");
        employee.setBranch("Corporate HQ");
        employee.setAvatar("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250");
        employee.setJoiningDate("2024-01-15");
        employee.setStatus(UserStatus.ACTIVE);

        User trainer = new User();
        trainer.setEmployeeId("TRN2001");
        trainer.setEmail("ravi.sharma@fairmacs.com");
        trainer.setPassword(passwordEncoder.encode("Trainer@123"));
        trainer.setName("Ravi Sharma");
        trainer.setRole(Role.TRAINER);
        trainer.setRoleLabel("Trainer");
        trainer.setDesignation("Senior Trainer");
        trainer.setDepartment("Training");
        trainer.setBranch("Corporate HQ");
        trainer.setAvatar("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250");
        trainer.setJoiningDate("2023-06-10");
        trainer.setStatus(UserStatus.ACTIVE);

        User manager = new User();
        manager.setEmployeeId("MGR3001");
        manager.setEmail("priya.singh@fairmacs.com");
        manager.setPassword(passwordEncoder.encode("Manager@123"));
        manager.setName("Priya Singh");
        manager.setRole(Role.MANAGER);
        manager.setRoleLabel("Manager");
        manager.setDesignation("Operations Manager");
        manager.setDepartment("Operations");
        manager.setBranch("Corporate HQ");
        manager.setAvatar("https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250");
        manager.setJoiningDate("2022-09-20");
        manager.setStatus(UserStatus.ACTIVE);

        User hrAdmin = new User();
        hrAdmin.setEmployeeId("HR4001");
        hrAdmin.setEmail("anita.desai@fairmacs.com");
        hrAdmin.setPassword(passwordEncoder.encode("Admin@123"));
        hrAdmin.setName("Anita Desai");
        hrAdmin.setRole(Role.HR_ADMIN);
        hrAdmin.setRoleLabel("HR / Admin");
        hrAdmin.setDesignation("HR Manager");
        hrAdmin.setDepartment("Human Resources");
        hrAdmin.setBranch("Corporate HQ");
        hrAdmin.setAvatar("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250");
        hrAdmin.setJoiningDate("2021-03-15");
        hrAdmin.setStatus(UserStatus.ACTIVE);

        userRepository.save(employee);
        userRepository.save(trainer);
        userRepository.save(manager);
        userRepository.save(hrAdmin);

        System.out.println("Sample users initialized successfully!");
    }
}
