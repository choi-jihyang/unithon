package com.example.unithon

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * 회사 계정을 매핑하는 로컬 테이블(SSO 연동 예정). 인증은 궁극적으로 SSO가 소유하므로
 * user_id는 UNIQUE로 강제하지 않는다. 직급/부서는 로컬 마스터 없이 회사 쪽 코드+이름을
 * 스냅샷으로 저장한다. 설계 배경은 docs/planning/schema.md 참고.
 */
@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_seq")
    val userSeq: Long? = null,

    @Column(nullable = false)
    val userId: String,

    @Column(nullable = false)
    val name: String,

    val password: String? = null,

    @Column(nullable = false)
    val positionSeq: Long,

    @Column(nullable = false)
    val positionName: String,

    val departmentSeq: Long? = null,

    val departmentName: String? = null,

    @Column(nullable = false)
    var isUse: Boolean = true,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
)
