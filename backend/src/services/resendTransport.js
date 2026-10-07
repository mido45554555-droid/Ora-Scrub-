import path from 'node:path';
import { Resend } from 'resend';

function mapAttachment(attachment) {
  const { content, path: attachmentPath, cid, contentType, ...rest } = attachment;
  const source = attachmentPath || (typeof content === 'string' && path.isAbsolute(content) ? content : null);

  return {
    ...rest,
    ...(source ? { path: source } : content !== undefined ? { content } : {}),
    ...(contentType ? { content_type: contentType } : {}),
    ...(cid ? { content_id: cid } : {}),
  };
}

export function createResendTransport(apiKey, client = new Resend(apiKey)) {
  return {
    async sendMail(message) {
      const { attachments = [], ...email } = message;
      const { data, error } = await client.emails.send({
        ...email,
        attachments: attachments.map(mapAttachment),
      });

      if (error) {
        throw new Error(`Resend API request failed (${error.statusCode ?? 'unknown'}): ${error.message}`);
      }
      if (!data?.id) {
        throw new Error('Resend API response did not include an email ID.');
      }

      return { messageId: data.id, response: `Accepted by Resend (id: ${data.id})` };
    },
  };
}
