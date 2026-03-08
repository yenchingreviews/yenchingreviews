import Link from 'next/link';

export function Header() {
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
        </nav>
      </div>
    </header>
  );
}
