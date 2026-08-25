package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * Figma 원본 수집 데이터(댓글). docs/planning/schema.md의 figma_logs 절 참고.
 * 실제 연동(POST /api/integrations/figma/sync) 대신, 응답 형태를 알고 있으니
 * 더미 데이터를 시드로 직접 채워 넣는 방식으로 진행(db/seed.sql).
 *
 * 필드는 docs/api/figma-integration-api.md 4번 섹션의 실제 Figma
 * GET /v1/files/{file_key}/comments 응답 형태를 그대로 반영:
 * id → commentId, user.handle → author, message → commentContent,
 * created_at → occurredAt, resolved_at → resolvedAt(null=논의중).
 */
@Entity
@Table(name = "figma_logs")
class FigmaLog(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    val userSeq: Long? = null,

    val fileKey: String? = null,
    val fileName: String? = null,

    @Column(columnDefinition = "TEXT")
    val commentContent: String? = null,

    val author: String? = null,
    val commentId: String? = null,

    /** null이면 아직 논의 중, 값이 있으면 논의 종결(추후 evidence 승격 조건). */
    val resolvedAt: LocalDateTime? = null,

    val occurredAt: LocalDateTime? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
