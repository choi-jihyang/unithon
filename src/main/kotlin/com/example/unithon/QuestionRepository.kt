package com.example.unithon

import org.springframework.data.jpa.repository.JpaRepository

interface QuestionRepository : JpaRepository<Question, Long> {
    fun countByCardSeq(cardSeq: Long): Long
}
