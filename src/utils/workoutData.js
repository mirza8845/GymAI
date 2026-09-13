export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function exerciseDetails(exercise = {}) {
  return { sets: exercise.workoutDetails?.sets ?? exercise.sets ?? 3, reps: String(exercise.workoutDetails?.reps ?? exercise.reps ?? '8-12'), restSeconds: exercise.workoutDetails?.restSeconds ?? exercise.restSeconds ?? 60, notes: exercise.workoutDetails?.notes ?? exercise.notes ?? '' };
}
export function validExerciseDetails(details) {
  return Number.isInteger(Number(details.sets)) && Number(details.sets) > 0 && Number(details.sets) <= 100 && String(details.sets).trim() !== '' && /^\d+(?:\s*-\s*\d+)?(?:\s*(?:s|sec|min))?$/.test(String(details.reps).trim()) && parseInt(details.reps,10)>0 && Number.isFinite(Number(details.restSeconds)) && Number(details.restSeconds)>=0 && Number(details.restSeconds)<=3600;
}
export function setTotals(sets = []) {
  return sets.reduce((total, set) => ({reps:total.reps+Number(set.reps || 0),volume:total.volume+Number(set.reps || 0)*Number(set.weight || 0)}), {reps:0,volume:0});
}
export function withoutUndefined(value) {
  if (Array.isArray(value)) return value.map(item => item === undefined ? null : withoutUndefined(item));
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[key,withoutUndefined(item)]));
  return value;
}
