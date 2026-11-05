// Functions that change the routine and settings. A workout keeps its own copy of the
// plan, so these only affect workouts started afterwards. An exercise's name and type
// are shared, though: renaming one corrects it everywhere, including in history.
import type { ExerciseType, PlanItem, TemplateId, Unit } from '../types';
import { db } from './schema';
import { resolveExercise, type ExerciseChoice } from './workouts';

const NEW_EXERCISE_SETS = 3;

export async function saveTemplateItems(templateId: TemplateId, items: PlanItem[]): Promise<void> {
  await db.templates.update(templateId, { items });
}

export async function addToTemplate(templateId: TemplateId, choice: ExerciseChoice): Promise<string> {
  return db.transaction('rw', db.templates, db.exercises, async () => {
    const exerciseId = await resolveExercise(choice);
    const template = await db.templates.get(templateId);
    await db.templates.update(templateId, {
      items: [...(template?.items ?? []), { exerciseId, targetSets: NEW_EXERCISE_SETS }],
    });
    return exerciseId;
  });
}

export async function renameExercise(exerciseId: string, name: string): Promise<void> {
  await db.exercises.update(exerciseId, { name });
}

export async function setExerciseType(exerciseId: string, type: ExerciseType): Promise<void> {
  await db.exercises.update(exerciseId, { type });
}

export async function setDefaultUnit(defaultUnit: Unit): Promise<void> {
  await db.settings.update('settings', { defaultUnit });
}
