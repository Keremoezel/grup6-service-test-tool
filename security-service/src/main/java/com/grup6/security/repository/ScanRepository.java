package com.grup6.security.repository;

import com.grup6.security.model.ScanResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanRepository extends JpaRepository<ScanResultEntity, String> {
    List<ScanResultEntity> findAllByOrderByTimestampDesc();
}
