from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import SimplificationRequest, SimplificationResponse
from services import get_simplification

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="LexiSwap AI API")

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Allow extension to access API
origins = [
    "http://localhost",
    "http://localhost:8000",
    "*" # Relaxed for development, tighten for production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "LexiSwap AI API is running"}

@app.post("/simplify", response_model=SimplificationResponse)
@limiter.limit("10/minute")
async def simplify_text(request: Request, body: SimplificationRequest):
    try:
        simplified_word = get_simplification(body.text, body.context, body.simplicity_level, body.mode)
        return SimplificationResponse(
            original=body.text,
            simplified=simplified_word,
            confidence=0.9 # placeholder, real confidence score would require logprobs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
