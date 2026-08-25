package com.example.unithon

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class AppLogController(private val appLogService: AppLogService) {

    @GetMapping("/api/app-logs/unclassified")
    fun getUnclassified(@RequestParam userSeq: Long): List<UnclassifiedLogItem> =
        appLogService.listUnclassified(userSeq)
}
