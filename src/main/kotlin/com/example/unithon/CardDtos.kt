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
