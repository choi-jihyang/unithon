package com.example.unithon

import org.springframework.stereotype.Service
import java.time.format.DateTimeFormatter

private val DATE_FMT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy.MM.dd")

@Service
class CardService(
    private val cardRepository: CardRepository,
    private val userRepository: UserRepository,
) {

    /**
     * userSeq가 조회 가능한 카드 목록. 지금은 본인 카드만 — 이관 체인 병합(과거 담당자 카드까지
     * 포함)은 Task 3(ownership_transitions) 완료 후 여기에 추가한다.
     */
    fun findVisibleCards(userSeq: Long): List<CardListItem> {
        val visibleUserSeqs = listOf(userSeq) // TODO(Task 3): ownership_transitions 재귀 병합으로 교체
        val cards = cardRepository.findByUserSeqInOrderByCreatedAtDesc(visibleUserSeqs)
        val userNames = userRepository.findAllById(cards.map { it.userSeq })
            .associate { it.userSeq to it.name }

        return cards.map { card ->
            CardListItem(
                cardSeq = requireNotNull(card.seq),
                title = card.title,
                solution = card.solution,
                sourceApp = card.sourceApp,
                userName = userNames[card.userSeq] ?: "알수없음",
                startedAt = card.startedAt,
                decisionContent = card.decisionContent,
                createdAt = card.createdAt,
            )
        }
    }

    /**
     * 카드 상세(F3 체인). requesterUserSeq가 findVisibleCards()의 병합 집합에 없으면 null을
     * 반환하고, 컨트롤러가 403으로 응답한다.
     */
    fun findCardDetail(cardSeq: Long, requesterUserSeq: Long): CardDetail? {
        val card = cardRepository.findById(cardSeq).orElse(null) ?: return null
        val visibleUserSeqs = listOf(requesterUserSeq) // TODO(Task 3): 이관 체인 병합으로 교체
        if (card.userSeq !in visibleUserSeqs) return null

        val ownerName = userRepository.findById(card.userSeq).map { it.name }.orElse("알수없음")
        val decisionDate = card.createdAt.format(DATE_FMT)

        val chain = listOf(
            ChainNode(tag = "담당", name = ownerName, date = decisionDate),
            ChainNode(tag = "결정", name = card.decisionContent, date = decisionDate),
            ChainNode(
                tag = "이유",
                name = card.reasonContent,
                date = "$decisionDate · 결정과 동일 시점",
            ),
            ChainNode(
                tag = "근거",
                name = card.evidenceSource,
                date = decisionDate,
                tooltip = card.evidenceContent,
            ),
        )

        return CardDetail(
            cardSeq = requireNotNull(card.seq),
            title = card.title,
            solution = card.solution,
            category = card.category,
            afterViewCount = 0, // TODO(Task 4): questions.card_seq count로 교체
            chain = chain,
        )
    }
}
