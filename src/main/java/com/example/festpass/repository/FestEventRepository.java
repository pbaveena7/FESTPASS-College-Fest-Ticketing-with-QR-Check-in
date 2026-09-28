package com.example.festpass.repository;

import com.example.festpass.model.FestEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FestEventRepository extends JpaRepository<FestEvent, Long> {
}
