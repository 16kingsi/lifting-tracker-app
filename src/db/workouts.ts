// Functions that change workouts. Every one writes to the database straight away,
// so closing the app at any moment loses nothing that has been logged.
import { finishTime } from '../lib/sessionTime';
import type { Draft, Exercise, ExerciseType, LoggedSet, PlanItem, Session, TemplateId } from '../types';
import { db } from './schema';

// Starts a workout, unless one is already in progress.
export async function startSession(templateId: TemplateId): Promise<void> {
  await db.transaction('rw', db.sessions, db.templates, async () => {
    const existing = await db.sessions.filter((s) => s.finishedAt === null).first();
    if (existing) return;

    const template = await db.templates.get(templateId);
    await db.sessions.add({
      id: crypto.randomUUID(),
      templateId,
      startedAt: Date.now(),
      finishedAt: null,
      items: template?.items ?? [],
      currentIndex: 0,
    });
  });
}

// Completes a workout. One with no logged sets is dropped instead, so an empty
// workout doesn't appear in history or change which day is suggested next.
export async function finishSession(session: Session): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    const setCount = await db.sets.where('sessionId').equals(session.id).count();
    if (setCount === 0) {
      await db.sessions.delete(session.id);
    } else {
      await db.sessions.update(session.id, {
        finishedAt: finishTime(session, Date.now()),
        reopened: undefined,
      });
    }
  });
}

// Deletes a workout and every set in it, finished or not.
export async function discardSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

// Puts a finished workout back in progress, unless another one already is.
export async function reopenSession(sessionId: string): Promise<boolean> {
  return db.transaction('rw', db.sessions, async () => {
    const active = await db.sessions.filter((s) => s.finishedAt === null).first();
    const session = await db.sessions.get(sessionId);
    if (active || !session?.finishedAt) return false;

    await db.sessions.update(sessionId, {
      finishedAt: null,
      reopened: { at: Date.now(), previousFinishedAt: session.finishedAt },
    });
    return true;
  });
}

export async function setCurrentIndex(sessionId: string, currentIndex: number): Promise<void> {
  await db.sessions.update(sessionId, { currentIndex });
}

// Turns the entry panel's values into the fields stored on a set.
function setFields(type: ExerciseType, draft: Draft) {
  const note = draft.note.trim();
  return type === 'timed'
    ? { kind: 'timed' as const, durationSec: draft.seconds, note }
    : {
        kind: 'weight' as const,
        reps: draft.reps,
        weightValue: draft.weight,
        weightUnit: draft.unit,
        note,
      };
}

export async function logSet(
  sessionId: string,
  exerciseId: string,
  type: ExerciseType,
  draft: Draft,
): Promise<LoggedSet> {
  return db.transaction('rw', db.sets, async () => {
    const existing = await db.sets.where('sessionId').equals(sessionId).toArray();
    const set: LoggedSet = {
      id: crypto.randomUUID(),
      sessionId,
      exerciseId,
      order: Math.max(0, ...existing.map((s) => s.order)) + 1,
      loggedAt: Date.now(),
      ...setFields(type, draft),
    };
    await db.sets.add(set);
    return set;
  });
}

// Replaces a set's values. It keeps its id, position and the time it was logged.
export async function updateSet(set: LoggedSet, type: ExerciseType, draft: Draft): Promise<LoggedSet> {
  const { id, sessionId, exerciseId, order, loggedAt } = set;
  const updated: LoggedSet = { id, sessionId, exerciseId, order, loggedAt, ...setFields(type, draft) };
  await db.sets.put(updated);
  return updated;
}

export async function deleteSet(setId: string): Promise<void> {
  await db.sets.delete(setId);
}

// Deletes a set from a finished workout. A workout left with no sets goes too, the
// same as one finished with no sets.
export async function deleteFinishedSet(set: LoggedSet): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.delete(set.id);
    const remaining = await db.sets.where('sessionId').equals(set.sessionId).count();
    if (remaining === 0) await db.sessions.delete(set.sessionId);
  });
}

// Either an exercise that already exists, or a new one to create.
export type ExerciseChoice = { id: string } | { name: string; type: ExerciseType };

export async function resolveExercise(choice: ExerciseChoice): Promise<string> {
  if ('id' in choice) return choice.id;
  const exercise: Exercise = { id: crypto.randomUUID(), name: choice.name, type: choice.type };
  await db.exercises.add(exercise);
  return exercise.id;
}

// Replaces the exercise at `index` in this workout. If sets were already logged
// for it, it stays in the workout (so they aren't lost from view) and the new
// exercise goes after it.
export async function swapExercise(
  session: Session,
  index: number,
  choice: ExerciseChoice,
  updateTemplate: boolean,
): Promise<void> {
  await db.transaction('rw', db.sessions, db.templates, db.exercises, db.sets, async () => {
    const old = session.items[index];
    const exerciseId = await resolveExercise(choice);
    const newItem: PlanItem = { exerciseId, targetSets: old.targetSets };

    const loggedCount = await db.sets
      .where('[sessionId+exerciseId]')
      .equals([session.id, old.exerciseId])
      .count();

    const items = [...session.items];
    if (loggedCount > 0) {
      items.splice(index + 1, 0, newItem);
      await db.sessions.update(session.id, { items, currentIndex: index + 1 });
    } else {
      items[index] = newItem;
      await db.sessions.update(session.id, { items, currentIndex: index });
    }

    if (updateTemplate) {
      const template = await db.templates.get(session.templateId);
      if (template) {
        const position = template.items.findIndex((i) => i.exerciseId === old.exerciseId);
        const planItems = [...template.items];
        if (position >= 0) planItems[position] = newItem;
        else planItems.push(newItem);
        await db.templates.update(template.id, { items: planItems });
      }
    }
  });
}

// Adds an extra exercise after the one at `index`, and moves to it.
export async function addExercise(
  session: Session,
  index: number,
  choice: ExerciseChoice,
  updateTemplate: boolean,
): Promise<void> {
  await db.transaction('rw', db.sessions, db.templates, db.exercises, async () => {
    const current = session.items[index];
    const exerciseId = await resolveExercise(choice);
    const newItem: PlanItem = { exerciseId, targetSets: 3 };

    const items = [...session.items];
    items.splice(index + 1, 0, newItem);
    await db.sessions.update(session.id, { items, currentIndex: index + 1 });

    if (updateTemplate) {
      const template = await db.templates.get(session.templateId);
      if (template) {
        const position = template.items.findIndex((i) => i.exerciseId === current.exerciseId);
        const planItems = [...template.items];
        planItems.splice(position >= 0 ? position + 1 : planItems.length, 0, newItem);
        await db.templates.update(template.id, { items: planItems });
      }
    }
  });
}
