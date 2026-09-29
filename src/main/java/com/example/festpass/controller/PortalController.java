package com.example.festpass.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PortalController {

    @GetMapping({"/login", "/register", "/organizer-dashboard", "/attendee-dashboard"})
    public String frontendRoute() {
        return "forward:/index.html";
    }
}