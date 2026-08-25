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
 * 맥락카드 — 담당·결정·이유·근거. 설계 배경은 docs/planning/schema.md의 cards 절 참고.
 *
 * userSeq는 "최초 생성 담당자"로 이관돼도 절대 갱신하지 않는다. 현재 누가 이 카드를 볼 수
 * 있는지는 CardService에서 ownership_transitions를 재귀로 병합해 조회 시점에 계산한다.
 */
@Entity
@Table(name = "cards")
class Card(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    @Column(nullable = false)
    val userSeq: Long,

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

    val sourceApp: String? = null,

    val startedAt: LocalDate? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    val updatedAt: LocalDateTime? = null,
)
