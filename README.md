# FestPass

FestPass is a Spring Boot application for managing events, attendees, tickets, and QR check-in. It uses Spring Security sessions with Organizer and Attendee roles.

## Requirements

- Java 17 (the current `pom.xml` targets Java 17)
- Maven
- MySQL

## Configuration

The application uses the existing `festpass_db` database. It creates/updates only the new `festpass_user` authentication table; the existing event, attendee, and ticket tables are retained.

Set the MySQL password and an organizer enrollment code in the environment. The organizer code prevents public self-registration as an administrator.

## Run locally

Create or use a MySQL account with access to `festpass_db`, then provide its password through `DB_PASSWORD`. Set `FESTPASS_ORGANIZER_REGISTRATION_CODE` to a private value and share it only with approved organizers.

In PowerShell:

```powershell
$env:DB_PASSWORD = "your-mysql-password"
$env:FESTPASS_ORGANIZER_REGISTRATION_CODE = "your-private-organizer-code"
# Optional if port 8081 is already used locally:
$env:PORT = "8082"
mvn spring-boot:run
```

Open [http://localhost:8082](http://localhost:8082) if you set `PORT=8082`; otherwise the default is [http://localhost:8081](http://localhost:8081).

## Create accounts

Open **Create account**, provide a name, unique email, and password of at least 8 characters, then select a role. Attendee registration is open. Organizer registration also requires the configured enrollment code. Login redirects to the dashboard for the account's stored role.

Passwords are BCrypt hashes. Login uses an HTTP session cookie; the server checks roles on every protected API request. This is session-based access control, not JWT authentication.

## Authentication API

All API requests use the same origin and the browser/Postman cookie jar. Fetch `GET /api/auth/csrf` before `POST`, `PUT`, or `DELETE` requests and send its token as `X-XSRF-TOKEN`. Login rotates the CSRF token: in Postman, call **Refresh CSRF Token After Login** before sending protected write requests. Login creates the session; logout invalidates it.

- `POST /api/auth/register`: create an account; body includes `name`, `email`, `password`, `confirmPassword`, `role` (`ATTENDEE` or `ORGANIZER`), and optional `organizerCode`.
- `POST /api/auth/login`: authenticate with `email` and `password`.
- `POST /api/auth/logout`: invalidate the session.
- `GET /api/auth/me`: read the current account.
- `GET /api/auth/profile` and `PUT /api/auth/profile`: read/update only the signed-in account profile.

Role rules: event discovery and aggregate availability are public; event management, attendee management, full ticket lists, ticket check-in, and attendance reports require `ORGANIZER`. `GET /api/festpass/tickets/mine` requires `ATTENDEE`. Attendee ticket creation and individual ticket reads verify ownership on the server. Missing authentication returns `401`; insufficient role or ownership returns `403`.

Existing business routes remain at `/api/festpass/events`, `/api/festpass/attendees`, and `/api/festpass/tickets`; their request bodies and business services remain the source of truth. Existing protected Postman requests now require the matching account session and CSRF header. The updated `FestPass.postman_collection.json` contains the auth flow and `{{csrfToken}}` header examples.

The application does not create organizer accounts automatically. For local development, configure `FESTPASS_ORGANIZER_REGISTRATION_CODE` before startup, then use it in the Organizer registration form. Use the Attendee option to create an attendee account and linked attendee profile.