package com.example.festpass.controller;

import com.example.festpass.model.Attendee;
import com.example.festpass.service.AttendeeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/festpass/attendees")
public class AttendeeController {

    private final AttendeeService attendeeService;

    public AttendeeController(AttendeeService attendeeService) {
        this.attendeeService = attendeeService;
    }

    @PostMapping
    public ResponseEntity<Attendee> createAttendee(@RequestBody Attendee attendee) {
        return new ResponseEntity<>(attendeeService.createAttendee(attendee), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Attendee>> getAllAttendees() {
        return new ResponseEntity<>(attendeeService.getAllAttendees(), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Attendee> getAttendeeById(@PathVariable Long id) {
        return attendeeService.getAttendeeById(id)
                .map(attendee -> new ResponseEntity<>(attendee, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Attendee> updateAttendee(@PathVariable Long id, @RequestBody Attendee attendeeDetails) {
        return new ResponseEntity<>(attendeeService.updateAttendee(id, attendeeDetails), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttendee(@PathVariable Long id) {
        attendeeService.deleteAttendee(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }
}
