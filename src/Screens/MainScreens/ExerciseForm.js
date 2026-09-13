import React, {useState} from 'react';
import {View,Text,TextInput,ScrollView,Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import Button from '../../CommonComponent/Button';
import {WorkoutHistoryService} from '../../services/firebaseWorkoutHistory';
export default function ExerciseForm({route,navigation}) {
  const {workoutId,notes:initialNotes='',title='Workout notes'}=route.params || {};
  const [notes,setNotes]=useState(initialNotes);
  const save=async()=>{try{const uid=auth().currentUser?.uid;if(!uid||!workoutId)throw new Error('Choose a workout from your history first.');await WorkoutHistoryService.updateWorkoutNotes(uid,workoutId,notes.trim());navigation.goBack();}catch(error){Alert.alert('Could not save notes',error.message);}};
  return <SafeAreaView style={{flex:1,backgroundColor:'#141516'}}><ScrollView contentContainerStyle={{padding:24,gap:24}}><Button title="Back" onPress={()=>navigation.goBack()}/><Text style={{color:'white',fontSize:24}}>{title}</Text>{workoutId ? <><TextInput accessibilityLabel="Workout notes" value={notes} onChangeText={setNotes} multiline placeholder="How did your workout go?" placeholderTextColor="#aaa" style={{color:'white',minHeight:150,padding:16,backgroundColor:'#222'}}/><Button title="Save notes" onPress={save}/></> : <><Text style={{color:'white'}}>Choose a completed workout to view or edit notes.</Text><Button title="Workout history" onPress={()=>navigation.navigate('SaveRoutineDate')}/></>}</ScrollView></SafeAreaView>;
}
