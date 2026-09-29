package com.example.festpass.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.festpass.model.Attendee;
import com.example.festpass.repository.AttendeeRepository;
import com.example.festpass.repository.TicketRepository;
import com.example.festpass.repository.UserRepository;

@Service
public class AttendeeService {

    private final AttendeeRepository attendeeRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    public AttendeeService(AttendeeRepository attendeeRepository, TicketRepository ticketRepository,
                           UserRepository userRepository) {
        this.attendeeRepository = attendeeRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    public Attendee createAttendee(Attendee attendee) {
        return attendeeRepository.save(attendee);
    }

    public List<Attendee> getAllAttendees() {
        return attendeeRepository.findAll();
    }

    public Optional<Attendee> getAttendeeById(Long id) {
        return attendeeRepository.findById(id);
    }

    public Attendee updateAttendee(Long id, Attendee attendeeDetails) {
        Attendee attendee = attendeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attendee not found"));

        attendee.setName(attendeeDetails.getName());
        attendee.setEmail(attendeeDetails.getEmail());
        attendee.setPhone(attendeeDetails.getPhone());

        return attendeeRepository.save(attendee);
    }

    @Transactional
    public void deleteAttendee(Long id) {
        Attendee attendee = attendeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attendee not found"));
        userRepository.findByAttendee_Id(id).ifPresent(user -> {
            user.setAttendee(null);
            userRepository.save(user);
        });
        ticketRepository.deleteAllByAttendee_Id(id);
        attendeeRepository.delete(attendee);
    }
}
