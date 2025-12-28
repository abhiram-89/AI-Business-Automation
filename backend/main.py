# Load environment variables from .env file FIRST
from dotenv import load_dotenv
import os
load_dotenv()

# Verify API key is loaded
api_key_check = os.getenv("GEMINI_API_KEY")
if api_key_check:
    print(f"🔑 GEMINI_API_KEY loaded: {api_key_check[:20]}...")
else:
    print("⚠️  GEMINI_API_KEY not found in environment!")

# FastAPI and other imports
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import asyncio
from agents.agent_system import AIAgentSystem
from datetime import datetime
from bson import ObjectId
from contextlib import asynccontextmanager
import hashlib
import secrets
import traceback

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "ai_automation"

# Global database client and agent system
db_client: Optional[AsyncIOMotorClient] = None
database = None
agent_system: Optional[AIAgentSystem] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global db_client, database, agent_system
    try:
        # Initialize MongoDB
        db_client = AsyncIOMotorClient(MONGODB_URL)
        database = db_client[DATABASE_NAME]
        print(f"✓ Connected to MongoDB: {DATABASE_NAME}")
        
        # Create indexes
        try:
            await database.users.create_index("email", unique=True)
            await database.users.create_index("username", unique=True)
        except:
            pass
        await database.tasks.create_index([("user_id", 1), ("created_at", -1)])
        await database.workflows.create_index([("user_id", 1), ("created_at", -1)])
        await database.documents.create_index([("user_id", 1), ("uploaded_at", -1)])
        print("✓ Database indexes created")
        
        # Initialize AutoGen Agent System
        api_key =  os.getenv("GEMINI_API_KEY")
        agent_system = AIAgentSystem(api_key=api_key)
        print("✓ AutoGen agent system initialized")
        
    except Exception as e:
        print(f"✗ Startup error: {e}")
        traceback.print_exc()
    
    yield
    
    # Shutdown
    if db_client:
        db_client.close()
        print("✓ Closed MongoDB connection")

app = FastAPI(title="AI Business Automation API", lifespan=lifespan)

# Ensure upload dir exists
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.getcwd(), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static uploads
try:
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
except Exception as e:
    print(f"Warning: Could not mount uploads directory: {e}")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Pydantic Models ====================

class TaskInput(BaseModel):
    description: str
    files: List[str] = Field(default_factory=list)
    priority: str = "medium"

class WorkflowInput(BaseModel):
    name: str
    description: str
    trigger: str
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    is_active: bool = True

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateProfileRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None

class UpdatePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

class NotificationSettings(BaseModel):
    emailNotifications: bool
    taskCompletionAlerts: bool
    failureAlerts: bool
    weeklyReports: bool

# ==================== Authentication Helpers ====================

