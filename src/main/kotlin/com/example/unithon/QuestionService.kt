package com.example.unithon

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

@Service
class QuestionService(
    private val questionRepository: QuestionRepository,
    private val questionAnswerRepository: QuestionAnswerRepository,
) {

    fun askQuestion(
        userSeq: Long,
        cardSeq: Long?,
        category: String?,
        targetPart: String,
        content: String,
    ): Question = questionRepository.save(
        Question(
            userSeq = userSeq,
            cardSeq = cardSeq,
            category = category,
            targetPart = targetPart,
            content = content,
        ),
    )

    fun answerQuestion(questionSeq: Long, userSeq: Long, content: String): QuestionAnswer {
        val question = questionRepository.findById(questionSeq).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다: $questionSeq")
        }
        val answer = questionAnswerRepository.save(
            QuestionAnswer(questionSeq = questionSeq, userSeq = userSeq, content = content),
        )
        question.isAnswer = true
        questionRepository.save(question)
        return answer
    }
}
