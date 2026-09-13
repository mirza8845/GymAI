import React, { createContext, useState, useEffect, useCallback } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setWorkoutPlan, setWorkoutLoading } from '../redux/Actions';

export const UserContext = createContext();
export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileExists, setProfileExists] = useState(false);
  const [revision, setRevision] = useState(0);
  const dispatch = useDispatch();
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    let generation = 0;
    let unsubscribeProfile;
    // Remove credentials persisted by older releases. Firebase owns the session.
    AsyncStorage.multiRemove(['password', 'email', 'userData']).catch(() => {});
    const unsubscribeAuth = auth().onAuthStateChanged(user => {
      const request = ++generation;
      unsubscribeProfile?.();
      setAuthUser(user);
      setUserData(null);
      setProfileExists(false);
      setError(null);
      dispatch(setWorkoutPlan(null));
      dispatch(setWorkoutLoading(false));
      if (!user) { setLoading(false); return; }
      setLoading(true);
      unsubscribeProfile = firestore().collection('Users').doc(user.uid).onSnapshot(snapshot => {
        if (!active || request !== generation) return;
        setProfileExists(snapshot.exists);
        setUserData(snapshot.exists ? { ...snapshot.data(), id: user.uid, uid: user.uid, email: user.email } : null);
        setError(null);
        setLoading(false);
      }, () => {
        if (!active || request !== generation) return;
        setError('Could not load your profile. Check your connection and try again.');
        setLoading(false);
      });
    });
    return () => { active = false; generation++; unsubscribeProfile?.(); unsubscribeAuth(); };
  }, [dispatch, revision]);
  return <UserContext.Provider value={{ userData, setUserData, authUser, loading, error, profileExists, retry }}>{children}</UserContext.Provider>;
};
