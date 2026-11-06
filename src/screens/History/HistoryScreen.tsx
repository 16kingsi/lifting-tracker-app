import { Fragment, useEffect, useState } from 'react';
import { Loading } from '../../components/Loading';
import { loadHistory } from '../../db/queries';
import { useData } from '../../db/useData';
import { formatMonth } from '../../lib/format';
import { forgetRememberedCard, takeRememberedCard } from './openCard';
import { SessionCard } from './SessionCard';
import './history.css';

// `openId` is the workout to show open first, such as the one just finished.
export function HistoryScreen({ openId }: { openId: string | null }) {
  const history = useData(loadHistory);
  const [openCard, setOpenCard] = useState(() => takeRememberedCard() ?? openId);
  useEffect(forgetRememberedCard, []);

  if (!history) return <Loading />;

  const { workouts, exercisesById, hasActiveWorkout, settings } = history;
  const monthOf = (index: number) => formatMonth(workouts[index].session.finishedAt ?? 0);

  return (
    <>
      <h1 className="page-title">History</h1>
      <div className="history">
        {workouts.length === 0 && (
          <p className="history__empty">Finished workouts will appear here.</p>
        )}
        {workouts.map((workout, index) => {
          const { id } = workout.session;
          return (
            <Fragment key={id}>
              {(index === 0 || monthOf(index) !== monthOf(index - 1)) && (
                <h2 className="history__month">{monthOf(index)}</h2>
              )}
              <SessionCard
                workout={workout}
                exercisesById={exercisesById}
                defaultUnit={settings.defaultUnit}
                canReopen={!hasActiveWorkout}
                open={openCard === id}
                onToggle={() => setOpenCard(openCard === id ? null : id)}
              />
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
