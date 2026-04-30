from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import datasets, models, predictions, analytics

app = FastAPI(
    title='ML Analytics — Python API',
    version='1.0.0',
    description='Full ML business logic: datasets, training, prediction, analytics.',
    docs_url='/docs',
    redoc_url='/redoc',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://gateway:3000'],
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(datasets.router)
app.include_router(models.router)
app.include_router(predictions.router)
app.include_router(analytics.router)


@app.get('/health')
async def health() -> dict:
    return {'status': 'ok', 'service': 'python-api'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)