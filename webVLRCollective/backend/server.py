import subprocess
import sys
import json
import uuid
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()

BASE = Path(__file__).parent.parent
COLLECTIVE = BASE / "collective"

app.mount("/css", StaticFiles(directory=BASE / "css"), name="css")
app.mount("/js", StaticFiles(directory=BASE / "js"), name="js")

@app.get("/")
async def index():
    return FileResponse(BASE / "index.html")

@app.get("/collective/{session}/{file}")
async def get_file(session: str, file: str):
    path = COLLECTIVE / session / file
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)

@app.get("/api/status/{session}")
async def status(session: str):
    session_dir = COLLECTIVE / session
    return {
        "has_logs": (session_dir / "full_log.txt").exists(),
        "has_synthesis": (session_dir / "collaborator.txt").exists()
    }

class RunRequest(BaseModel):
    question: str
    session_id: str
    agents: list = []          
    meta_iterations: int = 4 

@app.post("/api/run")
async def run(req: RunRequest):
    subprocess.Popen(
        [sys.executable, str(BASE / "backend" / "VLRCollective.py"), 
         req.question, 
         req.session_id, 
         json.dumps(req.agents), 
         str(req.meta_iterations)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        cwd=str(BASE)
    )
    
    return {"status": "started", "session_id": req.session_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)