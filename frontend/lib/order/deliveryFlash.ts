import { createHmac, timingSafeEqual } from 'node:crypto';

export type DeliveryFlashResult = 'success' | 'already';

function signature(secret: string, token: string, result: DeliveryFlashResult, expires: string) {
    return createHmac('sha256', secret).update(`${token}\n${result}\n${expires}`).digest('base64url');
}

export function signDeliveryFlash(
    secret: string,
    token: string,
    result: DeliveryFlashResult,
    expires: string
) {
    return signature(secret, token, result, expires);
}

export function verifyDeliveryFlash(
    secret: string | undefined,
    token: string,
    result: string | undefined,
    expires: string | undefined,
    suppliedSignature: string | undefined
): DeliveryFlashResult | null {
    if (
        !secret ||
        !/^[A-Za-z0-9_-]{43}$/.test(token) ||
        (result !== 'success' && result !== 'already') ||
        !expires ||
        !/^\d{13}$/.test(expires) ||
        !suppliedSignature ||
        !/^[A-Za-z0-9_-]{43}$/.test(suppliedSignature) ||
        Number(expires) < Date.now()
    ) return null;

    const expected = signature(secret, token, result, expires);
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(suppliedSignature);
    if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) return null;
    return result;
}
