import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    authorized({ auth, request }) {
      const protectedRoute = request.nextUrl.pathname.startsWith("/dashboard");
      const loggedIn = Boolean(auth?.user);
      if (protectedRoute) return loggedIn;
      if (loggedIn && request.nextUrl.pathname === "/login") return Response.redirect(new URL("/dashboard", request.nextUrl));
      return true;
    }
  },
  providers: []
} satisfies NextAuthConfig;
