package com.personal.portfolio.projects;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("dev")
class ProjectControllerTest {

    @Autowired WebApplicationContext context;
    private MockMvc mvc() { return MockMvcBuilders.webAppContextSetup(context).build(); }

    @Test
    void listsSeedProjects() throws Exception {
        mvc().perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(greaterThanOrEqualTo(6)))
                .andExpect(jsonPath("$[0].slug").exists())
                .andExpect(jsonPath("$[0].stack").isArray());
    }

    @Test
    void fetchesBySlug() throws Exception {
        mvc().perform(get("/api/projects/eon-ecommerce"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("EON Ecommerce"));
    }

    @Test
    void returns404ForUnknownSlug() throws Exception {
        mvc().perform(get("/api/projects/does-not-exist"))
                .andExpect(status().isNotFound());
    }
}
