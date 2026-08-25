package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 수집 로그(F1 1-2) — 원문(github_logs/jira_logs/figma_logs)을 카드 후보 형태로
 * 정형화한 중간 단계. docs/planning/schema.md의 app_logs 절 참고.
 *
 * sourceType+sourceSeq로 원문 로그를 역참조하고, status='CLASSIFIED'가 되면
 * cardSeq로 실제 생성된 cards 행을 가리킨다 — 원문 로그 → app_logs → cards
 * 3단이 같은 내용(제목/결정/이유/근거)을 유지해야 한다.
 */
@Entity
@Table(name = "app_logs")
class AppLog(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    @Column(nullable = false)
    val userSeq: Long,

    @Column(nullable = false)
    val sourceType: String,

    val sourceSeq: Long? = null,

    val solution: String? = null,
    val category: String? = null,
    val title: String? = null,

    @Column(columnDefinition = "TEXT")
    val decisionContent: String? = null,

    @Column(columnDefinition = "TEXT")
    val reasonContent: String? = null,

    @Column(columnDefinition = "TEXT")
    val evidenceContent: String? = null,

    val evidenceSource: String? = null,
    val startedAt: LocalDate? = null,

    @Column(nullable = false)
    val status: String = "UNCLASSIFIED",

    val cardSeq: Long? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
