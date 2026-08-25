package com.example.unithon

import org.springframework.data.jpa.repository.JpaRepository

interface CardRepository : JpaRepository<Card, Long> {
    fun findByUserSeqInOrderByCreatedAtDesc(userSeqs: Collection<Long>): List<Card>
}
