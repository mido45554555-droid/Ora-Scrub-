interface SocialIconProps {
  name: 'instagram' | 'whatsapp';
}

export function SocialIcon({ name }: SocialIconProps) {
  if (name === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12.04 2a9.86 9.86 0 0 0-8.48 14.9L2.2 22l5.23-1.37A9.94 9.94 0 1 0 12.04 2Zm0 18.16a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 1 1 6.95 3.84Zm4.5-6.14c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.57.13-.17.25-.65.81-.8.98-.14.17-.29.19-.54.06-.25-.13-1.04-.38-1.98-1.2-.73-.65-1.22-1.45-1.37-1.7-.14-.25-.01-.39.11-.51.11-.11.25-.29.38-.43.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.03 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.52.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.59.21-1.09.15-1.19-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}
