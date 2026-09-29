package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CertificateService {

    private final CertificateRepository certificateRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SecurityContextUtil securityContextUtil;
    private final Random random = new Random();

    public CertificateService(CertificateRepository certificateRepository,
            UserRepository userRepository,
            CourseRepository courseRepository,
            SecurityContextUtil securityContextUtil) {
        this.certificateRepository = certificateRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.securityContextUtil = securityContextUtil;
    }

    private String generateCertificateId() {
        int year = Year.now().getValue();
        int maxAttempts = 5;
        for (int i = 0; i < maxAttempts; i++) {
            String candidate = String.format("FM-CERT-%d-%04d", year, random.nextInt(10000));
            if (!certificateRepository.existsByCertificateId(candidate)) {
                return candidate;
            }
        }
        String fallback = String.format("FM-CERT-%d-%08d", year, System.nanoTime() % 100000000L);
        return fallback;
    }

    @Transactional
    public Certificate createCertificate(Long userId, Long courseId, Integer score) {
        if (certificateRepository.existsByUserIdAndCourseId(userId, courseId)) {
            Certificate existing = certificateRepository.findByUserId(userId).stream()
                    .filter(c -> c.getCourse().getId().equals(courseId))
                    .findFirst()
                    .orElse(null);
            if (existing != null) {
                return existing;
            }
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));

        Certificate certificate = new Certificate();
        certificate.setUser(user);
        certificate.setCourse(course);
        certificate.setScore(score);

        int attempts = 0;
        while (attempts < 3) {
            try {
                certificate.setCertificateId(generateCertificateId());
                return certificateRepository.save(certificate);
            } catch (DataIntegrityViolationException e) {
                attempts++;
                if (attempts >= 3)
                    throw e;
            }
        }
        return certificate;
    }

    @Transactional(readOnly = true)
    public CertificateDTO verifyCertificate(String certificateId) {
        Certificate cert = certificateRepository.findByCertificateIdWithDetails(certificateId)
                .orElseThrow(() -> new ResourceNotFoundException("Certificate", "certificateId", certificateId));

        Long currentUserId = securityContextUtil.getCurrentUserId();
        String currentRole = securityContextUtil.getCurrentUserRole();

        boolean isOwner = cert.getUser().getId().equals(currentUserId);
        boolean isManagerOrHr = Role.MANAGER.name().equalsIgnoreCase(currentRole)
                || Role.HR_ADMIN.name().equalsIgnoreCase(currentRole);

        if (!isOwner && !isManagerOrHr) {
            throw new SecurityException("You are not authorized to view this certificate.");
        }

        return toDTO(cert);
    }

    @Transactional(readOnly = true)
    public List<CertificateDTO> getCertificatesByUser(Long targetUserId) {
        Long currentUserId = securityContextUtil.getCurrentUserId();
        String currentRole = securityContextUtil.getCurrentUserRole();
        boolean isHr = Role.HR_ADMIN.name().equalsIgnoreCase(currentRole);
        boolean isManager = Role.MANAGER.name().equalsIgnoreCase(currentRole);
        boolean isSelf = targetUserId.equals(currentUserId);

        if (!isSelf && !isManager && !isHr) {
            throw new SecurityException("You are not authorized to view certificates for this user.");
        }

        if (isManager && !isSelf && !isHr) {
            User currentUser = securityContextUtil.getCurrentUser();
            User targetUser = userRepository.findById(targetUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));
            if (currentUser != null && targetUser.getDepartment() != null
                    && !targetUser.getDepartment().equals(currentUser.getDepartment())) {
                throw new SecurityException("Managers may only view certificates within their own department.");
            }
        }

        List<Certificate> certs = certificateRepository.findByUserIdWithCourse(targetUserId);
        return certs.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CertificateDTO> getRecentCertificates(int limit) {
        if (!securityContextUtil.isManagerOrHr()) {
            throw new SecurityException("Only Manager and HR roles may access recent certificates.");
        }
        List<Certificate> certs = certificateRepository.findAll();
        certs.sort((a, b) -> {
            if (a.getIssuedAt() == null)
                return 1;
            if (b.getIssuedAt() == null)
                return -1;
            return b.getIssuedAt().compareTo(a.getIssuedAt());
        });
        return certs.stream().limit(limit).map(this::toDTO).collect(Collectors.toList());
    }

    private CertificateDTO toDTO(Certificate cert) {
        CertificateDTO dto = new CertificateDTO();
        dto.setId(cert.getId());
        dto.setCertificateId(cert.getCertificateId());
        dto.setScore(cert.getScore());
        dto.setPdfUrl(cert.getPdfUrl());
        dto.setIssuedAt(cert.getIssuedAt());
        if (cert.getUser() != null) {
            dto.setUserId(cert.getUser().getId());
            dto.setEmployeeId(cert.getUser().getEmployeeId());
            dto.setUserName(cert.getUser().getName());
            dto.setDepartment(cert.getUser().getDepartment());
            dto.setDesignation(cert.getUser().getDesignation());
        }
        if (cert.getCourse() != null) {
            dto.setCourseId(cert.getCourse().getId());
            dto.setCourseTitle(cert.getCourse().getTitle());
            dto.setCourseCategory(cert.getCourse().getCategory());
        }
        return dto;
    }
}
