package com.example.festpass.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.festpass.model.User;
import com.example.festpass.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final CookieCsrfTokenRepository csrfTokenRepository;

    public AuthController(AuthenticationManager authenticationManager, UserService userService,
                          SecurityContextRepository securityContextRepository,
                          SessionAuthenticationStrategy sessionAuthenticationStrategy,
                          CookieCsrfTokenRepository csrfTokenRepository) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @PostMapping("/register")
    public ResponseEntity<AccountResponse> register(@RequestBody RegisterRequest request) {
        User user = userService.register(request.name(), request.email(), request.password(),
                request.confirmPassword(), request.role(), request.organizerCode());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest servletRequest,
                                   HttpServletResponse servletResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
            sessionAuthenticationStrategy.onAuthentication(authentication, servletRequest, servletResponse);
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, servletRequest, servletResponse);
            csrfTokenRepository.saveToken(null, servletRequest, servletResponse);
            return ResponseEntity.ok(toResponse(userService.getByEmail(authentication.getName())));
        } catch (AuthenticationException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password."));
        }
    }

    @GetMapping("/me")
    public AccountResponse me(Authentication authentication) {
        return toResponse(userService.getByEmail(authentication.getName()));
    }

    @GetMapping("/profile")
    public AccountResponse profile(Authentication authentication) {
        return toResponse(userService.getByEmail(authentication.getName()));
    }

    @PutMapping("/profile")
    public AccountResponse updateProfile(Authentication authentication, @RequestBody ProfileRequest request,
                                         HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        User user = userService.updateProfile(authentication.getName(), request.name(), request.email(), request.phone());
        var userDetails = userService.loadUserByUsername(user.getEmail());
        Authentication updatedAuthentication = UsernamePasswordAuthenticationToken.authenticated(
                userDetails, null, userDetails.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(updatedAuthentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        return toResponse(user);
    }

    private AccountResponse toResponse(User user) {
        Long attendeeId = user.getAttendee() == null ? null : user.getAttendee().getId();
        String phone = user.getAttendee() == null ? null : user.getAttendee().getPhone();
        return new AccountResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name(), attendeeId, phone);
    }

    public record RegisterRequest(String name, String email, String password, String confirmPassword,
                                  String role, String organizerCode) {
    }

    public record LoginRequest(String email, String password) {
    }

    public record ProfileRequest(String name, String email, String phone) {
    }

    public record AccountResponse(Long id, String name, String email, String role, Long attendeeId, String phone) {
    }
}