import { FormEvent, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { budgetLabels, categoryOptions, paceLabels } from "../lib/labels";
import type { BudgetLevel, TravelPace, User, UserPreferences } from "../types";

interface ProfilePanelProps {
  user: User;
  onSave: (input: { name: string; preferences: UserPreferences }) => void;
  saving: boolean;
}

export function ProfilePanel({ user, onSave, saving }: ProfilePanelProps) {
  const [name, setName] = useState(user.name);
  const [preferences, setPreferences] = useState(user.preferences);

  const selectedLabels = useMemo(
    () =>
      categoryOptions
        .filter((option) => preferences.interests.includes(option.value))
        .map((option) => option.label)
        .join(", "),
    [preferences.interests]
  );

  function toggleInterest(value: string) {
    setPreferences((current) => {
      const exists = current.interests.includes(value);
      const interests = exists
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value];

      return {
        ...current,
        interests: interests.length ? interests : current.interests
      };
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSave({ name, preferences });
  }

  return (
    <section className="workspace-panel profile-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Профиль пользователя</p>
          <h2>{user.name}</h2>
        </div>
        <span className="status-pill">{user.email}</span>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Имя пользователя
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>

        <fieldset>
          <legend>Интересы</legend>
          <div className="chip-grid">
            {categoryOptions.map((option) => (
              <label
                key={option.value}
                className={
                  preferences.interests.includes(option.value)
                    ? "choice-chip checked"
                    : "choice-chip"
                }
              >
                <input
                  type="checkbox"
                  checked={preferences.interests.includes(option.value)}
                  onChange={() => toggleInterest(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>
            Бюджет
            <select
              value={preferences.budget}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  budget: event.target.value as BudgetLevel
                }))
              }
            >
              {Object.entries(budgetLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Темп
            <select
              value={preferences.pace}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  pace: event.target.value as TravelPace
                }))
              }
            >
              {Object.entries(paceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Максимальная длительность маршрута:{" "}
          <strong>{Math.round(preferences.maxDuration / 60)} ч</strong>
          <input
            type="range"
            min={120}
            max={720}
            step={30}
            value={preferences.maxDuration}
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                maxDuration: Number(event.target.value)
              }))
            }
          />
        </label>

        <div className="profile-summary">
          <span>Сейчас рекомендации учитывают:</span>
          <strong>{selectedLabels}</strong>
        </div>

        <button className="primary-button fit" type="submit" disabled={saving}>
          <Save size={18} />
          {saving ? "Сохранение..." : "Сохранить профиль"}
        </button>
      </form>
    </section>
  );
}
