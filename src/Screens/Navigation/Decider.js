import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { UserContext } from '../../utils/userContext';
import { isProfileComplete } from '../../utils/profileCompletion';
import Button from '../../CommonComponent/Button';
import { Colors } from '../../constants/theme';

export default function Decider() {
  const navigation = useNavigation();
  const { userData, loading, error, retry } = useContext(UserContext);
  const [planError, setPlanError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (loading || error) return;
    let active = true;
    setPlanError(null);
    async function decide() {
      const user = auth().currentUser;
      if (!user) { navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] }); return; }
      try {
        if (!userData) {
          // Recover an Auth account whose initial profile write was interrupted.
          await firestore().collection('Users').doc(user.uid).set({ uid: user.uid, email: user.email || '', name: user.displayName || '', createdAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
          if (active) navigation.reset({ index: 0, routes: [{ name: 'introQuestionnaire' }] });
          return;
        }
        if (!isProfileComplete(userData)) {
          navigation.reset({ index: 0, routes: [{ name: 'introQuestionnaire' }] }); return;
        }
        const snapshot = await firestore().collection('workouts').doc(user.uid).get();
        if (!active) return;
        const hasPlan = snapshot.exists && snapshot.data()?.plan;
        navigation.reset({ index: 0, routes: [{ name: hasPlan ? 'Tabs' : 'WorkoutGenerating' }] });
      } catch (_) {
        if (active) setPlanError('Could not load your account. Check your connection and try again.');
      }
    }
    decide();
    return () => { active = false; };
  }, [loading, userData, error, attempt, navigation]);
  const message = error || planError;
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: Colors.background }}>
    {message ? <><Text style={{ color: 'white', marginBottom: 20 }}>{message}</Text><Button title="Try Again" onPress={() => { retry?.(); setAttempt(value => value + 1); }} /></> : <ActivityIndicator size="large" color={Colors.primary} />}
  </View>;
}
