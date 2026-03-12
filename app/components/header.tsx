import Link from 'next/link';

type HeaderProps = {
  addReviewHref: string;
};

export function Header({ addReviewHref }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="logo">
          yenchingreviews
        </Link>
        <nav>
          <Link href="/" className="nav-link is-active">
            Catalog
          </Link>
          <Link href={addReviewHref} className="nav-link nav-link-cta">
            Add Review
          </Link>
        </nav>
      </div>
    </header>
  );
}
