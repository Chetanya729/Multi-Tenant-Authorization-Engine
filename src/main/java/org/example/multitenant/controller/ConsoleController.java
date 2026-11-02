package org.example.multitenant.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ConsoleController {

    private final String appName;
    private final Environment environment;

    public ConsoleController(@Value("${spring.application.name:Multi-Tenant}") String appName,
                             Environment environment) {
        this.appName = appName;
        this.environment = environment;
    }

    @GetMapping("/")
    public String console(Model model) {
        String[] profiles = environment.getActiveProfiles();
        model.addAttribute("appName", appName);
        model.addAttribute("profile", profiles.length == 0 ? "default" : String.join(", ", profiles));
        return "console";
    }
}
