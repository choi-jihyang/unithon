package com.example.unithon

import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class SummarizeServiceTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var summarizeService: SummarizeService

    @BeforeEach
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()

        summarizeService = SummarizeService(
            webClientBuilder = WebClientConfig().webClientBuilder(),
            apiKey = "test-key",
            baseUrl = mockWebServer.url("/").toString(),
        )
    }

    @AfterEach
    fun tearDown() {
        mockWebServer.shutdown()
    }

    private fun loadFixture(name: String): String =
        SummarizeServiceTest::class.java.getResource("/fixtures/$name")!!.readText()

    @Test
    fun summarizeReturnsTextFromNormalResponse() {
        // 케이스 a: 정상 응답 fixture -> summarize()의 반환값이 fixture의 text와 정확히 일치해야 함
        mockWebServer.enqueue(
            MockResponse()
                .setBody(loadFixture("anthropic-response-normal.json"))
                .addHeader("Content-Type", "application/json")
        )

        val result = summarizeService.summarize("아무 원문 텍스트")

        assertEquals(
            "OAuth2 리팩터링으로 세션 만료 시 강제 로그아웃 대신 리프레시 토큰 갱신 방식을 도입했다.",
            result,
        )
    }

    @Test
    fun summarizeReturnsOnlyFirstTextBlockWhenMultipleBlocksExist() {
        // 케이스 b: content 배열에 text 블록이 두 개인 fixture ->
        // 현재 파싱 로직(firstOrNull { it.type == "text" })이 첫 번째 text 블록만 취하는지 확인
        mockWebServer.enqueue(
            MockResponse()
                .setBody(loadFixture("anthropic-response-multi-block.json"))
                .addHeader("Content-Type", "application/json")
        )

        val result = summarizeService.summarize("아무 원문 텍스트")

        assertEquals(
            "PG사 연동 방식을 변경하며 재시도 로직과 멱등성 키를 도입했다.",
            result,
        )
    }

    @Test
    fun summarizeReturnsTruncatedTextWithoutErrorWhenStopReasonIsMaxTokens() {
        // 케이스 c: stop_reason이 "max_tokens"로 잘린 응답 fixture ->
        // 현재 로직은 stop_reason을 검사하지 않으므로 예외 없이 잘린 텍스트를 그대로 반환한다.
        // (잘렸다는 사실을 호출자에게 알리지 않는 것이 의도한 동작인지는 이 테스트로 드러남 — 별도 논의 필요)
        mockWebServer.enqueue(
            MockResponse()
                .setBody(loadFixture("anthropic-response-truncated.json"))
                .addHeader("Content-Type", "application/json")
        )

        val result = summarizeService.summarize("아무 원문 텍스트")

        assertEquals("배포 파이프라인을 블루/그린 방식으로 전환하면서", result)
    }

    @Test
    fun summarizeThrowsRuntimeExceptionOnServerError() {
        // 케이스 d: Anthropic API가 500을 반환하면 WebClient의 기본 에러 처리에 의해
        // WebClientResponseException(RuntimeException의 하위 타입)이 던져져야 함
        mockWebServer.enqueue(MockResponse().setResponseCode(500))

        assertThrows(RuntimeException::class.java) {
            summarizeService.summarize("아무 원문 텍스트")
        }
    }
}
