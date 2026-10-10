import nodemailer from 'nodemailer';

export function createSmtpTransport(options, createTransport = nodemailer.createTransport) {
  const client = createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.password,
    },
  });

  return {
    async sendMail(message) {
      const info = await client.sendMail(message);
      return { messageId: info.messageId, response: info.response };
    },
    close() {
      client.close();
    },
  };
}
