import { withAuth } from "next-auth/middleware";

// Redirect unauthenticated users to our styled /login page.
export default withAuth({
  pages: { signIn: "/login" },
});

// Protect the application area; auth pages and API remain public.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/profile/:path*",
    "/join/:path*",
  ],
};
