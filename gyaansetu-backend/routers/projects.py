"""
GyaanSetu AI — Project Helper Router
Generates project plans, documentation, scripts, and architecture diagrams using DeepSeek-R1.
"""

import json, uuid, logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services import ollama_service
from db.database import get_connection

router = APIRouter()
logger = logging.getLogger("gyaansetu.projects")


class ProjectGenerateRequest(BaseModel):
    title: str
    category: str
    user_id: str
    tag: str = ""
    description: str = ""
    team_size: int = 1
    tech_stack: str = ""
    target_audience: str = ""


class ProjectResponse(BaseModel):
    id: str
    title: str
    category: str
    tag: str = ""
    output_markdown: str
    created_at: str


PROJECT_PROMPTS = {
    "Hackathon Projects": (
        "You are an expert Hackathon mentor. Formulate a winning MVP project plan.\n"
        "Provide:\n"
        "1. **MVP Architecture & Flow**: Detailed user flow and block diagram description.\n"
        "2. **Tech Stack**: Specific databases, frontend/backend libraries, APIs, and hosting providers.\n"
        "3. **24-Hour Timeline**: Hour-by-hour breakdown of tasks for {team_size} developer(s).\n"
        "4. **Pitch Strategy**: 3 key value propositions to impress the judges.\n"
        "Keep it actionable, technical, and concrete."
    ),
    "Research Projects": (
        "You are an academic research supervisor. Generate a structured research framework.\n"
        "Provide:\n"
        "1. **Abstract Outline**: Overview of the research statement and objectives.\n"
        "2. **Literature Review Mapping**: 4 key academic domains/areas to reference.\n"
        "3. **Methodology**: Experimental setup, data collection method, and analysis flow.\n"
        "4. **Result Framework**: Expected outcomes, hypothetical data tables, and verification methods."
    ),
    "Final-Year Projects": (
        "You are a college project mentor. Formulate an end-to-end Capstone project blueprint.\n"
        "Provide:\n"
        "1. **System Design & DB Schema**: Table definitions, relations, and REST API routes.\n"
        "2. **Milestones**: 4 major sprints with verification goals.\n"
        "3. **Viva / Review Prep**: 5 difficult questions mentors/examiners will ask about this implementation and how to answer them.\n"
        "4. **Report Structure**: Outline of the final thesis document."
    ),
    "PPT Presentations": (
        "You are a presentation designer. Generate a slide-by-slide text blueprint for a pitch deck.\n"
        "Provide:\n"
        "- Slide 1: Title & Hook\n"
        "- Slide 2: Problem Statement (with hypothetical statistics)\n"
        "- Slide 3: Solution & Demo Overview\n"
        "- Slide 4: Underlying Technology Architecture\n"
        "- Slide 5: Market Fit / Relevance\n"
        "- Slide 6: Team & Next Steps\n"
        "For each slide, supply: Title, Visual description, slide bullets, and Speaker Notes."
    ),
    "Documentation": (
        "You are a technical writer. Write a comprehensive, industry-grade README.md file.\n"
        "Include:\n"
        "1. Project description & badges\n"
        "2. Detailed installation steps (virtualenvs, npm install, config/dotenv)\n"
        "3. Code usage examples & API endpoint documentation\n"
        "4. Contribution guide & license."
    ),
    "Architecture Diagrams": (
        "You are a system architect. Generate a system architecture outline and raw Mermaid.js graph code.\n"
        "Include:\n"
        "1. **Architecture Style**: Microservices, Monolith, Serverless, or Event-driven explanation.\n"
        "2. **Data Flow**: Step-by-step description of data movement.\n"
        "3. **Mermaid Diagram**: Return a complete, valid ```mermaid block defining nodes, edges, subgraphs, and styling classes. "
        "Keep the Mermaid syntax 100% correct, avoiding special characters in labels."
    ),
    "GitHub Templates": (
        "You are a DevOps engineer. Generate a setup blueprint for a GitHub template repository.\n"
        "Provide:\n"
        "1. **Folder Structure**: Tree layout showing where components reside.\n"
        "2. **Configuration Files**: Complete code/content for `.gitignore`, `Dockerfile`, and a GitHub Actions workflow `.github/workflows/ci.yml`.\n"
        "3. **Best Practices Checklist**: Linting, pre-commit hooks, and testing setup instructions."
    ),
    "Code Review": (
        "You are a principal engineer. Review the following code/proposal for performance, security, and styling.\n"
        "Provide:\n"
        "1. **Critical Vulnerabilities**: Security flaws, memory leaks, or race conditions.\n"
        "2. **Performance Optimizations**: Database queries, caching, loop efficiency.\n"
        "3. **Styling & Best Practices**: Naming conventions, refactoring recommendations, and dry compliance."
    ),
    "Demo Video Script": (
        "You are a product marketer. Write a compelling script and storyboard for a 2-minute product video.\n"
        "Provide:\n"
        "1. **Visual Scene-by-Scene Description**: What to show on screen.\n"
        "2. **Narration Script**: Word-for-word voiceover text.\n"
        "3. **Timing Guide**: Second-by-second timestamps.\n"
        "4. **Call to Action**: Dynamic closing message."
    ),
}


