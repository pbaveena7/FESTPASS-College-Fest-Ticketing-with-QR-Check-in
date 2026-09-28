package com.example.festpass.service;

import com.example.festpass.exception.BadRequestException;
import com.example.festpass.exception.ResourceNotFoundException;
import com.example.festpass.model.Attendee;
import com.example.festpass.model.FestEvent;
import com.example.festpass.model.Ticket;
import com.example.festpass.model.TicketStatus;
import com.example.festpass.repository.AttendeeRepository;
import com.example.festpass.repository.FestEventRepository;
import com.example.festpass.repository.TicketRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final FestEventRepository festEventRepository;
    private final AttendeeRepository attendeeRepository;

    public TicketService(TicketRepository ticketRepository, FestEventRepository festEventRepository, AttendeeRepository attendeeRepository) {
        this.ticketRepository = ticketRepository;
        this.festEventRepository = festEventRepository;
        this.attendeeRepository = attendeeRepository;
    }

    public Ticket generateTicket(Long eventId, Long attendeeId) {
        FestEvent event = festEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        Attendee attendee = attendeeRepository.findById(attendeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Attendee not found"));

        long ticketsIssued = ticketRepository.countByEvent(event);

        if (ticketsIssued >= event.getCapacity()) {
            throw new BadRequestException("Event capacity reached. No more tickets can be issued.");
        }

        Ticket ticket = new Ticket();
        ticket.setEvent(event);
        ticket.setAttendee(attendee);
        ticket.setQrCode("FP-" + UUID.randomUUID().toString());
        ticket.setStatus(TicketStatus.VALID);
        ticket.setIssuedDate(LocalDate.now());

        return ticketRepository.save(ticket);
    }

    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    public Ticket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
    }

    public Map<String, Object> checkIn(String qrCode) {
        Ticket ticket = ticketRepository.findByQrCode(qrCode)
                .orElseThrow(() -> new BadRequestException("Invalid QR code. Ticket not found."));

        if (ticket.getStatus() == TicketStatus.USED) {
            throw new BadRequestException("Ticket has already been used. Entry denied.");
        }

        ticket.setStatus(TicketStatus.USED);
        ticketRepository.save(ticket);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Entry allowed. Ticket validated successfully.");
        response.put("ticketId", ticket.getId());
        response.put("status", "USED");
        
        return response;
    }

    public Map<String, Object> getEventAttendance(Long eventId) {
        FestEvent event = festEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        long ticketsIssued = ticketRepository.countByEvent(event);
        long checkedIn = ticketRepository.countByEventAndStatus(event, TicketStatus.USED);
        long remainingCapacity = event.getCapacity() - checkedIn;

        Map<String, Object> response = new HashMap<>();
        response.put("eventId", event.getId());
        response.put("eventName", event.getName());
        response.put("capacity", event.getCapacity());
        response.put("ticketsIssued", ticketsIssued);
        response.put("checkedIn", checkedIn);
        response.put("remainingCapacity", remainingCapacity);

        return response;
    }
}
