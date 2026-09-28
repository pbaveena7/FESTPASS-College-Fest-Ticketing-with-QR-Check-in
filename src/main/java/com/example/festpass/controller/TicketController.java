package com.example.festpass.controller;

import com.example.festpass.model.Ticket;
import com.example.festpass.service.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/festpass/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    public ResponseEntity<Ticket> generateTicket(@RequestBody Map<String, Long> request) {
        Long eventId = request.get("eventId");
        Long attendeeId = request.get("attendeeId");
        if (eventId == null || attendeeId == null) {
            throw new com.example.festpass.exception.BadRequestException("eventId and attendeeId are required");
        }
        return new ResponseEntity<>(ticketService.generateTicket(eventId, attendeeId), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> getAllTickets() {
        return new ResponseEntity<>(ticketService.getAllTickets(), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id) {
        return new ResponseEntity<>(ticketService.getTicketById(id), HttpStatus.OK);
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
