package com.example.unithon

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

data class IntegrationToggleRequest(val userSeq: Long, val sourceType: String)

@RestController
class IntegrationController(private val integrationService: IntegrationService) {

    @GetMapping("/api/integrations")
    fun getIntegrations(@RequestParam userSeq: Long): List<IntegrationItem> =
        integrationService.getIntegrations(userSeq)

    @PostMapping("/api/integrations/toggle")
    fun toggleIntegration(@RequestBody request: IntegrationToggleRequest): IntegrationItem =
        integrationService.toggle(request.userSeq, request.sourceType)
}
