package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * 이관 기록 — 담당자 단위 인계 이벤트. 카드는 건드리지 않는다(schema.md의
 * ownership_transitions 절 참고). 카드 조회 시점에 이 테이블을 재귀로 병합한다.
 */
@Entity
@Table(name = "ownership_transitions")
class OwnershipTransition(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    @Column(nullable = false)
    val oldUserSeq: Long,

    @Column(nullable = false)
    val newUserSeq: Long,

    @Column(nullable = false)
    val transitionedBy: Long,

    @Column(nullable = false)
    val transitionedAt: LocalDateTime = LocalDateTime.now(),
)
