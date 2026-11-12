package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.ManagerReportDTO;
import com.fairmacs.lms.dto.TeamMemberReportDTO;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ManagerReportService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    public ManagerReportService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository
    ) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    public ManagerReportDTO getManagerReport(Long managerId) {

        User manager = userRepository.findById(managerId)
                .orElseThrow(() ->
                        new RuntimeException("Manager not found")
                );

        if (manager.getRole() != Role.MANAGER) {
            throw new RuntimeException(
                    "User is not a manager"
            );
        }

        String department = manager.getDepartment();

        if (department == null || department.isBlank()) {
            throw new RuntimeException(
                    "Manager has no department assigned"
            );
        }

        List<User> teamMembers =
                userRepository.findByDepartmentIgnoreCaseAndRole(
                        department,
                        Role.EMPLOYEE
                );

        List<Enrollment> enrollments =
                enrollmentRepository
                        .findActiveEmployeeEnrollmentsByDepartment(
                                department
                        )
                        .stream()
                        .filter(e -> e.getStatus() != com.fairmacs.lms.entity.EnrollmentStatus.REVOKED)
                        .toList();

        Map<Long, List<Enrollment>> employeeEnrollments =
                new HashMap<>();

        for (Enrollment enrollment : enrollments) {

            Long userId =
                    enrollment.getUser().getId();

            employeeEnrollments
                    .computeIfAbsent(
                            userId,
                            key -> new ArrayList<>()
                    )
                    .add(enrollment);
        }

        List<TeamMemberReportDTO> members =
                new ArrayList<>();

        int totalProgress = 0;
        int progressCount = 0;

        int mandatoryTotal = 0;
        int mandatoryCompleted = 0;

        int totalScore = 0;
        int scoreCount = 0;

        for (User employee : teamMembers) {

            List<Enrollment> employeeCourses =
                    employeeEnrollments.getOrDefault(
                            employee.getId(),
                            List.of()
                    );

            int assigned = employeeCourses.size();

            int completed = 0;
            int progress = 0;

            for (Enrollment enrollment : employeeCourses) {

                Integer enrollmentProgress =
                        enrollment.getProgressPercent();

                if (enrollmentProgress != null) {
                    progress += enrollmentProgress;
                    totalProgress += enrollmentProgress;
                    progressCount++;
                }

                if (enrollment.getStatus()
                        == com.fairmacs.lms.entity.EnrollmentStatus.COMPLETED) {

                    completed++;
                }

                if (enrollment.getEnrollmentType()
                        == EnrollmentType.MANDATORY) {

                    mandatoryTotal++;

                    if (enrollment.getStatus()
                            == com.fairmacs.lms.entity.EnrollmentStatus.COMPLETED) {

                        mandatoryCompleted++;
                    }
                }

                if (enrollment.getScore() != null) {
                    totalScore += enrollment.getScore();
                    scoreCount++;
                }
            }

            if (assigned > 0) {
                progress = Math.round(
                        (float) progress / assigned
                );
            }

            String status;

            if (assigned == 0) {
                status = "NO TRAINING";
            } else if (completed == assigned) {
                status = "COMPLIANT";
            } else if (progress >= 70) {
                status = "ON TRACK";
            } else {
                status = "ACTION NEEDED";
            }

            members.add(
                    new TeamMemberReportDTO(
                            employee.getId(),
                            employee.getEmployeeId(),
                            employee.getName(),
                            employee.getDesignation(),
                            assigned,
                            completed,
                            progress,
                            status
                    )
            );
        }

        int overallCompletion =
                progressCount == 0
                        ? 0
                        : Math.round(
                                (float) totalProgress
                                        / progressCount
                        );

        int mandatoryCompliance =
                mandatoryTotal == 0
                        ? 0
                        : Math.round(
                                (float) mandatoryCompleted
                                        * 100
                                        / mandatoryTotal
                        );

        int assessmentPerformance =
                scoreCount == 0
                        ? 0
                        : Math.round(
                                (float) totalScore
                                        / scoreCount
                        );

        return new ManagerReportDTO(
                teamMembers.size(),
                overallCompletion,
                mandatoryCompliance,
                assessmentPerformance,
                members
        );
    }
}