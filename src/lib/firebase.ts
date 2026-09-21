import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with auto-detect long-polling to prevent WebSocket connection drops in iframes/proxies
const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.length > 0
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const db = (() => {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      databaseId,
    );
  } catch {
    return getFirestore(app, databaseId);
  }
})();

// Google Auth Provider configured for clean account selection
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export type AuthUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

/**
 * Sign in with Google using Firebase Auth popup.
 * Handles popup blockers and stores basic profile information in Firestore.
 */
export async function signInWithGoogle(): Promise<AuthUserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const profile: AuthUserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };

    // Upsert user profile in Firestore
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          photoURL: user.photoURL ?? "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (e) {
      console.warn("Could not sync user profile to Firestore:", e);
    }

    return profile;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/popup-blocked") {
      throw new Error("Popup blocked by browser. Please allow popups for this site and try again.");
    }
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      throw new Error("Sign in window was closed before finishing.");
    }
    throw new Error(err.message || "Failed to sign in with Google.");
  }
}

/**
 * Sign out of Firebase Auth.
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthState(callback: (user: AuthUserProfile | null) => void): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Recursively sanitizes data before sending to Firestore.
 * Firestore strictly forbids `undefined` anywhere in documents (including nested array elements or object properties).
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value !== undefined) {
      result[key] = sanitizeForFirestore(value);
    }
  }
  return result as T;
}

/**
 * Save or update a chat in Firestore for authenticated users
 */
export async function saveChatToFirestore(
  userId: string,
  chatId: string,
  title: string,
  messages: unknown[],
): Promise<void> {
  if (!userId || !chatId) return;
  try {
    const chatRef = doc(db, "chats", chatId);
    const sanitizedMessages = sanitizeForFirestore(messages);
    await setDoc(
      chatRef,
      {
        userId,
        chatId,
        title: title || "New Chat",
        messages: sanitizedMessages,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Could not save chat to Firestore:", error);
  }
}

/**
 * Delete a chat in Firestore
 */
export async function deleteChatFromFirestore(chatId: string): Promise<void> {
  if (!chatId) return;
  try {
    const chatRef = doc(db, "chats", chatId);
    await deleteDoc(chatRef);
  } catch (error) {
    console.warn("Could not delete chat from Firestore:", error);
  }
}

/**
 * Subscribe to the authenticated user's chats in Firestore
 */
export function subscribeUserChats(
  userId: string,
  onUpdate: (
    chats: { id: string; title: string; messages: unknown[]; updatedAt: string }[],
  ) => void,
): Unsubscribe {
  const chatsCol = collection(db, "chats");
  const q = query(chatsCol, where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: (data["title"] as string) || "New Chat",
          messages: (data["messages"] as unknown[]) || [],
          updatedAt: (data["updatedAt"] as string) || new Date().toISOString(),
        };
      });
      // Sort in memory by updatedAt descending
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn("Firestore chats listener warning:", err);
    },
  );
}
