package com.example.unithon

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

data class QuestionRequest(
    val userSeq: Long,
    val cardSeq: Long?,
    val category: String?,
    val targetPart: String,
    val content: String,
)

data class QuestionResponse(val questionSeq: Long)

data class AnswerRequest(val userSeq: Long, val content: String)

data class AnswerResponse(val answerSeq: Long, val createdAt: LocalDateTime)

@RestController
class QuestionController(private val questionService: QuestionService) {

    @PostMapping("/api/questions")
    fun askQuestion(@RequestBody request: QuestionRequest): QuestionResponse {
        val question = questionService.askQuestion(
            userSeq = request.userSeq,
            cardSeq = request.cardSeq,
            category = request.category,
            targetPart = request.targetPart,
            content = request.content,
        )
        return QuestionResponse(questionSeq = requireNotNull(question.seq))
    }

    @PostMapping("/api/questions/{questionSeq}/answers")
    fun answerQuestion(
        @PathVariable questionSeq: Long,
        @RequestBody request: AnswerRequest,
    ): AnswerResponse {
        val answer = questionService.answerQuestion(questionSeq, request.userSeq, request.content)
        return AnswerResponse(answerSeq = requireNotNull(answer.seq), createdAt = answer.createdAt)
    }

    @GetMapping("/api/questions")
    fun getQuestions(@RequestParam(required = false) cardSeq: Long?): List<QuestionListItem> =
        questionService.listQuestions(cardSeq)

    @GetMapping("/api/questions/{questionSeq}/answers")
    fun getAnswers(@PathVariable questionSeq: Long): List<AnswerListItem> =
        questionService.listAnswers(questionSeq)
}
