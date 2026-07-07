package com.personal.portfolio.contact;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("dev")
class ContactControllerTest {

    @Autowired WebApplicationContext context;

    private MockMvc mvc() { return MockMvcBuilders.webAppContextSetup(context).build(); }

    @Test
    void rejectsBlankName() throws Exception {
        String body = """
            {"name":"", "email":"a@b.co", "message":"hello there friend, this is plenty long"}""";
        mvc().perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }

    @Test
    void rejectsBadEmail() throws Exception {
        String body = """
            {"name":"Ada","email":"not-an-email","message":"hello there friend, this is plenty long"}""";
        mvc().perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]").value(containsString("email")));
    }

    @Test
    void rejectsShortMessage() throws Exception {
        String body = """
            {"name":"Ada","email":"a@b.co","message":"hi"}""";
        mvc().perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void acceptsValidSubmission() throws Exception {
        String body = """
            {"name":"Ada Lovelace","email":"ada@example.com",
             "company":"Analytical Engines","projectType":"fractional CTO",
             "message":"Looking for a fractional CTO to help us scale our Spring Boot platform on AWS — 6 month engagement, ~10 hours per week."}""";
        mvc().perform(post("/api/contact").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("received"))
                .andExpect(jsonPath("$.id").exists());
    }
}
