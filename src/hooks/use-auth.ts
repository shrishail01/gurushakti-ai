/**
 * Auth hook — returns the signed-in user and auth actions.
 *
 * This replaces the template's Convex Auth hook with the GuruShakti custom
 * JWT + HttpOnly-cookie session. The shape stays compatible:
 *   const { isLoading, isAuthenticated, user, signIn, signOut } = useAuth();
 */

export { useAuth } from "@/lib/auth-context";
