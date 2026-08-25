package com.example.unithon

import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

data class OwnershipTransitionRequest(
    val oldUserSeq: Long,
    val newUserSeq: Long,
    val transitionedByUserSeq: Long,
)

data class OwnershipTransitionResponse(val transitionedAt: LocalDateTime)

@RestController
class OwnershipTransitionController(private val ownershipTransitionService: OwnershipTransitionService) {

    @PostMapping("/api/ownership-transitions")
    fun transfer(@RequestBody request: OwnershipTransitionRequest): OwnershipTransitionResponse {
        val saved = ownershipTransitionService.transfer(
            oldUserSeq = request.oldUserSeq,
            newUserSeq = request.newUserSeq,
            transitionedByUserSeq = request.transitionedByUserSeq,
        )
        return OwnershipTransitionResponse(transitionedAt = saved.transitionedAt)
    }
}
