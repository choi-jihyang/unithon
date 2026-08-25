package com.example.unithon

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class UserController(private val userService: UserService) {

    @GetMapping("/api/users")
    fun getUsers(): List<User> = userService.findAll()
}
