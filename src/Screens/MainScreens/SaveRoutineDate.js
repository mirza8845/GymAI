import React,{useCallback,useState} from 'react';
import {Text,ScrollView,TouchableOpacity,ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import Button from '../../CommonComponent/Button';
import {WorkoutHistoryService} from '../../services/firebaseWorkoutHistory';
export default function SaveRoutineDate({navigation}) {
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null);
  const load=useCallback(async()=>{setLoading(true);setError(null);try{const uid=auth().currentUser?.uid;if(!uid)throw new Error('Please sign in.');const result=await WorkoutHistoryService.getUserWorkoutHistory(uid,100);setItems(result.workouts);}catch(err){setError('Could not load workout history. Please try again.');}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  return <SafeAreaView style={{flex:1,backgroundColor:'#141516'}}><ScrollView contentContainerStyle={{padding:24,gap:16}}><Button title="Back" onPress={()=>navigation.goBack()}/><Text style={{color:'white',fontSize:24}}>Workout history</Text>{loading ? <ActivityIndicator/> : error ? <><Text style={{color:'white'}}>{error}</Text><Button title="Try again" onPress={load}/></> : items.length ? items.map(item=><TouchableOpacity key={item.id} accessibilityRole="button" onPress={()=>navigation.navigate('ExerciseForm',{workoutId:item.id,notes:item.notes||'',title:item.day||'Workout'})} style={{padding:20,backgroundColor:'#222',borderRadius:12}}><Text style={{color:'white'}}>{item.day || 'Workout'} • {item.date}</Text><Text style={{color:'#aaa'}}>{item.notes || 'Tap to add notes'}</Text></TouchableOpacity>) : <Text style={{color:'white'}}>No completed workouts yet.</Text>}<Button title="Analytics" onPress={()=>navigation.navigate('Tabs',{screen:'Statics'})}/></ScrollView></SafeAreaView>;
}
