import { readFile } from 'node:fs/promises';

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

async function readAttachmentFile(source, filename) {
  try {
    return await readFile(source);
  } catch (error) {
    const label = filename ? ` "${filename}"` : '';
    throw new Error(`Unable to read email attachment${label} from "${source}": ${error.message}`, { cause: error });
  }
}

async function mapAttachment(attachment) {
  const {
    content,
    path: attachmentPath,
    cid,
    contentType,
    content_type,
    contentId,
    content_id,
    ...rest
  } = attachment;
  let mappedPath;
  let mappedContent = content;

  if (attachmentPath) {
    if (isHttpUrl(attachmentPath)) {
      mappedPath = attachmentPath;
    } else {
      mappedContent = await readAttachmentFile(attachmentPath, attachment.filename);
    }
  }

  return {
    ...rest,
    ...(mappedPath !== undefined ? { path: mappedPath } : mappedContent !== undefined ? { content: mappedContent } : {}),
    ...((contentType ?? content_type) !== undefined ? { contentType: contentType ?? content_type } : {}),
    ...((contentId ?? content_id ?? cid) !== undefined ? { contentId: contentId ?? content_id ?? cid } : {}),
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
        attachments: await Promise.all(attachments.map(mapAttachment)),
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
