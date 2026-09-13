import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDateKey } from './workoutData';
export default function useDailyHydration() {
  const uid = auth().currentUser?.uid;
  const [day,setDay] = useState(localDateKey());
  const [intake,setIntake] = useState(0);
  const [loaded,setLoaded] = useState(false);
  const [error,setError] = useState(null);
  const writes = useRef(Promise.resolve());
  const key = uid ? `hydration:${uid}:${day}` : null;
  useEffect(() => { const subscription=AppState.addEventListener('change',state=>{if(state==='active')setDay(localDateKey());});const timer=setInterval(()=>setDay(localDateKey()),60000);return()=>{subscription.remove();clearInterval(timer);}; },[]);
  useEffect(() => {
    let active=true;setLoaded(false);setIntake(0);
    if(!key){setLoaded(true);return;}
    AsyncStorage.getItem(key).then(value=>{if(active){setIntake(Math.max(0,Number(value)||0));setLoaded(true);setError(null);}}).catch(()=>{if(active){setError('Could not load your water log. Reopen this screen to retry.');}});
    return()=>{active=false;};
  },[key]);
  const update = value => {
    if(!key || !loaded)return;
    const next=Math.round(Math.max(0,value)*100)/100;
    setIntake(next);
    writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,String(next))).then(()=>setError(null)).catch(()=>setError('Could not save your water log. Please try again.'));
  };
  return {intake,update,loaded,error};
}
