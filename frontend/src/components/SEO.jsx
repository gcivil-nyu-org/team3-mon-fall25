export default function SEO({
  title = 'NYU Marketplace - Buy & Sell on Campus',
  description = 'Buy and sell with fellow NYU students.',
  canonical,
  image = '/android-chrome-512x512.png'
}) {
  const url = canonical || (typeof window !== 'undefined' ? window.location.href : undefined);

  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {url && <link rel="canonical" href={url} />}

      {/* Open Graph */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
    </>
  );
}
