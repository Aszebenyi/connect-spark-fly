import { useBrandConfig } from '@/hooks/useBrandConfig';

interface SupportLinkProps {
  className?: string;
}

/**
 * Dynamic support link component that uses platform settings.
 * Used in ErrorBoundary and other places where we need a support email.
 */
export function SupportLink({ className }: SupportLinkProps) {
  const { supportEmail } = useBrandConfig();

  return (
    <a 
      href={`mailto:${supportEmail}`} 
      className={className || "text-primary hover:underline"}
    >
      contact support
    </a>
  );
}

export default SupportLink;
