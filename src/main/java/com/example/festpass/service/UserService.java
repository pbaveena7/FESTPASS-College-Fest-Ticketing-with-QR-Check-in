package com.example.festpass.service;

import com.example.festpass.exception.BadRequestException;
import com.example.festpass.exception.ResourceNotFoundException;
import com.example.festpass.model.Attendee;
import com.example.festpass.model.User;
import com.example.festpass.model.UserRole;
import com.example.festpass.repository.AttendeeRepository;
import com.example.festpass.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class UserService implements UserDetailsService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UserRepository userRepository;
    private final AttendeeRepository attendeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final String organizerRegistrationCode;

    public UserService(UserRepository userRepository, AttendeeRepository attendeeRepository,
                       PasswordEncoder passwordEncoder,
                       @Value("${festpass.organizer-registration-code:}") String organizerRegistrationCode) {
        this.userRepository = userRepository;
        this.attendeeRepository = attendeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.organizerRegistrationCode = organizerRegistrationCode;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
        return org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(user.getRole().name())
                .build();
    }

    @Transactional
    public User register(String name, String email, String password, String confirmPassword,
                         String requestedRole, String providedOrganizerCode) {
        String cleanName = name == null ? "" : name.trim();
        String normalizedEmail = normalizeEmail(email);
        if (cleanName.isBlank()) throw new BadRequestException("Name is required.");
        if (cleanName.length() > 120) throw new BadRequestException("Name must be 120 characters or fewer.");
        if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) throw new BadRequestException("Enter a valid email address.");
        if (password == null || password.length() < 8) throw new BadRequestException("Password must be at least 8 characters.");
        if (!password.equals(confirmPassword)) throw new BadRequestException("Passwords do not match.");
        if (requestedRole == null || requestedRole.isBlank()) throw new BadRequestException("Select an account role.");

        UserRole role;
        try {
            role = UserRole.valueOf(requestedRole.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Select a valid account role.");
        }

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("An account with this email already exists.");
        }
        if (role == UserRole.ORGANIZER && (organizerRegistrationCode.isBlank()
                || providedOrganizerCode == null
                || !organizerRegistrationCode.equals(providedOrganizerCode))) {
            throw new BadRequestException("Organizer registration requires a valid organizer enrollment code.");
        }

        User user = new User(cleanName, normalizedEmail, passwordEncoder.encode(password), role);
        if (role == UserRole.ATTENDEE) {
            Attendee attendee = attendeeRepository.save(new Attendee(cleanName, normalizedEmail, ""));
            user.setAttendee(attendee);
        }
        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new BadRequestException("An account with this email already exists.");
        }
    }

    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    @Transactional
    public User updateProfile(String email, String name, String updatedEmail, String phone) {
        User user = getByEmail(email);
        String cleanName = name == null ? "" : name.trim();
        String normalizedEmail = normalizeEmail(updatedEmail);
        if (cleanName.isBlank()) throw new BadRequestException("Name is required.");
        if (cleanName.length() > 120) throw new BadRequestException("Name must be 120 characters or fewer.");
        if (!EMAIL_PATTERN.matcher(normalizedEmail).matches()) throw new BadRequestException("Enter a valid email address.");
        if (userRepository.findByEmail(normalizedEmail).filter(existing -> !existing.getId().equals(user.getId())).isPresent()) {
            throw new BadRequestException("An account with this email already exists.");
        }

        user.setName(cleanName);
        user.setEmail(normalizedEmail);
        if (user.getRole() == UserRole.ATTENDEE) {
            String cleanPhone = phone == null ? "" : phone.trim();
            if (cleanPhone.isBlank()) throw new BadRequestException("Phone number is required for attendee profiles.");
            Attendee attendee = user.getAttendee();
            if (attendee == null) {
                attendee = new Attendee(cleanName, normalizedEmail, cleanPhone);
                attendee = attendeeRepository.save(attendee);
                user.setAttendee(attendee);
            } else {
                attendee.setName(cleanName);
                attendee.setEmail(normalizedEmail);
                attendee.setPhone(cleanPhone);
            }
        }
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Long getAttendeeId(String email) {
        User user = getByEmail(email);
        return user.getAttendee() == null ? null : user.getAttendee().getId();
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}