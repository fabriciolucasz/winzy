import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const host = (req.headers.get("host")?.split(":")[0] || "").toLowerCase();

  const isDevelopment = process.env.NODE_ENV === "development";
  const rootDomain = isDevelopment ? "localhost" : (process.env.APP_ROOT_DOMAIN || "localhost");

  const reservedSubdomains = [
    "www", "api", "admin", "mail", "ftp", "dev", "staging", "test", "beta", "alpha", "demo",
    "support", "help", "blog", "shop", "dashboard", "portal", "app", "client", "server",
    "static", "cdn", "assets", "media", "images", "videos", "docs", "wiki", "forum",
    "community", "news", "events", "careers", "about", "contact"
  ];

  let subdomain = "";

  if (isDevelopment) {
    if (host !== "localhost") {
      subdomain = host.replace(".localhost", "");
    }
  } else {
    if (host.endsWith(`.${rootDomain}`)) {
      subdomain = host.replace(`.${rootDomain}`, "");
    }
  }

  if (subdomain && !reservedSubdomains.includes(subdomain)) {
    const [firstSegment] = pathname.split("/").filter(Boolean);

    // Em subdomínio, a URL canônica não deve expor o slug no path.
    // Ex.: tr-gustavin.localhost/login (e não /tr-gustavin/login).
    if (firstSegment === subdomain) {
      const normalizedUrl = req.nextUrl.clone();
      const strippedPath = pathname.slice(`/${subdomain}`.length) || "/";
      normalizedUrl.pathname = strippedPath.startsWith("/") ? strippedPath : `/${strippedPath}`;
      return NextResponse.redirect(normalizedUrl);
    }

    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};