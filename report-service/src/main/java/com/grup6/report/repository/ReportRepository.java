package com.grup6.report.repository;

import com.grup6.report.model.ReportEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<ReportEntity, String> {
    Page<ReportEntity> findAllByOrderByGeneratedAtDesc(Pageable pageable);
}
