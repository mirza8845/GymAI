import { callGenerateWorkoutPlan, callValidateWorkoutPlan, callCheckWeeklyPlan } from '../src/services/workoutApi';
import auth from '@react-native-firebase/auth';
jest.mock('@react-native-firebase/auth', () => jest.fn());
const originalFetch = global.fetch;
beforeEach(() => {
  auth.mockReturnValue({ currentUser: { getIdToken: jest.fn().mockResolvedValue('id-token') } });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { valid: true } }) });
});
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });
it.each([
  [callGenerateWorkoutPlan, '/api/generateWorkoutPlan', undefined, {}],
  [callCheckWeeklyPlan, '/api/checkWeeklyPlan', undefined, {}],
  [callValidateWorkoutPlan, '/api/validateWorkoutPlan', { Monday: [{ name: 'Squat' }] }, { dailyWorkouts: { Monday: [{ name: 'Squat' }] } }],
])('sends the authenticated contract to production (%s)', async (call, path, input, body) => {
  await expect(call(input)).resolves.toEqual({ valid: true });
  expect(fetch).toHaveBeenCalledWith(`https://gym-ai-server.vercel.app${path}`, expect.objectContaining({
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer id-token' }, body: JSON.stringify(body),
  }));
});
it('does not send a request when signed out', async () => {
  auth.mockReturnValue({ currentUser: null });
  await expect(callGenerateWorkoutPlan()).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  expect(fetch).not.toHaveBeenCalled();
});
it('preserves server validation errors', async () => {
  fetch.mockResolvedValue({ ok: false, json: async () => ({ error: { code: 'failed-precondition', message: 'Complete profile' } }) });
  await expect(callGenerateWorkoutPlan()).rejects.toMatchObject({ code: 'functions/failed-precondition', message: 'Complete profile' });
});
it.each([null, {}, { data: null }])('rejects malformed successful responses', async parsed => {
  fetch.mockResolvedValue({ ok: true, json: async () => parsed });
  await expect(callGenerateWorkoutPlan()).rejects.toMatchObject({ code: 'GENERATION_FAILED' });
});
it('handles a Vercel non-JSON error', async () => {
  fetch.mockResolvedValue({ ok: false, json: async () => { throw new SyntaxError(); } });
  await expect(callGenerateWorkoutPlan()).rejects.toMatchObject({ code: 'GENERATION_FAILED' });
});
it('handles network errors', async () => {
  fetch.mockRejectedValue(new TypeError('Network failed'));
  await expect(callGenerateWorkoutPlan()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
});
it('aborts a stalled request', async () => {
  jest.useFakeTimers();
  fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
  const pending = expect(callGenerateWorkoutPlan()).rejects.toMatchObject({ code: 'TIMEOUT' });
  await jest.advanceTimersByTimeAsync(65000);
  await pending;
});
