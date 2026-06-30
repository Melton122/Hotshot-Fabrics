// src/utils/auth.ts
import { supabase } from "./supabaseClient";
import type { Session, User, AuthError } from "@supabase/supabase-js";

export interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
}

export const auth = supabase.auth;

export async function signInWithPassword(email: string, password: string): Promise<AuthResponse> {
  try {
    const result = await auth.signInWithPassword({ email, password });
    return result as AuthResponse;
  } catch (error) {
    return { data: { user: null, session: null }, error: error as AuthError };
  }
}

export async function signUpWithPassword(
  email: string, 
  password: string, 
  fullName?: string
): Promise<AuthResponse> {
  try {
    const result = await auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    return result as AuthResponse;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        return { 
          data: { user: null, session: null }, 
          error: { message: "Email already registered. Please sign in instead." } as AuthError 
        };
      }
      if (error.message.includes("500")) {
        return { 
          data: { user: null, session: null }, 
          error: { message: "Server error during signup. Please try again in a moment." } as AuthError 
        };
      }
    }
    return { data: { user: null, session: null }, error: error as AuthError };
  }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await auth.signOut();
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    return null;
  }
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return auth.onAuthStateChange(callback);
}

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
}

export async function updatePassword(password: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await auth.updateUser({ password });
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
}