package com.example.unithon

import java.time.LocalDate
import java.time.LocalDateTime

/** GET /api/cards 응답 항목 — js/context.js의 createHistoryRow()가 읽는 컬럼과 1:1 대응. */
data class CardListItem(
    val cardSeq: Long,
    val title: String?,
    val solution: String?,
    val sourceApp: String?,
    val userName: String,
    val startedAt: LocalDate?,
    val decisionContent: String?,
    val createdAt: LocalDateTime,
)

/** GET /api/cards/{cardSeq} 응답 — F3 상세 모달의 담당→결정→이유→근거 체인. */
data class CardDetail(
    val cardSeq: Long,
    val title: String?,
    val solution: String?,
    val category: String?,
    val afterViewCount: Long,
    val chain: List<ChainNode>,
)

data class ChainNode(
    val tag: String,
    val name: String?,
    val date: String?,
    val tooltip: String? = null,
)

/**
 * POST /api/cards 요청 — F1 "카드로 등록"(수동 결정 기록)의 유일한 저장 경로.
 * userSeq 외 전부 nullable — cards 테이블 그대로(schema.md 참고), 확인 안 된 항목은
 * 비워두고 나중에 채울 수 있다.
 */
data class CreateCardRequest(
    val userSeq: Long,
    val solution: String? = null,
    val category: String? = null,
    val title: String? = null,
    val decisionContent: String? = null,
    val reasonContent: String? = null,
    val evidenceContent: String? = null,
    val evidenceSource: String? = null,
    val sourceApp: String? = null,
    val startedAt: LocalDate? = null,
)

data class CreateCardResponse(val cardSeq: Long)
