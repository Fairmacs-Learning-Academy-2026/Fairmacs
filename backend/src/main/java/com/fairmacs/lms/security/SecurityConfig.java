package com.fairmacs.lms.security;

import java.util.Arrays;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write(
                                    "{\"success\":false,\"message\":\"Authentication is required to access this resource.\"}"
                            );
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write(
                                    "{\"success\":false,\"message\":\"You do not have permission to perform this action.\"}"
                            );
                        })
                )

                .authorizeHttpRequests(auth -> auth
                        // CORS preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Only POST /api/auth/login is public under /api/auth/**
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/**").authenticated()

                        // Zoho OAuth callback: Zoho redirects here without the Fairmacs LMS JWT
                        .requestMatchers("/api/integrations/zoho/callback").permitAll()

                        // Public course thumbnails for browser img rendering
                        .requestMatchers(HttpMethod.GET, "/api/courses/thumbnails/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/api/courses/thumbnails/**").permitAll()

                        // Certificates
                        .requestMatchers("/api/certificates/recent").hasAnyRole("MANAGER", "HR_ADMIN")
                        .requestMatchers("/api/certificates/**").authenticated()

                        // Draft management is restricted strictly to HR_ADMIN and TRAINER
                        .requestMatchers("/api/drafts/**").hasAnyRole("HR_ADMIN", "TRAINER")

                        // Trainer reporting and insights restricted to HR_ADMIN and TRAINER
                        .requestMatchers("/api/trainer/**").hasAnyRole("HR_ADMIN", "TRAINER")

                        // Employee training transcript endpoint enforces self / department / trainer / HR checks in ManagerReportsController
                        .requestMatchers(HttpMethod.GET, "/api/manager/reports/employee/**").hasAnyRole("EMPLOYEE", "MANAGER", "TRAINER", "HR_ADMIN")

                        // Manager reporting restricted to HR_ADMIN and MANAGER
                        .requestMatchers("/api/manager/**").hasAnyRole("HR_ADMIN", "MANAGER")

                        // Trainer and HR Admin can list employees for course assignment; all other /api/hr/** endpoints require HR_ADMIN
                        .requestMatchers(HttpMethod.GET, "/api/hr/employees").hasAnyRole("HR_ADMIN", "TRAINER")
                        .requestMatchers("/api/hr/**").hasRole("HR_ADMIN")

                        // All other LMS APIs require authentication
                        .anyRequest().authenticated()
                )

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(origin -> !origin.isEmpty())
                        .collect(Collectors.toList())
        );

        configuration.setAllowedMethods(
                Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );

        configuration.setAllowedHeaders(
                Arrays.asList("Authorization", "Content-Type", "Accept", "Origin")
        );

        configuration.setExposedHeaders(
                Arrays.asList("Authorization", "Content-Disposition")
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
