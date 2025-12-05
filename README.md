# KNN (K-Nearest Neighbors)

В данном приложении алгоритм реализован без использования сторонних библиотек в файле `services/knnLogic.ts`.

Цикл работы выглядит так:

- **State Update:** `Sidebar.tsx` обновляет состояние конфигурации (`config`) в `App.tsx` или любое другое изменение данных(например мышкой в канвасе)
- 2. **Re-calculation:** В `App.tsx` срабатывает хук `useMemo` для переменной `classifiedPoints`.
- 3. **Iteration:** Для каждой точки типа **Test** (тестовая выборка) запускается функция `classifyPoint`.
- 4. **Render:** Результат (предсказанный класс и список соседей) передается в `KNNCanvas` там мы используем библиотеку D3.js для отрисовки линий и цвета точки.

Разберем каждый блок настроек и соответствующий код в `knnLogic.ts`.

- Число соседей (K)
  - `classifyPoint` -> аргумент `k`.
- Метрика расстояния (Distance Metric)
  - Выпадающий список "Euclidean", "Manhattan", "Minkowski", "Cosine".
  - `calculateDistance` в `services/knnLogic.ts
- Веса признаков (Feature Weights)
  - Если, например, $X$ важнее $Y$, мы увеличиваем вес $X$ или можем таким образом скомпенсировать расстояния для того чтобы признаки стали равнозначными, так как для knn это важно.
  ````typescript
  	const dx = Math.abs(p1.x - p2.x) * weights.x;
  	const dy = Math.abs(p1.y - p2.y) * weights.y;
  		```
  > **Важно:** Галочка `visualizeWeights` в `Sidebar` не меняет логику классификации, она просто визуально растягивает график на канвасе (`KNNCanvas`), чтобы вы видели пространство так же, как его видит алгоритм.
  ````
- Функция взвешивания (Weighting Function)

  - Внутри цикла голосования в `classifyPoint`. Как соседи голосуют за класс: **Uniform (Равномерное)** Каждый из $K$ соседей имеет голос = 1. _Код:_ `votes[label] += 1;
  - **Inverse Distance (Обратное расстояние)** Ближайшие соседи имеют больший "вес" голоса. Один очень близкий сосед может перевесить 4-х далеких соседей другого класса.`

    ```typescript
    const weight = n.dist === 0 ? 10000 : 1 / (n.dist * n.dist);
    votes[label] += weight;
    ```

Вот так по итогу выглядит конфиг

```typescript
// File: App.tsx
const [config, setConfig] = useState<KNNConfig>({
  k: 5, // Количество соседей
  metric: "euclidean", // Метрика (евклидова, манхэттен и т.д.)
  minkowskiP: 3, // P для Минковского
  weighting: "uniform", // Голосование (Uniform или Distance)
  weights: { x: 1, y: 1 }, // Веса осей (Feature Weights)
  visualizeWeights: false,
});
```

А так вызов обновления

```typescript
// File: App.tsx
const classifiedPoints = useMemo(() => {
  // ... фильтрация данных ...
  // Проходимся по всем тестовым точкам (newTest)
  const newTest = test.map((tp) => {
    const result = classifyPoint(
      tp,
      train,
      config.k,
      config.metric,
      config.minkowskiP,
      config.weighting,
      weightsForLogic
    );

    return { ...tp, ...result };
  });

  return [...train, ...newTest];
}, [logicPoints, config]);
```

Формулы метрик

1. **Euclidean (Евклидова, L2):**
   Кратчайшее расстояние по прямой (гипотенуза).

$$ \sqrt{dx^2 + dy^2} $$
2. **Manhattan (Манхэттенская, L1):**
Сумма модулей разностей (движение по сетке улиц).
$$ |dx| + |dy| $$
3. **Minkowski (Минковского, Lp):**
Обобщение первых двух. Зависит от параметра $P$ (см. ниже).
$$ (|dx|^p + |dy|^p)^{1/p} $$

4. **Cosine (Косинусная близость):**
   Измеряет угол между векторами, а не длину. Игнорирует масштаб, важна только ориентация.
   $$ 1 - \cos(\theta) $$

## Логика разрешения спорных ситуаций:

Алгоритм работает батчами (порциями):

1. Берет первые $K$ соседей.
2. Считает голоса.
3. Если есть **чистый победитель** -> возвращает результат.

4. **Если ничья (Tie):**

- Алгоритм **не останавливается**. Он берет следующую партию из $K$ соседей (расширяет круг поиска). Смотрит, есть ли победитель теперь. Визуально на канвасе это отображается пунктирными линиями (дальние соседи, привлеченные для разрешения спора).

Цикл с учетом "Ничьей":

```typescript
// Cursor указывает, откуда начинать брать соседей (сначала 0)
let cursor = 0;
while (cursor < allNeighbors.length) {
  // Берем пачку из K соседей
  // Если K=5, берем [0..5], если была ничья, в след. круге возьмем [5..10]
  const batch = allNeighbors.slice(cursor, cursor + k);
  // --- ГОЛОСОВАНИЕ (Weighting Logic) ---
  const votes: Record<string, number> = {};

  batch.forEach((n) => {
    let weight = 1;

    // Если в сайдбаре выбрано 'Inverse Distance'
    if (weighting === "distance") {
      // Чем меньше дистанция, тем больше вес голоса (1 / dist^2)
      weight = n.dist === 0 ? 10000 : 1 / (n.dist * n.dist);
    }
    // Добавляем вес в копилку класса (например, "Class A" += 1.5)
    votes[n.point.label] = (votes[n.point.label] || 0) + weight;
  });

  // --- ОПРЕДЕЛЕНИЕ ПОБЕДИТЕЛЯ ---
  let winners: ClassLabel[] = [];
  // ... логика поиска максимума в объекте votes ...
  // Если победитель ровно один — мы закончили!
  if (winners.length === 1) {
    finalLabel = winners[0];
    break;
  }
  // Если победителей > 1 (НИЧЬЯ), цикл продолжается.
  // Мы увеличиваем курсор и на следующем витке возьмем следующих K соседей.
  cursor += k;
  hasTie = true; // Запоминаем, что была ничья (для отрисовки пунктира)
}
```
