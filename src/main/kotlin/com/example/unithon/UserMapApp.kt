package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/** 유저별 연동 소스 on/off (F1 연동 설정). schema.md의 user_map_app 절 참고. */
@Entity
@Table(name = "user_map_app")
class UserMapApp(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val seq: Long? = null,

    @Column(nullable = false)
    val userSeq: Long,

    @Column(nullable = false)
    val sourceType: String,

    @Column(nullable = false)
    var enabled: Boolean = false,

    @Column(nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now(),
)
