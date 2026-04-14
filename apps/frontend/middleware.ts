import { withAuth } from "next-auth/middleware";

export const config = {
  matcher: ["/projects/:path*", "/architect/:path*", "/deploy/:path*", "/profile/:path*"],
};

export default withAuth({
  pages: {
    signIn: "/login",
  },
});
