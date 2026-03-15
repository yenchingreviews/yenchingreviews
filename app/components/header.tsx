import Link from 'next/link';

type HeaderProps = {
  addReviewHref: string;
  isAddReviewActive?: boolean;
};

export function Header({ addReviewHref, isAddReviewActive = false }: HeaderProps) {
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
          <Link href={addReviewHref} className={`nav-link-cta filter-control ${isAddReviewActive ? 'active' : ''}`}>
            Add Review
          </Link>
        </nav>
      </div>
    </header>
  );
}
