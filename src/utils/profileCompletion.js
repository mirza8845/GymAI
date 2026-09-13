export function isProfileComplete(user) {
  if (!user) return false;
  const fields = ['age', 'height', 'weight', 'gender', 'availableEquipment', 'currentDiet', 'currentPhysique', 'dietaryPreferences', 'energyLevel', 'fitnessChallenge', 'foodAllergies', 'goal', 'goalPhysique', 'gymExperience', 'sleepHours', 'waterIntakeLiters', 'weeklyWorkoutCommitment', 'fullName'];
  return fields.every(field => {
    const value = user[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    return typeof value === 'string' && value.trim().length > 0;
  });
}
