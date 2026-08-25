package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * GitHub 원본 수집 데이터(커밋/PR). docs/planning/schema.md의 github_logs 절 참고.
 * 실제 연동(POST /api/integrations/github/sync) 대신, 응답 형태를 알고 있으니
 * 더미 데이터를 시드로 직접 채워 넣는 방식으로 진행(db/seed.sql).
 *
 * 필드는 docs/api/github-integration-api.md 4~5번 섹션 기준:
 * commit.message / PR title → title, PR body → content, PR number(#142)
 * 또는 commit sha 앞 7자리 → externalRef, user.login → author.
 */
@Entity
@Table(name = "github_logs")
class GithubLog(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    val userSeq: Long? = null,

    val repoName: String? = null,

    /** COMMIT / PR */
    val type: String? = null,

    val title: String? = null,

    @Column(columnDefinition = "TEXT")
    val content: String? = null,

    val author: String? = null,

    /** PR "#142" 형식 또는 커밋 sha 앞 7자리. */
    val externalRef: String? = null,

    val url: String? = null,

    val occurredAt: LocalDateTime? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
