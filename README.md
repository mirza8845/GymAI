# GymAI mobile app

React Native 0.79 mobile app. Run `npm install`, then `npm start` and `npm run android` or `npm run ios`. On iOS, run the project's CocoaPods setup after changing native dependencies.

## Backend and data flow

The public API origin is bundled through `src/config/workoutApi.js`: https://gym-ai-server.vercel.app. This is a plain React Native/Metro app, so it does not use Expo environment-variable injection. Change the public configuration and rebuild the app when changing the deployment origin. Never put service-account or provider keys in the app.

`src/services/workoutApi.js` obtains the current Firebase Auth ID token and sends it as `Authorization: Bearer <token>`. Requests use raw JSON; successful responses contain `{ data: ... }`, failures `{ error: { code, message } }`. Existing screen error codes are preserved. Requests time out after 65 seconds.

- WorkoutGenerating → generation service → POST `/api/generateWorkoutPlan` with `{}`. Server reads the saved profile, builds and saves the current plan.
- ManualWorkout → POST `/api/validateWorkoutPlan` with `{ dailyWorkouts }`. The existing screen then saves through Firestore; its existing allow-save-on-validation-network-error behavior is unchanged.
- Home → POST `/api/checkWeeklyPlan` with `{}`. Server checks eligibility and performs weekly progression when due. This runs on app use, not on a schedule.

Firebase native initialization remains in the Android/iOS project configuration. Firebase Auth still handles signup, login, password reset and sessions. Firestore still handles profiles (`Users/{uid}`), current plan reads/edits (`workouts/{uid}`), custom sessions, workout/exercise history and weights (`users/{uid}/...`). Case-sensitive collection names and document shapes are unchanged. The dedicated server has no general CRUD endpoints; these existing direct Firestore operations remain necessary.

ExerciseDB browsing/local fallbacks and Cloudinary profile uploads remain independent of the workout API. No chat route is exposed in the current navigation.

## Validation

`npm test -- --runInBand --watchman=false` runs mobile tests. The focused API contract suite is `__tests__/workoutApi.test.js`. The existing App render test needs navigation/native-module test setup. The existing lint script requires an ESLint configuration that was not present in this checkout.

The separate `gym-ai-server` repository owns the workout engine and deployment. See `MIGRATION_REPORT.md` for findings and release checks.
