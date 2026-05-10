package com.grup6.chaos.repository;

import com.grup6.chaos.model.ChaosMode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChaosModeRepository extends JpaRepository<ChaosMode, String> {
}
