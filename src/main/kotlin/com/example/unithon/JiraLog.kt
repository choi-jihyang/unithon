package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * Jira 원본 수집 데이터(티켓/이슈). docs/planning/schema.md의 jira_logs 절 참고.
 * 실제 연동(POST /api/integrations/jira/sync) 대신, 응답 형태를 알고 있으니
 * 더미 데이터를 시드로 직접 채워 넣는 방식으로 진행(db/seed.sql).
 *
 * 필드는 docs/api/jira-integration-api.md 4번 섹션 기준: key → issueKey,
 * fields.summary → summary, fields.description(ADF 파싱된 평문) → description,
 * fields.status.name → status, fields.priority.name → priority,
 * fields.assignee.displayName → assignee, fields.created → occurredAt.
 */
@Entity
@Table(name = "jira_logs")
class JiraLog(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    val userSeq: Long? = null,

    val issueKey: String? = null,

    val summary: String? = null,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    val status: String? = null,
    val priority: String? = null,
    val assignee: String? = null,

    val occurredAt: LocalDateTime? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
