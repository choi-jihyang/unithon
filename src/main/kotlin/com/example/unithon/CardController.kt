package com.example.unithon

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class CardController(private val cardService: CardService) {

    @GetMapping("/api/cards")
    fun getCards(@RequestParam userSeq: Long): List<CardListItem> =
        cardService.findVisibleCards(userSeq)

    @PostMapping("/api/cards")
    fun createCard(@RequestBody request: CreateCardRequest): CreateCardResponse =
        cardService.createCard(request)

    @GetMapping("/api/cards/{cardSeq}")
    fun getCardDetail(
        @PathVariable cardSeq: Long,
        @RequestParam userSeq: Long,
    ): ResponseEntity<CardDetail> {
        val detail = cardService.findCardDetail(cardSeq, userSeq) ?: return ResponseEntity.status(403).build()
        return ResponseEntity.ok(detail)
    }
}
