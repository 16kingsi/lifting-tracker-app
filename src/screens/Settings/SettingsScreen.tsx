import { PhoneIcon } from '../../components/Icons';
import { Loading } from '../../components/Loading';
import { getSettings } from '../../db/queries';
import { setDefaultUnit } from '../../db/routine';
import { useData } from '../../db/useData';
import type { Unit } from '../../types';
import './settings.css';

const UNITS: Unit[] = ['lb', 'kg'];

// The backup and data sections arrive with export and import.
export function SettingsScreen() {
  const settings = useData(getSettings);
  if (!settings) return <Loading />;

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <div className="settings">
        <section className="settings__section">
          <h2 className="settings__heading">Units</h2>
          <div className="settings__card">
            <div className="settings__row">
              <span className="settings__text">
                <span className="settings__label">Default unit</span>
                <span className="settings__detail">You can still switch any single set</span>
              </span>
              <span role="radiogroup" aria-label="Default unit" className="segmented settings__units">
                {UNITS.map((unit) => (
                  <button
                    key={unit}
                    role="radio"
                    aria-checked={settings.defaultUnit === unit}
                    className="segmented__option"
                    onClick={() => setDefaultUnit(unit)}
                  >
                    {unit}
                  </button>
                ))}
              </span>
            </div>
            <p className="settings__detail">Charts and comparisons always use pounds.</p>
          </div>
        </section>

        <section aria-label="About storage" className="settings__about">
          <PhoneIcon />
          <p>
            Everything is stored only on this phone. There is no account and nothing is uploaded.
            Clearing browser data or uninstalling the app deletes your history, so keep a recent
            backup.
          </p>
        </section>
      </div>
    </>
  );
}
