package com.example.unithon

import org.springframework.stereotype.Service
import java.time.LocalDateTime

data class IntegrationItem(
    val sourceType: String,
    val enabled: Boolean,
    val structured: Boolean,
)

private val INTEGRATION_SOURCES = listOf(
    "GITHUB" to true,
    "JIRA" to true,
    "FIGMA" to true,
    "SLACK" to false,
    "SENTRY" to false,
    "LINEAR" to false,
)

@Service
class IntegrationService(private val userMapAppRepository: UserMapAppRepository) {

    /** F1 연동 설정 목록. user_map_app에 행이 없는 소스는 꺼진 상태로 채워 항상 6개를 반환한다. */
    fun getIntegrations(userSeq: Long): List<IntegrationItem> {
        val existing = userMapAppRepository.findByUserSeq(userSeq).associateBy { it.sourceType }
        return INTEGRATION_SOURCES.map { (sourceType, structured) ->
            IntegrationItem(
                sourceType = sourceType,
                enabled = existing[sourceType]?.enabled ?: false,
                structured = structured,
            )
        }
    }

    fun toggle(userSeq: Long, sourceType: String): IntegrationItem {
        val row = userMapAppRepository.findByUserSeqAndSourceType(userSeq, sourceType)
        val updated = if (row != null) {
            row.enabled = !row.enabled
            row.updatedAt = LocalDateTime.now()
            userMapAppRepository.save(row)
        } else {
            userMapAppRepository.save(UserMapApp(userSeq = userSeq, sourceType = sourceType, enabled = true))
        }
        val structured = INTEGRATION_SOURCES.toMap()[sourceType] ?: false
        return IntegrationItem(sourceType, updated.enabled, structured)
    }
}
