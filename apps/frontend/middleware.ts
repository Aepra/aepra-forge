import { withAuth } from "next-auth/middleware";

export const config = {
  matcher: ["/hub/:path*", "/architect/:path*", "/profile/:path*"],
};

export default withAuth({
  pages: {
    signIn: "/login",
  },
});
