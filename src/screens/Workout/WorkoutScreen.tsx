import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { Sheet } from '../../components/Sheet';
import { useNow } from '../../components/useNow';
import { getLastTime, loadActiveWorkout, type ActiveWorkout } from '../../db/queries';
import { useData } from '../../db/useData';
import { finishSession, setCurrentIndex } from '../../db/workouts';
import { formatDuration } from '../../lib/format';
import { leaveScreen, replacePath, useBackStep } from '../../router';
import type { Exercise } from '../../types';
import { ExerciseView } from './ExerciseView';
import './workout.css';

export function WorkoutScreen() {
  const workout = useData(loadActiveWorkout);

  // No workout in progress (it was just finished, for example), so go Home.
  useEffect(() => {
    if (workout === null) replacePath('/');
  }, [workout]);

  if (!workout) return <Loading />;
  return <WorkoutView workout={workout} />;
}

function WorkoutView({ workout }: { workout: ActiveWorkout }) {
  const [confirmingFinish, setConfirmingFinish] = useState(false);

  const { session, exercisesById, sets } = workout;
  const index = Math.min(session.currentIndex, session.items.length - 1);
  const item = session.items[index];
  const exercise = exercisesById.get(item.exerciseId)!;
  const isLastExercise = index === session.items.length - 1;

  const plannedSets = session.items.reduce((sum, i) => sum + i.targetSets, 0);
  const plannedSetsLogged = session.items.reduce((sum, i) => {
    const logged = sets.filter((s) => s.exerciseId === i.exerciseId).length;
    return sum + Math.min(logged, i.targetSets);
  }, 0);

  // The phone's Back button goes to the previous exercise, then Home from the first.
  useBackStep(index > 0, () => setCurrentIndex(session.id, index - 1));

  async function finish() {
    await finishSession(session.id);
    leaveScreen();
  }

  return (
    <div className="screen workout">
      <header className="workout-header">
        <button aria-label="Leave workout" className="icon-button" onClick={leaveScreen}>
          <CloseIcon />
        </button>
        <div className="workout-header__info">
          <span className="workout-header__day">Day {session.templateId}</span>
          <ElapsedTime since={session.startedAt} />
        </div>
        <button
          className={`finish-button ${isLastExercise ? 'finish-button--filled' : ''}`}
          onClick={() => (plannedSetsLogged < plannedSets ? setConfirmingFinish(true) : finish())}
        >
          Finish
        </button>
      </header>

      <section aria-label="Exercise" className="exercise-nav">
        <button
          aria-label="Previous exercise"
          className="exercise-nav__arrow"
          disabled={index === 0}
          onClick={() => setCurrentIndex(session.id, index - 1)}
        >
          <ChevronLeftIcon />
        </button>
        <div className="exercise-nav__center">
          <h1 className="exercise-nav__name">{exercise.name}</h1>
          <div className="exercise-nav__position">
            <span>
              Exercise {index + 1} of {session.items.length}
            </span>
            <span className="exercise-nav__dots" aria-hidden="true">
              {session.items.map((i, position) => {
                const done = sets.filter((s) => s.exerciseId === i.exerciseId).length >= i.targetSets;
                const state = position === index ? 'current' : done ? 'done' : 'todo';
                return <span key={i.exerciseId} className={`dot dot--${state}`} />;
              })}
            </span>
          </div>
        </div>
        <button
          aria-label="Next exercise"
          className="exercise-nav__arrow"
          disabled={isLastExercise}
          onClick={() => setCurrentIndex(session.id, index + 1)}
        >
          <ChevronRightIcon />
        </button>
      </section>

      {/* The key gives each exercise a fresh entry panel when moving between them. */}
      <ExerciseLoader key={exercise.id} workout={workout} exercise={exercise} index={index} />

      {confirmingFinish && (
        <Sheet label="Finish workout" onClose={() => setConfirmingFinish(false)}>
          <h2 className="sheet__title">Finish workout?</h2>
          <p className="sheet__text">
            {sets.length === 0
              ? "No sets have been logged, so this workout won't be saved."
              : `You've logged ${plannedSetsLogged} of ${plannedSets} planned sets.`}
          </p>
          <button className="btn btn--primary" onClick={finish}>
            Finish workout
          </button>
          <button className="btn btn--outline" onClick={() => setConfirmingFinish(false)}>
            Keep going
          </button>
        </Sheet>
      )}
    </div>
  );
}

function ElapsedTime({ since }: { since: number }) {
  const now = useNow(1000);
  return (
    <span className="workout-header__elapsed mono">{formatDuration((now - since) / 1000)} elapsed</span>
  );
}

interface ExerciseLoaderProps {
  workout: ActiveWorkout;
  exercise: Exercise;
  index: number;
}

// Waits for "last time" to load, so the entry panel can pre-fill from it.
function ExerciseLoader({ workout, exercise, index }: ExerciseLoaderProps) {
  const lastTime = useData(() => getLastTime(exercise.id), [exercise.id]);
  if (lastTime === undefined) return <Loading />;
  return <ExerciseView workout={workout} exercise={exercise} index={index} lastTime={lastTime} />;
}
