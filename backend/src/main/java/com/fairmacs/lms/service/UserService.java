package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.LoginRequest;
import com.fairmacs.lms.dto.LoginResponse;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public LoginResponse login(LoginRequest request) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getLoginId(), request.getPassword()));

        // Find user by email or employee ID
        User user = userRepository.findByEmailOrEmployeeId(request.getLoginId(), request.getLoginId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "loginId", request.getLoginId()));

        // Check if account is active
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new RuntimeException("Account is disabled. Please contact HR Admin.");
        }

        // Generate JWT token
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", user.getId());
        extraClaims.put("role", user.getRole().name());

        String token = jwtService.generateToken(user.getEmail(), extraClaims);

        // Build response
        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setId(user.getId());
        response.setEmployeeId(user.getEmployeeId());
        response.setEmail(user.getEmail());
        response.setName(user.getName());
        response.setRole(user.getRole().name());
        response.setRoleLabel(user.getRoleLabel());
        response.setDesignation(user.getDesignation());
        response.setDepartment(user.getDepartment());
        response.setAvatar(user.getAvatar());

        return response;
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    public User getUserByEmployeeId(String employeeId) {
        return userRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "employeeId", employeeId));
    }
}
