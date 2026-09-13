import auth from '@react-native-firebase/auth';
import { WORKOUT_API_URL, WORKOUT_API_TIMEOUT_MS } from '../config/workoutApi';

async function callWorkoutEndpoint(path, body = {}) {
  const user = auth().currentUser;
  if (!user) {
    throw { code: 'VALIDATION_ERROR', message: 'Please log in and try again.' };
  }

  let idToken;
  try {
    // Firebase refreshes expired tokens automatically.
    idToken = await user.getIdToken();
  } catch (error) {
    throw {
      code: error?.code === 'auth/network-request-failed' ? 'NETWORK_ERROR' : 'VALIDATION_ERROR',
      message: error?.code === 'auth/network-request-failed'
        ? 'Cannot reach the workout service. Check your internet.'
        : 'Please log in and try again.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WORKOUT_API_TIMEOUT_MS);
  try {
    const response = await fetch(`${WORKOUT_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let parsed;
    try {
      parsed = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw { code: 'GENERATION_FAILED', message: 'Workout service returned an invalid response.' };
    }
    if (!response.ok || parsed?.error) {
      // Preserve the error-code convention consumed by the existing screens.
      throw {
        code: `functions/${parsed?.error?.code || 'internal'}`,
        message: parsed?.error?.message || 'Workout service error.',
      };
    }
    if (!parsed || typeof parsed !== 'object' || !Object.prototype.hasOwnProperty.call(parsed, 'data') || parsed.data == null) {
      throw { code: 'GENERATION_FAILED', message: 'Workout service returned an invalid response.' };
    }
    return parsed.data;
  } catch (error) {
    if (controller.signal.aborted) {
      throw { code: 'TIMEOUT', message: 'The workout request timed out. Please try again.' };
    }
    if (error?.code) throw error;
    throw { code: 'NETWORK_ERROR', message: 'Cannot reach the workout service. Check your internet.' };
  } finally {
    clearTimeout(timeout);
  }
}

export const callGenerateWorkoutPlan = () => callWorkoutEndpoint('/api/generateWorkoutPlan');
export const callValidateWorkoutPlan = dailyWorkouts => callWorkoutEndpoint('/api/validateWorkoutPlan', { dailyWorkouts });
export const callCheckWeeklyPlan = () => callWorkoutEndpoint('/api/checkWeeklyPlan');

export const callDeleteAccount = () => callWorkoutEndpoint('/api/deleteAccount');
