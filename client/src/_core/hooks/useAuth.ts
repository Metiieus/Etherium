import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"player" | "master" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role as "player" | "master");
          } else {
            // Default to player if no doc (e.g. old users or google login)
            setRole("player");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole("player");
        }
      } else {
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRedirect = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      const userRole = userDoc.exists() ? userDoc.data().role : "player";
      if (userRole === "master") {
        setLocation("/master");
      } else {
        setLocation("/profile");
      }
    } catch (e) {
      setLocation("/profile");
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      await handleRedirect(res.user.uid);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await handleRedirect(res.user.uid);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: "player" | "master" = "player") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Create user document with role
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        email,
        role,
        createdAt: new Date().toISOString()
      });

      // Force refresh user state or wait for auth state change
      setUser({ ...userCredential.user, displayName: name });
      setRole(role);

      if (role === "master") {
        setLocation("/master");
      } else {
        setLocation("/profile");
      }
    } catch (error) {
      console.error("Register failed", error);
      throw error;
    }
  };

  const updatePhoto = async (photoURL: string) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { photoURL });
      setUser({ ...auth.currentUser, photoURL });
      toast({ title: "Avatar atualizado!" });
    } catch (error) {
      console.error("Error updating photo:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setRole(null);
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return {
    user: user ? {
      id: user.uid,
      name: user.displayName || user.email?.split('@')[0] || "Aventureiro",
      email: user.email,
      openId: user.uid,
      image: user.photoURL,
      role: role // Expose role
    } : null,
    isLoading,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    updatePhoto,
    logout
  };
}
