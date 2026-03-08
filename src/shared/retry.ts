import { Duration, Schedule } from "effect";

export const retryPolicy = (attempts: number) =>
   Schedule.recurs(attempts - 1).pipe(
      Schedule.addDelay((attempt) => Duration.millis(250 * Math.pow(2, attempt))),
   );
