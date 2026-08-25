package com.example.unithon

import org.springframework.data.jpa.repository.JpaRepository

interface QuestionAnswerRepository : JpaRepository<QuestionAnswer, Long> {
    fun findByQuestionSeqOrderByCreatedAtAsc(questionSeq: Long): List<QuestionAnswer>
}
