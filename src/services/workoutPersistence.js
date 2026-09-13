import firestore from '@react-native-firebase/firestore';
import { localDateKey, withoutUndefined, setTotals } from '../utils/workoutData';

export function exerciseRecord(uid, exercise, workoutId = null, parent = {}) {
  const totals = setTotals(exercise.setData || []);
  return withoutUndefined({
    ...exercise, exerciseId: exercise.id || null, userId: uid, name: exercise.name || 'Custom exercise',
    target: exercise.target || '', bodyPart: exercise.bodyPart || '', equipment: exercise.equipment || '',
    sets: exercise.sets ?? exercise.setData?.length ?? 0, reps: exercise.reps ?? totals.reps,
    weightUsed: exercise.weightUsed ?? (totals.reps ? totals.volume/totals.reps : 0),
    duration: exercise.duration || 0, restTime: exercise.restTime ?? 60,
    planId: parent.planId || exercise.planId || null, planVersion: parent.planVersion || exercise.planVersion || null,
    weekNumber: parent.weekNumber || exercise.weekNumber || null,
    completed: exercise.completed !== false && !exercise.skipped, skipped: Boolean(exercise.skipped),
    rpe: exercise.rpe ?? null, pain: exercise.pain ?? null, painLevel: exercise.painLevel ?? null,
    setData: exercise.setData || [], workoutId, workoutDate: parent.date || exercise.workoutDate || localDateKey(),
    date: parent.date || exercise.date || localDateKey(), type: workoutId ? 'workout' : 'single',
    completedAt: firestore.FieldValue.serverTimestamp(), timestamp: Date.now(),
  });
}

async function persist(uid, data, full) {
  if (!uid) throw new Error('Sign in before saving.');
  const db = firestore();
  const user = db.collection('users').doc(uid);
  const ref = user.collection(full ? 'workoutHistory' : 'exerciseHistory').doc(data.sessionId || undefined);
  const exercises = full ? data.exercises : [data];
  if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > 150) throw new Error('The session must contain between 1 and 150 exercises.');
  const records = exercises.map(ex => exerciseRecord(uid,ex,full ? ref.id : null,data));
  const reps = records.reduce((sum,ex)=>sum+Number(ex.reps || 0),0);
  const volume = records.reduce((sum,ex)=>sum+(ex.setData.length ? setTotals(ex.setData).volume : Number(ex.weightUsed || 0)*Number(ex.reps || 0)),0);
  const completed = records.filter(ex=>ex.completed && !ex.skipped).length;
  const count = Number(data.totalExercises) || records.length;
  const result = full ? withoutUndefined({ ...data, userId:uid, exercises:records.map(({completedAt, ...exercise}) => exercise), totalExercises:count,
    completedExercises:completed, skippedExercises:records.filter(ex=>ex.skipped).length,
    totalSets:records.reduce((sum,ex)=>sum+Number(ex.sets || 0),0), totalReps:reps,totalWeight:Math.round(volume),
    completionPercentage:Math.min(100,Math.round(completed/count*100)),
    completionStatus:completed === count ? 'completed' : completed ? 'partial' : 'skipped',
    duration:data.duration || 0,caloriesBurned:data.caloriesBurned || 0,prAchieved:Boolean(data.PRAchieved),
    date:data.date || localDateKey(),type:'full',completedAt:firestore.FieldValue.serverTimestamp(),timestamp:Date.now(),
  }) : records[0];
  // All documents (including weight history) commit together. Repeating the same
  // session after a lost response never creates duplicate workout/exercise rows.
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) return;
    const weighted = records.filter(ex=>ex.exerciseId && ex.weightUsed>0 && ex.completed);
    const ids = [...new Set(weighted.map(ex=>ex.exerciseId))];
    const weightDocs = await Promise.all(ids.map(async id=>{
      const weightRef=user.collection('exerciseWeights').doc(id);
      return {id,ref:weightRef,snapshot:await tx.get(weightRef)};
    }));
    tx.set(ref,result);
    if(full) records.forEach((record,i)=>tx.set(user.collection('exerciseHistory').doc(`${ref.id}_${i}`),record));
    for(const {id,ref:weightRef,snapshot} of weightDocs){
      const previous=snapshot.exists ? snapshot.data() : {};
      const additions=weighted.filter(ex=>ex.exerciseId===id).flatMap(ex=>{
        const sets=ex.setData.length ? ex.setData : [{weight:ex.weightUsed,reps:ex.reps}];
        return sets.map(set=>({weight:Number(set.weight)||0,reps:Number(set.reps)||0,date:result.date,timestamp:Date.now(),sessionId:ref.id}));
      });
      const history=[...(previous.history || []),...additions].slice(-50);
      const repPRs={...(previous.repPRs || {})};
      for(const entry of additions) for(const reps of [1,3,5,8,10,12]) if(entry.reps===reps) repPRs[`pr_${reps}`]=Math.max(repPRs[`pr_${reps}`] || 0,entry.weight);
      tx.set(weightRef,{...previous,exerciseId:id,exerciseName:weighted.find(ex=>ex.exerciseId===id).name,history,currentPR:Math.max(previous.currentPR || 0,...history.map(ex=>ex.weight)),repPRs,lastEntry:history[history.length-1],lastUpdated:Date.now()},{merge:true});
    }
  });
  return {success:true,...result,id:ref.id};
}
export const persistExercise = (uid,data) => persist(uid,data,false);
export const persistWorkout = (uid,data) => persist(uid,data,true);
