package com.example.festpass.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.festpass.model.FestEvent;
import com.example.festpass.model.Ticket;
import com.example.festpass.model.TicketStatus;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    
    Optional<Ticket> findByQrCode(String qrCode);

    List<Ticket> findAllByAttendee_IdOrderByIssuedDateDesc(Long attendeeId);

    void deleteAllByEvent_Id(Long eventId);

    void deleteAllByAttendee_Id(Long attendeeId);

    long countByEvent(FestEvent event);

    long countByEventAndStatus(FestEvent event, TicketStatus status);
}
