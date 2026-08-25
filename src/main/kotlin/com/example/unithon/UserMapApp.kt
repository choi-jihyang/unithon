package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

/**
 * 유저별 연동 소스 on/off(F1 연동설정 토글). 사용자마다 독립 저장 —
 * 사용자 A가 꺼도 B에는 영향 없다. source_type은 SourceType(MANUAL 제외) —
 * docs/planning/schema.md 참고.
 */
@Entity
@Table(
    name = "user_map_app",
    uniqueConstraints = [UniqueConstraint(columnNames = ["user_seq", "source_type"])],
)
class UserMapApp(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    @Column(name = "user_seq", nullable = false)
    val userSeq: Long,

    @Column(name = "source_type", nullable = false, length = 20)
    val sourceType: String,

    @Column(nullable = false)
    var enabled: Boolean = false,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now(),
)
