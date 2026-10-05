import { Router } from 'express';
import { HttpError } from '../lib/httpError.js';
import { confirmDelivery, getDeliveryActionSummary } from '../services/deliveryService.js';

export const deliveryRouter = Router();
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function tokenParam(req) {
    const { token } = req.params;
    if (!TOKEN_PATTERN.test(token)) throw new HttpError(404, 'NOT_FOUND', 'Delivery action not found or expired.');
    return token;
}

deliveryRouter.get('/:token', async (req, res) => {
    const summary = await getDeliveryActionSummary(tokenParam(req));
    if (!summary) throw new HttpError(404, 'NOT_FOUND', 'Delivery action not found or expired.');
    res.set('Referrer-Policy', 'no-referrer');
    res.json(summary);
});

deliveryRouter.post('/:token/confirm', async (req, res) => {
    const result = await confirmDelivery(tokenParam(req));
    if (result.outcome === 'invalid') {
        throw new HttpError(404, 'NOT_FOUND', 'Delivery action not found or expired.');
    }
    if (result.outcome === 'cancelled') {
        throw new HttpError(409, 'DELIVERY_NOT_ALLOWED', 'A cancelled order cannot be marked delivered.');
    }
    res.json({ status: result.outcome });
});