@router.post("/generate", response_model=ProjectResponse)
async def generate_project(req: ProjectGenerateRequest):
    """Generate project blueprints using Ollama (DeepSeek-R1)."""
    base_instructions = PROJECT_PROMPTS.get(req.category, "Act as an AI developer helper.")
    
    prompt = (
        f"Project Title: {req.title}\n"
        f"Description: {req.description or 'A new project helper application.'}\n"
        f"Category: {req.category}\n"
        f"Team Size: {req.team_size}\n"
        f"Tech Stack: {req.tech_stack or 'Standard web stack'}\n"
        f"Target Audience: {req.target_audience or 'General users'}\n\n"
        f"Instructions:\n{base_instructions}\n\n"
        f"Provide a highly detailed, professional markdown output. "
        f"Format headers cleanly using markdown. Use tables, code blocks, and lists where appropriate."
    )

    logger.info(f"Generating project helper output using DeepSeek-R1 for category: {req.category}")

    # Complete using DeepSeek-R1 (mapped to code task type)
    output_text = await ollama_service.complete(
        prompt=prompt,
        task="code",
        max_tokens=4000,
    )

    if not output_text or "Ollama is not running" in output_text or "AI error" in output_text:
        raise HTTPException(status_code=500, detail="Failed to communicate with DeepSeek-R1 backend.")

    project_id = str(uuid.uuid4())

    # Save to SQLite
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO ai_projects (id, user_id, title, category, tag, inputs_json, output_markdown)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                project_id,
                req.user_id,
                req.title,
                req.category,
                req.tag,
                json.dumps({
                    "description": req.description,
                    "team_size": req.team_size,
                    "tech_stack": req.tech_stack,
                    "target_audience": req.target_audience
                }),
                output_text,
            )
        )
        conn.commit()
        
        cursor = conn.cursor()
        cursor.execute("SELECT created_at FROM ai_projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        created_at = row["created_at"] if row else ""
    finally:
        conn.close()

    return ProjectResponse(
        id=project_id,
        title=req.title,
        category=req.category,
        tag=req.tag,
        output_markdown=output_text,
        created_at=created_at,
    )


@router.get("/history/{user_id}", response_model=list[ProjectResponse])
async def get_history(user_id: str):
    """Retrieve user project history."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, category, tag, output_markdown, created_at FROM ai_projects WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        rows = cursor.fetchall()
        return [
            ProjectResponse(
                id=row["id"],
                title=row["title"],
                category=row["category"],
                tag=row["tag"] or "",
                output_markdown=row["output_markdown"],
                created_at=row["created_at"],
            )
            for row in rows
        ]
    finally:
        conn.close()


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a past project helper generation."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM ai_projects WHERE id = ?", (project_id,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()
