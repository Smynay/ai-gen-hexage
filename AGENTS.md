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
├── main.tsx                   # Точка входа React
├── App.tsx                    # Корневой компонент приложения
├── config.ts                  # Все игровые константы
├── types.ts                   # Общие типы (const + as const, без enum)
├── boot/                      # Инициализация и DI-контекст
│   ├── dependencies.ts        # GameContext (config + data), синглтон
│   └── createGame.ts          # Фабрика начального GameState
├── core/                      # Чистая логика (не зависит от React/DOM)
│   ├── interfaces.ts          # GameContext, GameData, GameConfig — DI-контракты
│   ├── GameEngine.ts          # Главный игровой цикл + публичные API (build, claim, attack)
│   ├── hex/
│   │   ├── HexGrid.ts         # Axial-координаты, соседи, расстояние, BFS
│   │   ├── HexGridAdapter.ts  # Адаптер Map<string, HexTile> ↔ HexGrid
│   │   └── Tile.ts            # Тип HexTile (данные гекса)
│   ├── systems/               # Системы — по одному файлу на шаг игрового тика
│   │   ├── ResourceSystem.ts  # Добыча ресурсов с построек
│   │   ├── BuildingSystem.ts  # Прогресс строительства
│   │   ├── ResearchSystem.ts  # Прогресс исследований
│   │   ├── WaveSystem.ts      # Таймер волн, спавн врагов
│   │   ├── MovementSystem.ts  # Движение врагов к цели (BFS pathfinding)
│   │   ├── CombatSystem.ts    # Бой: защитные здания + рукопашная
│   │   ├── CleanupSystem.ts   # Очистка мёртвых врагов + награда
│   │   └── GoalSystem.ts      # Проверка условий победы/поражения
│   └── world/
│       └── WorldQuery.ts      # Запросы к миру (playerHexes, владение, инвалидация)
├── store/
│   ├── gameStore.ts           # MobX store: состояние игры + все actions
│   ├── progressStore.ts       # Прогресс кампании (localStorage)
│   └── adminStore.ts          # Админ-режим (только для разработки)
├── renderer/
│   ├── HexRenderer.ts         # Оркестратор Canvas-рендеринга (камера, слои)
│   ├── TerrainLayer.ts        # Отрисовка террейна (рельеф + возвышенности)
│   ├── BuildingLayer.ts       # Отрисовка зданий (прогресс строительства)
│   ├── OverlayLayer.ts        # Отрисовка UI-оверлеев (выделение)
│   ├── FogLayer.ts            # Туман войны
│   └── BorderLayer.ts         # Границы гексов и подсветка
├── data/                      # Статические данные
│   ├── stages.ts              # 6 этапов кампании
│   ├── buildings.ts           # Типы зданий (характеристики, стоимость)
│   ├── enemies.ts             # Типы врагов (драугры, бандиты, изгои, фалмеры, дракон)
│   └── techs.ts               # Дерево технологий (7 исследований)
└── ui/                        # React-компоненты
    ├── MainMenu.tsx
    ├── StageSelect.tsx
    ├── GameCanvas.tsx          # Canvas + game loop + управление камерой
    ├── HUD.tsx
    ├── HexPanel.tsx
    ├── TechPanel.tsx
    ├── GameOver.tsx
    └── AdminPanel.tsx
```

## Архитектура

### Core/ не зависит от React
Вся игровая логика в `src/core/` — тики, ресурсы, строительство, враги, бой. Не использует React, DOM, или Zustand напрямую. Функция `gameTick(state)` мутирует `GameState`. Store вызывает `gameTick` в фиксированном шаге (100ms) через `requestAnimationFrame`.

### Dependency Injection (GameContext)
Чистые функции core/ не импортируют config/data напрямую. Вместо этого они принимают `GameContext` (из `src/core/interfaces.ts`), который содержит `data: GameData` и `config: GameConfig`. Контекст создаётся в `src/boot/dependencies.ts` как синглтон `gameContext`. Это позволяет тестировать логику с подменёнными данными.

### Systems-декомпозиция
Игровой цикл разбит на независимые системы в `src/core/systems/`. Каждая система — чистые функции `tick*()`, вызываемые в `GameEngine.gameTick()`. Системы не общаются друг с другом напрямую — только через мутации `GameState`.

### Изометрический рендеринг
Гексы с pointy-top ориентацией, axial-координаты (q, r). Рендерятся как призмы: верхняя грань — шестиугольник, боковые грани — для возвышенностей (горы). Камера: drag для панорамирования, scroll для зума.

### Renderer-слои
Рендеринг разбит на независимые слои в `src/renderer/`: TerrainLayer (рельеф), BuildingLayer (здания), OverlayLayer (выделение), FogLayer (туман войны), BorderLayer (границы). `HexRenderer.ts` — оркестратор, вызывает слои в правильном порядке.

### Игровой цикл (один тик = 100ms)
1. Добыча ресурсов с построек — `ResourceSystem`
2. Прогресс строительства/исследований — `BuildingSystem` / `ResearchSystem`
3. Таймер волны → спавн врагов — `WaveSystem`
4. Движение врагов к цели (BFS pathfinding) — `MovementSystem`
5. Бой: защитные здания + рукопашная — `CombatSystem`
6. Очистка мёртвых врагов + награда — `CleanupSystem`
7. Проверка условий победы/поражения — `GoalSystem`

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
- **GitHub Pages**:
  - Prod: `https://Smynay.github.io/ai-gen-hexage/`
  - Dev: `https://Smynay.github.io/ai-gen-hexage/dev/`
  - Деплой через GitHub Actions (`.github/workflows/deploy.yml`)

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
Вся игровая логика в `src/core/` — GameEngine, системы в `systems/`, геометрия в `hex/`. **НИКОГДА** не импортирует React, MobX, или DOM. Только чистый TypeScript.

### Dependency Injection (GameContext)
Чистые функции core/ не импортируют config/data напрямую. Вместо этого принимают `GameContext` (из `src/core/interfaces.ts`), который содержит `data: GameData` и `config: GameConfig`. Контекст создаётся в `src/boot/dependencies.ts` как синглтон `gameContext`.

### Systems-декомпозиция
Игровой цикл разбит на независимые системы в `src/core/systems/`. Каждая система — чистые функции `tick*()`. При добавлении новой механики — **новый файл системы**, не расширение существующих.

### Renderer-слои
Рендеринг разбит на независимые слои в `src/renderer/`. Новые визуальные элементы — **новый слой**, не расширение существующих.

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

### Boot-прослойка
`src/boot/` — инициализация: `dependencies.ts` создаёт синглтон `gameContext` (GameData + GameConfig), `createGame.ts` фабрикует начальный `GameState`.
