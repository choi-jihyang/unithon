package com.example.unithon

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@RestController
class TestController {

    @GetMapping("/api/test")
    fun test(): Map<String, Any> {
        return mapOf(
            "status" to "OK",
            "message" to "백엔드 연결 성공!",
            "timestamp" to LocalDateTime.now().toString()
        )
    }
}
