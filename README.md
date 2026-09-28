# FestPass

FestPass is a Spring Boot application for managing events, attendees, tickets, and QR check-in.

## Requirements

- Java 17
- Maven
- MySQL

## Run locally

Create or use a MySQL account with access to `festpass_db`, then provide its password through `DB_PASSWORD`.

In PowerShell:

```powershell
$env:DB_PASSWORD = "your-mysql-password"
mvn spring-boot:run
```

Open [http://localhost:8081](http://localhost:8081).