def hash_password(password: str) -> str:
    """Simple SHA-256 password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

def create_access_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current authenticated user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    token = authorization.replace("Bearer ", "").strip()
    
    # Find user by token
    user = await database.users.find_one({"access_token": token})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user["_id"] = str(user["_id"])
    return user

# ==================== WebSocket Connection Manager ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"✓ WebSocket connected for user {user_id}. Total: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"✓ WebSocket disconnected for user {user_id}. Remaining: {len(self.active_connections)}")

    async def send_to_user(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                print(f"✓ Sent {message.get('type')} to user {user_id}")
            except Exception as e:
                print(f"✗ Error sending to user {user_id}: {e}")
                self.disconnect(user_id)

manager = ConnectionManager()

# ==================== Task Processing Function ====================

async def process_task_background(task_id: str, user_id: str, description: str, files: List[str]):
    """
    Process task in background using AutoGen multi-agent system
    """
    try:
        print(f"🚀 Starting AutoGen task processing: {task_id}")
        
        # Update task status
        await database.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"status": "running", "updated_at": datetime.utcnow()}}
        )
        
        # Prepare file paths
        file_paths = []
        for filename in files:
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                file_paths.append(file_path)
                print(f"✓ Found file: {filename}")
            else:
                print(f"⚠️  File not found: {filename}")
        
        print(f"📝 Processing with AutoGen: {len(file_paths)} file(s)")
        
        # Process the task with AutoGen agent system
        agent_result = await agent_system.process_task(
            description=description,
            files=file_paths,
            user_id=user_id,
            task_id=task_id,
            ws_manager=manager
        )
        
        print(f"✓ AutoGen processing complete")
        print(f"   Mode: {agent_result.get('processing_mode', 'unknown')}")
        print(f"   Agents: {agent_result.get('agents_involved', 0)}")
        
        # Format the result for frontend
        formatted_result = {
            "summary": agent_result.get("summary", f"Successfully processed: {description}"),
            "insights": agent_result.get("insights", [
                "Task completed successfully",
                f"Processed {len(file_paths)} file(s)",
                "All requirements met"
            ]),
            "recommendations": agent_result.get("recommendations", [
                "Review the results carefully",
                "Consider follow-up actions if needed",
                "Save important findings for future reference"
            ]),
            "agents_involved": agent_result.get("agents_involved", len(file_paths) + 1),
            "files_processed": len(file_paths),
            "processing_mode": agent_result.get("processing_mode", "autogen"),
            "conversation_length": agent_result.get("conversation_length", 0),
            "timestamp": datetime.utcnow().isoformat(),
            "status": "success"
        }
        
        # Add any additional data from agent result
        if "data" in agent_result:
            formatted_result["data"] = agent_result["data"]
        if "output" in agent_result:
            formatted_result["output"] = agent_result["output"]
        if "task_type" in agent_result:
            formatted_result["task_type"] = agent_result["task_type"]
        
        print(f"✓ Formatted result created")
        
        # Update task in database
        await database.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "completed",
                    "result": formatted_result,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Send completion message via WebSocket
        await manager.send_to_user(user_id, {
            "type": "task_completed",
            "task_id": task_id,
            "result": formatted_result
        })
        
        print(f"✅ Task {task_id} completed successfully")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Task {task_id} failed: {error_msg}")
        traceback.print_exc()
        
        # Update task with error
        await database.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "error",
                    "result": {
                        "error": error_msg,
                        "status": "error",
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Send error via WebSocket
        await manager.send_to_user(user_id, {
            "type": "task_error",
            "task_id": task_id,
            "error": error_msg
        })

# ==================== API Routes ====================

@app.get("/")
async def root():
    return {
        "message": "AI Business Automation API with AutoGen",
        "status": "running",
        "version": "3.0",
        "agent_system": "AutoGen Multi-Agent"
    }

@app.get("/api/health")
async def health_check():
    db_status = "connected" if database else "disconnected"
    ws_count = len(manager.active_connections)
    agent_mode = agent_system.mode if agent_system else "not initialized"
    
    return {
        "status": "healthy",
        "database": db_status,
        "websocket_connections": ws_count,
        "agent_system": agent_mode,
        "timestamp": datetime.utcnow().isoformat()
    }

# ==================== Auth Endpoints ====================

@app.post("/api/auth/register")
async def register_user(request: RegisterRequest):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await database.users.find_one({
            "$or": [{"email": request.email}, {"username": request.username}]
        })
        
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email or username already exists")
        
        # Create new user
        access_token = create_access_token()
        user_data = {
            "username": request.username,
            "email": request.email,
            "password_hash": hash_password(request.password),
            "access_token": access_token,
            "firstName": "",
            "lastName": "",
            "company": "",
            "apiKey": secrets.token_urlsafe(32),
            "notifications": {
                "emailNotifications": True,
                "taskCompletionAlerts": True,
                "failureAlerts": True,
                "weeklyReports": False
            },
            "subscription": {
                "plan": "Free",
                "price": 0,
                "renewsOn": None
            },
            "paymentMethod": None,
            "created_at": datetime.utcnow()
        }
        
        result = await database.users.insert_one(user_data)
        user_id = str(result.inserted_id)
        
        return {
            "message": "User registered successfully",
            "access_token": access_token,
            "user": {
                "id": user_id,
                "username": request.username,
                "email": request.email
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
async def login_user(request: LoginRequest):
    """Login user"""
    user = await database.users.find_one({"email": request.email})
    
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate new access token
    access_token = create_access_token()
    await database.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"access_token": access_token}}
    )
    
    return {
        "access_token": access_token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"]
        }
    }

@app.post("/api/auth/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
    """Logout user"""
    await database.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"access_token": None}}
    )
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {"user": current_user}

@app.put("/api/auth/profile")
async def update_profile(request: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    update_data = {}
    if request.firstName is not None:
        update_data["firstName"] = request.firstName
    if request.lastName is not None:
        update_data["lastName"] = request.lastName
    if request.email is not None:
        update_data["email"] = request.email
    if request.company is not None:
        update_data["company"] = request.company
    
    if update_data:
        await database.users.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}

@app.put("/api/auth/password")
async def update_password(request: UpdatePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Update user password"""
    user = await database.users.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not verify_password(request.currentPassword, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = hash_password(request.newPassword)
    await database.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password updated successfully"}

@app.put("/api/auth/notifications")
async def update_notifications(settings: NotificationSettings, current_user: dict = Depends(get_current_user)):
    """Update notification settings"""
    await database.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"notifications": settings.dict()}}
    )
    return {"message": "Notification settings updated"}

# ==================== Task Endpoints ====================

