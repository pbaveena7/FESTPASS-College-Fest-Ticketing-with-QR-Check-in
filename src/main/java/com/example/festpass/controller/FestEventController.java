package com.example.festpass.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.festpass.model.FestEvent;
import com.example.festpass.service.FestEventService;
import com.example.festpass.service.TicketService;

@RestController
@RequestMapping("/api/festpass/events")
public class FestEventController {

    private final FestEventService festEventService;
    private final TicketService ticketService;

    public FestEventController(FestEventService festEventService, TicketService ticketService) {
        this.festEventService = festEventService;
        this.ticketService = ticketService;
    }

    @PostMapping
    public ResponseEntity<FestEvent> createEvent(@RequestBody FestEvent event) {
        return new ResponseEntity<>(festEventService.createEvent(event), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<FestEvent>> getAllEvents() {
        return new ResponseEntity<>(festEventService.getAllEvents(), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FestEvent> getEventById(@PathVariable Long id) {
        return festEventService.getEventById(id)
                .map(event -> new ResponseEntity<>(event, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FestEvent> updateEvent(@PathVariable Long id, @RequestBody FestEvent eventDetails) {
        return new ResponseEntity<>(festEventService.updateEvent(id, eventDetails), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        festEventService.deleteEvent(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping("/{id}/attendance")
    public ResponseEntity<Map<String, Object>> getEventAttendance(@PathVariable Long id) {
        return new ResponseEntity<>(ticketService.getEventAttendance(id), HttpStatus.OK);
    }

    @GetMapping("/{id}/availability")
    public ResponseEntity<Map<String, Object>> getEventAvailability(@PathVariable Long id) {
        return new ResponseEntity<>(ticketService.getEventAvailability(id), HttpStatus.OK);
    }
}
