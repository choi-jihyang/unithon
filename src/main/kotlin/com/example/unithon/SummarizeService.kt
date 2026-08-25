package com.example.unithon

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.reactive.function.client.WebClient

data class ClaudeMessage(val role: String, val content: String)

data class ClaudeRequest(
    val model: String,
    val max_tokens: Int,
    val messages: List<ClaudeMessage>,
)

data class ClaudeContentBlock(val type: String, val text: String? = null)

data class ClaudeResponse(val content: List<ClaudeContentBlock>)

@Service
class SummarizeService(
    webClientBuilder: WebClient.Builder,
    @Value("\${anthropic.api-key}") private val apiKey: String,
    @Value("\${anthropic.base-url:https://api.anthropic.com/v1/messages}") private val baseUrl: String
) {
    private val client = webClientBuilder
        .baseUrl(baseUrl)
        .defaultHeader("x-api-key", apiKey)
        .defaultHeader("anthropic-version", "2023-06-01")
        .defaultHeader("content-type", "application/json")
        .build()

    fun summarize(text: String): String {
        val request = ClaudeRequest(
            model = "claude-haiku-4-5",
            max_tokens = 300,
            messages = listOf(
                ClaudeMessage(
                    role = "user",
                    content = "다음 텍스트를 한 문장으로 간결하게 요약해줘. 요약 문장만 출력해:\n\n$text",
                )
            ),
        )

        val response = client.post()
            .bodyValue(request)
            .retrieve()
            .bodyToMono(ClaudeResponse::class.java)
            .block()
            ?: throw IllegalStateException("Anthropic API 응답이 비어 있음")

        return response.content.firstOrNull { it.type == "text" }?.text
            ?: throw IllegalStateException("Anthropic API 응답에 text 블록이 없음")
    }
}
