Provider logos used by the payment method cards
(components/order/PaymentMethodCard.tsx), referenced via
PAYMENT_ACCOUNTS.logoSrc in lib/constants.ts:

- vodafone-cash.jpg — Vodafone Cash logo, as provided
- instapay.png — InstaPay logo, as provided

If either file is ever removed or renamed, the card falls back to a
plain text badge showing the provider name — never a placeholder icon
or an unrelated logo.
