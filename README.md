diploma-ml-analytics/
├── docker-compose.yml
│
├── python-api/                        # основний сервіс (FastAPI + scikit-learn)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ml_service.py
│   │   └── storage.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── datasets.py
│   │   ├── models.py
│   │   ├── predictions.py
│   │   └── analytics.py
│   └── storage/                       # файлова персистентність (gitignore)
│       ├── datasets/
│       ├── models/
│       └── predictions/
│
├── gateway/                           # NestJS API Gateway
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── proxy/
│       │   └── proxy.controller.ts
│       ├── guards/
│       │   └── api-key.guard.ts
│       └── interceptors/
│           ├── transform.interceptor.ts
│           └── exception.filter.ts
│
└── frontend/                          # React
    ├── components.json
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/
        │   └── api.ts
        ├── api/
        │   └── client.ts
        ├── lib/
        │   └── utils.ts
        ├── hooks/
        │   ├── useQuery.ts
        │   └── useDomain.ts
        ├── components/
        │   ├── ui/                    # shadcn/ui (npx shadcn add ...)
        │   ├── DatasetUploader/
        │   │   └── DatasetUploader.tsx
        │   ├── ModelTrainer/
        │   │   └── ModelTrainer.tsx
        │   ├── MetricsDashboard/
        │   │   └── MetricsDashboard.tsx
        │   ├── FeatureImportance/
        │   │   └── FeatureImportance.tsx
        │   └── PredictionChart/
        │       └── PredictionChart.tsx
        └── pages/
            ├── DashboardPage.tsx
            ├── DatasetPage.tsx
            └── ModelPage.tsx