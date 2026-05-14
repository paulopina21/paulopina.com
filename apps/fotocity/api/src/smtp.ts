import { connect } from 'cloudflare:sockets';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean; // true = SSL (465), false = STARTTLS (587)
}

interface EmailMessage {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
}

function encodeBase64(str: string): string {
  return btoa(str);
}

function buildRawEmail(msg: EmailMessage): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: =?UTF-8?B?${encodeBase64(msg.fromName || 'FotoCity')}?= <${msg.from}>`,
    `To: ${msg.to}`,
    `Subject: =?UTF-8?B?${encodeBase64(msg.subject)}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    encodeBase64('Visualize este email em um cliente que suporte HTML.'),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    encodeBase64(msg.html),
    ``,
    `--${boundary}--`,
  ];
  return lines.join('\r\n');
}

async function readResponse(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  const timeout = 10000;
  const start = Date.now();

  while (true) {
    if (Date.now() - start > timeout) {
      throw new Error(`SMTP timeout after ${timeout}ms. Buffer: ${buffer}`);
    }

    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SMTP responses end with \r\n; multiline responses have - after code
    const lines = buffer.split('\r\n');
    for (const line of lines) {
      if (line.length >= 3) {
        const code = line.slice(0, 3);
        const separator = line[3];
        // Single line response or last line of multiline (space after code)
        if (separator === ' ' || separator === undefined || line.length === 3) {
          return buffer;
        }
        // Multiline continues with '-' after code
        if (separator === '-') {
          continue;
        }
      }
    }
    // If buffer ends with \r\n and last complete line has space separator, we're done
    if (buffer.endsWith('\r\n')) {
      const completeLines = buffer.trim().split('\r\n');
      const lastLine = completeLines[completeLines.length - 1];
      if (lastLine.length >= 3 && lastLine[3] !== '-') {
        return buffer;
      }
    }
  }

  return buffer;
}

function getResponseCode(response: string): number {
  const match = response.match(/^(\d{3})/);
  return match ? parseInt(match[1]) : 0;
}

async function smtpCommand(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  command: string,
  expectedCode: number
): Promise<string> {
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(command + '\r\n'));
  const response = await readResponse(reader);
  const code = getResponseCode(response);
  if (code !== expectedCode && Math.floor(code / 100) !== Math.floor(expectedCode / 100)) {
    throw new Error(`SMTP error: expected ${expectedCode}, got ${code}. Response: ${response.trim()}`);
  }
  return response;
}

async function sendWithSSL(config: SmtpConfig, msg: EmailMessage): Promise<void> {
  const socket = connect(
    { hostname: config.host, port: config.port },
    { secureTransport: 'on' }
  );

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();

  try {
    // Read greeting
    const greeting = await readResponse(reader);
    if (getResponseCode(greeting) !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.trim()}`);
    }

    // EHLO
    await smtpCommand(writer, reader, `EHLO ${msg.from.split('@')[1]}`, 250);

    // AUTH LOGIN
    await smtpCommand(writer, reader, 'AUTH LOGIN', 334);
    await smtpCommand(writer, reader, encodeBase64(config.user), 334);
    await smtpCommand(writer, reader, encodeBase64(config.pass), 235);

    // MAIL FROM
    await smtpCommand(writer, reader, `MAIL FROM:<${msg.from}>`, 250);

    // RCPT TO
    await smtpCommand(writer, reader, `RCPT TO:<${msg.to}>`, 250);

    // DATA
    await smtpCommand(writer, reader, 'DATA', 354);

    // Send email body
    const rawEmail = buildRawEmail(msg);
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(rawEmail + '\r\n.\r\n'));
    const dataResponse = await readResponse(reader);
    if (getResponseCode(dataResponse) !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.trim()}`);
    }

    // QUIT
    const quitEncoder = new TextEncoder();
    await writer.write(quitEncoder.encode('QUIT\r\n'));
  } finally {
    try { writer.close(); } catch {}
    try { reader.cancel(); } catch {}
    try { socket.close(); } catch {}
  }
}

async function sendWithSTARTTLS(config: SmtpConfig, msg: EmailMessage): Promise<void> {
  const socket = connect(
    { hostname: config.host, port: config.port },
    { secureTransport: 'starttls' }
  );

  let writer = socket.writable.getWriter();
  let reader = socket.readable.getReader();

  try {
    // Read greeting
    const greeting = await readResponse(reader);
    if (getResponseCode(greeting) !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.trim()}`);
    }

    // EHLO
    await smtpCommand(writer, reader, `EHLO ${msg.from.split('@')[1]}`, 250);

    // STARTTLS
    await smtpCommand(writer, reader, 'STARTTLS', 220);

    // Upgrade to TLS
    writer.releaseLock();
    reader.releaseLock();
    const secureSocket = socket.startTls();
    writer = secureSocket.writable.getWriter();
    reader = secureSocket.readable.getReader();

    // EHLO again after TLS
    await smtpCommand(writer, reader, `EHLO ${msg.from.split('@')[1]}`, 250);

    // AUTH LOGIN
    await smtpCommand(writer, reader, 'AUTH LOGIN', 334);
    await smtpCommand(writer, reader, encodeBase64(config.user), 334);
    await smtpCommand(writer, reader, encodeBase64(config.pass), 235);

    // MAIL FROM
    await smtpCommand(writer, reader, `MAIL FROM:<${msg.from}>`, 250);

    // RCPT TO
    await smtpCommand(writer, reader, `RCPT TO:<${msg.to}>`, 250);

    // DATA
    await smtpCommand(writer, reader, 'DATA', 354);

    // Send email body
    const rawEmail = buildRawEmail(msg);
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(rawEmail + '\r\n.\r\n'));
    const dataResponse = await readResponse(reader);
    if (getResponseCode(dataResponse) !== 250) {
      throw new Error(`SMTP DATA failed: ${dataResponse.trim()}`);
    }

    // QUIT
    const quitEncoder = new TextEncoder();
    await writer.write(quitEncoder.encode('QUIT\r\n'));
  } finally {
    try { writer.close(); } catch {}
    try { reader.cancel(); } catch {}
    try { socket.close(); } catch {}
  }
}

export async function sendEmail(config: SmtpConfig, msg: EmailMessage): Promise<void> {
  if (config.secure) {
    // Try SSL first (port 465)
    try {
      await sendWithSSL(config, msg);
      return;
    } catch (sslError) {
      console.log(`SSL failed, trying STARTTLS fallback: ${sslError}`);
    }
  }

  // Fallback to STARTTLS (port 587)
  await sendWithSTARTTLS(
    {
      host: 'smtp.locaweb.com.br',
      port: 587,
      user: config.user,
      pass: config.pass,
      secure: false,
    },
    msg
  );
}
