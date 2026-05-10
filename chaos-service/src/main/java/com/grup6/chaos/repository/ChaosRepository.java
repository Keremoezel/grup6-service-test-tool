package com.grup6.chaos.repository;

import com.grup6.chaos.model.ChaosEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChaosRepository extends JpaRepository<ChaosEvent, String> {
    List<ChaosEvent> findAllByOrderByTimestampDesc();
}
