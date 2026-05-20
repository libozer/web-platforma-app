import { FormEvent, useState } from "react";
import { Compass, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { login, register, storeToken } from "../lib/api";
import type { User } from "../types";

interface AuthPanelProps {
  onAuthenticated: (user: User) => void;
}

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = isRegister
        ? await register({ name, email, password })
        : await login({ email, password });

      storeToken(payload.token);
      onAuthenticated(payload.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Авторизация">
        <div className="brand-mark">
          <Compass size={28} />
          <div>
            <strong>Tourist</strong>
            <span>Подбор туристических маршрутов</span>
          </div>
        </div>

        <div className="auth-copy">
          <h1>{isRegister ? "Создание профиля" : "Вход в профиль"}</h1>
          <p>
            Профиль нужен для сохранения маршрутов, учёта интересов и
            персональных рекомендаций.
          </p>
        </div>

        <div className="segmented" role="tablist" aria-label="Режим входа">
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label>
              Имя
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Глеб Курчицкий"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mail@example.com"
              required
            />
          </label>

          <label>
            Пароль
            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 8 символов"
                minLength={isRegister ? 8 : undefined}
                required
              />
              <button
                type="button"
                className="icon-button"
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" type="submit" disabled={loading}>
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading
              ? "Отправка..."
              : isRegister
                ? "Зарегистрироваться"
                : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}
