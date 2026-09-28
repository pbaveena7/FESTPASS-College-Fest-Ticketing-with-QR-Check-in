package com.example.festpass.service;

import com.example.festpass.model.FestEvent;
import com.example.festpass.repository.FestEventRepository;
import com.example.festpass.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class FestEventService {

    private final FestEventRepository festEventRepository;
    private final TicketRepository ticketRepository;

    public FestEventService(FestEventRepository festEventRepository, TicketRepository ticketRepository) {
        this.festEventRepository = festEventRepository;
        this.ticketRepository = ticketRepository;
    }

    public FestEvent createEvent(FestEvent event) {
        return festEventRepository.save(event);
    }

    public List<FestEvent> getAllEvents() {
        return festEventRepository.findAll();
    }

    public Optional<FestEvent> getEventById(Long id) {
        return festEventRepository.findById(id);
    }

    public FestEvent updateEvent(Long id, FestEvent eventDetails) {
        FestEvent event = festEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        event.setName(eventDetails.getName());
        event.setDate(eventDetails.getDate());
        event.setVenue(eventDetails.getVenue());
        event.setCapacity(eventDetails.getCapacity());
        event.setTicketPrice(eventDetails.getTicketPrice());

        return festEventRepository.save(event);
    }

    @Transactional
    public void deleteEvent(Long id) {
        FestEvent event = festEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        ticketRepository.deleteAllByEvent_Id(id);
        festEventRepository.delete(event);
    }
}
