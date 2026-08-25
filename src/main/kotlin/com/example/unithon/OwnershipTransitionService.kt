package com.example.unithon

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

private const val MIN_POSITION_SEQ_FOR_TRANSFER = 5L // 팀장(5)/본부장(6)/이사(7)

@Service
class OwnershipTransitionService(
    private val ownershipTransitionRepository: OwnershipTransitionRepository,
    private val userRepository: UserRepository,
) {

    /** F2 이관 실행. 카드는 건드리지 않고 인계 이벤트 1행만 남긴다. */
    fun transfer(oldUserSeq: Long, newUserSeq: Long, transitionedByUserSeq: Long): OwnershipTransition {
        val executor = userRepository.findById(transitionedByUserSeq).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "실행자를 찾을 수 없습니다: $transitionedByUserSeq")
        }
        if (executor.positionSeq < MIN_POSITION_SEQ_FOR_TRANSFER) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "팀장급 이상만 이관을 실행할 수 있습니다.")
        }
        return ownershipTransitionRepository.save(
            OwnershipTransition(
                oldUserSeq = oldUserSeq,
                newUserSeq = newUserSeq,
                transitionedBy = transitionedByUserSeq,
            ),
        )
    }

    /**
     * startUserSeq에게 연결된 모든 과거 담당자 집합(본인 포함)을 구한다.
     * new_user_seq=X인 행에서 old_user_seq를 얻고, 그 old_user_seq에 대해서도 다시
     * 재귀로 거슬러 올라간다 — 다갈래(여러 이전 담당자)도 전부 포함(BFS, 방문 집합으로 순환 방지).
     */
    fun resolveVisibleUserSeqs(startUserSeq: Long): Set<Long> {
        val visited = mutableSetOf(startUserSeq)
        val queue = ArrayDeque(listOf(startUserSeq))
        while (queue.isNotEmpty()) {
            val current = queue.removeFirst()
            ownershipTransitionRepository.findByNewUserSeq(current).forEach { transition ->
                if (visited.add(transition.oldUserSeq)) {
                    queue.addLast(transition.oldUserSeq)
                }
            }
        }
        return visited
    }
}
