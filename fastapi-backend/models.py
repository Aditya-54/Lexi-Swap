from pydantic import BaseModel

class SimplificationRequest(BaseModel):
    text: str
    context: str
    simplicity_level: str = "intermediate"
    mode: str = "simplify" # 'simplify' or 'define'

class SimplificationResponse(BaseModel):
    original: str
    simplified: str
    confidence: float
