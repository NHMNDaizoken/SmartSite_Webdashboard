from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.analysis import router as analysis_router
from backend.routers.population import router as population_router
from backend.services.DataLoaderService import load_cafe_data, load_poi_data

app = FastAPI(
    title='SmartSite Location Intelligence API',
    description='Spatial zone analysis: cafe competition, POI breakdown, market signals',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000'],
    allow_methods=['POST', 'GET'],
    allow_headers=['*'],
)


@app.on_event('startup')
def preload_data():
    load_cafe_data()
    load_poi_data()


app.include_router(analysis_router)
app.include_router(population_router)


@app.get('/health')
def health_check():
    return {'status': 'ok', 'service': 'SmartSite Location Intelligence API'}
