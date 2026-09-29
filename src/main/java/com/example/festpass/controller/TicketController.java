package com.example.festpass.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.festpass.model.Ticket;
import com.example.festpass.service.TicketService;
import com.example.festpass.service.UserService;

@RestController
@RequestMapping("/api/festpass/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final UserService userService;

    public TicketController(TicketService ticketService, UserService userService) {
        this.ticketService = ticketService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<Ticket> generateTicket(@RequestBody Map<String, Long> request, Authentication authentication) {
        Long eventId = request.get("eventId");
        Long attendeeId = request.get("attendeeId");
        if (eventId == null || attendeeId == null) {
            throw new com.example.festpass.exception.BadRequestException("eventId and attendeeId are required");
        }
        if (authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ATTENDEE"))) {
            Long ownAttendeeId = userService.getAttendeeId(authentication.getName());
            if (ownAttendeeId == null || !ownAttendeeId.equals(attendeeId)) {
                throw new AccessDeniedException("Attendees may only register themselves.");
            }
        }
        return new ResponseEntity<>(ticketService.generateTicket(eventId, attendeeId), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> getAllTickets() {
        return new ResponseEntity<>(ticketService.getAllTickets(), HttpStatus.OK);
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Ticket>> getMyTickets(Authentication authentication) {
        Long attendeeId = userService.getAttendeeId(authentication.getName());
        if (attendeeId == null) throw new AccessDeniedException("This attendee account has no linked profile.");
        return new ResponseEntity<>(ticketService.getTicketsByAttendee(attendeeId), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id, Authentication authentication) {
        Ticket ticket = ticketService.getTicketById(id);
        if (authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ATTENDEE"))) {
            Long ownAttendeeId = userService.getAttendeeId(authentication.getName());
            if (ownAttendeeId == null || !ownAttendeeId.equals(ticket.getAttendee().getId())) {
                throw new AccessDeniedException("You may only access your own tickets.");
            }
        }
        return new ResponseEntity<>(ticket, HttpStatus.OK);
    }

    @PostMapping("/check-in")
    public ResponseEntity<Map<String, Object>> checkIn(@RequestBody Map<String, String> request) {
        String qrCode = request.get("qrCode");
        if (qrCode == null || qrCode.isEmpty()) {
            throw new com.example.festpass.exception.BadRequestException("qrCode is required");
        }
        return new ResponseEntity<>(ticketService.checkIn(qrCode), HttpStatus.OK);
    }
}
