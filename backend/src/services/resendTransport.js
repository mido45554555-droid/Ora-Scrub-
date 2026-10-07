import path from 'node:path';

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

export function createResendTransport(apiKey, client = null) {
  let clientPromise = null;

  async function getClient() {
    if (client) return client;
    clientPromise ??= import('resend').then(({ Resend }) => new Resend(apiKey));
    return clientPromise;
  }

  return {
    async sendMail(message) {
      const { attachments = [], ...email } = message;
      const resend = await getClient();
      const { data, error } = await resend.emails.send({
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
