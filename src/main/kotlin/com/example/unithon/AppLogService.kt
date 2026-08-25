package com.example.unithon

import org.springframework.stereotype.Service
import java.time.LocalDateTime

data class UnclassifiedLogItem(
    val appLogSeq: Long,
    val sourceType: String,
    val ownerName: String,
    val occurredAt: LocalDateTime,
    val text: String,
)

@Service
class AppLogService(
    private val appLogRepository: AppLogRepository,
    private val userRepository: UserRepository,
) {

    /** F1 미분류 큐. 제목을 특정할 수 없어(title=NULL) 자동 분류되지 못한 수집 로그 목록. */
    fun listUnclassified(userSeq: Long): List<UnclassifiedLogItem> {
        val logs = appLogRepository.findByUserSeqAndStatusOrderByCreatedAtDesc(userSeq, "UNCLASSIFIED")
        val userNames = userRepository.findAllById(logs.map { it.userSeq }.distinct())
            .associate { it.userSeq to it.name }
        return logs.map { log ->
            UnclassifiedLogItem(
                appLogSeq = requireNotNull(log.seq),
                sourceType = log.sourceType,
                ownerName = userNames[log.userSeq] ?: "알수없음",
                occurredAt = log.createdAt,
                text = log.decisionContent ?: log.title ?: "",
            )
        }
    }
}
