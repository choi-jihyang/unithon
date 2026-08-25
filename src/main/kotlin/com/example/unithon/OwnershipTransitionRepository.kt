package com.example.unithon

import org.springframework.data.jpa.repository.JpaRepository

interface OwnershipTransitionRepository : JpaRepository<OwnershipTransition, Long> {
    fun findByNewUserSeq(newUserSeq: Long): List<OwnershipTransition>
}
