# hexage

Браузерная стратегия/выживание в реальном времени на гексогональной карте. Сеттинг — Свитки (Skyrim).

## Команды

- `npm run dev` — запуск dev-сервера Vite (http://localhost:5173)
- `npm run build` — TypeScript check + production сборка (`tsc -b && vite build`)
- `npm run preview` — превью production сборки

## Стек

Vite 8 + React 19 + TypeScript 6 + MobX 6. Canvas 2D рендеринг (без внешних графических библиотек). `oxlint` для линтинга.

## Структура

```
src/
├── config.ts                 # Все игровые константы
├── types.ts                  # Общие типы
├── core/                     # Чистая логика (не зависит от React/DOM)
│   ├── hex/HexGrid.ts        # Axial-координаты, соседи, пути, пиксельные конвертации
│   └── GameEngine.ts         # Главный игровой цикл (тики, волны, бой, ресурсы)
├── store/gameStore.ts        # MobX store: состояние игры + все actions
├── renderer/HexRenderer.ts   # Canvas-рендеринг изометрических гексов + зданий
├── data/                     # Статические данные
│   ├── stages.ts             # 6 этапов кампании
│   ├── buildings.ts          # 10 типов зданий (характеристики, стоимость)
│   ├── enemies.ts            # 9 типов врагов (драугры, бандиты, изгои, фалмеры, дракон)
│   └── techs.ts              # Дерево технологий (7 исследований)
└── ui/                       # React-компоненты
    ├── MainMenu.tsx
    ├── StageSelect.tsx
    ├── GameCanvas.tsx         # Canvas + game loop + управление камерой
    ├── HUD.tsx
    ├── HexPanel.tsx
    ├── TechPanel.tsx
    └── GameOver.tsx
```

## Архитектура

### Core/ не зависит от React
Вся игровая логика в `src/core/GameEngine.ts` — тики, ресурсы, строительство, враги, бой. Не использует React, DOM, или Zustand напрямую. Функция `gameTick(state)` мутирует `GameState`. Store вызывает `gameTick` в фиксированном шаге (100ms) через `requestAnimationFrame`.

### Изометрический рендеринг
Гексы с pointy-top ориентацией, axial-координаты (q, r). Рендерятся как призмы: верхняя грань — шестиугольник, боковые грани — для возвышенностей (горы). Камера: drag для панорамирования, scroll для зума.

### Игровой цикл (один тик = 100ms)
1. Добыча ресурсов с построек
2. Прогресс строительства/исследований
3. Таймер волны → спавн врагов
4. Движение врагов к цели (BFS pathfinding)
5. Урон от оборонительных зданий
6. Очистка мёртвых врагов + награда
7. Проверка условий победы/поражения

### Кампания (6 этапов)
Каждый этап имеет: карту (радиус 3-5 гексов), набор волн, цели (выжить X волн, захватить N гексов, убить босса), доступные здания и технологии.

## Важно

- **Типы через const + `as const`**: TypeScript 6 с `erasableSyntaxOnly` не поддерживает `enum` — используем `const` объекты с `(typeof X)[keyof typeof X]`
- **Все параметры в `config.ts`**: размер гекса, цвета, таймеры волн, настройки камеры
- **Состояние в Map**: `hexes: Map<string, HexTile>` и `enemies: Map<number, EnemyUnit>` — при тике создаются новые Map, а не мутируются
- **Здания строятся через прогресс**: `tile.building.progress` от 0 до 1, отрисовываются как леса пока < 1
- **Прогресс сохраняется в localStorage**: ключ `hexage_progress`, массив ID пройденных этапов
- **Pathfinding**: простой BFS, без весов. Враги идут к ближайшему гексу игрока

## GitHub

- **Организация**: `Smynay`
- **Репозиторий**: `ai-gen-hexage`
- **Ветки**:
  - `main` — production, авто-деплой на GitHub Pages (корень)
  - `dev` — интеграционная, авто-деплой на GitHub Pages (`/dev/`)
- **GitHub Pages**: статический SPA, деплой через GitHub Actions (`.github/workflows/deploy.yml`)

## AI-команда разработки

Проект использует AI-агентов (OpenCode subagents) для распределения задач:

| Агент | Файл | Роль |
|---|---|---|
| `hexage` | `.opencode/agents/hexage.md` | Главный координатор, запуск через `/h` |
| `hexage-product` | `.opencode/agents/hexage-product.md` | Продакт: PRD, epic, подзадачи |
| `hexage-architect` | `.opencode/agents/hexage-architect.md` | Архитектор: дизайн до реализации + ревью после |
| `hexage-tsdev` | `.opencode/agents/hexage-tsdev.md` | TypeScript-разработчик: код игры |
| `hexage-devops` | `.opencode/agents/hexage-devops.md` | DevOps: GitHub Actions, Pages, CI/CD |

## Development flow (feature → dev → main)

1. **Product** создаёт epic и подзадачи с тегами `[architecture]`, `[tsdev]`, `[devops]`
2. **Architect** проектирует структуру для `[architecture]` подзадачи → design doc
3. **TS Dev** реализует `[tsdev]` подзадачу по дизайну архитектора
4. PR в `dev` → ревью → мёрж → деплой на `/dev/`
5. PR в `main` → ревью → мёрж → деплой на корень
6. Закрытие epic после всех подзадач

## Архитектурные правила (для architect)

### core/ не зависит от React
Вся игровая логика в `src/core/GameEngine.ts` — тики, ресурсы, строительство, враги, бой. **НИКОГДА** не импортирует React, MobX, или DOM. Только чистый TypeScript.

### Типы через const + as const
TypeScript 6 с `erasableSyntaxOnly` не поддерживает `enum`. Все перечисления — `const` объекты с `as const` и `(typeof X)[keyof typeof X]`.

### Все параметры в config.ts
Размер гекса, цвета, таймеры, настройки камеры — только в `src/config.ts`. Никаких magic numbers в коде.

### MobX паттерны
- Store: `makeAutoObservable(this)` в конструкторе
- Компоненты: обёрнуты в `observer()` из `mobx-react-lite`
- Состояние не мутируется напрямую вне actions

### Canvas рендеринг
Только в `src/renderer/HexRenderer.ts`. Не использовать Canvas API в React-компонентах.

### Направление зависимостей
`core/` → `store/` → `ui/`. Не наоборот. `renderer/` — чистые функции, могут использоваться из `ui/`.
