package com.whennawa.controller;

import com.whennawa.dto.home.HomeHotCompanyItem;
import com.whennawa.dto.home.HomeLatestReportItem;
import com.whennawa.service.HomeService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home")
public class HomeController {
    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @GetMapping("/latest-reports")
    public List<HomeLatestReportItem> latestReports(
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return homeService.listLatestReports(limit);
    }

    @GetMapping("/hot-companies")
    public List<HomeHotCompanyItem> hotCompanies(
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return homeService.listHotCompanies(limit);
    }
}