@app.post("/api/tasks")
async def create_task(task_input: TaskInput, current_user: dict = Depends(get_current_user)):
    """Create and start processing a new task with AutoGen"""
    try:
        print(f"📝 Creating AutoGen task: {task_input.description[:100]}...")
        print(f"   Files: {task_input.files}")
        print(f"   Priority: {task_input.priority}")
        
        # Create task document
        task_data = {
            "user_id": current_user["_id"],
            "description": task_input.description,
            "files": task_input.files,
            "priority": task_input.priority,
            "status": "pending",
            "result": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.tasks.insert_one(task_data)
        task_id = str(result.inserted_id)
        task_data["_id"] = task_id
        
        print(f"✓ Task created with ID: {task_id}")
        
        # Start AutoGen processing in background
        asyncio.create_task(
            process_task_background(
                task_id=task_id,
                user_id=current_user["_id"],
                description=task_input.description,
                files=task_input.files
            )
        )
        
        return {
            "task": task_data,
            "message": "Task created and AutoGen processing started"
        }
        
    except Exception as e:
        print(f"✗ Failed to create task: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tasks")
async def get_tasks(current_user: dict = Depends(get_current_user)):
    """Get all tasks for current user"""
    cursor = database.tasks.find({"user_id": current_user["_id"]}).sort("created_at", -1)
    tasks = []
    async for task in cursor:
        task["_id"] = str(task["_id"])
        tasks.append(task)
    
    return {"tasks": tasks, "count": len(tasks)}

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific task"""
    try:
        task = await database.tasks.find_one({
            "_id": ObjectId(task_id),
            "user_id": current_user["_id"]
        })
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task["_id"] = str(task["_id"])
        return {"task": task}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a task"""
    try:
        result = await database.tasks.delete_one({
            "_id": ObjectId(task_id),
            "user_id": current_user["_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== Workflow Endpoints ====================

@app.post("/api/workflows")
async def create_workflow(workflow_input: WorkflowInput, current_user: dict = Depends(get_current_user)):
    """Create a new workflow"""
    workflow_data = {
        "user_id": current_user["_id"],
        "name": workflow_input.name,
        "description": workflow_input.description,
        "trigger": workflow_input.trigger,
        "actions": workflow_input.actions,
        "is_active": workflow_input.is_active,
        "runs": 0,
        "successful_runs": 0,
        "last_run": None,
        "created_at": datetime.utcnow()
    }
    
    result = await database.workflows.insert_one(workflow_data)
    workflow_data["_id"] = str(result.inserted_id)
    
    return {"workflow": workflow_data, "message": "Workflow created successfully"}

@app.get("/api/workflows")
async def get_workflows(current_user: dict = Depends(get_current_user)):
    """Get all workflows for current user"""
    cursor = database.workflows.find({"user_id": current_user["_id"]}).sort("created_at", -1)
    workflows = []
    async for workflow in cursor:
        workflow["_id"] = str(workflow["_id"])
        workflows.append(workflow)
    
    return {"workflows": workflows, "count": len(workflows)}

@app.patch("/api/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    """Update workflow (toggle active, etc)"""
    try:
        result = await database.workflows.update_one(
            {"_id": ObjectId(workflow_id), "user_id": current_user["_id"]},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        return {"message": "Workflow updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a workflow"""
    try:
        result = await database.workflows.delete_one({
            "_id": ObjectId(workflow_id),
            "user_id": current_user["_id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        return {"message": "Workflow deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== Document Endpoints ====================

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload a document"""
    try:
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        print(f"✓ File uploaded: {filename} ({len(content)} bytes)")
        
        # Create document record
        document_data = {
            "user_id": current_user["_id"],
            "name": filename,
            "original_name": file.filename,
            "size": len(content),
            "type": file.content_type,
            "url": f"/uploads/{filename}",
            "status": "uploaded",
            "uploaded_at": datetime.utcnow()
        }
        
        result = await database.documents.insert_one(document_data)
        document_data["_id"] = str(result.inserted_id)
        
        return {"document": document_data, "message": "File uploaded successfully"}
    except Exception as e:
        print(f"✗ Upload error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def get_documents(current_user: dict = Depends(get_current_user)):
    """Get all documents for current user"""
    cursor = database.documents.find({"user_id": current_user["_id"]}).sort("uploaded_at", -1)
    documents = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        documents.append(doc)
    
    return {"documents": documents, "count": len(documents)}

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a document"""
    try:
        doc = await database.documents.find_one({
            "_id": ObjectId(document_id),
            "user_id": current_user["_id"]
        })
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = os.path.join(UPLOAD_DIR, doc["name"])
        if os.path.exists(file_path):
            os.remove(file_path)
        
        await database.documents.delete_one({"_id": ObjectId(document_id)})
        
        return {"message": "Document deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== Statistics Endpoint ====================

@app.get("/api/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    """Get statistics for current user"""
    total_tasks = await database.tasks.count_documents({"user_id": current_user["_id"]})
    completed_tasks = await database.tasks.count_documents({
        "user_id": current_user["_id"],
        "status": "completed"
    })
    active_workflows = await database.workflows.count_documents({
        "user_id": current_user["_id"],
        "is_active": True
    })
    total_documents = await database.documents.count_documents({"user_id": current_user["_id"]})
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "active_workflows": active_workflows,
        "total_documents": total_documents,
        "success_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    }

# ==================== WebSocket Endpoint ====================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive and receive any messages
            data = await websocket.receive_text()
            print(f"✓ Received from {user_id}: {data}")
            
            # Optional: Echo back or handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"✗ WebSocket error for {user_id}: {e}")
        manager.disconnect(user_id)

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚀 Starting AI Business Automation API")
    print("   Agent System: AutoGen Multi-Agent")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")