# Mailpit Overlay

Email testing tool that captures all outbound emails, with a web UI for browsing and an API for automated testing.

## Features

- **Mailpit** - Fast, lightweight email testing tool
- **Web UI** - Beautiful interface for viewing captured emails (port 8025)
- **SMTP server** - Accepts all email without authentication (port 1025)
- **REST API** - Programmatic access to captured messages
- **Search and filter** - Find emails by recipient, subject, or content
- **No accidental sends** - All emails are captured locally, never delivered

## How It Works

This overlay adds Mailpit as a Docker Compose service. Configure your application to send emails via SMTP to `mailpit:1025` (from inside the container) and all emails will be captured and visible in the web UI.

## Configuration

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Default values (.env.example):**

```bash
# Mailpit Configuration
MAILPIT_VERSION=latest
MAILPIT_UI_PORT=8025
MAILPIT_SMTP_PORT=1025
```

### SMTP Settings for Your Application

Configure your application to use these settings:

| Setting        | Value                                                  |
| -------------- | ------------------------------------------------------ |
| SMTP host      | `mailpit` (inside container) / `localhost` (from host) |
| SMTP port      | `1025`                                                 |
| Authentication | None required                                          |
| TLS/SSL        | Not required                                           |

## Common Commands

### View Captured Emails

```bash
# Open web UI in browser
open http://localhost:8025

# List messages via API
curl -s http://localhost:8025/api/v1/messages | jq .

# Get message count
curl -s http://localhost:8025/api/v1/info | jq .Messages
```

### Search Emails

```bash
# Search by query
curl -s "http://localhost:8025/api/v1/messages?query=password+reset" | jq .

# Filter by recipient
curl -s "http://localhost:8025/api/v1/messages?query=to:user@example.com" | jq .
```

### Clear All Emails

```bash
# Delete all messages via API
curl -s -X DELETE http://localhost:8025/api/v1/messages
```

## Application Configuration Examples

### Node.js (using nodemailer)

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mailpit',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: false,
    auth: null, // No authentication needed
});

await transporter.sendMail({
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome!',
    text: 'Welcome to our app.',
    html: '<b>Welcome to our app.</b>',
});
```

### Python (using smtplib)

```python
import smtplib
from email.mime.text import MIMEText
import os

def send_email(to, subject, body):
    msg = MIMEText(body, 'html')
    msg['Subject'] = subject
    msg['From'] = 'noreply@example.com'
    msg['To'] = to

    smtp_host = os.getenv('SMTP_HOST', 'mailpit')
    smtp_port = int(os.getenv('SMTP_PORT', '1025'))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.sendmail(msg['From'], [to], msg.as_string())
```

### .NET (using MailKit)

```csharp
using MailKit.Net.Smtp;
using MimeKit;

var message = new MimeMessage();
message.From.Add(new MailboxAddress("App", "noreply@example.com"));
message.To.Add(new MailboxAddress("User", "user@example.com"));
message.Subject = "Welcome!";
message.Body = new TextPart("html") { Text = "<b>Welcome!</b>" };

using var client = new SmtpClient();
await client.ConnectAsync(
    Environment.GetEnvironmentVariable("SMTP_HOST") ?? "mailpit",
    int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT") ?? "1025"),
    false
);
await client.SendAsync(message);
await client.DisconnectAsync(true);
```

## Automated Testing

### Check Email was Sent

```bash
# Send test email, then verify it was received
curl -s http://localhost:8025/api/v1/messages | jq '.messages | length'
# Should be > 0

# Get latest email subject
curl -s http://localhost:8025/api/v1/messages | jq '.messages[0].Subject'
```

### Integration Test Pattern

```javascript
// After triggering an action that sends email:
const response = await fetch('http://localhost:8025/api/v1/messages');
const data = await response.json();

const latestEmail = data.messages[0];
expect(latestEmail.To[0].Address).toBe('user@example.com');
expect(latestEmail.Subject).toBe('Password Reset');

// Clean up for next test
await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' });
```

## Use Cases

- **Email flow testing** - Verify registration, password reset, and notification emails
- **Template development** - Preview rendered HTML email templates
- **Integration testing** - Assert emails are sent with correct content
- **No accidental sends** - Safely test in development without real email delivery

## References

- [Mailpit Documentation](https://mailpit.axllent.org/docs/)
- [Mailpit API Reference](https://mailpit.axllent.org/docs/api-v1/)
- [Mailpit GitHub](https://github.com/axllent/mailpit)

**Related Overlays:**

- `nodejs` - Node.js with nodemailer
- `python` - Python email development
- `dotnet` - .NET with MailKit
