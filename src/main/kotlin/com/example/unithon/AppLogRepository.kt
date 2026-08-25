package com.example.unithon

import org.springframework.data.jpa.repository.JpaRepository

interface AppLogRepository : JpaRepository<AppLog, Long> {
    fun findByUserSeqAndStatusOrderByCreatedAtDesc(userSeq: Long, status: String): List<AppLog>
}
