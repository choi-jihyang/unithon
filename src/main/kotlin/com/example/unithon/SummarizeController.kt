package com.example.unithon

import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class SummarizeRequest(val text: String)
data class SummarizeResponse(val summary: String)

@RestController
class SummarizeController(private val summarizeService: SummarizeService) {

    @PostMapping("/api/summarize")
    fun summarize(@RequestBody request: SummarizeRequest): SummarizeResponse {
        val summary = summarizeService.summarize(request.text)
        return SummarizeResponse(summary)
    }
}
