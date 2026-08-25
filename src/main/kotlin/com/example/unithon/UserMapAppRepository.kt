package com.example.unithon

import org.springframework.data.jpa.repository.JpaRepository

interface UserMapAppRepository : JpaRepository<UserMapApp, Long> {
    fun findByUserSeq(userSeq: Long): List<UserMapApp>
    fun findByUserSeqAndSourceType(userSeq: Long, sourceType: String): UserMapApp?
}
