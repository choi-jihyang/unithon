package com.example.unithon

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime

data class QuestionListItem(
    val questionSeq: Long,
    val userSeq: Long,
    val userName: String,
    val cardSeq: Long?,
    val cardTitle: String?,
    val category: String?,
    val targetPart: String,
    val content: String,
    val isAnswer: Boolean,
    val createdAt: LocalDateTime,
)

data class AnswerListItem(
    val answerSeq: Long,
    val userSeq: Long,
    val userName: String,
    val content: String,
    val createdAt: LocalDateTime,
)

@Service
class QuestionService(
    private val questionRepository: QuestionRepository,
    private val questionAnswerRepository: QuestionAnswerRepository,
    private val userRepository: UserRepository,
    private val cardRepository: CardRepository,
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

    /** F4 질문 이력 목록. cardSeq를 주면 해당 카드 질문만, 안 주면 전체(최신순). */
    fun listQuestions(cardSeq: Long?): List<QuestionListItem> {
        val questions = if (cardSeq != null) {
            questionRepository.findByCardSeqOrderByCreatedAtDesc(cardSeq)
        } else {
            questionRepository.findAllByOrderByCreatedAtDesc()
        }

        val userNames = userRepository.findAllById(questions.map { it.userSeq })
            .associate { it.userSeq to it.name }
        val cardTitles = cardRepository.findAllById(questions.mapNotNull { it.cardSeq }.distinct())
            .associate { it.seq to it.title }

        return questions.map { q ->
            QuestionListItem(
                questionSeq = requireNotNull(q.seq),
                userSeq = q.userSeq,
                userName = userNames[q.userSeq] ?: "알수없음",
                cardSeq = q.cardSeq,
                cardTitle = q.cardSeq?.let { cardTitles[it] },
                category = q.category,
                targetPart = q.targetPart,
                content = q.content,
                isAnswer = q.isAnswer,
                createdAt = q.createdAt,
            )
        }
    }

    /** F4 질문 상세의 답변 스레드 (등록 순). */
    fun listAnswers(questionSeq: Long): List<AnswerListItem> {
        val answers = questionAnswerRepository.findByQuestionSeqOrderByCreatedAtAsc(questionSeq)
        val userNames = userRepository.findAllById(answers.map { it.userSeq })
            .associate { it.userSeq to it.name }

        return answers.map { a ->
            AnswerListItem(
                answerSeq = requireNotNull(a.seq),
                userSeq = a.userSeq,
                userName = userNames[a.userSeq] ?: "알수없음",
                content = a.content,
                createdAt = a.createdAt,
            )
        }
    }
}
