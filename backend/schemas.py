from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- Auth ---
class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Flashcard ---
class FlashcardCreate(BaseModel):
    front: str
    back: str

class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None

class FlashcardScore(BaseModel):
    # SM-2 response quality: 0 (again) to 5 (easy)
    score: int = Field(..., ge=0, le=5)

class FlashcardResponse(BaseModel):
    id: int
    deck_id: int
    front: str
    back: str
    interval: int
    ease_factor: float
    repetitions: int
    next_review: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# --- Deck ---
class DeckCreate(BaseModel):
    name: str
    folder_id: Optional[int] = None
    source_type: Optional[str] = "manual"
    source_name: Optional[str] = None

class DeckUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None

class DeckResponse(BaseModel):
    id: int
    name: str
    folder_id: Optional[int]
    owner_id: int
    source_type: str
    source_name: Optional[str]
    created_at: datetime
    card_count: int = 0

    class Config:
        from_attributes = True

# --- Folder ---
class FolderCreate(BaseModel):
    name: str

class FolderResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Study Session ---
class StudySessionCreate(BaseModel):
    deck_id: int
    cards_studied: int
    accuracy: float

class StudySessionResponse(BaseModel):
    id: int
    deck_id: int
    user_id: int
    date: datetime
    cards_studied: int
    accuracy: float

    class Config:
        from_attributes = True

# --- AI ---
class AIGenerateRequest(BaseModel):
    text_content: Optional[str] = None
    url: Optional[str] = None
    num_cards: Optional[int] = 10

class AIChatMessage(BaseModel):
    role: str # user or assistant
    content: str

class AIChatRequest(BaseModel):
    deck_id: int
    messages: List[AIChatMessage]
