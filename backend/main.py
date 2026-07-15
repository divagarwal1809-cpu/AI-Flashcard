from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import json
import os

from .database import engine, get_db
from .import models
import schemas
import auth
import ai_service

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FlashMind AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads dir if it doesn't exist
os.makedirs("./uploads", exist_ok=True)

# --- Auth Endpoints ---

@app.post("/auth/signup", response_model=schemas.UserResponse)
def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(username=user_data.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
def login(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or not auth.verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- Folder Endpoints ---

@app.post("/folders", response_model=schemas.FolderResponse)
def create_folder(folder: schemas.FolderCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_folder = models.Folder(name=folder.name, owner_id=current_user.id)
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    return new_folder

@app.get("/folders", response_model=List[schemas.FolderResponse])
def get_folders(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Folder).filter(models.Folder.owner_id == current_user.id).all()

@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id, models.Folder.owner_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db.delete(folder)
    db.commit()
    return {"detail": "Folder deleted"}

# --- Deck Endpoints ---

@app.post("/decks", response_model=schemas.DeckResponse)
def create_deck(deck: schemas.DeckCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Validate folder belongs to user
    if deck.folder_id:
        folder = db.query(models.Folder).filter(models.Folder.id == deck.folder_id, models.Folder.owner_id == current_user.id).first()
        if not folder:
            raise HTTPException(status_code=400, detail="Invalid folder ID")
            
    new_deck = models.Deck(
        name=deck.name,
        folder_id=deck.folder_id,
        owner_id=current_user.id,
        source_type=deck.source_type or "manual",
        source_name=deck.source_name
    )
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    return schemas.DeckResponse(
        id=new_deck.id,
        name=new_deck.name,
        folder_id=new_deck.folder_id,
        owner_id=new_deck.owner_id,
        source_type=new_deck.source_type,
        source_name=new_deck.source_name,
        created_at=new_deck.created_at,
        card_count=0
    )

@app.get("/decks", response_model=List[schemas.DeckResponse])
def get_decks(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    decks = db.query(models.Deck).filter(models.Deck.owner_id == current_user.id).all()
    response = []
    for deck in decks:
        card_count = db.query(models.Flashcard).filter(models.Flashcard.deck_id == deck.id).count()
        response.append(schemas.DeckResponse(
            id=deck.id,
            name=deck.name,
            folder_id=deck.folder_id,
            owner_id=deck.owner_id,
            source_type=deck.source_type,
            source_name=deck.source_name,
            created_at=deck.created_at,
            card_count=card_count
        ))
    return response

@app.get("/decks/{deck_id}", response_model=schemas.DeckResponse)
def get_deck(deck_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    card_count = db.query(models.Flashcard).filter(models.Flashcard.deck_id == deck.id).count()
    return schemas.DeckResponse(
        id=deck.id,
        name=deck.name,
        folder_id=deck.folder_id,
        owner_id=deck.owner_id,
        source_type=deck.source_type,
        source_name=deck.source_name,
        created_at=deck.created_at,
        card_count=card_count
    )

@app.put("/decks/{deck_id}", response_model=schemas.DeckResponse)
def update_deck(deck_id: int, deck_update: schemas.DeckUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    if deck_update.folder_id:
        folder = db.query(models.Folder).filter(models.Folder.id == deck_update.folder_id, models.Folder.owner_id == current_user.id).first()
        if not folder:
            raise HTTPException(status_code=400, detail="Invalid folder ID")
        deck.folder_id = deck_update.folder_id
    elif deck_update.folder_id == 0: # 0 represents unassign folder
        deck.folder_id = None
        
    if deck_update.name:
        deck.name = deck_update.name
        
    db.commit()
    db.refresh(deck)
    card_count = db.query(models.Flashcard).filter(models.Flashcard.deck_id == deck.id).count()
    return schemas.DeckResponse(
        id=deck.id,
        name=deck.name,
        folder_id=deck.folder_id,
        owner_id=deck.owner_id,
        source_type=deck.source_type,
        source_name=deck.source_name,
        created_at=deck.created_at,
        card_count=card_count
    )

@app.delete("/decks/{deck_id}")
def delete_deck(deck_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    db.delete(deck)
    db.commit()
    return {"detail": "Deck deleted"}

# --- Card Endpoints ---

@app.post("/decks/{deck_id}/cards", response_model=schemas.FlashcardResponse)
def create_card(deck_id: int, card: schemas.FlashcardCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    new_card = models.Flashcard(
        deck_id=deck_id,
        front=card.front,
        back=card.back
    )
    db.add(new_card)
    db.commit()
    db.refresh(new_card)
    return new_card

@app.get("/decks/{deck_id}/cards", response_model=List[schemas.FlashcardResponse])
def get_cards(deck_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return db.query(models.Flashcard).filter(models.Flashcard.deck_id == deck_id).all()

@app.put("/flashcards/{card_id}", response_model=schemas.FlashcardResponse)
def update_card(card_id: int, card_update: schemas.FlashcardUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    card = db.query(models.Flashcard).join(models.Deck).filter(
        models.Flashcard.id == card_id,
        models.Deck.owner_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
        
    if card_update.front:
        card.front = card_update.front
    if card_update.back:
        card.back = card_update.back
        
    db.commit()
    db.refresh(card)
    return card

@app.delete("/flashcards/{card_id}")
def delete_card(card_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    card = db.query(models.Flashcard).join(models.Deck).filter(
        models.Flashcard.id == card_id,
        models.Deck.owner_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    db.delete(card)
    db.commit()
    return {"detail": "Flashcard deleted"}

# --- Spaced Repetition (SM-2) ---

@app.post("/flashcards/{card_id}/score", response_model=schemas.FlashcardResponse)
def score_card(card_id: int, score_data: schemas.FlashcardScore, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    card = db.query(models.Flashcard).join(models.Deck).filter(
        models.Flashcard.id == card_id,
        models.Deck.owner_id == current_user.id
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
        
    q = score_data.score
    
    # SM-2 logic
    if q >= 3:
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = max(1, round(card.interval * card.ease_factor))
        card.repetitions += 1
    else:
        card.repetitions = 0
        card.interval = 1
        
    # Calculate Ease Factor adjustment
    card.ease_factor = card.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if card.ease_factor < 1.3:
        card.ease_factor = 1.3
        
    # Set next review time
    card.next_review = datetime.datetime.utcnow() + datetime.timedelta(days=card.interval)
    db.commit()
    db.refresh(card)
    return card

# --- AI Endpoints ---

@app.post("/ai/generate")
async def generate_cards(
    deck_name: str = Form(...),
    folder_id: Optional[int] = Form(None),
    source_type: str = Form(...), # text, url, file
    text_content: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    num_cards: int = Form(10),
    file: Optional[UploadFile] = File(None),
    x_gemini_key: Optional[str] = Header(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Validate folder
    if folder_id:
        folder = db.query(models.Folder).filter(models.Folder.id == folder_id, models.Folder.owner_id == current_user.id).first()
        if not folder:
            raise HTTPException(status_code=400, detail="Invalid folder ID")
            
    extracted_text = ""
    source_name = None
    image_bytes = None
    
    if source_type == "text":
        extracted_text = text_content or ""
        source_name = "Notes"
    elif source_type == "url":
        if not url:
            raise HTTPException(status_code=400, detail="URL must be provided")
        extracted_text = ai_service.extract_text_from_url(url)
        source_name = url
    elif source_type == "file":
        if not file:
            raise HTTPException(status_code=400, detail="File must be uploaded")
        
        file_bytes = await file.read()
        source_name = file.filename
        
        ext = os.path.splitext(file.filename)[1].lower()
        if ext == ".pdf":
            extracted_text = ai_service.extract_text_from_pdf(file_bytes)
        elif ext in [".jpg", ".jpeg", ".png", ".webp"]:
            image_bytes = file_bytes
            extracted_text = "Multimodal OCR / Vision Generation"
        elif ext in [".txt"]:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
    else:
        raise HTTPException(status_code=400, detail="Unsupported source type")

    # Generate flashcards
    generated = ai_service.generate_flashcards_ai(extracted_text, num_cards, image_bytes, api_key=x_gemini_key)
    
    # Save deck
    new_deck = models.Deck(
        name=deck_name,
        folder_id=folder_id,
        owner_id=current_user.id,
        source_type=source_type,
        source_name=source_name
    )
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    
    # Save cards
    cards_objects = []
    for card in generated:
        c = models.Flashcard(
            deck_id=new_deck.id,
            front=card.get("front", "Question"),
            back=card.get("back", "Answer")
        )
        db.add(c)
        cards_objects.append(c)
        
    db.commit()
    
    return {
        "deck_id": new_deck.id,
        "name": new_deck.name,
        "cards_generated": len(cards_objects)
    }

@app.post("/ai/chat")
def deck_chat(chat_req: schemas.AIChatRequest, x_gemini_key: Optional[str] = Header(None), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == chat_req.deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    cards = db.query(models.Flashcard).filter(models.Flashcard.deck_id == chat_req.deck_id).all()
    card_list = [{"front": c.front, "back": c.back} for c in cards]
    
    history_list = [{"role": msg.role, "content": msg.content} for msg in chat_req.messages]
    
    response = ai_service.chat_with_deck(card_list, history_list, api_key=x_gemini_key)
    return {"reply": response}

# --- Statistics Endpoints ---

@app.get("/stats")
def get_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    total_folders = db.query(models.Folder).filter(models.Folder.owner_id == current_user.id).count()
    total_decks = db.query(models.Deck).filter(models.Deck.owner_id == current_user.id).count()
    
    # Get total cards in user's decks
    total_cards = db.query(models.Flashcard).join(models.Deck).filter(models.Deck.owner_id == current_user.id).count()
    
    # Count cards due for review (next_review <= current_time)
    now = datetime.datetime.utcnow()
    due_cards = db.query(models.Flashcard).join(models.Deck).filter(
        models.Deck.owner_id == current_user.id,
        models.Flashcard.next_review <= now
    ).count()
    
    # Sessions
    sessions = db.query(models.StudySession).filter(models.StudySession.user_id == current_user.id).all()
    total_sessions = len(sessions)
    total_studied = sum(s.cards_studied for s in sessions)
    avg_accuracy = sum(s.accuracy for s in sessions) / total_sessions if total_sessions > 0 else 0.0
    
    return {
        "total_folders": total_folders,
        "total_decks": total_decks,
        "total_cards": total_cards,
        "due_cards": due_cards,
        "total_sessions": total_sessions,
        "cards_studied": total_studied,
        "average_accuracy": avg_accuracy
    }

@app.post("/stats/session")
def record_session(session_data: schemas.StudySessionCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == session_data.deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    new_session = models.StudySession(
        deck_id=session_data.deck_id,
        user_id=current_user.id,
        cards_studied=session_data.cards_studied,
        accuracy=session_data.accuracy
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

# --- Import/Export ---

@app.get("/decks/{deck_id}/export")
def export_deck(deck_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    deck = db.query(models.Deck).filter(models.Deck.id == deck_id, models.Deck.owner_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
        
    cards = db.query(models.Flashcard).filter(models.Flashcard.deck_id == deck_id).all()
    cards_data = [{"front": c.front, "back": c.back} for c in cards]
    
    return {
        "deck_name": deck.name,
        "source_type": deck.source_type,
        "source_name": deck.source_name,
        "cards": cards_data
    }

@app.post("/decks/import")
def import_deck(
    import_data: dict, 
    folder_id: Optional[int] = None, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    deck_name = import_data.get("deck_name", "Imported Deck")
    source_type = import_data.get("source_type", "import")
    source_name = import_data.get("source_name", "JSON")
    cards = import_data.get("cards", [])
    
    if folder_id:
        folder = db.query(models.Folder).filter(models.Folder.id == folder_id, models.Folder.owner_id == current_user.id).first()
        if not folder:
            raise HTTPException(status_code=400, detail="Invalid folder ID")
            
    new_deck = models.Deck(
        name=deck_name,
        folder_id=folder_id,
        owner_id=current_user.id,
        source_type=source_type,
        source_name=source_name
    )
    db.add(new_deck)
    db.commit()
    db.refresh(new_deck)
    
    for card in cards:
        c = models.Flashcard(
            deck_id=new_deck.id,
            front=card.get("front", ""),
            back=card.get("back", "")
        )
        db.add(c)
    db.commit()
    
    return {"deck_id": new_deck.id, "name": new_deck.name, "cards_imported": len(cards)}
