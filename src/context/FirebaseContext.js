import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const FirebaseContext = createContext(null);

export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setError('');
      if (!u) {
        setUserDoc(null);
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, 'user', u.uid);
        const snap = await getDoc(ref);
        const userEmail = (u.email || '').toLowerCase();
        
        const isDefaultAdmin = userEmail === 'mrjaaduji@gmail.com';
        
        let existingRole = null;
        if (snap.exists()) {
          existingRole = snap.data().role;
        }
        
        const headEmails = [
          'head@testify.com',
          'head1@testify.com'
        ];
        const isHead = headEmails.includes(userEmail);
        
        let assignedRole = 'candidate';
        
        if (existingRole === 'head' && !isDefaultAdmin) {
          assignedRole = 'head';
        } else if (existingRole === 'admin' && !isDefaultAdmin) {
          assignedRole = 'admin';
        } else if (isDefaultAdmin) {
          assignedRole = 'admin';
        } else if (isHead) {
          assignedRole = 'head';
        } else if (existingRole) {
          assignedRole = existingRole;
        }
        
        if (!snap.exists()) {
          await setDoc(ref, {
            userId: u.uid,
            name: u.displayName || '',
            email: u.email || '',
            role: assignedRole,
            blocked: false,
            domain: 'Full Stack',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          }, { merge: true });
          setUserDoc({ userId: u.uid, name: u.displayName || '', email: u.email || '', role: assignedRole, blocked: false, domain: 'Full Stack' });
        } else {
          const existingData = snap.data();
          if (existingData.role !== assignedRole) {
            try {
              await updateDoc(ref, { 
                role: assignedRole,
                lastLogin: serverTimestamp() 
              });
            } catch (updateError) {
            }
          }
          
          const unsubDoc = onSnapshot(ref, async (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();
            const repair = {};
            if ((u.email || '') && !data.email) repair.email = u.email;
            if (!data.userId) repair.userId = u.uid;
            if (typeof data.blocked !== 'boolean') repair.blocked = false;
            if (!data.role) repair.role = assignedRole;
            if (!data.domain) repair.domain = 'Full Stack';
            setUserDoc({ ...data, ...repair });
            if (Object.keys(repair).length > 0) {
              try { await updateDoc(ref, { ...repair, lastLogin: serverTimestamp() }); } catch (_) {}
            }
          }, (error) => {
            if (error && error.message && error.message.includes('WebChannelConnection')) {
              return;
            }
          });
          return () => unsubDoc();
        }
      } catch (e) {
        setError(e.message || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => {
    let sessionRole = null;
    try { sessionRole = sessionStorage.getItem('tc_role_override'); } catch (_) {}
    const effectiveRole = (sessionRole || userDoc?.role || 'candidate').toLowerCase();
    return { user, userDoc, role: effectiveRole, blocked: !!userDoc?.blocked, loading, error };
  }, [user, userDoc, loading, error]);

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}

window.setUserRole = async (role) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return;
    }
    
    const ref = doc(db, 'user', user.uid);
    await updateDoc(ref, { role: role });
  } catch (error) {
  }
};

window.blockUser = async (blocked = true) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return;
    }
    
    const ref = doc(db, 'user', user.uid);
    await updateDoc(ref, { blocked: blocked });
  } catch (error) {
  }
};
