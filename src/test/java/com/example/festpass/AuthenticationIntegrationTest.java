package com.example.festpass;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.festpass.model.FestEvent;
import com.example.festpass.model.Attendee;
import com.example.festpass.model.Ticket;
import com.example.festpass.repository.AttendeeRepository;
import com.example.festpass.repository.FestEventRepository;
import com.example.festpass.repository.TicketRepository;
import com.example.festpass.repository.UserRepository;
import com.example.festpass.service.TicketService;
import com.example.festpass.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:festpass-security;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "festpass.organizer-registration-code=test-organizer-code"
})
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
class AuthenticationIntegrationTest {

    private static final String PASSWORD = "Passw0rd!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private AttendeeRepository attendeeRepository;

    @Autowired
    private FestEventRepository eventRepository;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private UserService userService;

    @BeforeEach
    void clearTestRows() {
        userRepository.deleteAll();
        ticketRepository.deleteAll();
        attendeeRepository.deleteAll();
        eventRepository.deleteAll();
    }

    @Test
    void registrationHashesPasswordsAndRejectsInvalidRoleAndDuplicateEmail() throws Exception {
        register("ATTENDEE", "one@example.com").andExpect(status().isCreated())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.role").value("ATTENDEE"));

        String passwordHash = userRepository.findByEmail("one@example.com").orElseThrow().getPassword();
        assertThat(passwordHash).startsWith("$2").isNotEqualTo(PASSWORD);

        register("ATTENDEE", "one@example.com").andExpect(status().isBadRequest());
        register("OWNER", "other@example.com").andExpect(status().isBadRequest());
        register("ORGANIZER", "organizer@example.com")
                .andExpect(status().isBadRequest());
    }

    @Test
    void unauthenticatedRequestsAreDeniedAndEventsRemainDiscoverable() throws Exception {
        mockMvc.perform(get("/api/festpass/events"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/festpass/attendees"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/festpass/tickets"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/organizer-dashboard").accept(MediaType.TEXT_HTML))
                .andExpect(status().isFound())
                .andExpect(result -> assertThat(result.getResponse().getRedirectedUrl()).isEqualTo("/login"));
    }

    @Test
    void attendeeCanOnlyReadAndCreateTheirOwnTickets() throws Exception {
        register("ATTENDEE", "one@example.com").andExpect(status().isCreated());
        register("ATTENDEE", "two@example.com").andExpect(status().isCreated());
        Long ownAttendeeId = userService.getAttendeeId("one@example.com");
        Long otherAttendeeId = userService.getAttendeeId("two@example.com");
        FestEvent event = eventRepository.save(new FestEvent("Test Fest", LocalDate.now().plusDays(10), "Hall", 10, 5.0));
        Ticket otherTicket = ticketService.generateTicket(event.getId(), otherAttendeeId);
        MockHttpSession session = login("one@example.com");

        mockMvc.perform(get("/api/festpass/tickets/mine").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(0)));
        mockMvc.perform(get("/api/festpass/tickets/{id}", otherTicket.getId()).session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/festpass/attendees").session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/organizer-dashboard").session(session).accept(MediaType.TEXT_HTML))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/festpass/events/{id}/attendance", event.getId()).session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/festpass/tickets").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("eventId", event.getId(), "attendeeId", otherAttendeeId))))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/festpass/tickets").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("eventId", event.getId(), "attendeeId", ownAttendeeId))))
                .andExpect(status().isCreated());
        mockMvc.perform(get("/api/festpass/tickets/mine").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)));
    }

    @Test
    void organizerCanUseManagementApisButCannotUseAttendeeTicketList() throws Exception {
        register("ORGANIZER", "organizer@example.com", "test-organizer-code").andExpect(status().isCreated());
        MockHttpSession session = login("organizer@example.com");

        mockMvc.perform(get("/api/festpass/attendees").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/festpass/tickets/mine").session(session))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/festpass/events").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Organizer Event", "date", LocalDate.now().plusDays(4).toString(),
                                "venue", "Main Hall", "capacity", 20, "ticketPrice", 0.0))))
                .andExpect(status().isCreated());
    }

    @Test
    void loginRejectsWrongPasswordAndLogoutInvalidatesSession() throws Exception {
        register("ATTENDEE", "one@example.com").andExpect(status().isCreated());
        mockMvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", "one@example.com", "password", "incorrect"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));

        MockHttpSession session = login("one@example.com");
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("one@example.com"));
        mockMvc.perform(post("/api/auth/logout").session(session).with(csrf()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void attendeeCanUpdateTheirProfileAndKeepTheSessionAfterChangingEmail() throws Exception {
        register("ATTENDEE", "one@example.com").andExpect(status().isCreated());
        MockHttpSession session = login("one@example.com");

        mockMvc.perform(put("/api/auth/profile").session(session).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Updated Name", "email", "updated@example.com", "phone", "5551234"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.email").value("updated@example.com"))
                .andExpect(jsonPath("$.phone").value("5551234"))
                .andExpect(jsonPath("$.password").doesNotExist());

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("updated@example.com"));
        Long attendeeId = userService.getAttendeeId("updated@example.com");
        assertThat(attendeeRepository.findById(attendeeId)).get()
                .extracting(Attendee::getEmail).isEqualTo("updated@example.com");
    }

    private org.springframework.test.web.servlet.ResultActions register(String role, String email) throws Exception {
        return register(role, email, null);
    }

    private org.springframework.test.web.servlet.ResultActions register(String role, String email, String organizerCode) throws Exception {
        return mockMvc.perform(post("/api/auth/register").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "name", "Test User", "email", email, "password", PASSWORD,
                        "confirmPassword", PASSWORD, "role", role,
                        "organizerCode", organizerCode == null ? "" : organizerCode))));
    }

    private MockHttpSession login(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        return session;
    }
}
